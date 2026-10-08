const PRE = "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@d58301e4a494555f411a2afbc448b724136eee76/public/samples";
const WOOD = "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@044fab8e1456bfafc5776e86dfd6bb8697149aef/FluidR3_GM/woodblock-mp3";
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;
const STEPS = 16;
const BARS = 8;
const SR = 48000;

const VOICES = ["Kick", "Snare", "Hi-hat", "Woodblock", "Piano", "Nylon", "Upright", "Violin"];
const KEYS = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const RECIPES = [
  { id: "son32", name: "Son 3-2", blurb: "Woodblock son clave, 3-side then 2-side. Nylon chops the ands." },
  { id: "son23", name: "Son 2-3", blurb: "The 2-side opens the bar so the vocal can enter on the 3." },
  { id: "rumba32", name: "Rumba 3-2", blurb: "Third hit sits on the and of 4. Upright anticipates the next root." },
  { id: "bossa", name: "Bossa", blurb: "Woodblock partido on the ands. Kick stays on the one only." },
  { id: "offchop", name: "Offbeat chop", blurb: "Nylon on every and. Woodblock marks the clave, not the grid." },
  { id: "antic", name: "Anticipation", blurb: "Upright lands an 8th early into the next chord. Downbeat stays open." },
  { id: "half", name: "Half clave", blurb: "Bars 1–4 stay straight. Bars 5–8 take the son 3-2." },
  { id: "openone", name: "Open one", blurb: "No hat on the one. Woodblock and snare ghost the backbeat." }
];

const SAMPLES = [
  ["kick", "Kick", `${PRE}/drums/kick.mp3`, 36],
  ["snare", "Snare", `${PRE}/drums/snare.mp3`, 38],
  ["hat", "Hi-hat", `${PRE}/drums/hihat.mp3`, 42],
  ["woodHi", "Woodblock", `${WOOD}/C5.mp3`, 72],
  ["woodLo", "Woodblock", `${WOOD}/G4.mp3`, 67],
  ["pC3", "Piano", `${PRE}/piano/C3.mp3`, 48],
  ["pE3", "Piano", `${PRE}/piano/E3.mp3`, 52],
  ["pG3", "Piano", `${PRE}/piano/G3.mp3`, 55],
  ["pA3", "Piano", `${PRE}/piano/A3.mp3`, 57],
  ["pC4", "Piano", `${PRE}/piano/C4.mp3`, 60],
  ["pE4", "Piano", `${PRE}/piano/E4.mp3`, 64],
  ["pG4", "Piano", `${PRE}/piano/G4.mp3`, 67],
  ["pA4", "Piano", `${PRE}/piano/A4.mp3`, 69],
  ["pC5", "Piano", `${PRE}/piano/C5.mp3`, 72],
  ["gE2", "Nylon", `${PRE}/guitar/E2.mp3`, 40],
  ["gA2", "Nylon", `${PRE}/guitar/A2.mp3`, 45],
  ["gB2", "Nylon", `${PRE}/guitar/B2.mp3`, 47],
  ["gD3", "Nylon", `${PRE}/guitar/D3.mp3`, 50],
  ["gE3", "Nylon", `${PRE}/guitar/E3.mp3`, 52],
  ["gG3", "Nylon", `${PRE}/guitar/G3.mp3`, 55],
  ["gA3", "Nylon", `${PRE}/guitar/A3.mp3`, 57],
  ["bE1", "Upright", `${PRE}/bass/E1.mp3`, 28],
  ["bG1", "Upright", `${PRE}/bass/G1.mp3`, 31],
  ["bA1", "Upright", `${PRE}/bass/A1.mp3`, 33],
  ["bC2", "Upright", `${PRE}/bass/C2.mp3`, 36],
  ["bE2", "Upright", `${PRE}/bass/E2.mp3`, 40],
  ["vA3", "Violin", `${PRE}/violin/A3.mp3`, 57],
  ["vC4", "Violin", `${PRE}/violin/C4.mp3`, 60],
  ["vE4", "Violin", `${PRE}/violin/E4.mp3`, 64],
  ["vG4", "Violin", `${PRE}/violin/G4.mp3`, 67],
  ["vA4", "Violin", `${PRE}/violin/A4.mp3`, 69],
  ["vC5", "Violin", `${PRE}/violin/C5.mp3`, 72]
];

const state = {
  bpm: 96,
  key: "A",
  chords: "Am F C G",
  recipe: "son32",
  mode: "B",
  mutes: { Kick: false, Snare: false, "Hi-hat": false, Woodblock: false, Piano: false, Nylon: false, Upright: false, Violin: false },
  playing: false
};

let ctx, master, comp, timerId = 0, nextStepTime = 0, step = 0, sources = [];
const raw = {};
const banks = {};
let missing = [];
let armed = false;

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem("claveeight-v1") || "null");
    if (!s) return;
    if (s.bpm) state.bpm = clamp(s.bpm, 60, 180);
    if (s.key) state.key = s.key;
    if (s.chords) state.chords = s.chords;
    if (s.recipe) state.recipe = s.recipe;
    if (s.mutes) state.mutes = Object.assign(state.mutes, s.mutes);
  } catch (e) { /* keep defaults */ }
}
function saveState() {
  localStorage.setItem("claveeight-v1", JSON.stringify({
    bpm: state.bpm, key: state.key, chords: state.chords, recipe: state.recipe, mutes: state.mutes
  }));
}
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

const ROOTS = { C:0, "C#":1, Db:1, D:2, "D#":3, Eb:3, E:4, F:5, "F#":6, Gb:6, G:7, "G#":8, Ab:8, A:9, "A#":10, Bb:10, B:11 };
function parseChord(token) {
  const m = String(token).trim().match(/^([A-G](?:#|b)?)(m|min)?/);
  if (!m || ROOTS[m[1]] == null) return null;
  const root = ROOTS[m[1]];
  const minor = !!m[2];
  const third = minor ? 3 : 4;
  return { symbol: m[1] + (minor ? "m" : ""), root, tones: [root, root + third, root + 7] };
}
function progression() {
  const parts = state.chords.split(/\s+/).filter(Boolean).slice(0, 4);
  while (parts.length < 4) parts.push(parts[parts.length - 1] || "Am");
  return parts.map(p => parseChord(p) || parseChord("Am"));
}
function keyOffset() { return ROOTS[state.key] == null ? 0 : ROOTS[state.key] - 9; }
function chordAt(bar) {
  const prog = progression();
  const ch = prog[bar % 4];
  const off = keyOffset();
  return { symbol: ch.symbol, root: (ch.root + off + 120) % 12, tones: ch.tones.map(t => (t + off + 120) % 12) };
}

function son32(i) { return [0, 6, 12, 20, 24].indexOf(i % 32) >= 0; }
function son23(i) { return [4, 8, 16, 22, 28].indexOf(i % 32) >= 0; }
function rumba32(i) { return [0, 6, 14, 20, 24].indexOf(i % 32) >= 0; }
function bossa(i) {
  const s = i % 32;
  return s === 4 || s === 10 || s === 16 || s === 22 || s === 28;
}
function hitsFor(recipe, stepIndex, bar) {
  if (recipe === "half" && bar < 4) return false;
  if (recipe === "son23") return son23(stepIndex);
  if (recipe === "rumba32") return rumba32(stepIndex);
  if (recipe === "bossa") return bossa(stepIndex);
  if (recipe === "offchop") return son32(stepIndex);
  if (recipe === "antic") return son32(stepIndex);
  if (recipe === "openone") return son32(stepIndex);
  return son32(stepIndex);
}

function eventsAt(stepIndex) {
  const bar = Math.floor(stepIndex / 16) % BARS;
  const s = stepIndex % 16;
  const ch = chordAt(bar);
  const recipe = state.recipe;
  const b = state.mode === "B";
  const ev = [];
  const kickOn = s === 0 || (s === 8 && state.mode === "A");
  if (kickOn) ev.push({ voice: "Kick", id: "kick", midi: 36, dur: 0.2, gain: 0.9 });
  if (s === 4 || s === 12) ev.push({ voice: "Snare", id: "snare", midi: 38, dur: 0.18, gain: b && recipe === "openone" ? 0.35 : 0.7 });
  if (state.mode === "A" && s % 2 === 0) ev.push({ voice: "Hi-hat", id: "hat", midi: 42, dur: 0.08, gain: 0.35 });
  if (b && recipe !== "openone" && s % 2 === 0 && s !== 0) ev.push({ voice: "Hi-hat", id: "hat", midi: 42, dur: 0.08, gain: 0.28 });
  if (b && recipe === "openone" && s % 2 === 0 && s !== 0) ev.push({ voice: "Hi-hat", id: "hat", midi: 42, dur: 0.08, gain: 0.22 });
  if (b && hitsFor(recipe, stepIndex, bar)) {
    const high = (stepIndex % 32) === 0 || (stepIndex % 32) === 16;
    ev.push({ voice: "Woodblock", id: high ? "woodHi" : "woodLo", midi: high ? 72 : 67, dur: 0.16, gain: 0.72 });
  }
  if (s === 0) {
    ch.tones.forEach((t, i) => ev.push({ voice: "Piano", id: null, midi: 60 + t, dur: 0.9, gain: 0.28 - i * 0.04 }));
    ev.push({ voice: "Violin", id: null, midi: 60 + ch.tones[0], dur: (60 / state.bpm) * 4, gain: 0.22, loop: true });
  }
  if (b && (s === 6 || s === 10 || s === 14 || (recipe === "offchop" && s % 2 === 1))) {
    const t = ch.tones[(Math.floor(s / 2)) % 3];
    ev.push({ voice: "Nylon", id: null, midi: 52 + t, dur: 0.22, gain: 0.42 });
  }
  if (state.mode === "A" && s === 0) ev.push({ voice: "Upright", id: null, midi: 36 + ch.root, dur: 0.45, gain: 0.7 });
  if (b && recipe === "antic" && s === 14) ev.push({ voice: "Upright", id: null, midi: 36 + chordAt((bar + 1) % BARS).root, dur: 0.4, gain: 0.62 });
  else if (b && (s === 0 || s === 10)) ev.push({ voice: "Upright", id: null, midi: 36 + ch.root + (s === 10 ? 12 : 0), dur: 0.35, gain: 0.62 });
  if (!b && s === 8) ev.push({ voice: "Nylon", id: null, midi: 52 + ch.tones[2], dur: 0.3, gain: 0.3 });
  return ev.filter(e => !state.mutes[e.voice]);
}

function nearest(voice, midi) {
  const bank = banks[voice] || [];
  let best = null, dist = 99;
  bank.forEach(s => {
    const d = Math.abs(s.midi - midi);
    if (d < dist) { dist = d; best = s; }
  });
  if (!best || dist > 4) return null;
  return { buf: best.buf, rate: Math.pow(2, (midi - best.midi) / 12) };
}

function track(node) { sources.push(node); }
function stopSources() {
  sources.forEach(s => { try { s.stop(); } catch (e) { /* already ended */ } });
  sources = [];
}

function scheduleHit(ctxLocal, dest, when, ev) {
  const pick = nearest(ev.voice, ev.midi);
  if (!pick) return;
  const src = ctxLocal.createBufferSource();
  src.buffer = pick.buf;
  src.playbackRate.value = pick.rate;
  if (ev.loop && pick.buf.duration > 0.35) {
    src.loop = true;
    src.loopStart = Math.min(0.12, pick.buf.duration * 0.25);
    src.loopEnd = Math.max(src.loopStart + 0.05, pick.buf.duration - 0.05);
  }
  const g = ctxLocal.createGain();
  const peak = ev.gain;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(peak, when + 0.012);
  const end = when + ev.dur;
  g.gain.setValueAtTime(peak, Math.max(when + 0.012, end - 0.02));
  g.gain.linearRampToValueAtTime(0.0001, end + 0.012);
  src.connect(g); g.connect(dest);
  src.start(when);
  src.stop(end + 0.03);
  track(src);
}

function scheduleStep(stepIndex, when, ctxLocal, dest) {
  eventsAt(stepIndex).forEach(ev => scheduleHit(ctxLocal, dest, when, ev));
}

function scheduler() {
  if (!state.playing || !ctx) return;
  while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(step, nextStepTime, ctx, master);
    const stepDur = 60 / state.bpm / 4;
    nextStepTime += stepDur;
    step = (step + 1) % (BARS * STEPS);
  }
}
function start(mode) {
  if (!ctx || ctx.state !== "running" || missing.length) return;
  state.mode = mode;
  state.playing = true;
  stopSources();
  nextStepTime = ctx.currentTime + 0.1;
  step = 0;
  clearInterval(timerId);
  timerId = setInterval(scheduler, LOOKAHEAD_MS);
  saveState();
  paint();
}
function stop() {
  state.playing = false;
  clearInterval(timerId);
  stopSources();
  paint();
}

let raf = 0;
function playhead() {
  if (ctx && state.playing) {
    const elapsed = ctx.currentTime - (nextStepTime - (step === 0 ? 0 : 0));
    const stepDur = 60 / state.bpm / 4;
    const origin = nextStepTime - step * stepDur;
    const pos = Math.max(0, ctx.currentTime - origin);
    const bar = Math.floor(pos / (stepDur * 16)) % BARS;
    document.querySelectorAll(".bar").forEach((el, i) => el.classList.toggle("active", i === bar));
  }
  raf = requestAnimationFrame(playhead);
}

function exportLength(bars, bpm) {
  return Math.round(bars * 4 * 60 / bpm * SR);
}
function renderOffline(withTail) {
  const bars = BARS;
  const bpm = state.bpm;
  const length = exportLength(bars, bpm);
  const tail = Math.round(SR * 1.2);
  const off = new OfflineAudioContext(2, length + tail, SR);
  const bus = off.createGain();
  bus.gain.value = 0.8;
  const lim = off.createDynamicsCompressor();
  lim.threshold.value = -8;
  lim.knee.value = 6;
  lim.ratio.value = 8;
  lim.attack.value = 0.003;
  lim.release.value = 0.12;
  bus.connect(lim); lim.connect(off.destination);
  const stepDur = 60 / bpm / 4;
  let t = 0;
  for (let i = 0; i < bars * STEPS; i++) {
    scheduleStep(i, t, off, bus);
    t += stepDur;
  }
  return off.startRendering().then(buf => {
    const mix = buf.getChannelData(0).slice(0, length + tail);
    const right = buf.getChannelData(1).slice(0, length + tail);
    if (!withTail) {
      for (let i = 0; i < tail; i++) {
        mix[i % length] += mix[length + i] || 0;
        right[i % length] += right[length + i] || 0;
      }
    }
    const n = withTail ? length + tail : length;
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(mix[i] || 0), Math.abs(right[i] || 0));
    const gain = peak > 0 ? Math.min(1, Math.pow(10, -1 / 20) / peak) : 1;
    return encodeWav(mix, right, n, gain);
  });
}
function encodeWav(l, r, n, gain) {
  const bytes = 44 + n * 6;
  const ab = new ArrayBuffer(bytes);
  const v = new DataView(ab);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, bytes - 8, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 6, true); v.setUint16(32, 6, true); v.setUint16(34, 24, true);
  w(36, "data"); v.setUint32(40, n * 6, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    const ls = Math.max(-8388608, Math.min(8388607, Math.round((l[i] || 0) * gain * 8388607)));
    const rs = Math.max(-8388608, Math.min(8388607, Math.round((r[i] || 0) * gain * 8388607)));
    v.setUint8(o, ls & 255); v.setUint8(o + 1, (ls >> 8) & 255); v.setUint8(o + 2, (ls >> 16) & 255);
    v.setUint8(o + 3, rs & 255); v.setUint8(o + 4, (rs >> 8) & 255); v.setUint8(o + 5, (rs >> 16) & 255);
    o += 6;
  }
  return new Blob([ab], { type: "audio/wav" });
}
function fileBase() {
  const rec = state.recipe;
  const key = (state.key + progression()[0].symbol).replace(/[^A-Za-z0-9#b]+/g, "");
  return `claveeight-${rec}-${state.bpm}bpm-${key}`;
}
function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
function writeMidi() {
  const ticks = 480;
  const tempo = Math.round(60000000 / state.bpm);
  const tracks = VOICES.map(voice => ({ voice, events: [] }));
  const stepDurBeats = 0.25;
  for (let i = 0; i < BARS * STEPS; i++) {
    eventsAt(i).forEach(ev => {
      const tr = tracks.find(t => t.voice === ev.voice);
      const tick = Math.round(i * stepDurBeats * ticks);
      const dur = Math.max(1, Math.round((ev.dur / (60 / state.bpm)) * ticks));
      tr.events.push({ tick, midi: ev.midi, dur, vel: Math.round(ev.gain * 100) });
    });
  }
  const bytes = [77, 84, 104, 100, 0, 0, 0, 6, 0, 1, 0, tracks.length + 1, 1, 224];
  const tempoTrack = [];
  pushMeta(tempoTrack, 0, [0xFF, 0x51, 0x03, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255]);
  pushMeta(tempoTrack, 0, [0xFF, 0x58, 0x04, 4, 2, 24, 8]);
  pushMeta(tempoTrack, 0, [0xFF, 0x2F, 0x00]);
  bytes.push(...chunk(tempoTrack));
  tracks.forEach(tr => {
    const ev = [];
    const name = Array.from(tr.voice).map(c => c.charCodeAt(0));
    pushMeta(ev, 0, [0xFF, 0x03, name.length, ...name]);
    const notes = tr.events.slice().sort((a, b) => a.tick - b.tick);
    let last = 0;
    notes.forEach(n => {
      ev.push(...vlq(n.tick - last), 0x90, n.midi, Math.max(1, Math.min(127, n.vel)));
      last = n.tick;
      ev.push(...vlq(n.dur), 0x80, n.midi, 0);
      last = n.tick + n.dur;
    });
    pushMeta(ev, 0, [0xFF, 0x2F, 0x00]);
    bytes.push(...chunk(ev));
  });
  return new Blob([new Uint8Array(bytes)], { type: "audio/midi" });
}
function vlq(n) {
  let b = n & 127, x = n >> 7;
  const out = [];
  while (x) { out.unshift((x & 127) | 128); x >>= 7; }
  out.push(b);
  return out;
}
function pushMeta(arr, delta, data) { arr.push(...vlq(delta), ...data); }
function chunk(data) {
  const len = data.length;
  return [77, 84, 114, 107, (len >> 24) & 255, (len >> 16) & 255, (len >> 8) & 255, len & 255, ...data];
}

function punch() {
  const prog = progression().map(c => c.symbol).join(" ");
  const rec = RECIPES.find(r => r.id === state.recipe);
  return `ClaveEight punch list\n${state.bpm} BPM · key ${state.key} · ${prog} · ${rec.name} · mode ${state.mode}\n\nThe problem: the loop sits on the downbeat and the vocal has nowhere to land.\nThe move: ${rec.blurb}\n\nA is the straight pocket. B locks woodblock clave, nylon chops, and upright offs. Kick stays on the one so the WAV drops on bar 1.\nNot TagFour, ModEight, LiftTwo, PreEight, AfterHook, EndEight, LastHook, AndEight, or ShakeFour.`;
}

function paint() {
  document.getElementById("bpm").value = state.bpm;
  document.getElementById("key").value = state.key;
  document.getElementById("chords").value = state.chords;
  document.getElementById("punch").textContent = punch();
  const rec = document.getElementById("recipes");
  rec.innerHTML = "";
  RECIPES.forEach(r => {
    const b = document.createElement("button");
    b.className = "card" + (state.recipe === r.id ? " on" : "");
    b.innerHTML = `<b>${r.name}</b><span>${r.blurb}</span>`;
    b.onclick = () => { state.recipe = r.id; saveState(); paint(); };
    rec.appendChild(b);
  });
  const bars = document.getElementById("bars");
  bars.innerHTML = "";
  for (let i = 0; i < BARS; i++) {
    const d = document.createElement("div");
    d.className = "bar";
    d.innerHTML = `<div class="n">${i + 1}</div><div class="c">${chordAt(i).symbol}</div>`;
    bars.appendChild(d);
  }
  const mutes = document.getElementById("mutes");
  mutes.innerHTML = "";
  VOICES.forEach(v => {
    const b = document.createElement("button");
    b.textContent = (state.mutes[v] ? "Mute " : "") + v;
    b.className = state.mutes[v] ? "on" : "";
    b.onclick = () => { state.mutes[v] = !state.mutes[v]; saveState(); paint(); };
    mutes.appendChild(b);
  });
  document.getElementById("playA").classList.toggle("on", state.playing && state.mode === "A");
  document.getElementById("playB").classList.toggle("on", state.playing && state.mode === "B");
}

async function ensureCtx() {
  if (!ctx) {
    ctx = new AudioContext({ sampleRate: SR });
    master = ctx.createGain();
    master.gain.value = 0.7;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.knee.value = 4;
    comp.ratio.value = 12;
    comp.attack.value = 0.003;
    comp.release.value = 0.1;
    master.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state !== "running") await ctx.resume();
  armed = true;
  document.getElementById("gate").classList.add("hidden");
}

async function loadSamples() {
  missing = [];
  const status = document.getElementById("status");
  let done = 0;
  for (const [id, voice, url, midi] of SAMPLES) {
    status.textContent = `Seating chairs ${done}/${SAMPLES.length}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const arr = await res.arrayBuffer();
      raw[id] = arr;
      const buf = await ctx.decodeAudioData(arr.slice(0));
      banks[voice] = banks[voice] || [];
      banks[voice].push({ id, midi, buf });
    } catch (e) {
      if (!missing.includes(voice)) missing.push(voice);
    }
    done++;
    status.textContent = `Seating chairs ${done}/${SAMPLES.length}`;
  }
  if (missing.length) status.textContent = "Missing instruments: " + missing.join(", ") + ". Not playing with a hole.";
  else status.textContent = "Chairs seated. A is the straight pocket. B is the clave.";
}

function wire() {
  const key = document.getElementById("key");
  KEYS.forEach(k => { const o = document.createElement("option"); o.value = k; o.textContent = k; key.appendChild(o); });
  loadState();
  paint();
  document.getElementById("arm").onclick = async () => { await ensureCtx(); await loadSamples(); };
  document.getElementById("playA").onclick = async () => { await ensureCtx(); if (!Object.keys(banks).length) await loadSamples(); start("A"); };
  document.getElementById("playB").onclick = async () => { await ensureCtx(); if (!Object.keys(banks).length) await loadSamples(); start("B"); };
  document.getElementById("stop").onclick = stop;
  document.getElementById("bpm").onchange = e => { state.bpm = clamp(Number(e.target.value) || 96, 60, 180); saveState(); paint(); };
  document.getElementById("key").onchange = e => { state.key = e.target.value; saveState(); paint(); };
  document.getElementById("chords").onchange = e => { state.chords = e.target.value; saveState(); paint(); };
  document.getElementById("copy").onclick = () => navigator.clipboard.writeText(punch());
  document.getElementById("wav").onclick = async () => {
    await ensureCtx();
    if (missing.length) return;
    download(await renderOffline(false), fileBase() + ".wav");
  };
  document.getElementById("wavTail").onclick = async () => {
    await ensureCtx();
    if (missing.length) return;
    download(await renderOffline(true), fileBase() + "-with-tail.wav");
  };
  document.getElementById("mid").onclick = () => download(writeMidi(), fileBase() + ".mid");
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") stop(); });
  requestAnimationFrame(playhead);
}
wire();
