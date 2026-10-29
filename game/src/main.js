// Sim Shire: screens, input, UI, game loop, saving and the play-test hook.
import { B, FOLK, FOLK_ORDER, LEVELS, TABS, HINTS_L1, W, H } from './data.js';
import * as S from './sim.js';
import { IMG, loadImages } from './assets.js';
import * as A from './audio.js';
import { audio } from './audio.js';
import * as Save from './save.js';
import * as FX from './fx.js';
import { fx } from './fx.js';
import { drawWorld, updateWalkers, miniMap, MX, MY, TS } from './render.js';
import { C, FONT, TITLE_FONT, text, wrap, measure, rr, panel, heart, moodIcon, starShape, resIcon, folkIcon, roofsIcon,
  portrait, thingIcon, drawBuilding, lanternIcon } from './draw.js';

const LW = 1440, LH = 720, DAY = 3;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const isTouch = matchMedia('(pointer: coarse)').matches;
const SHORT = { burrow: 'Burrow', hall: 'Hall', tree: 'Tree Hse', troll: 'Troll Br.', warren: 'Warren', lair: 'Lair', farm: 'Farm',
  orchard: 'Orchard', dock: 'Dock', mush: 'Shrooms', wood: 'Woodcut', mine: 'Mine', market: 'Market', garden: 'Garden',
  inn: 'Inn', smithy: 'Smithy', glade: 'Glade', green: 'Green', bridge: 'Bridge' };

const LABEL = k => ({ forest: 'Forest', water: 'Water', rock: 'Rock', neighbours: 'Neighbours' })[k] || SHORT[k] || k;
function iconRow(list, x, y, step, badge, size = 52) {
  list.forEach((k, j) => { thingIcon(ctx, k, x + j * step, y, size, badge); text(ctx, LABEL(k), x + j * step, y + size / 2 + 18, { size: 22, align: 'center', maxW: step - 4 }); });
}

const g = {
  screen: 'loading', modal: null, save: Save.load(), sim: null, tab: 0, tool: null, hover: null, sel: null, cursor: null,
  card: null, speed: 1, frozen: false, acc: 0, t: 0, walkers: new Map(), born: new Map(), prevMood: new Map(), prevMet: new Set(),
  toast: null, banner: null, highlightLow: 0, party: null, preview: null, showNumbers: false, completeInfo: null, hintHidden: false,
  btns: [], down: null, starsShown: 0, introLevel: 0, wasHungry: false, scrollY: 0,
};
audio.musicMuted = g.save.musicMuted; audio.sfxMuted = g.save.sfxMuted;

// ---------------- scaling ----------------
let scale = 1, offX = 0, offY = 0, dpr = 1;
function safeInsets() {
  if (params.has('insets')) { const [l, r, t, b] = params.get('insets').split(',').map(Number); return { l: l || 0, r: r || 0, t: t || 0, b: b || 0 }; }
  const cs = getComputedStyle(document.getElementById('safe'));
  return { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0, t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0 };
}
function resize() {
  const ins = safeInsets(), vw = innerWidth, vh = innerHeight;
  const aw = vw - ins.l - ins.r, ah = vh - ins.t - ins.b;
  scale = Math.min(aw / LW, ah / LH);
  const cw = LW * scale, ch = LH * scale;
  offX = ins.l + (aw - cw) / 2; offY = ins.t + (ah - ch) / 2;
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.style.left = offX + 'px'; canvas.style.top = offY + 'px';
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  const portraitPhone = isTouch && vh > vw && Math.min(vw, vh) < 600;
  document.getElementById('turn').style.display = portraitPhone ? 'flex' : 'none';
  if (portraitPhone && g.screen === 'play' && !g.modal && !g.frozen) openPause();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 150));

// ---------------- helpers ----------------
const homeFolk = k => B[k] && B[k].folk;
const lvl = () => g.sim.lv;
function persist() {
  g.save.musicMuted = audio.musicMuted; g.save.sfxMuted = audio.sfxMuted;
  if (g.sim && (g.screen === 'play') && !g.sim.complete) g.save.current = S.serialize(g.sim);
  Save.store(g.save);
}
function toast(str, tile) { g.toast = { str, tile, t: g.t }; }
function setMusicFor(screen) {
  if (screen === 'play') { A.playMusic(lvl().music); A.setAmbience(true); }
  else if (screen === 'party') { A.playMusic('mus-party'); A.setAmbience(false); }
  else { A.playMusic('mus-title'); A.setAmbience(false); }
}
function go(screen) {
  if (screen !== 'party') g.party = null;
  g.screen = screen; g.modal = null; g.card = null;
  setMusicFor(screen); A.duck(false);
}

// ---------------- level flow ----------------
function startLevel(i, fromSave = null) {
  g.sim = fromSave ? S.deserialize(fromSave) : S.newState(i);
  g.waiting = !fromSave || g.sim.day === 0;
  g.tab = 0; g.tool = null; g.sel = null; g.hover = null; g.card = null; g.acc = 0; g.speed = 1;
  g.walkers = new Map(); g.born = new Map(); g.party = null; g.highlightLow = 0; g.banner = null; g.toast = null; g.hintHidden = false;
  FX.clear();
  snapshotMoods(true);
  g.prevMet = new Set(S.goals(g.sim).filter(x => x.met).map(x => x.id));
  g.wasHungry = S.hungry(g.sim);
  g.showNumbers = !S.goals(g.sim).find(x => x.id === 'harmony').met && S.residents(g.sim) > 0;
  go('play');
  persist();
}
function snapshotMoods(silent) {
  const s = g.sim, next = new Map();
  for (const h of S.homes(s)) {
    const m = S.mood(S.happiness(s, h)); next.set(h.id, m);
    if (silent || h.res === 0) continue;
    const before = g.prevMood.get(h.id);
    const rank = { grumpy: 0, content: 1, cheerful: 2, delighted: 3 };
    if (before && rank[m] > rank[before] && rank[m] >= 2) { FX.hearts(MX + h.x * TS + 32, MY + h.y * TS - 10, m === 'delighted' ? 9 : 6); A.sfx('sfx-cheerful'); }
    if (before && m === 'grumpy' && before !== 'grumpy') A.sfx('sfx-grumpy');
  }
  g.prevMood = next;
}
function afterChange() {
  snapshotMoods(false);
  const met = new Set(S.goals(g.sim).filter(x => x.met).map(x => x.id));
  for (const id of met) if (!g.prevMet.has(id)) { A.sfx('sfx-goal-tick'); break; }
  g.prevMet = met;
  const hungry = S.hungry(g.sim);
  if (hungry && !g.wasHungry) { A.sfx('sfx-hungry'); toast('Hungry! Build food', null); }
  g.wasHungry = hungry;
  g.showNumbers = !S.goals(g.sim).find(x => x.id === 'harmony').met && S.residents(g.sim) > 0;
  persist();
}
function doTick() {
  const s = g.sim;
  const ev = S.tick(s);
  for (const h of ev.settlers) { FX.floater(MX + h.x * TS + 32, MY + h.y * TS + 6, '+1', C.leaf, 30); A.sfx('sfx-settler'); }
  for (const h of ev.moveouts) { FX.floater(MX + h.x * TS + 32, MY + h.y * TS + 6, '−1', '#c0392b', 30); A.sfx('sfx-moveout'); }
  if (ev.gatherStart) { g.banner = { str: 'The folk are gathering…', t: g.t }; A.sfx('sfx-gathering'); }
  if (ev.gatherBroke) g.banner = { str: 'Gathering paused', t: g.t, warn: true };
  if (ev.wood || ev.stone) g.resPop = g.t;
  afterChange();
  if (ev.complete) levelComplete();
  return ev;
}
function levelComplete() {
  const s = g.sim, i = s.level, lv = s.lv;
  const stars = s.day <= lv.par ? 3 : s.day <= lv.par * 2 ? 2 : 1;
  const sv = g.save;
  const prevBest = sv.best[i];
  sv.best[i] = prevBest ? Math.min(prevBest, s.day) : s.day;
  sv.stars[i] = Math.max(sv.stars[i] || 0, stars);
  sv.unlocked = Math.max(sv.unlocked, Math.min(5, i + 2));
  sv.current = null;
  g.completeInfo = { level: i, day: s.day, stars, best: sv.best[i], t: g.t };
  g.tool = null; g.sel = null; g.card = null; g.preview = null;
  Save.store(sv);
  A.sfx('sfx-level');
  FX.confetti(512, 600, 60);
  if (i === LEVELS.length - 1) { sv.won = true; Save.store(sv); startParty(); }
  else { g.modal = 'complete'; g.starsShown = 0; A.duck(true); }
}
function startParty() {
  const s = g.sim; const gr = s.b.find(b => b.kind === 'green') || s.b.find(b => b.kind === 'well');
  g.party = { t: 0, gx: MX + gr.x * TS + 32, gy: MY + gr.y * TS + 40, nextRocket: 2, flying: false, landed: false };
  g.screen = 'party'; setMusicFor('party'); A.sfx('sfx-cheer');
}

// ---------------- buttons (immediate mode) ----------------
function button(id, x, y, w, h, onTap, drawFn, opts = {}) {
  g.btns.push({ id, x, y, w, h, onTap, disabled: opts.disabled });
  const hot = g.down && g.down.btn === id;
  ctx.save();
  if (hot) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.95, 0.95); ctx.translate(-x - w / 2, -y - h / 2); }
  drawFn(x, y, w, h, hot);
  ctx.restore();
}
function textButton(id, label, x, y, w, h, onTap, { primary = false, size = 32, disabled = false } = {}) {
  button(id, x, y, w, h, onTap, () => {
    panel(ctx, x, y, w, h, { fill: disabled ? '#d8cbb0' : primary ? C.honey : C.parch, r: 20, lw: 4 });
    text(ctx, label, x + w / 2, y + h / 2 + 2, { size, align: 'center', color: disabled ? C.grey : C.ink });
  }, { disabled });
}
const hit = (x, y) => { for (let i = g.btns.length - 1; i >= 0; i--) { const b = g.btns[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; } return null; };

// ---------------- input ----------------
function toLogical(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; }
const tileAt = (x, y) => (x >= MX && x < MX + W * TS && y >= MY && y < MY + H * TS) ? { x: Math.floor((x - MX) / TS), y: Math.floor((y - MY) / TS) } : null;
const mapActive = () => (g.screen === 'play') && !g.modal && g.sim && !g.sim.complete;

canvas.addEventListener('pointerdown', e => {
  e.preventDefault(); canvas.focus(); g.cursor = null; g.lastPointer = e.pointerType;
  A.unlock(); if (!audio.track) setMusicFor(g.screen === 'loading' ? 'title' : g.screen);
  const p = toLogical(e);
  const b = hit(p.x, p.y);
  g.down = { x: p.x, y: p.y, btn: b && !b.disabled ? b.id : null, tile: b ? null : tileAt(p.x, p.y), type: e.pointerType, button: e.button };
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});
canvas.addEventListener('pointermove', e => {
  const p = toLogical(e);
  if (e.pointerType === 'mouse') { g.hover = mapActive() && !hit(p.x, p.y) ? tileAt(p.x, p.y) : null; if (g.hover) g.cursor = null; }
});
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') g.hover = null; });
canvas.addEventListener('pointerup', e => {
  e.preventDefault();
  const d = g.down; g.down = null; if (!d) return;
  const p = toLogical(e);
  if (d.button === 2) { cancelTool(); return; }
  if (d.btn) { const b = hit(p.x, p.y); if (b && b.id === d.btn && b.onTap) { b.onTap(); } return; }
  if (g.screen === 'title') { return; }
  if (g.screen === 'party' && g.party && g.party.t > 4) { g.party.t = Math.max(g.party.t, 17); return; }
  if (d.tile && mapActive()) { const t = tileAt(p.x, p.y); if (t && t.x === d.tile.x && t.y === d.tile.y) mapTap(t, d.type); }
});
canvas.addEventListener('pointercancel', () => { g.down = null; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

function cancelTool() {
  if (g.card) { g.card = null; return; }
  if (g.tool) { g.tool = null; g.sel = null; A.sfx('sfx-click'); }
}
function selectTool(kind) {
  if (!mapActive()) return;
  if (kind !== 'clear' && !lvl().tools.includes(kind)) {
    const n = LEVELS.findIndex(l => l.tools.includes(kind)) + 1; toast(`${B[kind].name} unlocks in level ${n}`, null); A.sfx('sfx-cant'); return;
  }
  g.tool = g.tool === kind ? null : kind; g.sel = null; g.card = null; A.sfx('sfx-click');
}
function mapTap(t, type) {
  if (g.card) { g.card = null; if (!g.tool) return; }
  if (g.tool) {
    if (type === 'mouse') tryAction(t);
    else if (g.sel && g.sel.x === t.x && g.sel.y === t.y) tryAction(t);
    else { g.sel = t; A.sfx('sfx-click'); const r = actionCheck(t); if (r) toast(r, t); }
  } else {
    const b = g.sim.grid[t.y][t.x];
    if (b) { g.card = { type: 'building', id: b.id, side: t.x < 8 ? 'right' : 'left' }; A.sfx('sfx-click'); if (b.kind === 'lair') A.sfx('sfx-dragon'); }
  }
}
function actionCheck(t) { return g.tool === 'clear' ? S.canClear(g.sim, t.x, t.y) : S.canPlace(g.sim, g.tool, t.x, t.y); }
function tryAction(t) {
  const s = g.sim, err = actionCheck(t);
  if (err) { toast(err, t); A.sfx('sfx-cant'); return false; }
  if (g.tool === 'clear') {
    const b = S.clear(s, t.x, t.y);
    g.born.delete(b.id); A.sfx('sfx-clear'); FX.dust(MX + t.x * TS + 32, MY + t.y * TS + 48, 18);
    const [cw, cs] = B[b.kind].cost; FX.floater(MX + t.x * TS + 32, MY + t.y * TS + 20, `+${cw} wood${cs ? ` +${cs} stone` : ''}`, C.earth, 26);
  } else {
    const b = S.place(s, g.tool, t.x, t.y);
    g.born.set(b.id, g.t); A.sfx('sfx-build'); FX.dust(MX + t.x * TS + 32, MY + t.y * TS + 56);
    if (b.kind === 'lair') A.sfx('sfx-dragon');
  }
  g.sel = null; g.waiting = false; afterChange();
  return true;
}

const KEYS_PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab', 'Enter', 'Escape']);
addEventListener('keydown', e => {
  if (KEYS_PREVENT.has(e.key)) e.preventDefault();
  A.unlock(); if (!audio.track && g.screen !== 'loading') setMusicFor(g.screen);
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.repeat && (k === 'Enter' || k === ' ')) return;
  if (k === 'm') { toggleMute(); return; }
  if (g.screen === 'title') { if (k === 'Enter' || k === ' ') playFromTitle(); return; }
  if (g.screen === 'levels') { if (k === 'Escape') { A.sfx('sfx-click'); go('title'); } return; }
  if (g.screen === 'howto') { if (k === 'Escape') { A.sfx('sfx-click'); if (g.howtoBack === 'pause') { g.screen = 'play'; g.modal = 'pause'; } else go('title'); } return; }
  if (g.screen === 'intro') { if (k === 'Enter' || k === ' ') { A.sfx('sfx-click'); startLevel(g.introLevel); } if (k === 'Escape') go('levels'); return; }
  if (g.screen === 'party') {
    if (g.modal === 'victory') { if (k === 'Enter' || k === ' ') { A.sfx('sfx-click'); go('levels'); } else if (k === 'Escape') go('title'); }
    else if (g.party && g.party.t > 4) g.party.t = Math.max(g.party.t, 17);
    return;
  }
  if (g.modal) {
    if (k === 'Escape' || k === 'p') { if (g.modal === 'pause') resume(); else if (g.modal === 'folkbook' || g.modal === 'restart') g.modal = 'pause'; }
    if ((k === 'Enter' || k === ' ') && g.modal === 'pause') resume();
    if ((k === 'Enter' || k === ' ') && g.modal === 'complete') nextLevel();
    if ((k === 'Enter' || k === ' ') && g.modal === 'victory') { go('levels'); }
    return;
  }
  if (g.screen !== 'play') return;
  if (k === 'p') { openPause(); return; }
  if (k === 'Escape') { if (g.card || g.tool) cancelTool(); else openPause(); return; }
  if (k === 'f') { cycleSpeed(); return; }
  if (k === 'q' || (k === 'Tab' && e.shiftKey)) { g.tab = (g.tab + 2) % 3; A.sfx('sfx-click'); return; }
  if (k === 'e' || k === 'Tab') { g.tab = (g.tab + 1) % 3; A.sfx('sfx-click'); return; }
  if (k === '8' || k === 'x') { selectTool('clear'); return; }
  if (/^[1-7]$/.test(k)) { const kind = TABS[g.tab].tools[+k - 1]; if (kind) selectTool(kind); return; }
  const dir = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[k];
  if (dir) {
    const c = g.cursor || g.hover || g.sel || { x: 7, y: 4 };
    g.cursor = { x: Math.max(0, Math.min(W - 1, c.x + dir[0])), y: Math.max(0, Math.min(H - 1, c.y + dir[1])) };
    g.hover = null; return;
  }
  if (k === 'Enter' || k === ' ') {
    const t = g.cursor || g.hover || g.sel; if (!t) return;
    if (g.tool) tryAction(t); else mapTap(t, 'mouse');
  }
});

function toggleMute() {
  const m = !(audio.musicMuted && audio.sfxMuted);
  audio.musicMuted = m; audio.sfxMuted = m; A.applyMute(); persist();
  if (!m) A.sfx('sfx-click');
}
function cycleSpeed() { g.speed = g.speed >= 3 ? 1 : g.speed + 1; A.sfx('sfx-click'); }
function openPause() { if (g.screen !== 'play' || g.modal) return; g.modal = 'pause'; g.tool = g.tool; A.duck(true); }
function resume() { g.modal = null; A.duck(false); A.sfx('sfx-click'); }
function nextLevel() {
  const i = g.completeInfo.level + 1; A.sfx('sfx-click');
  if (i < LEVELS.length) { g.introLevel = i; go('intro'); A.sfx('sfx-unlock'); } else go('levels');
}
function playFromTitle() {
  A.sfx('sfx-click');
  const c = g.save.current;
  if (c) { try { startLevel(c.level, c); return; } catch (err) { g.save.current = null; } }
  g.introLevel = Math.min(g.save.unlocked, LEVELS.length) - 1; go('intro');
}

addEventListener('visibilitychange', () => { if (document.hidden) { if (g.screen === 'play' && !g.frozen) openPause(); if (audio.ctx) audio.ctx.suspend(); } else if (audio.ctx) audio.ctx.resume(); });
addEventListener('blur', () => { if (g.screen === 'play' && !g.frozen) openPause(); });

// ---------------- update ----------------
function currentPreviewTile() {
  if (!mapActive() || !g.tool) return null;
  return g.cursor || (g.lastPointer === 'mouse' ? (g.hover || g.sel) : g.sel);
}
function update(dt) {
  g.t += dt;
  if (g.screen === 'play' && !g.modal && !g.frozen && g.sim && !g.sim.complete && !g.waiting) {
    g.acc += dt * g.speed;
    if (g.acc >= DAY) { g.acc -= DAY; doTick(); }
  }
  // preview
  const pt = currentPreviewTile();
  if (pt) {
    const key = g.tool + ':' + pt.x + ',' + pt.y + ':' + g.sim.nextId + ':' + g.sim.day + ':' + g.sim.wood + ':' + g.sim.stone;
    if (!g.preview || g.preview.key !== key) {
      const res = g.tool === 'clear' ? S.preview(g.sim, { op: 'clear', x: pt.x, y: pt.y }) : S.preview(g.sim, { op: 'place', kind: g.tool, x: pt.x, y: pt.y });
      g.preview = { key, tile: pt, kind: g.tool === 'clear' ? null : g.tool, clear: g.tool === 'clear', res, costOnly: res.reason && /^Need \d/.test(res.reason) };
    }
  } else g.preview = null;
  if (g.sim && (g.screen === 'play' || g.screen === 'party')) updateWalkers(g, dt);
  if (g.highlightLow > 0) g.highlightLow -= dt;
  if (g.party && g.screen === 'party') updateParty(dt);
  FX.update(dt);
  A.update();
}
function updateParty(dt) {
  const p = g.party; p.t += dt;
  if (p.t > 1.5 && !p.flying && !p.landed) { p.flying = true; p.flyT = 0; }
  if (p.flying) { p.flyT += dt; if (p.flyT > 7) { p.flying = false; p.landed = true; fx.shake = 6; A.sfx('sfx-dragon-land'); } }
  if (p.t > p.nextRocket && (p.t < 16 || g.modal === 'victory')) {
    p.nextRocket = p.t + (p.t < 16 ? 0.45 + Math.random() * 0.5 : 1.2 + Math.random());
    const sx = p.gx + (Math.random() - 0.5) * 300, tx = 100 + Math.random() * 824, ty = MY + 40 + Math.random() * 220;
    FX.rocket(Math.max(40, Math.min(980, sx)), MY + 560, tx, ty, () => A.sfx('sfx-fw-burst', 0.8, 0.9 + Math.random() * 0.25));
    A.sfx('sfx-fw-launch', 0.7, 0.9 + Math.random() * 0.2);
    if (Math.random() < 0.3) FX.confetti(p.gx, p.gy, 20);
  }
  if (p.t > 6 && !p.cheered) { p.cheered = true; A.sfx('sfx-cheer'); }
  if (p.t > 17 && !g.modal) { g.modal = 'victory'; A.sfx('sfx-level'); }
}

// ---------------- drawing: shared ----------------
function drawBg() { ctx.fillStyle = '#e9d8b0'; ctx.fillRect(0, 0, LW, LH); }
function drawTitleBg(dim = 0) {
  const im = IMG['title-bg'];
  if (im) { const s = Math.max(LW / im.width, LH / im.height); ctx.drawImage(im, (LW - im.width * s) / 2, (LH - im.height * s) / 2, im.width * s, im.height * s); }
  else { const gr = ctx.createLinearGradient(0, 0, 0, LH); gr.addColorStop(0, '#f6d9a0'); gr.addColorStop(1, '#7DB45A'); ctx.fillStyle = gr; ctx.fillRect(0, 0, LW, LH); }
  if (dim) { ctx.fillStyle = `rgba(244,230,196,${dim})`; ctx.fillRect(0, 0, LW, LH); }
}
function iconBtn(id, x, y, w, h, onTap, drawIcon, active = false) {
  button(id, x, y, w, h, onTap, () => {
    panel(ctx, x + 6, y + 6, w - 12, h - 12, { fill: active ? C.honey : C.parch, r: 16, lw: 3, shadow: false });
    drawIcon(x + w / 2, y + h / 2);
  });
}
function speakerIcon(cx, cy, muted) {
  ctx.save(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(cx - 18, cy - 8); ctx.lineTo(cx - 8, cy - 8); ctx.lineTo(cx + 4, cy - 18); ctx.lineTo(cx + 4, cy + 18); ctx.lineTo(cx - 8, cy + 8); ctx.lineTo(cx - 18, cy + 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = muted ? C.red : C.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
  if (muted) { ctx.beginPath(); ctx.moveTo(cx + 10, cy - 10); ctx.lineTo(cx + 24, cy + 10); ctx.moveTo(cx + 24, cy - 10); ctx.lineTo(cx + 10, cy + 10); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(cx + 6, cy, 10, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 6, cy, 18, -0.8, 0.8); ctx.stroke(); }
  ctx.restore();
}
function muteButton(x, y, w = 96, h = 96) { iconBtn('mute', x, y, w, h, toggleMute, (cx, cy) => speakerIcon(cx, cy, audio.musicMuted && audio.sfxMuted)); }

// ---------------- screens ----------------
function drawTitle() {
  drawTitleBg();
  const bob = Math.sin(g.t * 1.5) * 4;
  ctx.save(); ctx.fillStyle = 'rgba(255,248,230,0.55)'; rr(ctx, 420, 40 + bob, 600, 190, 40); ctx.fill(); ctx.restore();
  text(ctx, 'Sim Shire', LW / 2, 120 + bob, { size: 120, align: 'center', font: TITLE_FONT, weight: 400, color: '#3b5a2a', stroke: '#fff4d8', sw: 12 });
  text(ctx, 'a cozy village for every folk', LW / 2, 196 + bob, { size: 32, align: 'center', color: C.ink, stroke: '#fff4d8', sw: 7 });
  const has = !!g.save.current;
  textButton('play', has ? 'Continue' : 'Play', LW / 2 - 200, 300, 400, 100, playFromTitle, { primary: true, size: 42 });
  textButton('levels', 'Levels', LW / 2 - 200, 420, 400, 96, () => { A.sfx('sfx-click'); go('levels'); });
  textButton('howto', 'How to play', LW / 2 - 200, 532, 400, 96, () => { A.sfx('sfx-click'); g.howtoBack = 'title'; go('howto'); });
  muteButton(LW - 116, 16, 100, 100);
  if (!audio.ctx) text(ctx, 'Tap or press any key for sound', LW / 2, 676, { size: 26, align: 'center', color: C.ink, stroke: '#fff4d8', sw: 6 });
}

function drawLevels() {
  drawTitleBg(0.55);
  text(ctx, 'Choose a valley', LW / 2, 64, { size: 56, align: 'center', font: TITLE_FONT, weight: 400, color: '#3b5a2a', stroke: '#fff4d8', sw: 10 });
  const cw = 264, gap = 14, x0 = (LW - (5 * cw + 4 * gap)) / 2;
  LEVELS.forEach((lv, i) => {
    const x = x0 + i * (cw + gap), y = 120, h = 470, locked = i + 1 > g.save.unlocked;
    const inProg = g.save.current && g.save.current.level === i;
    button('lv' + i, x, y, cw, h, () => { if (locked) { A.sfx('sfx-cant'); return; } A.sfx('sfx-click'); if (inProg) { try { startLevel(i, g.save.current); return; } catch (err) { g.save.current = null; } } g.introLevel = i; go('intro'); }, () => {
      panel(ctx, x, y, cw, h, { fill: locked ? '#ddd0b4' : C.parch, r: 22 });
      text(ctx, `Level ${i + 1}`, x + cw / 2, y + 34, { size: 26, align: 'center', color: C.earth });
      text(ctx, lv.name, x + cw / 2, y + 72, { size: 30, align: 'center', maxW: cw - 20 });
      miniMap(ctx, lv, x + 20, y + 100, 14);
      ctx.save(); if (locked) ctx.globalAlpha = 0.45;
      const fs = lv.folk; fs.forEach((f, k) => portrait(ctx, f, x + cw / 2 + (k - (fs.length - 1) / 2) * 96, y + 300, 44));
      ctx.restore();
      text(ctx, 'New: ' + lv.folk.map(f => FOLK[f].name).join(' & '), x + cw / 2, y + 368, { size: 26, align: 'center', maxW: cw - 16, color: C.leaf });
      if (inProg) { ctx.fillStyle = C.honey; rr(ctx, x + 30, y + 400, cw - 60, 44, 16); ctx.fill(); text(ctx, 'Continue', x + cw / 2, y + 423, { size: 26, align: 'center' }); }
      else if (locked) { lockIcon(x + cw / 2, y + 420); }
      else for (let k = 0; k < 3; k++) starShape(ctx, x + cw / 2 + (k - 1) * 52, y + 424, 20, k < (g.save.stars[i] || 0) ? C.honey : '#e6dcc4');
    });
  });
  textButton('back', 'Back', 40, 612, 240, 96, () => { A.sfx('sfx-click'); go('title'); });
  const total = g.save.stars.reduce((a, b) => a + (b || 0), 0);
  text(ctx, `★ ${total} / 15`, LW - 60, 660, { size: 32, align: 'right', color: C.ink, stroke: '#fff4d8', sw: 6 });
}
function lockIcon(x, y) {
  ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y - 10, 12, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = C.earth; rr(ctx, x - 18, y - 10, 36, 28, 6); ctx.fill(); ctx.stroke(); ctx.restore();
}

function drawHowTo() {
  drawTitleBg(0.6);
  text(ctx, 'How to play', LW / 2, 60, { size: 56, align: 'center', font: TITLE_FONT, weight: 400, color: '#3b5a2a', stroke: '#fff4d8', sw: 10 });
  const cards = [
    ['1. Build homes', 'Pick a home in the tool column and tap a tile. Tap again (or ✓) to build. Folk move in when they are fed and content.', (x, y) => { drawBuilding(ctx, 'burrow', x - 64, y - 70, { sx: 2, sy: 2 }); }],
    ['2. Feed everyone', 'Farms, orchards, docks and mushrooms grow food. New folk only come while there is spare food: watch eaten / grown at the top.', (x, y) => { drawBuilding(ctx, 'farm', x - 104, y - 60, { sx: 1.6, sy: 1.6 }); resIcon(ctx, 'food', x + 60, y - 20, 64); }],
    ['3. Mind loves & grudges', 'Each home scores what is within 2 tiles. Give folk what they love, keep grudges apart (an Inn halves them) and mix folk as neighbours. The preview shows every change before you build.', (x, y) => { thingIcon(ctx, 'orchard', x - 70, y - 30, 64, 'love'); thingIcon(ctx, 'smithy', x, y - 30, 64, 'hate'); roofsIcon(ctx, x + 72, y - 24, 64); }],
  ];
  cards.forEach(([title, body, art], i) => {
    const x = 50 + i * 456, y = 110, w = 428, h = 480;
    panel(ctx, x, y, w, h, { r: 24 });
    art(x + w / 2, y + 150);
    text(ctx, title, x + w / 2, y + 232, { size: 34, align: 'center' });
    wrap(ctx, body, w - 48, 26).forEach((ln, k) => text(ctx, ln, x + 24, y + 280 + k * 34, { size: 26, weight: 500 }));
  });
  textButton('back', 'Back', 40, 612, 240, 96, () => { A.sfx('sfx-click'); if (g.howtoBack === 'pause') { g.screen = 'play'; g.modal = 'pause'; } else go(g.howtoBack || 'title'); });
}

function drawIntro() {
  drawTitleBg(0.5);
  const i = g.introLevel, lv = LEVELS[i];
  const x = 270, y = 30, w = 940, h = 660;
  panel(ctx, x, y, w, h, { r: 30, fill: C.parch });
  ctx.fillStyle = C.parchDark; rr(ctx, x - 20, y - 6, w + 40, 34, 16); ctx.fill(); rr(ctx, x - 20, y + h - 28, w + 40, 34, 16); ctx.fill();
  text(ctx, `Level ${i + 1}`, LW / 2, y + 56, { size: 26, align: 'center', color: C.earth });
  text(ctx, lv.name, LW / 2, y + 102, { size: 58, align: 'center', font: TITLE_FONT, weight: 400, color: '#3b5a2a' });
  const lines = wrap(ctx, lv.intro + (lv.hamlet ? ' A little hamlet is already here.' : ''), w - 100, 26);
  lines.forEach((ln, k) => text(ctx, ln, LW / 2, y + 150 + k * 32, { size: 26, weight: 500, align: 'center' }));
  let fy = y + 170 + lines.length * 32;
  for (const f of lv.folk) {
    const cy = fy + 62;
    portrait(ctx, f, x + 92, cy, 44);
    text(ctx, FOLK[f].name, x + 92, cy + 60, { size: 24, align: 'center' });
    heart(ctx, x + 180, cy - 50, 22); text(ctx, 'Loves', x + 198, cy - 50, { size: 24, color: C.leaf });
    iconRow([...FOLK[f].loves, 'neighbours'], x + 210, cy, 96, 'love', 50);
    moodIcon(ctx, 'grumpy', x + 690, cy - 50, 22); text(ctx, "Can't stand", x + 710, cy - 50, { size: 24, color: C.red });
    iconRow(FOLK[f].hates, x + 710, cy, 92, 'hate', 50);
    fy += 128;
  }
  text(ctx, 'Goal: ' + goalSentence(lv), LW / 2, y + h - 124, { size: 26, align: 'center', color: C.earth, maxW: w - 60 });
  textButton('begin', 'Begin', LW / 2 - 160, y + h - 100, 320, 88, () => { A.sfx('sfx-click'); startLevel(i); }, { primary: true, size: 40 });
  textButton('back', 'Back', 24, 612, 200, 96, () => { A.sfx('sfx-click'); go('levels'); });
}
function goalSentence(lv) {
  const gl = lv.goal, parts = [`${gl.pop} folk`];
  for (const [f, n] of Object.entries(gl.folk || {})) parts.push(`${n} ${FOLK[f].name.toLowerCase()}`);
  if (gl.households) parts.push('every folk at home');
  if (gl.dragon) parts.push('a cheerful dragon');
  if (gl.greenAll) parts.push('all around a Festival Green');
  if (gl.neighbours) parts.push(`${gl.neighbours} mixed neighbours`);
  parts.push(`harmony ${gl.harmony}`);
  return parts.join(', ') + '.';
}

// ---------------- gameplay UI ----------------
function drawPlay() {
  drawBg();
  ctx.save();
  if (fx.shake > 0) ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
  ctx.beginPath(); ctx.rect(MX, MY, W * TS, H * TS); ctx.clip();
  drawWorld(ctx, g, g.t);
  if (g.party) drawPartyOverlay();
  FX.draw(ctx);
  ctx.restore();
  // map frame
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(MX + 1.5, MY + 1.5, W * TS - 3, H * TS - 3);
  drawHUD();
  if (g.screen === 'party') { drawPartySide(); return; }
  drawHint();
  drawBanner();
  drawToast();
  drawCard();
  drawSide();
  drawBottom();
}
function pill(x, y, w, drawIcon, str, color = C.ink, pop = 0) {
  ctx.save(); ctx.fillStyle = 'rgba(244,230,196,0.94)'; rr(ctx, x, y, w, 40, 20); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  drawIcon(x + 24, y + 20);
  text(ctx, str, x + 48, y + 21, { size: 28 + pop, color });
}
function drawHUD() {
  ctx.fillStyle = '#d9c497'; ctx.fillRect(0, 0, 1024, MY);
  if (!g.sim) return;
  const s = g.sim, grown = S.foodProd(s), eaten = S.residents(s);
  const pop = g.resPop && g.t - g.resPop < 0.25 ? 2 : 0;
  const foodCol = eaten > grown ? C.red : grown < eaten + 1 ? '#b8730c' : C.ink;
  pill(6, 4, 190, (x, y) => resIcon(ctx, 'food', x, y, 34), `${eaten}/${grown}`, foodCol);
  pill(202, 4, 128, (x, y) => resIcon(ctx, 'wood', x, y, 34), String(s.wood), C.ink, pop);
  pill(336, 4, 128, (x, y) => resIcon(ctx, 'stone', x, y, 34), String(s.stone), C.ink, pop);
  pill(470, 4, 180, (x, y) => folkIcon(ctx, x, y, 34), `${eaten}/${s.lv.goal.pop}`);
  const hv = S.harmony(s);
  pill(656, 4, 150, (x, y) => heart(ctx, x, y, 28), `${Math.floor(hv)}`, hv >= s.lv.goal.harmony ? C.leaf : C.ink);
  pill(812, 4, 206, (x, y) => { ctx.fillStyle = C.honey; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); }, `Day ${s.day}`);
  if (eaten > grown) { panel(ctx, 6, 52, 150, 40, { r: 18, lw: 2, fill: '#f6d2c4', shadow: false }); text(ctx, 'Hungry!', 81, 73, { size: 26, color: C.red, align: 'center' }); }
  else if (grown < eaten + 1 && eaten > 0 && eaten < s.lv.goal.pop) { panel(ctx, 6, 52, 210, 40, { r: 18, lw: 2, fill: '#f8e2b0', shadow: false }); text(ctx, 'Need more food', 111, 73, { size: 26, color: '#8a4a08', align: 'center' }); }
}
function drawHint() {
  if (g.sim.level !== 0 || g.hintHidden) return;
  const idx = HINTS_L1.findIndex(h => !h.done(g.sim)); const h = HINTS_L1[idx === -1 ? HINTS_L1.length - 1 : idx];
  const lines = wrap(ctx, h.text, 560, 26);
  const x = 236, y = MY + 8, w = 600, hh = 24 + lines.length * 32;
  button('hint', x, y, w, hh, () => { g.hintHidden = true; }, () => {
    panel(ctx, x, y, w, hh, { alpha: 0.95, r: 16, lw: 3 });
    lines.forEach((ln, k) => text(ctx, ln, x + 20, y + 28 + k * 32, { size: 26, weight: 500 }));
  });
}
function drawBanner() {
  const s = g.sim;
  let str = null, warn = false;
  if (s.gather > 0) str = `The folk are gathering… ${3 - s.gather}`;
  else if (g.banner && g.banner.warn && g.t - g.banner.t < 2.5) { str = g.banner.str; warn = true; }
  if (!str && g.waiting && g.sim.level > 0) str = 'Days start when you build';
  if (!str) return;
  const w = measure(ctx, str, 32) + 60, x = 512 - w / 2, y = MY + 470;
  panel(ctx, x, y, w, 60, { fill: warn ? '#f2d0b8' : '#fff1c8', r: 30, lw: 3 });
  if (!warn) lanternIcon(ctx, x + 28, y + 30, 40);
  text(ctx, str, 512 + (warn ? 0 : 12), y + 31, { size: 32, align: 'center' });
}
function drawToast() {
  const tt = g.toast; if (!tt || g.t - tt.t > 1.8) return;
  const a = Math.min(1, (1.8 - (g.t - tt.t)) * 3);
  const w = Math.min(480, measure(ctx, tt.str, 26, 500) + 40);
  let x = 512 - w / 2, y = MY + 220;
  if (tt.tile) { x = MX + tt.tile.x * TS + 32 - w / 2; y = tt.tile.y <= 1 ? MY + (tt.tile.y + 1) * TS + 8 : MY + tt.tile.y * TS - 66; }
  x = Math.max(MX + 6, Math.min(MX + W * TS - w - 6, x));
  ctx.save(); ctx.globalAlpha = a; panel(ctx, x, y, w, 52, { r: 18, lw: 3, fill: '#fff4dc' });
  text(ctx, tt.str, x + w / 2, y + 27, { size: 26, weight: 500, align: 'center', maxW: w - 20 }); ctx.restore();
}

function drawSide() {
  const s = g.sim, X = 1024;
  ctx.fillStyle = '#d9c497'; ctx.fillRect(X, 0, LW - X, LH);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, LH); ctx.stroke();
  // top buttons
  iconBtn('pause', X, 0, 104, 96, openPause, (cx, cy) => { ctx.fillStyle = C.ink; rr(ctx, cx - 14, cy - 18, 10, 36, 3); ctx.fill(); rr(ctx, cx + 4, cy - 18, 10, 36, 3); ctx.fill(); });
  iconBtn('speed', X + 104, 0, 104, 96, cycleSpeed, (cx, cy) => {
    ctx.fillStyle = C.ink; for (let k = 0; k < g.speed; k++) { const ox = cx - 22 + k * 15 + (3 - g.speed) * 7; ctx.beginPath(); ctx.moveTo(ox, cy - 14); ctx.lineTo(ox + 16, cy - 2); ctx.lineTo(ox, cy + 10); ctx.closePath(); ctx.fill(); }
    text(ctx, g.speed + 'x', cx, cy + 26, { size: 22, align: 'center' });
  });
  muteButton(X + 208, 0, 104, 96);
  if (isTouch && document.documentElement.requestFullscreen) iconBtn('fs', X + 312, 0, 104, 96, () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  }, (cx, cy) => { ctx.strokeStyle = C.ink; ctx.lineWidth = 4; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.moveTo(cx + sx * 16, cy + sy * 6); ctx.lineTo(cx + sx * 16, cy + sy * 16); ctx.lineTo(cx + sx * 6, cy + sy * 16); ctx.stroke(); } });
  // tabs
  const tabX = [X, X + 139, X + 278], tabW = [139, 139, 138];
  TABS.forEach((tb, i) => {
    button('tab' + i, tabX[i], 96, tabW[i], 96, () => { g.tab = i; A.sfx('sfx-click'); }, (x, y, w, h) => {
      ctx.fillStyle = g.tab === i ? C.parch : '#cbb486'; rr(ctx, x + 4, y + 4, w - 8, h - 4, 14); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
      const icon = ['burrow', 'farm', 'inn'][i];
      drawBuilding(ctx, icon, x + w / 2 - 22, y + 8, { sx: 0.7, sy: 0.7 });
      text(ctx, ['Homes', 'Food', 'Gather'][i], x + w / 2, y + h - 18, { size: 26, align: 'center' });
    });
  });
  // palette
  const tools = TABS[g.tab].tools;
  for (let k = 1; k <= 9; k++) {
    const x = X + 139 * ((k - 1) % 3), y = 192 + 136 * Math.floor((k - 1) / 3), w = 138, h = 136;
    if (k === 8) { slotClear(x, y, w, h); continue; }
    const kind = tools[k - 1]; if (!kind) continue;
    slot(kind, k, x, y, w, h);
  }
  drawStrip();
}
function slot(kind, k, x, y, w, h) {
  const s = g.sim, unlocked = s.lv.tools.includes(kind), d = B[kind];
  const isNew = unlocked && !(s.level > 0 && LEVELS[s.level - 1].tools.includes(kind)) && s.level > 0;
  const afford = s.wood >= d.cost[0] && s.stone >= d.cost[1];
  button('slot' + k, x, y, w, h, () => selectTool(kind), () => {
    ctx.fillStyle = g.tool === kind ? C.honey : unlocked ? C.parch : '#cdbd99'; rr(ctx, x + 4, y + 4, w - 8, h - 8, 14); ctx.fill();
    ctx.strokeStyle = g.tool === kind ? '#8a4a10' : C.ink; ctx.lineWidth = g.tool === kind ? 5 : 2.5; ctx.stroke();
    ctx.save(); if (!unlocked) ctx.globalAlpha = 0.35;
    drawBuilding(ctx, kind, x + w / 2 - 32, y + 2, {});
    ctx.restore();
    text(ctx, SHORT[kind], x + w / 2, y + 88, { size: 26, align: 'center', maxW: w - 12 });
    if (unlocked) {
      const [cw, cs] = d.cost; let cx = x + w / 2 - (cs ? 44 : 22);
      resIcon(ctx, 'wood', cx, y + 116, 22); text(ctx, String(cw), cx + 14, y + 117, { size: 26, color: s.wood >= cw ? C.ink : C.red });
      if (cs) { cx += 56; resIcon(ctx, 'stone', cx, y + 116, 22); text(ctx, String(cs), cx + 14, y + 117, { size: 26, color: s.stone >= cs ? C.ink : C.red }); }
    } else { lockIcon(x + w / 2, y + 48); text(ctx, 'Lv ' + (LEVELS.findIndex(l => l.tools.includes(kind)) + 1), x + w / 2, y + 117, { size: 26, align: 'center', color: C.earth }); }
    if (isNew) { ctx.fillStyle = C.lantern; rr(ctx, x + w - 58, y + 8, 50, 26, 10); ctx.fill(); text(ctx, 'NEW', x + w - 33, y + 22, { size: 18, align: 'center', color: '#fff' }); }
    if (unlocked && !afford) { ctx.fillStyle = 'rgba(120,90,50,0.12)'; rr(ctx, x + 4, y + 4, w - 8, h - 8, 14); ctx.fill(); }
  });
}
function slotClear(x, y, w, h) {
  button('slot8', x, y, w, h, () => selectTool('clear'), () => {
    ctx.fillStyle = g.tool === 'clear' ? C.honey : C.parch; rr(ctx, x + 4, y + 4, w - 8, h - 8, 14); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = g.tool === 'clear' ? 5 : 2.5; ctx.stroke();
    // little spade
    ctx.save(); ctx.translate(x + w / 2, y + 48); ctx.rotate(-0.5);
    ctx.fillStyle = C.earth; ctx.fillRect(-4, -36, 8, 40); ctx.fillStyle = '#a0a6ad'; ctx.beginPath(); ctx.moveTo(-16, 4); ctx.lineTo(16, 4); ctx.lineTo(12, 26); ctx.quadraticCurveTo(0, 36, -12, 26); ctx.closePath(); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    text(ctx, 'Clear', x + w / 2, y + 96, { size: 26, align: 'center' });
    text(ctx, 'full refund', x + w / 2, y + 120, { size: 20, align: 'center', color: C.earth });
  });
}
function drawStrip() {
  // loves / grudges of the selected home tool's folk or the selected home
  const X = 1024, Y = 600;
  let folk = null;
  if (g.tool && homeFolk(g.tool)) folk = homeFolk(g.tool);
  else if (g.card && g.card.type === 'building') { const b = g.sim.b.find(o => o.id === g.card.id); if (b && homeFolk(b.kind)) folk = homeFolk(b.kind); }
  if (!folk) {
    if (g.tool && g.tool !== 'clear') { // who loves / hates this building
      const lov = FOLK_ORDER.filter(f => FOLK[f].loves.includes(g.tool) && g.sim.lv.tools.includes(FOLK[f].home));
      const hat = FOLK_ORDER.filter(f => FOLK[f].hates.includes(g.tool) && g.sim.lv.tools.includes(FOLK[f].home));
      if (!lov.length && !hat.length) return;
      heart(ctx, X + 26, Y + 30, 26); lov.forEach((f, i) => portrait(ctx, f, X + 74 + i * 56, Y + 30, 25));
      ctx.save(); ctx.translate(0, 0); ctx.restore();
      if (hat.length) { drawCloudSmall(X + 26, Y + 88); hat.forEach((f, i) => portrait(ctx, f, X + 74 + i * 56, Y + 88, 25)); }
    }
    return;
  }
  const f = FOLK[folk];
  heart(ctx, X + 26, Y + 30, 26);
  [...f.loves, 'neighbours'].forEach((k, i) => thingIcon(ctx, k, X + 76 + i * 58, Y + 30, 52));
  drawCloudSmall(X + 26, Y + 88);
  f.hates.forEach((k, i) => thingIcon(ctx, k, X + 76 + i * 58, Y + 88, 52));
}
function drawCloudSmall(x, y) { moodIcon(ctx, 'grumpy', x, y, 26); }

function drawBottom() {
  const s = g.sim, Y = 624;
  ctx.fillStyle = '#d9c497'; ctx.fillRect(0, Y, 1024, LH - Y);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(1024, Y); ctx.stroke();
  const gl = S.goals(s).slice(0, 6);
  gl.forEach((goal, i) => {
    const x = i * 128, y = Y;
    button('chip' + i, x, y, 128, 96, () => {
      A.sfx('sfx-click'); const hs = S.homes(g.sim); const ax = hs.length ? hs.reduce((a, h) => a + h.x, 0) / hs.length : 0; g.card = { type: 'goals', side: ax < 8 ? 'right' : 'left' }; g.tool = null;
      g.card.first = goal.id; if (goal.id === 'harmony') g.highlightLow = 6;
    }, () => {
      ctx.fillStyle = goal.met ? '#cfe8b4' : C.parch; rr(ctx, x + 4, y + 6, 120, 84, 14); ctx.fill(); ctx.strokeStyle = goal.met ? C.green : C.ink; ctx.lineWidth = goal.met ? 4 : 2.5; ctx.stroke();
      chipIcon(goal, x + 34, y + 36);
      const v = goal.id === 'harmony' ? Math.floor(goal.value) : goal.value;
      const str = goal.id === 'dragon' ? (goal.met ? '♥' : goal.home ? String(goal.value) : '—') : `${v}/${goal.target}`;
      text(ctx, str, x + 64, y + 72, { size: 28, align: 'center', color: goal.met ? C.leaf : C.ink, maxW: 112 });
      if (goal.met) { ctx.strokeStyle = C.green; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 84, y + 34); ctx.lineTo(x + 94, y + 44); ctx.lineTo(x + 112, y + 22); ctx.stroke(); }
    });
  });
  // ✓ and ✕
  const canBuild = g.tool && g.preview && g.preview.tile && g.preview.res && g.preview.res.ok;
  button('ok', 768, Y, 128, 96, () => { const t = currentPreviewTile(); if (g.tool && t) tryAction(t); else A.sfx('sfx-cant'); }, (x, y, w, h) => {
    ctx.fillStyle = canBuild ? '#9ed37a' : '#cfc2a2'; rr(ctx, x + 6, y + 8, w - 12, h - 14, 16); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = canBuild ? '#2a5a1a' : '#8a8070'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 42, y + 50); ctx.lineTo(x + 58, y + 66); ctx.lineTo(x + 88, y + 30); ctx.stroke();
  });
  const canCancel = g.tool || g.card;
  button('cancel', 896, Y, 128, 96, () => cancelTool(), (x, y, w, h) => {
    ctx.fillStyle = canCancel ? '#f0b8a0' : '#cfc2a2'; rr(ctx, x + 6, y + 8, w - 12, h - 14, 16); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = canCancel ? '#7a2a1a' : '#8a8070'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 46, y + 32); ctx.lineTo(x + 82, y + 68); ctx.moveTo(x + 82, y + 32); ctx.lineTo(x + 46, y + 68); ctx.stroke();
  });
}
function chipIcon(goal, x, y) {
  if (goal.id === 'pop') folkIcon(ctx, x, y, 44);
  else if (goal.id === 'folk') portrait(ctx, goal.folk, x, y, 22);
  else if (goal.id === 'harmony') heart(ctx, x, y, 38);
  else if (goal.id === 'neighbours') roofsIcon(ctx, x, y + 4, 44);
  else if (goal.id === 'dragon') portrait(ctx, 'dragon', x, y, 22);
  else if (goal.id === 'green') thingIcon(ctx, 'green', x, y, 44);
  else if (goal.id === 'households') { ['halfling', 'dwarf', 'elf'].forEach((f, i) => portrait(ctx, f, x - 12 + i * 12, y, 14)); }
}

function goalLine(goal, lv) {
  const fname = f => FOLK[f].name.toLowerCase();
  switch (goal.id) {
    case 'pop': return `Folk: ${goal.value} of ${goal.target} living in the shire.`;
    case 'folk': return `${FOLK[goal.folk].name}: ${goal.value} of ${goal.target} moved in.`;
    case 'households': return `Every folk at home: 2 lived-in homes each of halflings, dwarves, elves, trolls and goblins.` + (goal.missing.length ? ` Missing: ${goal.missing.map(fname).join(', ')}.` : '');
    case 'dragon': return goal.home ? `Dragon: happiness ${goal.value} (needs 70).` : 'Dragon: build a Lair on the glowing rock shelf.';
    case 'green': return goal.hasGreen ? `Festival Green: a home of every folk (dragon too) within 2 tiles of it.` + (goal.missing.length ? ` Missing: ${goal.missing.map(fname).join(', ')}.` : '') : 'Festival Green: build one and gather every folk around it.';
    case 'neighbours': return `Neighbours: ${goal.value} of ${goal.target} homes have a neighbour of another folk within 2 tiles.`;
    case 'harmony': {
      const below = S.homes(g.sim).filter(h => h.res > 0 && S.happiness(g.sim, h) < goal.target).length;
      return `Harmony ${Math.floor(goal.value)} of ${goal.target}.` + (goal.met ? '' : ` ${below} home${below === 1 ? ' is' : 's are'} below ${goal.target} (outlined). Add things they love, a neighbour of another folk, or an Inn near their grudges.`);
    }
  }
  return '';
}

function drawCard() {
  const c = g.card; if (!c) return;
  const s = g.sim, x = c.side === 'left' ? 0 : 512, y = 48, w = 512, h = 576;
  panel(ctx, x + 4, y + 4, w - 8, h - 8, { r: 20, alpha: 0.97 });
  button('cardclose', x + w - 100, y + 6, 96, 96, () => { g.card = null; A.sfx('sfx-click'); }, (bx, by) => {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx + 34, by + 34); ctx.lineTo(bx + 62, by + 62); ctx.moveTo(bx + 62, by + 34); ctx.lineTo(bx + 34, by + 62); ctx.stroke();
  });
  if (c.type === 'goals') {
    text(ctx, 'Goals', x + 28, y + 50, { size: 36 });
    let yy = y + 104;
    const gs = S.goals(s); if (c.first) gs.sort((a, b) => (b.id === c.first) - (a.id === c.first));
    for (const goal of gs) {
      if (yy > y + h - 40) break;
      chipIcon(goal, x + 46, yy + 14);
      const lines = wrap(ctx, goalLine(goal, s.lv), w - 120, 26);
      lines.forEach((ln, k) => text(ctx, ln, x + 86, yy + k * 30, { size: 26, weight: 500, color: goal.met ? C.leaf : C.ink }));
      yy += Math.max(56, lines.length * 30 + 18);
    }
    return;
  }
  const b = s.b.find(o => o.id === c.id); if (!b) { g.card = null; return; }
  const d = B[b.kind];
  if (d.folk) {
    const lines = [], v = S.happiness(s, b, lines), m = S.mood(v);
    text(ctx, d.name, x + 28, y + 50, { size: 36 });
    portrait(ctx, d.folk, x + 84, y + 150, 56);
    text(ctx, FOLK[d.folk].name, x + 160, y + 116, { size: 28, color: C.earth });
    text(ctx, `${b.res} / ${d.cap} living here`, x + 160, y + 152, { size: 26, weight: 500 });
    moodIcon(ctx, m, x + 176, y + 190, 28);
    text(ctx, `${v}  ${m[0].toUpperCase() + m.slice(1)}`, x + 200, y + 191, { size: 28 });
    ctx.fillStyle = C.ink; ctx.globalAlpha = 0.25; ctx.fillRect(x + 28, y + 226, w - 56, 2); ctx.globalAlpha = 1;
    text(ctx, '50  Base', x + 40, y + 256, { size: 26, weight: 500, color: C.grey });
    lines.forEach((ln, k) => {
      const yy = y + 256 + (k + 1) * 34;
      const col = ln.v > 0 ? '#2f7a2a' : ln.v < 0 ? '#b0392b' : C.grey;
      text(ctx, (ln.v > 0 ? '+' : ln.v < 0 ? '−' : '±') + Math.abs(ln.v), x + 40, yy, { size: 26, color: col });
      text(ctx, ln.text, x + 104, yy, { size: 26, weight: 500 });
    });
    if (b.res < d.cap && v < 40) text(ctx, 'Too grumpy for new settlers', x + 28, y + h - 36, { size: 26, color: C.red });
    else if (b.res < d.cap && S.foodProd(s) < S.residents(s) + 1) text(ctx, 'Settlers need spare food', x + 28, y + h - 36, { size: 26, color: '#9a5a08' });
  } else {
    text(ctx, d.name, x + 28, y + 50, { size: 36 });
    drawBuilding(ctx, b.kind, x + 40, y + 70, { sx: 1.6, sy: 1.6 });
    let yy = y + 110;
    const makes = [];
    if (d.food) makes.push(`+${d.food} food`); if (d.wood) makes.push(`+${d.wood} wood`); if (d.stone) makes.push(`+${d.stone} stone`);
    const role = { inn: 'Halves grudges within 2 tiles', green: '+10 to homes within 2 tiles; calms fear of the Lair; the party spot', bridge: 'Joins land across water', well: 'The heart of the shire', garden: 'A lovely spot', smithy: 'Ringing hammers', glade: 'Music under the stars' }[b.kind];
    if (makes.length) { text(ctx, makes.join(', ') + ' per day', x + 160, yy, { size: 28 }); yy += 40; }
    if (role) { wrap(ctx, role, w - 190, 26).forEach(ln => { text(ctx, ln, x + 160, yy, { size: 26, weight: 500 }); yy += 32; }); }
    yy = Math.max(yy + 20, y + 260);
    const lov = FOLK_ORDER.filter(f => FOLK[f].loves.includes(b.kind)), hat = FOLK_ORDER.filter(f => FOLK[f].hates.includes(b.kind));
    if (lov.length) { heart(ctx, x + 48, yy, 30); text(ctx, 'Loved by', x + 74, yy, { size: 26 }); lov.forEach((f, i) => portrait(ctx, f, x + 66 + i * 70, yy + 60, 30)); yy += 120; }
    if (hat.length) { moodIcon(ctx, 'grumpy', x + 48, yy, 30); text(ctx, "Can't stand it", x + 74, yy, { size: 26 }); hat.forEach((f, i) => portrait(ctx, f, x + 66 + i * 70, yy + 60, 30)); yy += 120; }
    if (b.kind !== 'well') text(ctx, 'Use Clear to move it: full refund.', x + 28, y + h - 36, { size: 26, weight: 500, color: C.earth });
  }
}

// ---------------- modals ----------------
function modalFrame(title) {
  ctx.fillStyle = 'rgba(60,40,20,0.45)'; ctx.fillRect(0, 0, LW, LH);
  panel(ctx, 360, 60, 720, 600, { r: 28 });
  text(ctx, title, LW / 2, 120, { size: 52, align: 'center', font: TITLE_FONT, weight: 400, color: '#3b5a2a' });
}
function drawPause() {
  modalFrame('Paused');
  textButton('resume', 'Resume', 400, 170, 640, 96, resume, { primary: true });
  textButton('book', 'Folk book', 400, 280, 312, 96, () => { A.sfx('sfx-click'); g.modal = 'folkbook'; });
  textButton('help', 'How to play', 728, 280, 312, 96, () => { A.sfx('sfx-click'); g.howtoBack = 'pause'; g.modal = null; g.screen = 'howto'; });
  textButton('restart', 'Restart level', 400, 390, 312, 96, () => { A.sfx('sfx-click'); g.modal = 'restart'; });
  textButton('tolevels', 'Levels', 728, 390, 312, 96, () => { A.sfx('sfx-click'); persist(); go('levels'); });
  textButton('music', 'Music: ' + (audio.musicMuted ? 'off' : 'on'), 400, 500, 312, 96, () => { audio.musicMuted = !audio.musicMuted; A.applyMute(); persist(); A.sfx('sfx-click'); });
  textButton('sound', 'Sound: ' + (audio.sfxMuted ? 'off' : 'on'), 728, 500, 312, 96, () => { audio.sfxMuted = !audio.sfxMuted; A.applyMute(); persist(); A.sfx('sfx-click'); });
}
function drawRestart() {
  modalFrame('Start over?');
  wrap(ctx, `Restart ${g.sim.lv.name}? Your village will be cleared.`, 600, 30).forEach((ln, k) => text(ctx, ln, LW / 2, 230 + k * 40, { size: 30, weight: 500, align: 'center' }));
  textButton('restartyes', 'Yes, restart', 400, 400, 312, 96, () => { A.sfx('sfx-clear'); g.save.current = null; startLevel(g.sim.level); });
  textButton('restartno', 'No, keep it', 728, 400, 312, 96, () => { A.sfx('sfx-click'); g.modal = 'pause'; }, { primary: true });
}
function drawFolkBook() {
  ctx.fillStyle = 'rgba(60,40,20,0.45)'; ctx.fillRect(0, 0, LW, LH);
  panel(ctx, 40, 14, 1360, 692, { r: 28 });
  text(ctx, 'Folk book', LW / 2, 56, { size: 44, align: 'center', font: TITLE_FONT, weight: 400, color: '#3b5a2a' });
  text(ctx, 'An Inn halves grudges nearby · a Festival Green calms fear of the dragon', LW / 2, 98, { size: 24, weight: 500, align: 'center', color: C.earth });
  const known = FOLK_ORDER.filter(f => g.sim.lv.tools.includes(FOLK[f].home));
  const rowH = Math.min(100, 580 / Math.max(1, known.length));
  known.forEach((f, i) => {
    const y = 160 + i * rowH;
    portrait(ctx, f, 104, y, Math.min(40, rowH * 0.42));
    text(ctx, FOLK[f].name, 160, y, { size: 26 });
    heart(ctx, 330, y - 10, 24);
    iconRow([...FOLK[f].loves, 'neighbours'], 390, y - 10, 98, null, 46);
    moodIcon(ctx, 'grumpy', 900, y - 10, 24);
    iconRow(FOLK[f].hates, 958, y - 10, 98, null, 46);
  });
  button('bookclose', 1296, 18, 96, 96, () => { g.modal = 'pause'; A.sfx('sfx-click'); }, (bx, by) => {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx + 34, by + 34); ctx.lineTo(bx + 62, by + 62); ctx.moveTo(bx + 62, by + 34); ctx.lineTo(bx + 34, by + 62); ctx.stroke();
  });
}
function drawComplete() {
  const ci = g.completeInfo, lv = LEVELS[ci.level];
  modalFrame(lv.name + '!');
  text(ctx, 'Everyone is settled and happy.', LW / 2, 180, { size: 30, align: 'center', weight: 500 });
  const el = g.t - ci.t;
  for (let k = 0; k < 3; k++) {
    const shown = el > 0.6 + k * 0.45 && k < ci.stars;
    if (shown && g.starsShown <= k) { g.starsShown = k + 1; A.sfx('sfx-star', 1, 1 + k * 0.12); FX.hearts(LW / 2 + (k - 1) * 110, 270, 3); }
    const sc = shown ? 1 + Math.max(0, 0.3 - (el - 0.6 - k * 0.45)) : 1;
    starShape(ctx, LW / 2 + (k - 1) * 110, 270, 44 * sc, shown ? C.honey : '#e6dcc4');
  }
  text(ctx, `Finished on day ${ci.day}   ·   3 stars by day ${lv.par}   ·   best ${ci.best}`, LW / 2, 360, { size: 28, align: 'center' });
  const nxt = LEVELS[ci.level + 1];
  if (nxt) {
    text(ctx, 'Next: ' + nxt.name + ' — new folk: ' + nxt.folk.map(f => FOLK[f].name).join(' & '), LW / 2, 420, { size: 28, align: 'center', color: C.leaf });
    nxt.folk.forEach((f, k) => portrait(ctx, f, LW / 2 + (k - (nxt.folk.length - 1) / 2) * 110, 488, 40));
  }
  textButton('next', 'Next', 740, 556, 300, 96, nextLevel, { primary: true, size: 38 });
  textButton('replay', 'Play again', 400, 556, 300, 96, () => { A.sfx('sfx-click'); startLevel(ci.level); });
}
function drawVictory() {
  ctx.fillStyle = 'rgba(30,20,40,0.35)'; ctx.fillRect(0, 0, LW, LH);
  panel(ctx, 300, 60, 840, 600, { r: 28 });
  text(ctx, 'Every folk, one happy shire!', LW / 2, 130, { size: 50, align: 'center', font: TITLE_FONT, weight: 400, color: '#3b5a2a' });
  FOLK_ORDER.forEach((f, i) => portrait(ctx, f, LW / 2 + (i - 2.5) * 118, 260, 50));
  wrap(ctx, 'Halflings, dwarves, elves, trolls, goblins and a dragon, all living side by side, dancing under the fireworks. You did it, steward!', 720, 28).forEach((ln, k) => text(ctx, ln, LW / 2, 346 + k * 34, { size: 28, weight: 500, align: 'center' }));
  const total = g.save.stars.reduce((a, b) => a + (b || 0), 0);
  for (let lv = 0; lv < 5; lv++) for (let k = 0; k < 3; k++) starShape(ctx, LW / 2 + (lv - 2) * 130 + (k - 1) * 30, 478, 13, k < (g.save.stars[lv] || 0) ? C.honey : '#e6dcc4');
  text(ctx, `${total} of 15 stars`, LW / 2, 520, { size: 28, align: 'center' });
  textButton('vlevels', 'Levels', 380, 556, 320, 90, () => { A.sfx('sfx-click'); go('levels'); }, { primary: true });
  textButton('vtitle', 'Title', 740, 556, 320, 90, () => { A.sfx('sfx-click'); go('title'); });
}

function drawPartyOverlay() {
  const p = g.party;
  // dusk tint
  const dusk = Math.min(0.45, p.t / 4 * 0.45);
  ctx.fillStyle = `rgba(30,25,70,${dusk})`; ctx.fillRect(MX, MY, W * TS, H * TS);
  // re-draw lanterns' glow above the tint
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + p.t * 0.3, x = p.gx + Math.cos(a) * 120, y = p.gy + Math.sin(a) * 60;
    const gl = ctx.createRadialGradient(x, y, 2, x, y, 30); gl.addColorStop(0, 'rgba(255,200,120,0.5)'); gl.addColorStop(1, 'rgba(255,180,90,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 30, y - 30, 60, 60); }
  ctx.restore();
  // flying dragon
  if (p.flying) {
    const k = p.flyT / 7, a = k * Math.PI * 2;
    const x = 512 + Math.cos(a - Math.PI / 2) * 380, y = MY + 260 + Math.sin(a - Math.PI / 2) * 180;
    const sheet = IMG['dragon-fly'], fr = Math.floor(p.flyT * 8) % 4;
    ctx.save(); ctx.translate(x, y + Math.sin(p.flyT * 6) * 6); if (Math.cos(a) < 0) ctx.scale(-1, 1);
    if (sheet) ctx.drawImage(sheet, fr * 384, 0, 384, 384, -120, -200, 240, 240); else { ctx.fillStyle = '#c8402a'; ctx.beginPath(); ctx.ellipse(0, -40, 40, 20, 0, 0, 7); ctx.fill(); }
    ctx.restore();
    if (Math.random() < 0.15) { FX.rocket(x, y - 40, x + (Math.random() - 0.5) * 200, y - 120 - Math.random() * 80, () => A.sfx('sfx-fw-burst', 0.7)); }
  }
  if (p.t > 4) text(ctx, 'Party time in ' + g.sim.lv.name + '!', 512, MY + 40, { size: 40, align: 'center', font: TITLE_FONT, weight: 400, color: '#fff4d8', stroke: '#4a3426', sw: 8 });
  if (p.t > 6) text(ctx, 'tap to continue', 512, MY + 540, { size: 26, align: 'center', color: '#fff4d8', stroke: '#4a3426', sw: 6 });
}

function drawPartySide() {
  const X = 1024, p = g.party;
  ctx.fillStyle = '#d9c497'; ctx.fillRect(X, 0, LW - X, LH); ctx.fillRect(0, 624, 1024, 96);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, LH); ctx.moveTo(0, 624); ctx.lineTo(1024, 624); ctx.stroke();
  text(ctx, 'The Party!', X + 208, 60, { size: 44, align: 'center', font: TITLE_FONT, weight: 400, color: '#3b5a2a' });
  const hs = S.homes(g.sim);
  FOLK_ORDER.forEach((f, i) => {
    const y = 140 + i * 82, n = hs.filter(h => S.folkOf(h) === f).reduce((a, h) => a + h.res, 0);
    portrait(ctx, f, X + 70, y + Math.sin(g.t * 5 + i) * 4, 34);
    text(ctx, FOLK[f].name, X + 120, y - 8, { size: 28 });
    text(ctx, n + (n === 1 ? ' guest' : ' guests'), X + 120, y + 22, { size: 26, weight: 500, color: C.earth });
  });
  text(ctx, 'Every folk came to celebrate together!', 512, 672, { size: 30, align: 'center' });
  if (p.t > 4 && !g.modal) textButton('skip', 'Continue', X + 58, 616, 300, 90, () => { p.t = Math.max(p.t, 17); });
}

// ---------------- frame ----------------
function render() {
  g.btns = [];
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (g.screen === 'title') drawTitle();
  else if (g.screen === 'levels') drawLevels();
  else if (g.screen === 'howto') drawHowTo();
  else if (g.screen === 'intro') drawIntro();
  else if (g.screen === 'play' || g.screen === 'party') {
    drawPlay();
    if (g.modal) g.btns = g.btns.filter(b => b.id === '__none');
    if (g.modal === 'pause') drawPause();
    else if (g.modal === 'folkbook') drawFolkBook();
    else if (g.modal === 'restart') drawRestart();
    else if (g.modal === 'complete') drawComplete();
    else if (g.modal === 'victory') drawVictory();
  }
}
let last = 0;
function frame(ts) {
  const dt = Math.min(0.1, last ? (ts - last) / 1000 : 0.016); last = ts;
  requestAnimationFrame(frame);
  try {
    // fixed-step update at 60 Hz
    g.stepAcc = (g.stepAcc || 0) + dt;
    while (g.stepAcc >= 1 / 60) { update(1 / 60); g.stepAcc -= 1 / 60; }
    render();
  } catch (err) {
    console.error(err);
    if (!g.crashed) { g.crashed = true; g.save.current = null; Save.store(g.save); g.sim = null; g.modal = null; g.screen = 'title'; }
  }
}

// ---------------- play-test hook ----------------
function stateObj() {
  const s = g.sim;
  return {
    screen: g.screen, modal: g.modal, level: s ? s.level + 1 : null, day: s ? s.day : 0, tool: g.tool, tab: g.tab, speed: g.speed, frozen: g.frozen,
    food: s ? { grown: S.foodProd(s), eaten: S.residents(s) } : null, wood: s ? s.wood : 0, stone: s ? s.stone : 0, pop: s ? S.residents(s) : 0,
    harmony: s ? +S.harmony(s).toFixed(2) : 0, neighbours: s ? S.neighbourCount(s) : 0,
    goals: s ? S.goals(s).map(x => ({ id: x.id, met: x.met, value: x.value, target: x.target })) : [], gatherDays: s ? s.gather : 0,
    homes: s ? S.homes(s).map(h => ({ id: h.id, kind: h.kind, x: h.x, y: h.y, residents: h.res, happiness: S.happiness(s, h) })) : [],
    buildings: s ? s.b.length : 0, levelComplete: !!(s && s.complete), gameWon: !!g.save.won, card: g.card ? g.card.type : null,
    toast: g.toast && g.t - g.toast.t < 1.8 ? g.toast.str : null, party: g.party ? { t: +g.party.t.toFixed(2), flying: g.party.flying, landed: g.party.landed } : null, unlocked: g.save.unlocked, stars: g.save.stars.slice(),
  };
}
const css = (lx, ly) => ({ x: offX + lx * scale, y: offY + ly * scale });
window.__game = {
  state: stateObj,
  levels: () => LEVELS.length,
  goToLevel: n => { g.save.unlocked = Math.max(g.save.unlocked, n); startLevel(n - 1); return stateObj(); },
  freeze: on => { g.frozen = !!on; return g.frozen; },
  audioState: A.audioState,
  tileToScreen: (x, y) => css(MX + x * TS + 32, MY + y * TS + 32),
  slotToScreen: (tab, slot) => css(1024 + 139 * ((slot - 1) % 3) + 69, 192 + 136 * Math.floor((slot - 1) / 3) + 68),
  tabToScreen: tab => css([1024, 1163, 1302][tab] + 69, 144),
  toolSlot: kind => { if (kind === 'clear') return { tab: null, slot: 8 }; const t = TABS.findIndex(tb => tb.tools.includes(kind)); return { tab: t, slot: TABS[t].tools.indexOf(kind) + 1 }; },
  buttonToScreen: id => { const b = g.btns.find(o => o.id === id); return b ? css(b.x + b.w / 2, b.y + b.h / 2) : null; },
  buttons: () => g.btns.map(b => b.id),
  setSpeed: n => { g.speed = Math.max(1, Math.min(20, n)); return g.speed; },
  stepDays: n => { for (let i = 0; i < n && g.sim && !g.sim.complete; i++) doTick(); return stateObj(); },
  layout: () => ({ scale, offX, offY, dpr }),
};

// ---------------- boot ----------------
async function boot() {
  resize();
  const fontsReady = document.fonts ? Promise.all([document.fonts.load(`600 28px Fredoka`), document.fonts.load(`500 28px Fredoka`), document.fonts.load(`40px "IM Fell English SC"`)]).catch(() => {}) : Promise.resolve();
  A.preload();
  await Promise.all([loadImages(), fontsReady]);
  document.getElementById('loading').style.display = 'none';
  g.screen = 'title';
  requestAnimationFrame(frame);
}
boot();
