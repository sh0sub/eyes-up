/**
 * PillHit — is the gaze ray on the cue-card pill?
 *
 * Pass 6: the dwell used to be a 7° cone around `layout.cardAnchor`. After pass 4 the pill sits
 * 4.5 cm above that anchor and the centre audience's eyes are only ~5.7° below it at 2.5 m, so the
 * cone swallowed the centre audience: the dwell fired while the speaker faced the room, then stayed
 * latched (it re-arms only when the gaze leaves the target) while they looked straight at the pill.
 *
 * Now the hit test is the pill's actual rectangle (live transform and size from the Lens adapter)
 * plus a small angular margin for head-gaze jitter.
 */
import { Vec3Like, add, cross, dot, normalize, scale, sub } from './math';

export interface PillRect {
  /** World-space centre of the pill backing (cm). */
  center: Vec3Like;
  /** Unit world-space axes of the pill plane (the pill billboards toward the head). */
  right: Vec3Like;
  up: Vec3Like;
  /** Half extents in world cm (already include the card's world scale). */
  halfWidth: number;
  halfHeight: number;
}

/**
 * Ray (origin, forward) vs the pill rectangle, grown on every side by `marginDeg` of visual angle
 * at the hit distance. Rays parallel to the plane or pointing away never hit.
 */
export function pillHit(origin: Vec3Like, forward: Vec3Like, rect: PillRect, marginDeg: number): boolean {
  const n = cross(rect.right, rect.up);
  const denom = dot(forward, n);
  if (Math.abs(denom) < 1e-6) return false;
  const t = dot(sub(rect.center, origin), n) / denom;
  if (!(t > 0)) return false;
  const d = sub(add(origin, scale(forward, t)), rect.center);
  const margin = t * Math.tan((Math.max(0, marginDeg) * Math.PI) / 180);
  return Math.abs(dot(d, rect.right)) <= rect.halfWidth + margin && Math.abs(dot(d, rect.up)) <= rect.halfHeight + margin;
}

/**
 * Fallback when no Lens view reports a rect (Node tests): a pill of the given size centred on
 * `center`, upright and facing `viewer` (yaw only, like the billboard).
 */
export function uprightPillRect(center: Vec3Like, viewer: Vec3Like, halfWidth: number, halfHeight: number): PillRect {
  const toViewer = sub(viewer, center);
  let back = normalize({ x: toViewer.x, y: 0, z: toViewer.z });
  if (dot(back, back) === 0) back = { x: 0, y: 0, z: 1 };
  const up = { x: 0, y: 1, z: 0 };
  // right × up = back (the normal points at the viewer), so right = up × back.
  const right = cross(up, back);
  return { center: { x: center.x, y: center.y, z: center.z }, right, up, halfWidth, halfHeight };
}
