import { TMDB } from '../config.js';
import { mk, Empty, Loader } from '../components.js';
import { img } from '../config.js';
import { icon } from '../icons.js';

async function tmdb(path, params = {}, page = 1) {
  const u = new URL(TMDB.base + path);
  u.searchParams.set('api_key', TMDB.key);
  u.searchParams.set('page', page);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

const disc =
  (type, providers) =>
  (page = 1) =>
    tmdb(
      `/discover/${type}`,
      {
        with_watch_providers: providers,
        watch_region: 'US',
        sort_by: 'popularity.desc',
      },
      page
    );

const TABS = {
  movie: [
    { label: 'Popular', fn: (p) => tmdb('/movie/popular', {}, p) },
    { label: 'Top Rated', fn: (p) => tmdb('/movie/top_rated', {}, p) },
    { label: 'Now Playing', fn: (p) => tmdb('/movie/now_playing', {}, p) },
    { label: 'Upcoming', fn: (p) => tmdb('/movie/upcoming', {}, p) },
    {
      label: 'Action',
      fn: (p) =>
        tmdb(
          '/discover/movie',
          { with_genres: '28', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Comedy',
      fn: (p) =>
        tmdb(
          '/discover/movie',
          { with_genres: '35', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Horror',
      fn: (p) =>
        tmdb(
          '/discover/movie',
          { with_genres: '27', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Sci-Fi',
      fn: (p) =>
        tmdb(
          '/discover/movie',
          { with_genres: '878', sort_by: 'popularity.desc' },
          p
        ),
    },
    { label: 'Netflix', fn: disc('movie', '8') },
    { label: 'HBO', fn: disc('movie', '1899') },
    { label: 'Prime', fn: disc('movie', '9') },
    { label: 'Disney+', fn: disc('movie', '337') },
  ],
  tv: [
    { label: 'Popular', fn: (p) => tmdb('/tv/popular', {}, p) },
    { label: 'Top Rated', fn: (p) => tmdb('/tv/top_rated', {}, p) },
    { label: 'On The Air', fn: (p) => tmdb('/tv/on_the_air', {}, p) },
    {
      label: 'Anime',
      fn: (p) =>
        tmdb(
          '/discover/tv',
          {
            with_genres: '16',
            with_origin_country: 'JP',
            sort_by: 'popularity.desc',
          },
          p
        ),
    },
    {
      label: 'Drama',
      fn: (p) =>
        tmdb(
          '/discover/tv',
          { with_genres: '18', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Crime',
      fn: (p) =>
        tmdb(
          '/discover/tv',
          { with_genres: '80', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Comedy',
      fn: (p) =>
        tmdb(
          '/discover/tv',
          { with_genres: '35', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Reality',
      fn: (p) =>
        tmdb(
          '/discover/tv',
          { with_genres: '10764', sort_by: 'popularity.desc' },
          p
        ),
    },
    { label: 'Netflix', fn: disc('tv', '8') },
    { label: 'HBO / Max', fn: disc('tv', '1899') },
    { label: 'Prime Video', fn: disc('tv', '9') },
    { label: 'Apple TV+', fn: disc('tv', '350') },
    { label: 'Disney+', fn: disc('tv', '337') },
  ],
};

function makeCard(item, type, onCard) {
  const poster = img(item.poster_path, 'w342');
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const title = item.title || item.name;
  const card = mk('div', 'card');
  card.innerHTML = `
    <div class="card-thumb">
      ${poster ? `<img src="${poster}" alt="${title}" loading="lazy">` : `<div class="card-ph">${icon('film', 28, { stroke: 'var(--muted)' })}</div>`}
      <div class="card-overlay"><div class="card-play-icon">${icon('play', 20, { fill: '#000', stroke: 'none' })}</div></div>
      ${rating ? `<div class="card-rating">★ ${rating}</div>` : ''}
    </div>
    <div class="card-body">
      <div class="card-title">${title}</div>
      ${year ? `<div class="card-foot"><span class="card-year">${year}</span></div>` : ''}
    </div>`;
  card.addEventListener('click', () => onCard(item, type));
  return card;
}

export async function BrowseView(type, onCard) {
  const root = mk('div', 'browse-view');
  root.appendChild(
    mk('h2', 'page-heading', type === 'movie' ? 'Movies' : 'Series')
  );

  const tabs = TABS[type];
  let active = 0;
  let page = 1;
  let loading = false;
  let maxPage = 1;

  /* scrollable tab bar */
  const tabBar = mk('div', 'browse-tab-bar');
  tabs.forEach(({ label }, i) => {
    const b = mk('button', `browse-tab${i === 0 ? ' active' : ''}`, label);
    b.addEventListener('click', () => loadTab(i));
    tabBar.appendChild(b);
  });
  root.appendChild(tabBar);

  const grid = mk('div', 'card-grid');
  const loadBtn = mk('button', 'browse-load-more', 'Load More');
  root.appendChild(grid);
  root.appendChild(loadBtn);

  async function loadTab(i) {
    if (i === active && page > 1) return;
    active = i;
    page = 1;
    tabBar
      .querySelectorAll('.browse-tab')
      .forEach((b, j) => b.classList.toggle('active', j === i));
    grid.innerHTML = '';
    grid.appendChild(Loader());
    loadBtn.style.display = 'none';
    await loadPage();
  }

  async function loadPage() {
    if (loading) return;
    loading = true;
    loadBtn.textContent = 'Loading…';
    loadBtn.disabled = true;
    try {
      const data = await tabs[active].fn(page);
      const items = (data.results || []).filter((x) => x.poster_path);
      maxPage = data.total_pages || 1;
      if (page === 1) grid.innerHTML = '';
      items.forEach((item) => grid.appendChild(makeCard(item, type, onCard)));
      loadBtn.style.display = page < maxPage ? 'block' : 'none';
      loadBtn.textContent = 'Load More';
      loadBtn.disabled = false;
      page++;
    } catch (e) {
      grid.innerHTML = '';
      grid.appendChild(Empty('Failed to load', e.message));
    }
    loading = false;
  }

  loadBtn.addEventListener('click', loadPage);
  await loadTab(0);
  return root;
}
