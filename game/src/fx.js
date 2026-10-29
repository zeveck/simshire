// Particles, floating numbers, fireworks. Visual only.
import { text, heart, C } from './draw.js';

export const fx = { parts: [], floaters: [], rockets: [], shake: 0 };

export function dust(x, y, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 70;
    fx.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.4 - 20, life: 0.6 + Math.random() * 0.4, t: 0, r: 4 + Math.random() * 5, color: 'rgba(210,190,150,', kind: 'dust' });
  }
}
export function hearts(x, y, n = 6) {
  for (let i = 0; i < n; i++) fx.parts.push({ x: x + (Math.random() - 0.5) * 24, y, vx: (Math.random() - 0.5) * 40, vy: -50 - Math.random() * 50, life: 1.1, t: 0, r: 12 + Math.random() * 6, kind: 'heart' });
}
export function floater(x, y, str, color = C.green, size = 28) {
  fx.floaters.push({ x, y, str, color, size, t: 0, life: 1.4 });
}
export function confetti(x, y, n = 40) {
  const cols = ['#E8B64C', '#F08A3C', '#7DB45A', '#5B9BC8', '#E0565B', '#b98ad8'];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, sp = 150 + Math.random() * 250;
    fx.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 300, life: 2 + Math.random(), t: 0, r: 5 + Math.random() * 4, color: cols[i % cols.length], kind: 'confetti', rot: Math.random() * 6 });
  }
}
export function rocket(x, y, tx, ty, onBurst) {
  fx.rockets.push({ x, y, sx: x, sy: y, tx, ty, t: 0, dur: 0.9 + Math.random() * 0.4, onBurst });
}
function burst(x, y) {
  const cols = [['#ffd36b', '#F08A3C'], ['#9fe0ff', '#5B9BC8'], ['#ffb3c8', '#E0565B'], ['#c8ffb0', '#7DB45A'], ['#e3c8ff', '#9a7ad0']];
  const [a1, a2] = cols[(Math.random() * cols.length) | 0];
  const n = 64;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, sp = 170 + Math.random() * 120;
    fx.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 60, drag: 1.6, life: 1.3 + Math.random() * 0.5, t: 0, r: 4.5, color: i % 2 ? a1 : a2, kind: 'spark' });
  }
}

export function update(dt) {
  fx.shake = Math.max(0, fx.shake - dt * 18);
  for (const p of fx.parts) {
    p.t += dt;
    if (p.drag) { p.vx *= Math.exp(-p.drag * dt); p.vy *= Math.exp(-p.drag * dt); }
    p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'dust') { p.vx *= 0.92; p.vy *= 0.92; }
    if (p.rot !== undefined) p.rot += dt * 6;
  }
  fx.parts = fx.parts.filter(p => p.t < p.life);
  for (const f of fx.floaters) f.t += dt;
  fx.floaters = fx.floaters.filter(f => f.t < f.life);
  for (const r of fx.rockets) {
    r.t += dt; const k = Math.min(1, r.t / r.dur), e = 1 - (1 - k) * (1 - k);
    r.x = r.sx + (r.tx - r.sx) * e; r.y = r.sy + (r.ty - r.sy) * e;
    if (Math.random() < 0.6) fx.parts.push({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 20, vy: 20, life: 0.4, t: 0, r: 2.5, color: '#ffe8a8', kind: 'spark' });
    if (k >= 1) { burst(r.x, r.y); r.done = true; r.onBurst && r.onBurst(); }
  }
  fx.rockets = fx.rockets.filter(r => !r.done);
}

export function draw(ctx) {
  for (const p of fx.parts) {
    const a = 1 - p.t / p.life;
    if (p.kind === 'dust') { ctx.fillStyle = p.color + (0.6 * a).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.t), 0, 7); ctx.fill(); }
    else if (p.kind === 'heart') { ctx.save(); ctx.globalAlpha = a; heart(ctx, p.x, p.y, p.r); ctx.restore(); }
    else if (p.kind === 'confetti') { ctx.save(); ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); }
    else { ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); ctx.restore(); }
  }
  for (const f of fx.floaters) {
    const k = f.t / f.life;
    ctx.save(); ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    text(ctx, f.str, f.x, f.y - 30 * k, { size: f.size, color: f.color, align: 'center', stroke: '#fff8e8', sw: 6 });
    ctx.restore();
  }
}
export function clear() { fx.parts = []; fx.floaters = []; fx.rockets = []; }
