// Demo-video studio: drives Edge through the DevTools protocol (no dependencies; Node 22+) and records
// the page. Besides the raw capture it keeps a timeline of "directing" events (captions, zooms, speed
// ramps, sound effects) that post.mjs turns into the final polished video.
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { finish } from "./post.mjs";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wall = () => Date.now() / 1000;

export const BRAND = { ink: "#15140f", sun: "#ffe7a8", orange: "#ff7a44", cream: "#fff6e0" };

export class Recorder {
  constructor({ profileDir, outDir, width = 1280, height = 720, scale = 2, port = 9333, headless = true }) {
    Object.assign(this, { profileDir, outDir, width, height, scale, port, headless });
    this.id = 0;
    this.pending = new Map();
    this.frames = [];
    this.events = [];
    this.recording = false;
    this.cursor = { x: width / 2, y: height / 2 };
    this.frameDir = join(outDir, "frames");
  }

  async launch() {
    mkdirSync(this.outDir, { recursive: true });
    const args = [
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${this.profileDir}`,
      `--window-size=${this.width},${this.height + (this.headless ? 0 : 90)}`,
      "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--disable-infobars",
      "--lang=es-CO", "--disable-features=Translate",
      ...(this.headless ? ["--headless=new", "--disable-gpu"] : []),
      "about:blank",
    ];
    // A previous crashed run can leave Edge holding this profile: stop only processes that use it
    try {
      const needle = this.profileDir.replace(/\//g, "\\");
      execFileSync("powershell", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${needle.replace(/'/g, "''")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: "ignore" });
    } catch { /* nothing to stop */ }
    this.proc = spawn(EDGE, args, { stdio: "ignore" });
    process.on("exit", () => { try { this.proc.kill(); } catch { /* gone */ } });
    let ver;
    for (let i = 0; i < 60; i++) {
      try { ver = await (await fetch(`http://127.0.0.1:${this.port}/json/version`)).json(); break; } catch { await sleep(500); }
    }
    if (!ver) throw new Error("Edge did not start");
    const targets = await (await fetch(`http://127.0.0.1:${this.port}/json`)).json();
    const page = targets.find((t) => t.type === "page") ?? (await (await fetch(`http://127.0.0.1:${this.port}/json/new`, { method: "PUT" })).json());
    this.ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (ev) => this.onMessage(JSON.parse(ev.data));
    this.listeners = [];
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("Network.enable");
    await this.send("Emulation.setDeviceMetricsOverride", { width: this.width, height: this.height, deviceScaleFactor: this.scale, mobile: false });
    await this.send("Emulation.setLocaleOverride", { locale: "es-CO" }).catch(() => {});
    await this.send("Emulation.setTimezoneOverride", { timezoneId: "America/Bogota" }).catch(() => {});
    await this.send("Page.addScriptToEvaluateOnNewDocument", { source: OVERLAY_JS });
  }

  onMessage(msg) {
    if (msg.id && this.pending.has(msg.id)) {
      const { res, rej } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      msg.error ? rej(new Error(`${msg.error.message}`)) : res(msg.result);
    } else if (msg.method) {
      if (msg.method === "Page.screencastFrame") {
        const { data, metadata, sessionId } = msg.params;
        this.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
        if (this.recording) this.frames.push({ ts: metadata.timestamp, data });
      }
      for (const l of this.listeners) l(msg);
    }
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }

  async eval(expression) {
    const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
    return r.result.value;
  }

  waitEvent(method, timeout = 20000) {
    return new Promise((res) => {
      const t = setTimeout(() => { this.listeners = this.listeners.filter((l) => l !== fn); res(null); }, timeout);
      const fn = (m) => { if (m.method === method) { clearTimeout(t); this.listeners = this.listeners.filter((l) => l !== fn); res(m.params); } };
      this.listeners.push(fn);
    });
  }

  // ── directing events (only logged while recording) ──
  ev(k, data = {}) { if (this.recording) this.events.push({ k, t: wall(), ...data }); }
  sfx(name) { this.ev("sfx", { name }); }

  /** Caption shown from now until the next caption (or caption("")). tag = small label above the text. *word* is highlighted. */
  async caption(text, { ms = 0, tag = "" } = {}) {
    this.ev("cap", { text: text || null, tag });
    if (text) this.sfx("pop");
    if (ms) await sleep(ms);
  }

  /** Zoom into an element (or {x,y,w,h} in viewport px) and hold, then zoom back out. */
  async spotlight(target, { scale = 1.5, hold = 2400, tag } = {}) {
    const r = target.w ? target : await this.rect(target);
    const k = 1920 / this.width;
    this.ev("zoom", { cx: (r.x + r.w / 2) * k, cy: (r.y + r.h / 2) * k, z: scale, hold: hold / 1000 });
    this.sfx("zoom");
    await sleep(hold + 500);
  }

  /** Run fn at `factor`x speed in the final video (typing, waiting for loads...). */
  async timeLapse(factor, fn) {
    const a = wall();
    await fn();
    this.ev("speed", { from: a, to: wall(), factor });
  }

  /** Pulsing ring (+ label) around an element, baked into the page. */
  async ring(target, { label = "", ms = 2200, pad = 8 } = {}) {
    const r = target.w ? target : await this.rect(target);
    await this.eval(`window.__spotRing(${JSON.stringify({ ...r, label, ms, pad })})`);
    await sleep(ms);
  }

  // ── recording ──
  async startRecording() {
    this.frames = [];
    this.events = [];
    this.recording = true;
    await this.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: this.width * this.scale, maxHeight: this.height * this.scale, everyNthFrame: 1 });
  }

  /** Stop, then build the final video (zoom, captions, speed ramps, sound). */
  async finish(outFile, opts = {}) {
    await sleep(opts.tailMs ?? 500);
    this.recording = false;
    await this.send("Page.stopScreencast");
    if (existsSync(this.frameDir)) rmSync(this.frameDir, { recursive: true });
    mkdirSync(this.frameDir, { recursive: true });
    const frames = this.frames.map((f, i) => {
      const file = join(this.frameDir, `f${String(i).padStart(6, "0")}.jpg`);
      writeFileSync(file, Buffer.from(f.data, "base64"));
      return { ts: f.ts, file };
    });
    this.frames = [];
    writeFileSync(join(this.outDir, "events.json"), JSON.stringify(this.events, null, 1));
    const jobDir = join(this.outDir, "job-" + (opts.jobName ?? "video"));
    const info = await finish({ frames, events: this.events, outFile, jobDir, renderPng: (html, o) => this.renderPng(html, o), ...opts });
    rmSync(this.frameDir, { recursive: true });
    return info;
  }

  // Transparent PNG of an HTML snippet (captions), rendered in a throwaway tab of this browser
  async renderPng(html, { width = 1920, height = 400, selector = "#box" } = {}) {
    const t = await (await fetch(`http://127.0.0.1:${this.port}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pend = new Map();
    ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result ?? m); pend.delete(m.id); } };
    const call = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    await call("Page.enable");
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    await call("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    await call("Page.navigate", { url: "data:text/html;charset=utf-8," + encodeURIComponent(html) });
    await sleep(300);
    await call("Runtime.evaluate", { expression: "document.fonts.ready.then(() => 1)", awaitPromise: true });
    await sleep(150);
    const r = await call("Runtime.evaluate", { expression: `(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })()`, returnByValue: true });
    const b = r.result.value;
    const shot = await call("Page.captureScreenshot", { format: "png", clip: { x: b.x, y: b.y, width: Math.ceil(b.w), height: Math.ceil(b.h), scale: 1 }, captureBeyondViewport: true });
    ws.close();
    await fetch(`http://127.0.0.1:${this.port}/json/close/${t.id}`).catch(() => {});
    return { png: Buffer.from(shot.data, "base64"), w: Math.ceil(b.w), h: Math.ceil(b.h) };
  }

  // ── navigation and interaction ──
  async goto(url, settle = 1200, { dip = true } = {}) {
    if (dip) {
      this.sfx("whoosh");
      await this.eval("window.__spotDipOut && window.__spotDipOut()").catch(() => {});
      await sleep(260);
    }
    const nav = async () => {
      const loaded = this.waitEvent("Page.loadEventFired", 30000);
      await this.send("Page.navigate", { url });
      await loaded;
    };
    // While the scene dip covers the screen we are only waiting for the server: show it sped up
    if (dip) await this.timeLapse(8, nav); else await nav();
    await sleep(settle);
    await this.eval("window.__spotCursorShow && window.__spotCursorShow()").catch(() => {});
  }

  async setCookie(name, value, url) {
    await this.send("Network.setCookie", { name, value, url, path: "/" });
  }

  async hold(ms) { await sleep(ms); }

  async rect(target) {
    // target: { css, text, label, nth, exact } -> bounding rect (after scrolling it into view)
    const r = await this.eval(`(() => {
      const t = ${JSON.stringify(target)};
      let els = t.css ? [...document.querySelectorAll(t.css)] : [...document.querySelectorAll('a,button,[role=button],[role=tab],input,select,textarea,label,summary,li,div,span,p,h1,h2,h3,td,tr')];
      if (t.label) { const q = t.label.toLowerCase(); els = [...document.querySelectorAll('input,select,textarea')].filter((e) => ((e.closest('label') || e.parentElement)?.innerText || '').toLowerCase().includes(q)); }
      if (t.text) { const q = t.text.toLowerCase(); els = els.filter((e) => { const v = (e.innerText||e.value||e.placeholder||e.getAttribute('aria-label')||'').trim().toLowerCase(); return t.exact ? v === q : v.includes(q); });
        els.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height); }
      els = els.filter((e) => { const b = e.getBoundingClientRect(); return b.width > 2 && b.height > 2; });
      let el = els[t.nth ?? 0]; if (!el) return null;
      if (t.row) { while (el.parentElement && el.getBoundingClientRect().width < 700) el = el.parentElement; }
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    })()`);
    if (!r) throw new Error(`element not found: ${JSON.stringify(target)}`);
    await sleep(250);
    return r;
  }

  async moveTo(x, y, ms = 650) {
    const steps = Math.max(8, Math.round(ms / 24));
    const { x: x0, y: y0 } = this.cursor;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const cx = x0 + (x - x0) * e, cy = y0 + (y - y0) * e;
      await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cx, y: cy });
      await this.eval(`window.__spotCursorTo(${cx},${cy})`);
      await sleep(ms / steps);
    }
    this.cursor = { x, y };
  }

  async click(target, { pause = 500 } = {}) {
    const r = await this.rect(target);
    const x = r.x + Math.min(r.w / 2, 120), y = r.y + r.h / 2;
    await this.moveTo(x, y);
    await this.pressAt(x, y);
    await sleep(pause);
  }

  async pressAt(x, y) {
    this.sfx("click");
    await this.eval(`window.__spotRipple(${x},${y})`);
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  }

  /** Click at a fraction (fx, fy) of an element's box, recomputing its position first. */
  async clickAt(target, fx, fy, { pause = 700 } = {}) {
    const r = await this.rect(target);
    const x = r.x + r.w * fx, y = r.y + r.h * fy;
    await this.moveTo(x, y);
    await this.pressAt(x, y);
    await sleep(pause);
  }

  async type(target, text, { delay = 70, clear = false, speed = 2.2 } = {}) {
    await this.click(target, { pause: 200 });
    if (clear) {
      await this.send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 2, commands: ["selectAll"] });
      await this.send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", modifiers: 2 });
      await this.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
      await this.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
    }
    await this.timeLapse(speed, async () => {
      for (const ch of text) {
        this.sfx("key");
        await this.send("Input.dispatchKeyEvent", { type: "char", text: ch });
        await sleep(delay);
      }
    });
    await sleep(250);
  }

  async press(key) {
    const codes = { Enter: 13, Tab: 9, Escape: 27 };
    await this.send("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode: codes[key], text: key === "Enter" ? "\r" : undefined });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: codes[key] });
  }

  async scroll(dy, ms = 1200) {
    const steps = Math.max(6, Math.round(ms / 30));
    for (let i = 0; i < steps; i++) {
      await this.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: this.cursor.x, y: this.cursor.y, deltaX: 0, deltaY: dy / steps });
      await sleep(ms / steps);
    }
    await sleep(300);
  }

  /** Animated title / closing card (CSS animations are captured live). */
  async card({ kind = "intro", title, subtitle = "", chips = [], cta = "", foot = "", ms = 4000 }) {
    this.sfx(kind === "outro" ? "success" : "whoosh");
    const html = cardHtml({ kind, title, subtitle, chips, cta, foot });
    await this.eval("window.__spotDipOut && window.__spotDipOut()").catch(() => {});
    await sleep(260);
    await this.goto("data:text/html;charset=utf-8," + encodeURIComponent(html), 300, { dip: false });
    await sleep(ms);
  }

  async close() {
    try { await this.send("Browser.close"); } catch { /* already closing */ }
    try { this.proc.kill(); } catch { /* ignore */ }
  }
}

// ── HTML for animated cards ──
function cardHtml({ kind, title, subtitle, chips, cta, foot }) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const words = esc(title).split(" ").map((w, i) => `<span class="w" style="animation-delay:${0.45 + i * 0.09}s">${w}</span>`).join(" ");
  const chipHtml = chips.map((c, i) => `<span class="chip" style="animation-delay:${1.15 + i * 0.14}s">${esc(c)}</span>`).join("");
  return `<!doctype html><meta charset=utf-8>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Geist:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;overflow:hidden}
  body{background:${BRAND.ink};color:${BRAND.cream};font-family:Geist,Segoe UI,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;position:relative}
  .bg{position:absolute;inset:-20%;background:
      radial-gradient(40% 50% at 18% 22%,rgba(255,122,68,.34),transparent 70%),
      radial-gradient(38% 46% at 85% 80%,rgba(255,231,168,.20),transparent 70%);
      animation:drift 9s ease-in-out infinite alternate}
  @keyframes drift{from{transform:translate(0,0) scale(1)}to{transform:translate(3%,-2%) scale(1.08)}}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(70% 70% at 50% 50%,#000,transparent);}
  .wrap{position:relative;display:flex;flex-direction:column;align-items:center;gap:26px;max-width:1100px;padding:0 40px}
  .logo{width:116px;height:116px;border-radius:28px;object-fit:cover;box-shadow:0 0 0 3px ${BRAND.orange},8px 8px 0 ${BRAND.orange};animation:pop .7s cubic-bezier(.2,1.5,.4,1) both}
  @keyframes pop{from{transform:scale(.4) rotate(-8deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
  h1{margin:0;font-family:"Instrument Serif",Georgia,serif;font-weight:400;font-size:${kind === "outro" ? 92 : 100}px;line-height:1.02;letter-spacing:-.01em}
  .w{display:inline-block;opacity:0;transform:translateY(34px);animation:up .6s cubic-bezier(.2,.9,.3,1) forwards}
  @keyframes up{to{opacity:1;transform:none}}
  .sub{font-size:34px;line-height:1.3;color:rgba(255,246,224,.82);opacity:0;animation:up .7s .95s cubic-bezier(.2,.9,.3,1) forwards;max-width:900px}
  .chips{display:flex;flex-wrap:wrap;gap:14px;justify-content:center}
  .chip{font-size:24px;font-weight:600;padding:10px 22px;border-radius:999px;border:2px solid rgba(255,122,68,.7);color:${BRAND.sun};background:rgba(255,122,68,.10);opacity:0;transform:translateY(16px);animation:up .5s forwards}
  .cta{margin-top:6px;font-size:34px;font-weight:700;color:${BRAND.ink};background:${BRAND.orange};padding:20px 44px;border-radius:18px;box-shadow:6px 6px 0 ${BRAND.sun};opacity:0;animation:up .6s 1.35s forwards, pulse 1.8s 2.2s ease-in-out infinite}
  @keyframes pulse{50%{transform:scale(1.04)}}
  .foot{position:absolute;bottom:44px;left:0;right:0;font-size:26px;color:rgba(255,246,224,.62);opacity:0;animation:up .6s 1.6s forwards}
  .bar{position:absolute;left:0;bottom:0;height:6px;background:${BRAND.orange};width:0;animation:bar 6s linear forwards}
  @keyframes bar{to{width:100%}}
</style>
<div class="bg"></div><div class="grid"></div>
<div class="wrap">
  <img class="logo" src="https://spot-pi-olive.vercel.app/branding/spot-icon.png" onerror="this.style.display='none'">
  <h1>${words}</h1>
  ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ""}
  ${chips.length ? `<div class="chips">${chipHtml}</div>` : ""}
  ${cta ? `<div class="cta">${esc(cta)}</div>` : ""}
</div>
${foot ? `<div class="foot">${esc(foot)}</div>` : ""}
<div class="bar"></div>`;
}

// Injected in every document: fake cursor, click ripple, ring callouts, scene dip, and the identity sanitizer
const OVERLAY_JS = `
(() => {
  if (window.__spotOverlay) return; window.__spotOverlay = true;
  const ACCENT = '#ff7a44', INK = '#15140f';
  const style = document.createElement('style');
  style.textContent =
    '#__spot_cursor{position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 3px 4px rgba(0,0,0,.5))}' +
    '.__spot_ripple{position:fixed;z-index:2147483646;pointer-events:none;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid ' + ACCENT + ';animation:__spot_rip .6s ease-out forwards}' +
    '@keyframes __spot_rip{to{transform:scale(4.4);opacity:0}}' +
    '.__spot_ring{position:fixed;z-index:2147483645;pointer-events:none;border:3px solid ' + ACCENT + ';border-radius:14px;box-shadow:0 0 0 6px rgba(255,122,68,.22);animation:__spot_ringin .45s cubic-bezier(.2,1.4,.4,1) both,__spot_ringpulse 1.2s .45s ease-in-out infinite}' +
    '@keyframes __spot_ringin{from{opacity:0;transform:scale(1.25)}to{opacity:1;transform:none}}' +
    '@keyframes __spot_ringpulse{50%{box-shadow:0 0 0 12px rgba(255,122,68,.08)}}' +
    '.__spot_ringlabel{position:fixed;z-index:2147483645;pointer-events:none;background:' + ACCENT + ';color:' + INK + ';font:700 15px/1 Geist,Segoe UI,system-ui,sans-serif;padding:7px 12px;border-radius:8px;box-shadow:3px 3px 0 ' + INK + ';animation:__spot_ringin .45s .1s cubic-bezier(.2,1.4,.4,1) both}' +
    '#__spot_dip{position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:' + INK + ';opacity:0;transition:opacity .3s ease}' +
    '#__spot_dip::after{content:"";position:absolute;left:0;top:50%;height:4px;width:100%;background:' + ACCENT + ';transform:scaleX(0);transform-origin:left;transition:transform .5s ease}' +
    '#__spot_dip.on{opacity:1}#__spot_dip.on::after{transform:scaleX(1)}';
  // documentElement may not exist yet at document start: define everything lazily and mount when it appears
  const ready = (fn) => { if (document.documentElement) fn(); else { const o = new MutationObserver(() => { if (document.documentElement) { o.disconnect(); fn(); } }); o.observe(document, { childList: true }); } };
  ready(() => (document.head || document.documentElement).appendChild(style));

  const mount = () => {
    if (document.getElementById('__spot_cursor')) return;
    const c = document.createElement('div'); c.id = '__spot_cursor';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
  };
  // Scene dip: covered from the first paint when we arrived via __spotDipOut, then revealed
  const dip = document.createElement('div'); dip.id = '__spot_dip';
  ready(() => {
    document.documentElement.appendChild(dip);
    if (window.name === '__spot_dip') {
      dip.style.transition = 'none'; dip.classList.add('on');
      // reveal on a fixed beat after the new page starts (not on 'load', which can take seconds on the dashboard)
      setTimeout(() => { dip.style.transition = ''; dip.classList.remove('on'); window.name = ''; }, 420);
    }
  });
  window.__spotDipOut = () => { window.name = '__spot_dip'; dip.classList.add('on'); };

  window.__spotCursorShow = mount;
  window.__spotCursorTo = (x, y) => { mount(); document.getElementById('__spot_cursor').style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  window.__spotRipple = (x, y) => { mount(); const r = document.createElement('div'); r.className = '__spot_ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.documentElement.appendChild(r); setTimeout(() => r.remove(), 750); };
  window.__spotRing = ({ x, y, w, h, label, ms, pad }) => {
    const r = document.createElement('div'); r.className = '__spot_ring';
    r.style.cssText += 'left:' + (x - pad) + 'px;top:' + (y - pad) + 'px;width:' + (w + pad * 2) + 'px;height:' + (h + pad * 2) + 'px';
    document.documentElement.appendChild(r);
    let l = null;
    if (label) { l = document.createElement('div'); l.className = '__spot_ringlabel'; l.textContent = label; l.style.left = (x - pad) + 'px'; l.style.top = Math.max(6, y - pad - 34) + 'px'; document.documentElement.appendChild(l); }
    setTimeout(() => { r.remove(); l && l.remove(); }, ms);
  };

  // Replace the real owner's identity with a demo persona in everything that is rendered
  const persona = () => window.__spotPersona || { name: 'Carlos Gómez', email: 'carlos@minegocio.co', initials: 'CG', greeting: 'Buenos días' };
  const clean = () => {
    const P = persona();
    const root = document.body || document.documentElement;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const todo = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const v = n.nodeValue;
      if (/Mike Arias|arias[.]crc@gmail[.]com|Buenas (noches|tardes)|Buenos días/.test(v) || v.trim() === 'MA' || v.trim() === 'SA') todo.push(n);
    }
    for (const n of todo) {
      let v = n.nodeValue;
      if (v.trim() === 'SA') { if (n.parentElement) n.parentElement.style.display = 'none'; continue; }
      if (v.trim() === 'MA') { n.nodeValue = v.replace('MA', P.initials); continue; }
      v = v.replace(/Mike Arias/g, P.name).replace(/arias[.]crc@gmail[.]com/gi, P.email).replace(/Buenas (noches|tardes)|Buenos días/, P.greeting);
      if (v !== n.nodeValue) n.nodeValue = v;
    }
  };
  // Observe from the very first moment and clean synchronously in the observer's microtask,
  // so the real identity never reaches a painted frame (not even while the page streams in).
  new MutationObserver(() => { try { clean(); } catch (e) {} }).observe(document, { childList: true, subtree: true, characterData: true });
  document.addEventListener('DOMContentLoaded', () => { mount(); try { clean(); } catch (e) {} });
})();
`;
