const K = {
  history: 'cl_history',
  watchlist: 'cl_watchlist',
  progress: 'cl_progress',
};

const memCache = {
  history: null,
  watchlist: null,
  progress: null,
};

const load = (k, def = []) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : def;
  } catch {
    return def;
  }
};

const getCache = (key, def) => {
  if (memCache[key] === null) {
    memCache[key] = load(K[key], def);
  }
  return memCache[key];
};

const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (err) {
    console.warn('[storage] Failed to save to localStorage:', err);
  }
};

let progressSaveTimeout = null;
const flushProgress = () => {
  if (memCache.progress !== null) {
    save(K.progress, memCache.progress);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushProgress);
  window.addEventListener('pagehide', flushProgress);
}

export const history = {
  add(item, type, meta = {}) {
    const title = item.title || item.name;
    if (!title || !item.id) return;
    let h = getCache('history', []).filter(
      (x) => !(x.id === item.id && x.type === type)
    );
    h.unshift({
      id: item.id,
      type,
      title,
      poster: item.poster_path || item.poster,
      added: Date.now(),
      ...meta,
    });
    h = h.slice(0, 100);
    memCache.history = h;
    save(K.history, h);
  },
  get: () => getCache('history', []).filter((x) => x.title && x.id),
  remove(id, t) {
    const filtered = getCache('history', []).filter((x) => !(x.id === id && x.type === t));
    memCache.history = filtered;
    save(K.history, filtered);
  },
  clear() {
    memCache.history = [];
    localStorage.removeItem(K.history);
  },
};

export const watchlist = {
  toggle(item, type) {
    const title = item.title || item.name;
    if (!title || !item.id) return false;
    let w = getCache('watchlist', []);
    const exists = w.some((x) => x.id === item.id && x.type === type);
    if (exists) {
      w = w.filter((x) => !(x.id === item.id && x.type === type));
    } else {
      w.unshift({
        id: item.id,
        type,
        title,
        poster: item.poster_path || item.poster,
        added: Date.now(),
      });
    }
    memCache.watchlist = w;
    save(K.watchlist, w);
    return !exists;
  },
  has: (id, t) => getCache('watchlist', []).some((x) => x.id === id && x.type === t),
  get: () => getCache('watchlist', []).filter((x) => x.title && x.id),
  clear() {
    memCache.watchlist = [];
    localStorage.removeItem(K.watchlist);
  },
};

export const progress = {
  getKey(id, type, s, e) {
    if (type === 'movie') return `movie_${id}`;
    return `tv_${id}_s${s || 1}_e${e || 1}`;
  },
  set(key, { t, d, p }) {
    const all = getCache('progress', {});
    all[key] = { t, d, p };
    memCache.progress = all;

    if (!progressSaveTimeout) {
      progressSaveTimeout = setTimeout(() => {
        progressSaveTimeout = null;
        flushProgress();
      }, 1500);
    }
  },
  get(key) {
    return getCache('progress', {})[key] || null;
  },
  label(key) {
    const s = this.get(key);
    if (!s?.d) return null;
    const left = Math.max(0, s.d - s.t);
    if (left < 60) return `${left}s left`;
    const m = Math.floor(left / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m left` : `${m}m left`;
  },
};
