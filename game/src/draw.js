// Shared drawing helpers: text, parchment panels, code-drawn icons, sprites, portraits.
import { IMG, SPRITE_OF } from './assets.js';
import { B, FOLK } from './data.js';

export const C = {
  meadow: '#7DB45A', leaf: '#3F6E3A', honey: '#E8B64C', earth: '#8A5A3B', river: '#5B9BC8', lantern: '#F08A3C',
  parch: '#F4E6C4', parchDark: '#E6D2A4', ink: '#4A3426', red: '#C8553D', green: '#4E9A3A', grey: '#9a8f80',
};
export const FONT = 'Fredoka, "Trebuchet MS", sans-serif';
export const TITLE_FONT = '"IM Fell English SC", Georgia, serif';

export function text(ctx, str, x, y, { size = 28, color = C.ink, align = 'left', base = 'middle', weight = 600, font = FONT, stroke = null, sw = 6, maxW } = {}) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = base;
  if (stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(str, x, y, maxW); }
  ctx.fillStyle = color; ctx.fillText(str, x, y, maxW);
}
export function measure(ctx, str, size = 28, weight = 600, font = FONT) { ctx.font = `${weight} ${size}px ${font}`; return ctx.measureText(str).width; }

// Word-wrap into lines no wider than w.
export function wrap(ctx, str, w, size = 26, weight = 500) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const out = []; for (const para of String(str).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (ctx.measureText(t).width > w && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function panel(ctx, x, y, w, h, { fill = C.parch, border = C.ink, r = 18, lw = 4, shadow = true, alpha = 1 } = {}) {
  ctx.save(); ctx.globalAlpha = alpha;
  if (shadow) { ctx.shadowColor = 'rgba(60,40,20,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4; }
  rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = lw; ctx.strokeStyle = border; ctx.stroke();
  ctx.restore();
}

export function heart(ctx, x, y, s, color = '#E0565B', outline = '#7a2a2a') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 20, s / 20);
  ctx.beginPath(); ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-12, -2, -9, -12, 0, -5); ctx.bezierCurveTo(9, -12, 12, -2, 0, 7); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = outline; ctx.stroke();
  ctx.beginPath(); ctx.arc(-4, -4, 1.8, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
  ctx.restore();
}
export function cloud(ctx, x, y, s, rain = true) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 20, s / 20);
  ctx.fillStyle = '#8d93a3'; ctx.strokeStyle = '#4b5060'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(-5, 0, 5, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(0, -4, 6, Math.PI, 0); ctx.arc(6, 0, 4.5, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  if (rain) { ctx.strokeStyle = '#5B9BC8'; ctx.lineWidth = 1.8; for (const dx of [-4, 1, 6]) { ctx.beginPath(); ctx.moveTo(dx, 7); ctx.lineTo(dx - 1.5, 11); ctx.stroke(); } }
  ctx.restore();
}
export function smile(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 20, s / 20);
  ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, 7); ctx.fillStyle = '#F2C94C'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = '#7a5a1a'; ctx.stroke();
  ctx.fillStyle = '#4A3426'; ctx.beginPath(); ctx.arc(-3, -2, 1.3, 0, 7); ctx.arc(3, -2, 1.3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 1, 4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 1.6; ctx.strokeStyle = '#4A3426'; ctx.stroke();
  ctx.restore();
}
export function moodIcon(ctx, mood, x, y, s = 22) {
  if (mood === 'delighted') { heart(ctx, x - s * 0.32, y, s * 0.85); heart(ctx, x + s * 0.32, y - 2, s * 0.85, '#F07A9A'); }
  else if (mood === 'cheerful') heart(ctx, x, y, s);
  else if (mood === 'content') smile(ctx, x, y, s);
  else cloud(ctx, x, y, s * 1.1);
}
export function starShape(ctx, x, y, r, fill, stroke = C.ink) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke();
}

// Simple code icons for resources (used if the generated ones are missing) and UI.
export function resIcon(ctx, kind, x, y, s) {
  const id = { food: 'ui-food', wood: 'ui-wood', stone: 'ui-stone' }[kind];
  if (IMG[id]) { ctx.drawImage(IMG[id], x - s / 2, y - s / 2, s, s); return; }
  ctx.save(); ctx.translate(x, y);
  if (kind === 'food') { ctx.fillStyle = '#d9534f'; ctx.beginPath(); ctx.arc(0, 2, s * 0.32, 0, 7); ctx.fill(); ctx.fillStyle = C.leaf; ctx.fillRect(-1, -s * 0.4, 3, s * 0.2); }
  else if (kind === 'wood') { ctx.fillStyle = C.earth; rr(ctx, -s * 0.4, -s * 0.18, s * 0.8, s * 0.36, 6); ctx.fill(); ctx.fillStyle = '#d9b380'; ctx.beginPath(); ctx.ellipse(s * 0.38, 0, s * 0.1, s * 0.18, 0, 0, 7); ctx.fill(); }
  else { ctx.fillStyle = '#9aa0a6'; ctx.beginPath(); ctx.ellipse(-s * 0.12, s * 0.06, s * 0.3, s * 0.22, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#b8bdc2'; ctx.beginPath(); ctx.ellipse(s * 0.16, -s * 0.06, s * 0.22, s * 0.18, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
export function folkIcon(ctx, x, y, s) { // little people (population)
  ctx.save(); ctx.fillStyle = C.earth;
  for (const [dx, sc] of [[-s * 0.2, 0.85], [s * 0.18, 1]]) {
    ctx.beginPath(); ctx.arc(x + dx, y - s * 0.18 * sc, s * 0.15 * sc, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + dx, y + s * 0.2 * sc, s * 0.2 * sc, s * 0.2 * sc, 0, Math.PI, 0); ctx.fill();
  }
  ctx.restore();
}
export function roofsIcon(ctx, x, y, s) { // neighbours: two little houses and a heart
  ctx.save(); ctx.fillStyle = C.earth; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  for (const dx of [-s * 0.22, s * 0.22]) {
    ctx.beginPath(); ctx.moveTo(x + dx - s * 0.2, y + s * 0.3); ctx.lineTo(x + dx - s * 0.2, y); ctx.lineTo(x + dx, y - s * 0.2); ctx.lineTo(x + dx + s * 0.2, y); ctx.lineTo(x + dx + s * 0.2, y + s * 0.3); ctx.closePath();
    ctx.fillStyle = dx < 0 ? '#c98a4b' : '#7aa0c8'; ctx.fill(); ctx.stroke();
  }
  ctx.restore(); heart(ctx, x, y - s * 0.32, s * 0.4);
}
export function bowlIcon(ctx, x, y, s) { // hungry
  ctx.save(); ctx.fillStyle = '#c98a4b'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y - s * 0.05, s * 0.36, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
export function flameIcon(ctx, x, y, s) { // dragon warmth
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(0, -s * 0.4); ctx.bezierCurveTo(s * 0.35, -s * 0.05, s * 0.3, s * 0.35, 0, s * 0.38); ctx.bezierCurveTo(-s * 0.3, s * 0.35, -s * 0.35, -s * 0.05, 0, -s * 0.4);
  ctx.fillStyle = C.lantern; ctx.fill(); ctx.beginPath(); ctx.ellipse(0, s * 0.15, s * 0.12, s * 0.18, 0, 0, 7); ctx.fillStyle = '#ffd36b'; ctx.fill(); ctx.restore();
}
export function lanternIcon(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = C.lantern; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  rr(ctx, -s * 0.2, -s * 0.25, s * 0.4, s * 0.5, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe08a'; ctx.fillRect(-s * 0.1, -s * 0.15, s * 0.2, s * 0.3); ctx.restore();
}

// Building sprite: 128x176 stored, drawn 64x88 bottom-centred on a tile at (tx, ty) top-left.
export function drawBuilding(ctx, kind, tx, ty, { alpha = 1, sx = 1, sy = 1, tint = null } = {}) {
  const im = IMG[SPRITE_OF[kind]];
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(tx + 32, ty + 64); ctx.scale(sx, sy);
  if (im) ctx.drawImage(im, -32, -88, 64, 88);
  else fallbackBuilding(ctx, kind);
  if (tint) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = tint; ctx.fillRect(-32, -88, 64, 88); }
  ctx.restore();
}
const FALLBACK_COLOR = { burrow: '#6fa84a', hall: '#8d8f96', tree: '#2f7d5a', troll: '#5c6f8f', warren: '#c0503a', lair: '#7a4a3a', farm: '#e2c35a',
  orchard: '#4f9a3a', wood: '#9b6b3b', mine: '#6d6258', smithy: '#555', dock: '#9b7b4b', mush: '#d86a6a', bridge: '#9a9a9a', inn: '#c47a3a',
  garden: '#e88fb5', market: '#e8a23c', glade: '#9a7ad0', green: '#7fd06a', well: '#8a8a8a' };
function fallbackBuilding(ctx, kind) {
  ctx.fillStyle = FALLBACK_COLOR[kind] || '#999'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  rr(ctx, -26, -46, 52, 42, 8); ctx.fill(); ctx.stroke();
  text(ctx, (B[kind] ? B[kind].name : kind).slice(0, 2), 0, -25, { size: 18, align: 'center', color: '#fff' });
}

// Folk sprite (256 canvas, dragon 384) bottom-centred at (x, y) with a given drawn height.
export const FOLK_H = { halfling: 28, dwarf: 26, elf: 36, troll: 44, goblin: 24, dragon: 80 };
const FOLK_COLOR = { halfling: '#E8B64C', dwarf: '#b5552f', elf: '#2f8f8a', troll: '#5c6f8f', goblin: '#d08a4a', dragon: '#c8402a' };
export function drawFolk(ctx, folk, x, y, h, flip = false) {
  const im = IMG['folk-' + folk];
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  if (im) { const content = im.height * (folk === 'dragon' ? 376 / 384 : 248 / 256), sc = h / content; ctx.drawImage(im, -im.width * sc / 2, -im.height * sc, im.width * sc, im.height * sc); }
  else { ctx.fillStyle = FOLK_COLOR[folk]; ctx.beginPath(); ctx.ellipse(0, -h * 0.35, h * 0.28, h * 0.35, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(0, -h * 0.82, h * 0.18, 0, 7); ctx.fill(); }
  ctx.restore();
}

// Portrait: folk image in a parchment circle (head and shoulders).
export function portrait(ctx, folk, x, y, r, { ring = C.ink, bg = C.parchDark } = {}) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = bg; ctx.fill();
  ctx.clip();
  const im = IMG['folk-' + folk];
  if (im) {
    const big = folk === 'dragon' ? 3.0 : (folk === 'troll' ? 2.5 : 2.4);
    const s = (r * big) / im.height;
    const w = im.width * s, h = im.height * s;
    ctx.drawImage(im, x - w / 2, y - r * 0.82, w, h);
  } else drawFolk(ctx, folk, x, y + r, r * 1.8);
  ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.lineWidth = Math.max(2, r * 0.08); ctx.strokeStyle = ring; ctx.stroke();
}

// Love/grudge icon for a building kind or terrain, in a parchment circle.
export function thingIcon(ctx, k, x, y, size, badge = null) {
  const r = size / 2;
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = C.parch; ctx.fill(); ctx.clip();
  if (k === 'forest' || k === 'rock') {
    const im = IMG[k === 'forest' ? 'ter-trees' : 'ter-rock'];
    if (im) ctx.drawImage(im, 0, 40, 128, 136, x - r * 1.05, y - r * 1.1, r * 2.1, r * 2.25);
    else { ctx.fillStyle = k === 'forest' ? C.leaf : '#999'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, 7); ctx.fill(); }
  } else if (k === 'water') {
    const im = IMG['ter-water'];
    if (im) ctx.drawImage(im, x - r, y - r, size, size); else { ctx.fillStyle = C.river; ctx.fillRect(x - r, y - r, size, size); }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
    for (const dy of [-r * 0.25, r * 0.2]) { ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + dy); ctx.quadraticCurveTo(x - r * 0.25, y + dy - 5, x, y + dy); ctx.quadraticCurveTo(x + r * 0.25, y + dy + 5, x + r * 0.5, y + dy); ctx.stroke(); }
  } else if (k === 'neighbours') roofsIcon(ctx, x, y + r * 0.1, size * 0.8);
  else if (k === 'hungry') bowlIcon(ctx, x, y, size * 0.9);
  else if (k === 'warmth') flameIcon(ctx, x, y, size * 0.8);
  else {
    const im = IMG[SPRITE_OF[k]];
    if (im) ctx.drawImage(im, 0, 40, 128, 136, x - r * 1.0, y - r * 1.06, r * 2.0, r * 2.12);
    else { ctx.fillStyle = FALLBACK_COLOR[k] || '#999'; ctx.fillRect(x - r * 0.6, y - r * 0.6, r * 1.2, r * 1.2); }
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink; ctx.stroke();
  if (badge === 'love') heart(ctx, x + r * 0.72, y + r * 0.72, size * 0.42);
  else if (badge === 'hate') cloud(ctx, x + r * 0.72, y + r * 0.7, size * 0.44, false);
}

export const folkLoves = f => FOLK[f].loves;
export const folkHates = f => FOLK[f].hates;
