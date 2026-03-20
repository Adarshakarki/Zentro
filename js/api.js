/* ── API ─────────────────────────────────────────── */
import { TMDB } from './config.js';

async function get(path, params = {}) {
  const u = new URL(TMDB.base + path);
  u.searchParams.set('api_key', TMDB.key);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

export const api = {
  trending: ()       => get('/trending/all/week'),
  topRated: ()       => get('/movie/top_rated'),
  netflix:  ()       => get('/discover/movie', { with_watch_providers: '8',   watch_region: 'US', sort_by: 'popularity.desc' }),
  disney:   ()       => get('/discover/movie', { with_watch_providers: '337', watch_region: 'US', sort_by: 'popularity.desc' }),
  anime:    ()       => get('/discover/tv',    { with_genres: '16', with_origin_country: 'JP', sort_by: 'popularity.desc' }),
  detail:   (t, id)  => get(`/${t}/${id}`,     { append_to_response: 'seasons,genres,credits,similar' }),
  season:   (id, n)  => get(`/tv/${id}/season/${n}`),
  search:   (q)      => get('/search/multi',   { query: q, include_adult: false }),
};

/* Live TV channels from iptv-org */
export async function fetchLiveChannels() {
  const [channels, streams] = await Promise.all([
    fetch('https://iptv-org.github.io/api/channels.json').then(r => r.json()),
    fetch('https://iptv-org.github.io/api/streams.json').then(r => r.json()),
  ]);

  /* index streams by channel id */
  const streamMap = {};
  streams.forEach(s => {
    if (!streamMap[s.channel]) streamMap[s.channel] = s.url;
  });

  /* only channels with a working stream + logo */
  const POPULAR = [
    'CNN','BBCNews','MSNBC','FoxNews','ESPN','ESPN2','NBCSports',
    'Bloomberg','AlJazeera','DeutscheWelle','France24','NHKWorld',
    'Euronews','CNBC','Sky News','CBS News','ABC News',
    'Discovery Channel','National Geographic','History Channel',
    'NASA TV','NASA TV 2','MTV','VH1','BET',
  ];

  return channels
    .filter(c => streamMap[c.id] && c.logo && POPULAR.some(n => c.name.includes(n)))
    .map(c => ({ id: c.id, name: c.name, logo: c.logo, stream: streamMap[c.id], country: c.country, categories: c.categories }))
    .slice(0, 40);
}
