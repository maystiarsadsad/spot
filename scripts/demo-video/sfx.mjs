// Tiny sound-effects synthesizer (pure JS, no assets): clicks, whooshes, pops, key ticks, chimes -> 16-bit WAV.
import { writeFileSync } from "node:fs";

const SR = 44100;
const TAU = Math.PI * 2;

// Each effect returns a Float32Array of samples.
const gens = {
  click() {
    const n = Math.floor(SR * 0.07), out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = (Math.sin(TAU * 1800 * t) * Math.exp(-t * 120) * 0.55) + (Math.sin(TAU * 520 * t) * Math.exp(-t * 55) * 0.5) + (Math.random() * 2 - 1) * Math.exp(-t * 400) * 0.25;
    }
    return out;
  },
  key() {
    const n = Math.floor(SR * 0.03), out = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / SR; out[i] = ((Math.random() * 2 - 1) * Math.exp(-t * 260) * 0.35) + Math.sin(TAU * 2600 * t) * Math.exp(-t * 300) * 0.2; }
    return out;
  },
  pop() {
    const n = Math.floor(SR * 0.16), out = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, f = 480 + 520 * (1 - Math.exp(-t * 30));
      ph += TAU * f / SR;
      out[i] = Math.sin(ph) * Math.exp(-t * 20) * 0.55;
    }
    return out;
  },
  whoosh() {
    const n = Math.floor(SR * 0.55), out = new Float32Array(n);
    let lp = 0, bp = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n, f = 300 + 3600 * Math.sin(Math.PI * u * 0.9) ** 2; // sweep up and back
      const g = 2 * Math.sin(Math.PI * f / SR);
      const x = Math.random() * 2 - 1;
      lp += g * bp; const hp = x - lp - 0.45 * bp; bp += g * hp;
      out[i] = bp * Math.sin(Math.PI * u) ** 1.6 * 0.55;
    }
    return out;
  },
  zoom() {
    const n = Math.floor(SR * 0.7), out = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, u = i / n, f = 220 + 760 * u * u;
      ph += TAU * f / SR;
      out[i] = (Math.sin(ph) * 0.5 + Math.sin(ph * 2.01) * 0.2) * Math.sin(Math.PI * u) ** 2 * 0.28;
    }
    return out;
  },
  success() {
    const n = Math.floor(SR * 0.9), out = new Float32Array(n);
    const notes = [[0, 659.25], [0.11, 830.61], [0.22, 987.77]];
    for (const [at, f] of notes) {
      for (let i = Math.floor(at * SR); i < n; i++) {
        const t = i / SR - at;
        out[i] += (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2 * t)) * Math.exp(-t * 5.5) * 0.32;
      }
    }
    return out;
  },
};

/** events: [{t: seconds, name}] -> Float32Array of `duration` seconds. gains scale the loudness of each effect. */
export function mixSfx(events, duration, gains = {}) {
  const total = Math.ceil(duration * SR) + SR;
  const mix = new Float32Array(total);
  const cache = {};
  for (const { t, name } of events) {
    const g = gens[name];
    if (!g) continue;
    const s = (cache[name] ??= g());
    const gain = gains[name] ?? 1;
    const start = Math.floor(t * SR);
    for (let i = 0; i < s.length && start + i < total; i++) mix[start + i] += s[i] * gain;
  }
  // soft clip
  for (let i = 0; i < total; i++) mix[i] = Math.tanh(mix[i] * 0.9);
  return mix;
}

export function writeWav(path, samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  writeFileSync(path, buf);
}
