/**
 * BodyFade.ts — the soft lower edge of each silhouette and its floor shadow (Cycle 6, D2).
 *
 * At the canonical pose the preview frame ends about 57 cm above the members' feet, so a plain box silhouette was cut off by the frame
 * as a hard edge. The body's alpha now ramps to zero over its lower part (a 1 x N alpha texture on the body mesh, whose v runs 0 at the
 * feet to 1 at the shoulders), and a soft elliptical shadow sits under every member. Pure maths, no Lens Studio dependency.
 */
import { clamp01 } from './math';

/** Height of the silhouette box above the feet (cm): matches AudienceRig's BODY_REST_H. */
export const BODY_HEIGHT_CM = 140;
/** Alpha is 0 at and below this height above the feet (cm): just above the bottom of the preview frame at the squashed (slumped) pose. */
export const FADE_END_CM = 66;
/** Alpha is 1 at and above this height (cm). */
export const FADE_START_CM = 98;
/** Rows of the fade texture. */
export const FADE_ROWS = 64;

/** Alpha 0..1 of the body at `heightCm` above the feet (smoothstep ramp). */
export function bodyFadeAlpha(heightCm: number): number {
  const t = clamp01((heightCm - FADE_END_CM) / (FADE_START_CM - FADE_END_CM));
  return t * t * (3 - 2 * t);
}

/**
 * Round 3: vertical tint gradient. Above the fade-out the body keeps fading gently with height: full strength at the shoulders (the top of the
 * mesh), `GRADIENT_LOW` of it at FADE_START_CM, so the torso reads as a rounded, lit-from-above volume instead of one flat tint.
 */
export const GRADIENT_LOW = 0.5;
export function bodyGradient(heightCm: number): number {
  const t = clamp01((heightCm - FADE_START_CM) / (BODY_HEIGHT_CM - FADE_START_CM));
  return GRADIENT_LOW + (1 - GRADIENT_LOW) * t;
}

/** RGBA bytes of a `width` x FADE_ROWS texture whose row 0 is the feet: white, with `bodyFadeAlpha` as alpha (`plain`: opaque everywhere, for the head). */
export function bodyFadePixels(width = 2, plain = false): Uint8Array {
  const data = new Uint8Array(width * FADE_ROWS * 4);
  for (let r = 0; r < FADE_ROWS; r++) {
    const a = plain ? 255 : Math.round(255 * bodyFadeAlpha((BODY_HEIGHT_CM * r) / (FADE_ROWS - 1)) * bodyGradient((BODY_HEIGHT_CM * r) / (FADE_ROWS - 1)));
    for (let x = 0; x < width; x++) data.set([255, 255, 255, a], (r * width + x) * 4);
  }
  return data;
}

/**
 * Soft elliptical floor shadow: nested ellipses, widest and faintest first; each is a stack of horizontal bars
 * (`halfWidth` at the middle of the stack, narrower toward the ends) so it needs only quads. Sizes in cm.
 */
export interface ShadowLayer {
  halfW: number;
  halfH: number;
  alpha: number;
}
export const SHADOW_LAYERS: readonly ShadowLayer[] = [
  { halfW: 42, halfH: 7, alpha: 0.1 },
  { halfW: 33, halfH: 5.4, alpha: 0.12 },
  { halfW: 23, halfH: 3.8, alpha: 0.14 },
];
export const SHADOW_BARS = 7;

/** Bars of one layer: centre y offset, bar height and bar width (cm) for each of `SHADOW_BARS` slices of the ellipse. */
export function shadowBars(layer: ShadowLayer, bars = SHADOW_BARS): { y: number; h: number; w: number }[] {
  const h = (2 * layer.halfH) / bars;
  const out: { y: number; h: number; w: number }[] = [];
  for (let i = 0; i < bars; i++) {
    const y = -layer.halfH + h * (i + 0.5);
    const t = y / layer.halfH;
    out.push({ y, h, w: 2 * layer.halfW * Math.sqrt(Math.max(0, 1 - t * t)) });
  }
  return out;
}

/**
 * Perspective cap for the slumped head. The head creeps toward the speaker (local +z, `forwardCm`), which is toward the viewer, so it would
 * draw larger than the upright head. Scaling by (distance - forward) / distance keeps its apparent size at the lit head's (1 at most).
 */
export function headDepthScale(forwardCm: number, distanceCm: number): number {
  return Math.min(1, Math.max(0.5, (distanceCm - Math.max(0, forwardCm)) / distanceCm));
}
