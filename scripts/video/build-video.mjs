#!/usr/bin/env node
/**
 * Eyes Up demo video assembler (1920x1080, 30 fps, English voice-over).
 *
 *   node scripts/video/build-video.mjs --footage <dir of window-capture JPGs>
 *   node scripts/video/build-video.mjs                    # stills only (no footage)
 *
 * Options: --out .local/video/eyes-up-demo.mp4  --work .local/video/work  --voice Samantha  --rate 172
 *          --gallery .local/screenshots  --max-speed 1.6 (cap on per-segment speed)
 *
 * How it works (same approach as mirror-tutor/scripts/demo/record-video.mjs):
 *  1. Narration: macOS `say`, one file per line, so every caption has exact timing. A segment lasts as
 *     long as its narration (+ lead/tail silence).
 *  2. Graphics: headless Chrome (raw CDP, no deps) renders one 1920x1080 PNG per caption. Footage
 *     segments get a transparent hole where the preview goes. This ffmpeg has no drawtext/libass.
 *  3. Footage: each media segment lists clips (frame numbers or wall-clock HH:MM:SS, matched to file
 *     mtimes) of the Lens Studio window capture. Frames keep their real spacing (÷ the segment's speed),
 *     are cropped to the Preview panel and scaled into the hole. The segment lasts max(narration,
 *     footage). A clip whose frames are all identical (frozen capture) makes the segment use stills.
 *  4. ffmpeg composites each segment and concatenates them.
 * Shot list + narration: scripts/video/shots.mjs. Needs Google Chrome, ffmpeg/ffprobe, macOS `say`.
 */
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CROP, LEAF_ROWS, SEGMENTS } from './shots.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : '1']] : acc), []),
);
const FOOTAGE = args.footage ? path.resolve(args.footage) : null;
const WORK = path.resolve(args.work ?? path.join(ROOT, '.local/video/work'));
const OUT = path.resolve(args.out ?? path.join(ROOT, '.local/video/eyes-up-demo.mp4'));
const GALLERY = path.resolve(args.gallery ?? path.join(ROOT, '.local/screenshots'));
const VOICE = args.voice ?? 'Samantha';
const RATE = Number(args.rate ?? 172);
const MAX_SPEED = Number(args['max-speed'] ?? 1.6);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg';
const FFPROBE = existsSync('/opt/homebrew/bin/ffprobe') ? '/opt/homebrew/bin/ffprobe' : 'ffprobe';

const W = 1920, H = 1080, FPS = 30;
// Media box (left) keeps the preview's 876:610 aspect; text column on the right.
const MB = { x: 64, y: 64, h: 952 };
MB.w = Math.round((MB.h * CROP.w) / CROP.h);
const COL_X = MB.x + MB.w + 56;
const LEAD = 0.6, GAP = 0.4, TAIL = 0.9;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[video ${new Date().toISOString().slice(11, 19)}]`, ...a);
const run = (cmd, argv) => execFileSync(cmd, argv, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }).toString();
const probe = (f) => Number(run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim());
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fileUrl = (p) => `file://${path.resolve(ROOT, p)}`;
const pngSize = (f) => {
  const b = readFileSync(f);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

/* ── 1. narration ─────────────────────────────────────────────────────────── */
function buildAudio() {
  const dir = path.join(WORK, 'audio');
  mkdirSync(dir, { recursive: true });
  const silence = (sec, f) => run(FFMPEG, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', sec.toFixed(3), '-c:a', 'pcm_s16le', f]);
  for (const seg of SEGMENTS) {
    const parts = [];
    const cues = [];
    let t = LEAD;
    const lead = path.join(dir, `${seg.id}-lead.wav`);
    silence(LEAD, lead);
    parts.push(lead);
    seg.lines.forEach((line, i) => {
      const aiff = path.join(dir, `${seg.id}-${i}.aiff`);
      const wav = path.join(dir, `${seg.id}-${i}.wav`);
      run('/usr/bin/say', ['-v', VOICE, '-r', String(RATE), '-o', aiff, line]);
      run(FFMPEG, ['-y', '-v', 'error', '-i', aiff, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
      const d = probe(wav);
      cues.push({ start: t, end: t + d, text: line });
      parts.push(wav);
      t += d;
      if (i < seg.lines.length - 1) {
        const g = path.join(dir, `${seg.id}-gap${i}.wav`);
        silence(GAP, g);
        parts.push(g);
        t += GAP;
      }
    });
    const tail = path.join(dir, `${seg.id}-tail.wav`);
    silence(TAIL, tail);
    parts.push(tail);
    const list = path.join(dir, `${seg.id}-list.txt`);
    writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
    seg.audio = path.join(dir, `${seg.id}.wav`);
    run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'pcm_s16le', seg.audio]);
    seg.cues = cues;
    seg.duration = probe(seg.audio);
    log(`audio ${seg.id}: ${seg.duration.toFixed(2)}s`);
  }
}

/* ── 2. footage selection ─────────────────────────────────────────────────── */
function loadFootage() {
  if (!FOOTAGE) return null;
  const files = readdirSync(FOOTAGE).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
  if (!files.length) throw new Error(`no frames in ${FOOTAGE}`);
  const frames = files.map((f) => {
    const file = path.join(FOOTAGE, f);
    return { file, ms: statSync(file).mtimeMs, hash: createHash('md5').update(readFileSync(file)).digest('hex') };
  });
  const unique = new Set(frames.map((f) => f.hash)).size;
  const d0 = new Date(frames[0].ms);
  log(`footage: ${frames.length} frames, ${((frames.at(-1).ms - frames[0].ms) / 1000).toFixed(1)}s, ${unique} distinct image(s)`);
  if (unique <= 1) log('  WARN footage is FROZEN (every frame identical): the window capture never refreshed. Using stills.');
  const at = (hms) => {
    const [h, m, s] = hms.split(':').map(Number);
    return new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), h, m, s).getTime();
  };
  return { frames, at, unique };
}

// A clip end is a frame number (int) or "HH:MM:SS" (from = first frame of that second, to = last).
function resolve(foot, v, edge) {
  if (typeof v === 'number') return foot.frames.findIndex((f) => f.file.endsWith(`${String(v).padStart(5, '0')}.jpg`));
  const a = foot.at(v);
  if (edge === 'from') return foot.frames.findIndex((f) => f.ms >= a);
  return foot.frames.findLastIndex((f) => f.ms < a + 1000);
}

function pickFootage(foot, seg) {
  if (!foot || !seg.footage) return null;
  const speed = Math.min(seg.speed ?? 1, MAX_SPEED);
  const frames = [];
  let offset = 0;
  for (const clip of seg.footage) {
    const i0 = resolve(foot, clip.from, 'from'), i1 = resolve(foot, clip.to, 'to');
    const fr = i0 >= 0 && i1 > i0 ? foot.frames.slice(i0, i1 + 1) : [];
    const distinct = new Set(fr.map((f) => f.hash)).size;
    if (fr.length < 2 || distinct < 2) {
      log(`  ${seg.id}: clip ${clip.from}–${clip.to} has ${fr.length} frames, ${distinct} distinct → stills`);
      return null;
    }
    for (const f of fr) frames.push({ file: f.file, v: offset + (f.ms - fr[0].ms) / 1000 / speed });
    const step = (fr.at(-1).ms - fr[0].ms) / (fr.length - 1);
    offset += (fr.at(-1).ms - fr[0].ms + step) / 1000 / speed;
    log(`  ${seg.id}: clip ${path.basename(fr[0].file)}–${path.basename(fr.at(-1).file)} (${((fr.at(-1).ms - fr[0].ms) / 1000).toFixed(1)}s)`);
  }
  return { speed, frames, length: offset };
}

/* ── 3. graphics ──────────────────────────────────────────────────────────── */
const CSS = `
:root{--canvas:#eef2ff;--panel:#ffffff;--ink:#20232d;--muted:#5e6372;--primary:#3864ed;--primary-ink:#2952d8;--line:#d9def0;--media:#151a26;--amber:#f2a33a;--ok:#1f8a5b}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:transparent;font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:var(--canvas)}
.hole{position:absolute;left:${MB.x}px;top:${MB.y}px;width:${MB.w}px;height:${MB.h}px;border-radius:16px;box-shadow:0 0 0 3000px var(--canvas)}
.box{position:absolute;left:${MB.x}px;top:${MB.y}px;width:${MB.w}px;height:${MB.h}px;border-radius:16px;overflow:hidden;background:var(--media)}
.img{position:absolute;background-repeat:no-repeat}
.chip{position:absolute;left:${MB.x}px;top:${MB.y - 50}px;background:#20232d;color:#fff;border-radius:9px;padding:8px 14px;font-size:19px;font-weight:600;letter-spacing:.01em;z-index:5}
.chip b{color:#9fb6ff;font-weight:700;margin-right:8px}
.note{position:absolute;left:${MB.x}px;top:${MB.y + MB.h + 14}px;color:var(--muted);font-size:19px;z-index:5}
.mark{position:absolute;border:3px solid var(--amber);border-radius:6px;box-shadow:0 0 0 2px rgba(0,0,0,.35)}
.inset{position:absolute;border:3px solid var(--amber);border-radius:12px;overflow:hidden;background:#000;box-shadow:0 12px 40px rgba(0,0,0,.45)}
.inset-label{position:absolute;color:#fff;font-size:22px;font-weight:700}
.col{position:absolute;left:${COL_X}px;right:64px;top:${MB.y}px;bottom:${H - MB.y - MB.h}px;display:flex;flex-direction:column}
.kick{font-size:20px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--primary-ink)}
.col h1{margin:14px 0 0;font-size:44px;line-height:1.1;font-weight:800;letter-spacing:-.01em}
.cap{margin-top:auto;margin-bottom:auto;font-size:31px;line-height:1.38;font-weight:600;border-left:5px solid var(--primary);padding-left:20px}
.prog{height:6px;border-radius:3px;background:var(--line)}.prog i{display:block;height:6px;border-radius:3px;background:var(--primary)}
.foot{margin-top:14px;font-size:17px;line-height:1.35;color:var(--muted)}
.card{position:absolute;inset:0;background:var(--canvas)}
.capbar{position:absolute;left:50%;transform:translateX(-50%);bottom:56px;max-width:1500px;background:var(--panel);border-radius:16px;padding:22px 34px;font-size:32px;line-height:1.36;font-weight:600;text-align:center;box-shadow:0 1px 0 var(--line)}
.cfoot{position:absolute;left:64px;right:64px;top:40px;display:flex;justify-content:space-between;font-size:18px;color:var(--muted)}
`;

function stillHtml(st, label) {
  const src = path.resolve(ROOT, st.file);
  const { w: iw, h: ih } = pngSize(src);
  const [cx, cy, cw, ch] = st.crop ?? [0, 0, iw, ih];
  const portrait = cw / ch < 1.2;
  const scale = portrait ? MB.h / ch : Math.min(MB.w / cw, MB.h / ch);
  const dw = cw * scale, dh = ch * scale;
  const left = portrait ? (st.zoom ? 70 : (MB.w - dw) / 2) : (MB.w - dw) / 2;
  const top = (MB.h - dh) / 2;
  let html = `<div class="box"><div class="img" style="left:${left}px;top:${top}px;width:${dw}px;height:${dh}px;background-image:url('${fileUrl(st.file)}');background-size:${iw * scale}px ${ih * scale}px;background-position:${-cx * scale}px ${-cy * scale}px"></div>`;
  if (st.zoom) {
    const [zx, zy, zw, zh] = st.zoom.rect;
    const mx = left + (zx - cx) * scale, my = top + (zy - cy) * scale;
    html += `<div class="mark" style="left:${mx - 4}px;top:${my - 4}px;width:${zw * scale + 2}px;height:${zh * scale + 2}px"></div>`;
    // inset: in the free space right of a portrait still, bottom-right corner of a landscape one
    const freeW = portrait ? MB.w - (left + dw) - 80 : 520;
    const zs = Math.min(freeW / zw, (portrait ? 560 : 300) / zh);
    const iwz = zw * zs, ihz = zh * zs;
    const ix = portrait ? left + dw + 40 + (freeW - iwz) / 2 : MB.w - iwz - 32;
    const iy = portrait ? (MB.h - ihz) / 2 : MB.h - ihz - 76;
    html += `<div class="inset" style="left:${ix}px;top:${iy}px;width:${iwz}px;height:${ihz}px;background-image:url('${fileUrl(st.file)}');background-size:${iw * zs}px ${ih * zs}px;background-position:${-zx * zs}px ${-zy * zs}px"></div>`;
    html += `<div class="inset-label" style="left:${ix}px;top:${iy + ihz + 14}px">${esc(st.zoom.label)} <span style="font-weight:500;color:#aab3c8">(zoomed)</span></div>`;
  }
  html += `</div><div class="chip"><b>STILL</b>${esc(label)}</div>`;
  if (st.note) html += `<div class="note">${esc(st.note)}</div>`;
  return html;
}

function mediaHtml(seg, si, ci, cue) {
  const total = SEGMENTS.length;
  let media;
  if (seg.live) {
    const sc = MB.w / CROP.w;
    const marks = (seg.marks ?? [])
      .map(({ rect: [x, y, w, h], label }) => `<div class="mark" style="border-style:dashed;left:${MB.x + x * sc}px;top:${MB.y + y * sc}px;width:${w * sc}px;height:${h * sc}px"></div><div class="inset-label" style="left:${MB.x + x * sc}px;top:${MB.y + y * sc - 36}px;text-shadow:0 1px 3px rgba(0,0,0,.8)">${esc(label)}</div>`)
      .join('');
    media = `<div class="hole"></div>${marks}<div class="chip"><b>LIVE</b>Lens Studio Interactive Preview · no device${seg.live.speed > 1.01 ? ` · ×${seg.live.speed.toFixed(2).replace(/0$/, '')} speed` : ''}</div><div class="note">Head turns and pinches driven through Lens Studio preview tools</div>`;
  } else {
    const st = seg.stills[Math.min(ci, seg.stills.length - 1)];
    media = `<div class="bg"></div>${stillHtml(st, 'Lens Studio Interactive Preview capture · no device')}`;
  }
  return `${media}
  <div class="col"><div class="kick">${esc(seg.kicker)}</div><h1>${esc(seg.heading)}</h1>
  <div class="cap">${esc(cue.text)}</div>
  <div class="prog"><i style="width:${(((si + 1) / total) * 100).toFixed(1)}%"></i></div>
  <div class="foot">Eyes Up · a Lens for Snap Spectacles<br>Sounds synthesized locally</div></div>`;
}

function cardHtml(seg, ci, cue) {
  const cap = `<div class="capbar">${esc(cue.text)}</div>`;
  const top = `<div class="cfoot"><span>Eyes Up · a Lens for Snap Spectacles</span><span>Learn AR with SPECS</span></div>`;
  if (seg.card === 'hook') {
    return `<div class="card">${top}
    <div style="position:absolute;left:160px;right:160px;top:200px">
      <div class="kick">The problem</div>
      <div style="font-size:84px;font-weight:800;line-height:1.05;margin-top:22px;letter-spacing:-.02em">Rehearse at a laptop,<br>and your eyes learn to look <span style="color:var(--primary)">down</span>.</div>
      <div style="display:flex;gap:24px;margin-top:56px">
        <div style="background:#fff;border-radius:16px;padding:26px 30px;font-size:30px;font-weight:600;width:620px;opacity:${ci >= 0 ? 1 : 0.35}">Notes on a screen pull your gaze down</div>
        <div style="background:#fff;border-radius:16px;padding:26px 30px;font-size:30px;font-weight:600;width:620px;opacity:${ci >= 1 ? 1 : 0.35}">On stage you lock onto one side of the room</div>
      </div></div>${cap}</div>`;
  }
  if (seg.card === 'title') {
    const chips = ['Students', 'Founders', 'Second-language speakers'];
    return `<div class="card">${top}
    <div style="position:absolute;left:160px;right:160px;top:210px">
      <div class="kick">A rehearsal coach for Snap Spectacles</div>
      <div style="font-size:150px;font-weight:800;letter-spacing:-.03em;line-height:1;margin-top:20px">Eyes Up</div>
      <div style="font-size:46px;font-weight:600;color:var(--muted);margin-top:22px">Rehearse with your eyes on the room.</div>
      <div style="display:flex;gap:14px;margin-top:44px;opacity:${ci >= 2 ? 1 : 0}">${chips
        .map((c) => `<span style="background:#fff;color:var(--primary-ink);border-radius:999px;padding:14px 26px;font-size:28px;font-weight:700">${c}</span>`)
        .join('')}</div>
    </div>${cap}</div>`;
  }
  if (seg.card === 'built') {
    const rows = LEAF_ROWS.map(
      ([id, what]) =>
        `<tr><td style="font-family:ui-monospace,Menlo,monospace;font-size:21px;padding:9px 14px">${id}</td><td style="font-size:20px;color:var(--muted);padding:9px 14px">${esc(what)}</td><td style="font-size:20px;font-weight:800;color:var(--ok);padding:9px 14px">PASSED</td></tr>`,
    ).join('');
    const box = (o) => `background:#fff;border-radius:16px;padding:26px 30px;opacity:${o}`;
    return `<div class="card">${top}
    <div style="position:absolute;left:64px;right:64px;top:96px">
      <div class="kick">How it was built</div>
      <div style="font-size:52px;font-weight:800;margin-top:10px;letter-spacing:-.01em">Lens Studio + MCP tools + CLAD skills, checked by tests</div>
      <div style="display:grid;grid-template-columns:520px 1fr;gap:24px;margin-top:28px">
        <div style="display:flex;flex-direction:column;gap:24px">
          <div style="${box(1)}"><div style="font-size:26px;font-weight:800">Lens Studio MCP tools</div>
            <div style="font-size:20px;line-height:1.5;color:var(--muted);margin-top:8px">VirtualScene, ExecuteEditorCode, PreviewPanelTool, MovePreviewCamera, PreviewInteractTool, CapturePanelScreenshotTool, RunAndCollectLogsTool, run_leaf_scenario …</div></div>
          <div style="${box(1)}"><div style="font-size:26px;font-weight:800">CLAD skills followed</div>
            <div style="font-size:20px;line-height:1.5;color:var(--muted);margin-top:8px">specs-experience-builder, specs-build-ui, build-sfx, specs-audio, specs-leaf-write-scenarios, specs-leaf-run-in-preview, verify-preview</div></div>
          <div style="${box(ci >= 2 ? 1 : 0.35)}"><div style="font-size:54px;font-weight:800;color:var(--primary-ink);line-height:1">129 / 129</div>
            <div style="font-size:22px;color:var(--muted);margin-top:8px">Node unit + integration tests (vitest) for the core rehearsal logic</div></div>
        </div>
        <div style="${box(ci >= 1 ? 1 : 0.35)}">
          <div style="font-size:26px;font-weight:800">LEAF scenarios · Interactive Preview · 7 / 7</div>
          <table style="border-collapse:collapse;margin-top:10px;width:100%">${rows}</table>
          <div style="margin-top:14px;display:flex;align-items:center;gap:16px">
            <div style="width:400px;height:40px;border-radius:8px;background-color:#6b665f;background-image:url('${fileUrl('devpost/screenshots/02-audience-lit-halo.png')}');background-size:${475 * 1.4}px ${1400 * 1.4}px;background-position:${-6 * 1.4}px ${-430 * 1.4}px"></div>
            <span style="font-size:18px;color:var(--muted)">LEAF result overlay in the preview (editor capture)</span></div>
        </div>
      </div></div>${cap}</div>`;
  }
  // close
  return `<div class="card">${top}
  <div style="position:absolute;left:160px;right:160px;top:170px">
    <div style="font-size:120px;font-weight:800;letter-spacing:-.03em;line-height:1">Eyes Up</div>
    <div style="font-size:42px;font-weight:600;color:var(--muted);margin-top:16px">Rehearse with your eyes on the room.</div>
    <div style="font-size:40px;font-weight:700;color:var(--primary-ink);margin-top:40px;font-family:ui-monospace,Menlo,monospace">github.com/sh0sub/eyes-up</div>
    <div style="display:flex;gap:20px;margin-top:44px">
      <div style="background:#fff;border-radius:16px;padding:22px 26px;font-size:24px;line-height:1.45;width:560px"><b>Shown:</b> Lens Studio Interactive Preview, no device. Sounds synthesized locally.</div>
      <div style="background:#fff;border-radius:16px;padding:22px 26px;font-size:24px;line-height:1.45;width:560px;opacity:${ci >= 1 ? 1 : 0.35}"><b>Not yet tested:</b> spatial audio direction, feel and legibility on real glasses.</div>
    </div></div>${cap}</div>`;
}

async function launchChrome() {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = path.join(WORK, 'chrome-profile');
  rmSync(profile, { recursive: true, force: true });
  const proc = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--allow-file-access-from-files', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
  let wsUrl;
  for (let i = 0; i < 100 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    if (!wsUrl) await sleep(200);
  }
  if (!wsUrl) throw new Error('Chrome did not start');
  const sock = new WebSocket(wsUrl);
  await new Promise((r, j) => ((sock.onopen = r), (sock.onerror = j)));
  let id = 0;
  const pending = new Map();
  sock.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      const { res, rej } = pending.get(d.id);
      pending.delete(d.id);
      if (d.error) rej(new Error(d.error.message));
      else res(d.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      sock.send(JSON.stringify({ id: i, method, params }));
    });
  return { send, close: () => proc.kill('SIGKILL') };
}

async function renderStage(cdp) {
  const dir = path.join(WORK, 'stage');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  for (const [si, seg] of SEGMENTS.entries()) {
    seg.stage = [];
    for (const [ci, cue] of seg.cues.entries()) {
      const body = seg.type === 'card' ? cardHtml(seg, ci, cue) : mediaHtml(seg, si, ci, cue);
      const html = path.join(dir, `${seg.id}-${ci}.html`);
      const png = path.join(dir, `${seg.id}-${ci}.png`);
      writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`);
      await cdp.send('Page.navigate', { url: `file://${html}` });
      await sleep(450);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(png, Buffer.from(shot.data, 'base64'));
      seg.stage.push(png);
    }
  }
  log(`graphics: ${SEGMENTS.reduce((n, s) => n + s.stage.length, 0)} PNGs`);
}

/* ── 4. encode ────────────────────────────────────────────────────────────── */
function concatList(file, items, total) {
  const lines = [];
  items.forEach((it, i) => {
    const end = i + 1 < items.length ? items[i + 1].start : total;
    if (end - it.start > 0) lines.push(`file '${it.file}'`, `duration ${(end - it.start).toFixed(4)}`);
  });
  lines.push(`file '${items.at(-1).file}'`);
  writeFileSync(file, lines.join('\n'));
}

function encode() {
  const dir = path.join(WORK, 'segments');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const outs = [];
  for (const seg of SEGMENTS) {
    const dur = seg.duration;
    const stageList = path.join(dir, `${seg.id}-stage.txt`);
    concatList(stageList, seg.stage.map((f, i) => ({ file: f, start: i === 0 ? 0 : seg.cues[i].start - 0.15 })), dur);
    const out = path.join(dir, `${seg.id}.mp4`);
    const enc = ['-t', dur.toFixed(3), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', out];
    if (seg.live) {
      const ticks = [];
      let j = 0, cur = seg.live.frames[0];
      for (let i = 0; i < Math.round(dur * FPS); i++) {
        const t = i / FPS;
        while (j < seg.live.frames.length && seg.live.frames[j].v <= t) cur = seg.live.frames[j++];
        if (!ticks.length || ticks.at(-1).file !== cur.file) ticks.push({ file: cur.file, start: t });
      }
      const footList = path.join(dir, `${seg.id}-footage.txt`);
      concatList(footList, ticks, dur);
      const filter = [
        `color=c=0x151a26:s=${W}x${H}:r=${FPS}:d=${dur.toFixed(3)}[base]`,
        `[1:v]crop=${CROP.w}:${CROP.h}:${CROP.x}:${CROP.y},scale=${MB.w}:${MB.h}:flags=lanczos,setsar=1,fps=${FPS}[scr]`,
        `[base][scr]overlay=${MB.x}:${MB.y}:eof_action=repeat[b1]`,
        `[0:v]format=rgba,fps=${FPS}[stage]`,
        `[b1][stage]overlay=0:0:eof_action=repeat,format=yuv420p[v]`,
        `[2:a]apad[a]`,
      ].join(';');
      run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', stageList, '-f', 'concat', '-safe', '0', '-i', footList, '-i', seg.audio, '-filter_complex', filter, '-map', '[v]', '-map', '[a]', ...enc]);
    } else {
      const filter = [`[0:v]fps=${FPS},format=yuv420p[v]`, `[1:a]apad[a]`].join(';');
      run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', stageList, '-i', seg.audio, '-filter_complex', filter, '-map', '[v]', '-map', '[a]', ...enc]);
    }
    seg.encoded = probe(out);
    outs.push(out);
    log(`encoded ${seg.id} (${seg.encoded.toFixed(2)}s, ${seg.live ? 'live footage' : seg.type === 'card' ? 'card' : 'stills'})`);
  }
  mkdirSync(path.dirname(OUT), { recursive: true });
  const list = path.join(dir, 'all.txt');
  writeFileSync(list, outs.map((o) => `file '${o}'`).join('\n'));
  run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', OUT]);
  return probe(OUT);
}

function gallery() {
  // segments with a `gallery` time (seconds into the segment) become 1920x1080 stills
  const pick = SEGMENTS.filter((s) => s.gallery !== undefined).map((s) => s.id);
  rmSync(GALLERY, { recursive: true, force: true });
  mkdirSync(GALLERY, { recursive: true });
  let t = 0;
  const starts = Object.fromEntries(SEGMENTS.map((s) => [s.id, ((t += s.encoded), t - s.encoded)]));
  pick.forEach((id, i) => {
    const seg = SEGMENTS.find((s) => s.id === id);
    const at = starts[id] + (seg.gallery ?? seg.cues.at(-1).start + 0.5);
    run(FFMPEG, ['-y', '-v', 'error', '-ss', at.toFixed(2), '-i', OUT, '-frames:v', '1', path.join(GALLERY, `${String(i + 1).padStart(2, '0')}-${id.slice(3)}.png`)]);
  });
  log(`gallery stills: ${GALLERY}`);
}

/* ── main ─────────────────────────────────────────────────────────────────── */
let chrome;
try {
  mkdirSync(WORK, { recursive: true });
  log(`voice=${VOICE} rate=${RATE} footage=${FOOTAGE ?? '(none)'} out=${OUT}`);
  buildAudio();
  const foot = loadFootage();
  for (const seg of SEGMENTS) {
    if (seg.type !== 'media') continue;
    seg.live = pickFootage(foot, seg);
    if (seg.live && seg.live.length > seg.duration) seg.duration = seg.live.length; // narration padded with silence
  }
  chrome = await launchChrome();
  await renderStage(chrome);
  chrome.close();
  const total = encode();
  gallery();
  const summary = {
    out: OUT,
    totalSeconds: Number(total.toFixed(2)),
    footage: FOOTAGE ? { dir: FOOTAGE, frames: foot.frames.length, distinct: foot.unique } : null,
    segments: SEGMENTS.map((s) => ({ id: s.id, seconds: Number(s.encoded.toFixed(2)), visual: s.live ? 'live' : s.type === 'card' ? 'card' : 'stills' })),
  };
  writeFileSync(path.join(WORK, 'summary.json'), JSON.stringify(summary, null, 2));
  log(`done: ${OUT} (${total.toFixed(2)}s)`);
} catch (e) {
  chrome?.close();
  console.error('[video] FAILED:', e.message);
  process.exit(1);
}
