/* ── STORAGE ─────────────────────────────────────── */
const K = { history: 'cl_history', watchlist: 'cl_watchlist', progress: 'cl_progress' };
const load = k => JSON.parse(localStorage.getItem(k) || '[]');
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export const history = {
  add(item, type) {
    let h = load(K.history).filter(x => !(x.id === item.id && x.type === type));
    h.unshift({ id: item.id, type, title: item.title || item.name, poster: item.poster_path, added: Date.now() });
    save(K.history, h.slice(0, 100));
  },
  get:    ()      => load(K.history),
  remove: (id, t) => save(K.history, load(K.history).filter(x => !(x.id === id && x.type === t))),
  clear:  ()      => localStorage.removeItem(K.history),
};

export const watchlist = {
  toggle(item, type) {
    let w = load(K.watchlist);
    const exists = w.some(x => x.id === item.id && x.type === type);
    if (exists) w = w.filter(x => !(x.id === item.id && x.type === type));
    else w.unshift({ id: item.id, type, title: item.title || item.name, poster: item.poster_path, added: Date.now() });
    save(K.watchlist, w);
    return !exists;
  },
  has:   (id, t) => load(K.watchlist).some(x => x.id === id && x.type === t),
  get:   ()      => load(K.watchlist),
  clear: ()      => localStorage.removeItem(K.watchlist),
};

/* progress key: "movie_123" | "tv_123_s1_e4" */
export const progress = {
  set(key, { currentTime, duration, progress: pct }) {
    const all = JSON.parse(localStorage.getItem(K.progress) || '{}');
    all[key] = { t: Math.floor(currentTime), d: Math.floor(duration), p: +pct.toFixed(1) };
    localStorage.setItem(K.progress, JSON.stringify(all));
  },
  get(key) {
    return JSON.parse(localStorage.getItem(K.progress) || '{}')[key] || null;
  },
  /* "1h 24m left" label for UI */
  label(key) {
    const s = this.get(key);
    if (!s?.d) return null;
    const left = Math.max(0, s.d - s.t);
    if (left < 60) return `${left}s left`;
    const m = Math.floor(left / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m left` : `${m}m left`;
  },
};
