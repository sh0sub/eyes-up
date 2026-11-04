/**
 * StagePlacer.ts — audience layout math (plan: "시작 yaw 기준, Re-place").
 *
 * Seats `count` audience members on an arc in front of the head: horizontal distance
 * `stageDistanceCm` (2.5 m), on the floor `floorOffsetCm` (160 cm) below the head,
 * `audienceSpacingCm` (0.6 m; 0.42 m for 3 or fewer) apart along the arc, centered on the head's yaw.
 * Index 0 is the leftmost member as seen by the speaker.
 *
 * Pure math only; the Lens side (EyesUpApp) moves the Audience_i SceneObjects to these points.
 */
import { Tunables } from './core/Tunables';
import { UP, Vec3Like, add, cross, flatten, scale, v3 } from './core/math';

export interface StageLayout {
  /** Floor position of each audience member (feet). */
  seats: Vec3Like[];
  /** Gaze target of each member (eye height above the floor). */
  eyeTargets: Vec3Like[];
  /** Where the cue card / pill floats: above the center of the audience. */
  cardAnchor: Vec3Like;
  /** Center of the arc on the floor (for the stage line). */
  stageCenter: Vec3Like;
  /** Podium (Prev/Next/Finish): 55 cm ahead, 30 cm below the head, along the same yaw. */
  podiumPosition: Vec3Like;
  /** Flattened forward the layout was built from. */
  facing: Vec3Like;
}

export type StageTunables = Pick<
  Tunables,
  'stageDistanceCm' | 'floorOffsetCm' | 'audienceSpacingCm' | 'smallAudienceSpacingCm' | 'smallAudienceMax' | 'audienceEyeHeightCm' | 'audienceHeadTopCm' | 'cardAboveHeadCm'
  | 'podiumDistanceCm' | 'podiumBelowCm'
>;

export function computeStageLayout(
  headPosition: Vec3Like,
  headForward: Vec3Like,
  count: number,
  t: StageTunables,
): StageLayout {
  if (!Number.isInteger(count) || count < 1) throw new Error(`audience count must be a positive integer, got ${count}`);
  const facing = flatten(headForward);
  const right = cross(facing, UP);
  const floorY = headPosition.y - t.floorOffsetCm;
  // Small audiences sit closer: the lens viewport is narrow (about +-72 cm at 2.5 m), and a 3-person arc at 60 cm cut the outer two off.
  const spacing = count <= t.smallAudienceMax ? Math.min(t.audienceSpacingCm, t.smallAudienceSpacingCm) : t.audienceSpacingCm;
  const step = spacing / t.stageDistanceCm; // radians between seats along the arc
  const seats: Vec3Like[] = [];
  const eyeTargets: Vec3Like[] = [];
  for (let i = 0; i < count; i++) {
    const theta = (i - (count - 1) / 2) * step;
    const dir = add(scale(facing, Math.cos(theta)), scale(right, Math.sin(theta)));
    const p = add(v3(headPosition.x, floorY, headPosition.z), scale(dir, t.stageDistanceCm));
    seats.push(p);
    eyeTargets.push(v3(p.x, floorY + t.audienceEyeHeightCm, p.z));
  }
  const stageCenter = add(v3(headPosition.x, floorY, headPosition.z), scale(facing, t.stageDistanceCm));
  const cardAnchor = v3(stageCenter.x, floorY + t.audienceHeadTopCm + t.cardAboveHeadCm, stageCenter.z);
  const podiumPosition = add(v3(headPosition.x, headPosition.y - t.podiumBelowCm, headPosition.z), scale(facing, t.podiumDistanceCm));
  return { seats, eyeTargets, cardAnchor, stageCenter, podiumPosition, facing };
}
