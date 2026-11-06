/**
 * Framing.ts — where audience heads land in the Interactive Preview viewport (Cycle 4, D1).
 *
 * The preview draws the lens in a viewport whose half field of view was measured from the captures
 * (members 42 cm apart at 2.5 m span 290 px of 1600): about 24.9 degrees across and 17.9 degrees up/down.
 * `CANONICAL_PITCH_DEG` is the camera pitch that `scripts/video/preview-reset.sh` puts the preview camera at before every
 * LEAF capture and video shot, so the framing is repeatable. Pure maths, no Lens Studio dependency.
 */
import { Vec3Like } from './math';
import { HEAD_PITCH_DEG, HEAD_SINK_CM, HEAD_UP_Y } from './AudienceLook';

export const VIEW_HALF_FOV_H_DEG = 24.9;
export const VIEW_HALF_FOV_V_DEG = 17.9;
/** Preview camera pitch after the canonical reset (about -2.3 degrees, slightly down), yaw 0 = facing the stage. */
export const CANONICAL_PITCH_DEG = -2.3;
/** Head ring radius (the Halo is about 36 cm across). */
export const HEAD_RADIUS_CM = 20;
/** Mirrors AudienceRig.apply at full slump: body squashed to 90 %, leaning 35 % of the head pitch, head sunk HEAD_SINK_CM. */
const SLUMP_BODY_SCALE = 0.9;
const SLUMP_LEAN_SHARE = 0.35;

/** Height above the floor of the fully slumped head's centre (about 104 cm, 49 cm below upright). */
export function slumpedHeadY(): number {
  const lean = rad(HEAD_PITCH_DEG * SLUMP_LEAN_SHARE);
  return HEAD_UP_Y * SLUMP_BODY_SCALE * Math.cos(lean) - HEAD_SINK_CM;
}
/** Every head must sit inside this fraction of the viewport half extent (8 % margin; was 10 % before the audience moved 11 cm lower for the tag row). */
export const FRAME_MARGIN = 0.92;

const rad = (d: number) => (d * Math.PI) / 180;

/**
 * Normalised screen position (-1..1 in both axes; +x right, +y up) of a world point for a camera at `origin`
 * looking along `forward` (any direction), using the preview's measured half fields of view.
 * Points behind the camera return null.
 */
export function projectToViewport(origin: Vec3Like, forward: Vec3Like, point: Vec3Like): { x: number; y: number } | null {
  const len = Math.hypot(forward.x, forward.y, forward.z);
  const f = { x: forward.x / len, y: forward.y / len, z: forward.z / len };
  // right = f x up, up' = right x f
  let r = { x: -f.z, y: 0, z: f.x };
  const rl = Math.hypot(r.x, r.z) || 1;
  r = { x: r.x / rl, y: 0, z: r.z / rl };
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  const d = { x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z };
  const depth = d.x * f.x + d.y * f.y + d.z * f.z;
  if (depth <= 1) return null;
  const sx = (d.x * r.x + d.y * r.y + d.z * r.z) / depth;
  const sy = (d.x * u.x + d.y * u.y + d.z * u.z) / depth;
  return { x: sx / Math.tan(rad(VIEW_HALF_FOV_H_DEG)), y: sy / Math.tan(rad(VIEW_HALF_FOV_V_DEG)) };
}

/** Forward vector for a camera at yaw 0 (looking along -Z) pitched by `pitchDeg` (negative = down). */
export function forwardAtPitch(pitchDeg: number): Vec3Like {
  return { x: 0, y: Math.sin(rad(pitchDeg)), z: -Math.cos(rad(pitchDeg)) };
}

/**
 * Worst-case extent of one member's head in viewport units: the upright head's top and the fully slumped head's bottom
 * (it sinks `HEAD_SINK_CM`), plus the left / right edge of the ring. `seat` is the member's floor position.
 */
export function headExtent(origin: Vec3Like, forward: Vec3Like, seat: Vec3Like): { left: number; right: number; top: number; bottom: number } | null {
  const at = (dx: number, dy: number) => projectToViewport(origin, forward, { x: seat.x + dx, y: seat.y + dy, z: seat.z });
  const up = HEAD_UP_Y;
  const down = slumpedHeadY();
  const pts = [at(-HEAD_RADIUS_CM, up), at(HEAD_RADIUS_CM, up), at(0, up + HEAD_RADIUS_CM), at(0, down - HEAD_RADIUS_CM), at(-HEAD_RADIUS_CM, down), at(HEAD_RADIUS_CM, down)];
  if (pts.some((p) => p === null)) return null;
  const xs = pts.map((p) => (p as { x: number }).x);
  const ys = pts.map((p) => (p as { y: number }).y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.max(...ys), bottom: Math.min(...ys) };
}

export function insideMargin(e: { left: number; right: number; top: number; bottom: number }, margin = FRAME_MARGIN): boolean {
  return e.left >= -margin && e.right <= margin && e.top <= margin && e.bottom >= -margin;
}

/**
 * Cycle 5 (R1): Summary panel geometry shared by SummaryPanel (size, scale) and EyesUpApp (placement), so a unit test can
 * prove the whole panel (grade tile and header included) sits inside the preview viewport at the canonical pose.
 * The panel stands `SUMMARY_DISTANCE_CM` ahead (yaw only) with its centre `SUMMARY_CENTER_Y_CM` above the eyes (negative = below).
 */
export const SUMMARY_DISTANCE_CM = 150;
export const SUMMARY_CENTER_Y_CM = -6.5;
export const SUMMARY_PANEL_W_CM = 50;
export const SUMMARY_PANEL_H_CM = 78;
export const SUMMARY_PANEL_SCALE = 1.08;

/** Viewport extent of the Summary panel for a camera at `origin` looking along `forward` (any pitch, yaw 0). */
export function summaryExtent(origin: Vec3Like, forward: Vec3Like): { left: number; right: number; top: number; bottom: number } | null {
  const hw = (SUMMARY_PANEL_W_CM * SUMMARY_PANEL_SCALE) / 2;
  const hh = (SUMMARY_PANEL_H_CM * SUMMARY_PANEL_SCALE) / 2;
  const cx = origin.x;
  const cy = origin.y + SUMMARY_CENTER_Y_CM;
  const cz = origin.z - SUMMARY_DISTANCE_CM;
  const pts = [
    projectToViewport(origin, forward, { x: cx - hw, y: cy + hh, z: cz }),
    projectToViewport(origin, forward, { x: cx + hw, y: cy + hh, z: cz }),
    projectToViewport(origin, forward, { x: cx - hw, y: cy - hh, z: cz }),
    projectToViewport(origin, forward, { x: cx + hw, y: cy - hh, z: cz }),
  ];
  if (pts.some((p) => p === null)) return null;
  const xs = pts.map((p) => (p as { x: number }).x);
  const ys = pts.map((p) => (p as { y: number }).y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.max(...ys), bottom: Math.min(...ys) };
}
