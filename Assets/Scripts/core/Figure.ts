/**
 * Figure.ts — the volumetric audience figure's geometry and colours (redesign, pure maths, no Lens Studio dependency).
 *
 * Each audience member is layered glass: torso with neck and shoulders, an ellipse head, a soft outer glow, inner highlights and a bright
 * rim line, each person in a slightly different luminous hue. Specs is additive, so volume comes from stacked translucent shapes and a rim
 * light, never from dark shading. The per-person "#n NN%" tag colour follows the room meter's tones.
 */
import { clamp01, lerp } from './math';
import { meterTone } from './GameScore';
import type { MeterTone } from './GameScore';

export type Pt = [number, number];
export type Rgb = [number, number, number];
export type Rgba = [number, number, number, number];

/** One saturated luminous hue per seat (cycled), chosen to stay apart from the cyan "lit" colour. */
export const FIGURE_HUES: readonly Rgb[] = [
  [1.0, 0.5, 0.42], // coral
  [0.4, 0.68, 1.0], // sky
  [1.0, 0.82, 0.32], // amber
  [0.7, 0.52, 1.0], // violet
  [0.65, 0.95, 0.4], // lime
  [1.0, 0.5, 0.78], // rose
  [0.42, 0.88, 0.95], // aqua
  [1.0, 0.64, 0.3], // orange
  [0.3, 0.92, 0.72], // mint
];

export function figureHue(i: number): Rgb {
  return FIGURE_HUES[((i % FIGURE_HUES.length) + FIGURE_HUES.length) % FIGURE_HUES.length];
}

/** Height of the figure's body object above the floor (cm): body-local y is height - BODY_ORIGIN_CM. */
export const BODY_ORIGIN_CM = 70;
/** Head ellipse half extents (cm). The rest head centre sits at 153 cm. */
export const HEAD_HALF_W = 10.5;
export const HEAD_HALF_H = 13;

/** Torso profile: (height above the floor, half width) from the top of the neck down to the floor. */
const TORSO_PROFILE: ReadonlyArray<[number, number]> = [
  [144, 6.2],
  [140, 6.8],
  [136, 8.6],
  [133, 12],
  [130, 17],
  [126, 22.5],
  [121, 26.5],
  [114, 28.6],
  [104, 29.4],
  [85, 29],
  [60, 27.5],
  [0, 27.5],
];

/** Closed torso outline in body-local cm, going down the right side then up the left (counter-clockwise from the top is not required). */
export function torsoOutline(): Pt[] {
  const right: Pt[] = TORSO_PROFILE.map(([h, w]) => [w, h - BODY_ORIGIN_CM]);
  const left: Pt[] = TORSO_PROFILE.slice()
    .reverse()
    .map(([h, w]) => [-w, h - BODY_ORIGIN_CM]);
  return [...right, ...left];
}

/** Smooth points of an ellipse (half extents `hw`, `hh`) centred at (cx, cy). */
export function ellipsePts(hw: number, hh: number, n = 40, cx = 0, cy = 0): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n;
    out.push([cx + Math.cos(a) * hw, cy + Math.sin(a) * hh]);
  }
  return out;
}

/** Rounded-rectangle points (width, height, radius) centred at (cx, cy), `seg` steps per corner. */
export function roundedRectPts(w: number, h: number, r: number, cx = 0, cy = 0, seg = 6): Pt[] {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const corners: Array<[number, number, number]> = [
    [w / 2 - rr, h / 2 - rr, 0],
    [-(w / 2 - rr), h / 2 - rr, Math.PI / 2],
    [-(w / 2 - rr), -(h / 2 - rr), Math.PI],
    [w / 2 - rr, -(h / 2 - rr), Math.PI * 1.5],
  ];
  const out: Pt[] = [];
  for (const [ox, oy, a0] of corners) {
    for (let k = 0; k <= seg; k++) {
      const a = a0 + (k / seg) * (Math.PI / 2);
      out.push([cx + ox + Math.cos(a) * rr, cy + oy + Math.sin(a) * rr]);
    }
  }
  return out;
}

export function centroid(pts: readonly Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p[0];
    y += p[1];
  }
  return [x / pts.length, y / pts.length];
}

/** `pts` scaled about `about` by (sx, sy) and then shifted by (dx, dy). */
export function scalePts(pts: readonly Pt[], sx: number, sy: number, about: Pt, dx = 0, dy = 0): Pt[] {
  return pts.map((p) => [about[0] + (p[0] - about[0]) * sx + dx, about[1] + (p[1] - about[1]) * sy + dy]);
}

/** Outward offset (positive `d`) or inset (negative `d`) of a closed polygon along its vertex normals. Meant for the smooth, near-convex shapes used here. */
export function offsetPts(pts: readonly Pt[], d: number): Pt[] {
  const n = pts.length;
  // Orientation sign so "outward" does not depend on winding.
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const s = area >= 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i + n - 1) % n];
    const b = pts[(i + 1) % n];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    // For counter-clockwise polygons the outward normal is (ty, -tx).
    return [p[0] + ((s * ty) / len) * d, p[1] - ((s * tx) / len) * d];
  });
}

export interface FigureColors {
  /** Torso base fill, soft outer glow, inner highlights, arm lines and the bright rim. */
  body: Rgba;
  glow: Rgba;
  highlight: Rgba;
  arms: Rgba;
  rim: Rgba;
  /** Head fill (lighter than the torso), highlight, glow, rim and the two eye dots. */
  head: Rgba;
  headHighlight: Rgba;
  headGlow: Rgba;
  headRim: Rgba;
  eyes: Rgba;
}

const mix3 = (a: Rgb, b: Rgb, k: number): Rgb => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const WHITE: Rgb = [1, 1, 1];
/** A drained member: cool, desaturated periwinkle, clearly the same person but dim. */
const DRAINED: Rgb = [0.5, 0.52, 0.8];
/** A perk-up flashes toward this cyan-white. */
const PERK: Rgb = [0.6, 1.0, 1.0];

/**
 * Colours for one member. `vitality` 0..1 (1 = engaged, 0 = drained), `burst` 0..1 (perk-up flash), `lit` 0..1 (how much the speaker is
 * looking at them: the rim warms to cyan-white), `fade` 0..1 (placing / summary fade).
 */
export function figureColors(hue: Rgb, vitality: number, burst: number, lit: number, fade: number): FigureColors {
  const v = clamp01(vitality);
  const b = clamp01(burst);
  const l = clamp01(lit);
  const f = clamp01(fade);
  const base = mix3(mix3(DRAINED, hue, v), PERK, 0.55 * b);
  const rimRgb = mix3(mix3(base, WHITE, 0.55), [0.7, 1, 1], 0.6 * l);
  const skin = mix3(base, WHITE, 0.45);
  const a = (x: number): number => x * f;
  const bodyA = lerp(0.3, 0.55, v);
  const rimA = lerp(0.5, 1, v);
  return {
    body: [base[0], base[1], base[2], a(bodyA)],
    glow: [rimRgb[0], rimRgb[1], rimRgb[2], a(lerp(0.08, 0.2, v) + 0.16 * l)],
    highlight: [skin[0], skin[1], skin[2], a(lerp(0.12, 0.24, v))],
    arms: [rimRgb[0], rimRgb[1], rimRgb[2], a(lerp(0.2, 0.4, v))],
    rim: [rimRgb[0], rimRgb[1], rimRgb[2], a(rimA)],
    head: [skin[0], skin[1], skin[2], a(lerp(0.42, 0.7, v))],
    headHighlight: [1, 1, 1, a(lerp(0.2, 0.36, v))],
    headGlow: [rimRgb[0], rimRgb[1], rimRgb[2], a(lerp(0.1, 0.22, v) + 0.16 * l)],
    headRim: [rimRgb[0], rimRgb[1], rimRgb[2], a(rimA)],
    eyes: [1, 1, 1, a(lerp(0.55, 0.95, v))],
  };
}

/** The per-person tag: "#2 55%" (seat number is 1-based). */
export function tagText(index: number, engagement: number): string {
  return `#${index + 1} ${Math.round(100 * clamp01(engagement))}%`;
}

export function tagTone(engagement: number): MeterTone {
  return meterTone(clamp01(engagement));
}
