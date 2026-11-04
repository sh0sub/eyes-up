/**
 * AudienceLook.ts — how one silhouette looks for a given engagement (game layer).
 *
 * Engaged: saturated sky blue, upright. Disengaged: head sinks and pitches forward, body
 * squashes a little, colour cools to a dim violet-grey, an amber phone glow switches on at the
 * lap. A perk-up burst (1 → 0) lifts the head, brightens the colour toward cyan and scales the
 * halo for a moment. Sizes are chosen to read at 2.5 m; colours are saturated because the Specs
 * display is additive (black is transparent, grey washes out).
 */
import { clamp01, lerp } from './math';

export type Rgba = [number, number, number, number];

/** Engaged / disengaged body tint. Engaged is a clearly blue, fairly opaque glass (was 0.55,0.68,0.85 @ 0.35). */
export const BODY_ENGAGED: Rgba = [0.2, 0.6, 1.0, 0.72];
export const BODY_DISENGAGED: Rgba = [0.5, 0.32, 0.85, 0.5];
export const BODY_PERK: Rgba = [0.25, 0.9, 1.0, 0.85];
export const PHONE_GLOW: [number, number, number] = [1.0, 0.78, 0.3];

/** Head local y at upright (scene) and the most it sinks, in cm. */
export const HEAD_UP_Y = 153;
export const HEAD_SINK_CM = 22;
export const HEAD_PITCH_DEG = 38;

export interface AudienceLook {
  bodyColor: Rgba;
  headColor: Rgba;
  /** Offset to add to the head's rest y (negative = sinks). */
  headDropCm: number;
  /** Head pitch about X (degrees, positive = chin down). */
  headPitchDeg: number;
  /** Multiplier for the body's scale Y (1 = upright). */
  bodyScaleY: number;
  /** 0..1 phone glow strength (0 = off). */
  phoneGlow: number;
  /** Scale of the Halo ring from the burst (1 = none, peaks at 1.6). */
  haloBurstScale: number;
  /** Halo alpha boost from the burst, 0..1 added to the halo alpha. */
  haloBurstAlpha: number;
}

const mix = (a: Rgba, b: Rgba, k: number): Rgba => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)];

export function audienceLook(engagement: number, burst = 0): AudienceLook {
  const e = clamp01(engagement);
  const b = clamp01(burst);
  const slump = 1 - e;
  const lift = b; // the perk-up straightens and brightens the head
  const base = mix(BODY_DISENGAGED, BODY_ENGAGED, e);
  const body = mix(base, BODY_PERK, 0.7 * lift);
  // The head is a touch brighter and more opaque than the body so it reads as a face-sized dot at 2.5 m.
  const head: Rgba = [Math.min(1, base[0] + 0.1), Math.min(1, base[1] + 0.1), Math.min(1, base[2] + 0.05), Math.min(1, base[3] + 0.15)];
  const headColor = mix(head, BODY_PERK, 0.7 * lift);
  return {
    bodyColor: body,
    headColor,
    headDropCm: -HEAD_SINK_CM * slump * (1 - 0.6 * lift) + 0, // + 0 turns -0 into 0
    headPitchDeg: HEAD_PITCH_DEG * slump * (1 - 0.8 * lift),
    bodyScaleY: 1 - 0.1 * slump,
    phoneGlow: clamp01((0.6 - e) / 0.4),
    haloBurstScale: b > 0 ? 1 + 0.6 * Math.sin(Math.PI * (1 - b)) : 1,
    haloBurstAlpha: b,
  };
}
