import { api } from '../api.js';
import { mk, Empty, Loader, Card } from '../components.js';

const TABS = {
  movie: [
    { label: 'Popular', fn: (p) => api.popular('movie', p) },
    { label: 'Top Rated', fn: (p) => api.topRated(p) },
    { label: 'Now Playing', fn: (p) => api.nowPlaying(p) },
    { label: 'Upcoming', fn: (p) => api.upcoming(p) },
    {
      label: 'Action',
      fn: (p) =>
        api.discover(
          'movie',
          { with_genres: '28', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Comedy',
      fn: (p) =>
        api.discover(
          'movie',
          { with_genres: '35', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Horror',
      fn: (p) =>
        api.discover(
          'movie',
          { with_genres: '27', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Sci-Fi',
      fn: (p) =>
        api.discover(
          'movie',
          { with_genres: '878', sort_by: 'popularity.desc' },
          p
        ),
    },
    { label: 'Netflix', fn: (p) => api.netflixMovie(p) },
    { label: 'HBO', fn: (p) => api.hboMovie(p) },
    { label: 'Prime', fn: (p) => api.primeMovie(p) },
    { label: 'Disney+', fn: (p) => api.disneyMovie(p) },
  ],
  tv: [
    { label: 'Popular', fn: (p) => api.popular('tv', p) },
    { label: 'Top Rated', fn: (p) => api.topRatedTV(p) },
    { label: 'On The Air', fn: (p) => api.onTheAir(p) },
    { label: 'Anime', fn: (p) => api.anime(p) },
    {
      label: 'Drama',
      fn: (p) =>
        api.discover(
          'tv',
          { with_genres: '18', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Crime',
      fn: (p) =>
        api.discover(
          'tv',
          { with_genres: '80', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Comedy',
      fn: (p) =>
        api.discover(
          'tv',
          { with_genres: '35', sort_by: 'popularity.desc' },
          p
        ),
    },
    {
      label: 'Reality',
      fn: (p) =>
        api.discover(
          'tv',
          { with_genres: '10764', sort_by: 'popularity.desc' },
          p
        ),
    },
    { label: 'Netflix', fn: (p) => api.netflixTV(p) },
    { label: 'HBO / Max', fn: (p) => api.hboTV(p) },
    { label: 'Prime Video', fn: (p) => api.primeTV(p) },
    { label: 'Apple TV+', fn: (p) => api.appleTV(p) },
    { label: 'Disney+', fn: (p) => api.disneyTV(p) },
  ],
};

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
      items.forEach((item) =>
        grid.appendChild(Card({ item, type, onClick: onCard }))
      );
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
