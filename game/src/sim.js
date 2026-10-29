// Sim Shire rules: pure functions, no DOM, no randomness. Implements
// design/GAME_DESIGN.md "The rules (exact)" and matches .gamegen/refsim/sim.js.
import { B, FOLK, TER, W, H, LEVELS, TERRAIN_NAME } from './data.js';

export const LIKE = 10, DISLIKE = 12, INN_DISLIKE = 6, GREEN_AURA = 10, HUNGRY = -15, WARMTH = 5, NEIGHBOURS = 5, SETTLERS_MAX = 2;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const terr = (lv, x, y) => TER[lv.map[y][x]];
const emptyGrid = () => Array.from({ length: H }, () => Array(W).fill(null));

export function newState(levelIndex) {
  const lv = LEVELS[levelIndex];
  const s = { level: levelIndex, lv, day: 0, wood: lv.start[0], stone: lv.start[1], b: [], nextId: 1, gather: 0, complete: false, grid: emptyGrid() };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (lv.map[y][x] === 'W') {
    const w = { id: 0, kind: 'well', x, y, res: 0, grumpy: 0 }; s.b.push(w); s.grid[y][x] = w;
  }
  for (const [kind, x, y, res] of lv.hamlet || []) {
    const b = { id: s.nextId++, kind, x, y, res: res || 0, grumpy: 0 }; s.b.push(b); s.grid[y][x] = b;
  }
  return s;
}

export function serialize(s) {
  return { level: s.level, day: s.day, wood: s.wood, stone: s.stone, gather: s.gather, nextId: s.nextId,
    buildings: s.b.map(b => ({ id: b.id, kind: b.kind, x: b.x, y: b.y, res: b.res, grumpy: b.grumpy })) };
}
export function deserialize(o) {
  const lv = LEVELS[o && o.level];
  if (!lv || !Array.isArray(o.buildings)) throw new Error('bad save');
  const s = { level: o.level, lv, day: o.day, wood: o.wood, stone: o.stone, gather: o.gather || 0, nextId: o.nextId, complete: false, grid: emptyGrid(), b: [] };
  for (const d of o.buildings) {
    if (!B[d.kind] || d.x < 0 || d.y < 0 || d.x >= W || d.y >= H || s.grid[d.y][d.x]) throw new Error('bad save');
    const b = { id: d.id, kind: d.kind, x: d.x, y: d.y, res: d.res | 0, grumpy: d.grumpy | 0 }; s.b.push(b); s.grid[b.y][b.x] = b;
  }
  s.b.sort((a, c) => a.id - c.id);
  const wells = s.b.filter(b => b.kind === 'well');
  if (wells.length !== 1 || lv.map[wells[0].y][wells[0].x] !== 'W') throw new Error('bad save');
  for (const b of s.b) if (b.kind !== 'well') {
    const d = B[b.kind], ch = lv.map[b.y][b.x];
    if (d.on === 'shelf' ? ch !== 'L' : d.on !== terr(lv, b.x, b.y)) throw new Error('bad save');
    if (b.res < 0 || b.res > (d.cap || 0)) throw new Error('bad save');
  }
  s.nextId = Math.max(s.nextId | 0, ...s.b.map(b => b.id + 1));
  return s;
}
export const clone = s => deserialize(serialize(s));

export function inShire(s) {
  const seen = Array.from({ length: H }, () => Array(W).fill(false));
  const well = s.b.find(b => b.kind === 'well'); const q = [[well.x, well.y]]; seen[well.y][well.x] = true;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny][nx]) continue;
      const t = terr(s.lv, nx, ny), bb = s.grid[ny][nx];
      if (t === 'water' && !(bb && B[bb.kind].bridge)) continue;
      seen[ny][nx] = true; q.push([nx, ny]);
    }
  }
  return seen;
}

// Returns null if legal, else a player-facing reason.
export function canPlace(s, kind, x, y) {
  const d = B[kind]; if (!d || kind === 'well') return 'Unknown building';
  if (!s.lv.tools.includes(kind)) return 'Not unlocked yet';
  if (x < 0 || y < 0 || x >= W || y >= H) return 'Off the map';
  if (s.grid[y][x]) return 'Something is already here';
  const ch = s.lv.map[y][x], t = terr(s.lv, x, y);
  const sh = inShire(s);
  if (d.on === 'shelf') { if (ch !== 'L') return 'The Lair goes on the glowing rock shelf'; }
  else if (d.on !== t) {
    if (d.on === 'forest') return 'Tree Houses go in the forest';
    if (d.on === 'water') return 'Bridges go over water';
    return t === 'water' ? 'Needs land, not water' : 'Needs open grass';
  }
  if (d.bridge) {
    const ok = [-1, 1].some(dx => { const nx = x + dx; return nx >= 0 && nx < W && sh[y][nx]; });
    if (!ok) return 'A bridge must start from the shire bank';
  } else if (!sh[y][x]) return 'Across the water: build a bridge first';
  if (d.touch && !N4.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && d.touch.includes(terr(s.lv, nx, ny)); }))
    return 'Must touch ' + d.touch.map(t => TERRAIN_NAME[t].toLowerCase()).join(' or ');
  if (d.max && s.b.filter(b => b.kind === kind).length >= d.max) return 'Only one ' + d.name;
  const [cw, cs] = d.cost;
  if (s.wood < cw && s.stone < cs) return `Need ${cw - s.wood} more wood and ${cs - s.stone} more stone`;
  if (s.wood < cw) return `Need ${cw - s.wood} more wood`;
  if (s.stone < cs) return `Need ${cs - s.stone} more stone`;
  return null;
}

export function place(s, kind, x, y) {
  const e = canPlace(s, kind, x, y); if (e) throw new Error(`place ${kind} ${x},${y}: ${e}`);
  const d = B[kind]; s.wood -= d.cost[0]; s.stone -= d.cost[1];
  const b = { id: s.nextId++, kind, x, y, res: 0, grumpy: 0 }; s.b.push(b); s.grid[y][x] = b; return b;
}

export function canClear(s, x, y) {
  const b = s.grid[y] && s.grid[y][x];
  if (!b) return 'Nothing to clear here';
  if (b.kind === 'well') return 'The Old Well stays';
  s.grid[y][x] = null; const idx = s.b.indexOf(b); s.b.splice(idx, 1);
  const sh = inShire(s);
  const cut = s.b.find(o => o.kind !== 'well' && !(B[o.kind].bridge ? [-1, 1].some(dx => sh[o.y][o.x + dx]) : sh[o.y][o.x]));
  s.grid[y][x] = b; s.b.splice(idx, 0, b);
  if (cut) return 'Clear the buildings across it first';
  return null;
}
export function clear(s, x, y) {
  const e = canClear(s, x, y); if (e) throw new Error(`clear ${x},${y}: ${e}`);
  const b = s.grid[y][x]; s.grid[y][x] = null; s.b = s.b.filter(o => o !== b);
  s.wood += B[b.kind].cost[0]; s.stone += B[b.kind].cost[1]; return b;
}

export const inRange = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 2;
export const folkOf = h => B[h.kind].folk;
export const isHome = b => !!(B[b.kind] && B[b.kind].folk);
export const homes = s => s.b.filter(isHome);
export const neighbourly = (s, h) => s.b.some(o => o !== h && isHome(o) && o.res > 0 && folkOf(o) !== folkOf(h) && inRange(o, h));
export const foodProd = s => s.b.reduce((a, b) => a + (B[b.kind].food || 0), 0);
export const residents = s => homes(s).reduce((a, b) => a + b.res, 0);
export const hungry = s => residents(s) > foodProd(s);

function rangeInfo(s, h) {
  const kinds = new Set(), ters = new Set();
  for (let y = h.y - 2; y <= h.y + 2; y++) for (let x = h.x - 2; x <= h.x + 2; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    ters.add(terr(s.lv, x, y));
    const bb = s.grid[y][x]; if (bb && bb !== h) kinds.add(bb.kind);
  }
  return { kinds, ters };
}
const label = k => (B[k] && B[k].name) || TERRAIN_NAME[k] || k;

// lines: [{v, text, k}] for the info card
function rawHappy(s, h, lines) {
  const f = FOLK[folkOf(h)]; const { kinds, ters } = rangeInfo(s, h);
  const has = k => kinds.has(k) || ters.has(k);
  let v = 50;
  if (hungry(s)) { v += HUNGRY; lines && lines.push({ v: HUNGRY, text: 'Hungry', k: 'hungry' }); }
  for (const k of f.loves) if (has(k)) { v += LIKE; lines && lines.push({ v: LIKE, text: label(k), k }); }
  const inn = kinds.has('inn'), green = kinds.has('green');
  for (const k of f.hates) if (has(k)) {
    if (k === 'lair' && green) { lines && lines.push({ v: 0, text: 'Lair (Green)', k }); continue; }
    const d = inn ? -INN_DISLIKE : -DISLIKE; v += d;
    lines && lines.push({ v: d, text: label(k) + (inn ? ' (Inn)' : ''), k });
  }
  if (green) { v += GREEN_AURA; lines && lines.push({ v: GREEN_AURA, text: 'Festival Green', k: 'green' }); }
  if (neighbourly(s, h)) { v += NEIGHBOURS; lines && lines.push({ v: NEIGHBOURS, text: 'Neighbours', k: 'neighbours' }); }
  return v;
}
const clamp = v => Math.max(0, Math.min(100, v));
export function dragonCheerful(s) {
  const lair = s.b.find(b => b.kind === 'lair');
  return !!(lair && lair.res === 1 && clamp(rawHappy(s, lair)) >= 70);
}
export function happiness(s, h, lines) {
  if (h.kind === 'lair') return clamp(rawHappy(s, h, lines));
  let v = rawHappy(s, h, lines);
  if (dragonCheerful(s)) { v += WARMTH; lines && lines.push({ v: WARMTH, text: "Dragon's warmth", k: 'warmth' }); }
  return clamp(v);
}
export function harmony(s) {
  let num = 0, den = 0; for (const h of homes(s)) { num += happiness(s, h) * h.res; den += h.res; }
  return den ? num / den : 0;
}
export const mood = v => v >= 85 ? 'delighted' : v >= 70 ? 'cheerful' : v >= 40 ? 'content' : 'grumpy';
export const neighbourCount = s => homes(s).filter(h => h.res > 0 && neighbourly(s, h)).length;

// Goal list with progress, for chips and cards. Order = chip order.
export function goals(s) {
  const g = s.lv.goal, hs = homes(s), out = [];
  const folkRes = f => hs.filter(h => folkOf(h) === f).reduce((a, h) => a + h.res, 0);
  out.push({ id: 'pop', value: residents(s), target: g.pop, met: residents(s) >= g.pop });
  for (const [f, n] of Object.entries(g.folk || {})) out.push({ id: 'folk', folk: f, value: folkRes(f), target: n, met: folkRes(f) >= n });
  if (g.households) {
    const missing = [];
    let ok = 0;
    for (const [f, n] of Object.entries(g.households)) {
      const c = hs.filter(h => folkOf(h) === f && h.res > 0).length;
      if (c >= n) ok++; else missing.push(f);
    }
    const total = Object.keys(g.households).length;
    out.push({ id: 'households', value: ok, target: total, met: ok >= total, missing });
  }
  if (g.dragon) {
    const l = s.b.find(b => b.kind === 'lair');
    const v = l && l.res >= 1 ? happiness(s, l) : 0;
    out.push({ id: 'dragon', value: v, target: 70, met: !!(l && l.res >= 1 && v >= 70), home: !!(l && l.res >= 1) });
  }
  if (g.greenAll) {
    const greens = s.b.filter(b => b.kind === 'green');
    const missing = g.greenAll.filter(f => !hs.some(h => h.res > 0 && folkOf(h) === f && greens.some(gr => inRange(gr, h))));
    const hasReq = (g.requires || []).every(k => s.b.some(b => b.kind === k));
    out.push({ id: 'green', value: g.greenAll.length - missing.length, target: g.greenAll.length, met: hasReq && missing.length === 0, missing, hasGreen: greens.length > 0 });
  }
  if (g.neighbours) { const n = neighbourCount(s); out.push({ id: 'neighbours', value: n, target: g.neighbours, met: n >= g.neighbours }); }
  const hv = harmony(s);
  out.push({ id: 'harmony', value: hv, target: g.harmony, met: hv >= g.harmony });
  return out;
}
export const goalsMet = s => goals(s).every(g => g.met);

// One day. Returns events for the game's juice and sounds.
export function tick(s) {
  const ev = { settlers: [], moveouts: [], wood: 0, stone: 0 };
  for (const b of s.b) { const d = B[b.kind]; s.wood += d.wood || 0; s.stone += d.stone || 0; ev.wood += d.wood || 0; ev.stone += d.stone || 0; }
  const hs = homes(s); const hap = new Map(hs.map(h => [h, happiness(s, h)]));
  for (const h of hs) {
    if (h.res === 0) { h.grumpy = 0; continue; }
    if (hap.get(h) < 40) { h.grumpy++; if (h.grumpy >= 3) { h.res--; h.grumpy = 0; ev.moveouts.push(h); } } else h.grumpy = 0;
  }
  const anyGrumpy = hs.some(h => h.res > 0 && hap.get(h) < 40);
  for (let n = 0; n < (anyGrumpy ? 1 : SETTLERS_MAX); n++) {
    if (foodProd(s) < residents(s) + 1) break;
    const el = hs.filter(h => h.res < B[h.kind].cap && hap.get(h) >= 40).sort((a, b) => a.res - b.res || a.id - b.id);
    if (!el.length) break; el[0].res++; ev.settlers.push(el[0]);
  }
  const met = goalsMet(s);
  ev.gatherStart = met && s.gather === 0;
  ev.gatherBroke = !met && s.gather > 0;
  s.gather = met ? s.gather + 1 : 0;
  s.day++;
  if (s.gather >= 3) { s.complete = true; ev.complete = true; }
  return ev;
}

// Net happiness change of every home if `action` were applied.
// action: {op:'place', kind, x, y} | {op:'clear', x, y}. Returns {ok, reason, deltas: Map(id->delta), after: Map(id->hap), ghostHap}
export function preview(s, action) {
  const reason = action.op === 'place' ? canPlace(s, action.kind, action.x, action.y) : canClear(s, action.x, action.y);
  const before = new Map(homes(s).map(h => [h.id, happiness(s, h)]));
  // illegal only due to cost: still preview the effect
  const costOnly = reason && /^Need \d/.test(reason);
  if (reason && !costOnly) return { ok: false, reason, deltas: new Map() };
  const c = clone(s);
  let ghost = null;
  if (action.op === 'place') {
    const d = B[action.kind]; c.wood = Math.max(c.wood, d.cost[0]); c.stone = Math.max(c.stone, d.cost[1]);
    ghost = place(c, action.kind, action.x, action.y);
  } else clear(c, action.x, action.y);
  const deltas = new Map();
  for (const h of homes(c)) if (before.has(h.id)) { const dv = happiness(c, h) - before.get(h.id); if (dv) deltas.set(h.id, dv); }
  const out = { ok: !reason, reason, deltas };
  if (ghost && isHome(ghost)) { const lines = []; out.ghostHap = happiness(c, ghost, lines); out.ghostLines = lines; }
  return out;
}

// Replays a step list (design/solutions/*.json) headlessly.
export function runSteps(levelIndex, steps) {
  const s = newState(levelIndex);
  for (const st of steps) {
    if (st.op === 'place') place(s, st.tool, st.tile[0], st.tile[1]);
    else if (st.op === 'clear') clear(s, st.tile[0], st.tile[1]);
    else if (st.op === 'advanceDays') for (let i = 0; i < st.n && !s.complete; i++) tick(s);
  }
  return s;
}
