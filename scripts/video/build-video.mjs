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
    const leadS = seg.lead ?? LEAD, gapS = seg.gap ?? GAP, tailS = seg.tail ?? TAIL;
    let t = leadS;
    const lead = path.join(dir, `${seg.id}-lead.wav`);
    silence(leadS, lead);
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
        silence(gapS, g);
        parts.push(g);
        t += gapS;
      }
    });
    const tail = path.join(dir, `${seg.id}-tail.wav`);
    silence(tailS, tail);
    parts.push(tail);
    const list = path.join(dir, `${seg.id}-list.txt`);
    writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
    seg.audio = path.join(dir, `${seg.id}.wav`);
    run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'pcm_s16le', seg.audio]);
    seg.cues = cues;
    seg.duration = Math.max(probe(seg.audio), seg.minDuration ?? 0);
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
  const junctions = [];
  let offset = 0;
  for (const clip of seg.footage) {
    const i0 = resolve(foot, clip.from, 'from'), i1 = resolve(foot, clip.to, 'to');
    const fr = i0 >= 0 && i1 > i0 ? foot.frames.slice(i0, i1 + 1) : [];
    const distinct = new Set(fr.map((f) => f.hash)).size;
    if (fr.length < 2 || distinct < 2) {
      log(`  ${seg.id}: clip ${clip.from}–${clip.to} has ${fr.length} frames, ${distinct} distinct → stills`);
      return null;
    }
    if (clip.dissolve && frames.length) {
      // Cross-dissolve: blend the last frame so far into this clip's first frame over `dissolve` seconds.
      const n = Math.round(clip.dissolve * FPS);
      const dir = path.join(WORK, 'dissolve');
      mkdirSync(dir, { recursive: true });
      junctions.push(offset);
      for (let k = 1; k <= n; k++) {
        const a = k / (n + 1);
        const out = path.join(dir, `${seg.id}-${junctions.length - 1}-${String(k).padStart(2, '0')}.jpg`);
        run(FFMPEG, ['-y', '-v', 'error', '-i', frames.at(-1).file, '-i', fr[0].file, '-filter_complex', `[0][1]blend=all_expr='A*(1-${a.toFixed(4)})+B*${a.toFixed(4)}'`, '-frames:v', '1', '-q:v', '2', out]);
        frames.push({ file: out, v: offset + (k - 1) / FPS });
      }
      offset += n / FPS;
    }
    for (const f of fr) frames.push({ file: f.file, v: offset + (f.ms - fr[0].ms) / 1000 / speed });
    const step = (fr.at(-1).ms - fr[0].ms) / (fr.length - 1);
    offset += (fr.at(-1).ms - fr[0].ms + step) / 1000 / speed;
    log(`  ${seg.id}: clip ${path.basename(fr[0].file)}–${path.basename(fr.at(-1).file)} (${((fr.at(-1).ms - fr[0].ms) / 1000).toFixed(1)}s)`);
  }
  return { speed, frames, length: offset, junctions };
}

/* ── zoom keyframes ───────────────────────────────────────────────────────── */
// Keys [t, zoom, cx, cy]; t is seconds or 'cN+s' / 'cN-s' (s after/before narration line N starts). Returns numeric times.
function resolveKeys(seg, keys) {
  const out = keys.map(([t, ...r]) => {
    const m = typeof t === 'string' && /^([cj])(\d+)([+-])([\d.]+)$/.exec(t);
    const base = m ? (m[1] === 'c' ? seg.cues[Number(m[2])].start : seg.live.junctions[Number(m[2])]) : 0;
    return [m ? base + (m[3] === '-' ? -1 : 1) * Number(m[4]) : t, ...r];
  });
  out.forEach((k, i) => {
    if (i && !(k[0] > out[i - 1][0])) throw new Error(`${seg.id}: zoom key times must increase (${k[0]})`);
  });
  return out;
}
const lerpKeys = (keys, idx) => {
  const f = (i) => (i === keys.length - 1 ? `${keys[i][idx]}` : `if(lt(t,${keys[i + 1][0].toFixed(3)}),${keys[i][idx]}+(${keys[i + 1][idx]}-${keys[i][idx]})*(t-${keys[i][0].toFixed(3)})/${(keys[i + 1][0] - keys[i][0]).toFixed(3)},${f(i + 1)})`);
  return f(0);
};
const keyAt = (keys, t, idx) => {
  if (t <= keys[0][0]) return keys[0][idx];
  for (let i = 0; i + 1 < keys.length; i++) if (t < keys[i + 1][0]) return keys[i][idx] + ((keys[i + 1][idx] - keys[i][idx]) * (t - keys[i][0])) / (keys[i + 1][0] - keys[i][0]);
  return keys.at(-1)[idx];
};
// Zoom/pan on a stream already cropped to the output aspect: scale by Z (per frame), crop around the centre key (source px).
function zoomFilter(inL, keys, srcW, outW, outH, outL) {
  const sc = outW / srcW;
  const Z = lerpKeys(keys, 1);
  return `[${inL}]scale=w='${outW}*(${Z})':h='${outH}*(${Z})':eval=frame:flags=bicubic,crop=${outW}:${outH}:x='clip((${lerpKeys(keys, 2)})*${sc}*(${Z})-${outW / 2},0,${outW}*((${Z})-1))':y='clip((${lerpKeys(keys, 3)})*${sc}*(${Z})-${outH / 2},0,${outH}*((${Z})-1))',setsar=1,fps=${FPS}[${outL}]`;
}

/* ── 3. graphics ──────────────────────────────────────────────────────────── */
const CSS = `
:root{--canvas:#eef2ff;--panel:#ffffff;--ink:#20232d;--muted:#5e6372;--primary:#3864ed;--primary-ink:#2952d8;--line:#d9def0;--media:#151a26;--amber:#f2a33a;--ok:#1f8a5b}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:transparent;font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;background:var(--canvas)}
.hole{position:absolute;left:${MB.x}px;top:${MB.y}px;width:${MB.w}px;height:${MB.h}px;border-radius:16px;box-shadow:0 0 0 3000px var(--canvas)}
.box{position:absolute;left:${MB.x}px;top:${MB.y}px;width:${MB.w}px;height:${MB.h}px;border-radius:16px;overflow:hidden;background:var(--media)}
.img{position:absolute;background-repeat:no-repeat}
.chip{position:absolute;left:${MB.x}px;top:${MB.y - 50}px;background:#20232d;color:#fff;border-radius:9px;padding:8px 14px;font-size:21px;font-weight:600;letter-spacing:.01em;z-index:5}
.chip b{color:#9fb6ff;font-weight:700;margin-right:8px}
.note{position:absolute;left:${MB.x}px;top:${MB.y + MB.h + 14}px;color:var(--muted);font-size:21px;z-index:5}
.mark{position:absolute;border:3px solid var(--amber);border-radius:6px;box-shadow:0 0 0 2px rgba(0,0,0,.35)}
.inset{position:absolute;border:3px solid var(--amber);border-radius:12px;overflow:hidden;background:#000;box-shadow:0 12px 40px rgba(0,0,0,.45)}
.inset-label{position:absolute;color:#fff;font-size:22px;font-weight:700}
.col{position:absolute;left:${COL_X}px;right:64px;top:${MB.y}px;bottom:${H - MB.y - MB.h}px;display:flex;flex-direction:column}
.kick{font-size:20px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--primary-ink)}
.col h1{margin:14px 0 0;font-size:44px;line-height:1.1;font-weight:800;letter-spacing:-.01em}
.cap{margin-top:auto;margin-bottom:auto;font-size:34px;line-height:1.34;font-weight:600;border-left:5px solid var(--primary);padding-left:20px}
.lower{position:absolute;left:48px;top:112px;background:rgba(32,35,45,.92);color:#fff;border-left:8px solid var(--primary);border-radius:6px 14px 14px 6px;padding:16px 28px;font-size:38px;font-weight:700;letter-spacing:-.005em;z-index:6}
.lower i{font-style:normal;color:#9fb6ff}
.prog{height:6px;border-radius:3px;background:var(--line)}.prog i{display:block;height:6px;border-radius:3px;background:var(--primary)}
.foot{margin-top:14px;font-size:21px;line-height:1.35;color:var(--muted)}
.card{position:absolute;inset:0;background:var(--canvas)}
.capbar{position:absolute;left:50%;transform:translateX(-50%);bottom:56px;max-width:1500px;background:var(--panel);border-radius:16px;padding:22px 34px;font-size:32px;line-height:1.36;font-weight:600;text-align:center;box-shadow:0 1px 0 var(--line)}
.cfoot{position:absolute;left:64px;right:64px;top:40px;display:flex;justify-content:space-between;font-size:21px;color:var(--muted)}
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
  if (seg.pan) {
    const { base, keys } = seg.pan;
    const sc = MB.w / base[2];
    const callouts = (seg.pan.callouts ?? [])
      .filter((c) => c.cue === ci)
      .map(({ rect: [x, y, w, h], label }) => {
        const t = cue.start + 0.6;
        const Z = keyAt(keys, t, 1), cx = keyAt(keys, t, 2), cy = keyAt(keys, t, 3);
        const vx = Math.min(Math.max(cx * sc * Z - MB.w / 2, 0), MB.w * (Z - 1));
        const vy = Math.min(Math.max(cy * sc * Z - MB.h / 2, 0), MB.h * (Z - 1));
        const sx = MB.x + (x - base[0]) * sc * Z - vx, sy = MB.y + (y - base[1]) * sc * Z - vy;
        const sw = w * sc * Z, sh = h * sc * Z;
        // Label (28 px) above the red block with an arrow pointing down onto it.
        const lx = Math.max(sx + 90, MB.x + 12), ly = Math.max(sy - 235, MB.y + 12);
        const ax = lx + 58, ay0 = ly + 58, ay1 = sy - 10;
        return `<div class="mark" style="border-style:dashed;border-color:#ff5d4d;left:${sx - 6}px;top:${sy - 6}px;width:${sw + 6}px;height:${sh + 6}px"></div><div style="position:absolute;left:${lx}px;top:${ly}px;background:#fff;color:#20232d;border:3px solid #ff5d4d;border-radius:10px;padding:8px 16px;font-size:28px;font-weight:800;z-index:6">${esc(label)}</div><div style="position:absolute;left:${ax - 6}px;top:${ay0}px;width:12px;height:${Math.max(ay1 - ay0 - 28, 10)}px;background:#ff5d4d;z-index:6"></div><div style="position:absolute;left:${ax - 22}px;top:${ay1 - 30}px;width:0;height:0;border-left:22px solid transparent;border-right:22px solid transparent;border-top:32px solid #ff5d4d;z-index:6"></div>`;
      })
      .join('');
    media = `<div class="hole"></div>${callouts}<div class="chip"><b>STILL</b>preview capture · slow zoom</div><div class="note">Scripted 45 s run, shown as a still</div>`;
  } else if (seg.live) {
    const sc = MB.w / CROP.w;
    const marks = (seg.marks ?? [])
      .map(({ rect: [x, y, w, h], label }) => `<div class="mark" style="border-style:dashed;left:${MB.x + x * sc}px;top:${MB.y + y * sc}px;width:${w * sc}px;height:${h * sc}px"></div><div class="inset-label" style="left:${MB.x + x * sc}px;top:${MB.y + y * sc - 36}px;text-shadow:0 1px 3px rgba(0,0,0,.8)">${esc(label)}</div>`)
      .join('');
    media = `<div class="hole"></div>${marks}<div class="chip"><b>PREVIEW</b>${seg.live.speed > 1.01 ? `×${seg.live.speed.toFixed(2).replace(/0$/, '')} speed` : 'live'}${seg.zoom ? ' · zoomed' : ''}</div>`;
  } else {
    const st = seg.stills[Math.min(ci, seg.stills.length - 1)];
    media = `<div class="bg"></div>${stillHtml(st, 'preview capture')}`;
  }
  return `${media}
  <div class="col"><div class="kick">${esc(seg.kicker)}</div><h1>${esc(seg.heading)}</h1>
  <div class="cap">${esc(cue.text)}</div>
  <div class="prog"><i style="width:${(((si + 1) / total) * 100).toFixed(1)}%"></i></div>
  <div class="foot">Eyes Up · a Lens for Snap Spectacles</div></div>`;
}

const disclosureHtml = () => `<div class="chip" style="left:50%;transform:translateX(-50%);top:36px;background:#fff;color:#20232d;font-size:28px;padding:10px 22px;white-space:nowrap;z-index:7"><b style="color:var(--primary-ink)">PREVIEW</b> - test harness turns the head</div>`;

function coldHtml(seg, cue, st = {}) {
  const speed = seg.live?.speed > 1.01 ? ` · ×${seg.live.speed.toFixed(2).replace(/0$/, '')} speed` : '';
  const lower = st.lower && seg.lowerThird ? `<div class="lower"><span>${esc(seg.lowerThird.split(' - ')[0])}</span> <i>-</i> ${esc(seg.lowerThird.split(' - ')[1])}</div>` : '';
  // The disclosure is shown once, in the first 2 s (see disclosureHtml); afterwards only the persistent PREVIEW pill stays.
  const disclosure = st.disclosure ? disclosureHtml() : '';
  const chip = st.chip ? `<div style="position:absolute;left:50%;transform:translateX(-50%);top:34px;background:#20232d;color:#fff;border-radius:18px;padding:16px 38px;font-size:54px;font-weight:800;letter-spacing:-.01em;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:6">${esc(st.chip)}</div>` : '';
  const tag = st.tag ? `<div style="position:absolute;left:1160px;top:470px;background:var(--primary);color:#fff;border-radius:16px;padding:18px 30px;font-size:46px;font-weight:800;letter-spacing:-.005em;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:6">${esc(st.tag)}</div>` : '';
  const pill = `<div class="chip" style="left:48px;top:40px;font-size:24px"><b>PREVIEW</b>live${speed}</div>`;
  if (seg.hero) {
    return `${pill}<div style="position:absolute;left:50%;transform:translateX(-50%);bottom:48px;background:rgba(32,35,45,.9);color:#fff;border-radius:24px;padding:22px 64px;text-align:center;white-space:nowrap"><div style="font-size:92px;font-weight:800;letter-spacing:-.03em;line-height:1">Eyes Up</div><div style="font-size:46px;font-weight:600;margin-top:14px;color:#cfdcff">Rehearse with your eyes on the room.</div><div style="font-size:34px;font-weight:600;margin-top:18px;padding-top:16px;border-top:2px solid rgba(255,255,255,.25);color:#fff">github.com/sh0sub/eyes-up <span style="color:#9fb6ff">&nbsp;·&nbsp;</span> Preview only, LEAF 10/10</div></div>`;
  }
  return `${pill}${disclosure}${chip}${lower}${tag}
  <div class="capbar" style="font-size:40px;padding:22px 40px;width:max-content">${esc(cue.text)}</div>`;
}


// Background-image crop: shows the [x, y, w, h] part of a local image in a box of width dw.
function cropBox(file, [x, y, w, h], dw, extra = '') {
  const { w: iw, h: ih } = pngSize(path.resolve(ROOT, file));
  const sc = dw / w;
  return `<div style="position:relative;width:${dw}px;height:${Math.round(h * sc)}px;border-radius:14px;overflow:hidden;background-image:url('${fileUrl(file)}');background-repeat:no-repeat;background-size:${iw * sc}px ${ih * sc}px;background-position:${-x * sc}px ${-y * sc}px;${extra}"></div>`;
}

// Opening card: hero cyan-halo frame with the title, then a drawn (own illustration) laptop + down arrow.
function openHtml(seg, cap0, top, st) {
  const cap = cap0.replace('class="capbar"', 'class="capbar" style="width:max-content"');
  if (st.stage === 'drawn') {
    return `<div class="card">${top}
    <svg style="position:absolute;inset:0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(0,-60)"><g fill="#fff" stroke="#20232d" stroke-width="9">
        <ellipse cx="780" cy="230" rx="110" ry="62"/><ellipse cx="1060" cy="230" rx="110" ry="62"/>
      </g>
      <g fill="#20232d"><circle cx="780" cy="258" r="36"/><circle cx="1060" cy="258" r="36"/></g>
      <g fill="#3864ed"><rect x="893" y="330" width="34" height="130" rx="8"/><polygon points="840,450 980,450 910,540"/></g>
      <rect x="610" y="580" width="620" height="330" rx="26" fill="#fff" stroke="#20232d" stroke-width="10"/>
      <rect x="650" y="620" width="260" height="34" rx="8" fill="#3864ed"/>
      <g fill="#d9def0"><rect x="650" y="690" width="520" height="22" rx="8"/><rect x="650" y="736" width="460" height="22" rx="8"/><rect x="650" y="782" width="500" height="22" rx="8"/><rect x="650" y="828" width="380" height="22" rx="8"/></g>
      <path d="M520 930 H1320 L1270 970 H570 Z" fill="#20232d"/>
      <text x="1330" y="720" font-family="-apple-system,Helvetica Neue,Arial,sans-serif" font-size="120" font-weight="800" fill="#20232d" letter-spacing="-2">Eyes</text>
      <text x="1330" y="850" font-family="-apple-system,Helvetica Neue,Arial,sans-serif" font-size="120" font-weight="800" fill="#3864ed" letter-spacing="-2">drop</text>
    </g></svg>${cap}</div>`;
  }
  const hero = 'devpost/screenshots/archive/08-halo-cyan.png';
  const sc = W / 1024;
  return `<div class="card" style="background-image:url('${fileUrl(hero)}');background-repeat:no-repeat;background-size:${W}px ${Math.round(713 * sc)}px;background-position:0 ${-50 * sc}px"></div>
  ${st.disclosure ? disclosureHtml() : ''}
  <div style="position:absolute;left:50%;transform:translateX(-50%);top:130px;background:rgba(32,35,45,.9);color:#fff;border-radius:24px;padding:20px 64px 26px;text-align:center;white-space:nowrap"><div style="font-size:40px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#9fb6ff">Eyes Up</div><div style="font-size:104px;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin-top:6px">Rehearse with your eyes <span style="color:#6fe3ff">UP</span></div></div>
  ${cap}`;
}

// Pairs card: overview of three before/after pairs, one focus view each, then the real Summary still with Again highlighted.
function pairsHtml(seg, ci, cap0, top) {
  const cap = cap0.replace('class="capbar"', 'class="capbar" style="width:max-content"');
  const tagChip = (t, n) => `<div style="position:absolute;left:96px;top:92px;font-size:34px;font-weight:800;color:var(--primary-ink);letter-spacing:.04em;text-transform:uppercase">${n} of 3 · ${esc(t)}</div>`;
  const duo = (p, h) => {
    const bw = Math.round((h * p.before.crop[2]) / p.before.crop[3]);
    const aw = Math.round((h * p.after.crop[2]) / p.after.crop[3]);
    const side = (b, w, lab, hot) => `<div style="position:relative">${cropBox(b.file, b.crop, w, hot ? 'box-shadow:0 0 0 6px var(--primary)' : '')}<div style="position:absolute;left:12px;bottom:12px;background:#20232d;color:#fff;border-radius:8px;padding:6px 14px;font-size:${Math.max(22, Math.round(h / 14))}px;font-weight:700">${esc(lab)}</div></div>`;
    return `<div style="display:flex;gap:36px;align-items:center">${side(p.before, bw, p.before.label)}<div style="font-size:${Math.round(h / 5)}px;color:var(--primary);font-weight:800">→</div>${side(p.after, aw, p.after.label, true)}</div>`;
  };
  if (ci === 0) {
    const w = 560;
    const item = (p) => (p.file ? cropBox(p.file, p.crop, w) : `<div style="width:${w}px;height:300px;display:flex;align-items:center;justify-content:center">${duo(p, 190)}</div>`);
    return `<div class="card">${top}
    <div style="position:absolute;left:0;right:0;top:150px;text-align:center;font-size:96px;font-weight:800;letter-spacing:-.025em">Three things glasses taught us</div>
    <div style="position:absolute;left:80px;right:80px;top:450px;display:flex;justify-content:space-between;align-items:flex-start">${seg.pairs.map((p) => `<div><div style="font-size:30px;font-weight:800;color:var(--primary-ink);margin-bottom:14px;text-transform:uppercase;letter-spacing:.05em">${esc(p.tag)}</div>${item(p)}</div>`).join('')}</div>${cap}</div>`;
  }
  if (ci <= 3) {
    const p = seg.pairs[ci - 1];
    const body = p.file ? cropBox(p.file, p.crop, 1180, 'box-shadow:0 8px 30px rgba(32,35,45,.18)') : duo(p, 560);
    return `<div class="card">${top}${tagChip(p.tag, ci)}<div style="position:absolute;left:0;right:0;top:170px;display:flex;justify-content:center">${body}</div>${cap}</div>`;
  }
  const { file, crop, again } = seg.summary;
  const dw = 700, sc = dw / crop[2];
  const [ax, ay, aw, ah] = again;
  const bx = (ax - crop[0]) * sc, by = (ay - crop[1]) * sc;
  return `<div class="card">${top}
  <div style="position:absolute;left:50%;top:84px;transform:translateX(-50%);width:${dw}px">${cropBox(file, crop, dw, 'box-shadow:0 8px 30px rgba(32,35,45,.18)')}
    <div style="position:absolute;left:${bx - 8}px;top:${by - 8}px;width:${aw * sc + 16}px;height:${ah * sc + 16}px;border:6px solid #ff9f1c;border-radius:12px;box-shadow:0 0 0 4px rgba(255,255,255,.7)"></div>
    <div style="position:absolute;left:${bx}px;top:${by + ah * sc + 32}px;background:#ff9f1c;color:#20232d;border-radius:12px;padding:6px 20px;font-size:32px;font-weight:800;white-space:nowrap">\u2191 Again</div></div></div>${cap}</div>`;
}

function cardHtml(seg, ci, cue, st = {}) {
  const cap = `<div class="capbar">${esc(cue.text)}</div>`;
  const top = `<div class="cfoot"><span>Eyes Up · a Lens for Snap Spectacles</span><span>Learn AR with SPECS</span></div>`;
  if (seg.card === 'open') return openHtml(seg, cap, top, st);
  if (seg.card === 'pairs') return pairsHtml(seg, ci, cap, top);
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
    const on = (cond) => (cond ? 'border:4px solid var(--primary);' : 'border:4px solid transparent;');
    const box = (extra = '') => `background:#fff;border-radius:20px;padding:24px 30px;${extra}`;
    const step = (n, title, sub, hot) => `<div style="${box(on(hot))}flex:1"><div style="display:flex;align-items:center;gap:18px"><span style="width:56px;height:56px;border-radius:50%;background:var(--primary);color:#fff;font-size:34px;font-weight:800;display:flex;align-items:center;justify-content:center">${n}</span><span style="font-size:42px;font-weight:800">${title}</span></div><div style="font-size:26px;line-height:1.4;color:var(--muted);margin-top:12px">${sub}</div></div>`;
    const arrow = '<div style="font-size:54px;color:var(--primary);align-self:center;font-weight:800">\u2192</div>';
    const ids = LEAF_ROWS.map(([id]) => `<span style="font-family:ui-monospace,Menlo,monospace;font-size:21px;color:var(--ink)"><b style="color:var(--ok)">\u2713</b> ${id}</span>`).join('');
    return `<div class="card">${top}
    <div style="position:absolute;left:64px;right:64px;top:84px">
      <div class="kick" style="font-size:24px">How it was built</div>
      <div style="font-size:60px;font-weight:800;margin-top:6px;letter-spacing:-.015em">Built with CLAD and Lens Studio MCP, checked by LEAF</div>
      <div style="display:flex;gap:18px;margin-top:34px">
        ${step(1, 'CLAD', 'Snap skills for Lens building, UI, audio and testing', ci === 0)}${arrow}
        ${step(2, 'Lens Studio MCP', 'Agent edits the scene, runs and captures the Preview', ci === 0)}${arrow}
        ${step(3, 'LEAF', 'Scripted scenarios check the done criteria in the Preview', ci === 1)}
      </div>
      <div style="display:flex;gap:24px;margin-top:34px">
        <div style="${box(on(ci === 1))}flex:1.15;padding:20px 34px"><div style="display:flex;align-items:baseline;gap:22px"><span style="font-size:210px;font-weight:800;color:var(--primary-ink);line-height:1;letter-spacing:-.03em">10/10</span><span style="font-size:36px;font-weight:700;line-height:1.25">LEAF scenarios<br>passed</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-top:12px">${ids}</div></div>
        <div style="${box(on(ci === 2))}flex:1;padding:20px 34px"><div style="display:flex;align-items:baseline;gap:22px"><span style="font-size:210px;font-weight:800;color:var(--primary-ink);line-height:1;letter-spacing:-.03em">164</span><span style="font-size:36px;font-weight:700;line-height:1.25">Node tests<br>passing</span></div>
          <div style="font-size:26px;line-height:1.4;color:var(--muted);margin-top:14px">Unit and integration tests for the core rehearsal logic: gaze, halos, nudges, cue cards.</div></div>
      </div></div>${cap}</div>`;
  }
  // close: both boxes visible from the start
  const cbox = 'background:#fff;border-radius:20px;padding:30px 36px;font-size:36px;line-height:1.4;width:820px';
  return `<div class="card">${top}
  <div style="position:absolute;left:100px;right:100px;top:150px">
    <div style="font-size:130px;font-weight:800;letter-spacing:-.03em;line-height:1">Eyes Up</div>
    <div style="font-size:48px;font-weight:600;color:var(--muted);margin-top:14px">Rehearse with your eyes on the room.</div>
    <div style="font-size:44px;font-weight:700;color:var(--primary-ink);margin-top:36px;font-family:ui-monospace,Menlo,monospace">github.com/sh0sub/eyes-up</div>
    <div style="display:flex;gap:28px;margin-top:44px">
      <div style="${cbox}"><b>Shown:</b> Lens Studio Interactive Preview, no device. A test harness drives the head and pinches. Sounds synthesized locally.</div>
      <div style="${cbox}"><b>Not yet tested:</b> spatial audio direction, and the feel and legibility on real glasses.</div>
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
    // One graphic per caption; cold segments may add timed states (disclosure, caption tag) between captions.
    const shots = seg.cues.map((cue, ci) => ({ ci, cue, start: ci === 0 ? 0 : cue.start - 0.15, st: {} }));
    if ((seg.type === 'cold' || seg.type === 'card') && seg.states) {
      // state times: seconds, 'jN' (Nth dissolve start of the footage) or 'eN' (end of narration line N)
      for (const e of seg.states) if (typeof e.at === 'string') e.at = e.at[0] === 'j' ? seg.live.junctions[Number(e.at.slice(1))] : seg.cues[Number(e.at.slice(1))].end;
      for (const e of seg.states) if (e.at > 0) shots.push({ ci: -1, start: e.at, st: {} });
      shots.sort((a, b) => a.start - b.start);
      shots.forEach((sh, i) => {
        sh.ci = sh.ci >= 0 ? sh.ci : shots[i - 1].ci;
        sh.cue = seg.cues[sh.ci];
        sh.st = [...seg.states].reverse().find((e) => e.at <= sh.start + 1e-6) ?? {};
      });
    }
    for (const [k, { ci, cue, start, st }] of shots.entries()) {
      const body = seg.type === 'card' ? cardHtml(seg, ci, cue, st) : seg.type === 'cold' ? coldHtml(seg, cue, st) : mediaHtml(seg, si, ci, cue);
      const html = path.join(dir, `${seg.id}-${k}.html`);
      const png = path.join(dir, `${seg.id}-${k}.png`);
      writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`);
      await cdp.send('Page.navigate', { url: `file://${html}` });
      await sleep(450);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(png, Buffer.from(shot.data, 'base64'));
      seg.stage.push({ file: png, start });
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
    concatList(stageList, seg.stage, dur);
    const out = path.join(dir, `${seg.id}.mp4`);
    const enc = ['-t', dur.toFixed(3), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', out];
    if (seg.live || seg.pan) {
      let in1;
      if (seg.pan) {
        in1 = ['-loop', '1', '-framerate', String(FPS), '-i', path.resolve(ROOT, seg.pan.file)];
      } else {
        const ticks = [];
        let j = 0, cur = seg.live.frames[0];
        for (let i = 0; i < Math.round(dur * FPS); i++) {
          const t = i / FPS;
          while (j < seg.live.frames.length && seg.live.frames[j].v <= t) cur = seg.live.frames[j++];
          if (!ticks.length || ticks.at(-1).file !== cur.file) ticks.push({ file: cur.file, start: t });
        }
        const footList = path.join(dir, `${seg.id}-footage.txt`);
        concatList(footList, ticks, dur);
        in1 = ['-f', 'concat', '-safe', '0', '-i', footList];
      }
      let screen;
      const overlayBox = (inL) => [`color=c=0x151a26:s=${W}x${H}:r=${FPS}:d=${dur.toFixed(3)}[base]`, `[base][${inL}]overlay=${MB.x}:${MB.y}:eof_action=repeat[b1]`];
      if (seg.type === 'cold') {
        const [cx, cy, cw, ch] = seg.crop;
        if (seg.zoom) {
          screen = [`[1:v]crop=${cw}:${ch}:${cx}:${cy}[c0]`, zoomFilter('c0', resolveKeys(seg, seg.zoom), cw, W, H, 'b1')];
        } else {
          screen = [`[1:v]crop=${cw}:${ch}:${cx}:${cy},scale=${W}:${H}:flags=lanczos,setsar=1,fps=${FPS}[b1]`];
        }
      } else if (seg.pan) {
        const [bx, by, bw, bh] = seg.pan.base;
        screen = [`[1:v]crop=${bw}:${bh}:${bx}:${by}[c0]`, zoomFilter('c0', seg.pan.keys, bw, MB.w, MB.h, 'scr'), ...overlayBox('scr')];
      } else if (seg.zoom) {
        // Keyframes [t, zoom, centre x, centre y] (preview px), linear in between; crop follows the centre.
        screen = [`[1:v]crop=${CROP.w}:${CROP.h}:${CROP.x}:${CROP.y}[c0]`, zoomFilter('c0', seg.zoom, CROP.w, MB.w, MB.h, 'scr'), ...overlayBox('scr')];
      } else {
        screen = [`[1:v]crop=${CROP.w}:${CROP.h}:${CROP.x}:${CROP.y},scale=${MB.w}:${MB.h}:flags=lanczos,setsar=1,fps=${FPS}[scr]`, ...overlayBox('scr')];
      }
      const filter = [
        ...screen,
        `[0:v]format=rgba,fps=${FPS}[stage]`,
        `[b1][stage]overlay=0:0:eof_action=repeat,format=yuv420p[v]`,
        `[2:a]apad[a]`,
      ].join(';');
      run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', stageList, ...in1, '-i', seg.audio, '-filter_complex', filter, '-map', '[v]', '-map', '[a]', ...enc]);
    } else {
      const filter = [`[0:v]fps=${FPS},format=yuv420p[v]`, `[1:a]apad[a]`].join(';');
      run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', stageList, '-i', seg.audio, '-filter_complex', filter, '-map', '[v]', '-map', '[a]', ...enc]);
    }
    seg.encoded = probe(out);
    outs.push(out);
    log(`encoded ${seg.id} (${seg.encoded.toFixed(2)}s, ${seg.live ? 'live footage' : seg.pan ? 'pan' : seg.type === 'card' ? 'card' : 'stills'})`);
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
    if (seg.pan) {
      seg.pan.keys = resolveKeys(seg, seg.pan.keys);
      continue;
    }
    if (seg.type !== 'media' && seg.type !== 'cold') continue;
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
    segments: SEGMENTS.map((s) => ({ id: s.id, seconds: Number(s.encoded.toFixed(2)), visual: s.live ? 'live' : s.pan ? 'pan' : s.type === 'card' ? 'card' : 'stills' })),
  };
  writeFileSync(path.join(WORK, 'summary.json'), JSON.stringify(summary, null, 2));
  log(`done: ${OUT} (${total.toFixed(2)}s)`);
} catch (e) {
  chrome?.close();
  console.error('[video] FAILED:', e.message);
  process.exit(1);
}
