import { TMDB } from './config.js';

async function get(path, params = {}) {
  const isProxy = !TMDB.base.includes('themoviedb');

  let u;
  if (isProxy) {
    /* Cloudflare Worker / any proxy: ?path=movie/123&... */
    u = new URL(TMDB.base);
    u.searchParams.set('path', path.replace(/^\//, ''));
  } else {
    /* Direct TMDB (local dev) */
    u = new URL(TMDB.base + path);
    u.searchParams.set('api_key', TMDB.key);
  }

  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

const disc = (type, providers) =>
  get(`/discover/${type}`, {
    with_watch_providers: providers,
    watch_region: 'US',
    sort_by: 'popularity.desc',
  });

export const api = {
  trending: () => get('/trending/all/week'),
  trendingMovies: () => get('/trending/movie/week'),
  trendingTV: () => get('/trending/tv/week'),
  topRated: () => get('/movie/top_rated'),
  topRatedTV: () => get('/tv/top_rated'),
  netflixTV: () => disc('tv', '8'),
  hboTV: () => disc('tv', '1899'),
  primeTV: () => disc('tv', '9'),
  appleTV: () => disc('tv', '350'),
  disneyTV: () => disc('tv', '337'),
  anime: () =>
    get('/discover/tv', {
      with_genres: '16',
      with_origin_country: 'JP',
      sort_by: 'popularity.desc',
    }),
  detail: (t, id) =>
    get(`/${t}/${id}`, {
      append_to_response: 'seasons,genres,credits,similar,images',
    }),
  season: (id, n) => get(`/tv/${id}/season/${n}`),
  search: (q) => get('/search/multi', { query: q, include_adult: false }),
};
