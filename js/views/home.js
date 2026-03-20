/* ── HOME VIEW ───────────────────────────────────── */
import { api }                  from '../api.js';
import { img }                  from '../config.js';
import { mk, Row, Empty }       from '../components.js';

function Hero(items, onCard) {
  let idx = 0;
  const hero  = mk('div', 'hero');
  const inner = mk('div', 'hero-inner');
  hero.appendChild(inner);

  function paint(item) {
    const type     = item.media_type || 'movie';
    const title    = item.title || item.name;
    const year     = (item.release_date || item.first_air_date || '').slice(0, 4);
    const rating   = item.vote_average?.toFixed(1);
    const backdrop = img(item.backdrop_path, 'original');
    const genres   = (item.genre_ids || []).slice(0, 3);

    inner.innerHTML = `
      ${backdrop ? `<img class="hero-bg" src="${backdrop}" alt="">` : ''}
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-badges">
          ${rating  ? `<span class="badge-rating">★ ${rating}</span>` : ''}
          ${year    ? `<span class="badge-plain">${year}</span>` : ''}
          <span class="badge-plain">${type === 'tv' ? 'Series' : 'Film'}</span>
        </div>
        <h1 class="hero-title">${title}</h1>
        <p class="hero-overview">${(item.overview || '').slice(0, 200)}${(item.overview?.length || 0) > 200 ? '…' : ''}</p>
        <div class="hero-btns">
          <button class="hero-btn primary" data-play="1">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18"><path d="M8 5v14l11-7z"/></svg>
            Watch Now
          </button>
          <button class="hero-btn ghost" data-info="1">More Info</button>
        </div>
      </div>
      <div class="hero-dots">
        ${items.slice(0, 6).map((_, i) => `<button class="dot${i === idx ? ' active' : ''}" data-i="${i}"></button>`).join('')}
      </div>`;

    inner.querySelector('[data-play]').addEventListener('click',  () => onCard(item, type, true));
    inner.querySelector('[data-info]').addEventListener('click',  () => onCard(item, type, false));
    inner.querySelectorAll('.dot').forEach(d =>
      d.addEventListener('click', () => { idx = +d.dataset.i; clearInterval(timer); paint(items[idx]); }));
  }

  paint(items[0]);
  const timer = setInterval(() => { idx = (idx + 1) % Math.min(items.length, 6); paint(items[idx]); }, 7000);
  return hero;
}

export async function HomeView(onCard, onLive) {
  const root = mk('div', 'home-view');
  root.innerHTML = `<div class="state-loader" style="min-height:60vh"><div class="spin-ring"><div></div><div></div><div></div><div></div></div></div>`;

  try {
    const [trending, topRated, netflix, disney, anime] = await Promise.allSettled([
      api.trending(), api.topRated(), api.netflix(), api.disney(), api.anime(),
    ]);
    const ok = r => r.status === 'fulfilled' ? (r.value.results || []) : [];

    root.innerHTML = '';

    /* hero */
    const heroItems = ok(trending).filter(x => x.backdrop_path).slice(0, 6);
    if (heroItems.length) root.appendChild(Hero(heroItems, onCard));

    /* live TV promo strip */
    const liveStrip = mk('div', 'live-strip');
    liveStrip.innerHTML = `
      <div class="live-strip-inner">
        <span class="live-dot">●</span>
        <span class="live-strip-text">Live TV — News, Sports &amp; More</span>
        <button class="live-strip-btn" id="goLive">Watch Live</button>
      </div>`;
    liveStrip.querySelector('#goLive').addEventListener('click', onLive);
    root.appendChild(liveStrip);

    /* content rows */
    const rows = [
      { label: '🔥 Trending',   sublabel: 'This week',  items: ok(trending), type: null,    showType: true },
      { label: '⭐ Top Rated',  sublabel: 'All time',   items: ok(topRated), type: 'movie' },
      { label: '📺 Netflix',    sublabel: 'On Netflix', items: ok(netflix),  type: 'movie' },
      { label: '🏰 Disney+',   sublabel: 'On Disney+', items: ok(disney),   type: 'movie' },
      { label: '🌸 Anime',      sublabel: 'Popular',    items: ok(anime),    type: 'tv'    },
    ];

    rows.forEach(({ label, sublabel, items, type, showType }) => {
      if (!items.length) return;
      root.appendChild(Row({ label, sublabel, items: items.slice(0, 20), type, onCard, showType }));
    });

  } catch (e) {
    root.innerHTML = '';
    root.appendChild(Empty('⚠️', 'Failed to load', e.message));
  }

  return root;
}
