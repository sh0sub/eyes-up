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
/** Muted periwinkle (about 60 % of the engaged saturation, dimmer and more transparent): clearly the same person, clearly drained next to the lit blue; the old grey-lavender read as a pale ghost. */
export const BODY_DISENGAGED: Rgba = [0.36, 0.4, 0.7, 0.4];
export const BODY_PERK: Rgba = [0.25, 0.9, 1.0, 0.85];
export const PHONE_GLOW: [number, number, number] = [1.0, 0.78, 0.3];

/** Head local y at upright (scene) and the most it sinks, in cm. */
export const HEAD_UP_Y = 153;
export const HEAD_SINK_CM = 34;
export const HEAD_PITCH_DEG = 38;
/** Cycle 5 (R2): local height (cm above the member's floor) of the phone screen's centre; its lowest edge is about 6 cm below. */
export const PHONE_Y_CM = 89;
export const PHONE_BOTTOM_BELOW_CENTER_CM = 6;
/** The slumped head also tilts sideways (roll about the view axis) by this much; the ellipsoid makes a roll visible, a pitch is not. */
export const HEAD_TILT_DEG = 30;

export interface AudienceLook {
  /** Redesign: the raw engagement 0..1 and perk-up burst 0..1 behind this look (the figure's colours and the "#n NN%" tag read them). */
  engagement: number;
  burst: number;
  bodyColor: Rgba;
  headColor: Rgba;
  /** Offset to add to the head's rest y (negative = sinks). */
  headDropCm: number;
  /** Head pitch about X (degrees, positive = chin down). */
  headPitchDeg: number;
  /** Head roll about the audience's forward axis (degrees; 0 = upright, HEAD_TILT_DEG at full slump). */
  headTiltDeg: number;
  /** 0..1 strength of the small 'zzz' marker above a slumped head (0 = hidden). */
  zzz: number;
  /** Multiplier for the body's scale Y (1 = upright). */
  bodyScaleY: number;
  /** 0..1 phone glow strength (0 = off). */
  phoneGlow: number;
  /** Scale of the Halo ring from the burst (1 = none, peaks at 1.6). */
  haloBurstScale: number;
  /** Halo alpha boost from the burst, 0..1 added to the halo alpha. */
  haloBurstAlpha: number;
  /** Scale of the thin cyan ring that expands from the head on a perk-up (1 at the start, 2.4 at the end; meaningless when pulseAlpha is 0). */
  pulseScale: number;
  /** Alpha of that ring: 0 with no burst, fading as it expands. */
  pulseAlpha: number;
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
    engagement: e,
    burst: b,
    bodyColor: body,
    headColor,
    headDropCm: -HEAD_SINK_CM * slump * (1 - 0.6 * lift) + 0, // + 0 turns -0 into 0
    headPitchDeg: HEAD_PITCH_DEG * slump * (1 - 0.8 * lift),
    headTiltDeg: HEAD_TILT_DEG * slump * (1 - lift),
    zzz: lift > 0.2 ? 0 : clamp01((slump - 0.5) / 0.3),
    bodyScaleY: 1 - 0.1 * slump,
    phoneGlow: clamp01((0.6 - e) / 0.4),
    haloBurstScale: b > 0 ? 1 + 0.6 * Math.sin(Math.PI * (1 - b)) : 1,
    haloBurstAlpha: b,
    pulseScale: 1 + 1.4 * (1 - b),
    pulseAlpha: b > 0 ? 0.9 * Math.min(1, b * 2) : 0,
  };
}
