/**
 * Every tunable number in one place. Values marked "plan" come from docs/plan.md;
 * values marked "design" are not specified by the plan and are meant to be changed with
 * design notes during the D7 design pass.
 */
export interface Tunables {
  /** plan: gaze "looking at" threshold (EyesUpApp @input 각도 7°). */
  lookAngleDeg: number;
  /** plan: halo fills from 0 to 1 in this many seconds while looked at. */
  fillSeconds: number;
  /** plan: halo drains from 1 to 0 in this many seconds when not looked at. */
  drainSeconds: number;
  /** plan: a zone whose attention stays below `nudgeThreshold` this long gets a nudge. */
  nudgeSeconds: number;
  /** plan: zone attention threshold for the nudge (0.2). */
  nudgeThreshold: number;
  /** plan: chevron (EdgeHint) visible time; also the Nudge -> Rehearsal timeout (3 s). */
  nudgeHintSeconds: number;
  /** design (plan silent): minimum time between nudge starts. Defaults to nudgeSeconds. */
  nudgeCooldownSeconds: number;
  /** plan: cue card visible time before it shrinks to a pill (4 s). */
  cardSeconds: number;
  /** plan: pill dwell time that re-expands the card (1 s). */
  dwellSeconds: number;
  /**
   * design (pass 6): the dwell hit test is the pill's own rectangle, grown by this much visual angle
   * for head-gaze jitter (1.5° ≈ 6.5 cm at 2.5 m; the centre audience's eyes stay ~18 cm outside it).
   */
  pillMarginDeg: number;
  /** design: gaze is "in a zone" if the nearest audience member is within this angle. */
  zoneAngleDeg: number;

  /** plan: stage distance in front of the head (2.5 m). */
  stageDistanceCm: number;
  /** plan: floor is this far below the head (머리 -160 cm). */
  floorOffsetCm: number;
  /** plan: spacing between audience members along the arc (0.6 m). */
  audienceSpacingCm: number;
  /** design: height above the floor that counts as an audience member's eyes (gaze target). */
  audienceEyeHeightCm: number;
  /** design: height of the top of a silhouette's head above the floor. */
  audienceHeadTopCm: number;
  /** plan: cue card floats this far above the audience heads (10 cm). */
  cardAboveHeadCm: number;
  /** plan: audience fade-in time (Placing -> Rehearsal, 0.5 s). */
  placingSeconds: number;
  /** plan: applause before the summary (Finishing -> Summary, 1.5 s). */
  applauseSeconds: number;
  /** plan: "Finish?" prompt appears at target length + 30 s. */
  finishPromptAfterSeconds: number;
  /**
   * plan: podium visible only when the head pitches down "about 12°". Design pass 2: raised to 15°
   * because a resting head (and the Interactive preview's default camera, −12°) sat right on the
   * threshold and the podium flashed on at rest (build-notes G6).
   */
  podiumPitchDeg: number;
  /** plan: podium sits 55 cm in front of the head ... */
  podiumDistanceCm: number;
  /** plan: ... and 30 cm below it. */
  podiumBelowCm: number;
}

export const DEFAULT_TUNABLES: Readonly<Tunables> = Object.freeze({
  lookAngleDeg: 7,
  fillSeconds: 1,
  drainSeconds: 12,
  nudgeSeconds: 8,
  nudgeThreshold: 0.2,
  nudgeHintSeconds: 3,
  nudgeCooldownSeconds: 8,
  cardSeconds: 4,
  dwellSeconds: 1,
  pillMarginDeg: 1.5,
  zoneAngleDeg: 15,

  stageDistanceCm: 250,
  floorOffsetCm: 160,
  audienceSpacingCm: 60,
  audienceEyeHeightCm: 150,
  audienceHeadTopCm: 165,
  cardAboveHeadCm: 10,
  placingSeconds: 0.5,
  applauseSeconds: 1.5,
  finishPromptAfterSeconds: 30,
  podiumPitchDeg: 15,
  podiumDistanceCm: 55,
  podiumBelowCm: 30,
});

export function makeTunables(overrides: Partial<Tunables> = {}): Tunables {
  return { ...DEFAULT_TUNABLES, ...overrides };
}

/** Zone index for audience member `i` out of `n`: 0 = left, 1 = center, 2 = right. */
export type Zone = 0 | 1 | 2;
export const ZONES: readonly Zone[] = [0, 1, 2];
export const ZONE_NAMES = ['left', 'center', 'right'] as const;
export type ZoneName = (typeof ZONE_NAMES)[number];

export function zoneOf(i: number, n: number): Zone {
  return Math.min(2, Math.floor((i * 3) / n)) as Zone;
}
