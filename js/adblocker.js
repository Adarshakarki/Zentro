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
    'popads.net',
    'propellerads.com',
    'juicyads.com',
    'exoclick.com',
    'onclickalgo.com',
    'vadsrv.com',
    'adsterratechnology.com',
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

  // Intercept and block popup windows
  const _open = window.open;
  window.open = function (url, ...rest) {
    if (shouldBlock(url)) {
      console.warn('[zentro] blocked popup:', url);
      return null;
    }
    return _open.call(window, url, ...rest);
  };

  // Intercept and block unauthorized Fetch requests
  const _fetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    if (shouldBlock(url)) {
      console.warn('[zentro] blocked fetch:', url);
      return Promise.resolve(new Response('', { status: 204 }));
    }
    return _fetch.apply(window, args);
  };

  // Intercept and block unauthorized XHR requests
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

  // Remove injected ad overlays from the DOM
  const clean = () => {
    if (!document.body) return;
    document.body.childNodes.forEach((node) => {
      if (node.nodeType !== 1) return;

      // Safeguard core application elements
      if (
        node.id === 'app' ||
        node.id === 'mainNav' ||
        node.classList?.contains('player-overlay')
      )
        return;

      // Efficiently check for high z-index overlays without excessive layout thrashing
      if (
        (node.style && node.style.zIndex > 1000) ||
        node.style.position === 'fixed'
      ) {
        const computedStyle = window.getComputedStyle(node);
        if (computed.zIndex > 1000 || computedStyle.position === '2147483647') {
          node.remove();
          return;
        }
      }

      if (node.tagName === 'IFRAME' && shouldBlock(node.src)) {
        node.remove();
        return;
      }

      // Remove invisible full-screen click-jacking overlays
      const rect = node.getBoundingClientRect();
      if (
        rect.width > window.innerWidth * 0.9 &&
        rect.height > window.innerHeight * 0.9 &&
        !node.innerText.trim()
      ) {
        node.remove();
        return;
      }
    });
  };

  const observer = new MutationObserver(clean);
  window.addEventListener('DOMContentLoaded', () => {
    clean();
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
