/* ── CONFIG ─────────────────────────────────────── */
export const TMDB = {
  base: 'https://api.themoviedb.org/3',
  key:  'YOUR_TMDB_KEY_HERE',
};

export const img = (path, size = 'w342') =>
  path
    ? `https://wsrv.nl/?url=https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2F${size}${encodeURIComponent(path)}&output=webp&q=80&n=-1`
    : null;

export const player = {
  movie: (id, opts = {}) => buildVid(`https://www.vidking.net/embed/movie/${id}`, opts),
  tv:    (id, s, e, opts = {}) => buildVid(`https://www.vidking.net/embed/tv/${id}/${s}/${e}`, opts),
};

function buildVid(base, extra = {}) {
  const p = new URLSearchParams({ color: 'e8b84b', autoPlay: 'true', nextEpisode: 'true', episodeSelector: 'true', ...extra });
  return `${base}?${p}`;
}
