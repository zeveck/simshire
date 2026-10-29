// Progress in localStorage, versioned, tolerant of missing or broken data.
const KEY = 'simshire-save-v1';
const fresh = () => ({ v: 1, unlocked: 1, stars: [0, 0, 0, 0, 0], best: [0, 0, 0, 0, 0], musicMuted: false, sfxMuted: false, current: null, won: false, seenHowTo: false });

export function load() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY));
    if (!o || o.v !== 1) return fresh();
    const f = fresh();
    return { ...f, ...o, stars: (o.stars || f.stars).slice(0, 5), best: (o.best || f.best).slice(0, 5), unlocked: Math.min(5, Math.max(1, o.unlocked | 0)) };
  } catch (e) { return fresh(); }
}
export function store(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode or full: keep playing */ }
}
