import { computeStageLayout } from '../../Assets/Scripts/StagePlacer';
import { PillRect, uprightPillRect } from '../../Assets/Scripts/core/PillHit';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';
import { Vec3Like, add, v3 } from '../../Assets/Scripts/core/math';

/** Lens Studio default camera pose: head at y=160 cm (floor at 0), looking -Z. */
export const HEAD = v3(0, 160, 0);
export const FORWARD = v3(0, 0, -1);

export function defaultLayout(count = 6) {
  return computeStageLayout(HEAD, FORWARD, count, DEFAULT_TUNABLES);
}

/** Run `fn(dt)` for `seconds` at 60 fps. Returns the number of frames run. */
export function runFor(seconds: number, fn: (dt: number) => void, fps = 60): number {
  const dt = 1 / fps;
  const frames = Math.round(seconds * fps);
  for (let i = 0; i < frames; i++) fn(dt);
  return frames;
}

/**
 * The pill as EyesUpApp draws it after pass 4: PillBg 5 cm up the card × the 0.9 pill scale
 * (4.5 cm above cardAnchor), a 10 cm tall backing × 0.9, and about "Screens pull eyes" wide (≈ 53 cm).
 */
export function appPill(anchor: Vec3Like = defaultLayout(6).cardAnchor, viewer: Vec3Like = HEAD): PillRect {
  return uprightPillRect(add(anchor, v3(0, 4.5, 0)), viewer, 26, 4.5);
}
