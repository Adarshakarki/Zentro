(function () {
  'use strict';

  const BLACKLIST = [
    'dolesdao.com',
    'zv.dolesdao.com',
    'doubleclick.net',
    'adnxs.com',
    'googlesyndication.com',
    'pagead2.googlesyndication.com',
    'advertising.com',
    'adsrvr.org',
    'outbrain.com',
    'taboola.com',
  ];

  /* never block our own requests */
  const WHITELIST = [
    'vidking.net',
    'themoviedb.org',
    'wsrv.nl',
    'iptv-org.github.io',
    'workers.dev',
    'wikipedia.org',
  ];

  const shouldBlock = (url) => {
    if (!url) return false;
    if (WHITELIST.some((d) => url.includes(d))) return false;
    return BLACKLIST.some((d) => url.includes(d));
  };

  /* 1. Block popup new tabs */
  const _open = window.open;
  window.open = function (url, ...rest) {
    if (shouldBlock(url)) {
      console.warn('[zentro] blocked popup:', url);
      return null;
    }
    return _open.call(window, url, ...rest);
  };

  /* 2. Block fetch */
  const _fetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    if (shouldBlock(url)) {
      console.warn('[zentro] blocked fetch:', url);
      return Promise.resolve(new Response('', { status: 204 }));
    }
    return _fetch.apply(window, args);
  };

  /* 3. Block XHR */
  const _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._blocked = shouldBlock(url);
    if (this._blocked) console.warn('[zentro] blocked XHR:', url);
    return _xhrOpen.call(this, method, url, ...rest);
  };
  const _xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    if (this._blocked) return;
    return _xhrSend.apply(this, args);
  };

  /* 4. Remove injected ad overlays — only at body level, never inside player */
  const clean = () => {
    if (!document.body) return;
    document.body.childNodes.forEach((node) => {
      if (node.nodeType !== 1) return;
      if (node.classList?.contains('player-overlay'))
        return; /* never touch player */
      if (node.tagName === 'IFRAME' && shouldBlock(node.src)) {
        node.remove();
        return;
      }
      const s = node.getAttribute?.('style') || '';
      if (s.includes('2147483647')) node.remove();
    });
  };

  window.addEventListener('DOMContentLoaded', clean);
  setInterval(clean, 2000);
})();
