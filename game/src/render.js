// Draws the map: terrain, shorelines, props, buildings, wandering folk, moods, preview.
import { IMG } from './assets.js';
import { B, FOLK, W, H } from './data.js';
import * as S from './sim.js';
import { C, text, drawBuilding, drawFolk, moodIcon, FOLK_H, rr, heart, bowlIcon } from './draw.js';

export const MX = 0, MY = 48, TS = 64;
const hash = (x, y, k = 0) => { let h = (x * 73856093) ^ (y * 19349663) ^ (k * 83492791); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------- terrain base (cached per level) ----------
let baseCache = null, baseKey = '';
function buildBase(lv) {
  const sc = 2, cv = document.createElement('canvas'); cv.width = W * TS * sc; cv.height = H * TS * sc;
  const c = cv.getContext('2d'); c.scale(sc, sc);
  const ter = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? null : S.terr(lv, x, y);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const g = IMG[hash(x, y) < 0.5 ? 'ter-grass' : 'ter-grass-2'] || IMG['ter-grass'];
    if (g) c.drawImage(g, x * TS, y * TS, TS, TS); else { c.fillStyle = (x + y) % 2 ? '#7DB45A' : '#78ae55'; c.fillRect(x * TS, y * TS, TS, TS); }
  }
  // soft darker patches under forest and rock
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = ter(x, y);
    if (t === 'forest' || t === 'rock') {
      const gr = c.createRadialGradient(x * TS + 32, y * TS + 36, 6, x * TS + 32, y * TS + 36, 44);
      gr.addColorStop(0, t === 'forest' ? 'rgba(40,80,40,0.35)' : 'rgba(110,100,80,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(x * TS - 16, y * TS - 16, TS + 32, TS + 32);
    }
  }
  // water
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ter(x, y) === 'water') {
    const wi = IMG['ter-water'];
    if (wi) c.drawImage(wi, (x % 2) * 64, (y % 2) * 64, 64, 64, x * TS, y * TS, TS, TS);
    else { c.fillStyle = C.river; c.fillRect(x * TS, y * TS, TS, TS); }
  }
  // shorelines: earthy bank + foam on water edges that touch land
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ter(x, y) === 'water') {
    const X = x * TS, Y = y * TS;
    const sides = [[0, -1, X, Y, TS, 0], [0, 1, X, Y + TS, TS, 0], [-1, 0, X, Y, 0, TS], [1, 0, X + TS, Y, 0, TS]];
    for (const [dx, dy, sx, sy, w, h] of sides) {
      const n = ter(x + dx, y + dy); if (!n || n === 'water') continue;
      const g = dx === 0 ? c.createLinearGradient(sx, sy, sx, sy - dy * 14) : c.createLinearGradient(sx, sy, sx - dx * 14, sy);
      g.addColorStop(0, 'rgba(150,120,70,0.85)'); g.addColorStop(0.35, 'rgba(230,220,180,0.55)'); g.addColorStop(1, 'rgba(91,155,200,0)');
      c.fillStyle = g;
      if (dx === 0) c.fillRect(sx, dy < 0 ? sy : sy - 14, w, 14); else c.fillRect(dx < 0 ? sx : sx - 14, sy, 14, h);
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2; c.beginPath();
      if (dx === 0) { const yy = sy - dy * 7; c.moveTo(sx + 2, yy); for (let k = 0; k <= 8; k++) c.lineTo(sx + k * 8, yy + Math.sin(k * 1.7 + x) * 1.5); }
      else { const xx = sx - dx * 7; c.moveTo(xx, sy + 2); for (let k = 0; k <= 8; k++) c.lineTo(xx + Math.sin(k * 1.7 + y) * 1.5, sy + k * 8); }
      c.stroke();
    }
  }
  // round off convex water corners with grass
  const gim = IMG['ter-grass'], gpat = gim ? c.createPattern((() => { const pc = document.createElement('canvas'); pc.width = pc.height = 64; pc.getContext('2d').drawImage(gim, 0, 0, 64, 64); return pc; })(), 'repeat') : '#7DB45A';
  const R = 18;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ter(x, y) === 'water') {
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const a = ter(x + dx, y), b = ter(x, y + dy);
      if ((a && a !== 'water') && (b && b !== 'water')) {
        const cx = x * TS + (dx > 0 ? TS : 0), cy = y * TS + (dy > 0 ? TS : 0);
        const ox = cx - dx * R, oy = cy - dy * R; // circle centre inside the water tile
        let a0 = Math.atan2(cy - oy, 0), a1 = Math.atan2(0, cx - ox); let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
        const pts = []; for (let k = 0; k <= 10; k++) { const a = a0 + da * k / 10; pts.push([ox + Math.cos(a) * R, oy + Math.sin(a) * R]); }
        c.save(); c.beginPath(); c.moveTo(cx, cy); for (const [px, py] of pts) c.lineTo(px, py); c.closePath(); c.fillStyle = gpat; c.fill();
        c.beginPath(); pts.forEach(([px, py], k) => k ? c.lineTo(px, py) : c.moveTo(px, py)); c.strokeStyle = 'rgba(150,120,70,0.75)'; c.lineWidth = 3; c.stroke(); c.restore();
      }
    }
  }
  // lair shelf glow
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (lv.map[y][x] === 'L') {
    const gr = c.createRadialGradient(x * TS + 32, y * TS + 40, 4, x * TS + 32, y * TS + 40, 40);
    gr.addColorStop(0, 'rgba(255,170,80,0.55)'); gr.addColorStop(1, 'rgba(255,140,60,0)');
    c.fillStyle = gr; c.fillRect(x * TS - 8, y * TS - 8, TS + 16, TS + 16);
  }
  return cv;
}

// ---------- wandering folk (visual only) ----------
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
const foot = b => ({ x: MX + b.x * TS + 32, y: MY + b.y * TS + 58 });
function targetsFor(s, h) {
  const f = FOLK[S.folkOf(h)], out = [foot(h)];
  for (const o of s.b) {
    if (o === h || !S.inRange(o, h)) continue;
    if (f.loves.includes(o.kind) || (S.isHome(o) && o.res > 0 && S.folkOf(o) !== S.folkOf(h)) || o.kind === 'green' || o.kind === 'inn' || o.kind === 'well') out.push(foot(o));
  }
  return out;
}
export function updateWalkers(g, dt) {
  const s = g.sim; if (!s) return;
  const party = g.party;
  const alive = new Set();
  for (const h of S.homes(s)) {
    if (h.kind === 'lair') continue;
    const want = party ? h.res : Math.min(h.res, 3);
    let list = g.walkers.get(h.id); if (!list) { list = []; g.walkers.set(h.id, list); }
    alive.add(h.id);
    while (list.length < want) {
      const r = rng(h.id * 977 + list.length * 131 + s.level * 7919), p = foot(h);
      list.push({ x: p.x + (r() - 0.5) * 20, y: p.y, tx: p.x, ty: p.y, wait: r() * 2, r, folk: S.folkOf(h), flip: false, ph: r() * 6 });
    }
    list.length = want;
    const tg = party ? null : targetsFor(s, h);
    for (const w of list) {
      if (party) { w.tx = party.gx + Math.cos(w.ph * 7) * (40 + (w.ph * 37 % 80)); w.ty = party.gy + 20 + Math.sin(w.ph * 7) * (24 + (w.ph * 23 % 40)); w.wait = 0; }
      const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
      if (d < 2) {
        w.moving = false;
        if (!party) { w.wait -= dt; if (w.wait <= 0) { const t = tg[(w.r() * tg.length) | 0]; w.tx = t.x + (w.r() - 0.5) * 34; w.ty = t.y + (w.r() - 0.5) * 10; w.wait = 1 + w.r() * 3; } }
      } else {
        const sp = (party ? 70 : 24) * dt; w.moving = true;
        w.x += dx / d * Math.min(sp, d); w.y += dy / d * Math.min(sp, d); w.flip = dx < 0;
      }
    }
  }
  for (const id of [...g.walkers.keys()]) if (!alive.has(id)) g.walkers.delete(id);
}

// ---------- main world draw ----------
export function drawWorld(ctx, g, t) {
  const s = g.sim, lv = s.lv;
  const key = s.level + ':' + (IMG['ter-grass'] ? 1 : 0) + (IMG['ter-water'] ? 1 : 0);
  if (key !== baseKey) { baseCache = buildBase(lv); baseKey = key; }
  ctx.drawImage(baseCache, MX, MY, W * TS, H * TS);

  // water shimmer
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (S.terr(lv, x, y) === 'water' && !s.grid[y][x]) {
    for (let k = 0; k < 2; k++) {
      const ph = t * 1.2 + hash(x, y, k) * 6, px = MX + x * TS + 10 + hash(x, y, k + 3) * 36, py = MY + y * TS + 16 + k * 26 + Math.sin(ph) * 3;
      ctx.globalAlpha = 0.25 + 0.25 * Math.sin(ph * 0.7); ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 6, py - 3, px + 12, py); ctx.stroke();
    }
  }
  ctx.restore();

  // level colour grade
  if (lv.grade) { ctx.fillStyle = lv.grade; ctx.fillRect(MX, MY, W * TS, H * TS); }

  const pv = g.preview; // {tile, kind|clear, res}
  // range square under everything that stands
  if (pv && pv.tile) {
    const { x, y } = pv.tile;
    ctx.save(); const x0 = Math.max(0, x - 2), y0 = Math.max(0, y - 2), x1 = Math.min(W - 1, x + 2), y1 = Math.min(H - 1, y + 2);
    ctx.fillStyle = 'rgba(255,240,190,0.18)'; ctx.fillRect(MX + x0 * TS, MY + y0 * TS, (x1 - x0 + 1) * TS, (y1 - y0 + 1) * TS);
    ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,248,220,0.9)';
    ctx.strokeRect(MX + x0 * TS + 1.5, MY + y0 * TS + 1.5, (x1 - x0 + 1) * TS - 3, (y1 - y0 + 1) * TS - 3);
    ctx.restore();
    // liked / disliked things in a home ghost's range
    if (pv.kind && B[pv.kind].folk) {
      const f = FOLK[B[pv.kind].folk];
      for (const o of s.b) if (S.inRange(o, pv.tile) && !(o.x === x && o.y === y)) {
        const love = f.loves.includes(o.kind), hate = f.hates.includes(o.kind);
        if (love || hate) { ctx.lineWidth = 4; ctx.strokeStyle = love ? 'rgba(80,190,70,0.95)' : 'rgba(220,70,60,0.95)'; rr(ctx, MX + o.x * TS + 4, MY + o.y * TS + 4, TS - 8, TS - 8, 10); ctx.stroke(); }
      }
    }
    // tile outline
    ctx.lineWidth = 4; ctx.strokeStyle = pv.res && pv.res.ok ? '#fff6d0' : (pv.res && !pv.res.ok ? '#ff8a7a' : '#fff6d0');
    rr(ctx, MX + x * TS + 2, MY + y * TS + 2, TS - 4, TS - 4, 8); ctx.stroke();
  }

  // drawables sorted by foot y
  const items = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (s.grid[y][x]) continue;
    const tr = S.terr(lv, x, y);
    if (tr === 'forest' || tr === 'rock') items.push({ y: MY + y * TS + 64, x, d: () => drawProp(ctx, tr, x, y, t) });
  }
  for (const b of s.b) {
    const bt = g.born.get(b.id);
    items.push({ y: MY + b.y * TS + 64 + (b.kind === 'troll' || b.kind === 'bridge' ? -40 : 0), x: b.x, d: () => {
      let sx = 1, sy = 1;
      if (bt !== undefined) { const k = t - bt; if (k < 0.8) { const e = Math.exp(-k * 7) * Math.sin(k * 22); sx = 1 - e * 0.18; sy = 1 + e * 0.25; } }
      const cleared = pv && pv.clear && pv.tile && pv.tile.x === b.x && pv.tile.y === b.y;
      ctx.save(); ctx.fillStyle = 'rgba(40,30,15,0.18)'; ctx.beginPath(); ctx.ellipse(MX + b.x * TS + 32, MY + b.y * TS + 56, 26, 8, 0, 0, 7); ctx.fill(); ctx.restore();
      drawBuilding(ctx, b.kind, MX + b.x * TS, MY + b.y * TS, { sx, sy, alpha: cleared ? 0.55 : 1, tint: cleared ? 'rgba(220,70,60,0.35)' : null });
    } });
  }
  for (const list of g.walkers.values()) for (const w of list) {
    items.push({ y: w.y, x: 0, d: () => {
      const bob = w.moving ? Math.abs(Math.sin(t * 9 + w.ph)) * 3 : Math.sin(t * 2 + w.ph) * 0.6;
      ctx.fillStyle = 'rgba(40,30,15,0.2)'; ctx.beginPath(); ctx.ellipse(w.x, w.y, 7, 2.5, 0, 0, 7); ctx.fill();
      drawFolk(ctx, w.folk, w.x, w.y - bob, FOLK_H[w.folk], w.flip);
    } });
  }
  // sitting dragon beside its lair
  const lair = s.b.find(b => b.kind === 'lair');
  if (lair && lair.res > 0 && !(g.party && g.party.flying)) {
    const px = MX + lair.x * TS + 50, py = MY + lair.y * TS + 50;
    items.push({ y: py, x: 0, d: () => { ctx.fillStyle = 'rgba(40,30,15,0.2)'; ctx.beginPath(); ctx.ellipse(px, py, 22, 6, 0, 0, 7); ctx.fill(); drawFolk(ctx, 'dragon', px, py + Math.sin(t * 1.5) * 1, 80); } });
  }
  // ghost building
  if (pv && pv.tile && pv.kind) items.push({ y: MY + pv.tile.y * TS + 64.5, x: pv.tile.x, d: () => {
    drawBuilding(ctx, pv.kind, MX + pv.tile.x * TS, MY + pv.tile.y * TS, { alpha: 0.78, tint: pv.res && !pv.res.ok && !pv.costOnly ? 'rgba(230,60,50,0.45)' : null });
  } });
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const it of items) it.d();

  if (g.party) drawLanterns(ctx, t, g.party);

  // moods over homes
  const showNums = g.showNumbers;
  for (const h of S.homes(s)) {
    const v = S.happiness(s, h), m = S.mood(v);
    const cx = MX + h.x * TS + 32, cy = MY + h.y * TS - 14 + Math.sin(t * 2.4 + h.id) * 3;
    if (g.highlightLow && h.res > 0 && v < s.lv.goal.harmony) {
      ctx.save(); ctx.lineWidth = 5; ctx.strokeStyle = `rgba(240,160,40,${0.55 + 0.45 * Math.sin(t * 6)})`; rr(ctx, MX + h.x * TS + 2, MY + h.y * TS + 2, TS - 4, TS - 4, 10); ctx.stroke(); ctx.restore();
    }
    if (h.res === 0) { ctx.save(); ctx.globalAlpha = 0.55; moodIcon(ctx, m, cx, cy, 20); ctx.restore(); continue; }
    moodIcon(ctx, m, cx, cy, 24);
    if (S.hungry(s)) bowlIcon(ctx, cx - 26, cy + 2, 24);
    if (showNums) text(ctx, String(v), cx + 22, cy, { size: 26, align: 'left', color: v >= s.lv.goal.harmony ? C.leaf : '#9a4a10', stroke: '#fff8e8', sw: 6 });
  }
  // preview: net change numbers over homes, and the ghost home's own mood
  if (pv && pv.res) {
    for (const h of S.homes(s)) {
      const d = pv.res.deltas.get(h.id); if (!d) continue;
      const cx = MX + h.x * TS + 32, cy = MY + h.y * TS + 26;
      text(ctx, (d > 0 ? '+' : '−') + Math.abs(d), cx, cy, { size: 30, align: 'center', color: d > 0 ? '#2f8a2a' : '#c0392b', stroke: '#fff8e8', sw: 7 });
    }
    if (pv.res.ghostHap !== undefined) {
      const cx = MX + pv.tile.x * TS + 32, cy = MY + pv.tile.y * TS - 18;
      const m = S.mood(pv.res.ghostHap);
      ctx.save(); ctx.fillStyle = 'rgba(255,248,230,0.92)'; rr(ctx, cx - 44, cy - 20, 88, 40, 14); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      moodIcon(ctx, m, cx - 20, cy, 24);
      text(ctx, String(pv.res.ghostHap), cx + 18, cy + 1, { size: 28, align: 'center' });
    }
  }
}

function drawProp(ctx, tr, x, y, t) {
  const im = IMG[tr === 'forest' ? 'ter-trees' : 'ter-rock'];
  const flip = hash(x, y, 1) < 0.5, sc = 0.94 + hash(x, y, 2) * 0.12, nx = (hash(x, y, 3) - 0.5) * 6, ny = (hash(x, y, 4) - 0.5) * 6;
  const bx = MX + x * TS + 32 + nx, by = MY + y * TS + 64 + ny;
  ctx.save(); ctx.translate(bx, by);
  if (tr === 'forest') { const sw = Math.sin(t * 1.1 + x * 0.7 + y * 1.3) * 0.02; ctx.transform(1, 0, sw, 1, 0, 0); }
  ctx.scale(flip ? -sc : sc, sc);
  if (im) ctx.drawImage(im, -32, -88, 64, 88);
  else if (tr === 'forest') { ctx.fillStyle = C.leaf; ctx.beginPath(); ctx.arc(-10, -40, 18, 0, 7); ctx.arc(10, -34, 18, 0, 7); ctx.fill(); }
  else { ctx.fillStyle = '#8f8a80'; ctx.beginPath(); ctx.ellipse(0, -20, 26, 18, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}

function drawLanterns(ctx, t, party) {
  // strings of lanterns across the map, lighting up as the party goes on
  const lit = Math.min(1, party.t / 2);
  for (let row = 0; row < 3; row++) {
    const y0 = MY + 70 + row * 190;
    ctx.strokeStyle = 'rgba(74,52,38,0.6)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= 1024; x += 16) ctx.lineTo(x, y0 + Math.sin(x / 1024 * Math.PI * 3 + row) * 22);
    ctx.stroke();
    for (let k = 0; k < 16; k++) {
      const x = 32 + k * 64, y = y0 + Math.sin(x / 1024 * Math.PI * 3 + row) * 22 + 8;
      if (k / 16 > lit) continue;
      const col = ['#F08A3C', '#E8B64C', '#E0565B', '#b98ad8'][(k + row) % 4];
      const gl = ctx.createRadialGradient(x, y, 2, x, y, 22); gl.addColorStop(0, 'rgba(255,220,140,0.55)'); gl.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 22, y - 22, 44, 44);
      ctx.fillStyle = col; rr(ctx, x - 6, y - 8, 12, 16, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,180,0.9)'; ctx.fillRect(x - 3, y - 4, 6, 8);
    }
  }
}

// Mini map for level cards.
export function miniMap(ctx, lv, x, y, ts) {
  const col = { '.': '#7DB45A', 'T': '#3F6E3A', '~': '#5B9BC8', '^': '#9a9284', 'L': '#c07a4a', 'W': '#e8d8a8' };
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { ctx.fillStyle = col[lv.map[r][c]]; ctx.fillRect(x + c * ts, y + r * ts, ts + 0.5, ts + 0.5); }
  for (const [kind, c, r] of lv.hamlet || []) { ctx.fillStyle = B[kind].folk ? '#c98a4b' : '#e8c86a'; ctx.fillRect(x + c * ts + ts * 0.2, y + r * ts + ts * 0.2, ts * 0.6, ts * 0.6); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x, y, W * ts, H * ts);
}

export function drawHeartMeter(ctx, x, y, s, v) { heart(ctx, x, y, s); }
