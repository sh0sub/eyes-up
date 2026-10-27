import { computeStageLayout } from '../../Assets/Scripts/StagePlacer';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';
import { v3 } from '../../Assets/Scripts/core/math';

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
