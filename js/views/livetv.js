/* ── LIVE TV VIEW ────────────────────────────────── */
import { mk, Loader, Empty } from '../components.js';

const CATEGORIES = [
  { id: 'news',   label: '📰 News'   },
  { id: 'sports', label: '⚽ Sports' },
  { id: 'movies', label: '🎬 Movies' },
  { id: 'music',  label: '🎵 Music'  },
  { id: 'kids',   label: '👶 Kids'   },
];

const M3U_BASE = 'https://iptv-org.github.io/iptv/categories';

/* Parse M3U playlist text into channel objects */
function parseM3U(text) {
  const lines    = text.split('\n');
  const channels = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF')) continue;
    const name    = line.match(/,(.+)$/)?.[1]?.trim() || 'Unknown';
    const logo    = line.match(/tvg-logo="([^"]+)"/)?.[1] || null;
    const country = line.match(/tvg-country="([^"]+)"/)?.[1] || '';
    const url     = lines[i + 1]?.trim();
    if (url && !url.startsWith('#') && url.startsWith('http')) {
      channels.push({ name, logo, country, url });
    }
  }
  return channels;
}

/* Single channel card */
function ChannelCard(ch, onPlay) {
  const el = mk('div', 'ch-card');
  el.innerHTML = `
    <div class="ch-thumb">
      ${ch.logo
        ? `<img src="${ch.logo}" alt="${ch.name}" loading="lazy" onerror="this.style.display='none'">`
        : `<span class="ch-initial">${ch.name[0]}</span>`}
      <div class="ch-live-dot"></div>
    </div>
    <div class="ch-name">${ch.name}</div>
    ${ch.country ? `<div class="ch-country">${ch.country}</div>` : ''}`;
  el.addEventListener('click', () => onPlay(ch));
  return el;
}

/* Live player modal */
function openPlayer(ch, onClose) {
  const overlay = mk('div', 'live-overlay');
  overlay.innerHTML = `
    <div class="live-modal">
      <div class="live-modal-head">
        <div class="live-modal-title">
          <span class="live-dot-pulse"></span>
          <span>${ch.name}</span>
        </div>
        <button class="live-close" aria-label="Close">✕</button>
      </div>
      <div class="live-player-wrap">
        <video id="liveVideo" controls autoplay playsinline></video>
        <div class="live-loading">
          <div class="spin-ring"><div></div><div></div><div></div><div></div></div>
          <span>Connecting to stream…</span>
        </div>
      </div>
      <div class="live-stream-name">${ch.name}</div>
    </div>`;

  document.body.appendChild(overlay);
  const video   = overlay.querySelector('#liveVideo');
  const loading = overlay.querySelector('.live-loading');

  /* Load HLS.js dynamically */
  loadHLS(ch.url, video, loading);

  overlay.querySelector('.live-close').addEventListener('click', () => {
    video.pause();
    video.src = '';
    overlay.remove();
    onClose?.();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.querySelector('.live-close').click(); });
}

function loadHLS(url, video, loadingEl) {
  const isHLS = url.includes('.m3u8');

  if (video.canPlayType('application/vnd.apple.mpegurl') && isHLS) {
    /* Native HLS (Safari / iOS) — stream goes directly, no ads */
    video.src = url;
    video.addEventListener('canplay', () => loadingEl?.remove(), { once: true });
    return;
  }

  if (isHLS) {
    /* Desktop — use HLS.js via CDN */
    const script = document.createElement('script');
    script.src   = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.7/hls.min.js';
    script.onload = () => {
      if (!window.Hls?.isSupported()) { video.src = url; return; }
      const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        loadingEl?.remove();
        video.play().catch(() => {});
      });
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data.fatal) loadingEl.innerHTML = '<span style="color:#e63946">Stream unavailable</span>';
      });
    };
    document.head.appendChild(script);
  } else {
    /* Direct MP4 or other */
    video.src = url;
    video.addEventListener('canplay', () => loadingEl?.remove(), { once: true });
  }
}

export async function LiveTVView() {
  const root = mk('div', 'livetv-view');
  root.innerHTML = '<h2 class="livetv-heading">Live TV</h2>';

  /* Category tabs */
  const tabBar = mk('div', 'livetv-tabs');
  let activeTab = 'news';

  const channelArea = mk('div', 'livetv-channels');
  root.appendChild(tabBar);
  root.appendChild(channelArea);

  async function loadCategory(id) {
    activeTab = id;
    tabBar.querySelectorAll('.livetv-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.cat === id));

    channelArea.innerHTML = '';
    channelArea.appendChild(Loader('Fetching channels…'));

    try {
      const res  = await fetch(`${M3U_BASE}/${id}.m3u`);
      const text = await res.text();
      const chs  = parseM3U(text).slice(0, 80); /* cap at 80 per category */

      channelArea.innerHTML = '';
      if (!chs.length) { channelArea.appendChild(Empty('📡', 'No channels found')); return; }

      const grid = mk('div', 'ch-grid');
      chs.forEach(ch => grid.appendChild(ChannelCard(ch, c => openPlayer(c))));
      channelArea.appendChild(grid);
    } catch {
      channelArea.innerHTML = '';
      channelArea.appendChild(Empty('⚠️', 'Failed to load', 'Check your connection'));
    }
  }

  CATEGORIES.forEach(cat => {
    const b = mk('button', `livetv-tab${cat.id === activeTab ? ' active' : ''}`, cat.label);
    b.dataset.cat = cat.id;
    b.addEventListener('click', () => loadCategory(cat.id));
    tabBar.appendChild(b);
  });

  await loadCategory(activeTab);
  return root;
}
