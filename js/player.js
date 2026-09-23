import { player as provider } from './config.js';
import { mk } from './components.js';
import { icon } from './icons.js';
import { progress, history } from './storage.js';

function trackProgress(key, itemId, type) {
  const handler = (e) => {
    try {
      if (!e.data || e.data.type !== 'PLAYER_EVENT') return;
      const { player_info, player_status, player_progress, player_duration } = e.data.data || {};
      if (!player_info) return;

      if (type === 'tv' && player_info.season && player_info.episode) {
        const h = `#/watch/tv/${itemId}/${player_info.season}/${player_info.episode}`;
        if (window.location.hash !== h) {
          window.history.replaceState(null, '', h);
          key = `tv_${itemId}_s${player_info.season}_e${player_info.episode}`;
        }
      }

      if (
        ['playing', 'paused', 'completed', 'seeked'].includes(player_status) &&
        player_progress > 5
      ) {
        progress.set(key, {
          t: Math.floor(player_progress),
          d: Math.floor(player_duration || 0),
          p: player_duration ? +((player_progress / player_duration) * 100).toFixed(1) : 0,
        });
      }
    } catch {}
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
  const backBtn = mk('button', 'player-back', icon('chevronLeft', 20));
  const closeBtn = mk('button', 'player-close', icon('x', 20));
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
    if (e.target !== closeBtn && e.target !== backBtn) setTimeout(() => iframe.focus(), 0);
  });

  iframe.src = src;
  overlay.append(iframe, backBtn, closeBtn);
  document.body.appendChild(overlay);

  const cleanup = progressKey ? trackProgress(progressKey, itemId, type) : () => {};

  const close = (e, skipHistory = false) => {
    if (e && e.stopPropagation) e.stopPropagation();
    cleanup();
    iframe.src = '';
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('fullscreenchange', onFsChange);
    if (!skipHistory && window.location.hash.includes('watch/')) {
      window.history.back();
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

  backBtn.onclick = (e) => close(e);
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
  const backBtn = mk('button', 'player-back', icon('chevronLeft', 20));
  const closeBtn = mk('button', 'player-close', icon('x', 20));
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

  overlay.append(video, backBtn, closeBtn, loading, info);
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

  backBtn.onclick = close;
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
