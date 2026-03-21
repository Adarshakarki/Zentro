import { player as embed } from './config.js';
import { mk } from './components.js';
import { icon } from './icons.js';
import { progress } from './storage.js';

function trackProgress(key) {
  const handler = (e) => {
    if (typeof e.data !== 'string') return;
    try {
      const msg = JSON.parse(e.data);
      if (msg.type !== 'PLAYER_EVENT') return;
      const { event, currentTime, duration, progress: pct } = msg.data;
      /* track on timeupdate, pause, ended, seeked */
      if (
        ['timeupdate', 'pause', 'ended', 'seeked'].includes(event) &&
        currentTime > 5
      ) {
        progress.set(key, {
          t: Math.floor(currentTime),
          d: Math.floor(duration),
          p: +pct.toFixed(1),
        });
      }
    } catch {}
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

export function openPlayer(src, progressKey) {
  document.querySelector('.player-overlay')?.remove();

  const overlay = mk('div', 'player-overlay');
  const modal = mk('div', 'player-modal');
  const closeBtn = mk('button', 'player-close');
  const iframe = document.createElement('iframe');

  closeBtn.innerHTML = icon('x', 18);
  iframe.src = src;
  iframe.setAttribute(
    'allow',
    'autoplay; fullscreen; encrypted-media; picture-in-picture'
  );
  iframe.setAttribute('frameborder', '0');
  /* sandbox blocks iframe from opening new tabs — omits allow-popups and allow-top-navigation intentionally */
  iframe.setAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock'
  );

  modal.appendChild(closeBtn);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const cleanup = progressKey ? trackProgress(progressKey) : () => {};

  const close = () => {
    cleanup();
    iframe.src = '';
    overlay.remove();
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const onKey = (e) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);
}

export function openMoviePlayer(item) {
  const key = `movie_${item.id}`;
  const saved = progress.get(key);
  /* resume using Vidking's timestamp param */
  const opts = saved?.t > 10 ? { timestamp: saved.t } : {};
  openPlayer(embed.movie(item.id, opts), key);
}

export function openEpisodePlayer(itemId, s, e) {
  const key = `tv_${itemId}_s${s}_e${e}`;
  const saved = progress.get(key);
  const opts = saved?.t > 10 ? { timestamp: saved.t } : {};
  openPlayer(embed.tv(itemId, s, e, opts), key);
}
