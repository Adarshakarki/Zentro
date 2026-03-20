/* ── PLAYER ──────────────────────────────────────── */
import { player as embed } from './config.js';
import { api }             from './api.js';
import { mk, Loader }      from './components.js';
import { progress }        from './storage.js';

/* Listen to Vidking postMessage events */
function trackProgress(progressKey) {
  const handler = e => {
    if (typeof e.data !== 'string') return;
    try {
      const msg = JSON.parse(e.data);
      if (msg.type !== 'PLAYER_EVENT') return;
      const { event, currentTime, duration, progress: pct } = msg.data;
      if ((event === 'timeupdate' || event === 'pause' || event === 'ended') && currentTime > 5) {
        progress.set(progressKey, { currentTime, duration, progress: pct });
      }
    } catch {}
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

function buildIframe(src) {
  const wrap = mk('div', 'player-wrap');
  const f = document.createElement('iframe');
  f.src = src;
  f.setAttribute('allowfullscreen', '');
  f.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
  f.setAttribute('frameborder', '0');
  wrap.appendChild(f);
  return { wrap, frame: f };
}

/* ── MOVIE PLAYER ── */
export function MoviePlayer(item) {
  const key   = `movie_${item.id}`;
  const saved = progress.get(key);
  const src   = embed.movie(item.id, saved?.t > 10 ? { progress: saved.t } : {});
  const { wrap } = buildIframe(src);
  trackProgress(key);
  return wrap;
}

/* ── TV PLAYER + EPISODE PICKER ── */
export async function TVPlayer(item, seasons) {
  const container = mk('div', 'tv-player-wrap');
  const valid     = seasons.filter(s => s.season_number > 0);

  let curSeason  = 1;
  let curEpisode = 1;
  let cleanupFn  = () => {};

  /* iframe slot */
  const playerSlot = mk('div', 'tv-iframe-slot');
  container.appendChild(playerSlot);

  function loadPlayer(s, e) {
    cleanupFn();
    curSeason = s; curEpisode = e;
    const key   = `tv_${item.id}_s${s}_e${e}`;
    const saved = progress.get(key);
    const src   = embed.tv(item.id, s, e, saved?.t > 10 ? { progress: saved.t } : {});
    const { wrap } = buildIframe(src);
    playerSlot.innerHTML = '';
    playerSlot.appendChild(wrap);
    cleanupFn = trackProgress(key);
    /* update active states */
    container.querySelectorAll('.ep-btn').forEach(b =>
      b.classList.toggle('active', +b.dataset.s === s && +b.dataset.e === e));
  }

  /* episode picker */
  const picker = mk('div', 'ep-picker');

  async function renderSeason(n) {
    container.querySelectorAll('.s-btn').forEach(b =>
      b.classList.toggle('active', +b.dataset.s === n));

    const epGrid = picker.querySelector('.ep-grid');
    epGrid.innerHTML = '';
    epGrid.appendChild(Loader());

    const sd = await api.season(item.id, n);
    epGrid.innerHTML = '';

    (sd.episodes || []).forEach(ep => {
      const thumb = ep.still_path
        ? `<img src="https://wsrv.nl/?url=https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw300${encodeURIComponent(ep.still_path)}&output=webp&q=70" loading="lazy">`
        : `<div class="ep-thumb-ph">▶</div>`;
      const epKey  = `tv_${item.id}_s${n}_e${ep.episode_number}`;
      const prog   = progress.get(epKey);
      const active = n === curSeason && ep.episode_number === curEpisode;

      const b = mk('div', `ep-card${active ? ' active' : ''}`);
      b.dataset.s = n; b.dataset.e = ep.episode_number;
      b.classList.add('ep-btn');
      b.innerHTML = `
        <div class="ep-thumb">${thumb}
          ${prog ? `<div class="ep-prog-bar"><div style="width:${prog.p}%"></div></div>` : ''}
          <div class="ep-play-overlay"><svg viewBox="0 0 24 24" fill="currentColor" width="22"><path d="M8 5v14l11-7z"/></svg></div>
        </div>
        <div class="ep-info">
          <span class="ep-num">E${ep.episode_number}</span>
          <span class="ep-name">${ep.name || ''}</span>
          ${prog ? `<span class="ep-time">${progress.label(epKey) || ''}</span>` : ''}
        </div>`;
      b.addEventListener('click', () => loadPlayer(n, ep.episode_number));
      epGrid.appendChild(b);
    });
  }

  /* season tabs */
  const seasonRow = mk('div', 'season-row');
  valid.forEach(s => {
    const b = mk('button', `s-btn${s.season_number === 1 ? ' active' : ''}`, `S${s.season_number}`);
    b.dataset.s = s.season_number;
    b.addEventListener('click', () => renderSeason(s.season_number));
    seasonRow.appendChild(b);
  });

  const pickerHead = mk('div', 'picker-head');
  pickerHead.innerHTML = '<span class="picker-label">Episodes</span>';
  pickerHead.appendChild(seasonRow);

  picker.appendChild(pickerHead);
  picker.appendChild(mk('div', 'ep-grid'));
  container.appendChild(picker);

  /* load first season, auto-play first ep */
  await renderSeason(1);
  loadPlayer(1, 1);

  return container;
}

/* ── LIVE TV PLAYER (HLS via hls.js) ── */
export function LivePlayer(channel) {
  const wrap = mk('div', 'live-player-wrap');
  wrap.innerHTML = `
    <div class="live-badge">● LIVE</div>
    <video id="liveVideo" controls autoplay playsinline></video>
    <div class="live-loading">${Loader('Loading stream…').outerHTML}</div>`;

  /* load hls.js dynamically */
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
  script.onload = () => {
    const video   = wrap.querySelector('#liveVideo');
    const loading = wrap.querySelector('.live-loading');

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(channel.stream);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play(); loading.remove(); });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) loading.innerHTML = '<p class="live-err">Stream unavailable</p>';
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      /* iOS native HLS — no ads in native player */
      video.src = channel.stream;
      video.addEventListener('loadedmetadata', () => { video.play(); loading.remove(); });
    } else {
      loading.innerHTML = '<p class="live-err">HLS not supported in this browser</p>';
    }
  };
  document.head.appendChild(script);

  return wrap;
}
