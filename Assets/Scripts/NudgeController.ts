/**
 * NudgeController.ts — neglected-zone nudge (plan M5).
 *
 * Rule (plan): a zone (left/center/right) whose zoneAttention stays below 0.2 for 8 s gets a nudge:
 * a spatial chime from that side (AudioComponent.play(1) on NudgeAudio_L / NudgeAudio_R) plus an
 * amber chevron at the view edge (EdgeHint) for 3 s. It ends as soon as the gaze reaches that zone
 * (gazeZone == z) or after 3 s.
 *
 * Choices the plan leaves open (documented, tunable):
 * - Which zone when several qualify: the one neglected longest; ties go to the zone farthest from
 *   the current gaze zone (looking right with left+center neglected -> "left", as in LEAF
 *   neglect_triggers_nudge).
 * - Side ("left"/"right") is the turn direction from the current gaze to the zone's center, so the
 *   center zone gets the side you must turn toward. Only two audio sources exist (L/R).
 * - Cooldown: no new nudge until `nudgeCooldownSeconds` (default 8 s) after the previous one started,
 *   and the nudged zone's neglect timer restarts at 0 when it fires.
 */
import { Tunables, ZONES, Zone } from './core/Tunables';
import { Vec3Like, isLeftOf } from './core/math';

export type Side = 'left' | 'right';

/** Lens adapter: NudgeAudio_L/R AudioComponent.play(1). Spatial direction itself is not testable (see LEAF notes). */
export interface NudgeAudio {
  playChime(side: Side): void;
}

/** Lens adapter: EdgeHint.ts chevron at the view edge. */
export interface EdgeHintView {
  show(side: Side): void;
  hide(): void;
}

export interface NudgeInput {
  zoneAttention: readonly [number, number, number];
  gazeZone: Zone | null;
  gazeForward: Vec3Like;
  /** Direction from the head to each zone's center. */
  zoneDirections: readonly [Vec3Like, Vec3Like, Vec3Like];
}

export type NudgeEvent =
  | { type: 'nudgeStart'; zone: Zone; side: Side }
  | { type: 'nudgeEnd'; zone: Zone; reason: 'looked' | 'timeout' | 'cancelled' };

export interface ActiveNudge {
  zone: Zone;
  side: Side;
  remaining: number;
}

export type NudgeTunables = Pick<Tunables, 'nudgeSeconds' | 'nudgeThreshold' | 'nudgeHintSeconds' | 'nudgeCooldownSeconds'>;

const EPS = 1e-6;

export class NudgeController {
  private neglect: [number, number, number] = [0, 0, 0];
  private time = 0;
  private lastStart = -Infinity;
  private current: ActiveNudge | null = null;
  private fired = 0;

  constructor(
    private readonly t: NudgeTunables,
    private readonly audio?: NudgeAudio,
    private readonly edgeHint?: EdgeHintView,
  ) {}

  reset(): void {
    if (this.current) this.edgeHint?.hide();
    this.neglect = [0, 0, 0];
    this.time = 0;
    this.lastStart = -Infinity;
    this.current = null;
    this.fired = 0;
  }

  get active(): ActiveNudge | null {
    return this.current;
  }

  get count(): number {
    return this.fired;
  }

  neglectSeconds(zone: Zone): number {
    return this.neglect[zone];
  }

  /** Stop any active nudge (e.g. Finish pressed). */
  cancel(): NudgeEvent | null {
    if (!this.current) return null;
    const zone = this.current.zone;
    this.current = null;
    this.edgeHint?.hide();
    return { type: 'nudgeEnd', zone, reason: 'cancelled' };
  }

  update(dt: number, input: NudgeInput): NudgeEvent[] {
    const events: NudgeEvent[] = [];
    this.time += dt;
    for (const z of ZONES) {
      this.neglect[z] = input.zoneAttention[z] < this.t.nudgeThreshold ? this.neglect[z] + dt : 0;
    }

    if (this.current) {
      const zone = this.current.zone;
      this.current.remaining -= dt;
      if (input.gazeZone === zone || this.current.remaining <= EPS) {
        events.push({ type: 'nudgeEnd', zone, reason: input.gazeZone === zone ? 'looked' : 'timeout' });
        this.current = null;
        this.edgeHint?.hide();
      }
      return events;
    }

    if (this.time - this.lastStart + EPS < this.t.nudgeCooldownSeconds) return events;

    const zone = this.pickZone(input.gazeZone);
    if (zone === null) return events;

    const side: Side = isLeftOf(input.gazeForward, input.zoneDirections[zone]) ? 'left' : 'right';
    this.current = { zone, side, remaining: this.t.nudgeHintSeconds };
    this.lastStart = this.time;
    this.neglect[zone] = 0;
    this.fired++;
    this.audio?.playChime(side);
    this.edgeHint?.show(side);
    events.push({ type: 'nudgeStart', zone, side });
    return events;
  }

  private pickZone(gazeZone: Zone | null): Zone | null {
    let best: Zone | null = null;
    for (const z of ZONES) {
      if (z === gazeZone || this.neglect[z] + EPS < this.t.nudgeSeconds) continue;
      if (best === null) {
        best = z;
        continue;
      }
      const diff = this.neglect[z] - this.neglect[best];
      if (diff > EPS) best = z;
      else if (Math.abs(diff) <= EPS && gazeZone !== null && Math.abs(z - gazeZone) > Math.abs(best - gazeZone)) best = z;
    }
    return best;
  }
}

/** Artifact S3: the chevron pulses at 1 Hz while visible. */
export const CHEVRON_PULSE_HZ = 1;

/** Round 6: the chevron never fades below this alpha, so the core nudge cue stays readable at the dip. */
export const CHEVRON_MIN_ALPHA = 0.75;

/** Chevron alpha for a pulse level 0..1: CHEVRON_MIN_ALPHA at the dip, 1 at the peak. */
export function chevronAlpha(pulse: number): number {
  return CHEVRON_MIN_ALPHA + (1 - CHEVRON_MIN_ALPHA) * Math.max(0, Math.min(1, pulse));
}

/**
 * Chevron pulse level 0..1, `t` seconds after the chevron appeared. Starts at 1 (full), dips to 0 at
 * half a period and is back at 1 every full period (cosine, so there is no pop when it appears).
 */
export function chevronPulse(t: number, hz: number = CHEVRON_PULSE_HZ): number {
  return 0.5 + 0.5 * Math.cos(2 * Math.PI * hz * Math.max(0, t));
}
