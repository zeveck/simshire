// Headless check of Sim Shire's rules, maps and recorded solutions.
// Run from the project root: node design/solutions/verify.mjs
import { readFileSync } from 'node:fs';
import { LEVELS, W, H, B } from '../../game/src/data.js';
import * as S from '../../game/src/sim.js';

const expect = [ // final pop, harmony, neighbours, completion day (from GAME_DESIGN.md)
  { pop: 16, harmony: 70.00, nb: null, day: 8 },
  { pop: 25, harmony: 79.56, nb: 7, day: 10 },
  { pop: 34, harmony: 79.62, nb: 8, day: 22 },
  { pop: 46, harmony: 78.26, nb: 14, day: 17 },
  { pop: 56, harmony: 83.96, nb: 15, day: 34 },
];
let fail = 0;
const bad = (m) => { fail++; console.log('  FAIL ' + m); };
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

for (const [i, lv] of LEVELS.entries()) {
  console.log(`L${i + 1} ${lv.name}`);
  if (lv.map.length !== H || lv.map.some(r => r.length !== W)) bad('map is not 16x9');
  const s0 = S.newState(i);
  if (S.residents(s0) > S.foodProd(s0)) bad('hamlet is hungry');
  for (const h of S.homes(s0)) if (h.res > 0 && S.happiness(s0, h) < 40) bad('hamlet home grumpy at ' + h.x + ',' + h.y);
  for (const b of s0.b) if (b.kind !== 'well') {
    const t = S.terr(lv, b.x, b.y), d = B[b.kind];
    if (d.on !== t && !(d.on === 'shelf' && lv.map[b.y][b.x] === 'L')) bad('hamlet ' + b.kind + ' on ' + t);
  }
  const sh = S.inShire(s0);
  const touching = (ter) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (sh[y][x] && S.terr(lv, x, y) === 'grass' && !s0.grid[y][x] &&
    N4.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && S.terr(lv, nx, ny) === ter; })) return true; return false; };
  if (!touching('forest')) bad('no reachable grass touching forest');
  if (i > 0 && !touching('rock')) bad('no reachable grass touching rock');
  const steps = JSON.parse(readFileSync(new URL(`./level-${i + 1}.json`, import.meta.url)));
  let s;
  try { s = S.runSteps(i, steps); } catch (e) { bad(e.message); continue; }
  const e = expect[i], hv = S.harmony(s), nb = S.neighbourCount(s);
  console.log(`  complete=${s.complete} day=${s.day} pop=${S.residents(s)} harmony=${hv.toFixed(2)} neighbours=${nb}`);
  if (!s.complete) bad('level not complete');
  if (S.residents(s) !== e.pop) bad('pop ' + S.residents(s) + ' != ' + e.pop);
  if (Math.abs(hv - e.harmony) > 0.006) bad('harmony ' + hv.toFixed(2) + ' != ' + e.harmony);
  if (e.nb !== null && nb !== e.nb) bad('neighbours ' + nb + ' != ' + e.nb);
  if (s.day !== e.day) bad('day ' + s.day + ' != ' + e.day);
}

console.log('Hunger scenario (L1)');
{
  const hs = JSON.parse(readFileSync(new URL('./hunger.json', import.meta.url)));
  const s = S.newState(0); const seen = [];
  for (const st of hs) {
    if (st.op === 'place') S.place(s, st.tool, ...st.tile);
    else if (st.op === 'clear') S.clear(s, ...st.tile);
    else for (let k = 0; k < st.n; k++) S.tick(s);
    seen.push(S.residents(s));
  }
  console.log('  residents after each step: ' + seen.join(' '));
  const r = seen.filter((_, k) => hs[k].op === 'advanceDays');
  if (r.join() !== '4,3,4') bad('expected 4 → 3 → 4, got ' + r.join(' → '));
}
console.log(fail ? `${fail} problem(s)` : 'All checks passed');
process.exit(fail ? 1 : 0);
