/**
 * GazeTracker.ts — per-member gaze angle, lookingAt(i), zone aggregation, pill dwell.
 *
 * Every frame: angle between the gaze forward and the direction to each member's eye
 * target (plan uses vec3.angleTo; same math here in degrees). A member is "looked at"
 * when the angle is within `lookAngleDeg` (7°).
 *
 * gazeZone: the zone (left/center/right) of the nearest member if that member is within
 * `zoneAngleDeg`, otherwise null (looking at nothing / at the floor / at the podium).
 *
 * Pill dwell: while the pill is shown, looking at it for `dwellSeconds` (1 s) fires once;
 * it fires again only after the gaze has left the pill (so staring does not loop).
 * "Looking at it" is a hit on the pill's actual rectangle (core/PillHit.ts, pass 6), not a 7° cone
 * around the card anchor.
 */
import { GazeProvider } from './GazeProvider';
import { PillRect, pillHit } from './core/PillHit';
import { Tunables, Zone, zoneOf } from './core/Tunables';
import { Vec3Like, angleDeg, sub } from './core/math';

export interface GazeFrame {
  angles: number[];
  looking: boolean[];
  nearestIndex: number;
  gazeZone: Zone | null;
  /** True only on the frame the pill dwell completes. */
  dwellFired: boolean;
}

export type GazeTunables = Pick<Tunables, 'lookAngleDeg' | 'zoneAngleDeg' | 'dwellSeconds' | 'pillMarginDeg'>;

export class GazeTracker {
  private targets: Vec3Like[] = [];
  private pillTarget: PillRect | null = null;
  private dwellAccum = 0;
  private dwellLatched = false;
  private last: GazeFrame = { angles: [], looking: [], nearestIndex: -1, gazeZone: null, dwellFired: false };

  constructor(private readonly t: GazeTunables) {}

  setTargets(eyeTargets: Vec3Like[]): void {
    this.targets = eyeTargets.map((p) => ({ ...p }));
    this.last = { angles: [], looking: [], nearestIndex: -1, gazeZone: null, dwellFired: false };
  }

  get count(): number {
    return this.targets.length;
  }

  /** Enable pill dwell on the pill's world rectangle, or disable with null (card expanded / hidden). */
  setPillTarget(rect: PillRect | null): void {
    // Explicit components: a native Lens vec3 has no own enumerable x/y/z (see GazeProvider.ts).
    const c = (p: Vec3Like): Vec3Like => ({ x: p.x, y: p.y, z: p.z });
    this.pillTarget = rect ? { ...rect, center: c(rect.center), right: c(rect.right), up: c(rect.up) } : null;
    if (!rect) {
      this.dwellAccum = 0;
    }
  }

  get pillDwellSeconds(): number {
    return this.dwellAccum;
  }

  /** The current dwell target (null while the pill is not shown). */
  get pillRect(): PillRect | null {
    return this.pillTarget;
  }

  update(dt: number, gaze: GazeProvider): GazeFrame {
    const origin = gaze.origin;
    const forward = gaze.forward;
    const n = this.targets.length;
    const angles = new Array<number>(n);
    const looking = new Array<boolean>(n);
    let nearestIndex = -1;
    let nearestAngle = Infinity;
    for (let i = 0; i < n; i++) {
      const a = angleDeg(forward, sub(this.targets[i], origin));
      angles[i] = a;
      looking[i] = a <= this.t.lookAngleDeg;
      if (a < nearestAngle) {
        nearestAngle = a;
        nearestIndex = i;
      }
    }
    const gazeZone = nearestIndex >= 0 && nearestAngle <= this.t.zoneAngleDeg ? zoneOf(nearestIndex, n) : null;

    let dwellFired = false;
    if (this.pillTarget) {
      const onPill = pillHit(origin, forward, this.pillTarget, this.t.pillMarginDeg);
      if (!onPill) {
        this.dwellAccum = 0;
        this.dwellLatched = false;
      } else if (!this.dwellLatched) {
        this.dwellAccum += dt;
        if (this.dwellAccum >= this.t.dwellSeconds) {
          dwellFired = true;
          this.dwellLatched = true;
          this.dwellAccum = 0;
        }
      }
    }

    this.last = { angles, looking, nearestIndex, gazeZone, dwellFired };
    return this.last;
  }

  lookingAt(i: number): boolean {
    return this.last.looking[i] === true;
  }

  get gazeZone(): Zone | null {
    return this.last.gazeZone;
  }

  /** Number of members currently looked at in each zone [left, center, right]. */
  zoneLookCounts(): [number, number, number] {
    const counts: [number, number, number] = [0, 0, 0];
    this.last.looking.forEach((l, i) => {
      if (l) counts[zoneOf(i, this.targets.length)]++;
    });
    return counts;
  }
}
