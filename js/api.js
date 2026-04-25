import { TMDB, img, ready } from './config.js';

async function get(path, params = {}) {
  await ready;

  const isProxy = !TMDB.base.includes('themoviedb');

  let u;
  if (isProxy) {
    // Request via Cloudflare Worker proxy
    u = new URL(
      `${TMDB.base}?path=${encodeURIComponent(path.replace(/^\//, ''))}`
    );
  } else {
    // Direct request to TMDB (local development)
    if (!TMDB.key) {
      console.error('[zentro] Missing TMDB API Key.');
      throw new Error('Missing API Key');
    }
    u = new URL(TMDB.base + path);
    u.searchParams.set('api_key', TMDB.key);
  }

  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

const disc = (type, providers, page = 1) =>
  get(`/discover/${type}`, {
    with_watch_providers: providers,
    watch_region: 'US',
    sort_by: 'popularity.desc',
    page,
  });

export const api = {
  trending: () => get('/trending/all/week'),
  trendingMovies: () => get('/trending/movie/week'),
  trendingTV: () => get('/trending/tv/week'),
  topRated: (page = 1) => get('/movie/top_rated', { page }),
  topRatedTV: (page = 1) => get('/tv/top_rated', { page }),
  popular: (type, page = 1) => get(`/${type}/popular`, { page }),
  nowPlaying: (page = 1) => get('/movie/now_playing', { page }),
  upcoming: (page = 1) => get('/movie/upcoming', { page }),
  onTheAir: (page = 1) => get('/tv/on_the_air', { page }),
  netflixTV: (page = 1) => disc('tv', '8', page),
  netflixMovie: (page = 1) => disc('movie', '8', page),
  hboTV: (page = 1) => disc('tv', '1899', page),
  hboMovie: (page = 1) => disc('movie', '1899', page),
  primeTV: (page = 1) => disc('tv', '9', page),
  primeMovie: (page = 1) => disc('movie', '9', page),
  appleTV: (page = 1) => disc('tv', '350', page),
  appleMovie: (page = 1) => disc('movie', '350', page),
  disneyTV: (page = 1) => disc('tv', '337', page),
  disneyMovie: (page = 1) => disc('movie', '337', page),
  anime: (page = 1) =>
    get('/discover/tv', {
      with_genres: '16',
      with_origin_country: 'JP',
      sort_by: 'popularity.desc',
      page,
    }),
  discover: (type, params = {}, page = 1) =>
    get(`/discover/${type}`, { ...params, page }),
  detail: (t, id) =>
    get(`/${t}/${id}`, {
      append_to_response: 'seasons,genres,credits,similar,images,external_ids',
    }),
  season: (id, n) => get(`/tv/${id}/season/${n}`),
  search: (q) => get('/search/multi', { query: q, include_adult: false }),
  logo: async (type, id) => {
    try {
      const d = await get(`/${type}/${id}/images`);
      const en =
        (d.logos || []).find((l) => l.iso_639_1 === 'en') || (d.logos || [])[0];
      return en ? img(en.file_path, 'w500') : null;
    } catch {
      return null;
    }
  },
  genres: async (type) => {
    try {
      const d = await get(`/genre/${type}/list`);
      return d.genres || [];
    } catch {
      return [];
    }
  },
};
