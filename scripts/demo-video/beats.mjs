// Beat detection for a music track (pure JS): tempo + beat grid, to align captions and zooms with the music.
import { execFileSync } from "node:child_process";

export function analyzeBeats(file) {
  const SR = 11025, HOP = 256;
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  const x = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  const n = Math.floor(x.length / HOP);
  // onset envelope: positive change of short-time energy (emphasises kicks and plucks)
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < HOP * 2 && i * HOP + j < x.length; j++) s += x[i * HOP + j] ** 2; e[i] = Math.sqrt(s / (HOP * 2)); }
  const env = new Float32Array(n);
  for (let i = 1; i < n; i++) env[i] = Math.max(0, e[i] - e[i - 1]);
  // normalise by local mean
  const w = 43;
  for (let i = 0; i < n; i++) { let m = 0, c = 0; for (let k = Math.max(0, i - w); k < Math.min(n, i + w); k++) { m += env[k]; c++; } env[i] = env[i] / (m / c + 1e-6); }
  const fps = SR / HOP;
  // tempo by autocorrelation, mild prior towards 95-130 BPM
  let best = { lag: 0, score: -1 };
  for (let bpm = 70; bpm <= 170; bpm += 0.5) {
    const lag = (fps * 60) / bpm;
    let s = 0, c = 0;
    for (let i = 0; i + Math.round(lag) < n; i++) { s += env[i] * env[i + Math.round(lag)]; c++; }
    s /= c;
    const prior = 1 + 0.25 * Math.exp(-(((bpm - 112) / 22) ** 2));
    if (s * prior > best.score) best = { lag, bpm, score: s * prior };
  }
  // Refine tempo and phase together: score a beat grid at fractional positions over the whole track
  const at = (t) => { const x = t * fps, i = Math.floor(x), f = x - i; return i >= 0 && i + 1 < n ? env[i] * (1 - f) + env[i + 1] * f : 0; };
  const dur = n / fps;
  let top = { score: -1, bpm: best.bpm, off: 0 };
  for (let bpm = best.bpm - 4; bpm <= best.bpm + 4; bpm += 0.05) {
    const per = 60 / bpm;
    for (let off = 0; off < per; off += 0.01) {
      let sc = 0;
      for (let t = off; t < dur; t += per) sc += at(t) + 0.5 * at(t - 0.02) + 0.5 * at(t + 0.02);
      if (sc > top.score) top = { score: sc, bpm, off };
    }
  }
  const period = 60 / top.bpm;
  const first = top.off;
  best.bpm = top.bpm;
  return { bpm: Math.round(best.bpm * 100) / 100, period, first, duration: x.length / SR };
}

/** Snap a time to the nearest beat if it is within `tol` seconds. */
export function snapToBeat(t, grid, tol = 0.28) {
  const k = Math.round((t - grid.first) / grid.period);
  const b = grid.first + k * grid.period;
  return Math.abs(b - t) <= tol && b >= 0 ? b : t;
}
