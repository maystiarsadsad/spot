// Post-production: speed ramps, animated zoom, designed captions, sound effects and (optional) music.
// Two phases so the music can be swapped without re-recording:
//   prepare(): raw frames -> v0.mp4 (speed ramps applied) + caption PNGs + job.json   (needs the recording)
//   render():  job folder + optional music -> final MP4 (zoom, captions, sfx, music)    (no browser needed)
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { mixSfx, writeWav } from "./sfx.mjs";
import { analyzeBeats, snapToBeat } from "./beats.mjs";

const OW = 1920, OH = 1080, FPS = 30;
const ZOOM_IN = 0.75, ZOOM_OUT = 0.8;

const clip = (u) => `clip(${u},0,1)`;
const smooth = (u) => `(${clip(u)}*${clip(u)}*(3-2*${clip(u)}))`;

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"], maxBuffer: 1 << 28 });
}

/** Phase 1: needs the raw frames and a browser (renderPng) for the captions. */
export async function prepare({ frames, events, jobDir, renderPng }) {
  mkdirSync(jobDir, { recursive: true });
  const t0 = frames[0].ts;
  const rel = (w) => w - t0;

  // Speed ramps: some stretches (typing, waiting for the server) play faster in the final video
  const ranges = events.filter((e) => e.k === "speed").map((e) => ({ a: rel(e.from), b: rel(e.to), f: e.factor }));
  const speedAt = (t) => ranges.reduce((f, r) => (t >= r.a && t < r.b ? Math.max(f, r.f) : f), 1);
  const table = [];
  let N = 0;
  frames.forEach((fr, i) => {
    const s = fr.ts - t0;
    const e = (frames[i + 1]?.ts ?? fr.ts + 0.6) - t0;
    const f = speedAt((s + e) / 2);
    const nd = Math.max(0.001, (e - s) / f);
    table.push({ s, f, N, nd, file: fr.file });
    N += nd;
  });

  const list = table.map((r) => `file '${r.file.replace(/\\/g, "/")}'\nduration ${r.nd.toFixed(5)}`);
  list.push(`file '${table[table.length - 1].file.replace(/\\/g, "/")}'`);
  const listFile = join(jobDir, "concat.txt");
  writeFileSync(listFile, list.join("\n"));
  run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile, "-vf", `fps=${FPS}`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", join(jobDir, "v0.mp4")]);

  // Caption PNGs (one per caption event with text)
  const caps = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.k !== "cap" || !e.text) continue;
    const { png, w, h } = await renderPng(captionHtml(e.text, e.tag), { width: 1920, height: 500 });
    const file = `cap${i}.png`;
    writeFileSync(join(jobDir, file), png);
    caps.push({ i, file, w, h });
  }

  writeFileSync(join(jobDir, "job.json"), JSON.stringify({
    t0,
    total: N,
    events: events.map((e) => (e.k === "speed" ? e : { ...e, t: rel(e.t) })), // times relative to the recording start
    table: table.map(({ s, f, N: n }) => ({ s, f, N: n })),
    caps,
  }));
  return { duration: N };
}

/** Phase 2: build the final video from a prepared job (optionally with music). */
export function render({ jobDir, outFile, music, musicGainDb = 0, sfxGain = 1, title }) {
  const job = JSON.parse(readFileSync(join(jobDir, "job.json"), "utf8"));
  const { table, total, caps } = job;
  const F = (t) => { // original (recording) time -> final time
    if (t <= 0) return 0;
    let lo = 0, hi = table.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (table[m].s <= t) lo = m; else hi = m - 1; }
    const r = table[lo];
    return Math.min(total, r.N + (t - r.s) / r.f);
  };

  // With music: find its beat grid and land captions / zooms / effects on the beat
  const grid = music && existsSync(music) ? analyzeBeats(music) : null;
  if (grid) console.log(`music: ${grid.bpm} BPM, first beat ${grid.first.toFixed(2)}s`);
  const sn = grid ? (t) => snapToBeat(t, grid) : (t) => t;

  // Zoom keyframes
  const zooms = job.events.filter((e) => e.k === "zoom").map((e) => {
    const a = sn(F(e.t));
    let b = sn(F(e.t + e.hold));
    b = Math.max(b, a + ZOOM_IN + 0.5);
    return { a, b, cx: e.cx, cy: e.cy, z: e.z };
  });
  const bump = (k) => `(${smooth(`(t-${k.a.toFixed(3)})/${ZOOM_IN}`)}-${smooth(`(t-${k.b.toFixed(3)})/${ZOOM_OUT}`)})`;
  const sum = (key, base) => zooms.map((k) => `(${(k[key] - base).toFixed(2)})*${bump(k)}`).join("+") || "0";
  const Z = `(1+${zooms.map((k) => `(${(k.z - 1).toFixed(3)})*${bump(k)}`).join("+") || "0"})`;
  const CX = `(${OW / 2}+${sum("cx", OW / 2)})`;
  const CY = `(${OH / 2}+${sum("cy", OH / 2)})`;

  const cuts = job.events.filter((e) => e.k === "sfx" && e.name === "whoosh").map((e) => F(e.t)).sort((x, y) => x - y);
  // Caption windows: from this caption to the next caption event (or to the end)
  const capEvents = job.events.map((e, i) => ({ e, i })).filter((x) => x.e.k === "cap");
  const windows = [];
  for (let n = 0; n < capEvents.length; n++) {
    const { e, i } = capEvents[n];
    const png = caps.find((c) => c.i === i);
    if (!e.text || !png) continue;
    const a = sn(F(e.t));
    let b = n + 1 < capEvents.length ? sn(F(capEvents[n + 1].e.t)) : total;
    // A caption never survives a scene change: end it where the next navigation / card starts
    const cut = cuts.find((c) => c > a + 0.4 && c < b);
    if (cut) b = cut;
    if (b - a < 0.6) continue;
    windows.push({ file: join(jobDir, png.file), a, b: Math.min(b, total) });
  }

  // Video graph
  const nCap = windows.length;
  const zoomExpr = zooms.length
    ? `scale=w='${OW}*${Z}':h='${OH}*${Z}':eval=frame:flags=bicubic,crop=w=${OW}:h=${OH}:x='min(max(${CX}*${Z}-${OW / 2},0),${OW}*${Z}-${OW})':y='min(max(${CY}*${Z}-${OH / 2},0),${OH}*${Z}-${OH})'`
    : `scale=${OW}:${OH}:flags=lanczos`;
  const lines = [`[0:v]${zoomExpr},format=yuv420p[z0]`];
  windows.forEach((c, i) => {
    lines.push(`[${i + 1}:v]format=rgba,fade=t=in:st=${c.a.toFixed(3)}:d=0.3:alpha=1,fade=t=out:st=${(c.b - 0.25).toFixed(3)}:d=0.25:alpha=1[c${i}]`);
    const E = smooth(`(t-${c.a.toFixed(3)})/0.4`);
    lines.push(`[z${i}][c${i}]overlay=x='(W-w)/2':y='H-h-70+44*(1-${E})':eval=frame:enable='between(t,${c.a.toFixed(3)},${c.b.toFixed(3)})'[z${i + 1}]`);
  });
  lines.push(`[z${nCap}]null[vout]`);

  // Audio: synthesized effects (+ music)
  const SNAPPED = ["pop", "zoom", "whoosh", "success"];
  const sfxEvents = job.events.filter((e) => e.k === "sfx").map((e) => ({ t: SNAPPED.includes(e.name) ? sn(F(e.t)) : F(e.t), name: e.name }));
  const sfxWav = join(jobDir, "sfx.wav");
  writeWav(sfxWav, mixSfx(sfxEvents, total, { key: 0.5, click: 0.9, pop: 0.7, whoosh: 0.8, zoom: 0.8, success: 0.9 }));

  const inputs = ["-i", join(jobDir, "v0.mp4")];
  for (const c of windows) inputs.push("-loop", "1", "-framerate", String(FPS), "-t", total.toFixed(3), "-i", c.file);
  inputs.push("-i", sfxWav);
  const sfxIdx = nCap + 1;
  let audioGraph;
  if (music && existsSync(music)) {
    inputs.push("-i", music);
    const mIdx = nCap + 2;
    audioGraph = `[${sfxIdx}:a]volume=${sfxGain},aformat=sample_rates=44100:channel_layouts=stereo[sfx];` +
      `[${mIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=0:${total.toFixed(3)},afade=t=in:st=0:d=1.8,afade=t=out:st=${Math.max(0, total - 4).toFixed(3)}:d=4,loudnorm=I=-19:TP=-2:LRA=7,volume=${musicGainDb}dB[mus];` +
      `[mus][sfx]amix=inputs=2:normalize=0:duration=longest[mix];[mix]loudnorm=I=-16:TP=-1.5:LRA=9[aout]`;
  } else {
    audioGraph = `[${sfxIdx}:a]volume=${sfxGain},aformat=sample_rates=44100:channel_layouts=stereo[aout]`;
  }
  const graphFile = join(jobDir, "graph.txt");
  writeFileSync(graphFile, lines.join(";\n") + ";\n" + audioGraph);

  run("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-/filter_complex", graphFile, "-map", "[vout]", "-map", "[aout]",
    "-t", total.toFixed(3), "-r", String(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", ...(title ? ["-metadata", `title=${title}`] : []), outFile]);

  return { duration: total, captions: nCap, zooms: zooms.length, sfx: sfxEvents.length, bpm: grid?.bpm ?? null };
}

/** Phase 1 + 2 in one go (what a recording script calls). */
export async function finish({ frames, events, outFile, jobDir, renderPng, music, musicGainDb, sfxGain, title }) {
  await prepare({ frames, events, jobDir, renderPng });
  return render({ jobDir, outFile, music, musicGainDb, sfxGain, title });
}

/** Designed caption (rendered by the browser, transparent PNG). *word* is highlighted. */
function captionHtml(text, tag) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = esc(text).replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return `<!doctype html><meta charset=utf-8>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;background:transparent}
  #box{display:inline-block;padding:0 12px 12px 0}
  .pill{display:inline-flex;flex-direction:column;gap:10px;align-items:flex-start;max-width:1440px;padding:24px 42px 26px;border-radius:26px;background:rgba(21,20,15,.93);border:2px solid rgba(255,122,68,.75);box-shadow:8px 8px 0 #ff7a44;font-family:Geist,"Segoe UI",system-ui,sans-serif}
  .tag{font-size:21px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ff7a44}
  .txt{font-size:46px;font-weight:600;line-height:1.18;color:#fff6e0}
  em{font-style:normal;color:#ffe7a8;background:linear-gradient(transparent 62%,rgba(255,122,68,.45) 62%)}
</style>
<div id="box"><div class="pill">${tag ? `<div class="tag">${esc(tag)}</div>` : ""}<div class="txt">${body}</div></div></div>`;
}

// CLI: node post.mjs render <jobDir> <out.mp4> [music.mp3] [gainDb]
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("/post.mjs") && process.argv[2] === "render") {
  const [, , , jobDir, outFile, music, gain] = process.argv;
  console.log(JSON.stringify(render({ jobDir, outFile, music, musicGainDb: gain ? Number(gain) : 0 })));
}
