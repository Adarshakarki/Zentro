const K = {
  history: 'cl_history',
  watchlist: 'cl_watchlist',
  progress: 'cl_progress',
};
const load = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || '[]');
  } catch {
    return [];
  }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export const history = {
  add(item, type) {
    const title = item.title || item.name;
    if (!title || !item.id) return; /* skip entries with no title */
    let h = load(K.history).filter(
      (x) => !(x.id === item.id && x.type === type)
    );
    h.unshift({
      id: item.id,
      type,
      title,
      poster: item.poster_path,
      added: Date.now(),
    });
    save(K.history, h.slice(0, 100));
  },
  get: () =>
    load(K.history).filter(
      (x) => x.title && x.id
    ) /* strip any corrupt entries */,
  remove: (id, t) =>
    save(
      K.history,
      load(K.history).filter((x) => !(x.id === id && x.type === t))
    ),
  clear: () => localStorage.removeItem(K.history),
};

export const watchlist = {
  toggle(item, type) {
    const title = item.title || item.name;
    if (!title || !item.id) return false;
    let w = load(K.watchlist);
    const exists = w.some((x) => x.id === item.id && x.type === type);
    if (exists) w = w.filter((x) => !(x.id === item.id && x.type === type));
    else
      w.unshift({
        id: item.id,
        type,
        title,
        poster: item.poster_path,
        added: Date.now(),
      });
    save(K.watchlist, w);
    return !exists;
  },
  has: (id, t) => load(K.watchlist).some((x) => x.id === id && x.type === t),
  get: () => load(K.watchlist).filter((x) => x.title && x.id),
  clear: () => localStorage.removeItem(K.watchlist),
};

export const progress = {
  set(key, { t, d, p }) {
    const all = JSON.parse(localStorage.getItem(K.progress) || '{}');
    all[key] = { t, d, p };
    localStorage.setItem(K.progress, JSON.stringify(all));
  },
  get(key) {
    return JSON.parse(localStorage.getItem(K.progress) || '{}')[key] || null;
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
