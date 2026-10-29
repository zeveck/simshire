// Web Audio: music with a crossfaded loop seam, overlapping sound effects,
// per-frame de-duplication, separate music / sound mutes.
const MUSIC = ['mus-title', 'mus-meadow', 'mus-woodfen', 'mus-ember', 'mus-party'];
const SFX = ['sfx-click', 'sfx-build', 'sfx-clear', 'sfx-cant', 'sfx-settler', 'sfx-cheerful', 'sfx-grumpy', 'sfx-moveout',
  'sfx-hungry', 'sfx-goal-tick', 'sfx-gathering', 'sfx-level', 'sfx-star', 'sfx-unlock', 'sfx-dragon', 'sfx-dragon-land',
  'sfx-fw-launch', 'sfx-fw-burst', 'sfx-cheer', 'amb-meadow'];
const FADE = 2.0;
const VOL = { music: 0.55, sfx: 0.8, amb: 0.22 };
const SFX_VOL = { 'sfx-click': 0.5, 'sfx-settler': 0.6, 'sfx-fw-burst': 0.6, 'sfx-fw-launch': 0.5, 'sfx-cant': 0.6 };

export const audio = {
  ctx: null, buffers: {}, raw: {}, musicMuted: false, sfxMuted: false,
  musicGain: null, sfxGain: null, ambGain: null,
  track: null, next: 0, cur: null, playedThisFrame: new Set(), amb: null, ducked: false,
};

// Fetch all files up front (works offline from the cache); decode once the context exists.
export function preload() {
  const all = [['mus-title', 'assets/audio/music/mus-title.mp3'], ...SFX.map(id => [id, `assets/audio/sfx/${id}.mp3`]), ...MUSIC.filter(m => m !== 'mus-title').map(id => [id, `assets/audio/music/${id}.mp3`])];
  return Promise.all(all.map(([id, url]) => fetch(url).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) { audio.raw[id] = b; if (pendingRaw.delete(id) || (audio.ctx && !MUSIC.includes(id))) decode(id); } }).catch(() => {})));
}

function trim(buf) {
  // Trim leading/trailing near-silence so loops don't gap.
  const d = buf.getChannelData(0), n = d.length, th = 0.004;
  let a = 0, b = n - 1;
  while (a < n && Math.abs(d[a]) < th) a++;
  while (b > a && Math.abs(d[b]) < th) b--;
  if (a < 50 && b > n - 50) return buf;
  const len = Math.max(1, b - a + 1);
  const out = audio.ctx.createBuffer(buf.numberOfChannels, len, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(a, a + len), c);
  return out;
}

// Decode on demand; music is large when decoded, so keep only the tracks in use.
const decoding = {};
function decode(id) {
  if (!audio.ctx || audio.buffers[id] || decoding[id]) return;
  if (!audio.raw[id]) { pendingRaw.add(id); return; }
  decoding[id] = true;
  audio.ctx.decodeAudioData(audio.raw[id].slice(0)).then(b => {
    decoding[id] = false;
    audio.buffers[id] = MUSIC.includes(id) || id === 'amb-meadow' ? trim(b) : b;
    if (id === audio.track && !audio.cur) startTrack(audio.track);
    if (id === 'amb-meadow' && audio.wantAmb) setAmbience(true);
  }).catch(() => { decoding[id] = false; });
}
const pendingRaw = new Set();
export function unlock() {
  if (!audio.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    audio.ctx = new AC();
    audio.musicGain = audio.ctx.createGain(); audio.musicGain.connect(audio.ctx.destination);
    audio.sfxGain = audio.ctx.createGain(); audio.sfxGain.connect(audio.ctx.destination);
    audio.ambGain = audio.ctx.createGain(); audio.ambGain.connect(audio.ctx.destination);
    applyMute();
    for (const id of Object.keys(audio.raw)) if (!MUSIC.includes(id)) decode(id);
    if (audio.track) decode(audio.track);
  }
  if (audio.ctx.state !== 'running') audio.ctx.resume().catch(() => {});
}

export function applyMute() {
  if (!audio.ctx) return;
  const t = audio.ctx.currentTime;
  audio.musicGain.gain.setTargetAtTime(audio.musicMuted ? 0 : (audio.ducked ? VOL.music * 0.35 : VOL.music), t, 0.05);
  audio.sfxGain.gain.setTargetAtTime(audio.sfxMuted ? 0 : VOL.sfx, t, 0.02);
  audio.ambGain.gain.setTargetAtTime(audio.sfxMuted || audio.musicMuted ? 0 : (audio.ducked ? 0 : VOL.amb), t, 0.05);
}
export function duck(on) { audio.ducked = on; applyMute(); }

function scheduleSegment(id, when, fadeIn) {
  const buf = audio.buffers[id]; if (!buf) return null;
  const ctx = audio.ctx, src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = buf; src.connect(g); g.connect(audio.musicGain);
  const dur = buf.duration;
  g.gain.setValueAtTime(fadeIn ? 0 : 1, when);
  if (fadeIn) g.gain.linearRampToValueAtTime(1, when + fadeIn);
  g.gain.setValueAtTime(1, when + dur - FADE);
  g.gain.linearRampToValueAtTime(0, when + dur);
  src.start(when);
  return { src, g, end: when + dur, nextAt: when + dur - FADE };
}
function startTrack(id) {
  if (!audio.ctx || !audio.buffers[id]) return;
  const seg = scheduleSegment(id, audio.ctx.currentTime + 0.05, 1.0);
  audio.cur = { id, segs: [seg] };
}
export function playMusic(id) {
  if (audio.track === id && audio.cur) return;
  stopMusic();
  audio.track = id;
  for (const m of MUSIC) if (m !== id && audio.buffers[m]) delete audio.buffers[m];
  if (audio.buffers[id]) startTrack(id); else decode(id);
}
export function stopMusic() {
  if (audio.cur && audio.ctx) {
    const t = audio.ctx.currentTime;
    for (const s of audio.cur.segs) { try { s.g.gain.cancelScheduledValues(t); s.g.gain.setValueAtTime(s.g.gain.value, t); s.g.gain.linearRampToValueAtTime(0, t + 0.6); s.src.stop(t + 0.7); } catch (e) {} }
  }
  audio.cur = null; audio.track = null;
}

export function setAmbience(on) {
  audio.wantAmb = on;
  if (!audio.ctx) return;
  if (on && !audio.amb && audio.buffers['amb-meadow']) {
    const src = audio.ctx.createBufferSource(); src.buffer = audio.buffers['amb-meadow']; src.loop = true;
    src.connect(audio.ambGain); src.start(); audio.amb = src;
  } else if (!on && audio.amb) { try { audio.amb.stop(); } catch (e) {} audio.amb = null; }
}

// Called every frame: keeps the music loop going, clears the de-dup set.
export function update() {
  audio.playedThisFrame.clear();
  if (!audio.ctx || !audio.cur) return;
  const segs = audio.cur.segs, last = segs[segs.length - 1];
  if (last && audio.ctx.currentTime > last.nextAt - 0.4) {
    const seg = scheduleSegment(audio.cur.id, last.nextAt, FADE);
    if (seg) segs.push(seg);
    while (segs.length > 2) segs.shift();
  }
}

export function sfx(id, vol = 1, rate = 1) {
  if (!audio.ctx || audio.sfxMuted || audio.playedThisFrame.has(id)) return;
  const buf = audio.buffers[id]; if (!buf) return;
  audio.playedThisFrame.add(id);
  const src = audio.ctx.createBufferSource(), g = audio.ctx.createGain();
  src.buffer = buf; src.playbackRate.value = rate; g.gain.value = vol * (SFX_VOL[id] || 1);
  src.connect(g); g.connect(audio.sfxGain); src.start();
}

export const audioState = () => ({ context: audio.ctx ? audio.ctx.state : 'none', musicMuted: audio.musicMuted, sfxMuted: audio.sfxMuted,
  track: audio.cur ? audio.cur.id : null, decoded: Object.keys(audio.buffers).length });
