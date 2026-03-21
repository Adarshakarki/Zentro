import { mk, Loader, Empty } from '../components.js';
import { icon } from '../icons.js';

const API = 'https://iptv-org.github.io/api';

const WANTED = [
  { id: 'sports', label: 'Sports' },
  { id: 'music', label: 'Music' },
  { id: 'news', label: 'News' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'movies', label: 'Movies' },
];

let _cache = null;

async function loadData() {
  if (_cache) return _cache;

  const [channels, streams, logos] = await Promise.all([
    fetch(`${API}/channels.json`).then((r) => r.json()),
    fetch(`${API}/streams.json`).then((r) => r.json()),
    fetch(`${API}/logos.json`).then((r) => r.json()),
  ]);

  const streamMap = {};
  for (const s of streams) {
    if (s.channel && s.url && !streamMap[s.channel])
      streamMap[s.channel] = s.url;
  }

  const proxyLogo = (url) =>
    url
      ? `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=120&output=webp&n=-1`
      : null;

  const logoMap = {};
  for (const l of logos) {
    if (!l.channel || !l.url) continue;
    if (!logoMap[l.channel] || l.tags?.includes('horizontal'))
      logoMap[l.channel] = proxyLogo(l.url);
  }

  const list = channels
    .filter((c) => streamMap[c.id] && !c.closed && !c.is_nsfw)
    .map((c) => ({
      id: c.id,
      name: c.name,
      logo: logoMap[c.id] || null,
      stream: streamMap[c.id],
      categories: c.categories || [],
      country: c.country || '',
    }));

  const byCategory = {};
  for (const { id } of WANTED) {
    byCategory[id] = list.filter((c) => c.categories.includes(id));
  }

  _cache = { list, byCategory };
  return _cache;
}

function loadHLS(url, video, loadingEl) {
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    video.addEventListener('canplay', () => loadingEl?.remove(), {
      once: true,
    });
    return;
  }
  if (window.Hls) {
    attachHls(url, video, loadingEl);
    return;
  }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.7/hls.min.js';
  s.onload = () => attachHls(url, video, loadingEl);
  document.head.appendChild(s);
}

function attachHls(url, video, loadingEl) {
  if (video._hls) {
    video._hls.destroy();
    delete video._hls;
  }
  if (!window.Hls?.isSupported()) {
    video.src = url;
    loadingEl?.remove();
    return;
  }
  const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
  hls.loadSource(url);
  hls.attachMedia(video);
  hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
    loadingEl?.remove();
    video.play().catch(() => {});
  });
  hls.on(window.Hls.Events.ERROR, (_, d) => {
    if (d.fatal && loadingEl)
      loadingEl.innerHTML = '<span class="live-err">Stream unavailable</span>';
  });
  video._hls = hls;
}

function playChannel(ch, cardEl, area) {
  area
    .querySelectorAll('.ch-card.active')
    .forEach((c) => c.classList.remove('active'));
  cardEl.classList.add('active');

  document.querySelector('.player-overlay')?.remove();

  const overlay = mk('div', 'player-overlay');
  const modal = mk('div', 'player-modal');
  const closeBtn = mk('button', 'player-close');
  const video = document.createElement('video');
  const loading = mk(
    'div',
    'live-fs-loading',
    `
    <div class="spin-ring"><div></div><div></div><div></div><div></div></div>
    <span>Connecting…</span>`
  );
  const badge = mk('div', 'live-fs-badge', '● LIVE');

  closeBtn.innerHTML = icon('x', 18);
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  video.style.cssText =
    'width:100%;height:100%;object-fit:contain;display:block;';

  modal.appendChild(closeBtn);
  modal.appendChild(badge);
  modal.appendChild(video);
  modal.appendChild(loading);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  loadHLS(ch.stream, video, loading);

  const close = () => {
    if (video._hls) {
      video._hls.destroy();
      delete video._hls;
    }
    video.pause();
    video.src = '';
    overlay.remove();
    cardEl.classList.remove('active');
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  const onKey = (e) => {
    if (e.key === 'Escape' && !document.fullscreenElement) {
      close();
      document.removeEventListener('keydown', onKey);
    }
  };
  document.addEventListener('keydown', onKey);
}

export async function LiveView(onBack) {
  const root = mk('div', 'live-view');

  const back = mk('button', 'back-btn');
  back.innerHTML = icon('chevronLeft', 20);
  back.addEventListener('click', onBack);
  root.appendChild(back);

  root.appendChild(
    mk(
      'div',
      'live-heading',
      `
    <h1 class="live-title"><span class="live-dot-lg">●</span> Live TV</h1>
    <p class="live-sub">Click any channel to watch fullscreen</p>`
    )
  );

  const tabs = mk('div', 'live-cats');
  root.appendChild(tabs);

  const area = mk('div', 'live-ch-area');
  root.appendChild(area);

  let data = null;

  function renderCategory(catId) {
    tabs
      .querySelectorAll('.live-cat-btn')
      .forEach((b) => b.classList.toggle('active', b.dataset.cat === catId));
    area.innerHTML = '';

    const channels = data.byCategory[catId] || [];
    if (!channels.length) {
      area.appendChild(Empty('No channels in this category'));
      return;
    }

    const grid = mk('div', 'ch-grid');
    channels.slice(0, 150).forEach((ch) => {
      const card = mk('div', 'ch-card');
      card.innerHTML = `
        <div class="ch-thumb">
          ${
            ch.logo
              ? `<img src="${ch.logo}" alt="${ch.name}" loading="lazy" onerror="this.style.display='none'">`
              : `<span class="ch-initial">${ch.name.charAt(0)}</span>`
          }
          <span class="ch-live-badge">LIVE</span>
        </div>
        <div class="ch-name">${ch.name}</div>
        ${ch.country ? `<div class="ch-country">${ch.country}</div>` : ''}`;
      card.addEventListener('click', () => playChannel(ch, card, area));
      grid.appendChild(card);
    });
    area.appendChild(grid);
  }

  area.appendChild(Loader('Loading channels…'));

  try {
    data = await loadData();
    area.innerHTML = '';

    const available = WANTED.filter(
      ({ id }) => (data.byCategory[id]?.length || 0) > 0
    );
    if (!available.length) {
      area.appendChild(Empty('No channels found'));
      return root;
    }

    available.forEach(({ id, label }, i) => {
      const count = data.byCategory[id].length;
      const b = mk(
        'button',
        `live-cat-btn${i === 0 ? ' active' : ''}`,
        `${label} <span class="cat-count">${count}</span>`
      );
      b.dataset.cat = id;
      b.addEventListener('click', () => renderCategory(id));
      tabs.appendChild(b);
    });

    renderCategory(available[0].id);
  } catch (e) {
    area.innerHTML = '';
    area.appendChild(Empty('Failed to load', e.message));
  }

  return root;
}
