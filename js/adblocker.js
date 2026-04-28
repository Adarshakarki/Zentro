import { FiltersEngine, Request } from 'https://cdn.jsdelivr.net/npm/@ghostery/adblocker/+esm';

async function startAdblock() {
  try {
    const blocker = await FiltersEngine.fromPrebuiltAdsAndTracking(fetch);
    console.log('[zentro] ghostery engine initialized');

    const _dateNow = Date.now;
    Date.now = function() { return 0; };

    window.addEventListener('dState', function(e) {
      Object.defineProperty(e, 'detail', { get: () => false });
    }, true);

    const _eval = window.eval;
    window.eval = new Proxy(_eval, {
      apply(target, thisArg, args) {
        if (typeof args[0] === 'string') {
          args[0] = args[0].replace(/debugger/g, '');
        }
        return target.apply(thisArg, args);
      }
    });

    const _Function = window.Function;
    window.Function = new Proxy(_Function, {
      construct(target, args) {
        args = args.map(a => typeof a === 'string' ? a.replace(/debugger/g, '') : a);
        return new target(...args);
      },
      apply(target, thisArg, args) {
        args = args.map(a => typeof a === 'string' ? a.replace(/debugger/g, '') : a);
        return target.apply(thisArg, args);
      }
    });

    const _CustomEvent = window.CustomEvent;
    window.CustomEvent = function(type, init) {
      if (type === 'dState') {
        init = { ...init, detail: false };
      }
      return new _CustomEvent(type, init);
    };
    window.CustomEvent.prototype = _CustomEvent.prototype;

    console.log('[zentro] devtools detector neutralized');

    const _setTimeout = window.setTimeout;
    window.setTimeout = function(fn, delay, ...args) {
      const wrapped = function(...a) {
        try { 
          return typeof fn === 'function' ? fn(...a) : fn; 
        } catch(e) {
          window.__popupLog = window.__popupLog || [];
          window.__popupLog.push({ type: 'timeout_err', error: e.message, time: Date.now() });
          throw e;
        }
      };
      return _setTimeout.call(window, wrapped, delay, ...args);
    };

    const isBlocked = (url, type = 'xmlhttprequest') => {
      if (!url || typeof url !== 'string') return false;
      try {
        return blocker.match(Request.fromRawDetails({ url, type })).match;
      } catch { return false; }
    };

    let clickedAnchor = null;
    let openingFromAnchor = false;

    document.addEventListener('mousedown', (e) => {
      clickedAnchor = e.target?.closest('a') || null;
      Promise.resolve().then(() => { clickedAnchor = null; });
    }, true);

    document.addEventListener('touchstart', (e) => {
      clickedAnchor = e.target?.closest('a') || null;
      Promise.resolve().then(() => { clickedAnchor = null; });
    }, { capture: true, passive: true });

    document.addEventListener('click', (e) => {
      const anchor = e.target?.closest('a[target="_blank"]');
      if (anchor && !isBlocked(anchor.href, 'main_frame')) {
        openingFromAnchor = true;
        Promise.resolve().then(() => { openingFromAnchor = false; });
      }
    }, true);

    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      if (isBlocked(url)) {
        console.warn('[zentro] blocked fetch:', url);
        return Promise.resolve(new Response('', { status: 204 }));
      }
      return originalFetch.apply(window, args);
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      this._blocked = isBlocked(url);
      if (this._blocked) console.warn('[zentro] blocked XHR:', url);
      return originalOpen.apply(this, arguments);
    };

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
      if (this._blocked) return;
      return originalSend.apply(this, args);
    };

    const originalWinOpen = window.open;
    Object.defineProperty(window, 'open', {
      value: function (url, name, specs) {
        const urlString = url ? url.toString() : '';
        let blockReason = null;

        if (urlString && isBlocked(urlString, 'main_frame')) {
          blockReason = 'ad URL';
        } else if (!clickedAnchor && !openingFromAnchor) {
          blockReason = 'no user gesture';
        } else if (clickedAnchor === null && !openingFromAnchor) {
          blockReason = 'non-anchor click';
        } else if (clickedAnchor && isBlocked(clickedAnchor.href, 'main_frame')) {
          blockReason = 'anchor is ad';
        }

        if (blockReason) {
          window.__popupLog = window.__popupLog || [];
          window.__popupLog.push({
            type: 'popup_blocked',
            url: urlString,
            reason: blockReason,
            time: Date.now(),
            stack: new Error().stack
          });
          return null;
        }

        return originalWinOpen.call(window, url, name, specs);
      },
      writable: false,
      configurable: false
    });

    document.addEventListener('click', (e) => {
      const target = e.target.closest('a');
      if (target?.href && target.target === '_blank') {
        if (isBlocked(target.href, 'main_frame')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          console.warn('[zentro] blocked link popup:', target.href);
        }
      }
    }, true);

    const originalClick = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function () {
      if (
        this instanceof HTMLAnchorElement &&
        this.target === '_blank' &&
        isBlocked(this.href, 'main_frame')
      ) {
        console.warn('[zentro] blocked programmatic click:', this.href);
        return;
      }
      return originalClick.call(this);
    };

    const SUSPICIOUS_IFRAME_PATTERNS = [
      /propellerads/i, /adsterra/i, /exoclick/i, /trafficjunky/i,
      /popads/i, /popcash/i, /hilltopads/i, /adcash/i, /juicyads/i,
      /trafficsStars/i, /revcontent/i, /mgid/i,
    ];

    function shouldKillIframe(el) {
      if (el.tagName !== 'IFRAME') return false;
      const src = el.src || el.getAttribute('src') || '';
      if (!src || src === 'about:blank') {
        return el.width === '0' || el.height === '0' ||
               el.style.display === 'none' || el.style.visibility === 'hidden';
      }
      if (isBlocked(src, 'sub_frame')) return true;
      return SUSPICIOUS_IFRAME_PATTERNS.some(p => p.test(src));
    }

    document.querySelectorAll('iframe').forEach(el => {
      if (shouldKillIframe(el)) {
        el.remove();
        console.warn('[zentro] removed ad iframe:', el.src);
      }
    });

    const iframeObserver = new MutationObserver((mutations) => {
      for (const { addedNodes } of mutations) {
        for (const node of addedNodes) {
          if (node.nodeType !== 1) continue;
          if (shouldKillIframe(node)) {
            node.remove();
            console.warn('[zentro] removed injected ad iframe:', node.src);
          }
          node.querySelectorAll?.('iframe').forEach(el => {
            if (shouldKillIframe(el)) {
              el.remove();
              console.warn('[zentro] removed nested ad iframe:', el.src);
            }
          });
        }
      }
    });

    iframeObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    function isClickHijacker(el) {
      if (el.nodeType !== 1) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const coversPage =
        (style.position === 'fixed' || style.position === 'absolute') &&
        rect.width > window.innerWidth * 0.5 &&
        rect.height > window.innerHeight * 0.5;
      if (!coversPage) return false;
      return (
        parseFloat(style.opacity) < 0.1 ||
        style.backgroundColor === 'transparent' ||
        parseInt(style.zIndex) > 1000 ||
        !!el.querySelector('a[target="_blank"]')
      );
    }

    const overlayObserver = new MutationObserver((mutations) => {
      for (const { addedNodes } of mutations) {
        for (const node of addedNodes) {
          if (isClickHijacker(node)) {
            node.remove();
            console.warn('[zentro] removed overlay hijacker');
          }
        }
      }
    });

    overlayObserver.observe(document.documentElement, { childList: true, subtree: true });

    document.querySelectorAll('*').forEach(el => {
      if (isClickHijacker(el)) el.remove();
    });

  } catch (err) {
    console.error('[zentro] adblock failed to load:', err);
  }
}

startAdblock();