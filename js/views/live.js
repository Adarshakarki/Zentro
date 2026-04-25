import { mk, Loader, Empty } from '../components.js';
import { icon } from '../icons.js';
import { openLivePlayer } from '../player.js';

const API = 'https://iptv-org.github.io/api';

const CATEGORIES = [
  { id: 'sports', label: 'Sports' },
  { id: 'news', label: 'News' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'movies', label: 'Movies' },
  { id: 'music', label: 'Music' },
];

const ENGLISH_COUNTRIES = new Set([
  'US',
  'GB',
  'CA',
  'AU',
  'IE',
  'NZ',
  'ZA',
  'JM',
  'TT',
  'BB',
  'GH',
  'NG',
  'KE',
  'UG',
  'TZ',
]);

let _cache = null;

async function checkStatus(url) {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 5000);
    // connectivity probe: no-cors mode ignores strict headers to check stream availability
    await fetch(url, { mode: 'no-cors', signal: ctrl.signal });
    clearTimeout(id);
    return true;
  } catch {
    return false;
  }
}

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
      ? `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=160&fit=contain&output=webp`
      : null;

  const logoMap = {};
  for (const l of logos) {
    if (!l.channel || !l.url) continue;
    const tags = l.tags || [];
    const score =
      (tags.includes('light') || tags.includes('white') ? 10 : 0) +
      (tags.includes('horizontal') ? 5 : 0) +
      (tags.includes('transparent') ? 2 : 0);

    if (!logoMap[l.channel] || score > (logoMap[l.channel].score || 0)) {
      logoMap[l.channel] = { url: proxyLogo(l.url), score };
    }
  }

  for (const id in logoMap) logoMap[id] = logoMap[id].url;

  const list = channels
    .filter((c) => streamMap[c.id] && !c.closed && !c.is_nsfw)
    .map((c) => ({
      id: c.id,
      name: c.name,
      logo: logoMap[c.id] || null,
      stream: streamMap[c.id],
      categories: c.categories || [],
      country: c.country || '',
      languages: c.languages || [],
    }));

  const byCategory = {};
  for (const { id } of CATEGORIES) {
    if (id === 'sports') {
      byCategory[id] = list.filter(
        (c) =>
          c.categories.includes('sports') && ENGLISH_COUNTRIES.has(c.country)
      );
    } else {
      byCategory[id] = list.filter(
        (c) =>
          c.categories.includes(id) &&
          (c.languages.includes('eng') || ENGLISH_COUNTRIES.has(c.country))
      );
    }
  }

  _cache = { list, byCategory };
  return _cache;
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
    <h1 class="live-title">Live TV</h1>
    <p class="live-sub">Click any channel to watch fullscreen · <span class="live-legend"><span class="dot-online">${icon('circle', 8, { fill: 'currentColor' })}</span> Online <span class="dot-offline">${icon('circle', 8, { fill: 'currentColor' })}</span> Offline</span></p>`
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
    channels.slice(0, 100).forEach((ch, index) => {
      const card = mk('div', 'ch-card');
      card.innerHTML = `
        <div class="ch-thumb">
          ${
            ch.logo
              ? `<img src="${ch.logo}" alt="${ch.name}" loading="lazy" onerror="this.style.display='none'">`
              : `<span class="ch-initial">${ch.name.charAt(0)}</span>`
          }
        </div>
        <div class="ch-name">${ch.name}</div>
        ${ch.country ? `<div class="ch-country">${ch.country}</div>` : ''}
        <span class="ch-status checking">${icon('circle', 8, { fill: 'currentColor' })}</span>`;

      card.addEventListener('click', () => openLivePlayer(ch.stream, ch.name));
      grid.appendChild(card);

      // Staggered availability check
      setTimeout(() => {
        checkStatus(ch.stream).then((isUp) => {
          const dot = card.querySelector('.ch-status');
          if (dot) {
            dot.className = `ch-status ${isUp ? 'online' : 'offline'}`;
            dot.title = isUp ? 'Online' : 'Offline / Restricted';
          }
        });
      }, index * 100);
    });
    area.appendChild(grid);
  }

  area.appendChild(Loader('Loading channels…'));

  try {
    data = await loadData();
    area.innerHTML = '';

    const available = CATEGORIES.filter(
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
    area.appendChild(Empty('Failed to load channels', e.message));
  }

  return root;
}
