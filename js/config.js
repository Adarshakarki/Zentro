const WORKER_URL = 'https://zentro-tmdb.adarsha99999.workers.dev';

export const TMDB = {
  base:
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
      ? 'https://api.themoviedb.org/3'
      : WORKER_URL,

  get key() {
    try {
      return window._tmdbKey || localStorage.getItem('zentro_tmdb_key') || '';
    } catch {
      return '';
    }
  },
};

export let ready = Promise.resolve();

if (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
) {
  ready = import('./env.js')
    .then(({ TMDB_KEY }) => {
      window._tmdbKey = TMDB_KEY;
    })
    .catch(() => {});
}

export const img = (path, size = 'w342') =>
  path
    ? `https://wsrv.nl/?url=https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2F${size}${encodeURIComponent(path)}&output=webp&q=80&n=-1`
    : null;

export const PLAYER_ORIGIN = 'https://vidphantom.com';

export const player = {
  movie: (id, opts = {}) => buildVid(`${PLAYER_ORIGIN}/movie/${id}`, opts),
  tv: (id, s, e, opts = {}) => buildVid(`${PLAYER_ORIGIN}/tv/${id}/${s}/${e}`, opts),
};

function buildVid(base, extra = {}) {
  const p = new URLSearchParams({
    primaryColor: '96A78D',
    accentColor: '96A78D',
    autoplay: 'true',
    nextbutton: 'true',
    poster: 'true',
    ...extra,
  });
  return `${base}?${p}`;
}
