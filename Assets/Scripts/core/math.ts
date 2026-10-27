/**
 * Minimal vector math on plain {x, y, z} objects.
 *
 * Lens Studio's `vec3` has x/y/z fields, so it satisfies `Vec3Like` structurally and can be
 * passed in directly. Results are plain objects; Lens adapters convert with `new vec3(...)`.
 * Units are centimeters (Lens Studio world units). Y is up; the camera looks down -Z.
 */
export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export const UP: Vec3Like = { x: 0, y: 1, z: 0 };

export function v3(x: number, y: number, z: number): Vec3Like {
  return { x, y, z };
}

export function add(a: Vec3Like, b: Vec3Like): Vec3Like {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3Like, b: Vec3Like): Vec3Like {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a: Vec3Like, s: number): Vec3Like {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function dot(a: Vec3Like, b: Vec3Like): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3Like, b: Vec3Like): Vec3Like {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(a: Vec3Like): number {
  return Math.sqrt(dot(a, a));
}

export function normalize(a: Vec3Like): Vec3Like {
  const len = length(a);
  return len > 1e-9 ? scale(a, 1 / len) : { x: 0, y: 0, z: 0 };
}

/** Horizontal (XZ-plane) distance. */
export function horizontalDistance(a: Vec3Like, b: Vec3Like): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Angle between two directions in degrees (same as Lens Studio vec3.angleTo, but in degrees). */
export function angleDeg(a: Vec3Like, b: Vec3Like): number {
  const la = length(a);
  const lb = length(b);
  if (la < 1e-9 || lb < 1e-9) return 180;
  const c = Math.min(1, Math.max(-1, dot(a, b) / (la * lb)));
  return (Math.acos(c) * 180) / Math.PI;
}

/** Pitch of a direction in degrees; negative = looking down. */
export function pitchDeg(dir: Vec3Like): number {
  const len = length(dir);
  if (len < 1e-9) return 0;
  return (Math.asin(Math.min(1, Math.max(-1, dir.y / len))) * 180) / Math.PI;
}

/** Forward direction flattened onto the floor plane. Falls back to -Z if looking straight up/down. */
export function flatten(dir: Vec3Like): Vec3Like {
  const flat = normalize({ x: dir.x, y: 0, z: dir.z });
  return length(flat) > 0 ? flat : { x: 0, y: 0, z: -1 };
}

/** True if `target` direction lies to the left of `forward` (seen from above, Y up). */
export function isLeftOf(forward: Vec3Like, target: Vec3Like): boolean {
  return cross(flatten(forward), flatten(target)).y > 0;
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** m:ss, e.g. 185 s -> "3:05". Negative values clamp to 0. */
export function formatMSS(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
