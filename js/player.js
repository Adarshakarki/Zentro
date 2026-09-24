import { player as provider, PLAYER_ORIGIN } from './config.js';
import { mk } from './components.js';
import { icon } from './icons.js';
import { progress, history } from './storage.js';

function trackProgress(key, itemId, type) {
  const handler = (e) => {
    if (e.origin !== PLAYER_ORIGIN && !e.origin.includes('vidphantom')) return;
    const d = e.data;
    if (!d || d.type !== 'PLAYER_EVENT') return;

    const { event, currentTime, duration, season, episode } = d.data || {};

    if (type === 'tv' && season && episode) {
      const h = `#/watch/tv/${itemId}/${season}/${episode}`;
      if (window.location.hash !== h) {
        window.history.replaceState(null, '', h);
        key = `tv_${itemId}_s${season}_e${episode}`;
      }
    }

    if (
      ['play', 'pause', 'ended', 'seeked', 'timeupdate'].includes(event) &&
      currentTime > 5
    ) {
      progress.set(key, {
        t: Math.floor(currentTime),
        d: Math.floor(duration || 0),
        p: duration ? +((currentTime / duration) * 100).toFixed(1) : 0,
      });
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

function trackNextEpisode(itemId) {
  const handler = (e) => {
    if (e.origin !== PLAYER_ORIGIN && !e.origin.includes('vidphantom')) return;
    if (e.data?.type !== 'PLAYER_NEXT_EPISODE') return;

    const { season, episode, nextUrl } = e.data.detail || {};
    if (season && episode) {
      openEpisodePlayer(itemId, season, episode);
    } else if (nextUrl) {
      const m = nextUrl.match(/\/tv\/\d+\/(\d+)\/(\d+)/);
      if (m) openEpisodePlayer(itemId, m[1], m[2]);
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

export function closeExistingPlayer(skipHistory = false) {
  const existing = document.querySelector('.player-overlay');
  if (existing && existing._close) existing._close(null, skipHistory);
  else existing?.remove();
}

export function openPlayer(src, progressKey, itemId, type) {
  closeExistingPlayer();

  const overlay = mk('div', 'player-overlay');
  const closeBtn = mk('button', 'player-close', icon('x', 20));
  closeBtn.setAttribute('aria-label', 'Close player');
  const iframe = document.createElement('iframe');

  iframe.style.border = 'none';
  iframe.setAttribute(
    'allow',
    'autoplay; fullscreen; encrypted-media; picture-in-picture'
  );
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

  iframe.onload = () => setTimeout(() => iframe.focus(), 100);

  const onFsChange = () => {
    if (!document.fullscreenElement) window.focus();
  };
  document.addEventListener('fullscreenchange', onFsChange);

  overlay.addEventListener('mousedown', (e) => {
    if (e.target !== closeBtn) setTimeout(() => iframe.focus(), 0);
  });

  iframe.src = src;
  overlay.append(iframe, closeBtn);
  document.body.appendChild(overlay);

  const cleanupProgress = progressKey ? trackProgress(progressKey, itemId, type) : () => {};
  const cleanupNext = type === 'tv' ? trackNextEpisode(itemId) : () => {};

  const close = (e, skipHistory = false) => {
    if (e && e.stopPropagation) e.stopPropagation();
    cleanupProgress();
    cleanupNext();
    iframe.src = '';
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('fullscreenchange', onFsChange);
    if (!skipHistory) {
      if (itemId && type) {
        window.location.hash = `#/${type}/${itemId}`;
      } else if (window.location.hash.includes('watch/')) {
        window.history.back();
      }
    }
  };
  overlay._close = close;

  const onKey = (e) => {
    if (e.key === 'Escape') {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        close();
      }
      return;
    }

    const playerKeys = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'f', 'm'];
    if (playerKeys.includes(e.key.toLowerCase()) || e.key.startsWith('Arrow')) {
      if (document.activeElement !== iframe) iframe.focus();
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    } else if (e.key !== 'Tab' && document.activeElement !== iframe) {
      iframe.focus();
    }
  };

  closeBtn.onclick = (e) => close(e);
  document.addEventListener('keydown', onKey);
  return overlay;
}

export function openMoviePlayer(item) {
  if (!item?.id) return;

  const h = `watch/movie/${item.id}`;
  if (window.location.hash.replace('#/', '') !== h) {
    window.location.hash = `#/${h}`;
  }
  const existing = document.querySelector('.player-overlay');
  if (existing && existing._id === `movie_${item.id}`) return;

  history.add(item, 'movie');
  const key = `movie_${item.id}`;
  const saved = progress.get(key);
  const opts = saved?.t > 10 ? { startAt: saved.t } : {};
  const ov = openPlayer(provider.movie(item.id, opts), key, item.id, 'movie');
  if (ov) ov._id = `movie_${item.id}`;
}

export function openEpisodePlayer(itemId, s, e) {
  if (!itemId) return;

  const h = `watch/tv/${itemId}/${s}/${e}`;
  if (window.location.hash.replace('#/', '') !== h) {
    window.location.hash = `#/${h}`;
  }
  const existing = document.querySelector('.player-overlay');
  if (existing && existing._id === `tv_${itemId}_s${s}_e${e}`) return;

  const key = `tv_${itemId}_s${s}_e${e}`;
  const saved = progress.get(key);
  const opts = saved?.t > 10 ? { startAt: saved.t } : {};
  const ov = openPlayer(provider.tv(itemId, s, e, opts), key, itemId, 'tv');
  if (ov) ov._id = key;
}

export function openLivePlayer(url, title) {
  closeExistingPlayer();

  const overlay = mk('div', 'player-overlay');
  const closeBtn = mk('button', 'player-close', icon('x', 20));
  closeBtn.setAttribute('aria-label', 'Close player');
  const video = document.createElement('video');
  const loading = mk(
    'div',
    'live-fs-loading',
    `<div class="spin-ring"><div></div><div></div><div></div><div></div></div><span>Connecting...</span>`
  );
  const info = mk(
    'div',
    'live-fs-info',
    `<span class="live-fs-badge">${icon('circle', 8, { fill: 'currentColor' })} LIVE</span><span class="live-fs-title">${title || ''}</span>`
  );

  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;

  overlay.append(video, closeBtn, loading, info);
  document.body.appendChild(overlay);

  const onFsChange = () => {
    if (!document.fullscreenElement) window.focus();
  };
  document.addEventListener('fullscreenchange', onFsChange);

  const close = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (video._hls) video._hls.destroy();
    video.pause();
    video.src = '';
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('fullscreenchange', onFsChange);
  };

  overlay._close = close;

  const onKey = (e) => {
    if (e.key === 'Escape') {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        close();
      }
      return;
    }
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  };

  closeBtn.onclick = close;
  document.addEventListener('keydown', onKey);

  const initHls = () => {
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.oncanplay = () => loading.remove();
    } else if (window.Hls?.isSupported()) {
      const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        loading.remove();
        video.play().catch(() => {});
      });
      video._hls = hls;
    } else {
      loading.innerHTML = 'HLS not supported in this browser';
    }
  };

  if (window.Hls) {
    initHls();
  } else {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.7/hls.min.js';
    s.onload = initHls;
    document.head.appendChild(s);
  }
}
