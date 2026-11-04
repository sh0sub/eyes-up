/**
 * Engagement.ts — the game layer's per-member "is this person still with you" level.
 *
 * Every member starts at 1 (engaged). A member nobody looks at keeps full engagement for
 * `engageGraceSeconds`, then slips to 0 over `disengageSeconds` (head droops, dims, phone glow).
 * A look recovers it over `recoverSeconds`. If the member was below `perkUpBelow` when the look
 * landed, a perk-up fires and a cyan burst plays for `burstSeconds`.
 *
 * This is a separate dimension from the halo attention (which fills while looked at and drains
 * over 12 s): attention is "where you look now", engagement is "who you have been losing".
 * Pure TypeScript, no Lens Studio API.
 */
import { Tunables } from './Tunables';
import { clamp01 } from './math';

export type EngagementTunables = Pick<
  Tunables,
  'engageGraceSeconds' | 'disengageSeconds' | 'recoverSeconds' | 'perkUpBelow' | 'burstSeconds'
>;

export class EngagementModel {
  private levels: number[] = [];
  private unseen: number[] = [];
  private bursts: number[] = [];
  private perkUps = 0;
  private roomIntegral = 0;
  private time = 0;

  constructor(private readonly t: EngagementTunables) {}

  reset(count: number): void {
    this.levels = new Array<number>(count).fill(1);
    this.unseen = new Array<number>(count).fill(0);
    this.bursts = new Array<number>(count).fill(0);
    this.perkUps = 0;
    this.roomIntegral = 0;
    this.time = 0;
  }

  get engagement(): readonly number[] {
    return this.levels;
  }

  /** 1 → 0 over `burstSeconds` after a perk-up, else 0. */
  get burst(): readonly number[] {
    return this.bursts;
  }

  get perkUpCount(): number {
    return this.perkUps;
  }

  /** Seconds since member `i` was last looked at (0 while looked at). */
  unseenSeconds(i: number): number {
    return this.unseen[i] ?? 0;
  }

  /** Mean engagement of the whole room now (0..1); 0 for an empty room. */
  get room(): number {
    const n = this.levels.length;
    if (n === 0) return 0;
    let sum = 0;
    for (const v of this.levels) sum += v;
    return sum / n;
  }

  /** Time-averaged room engagement since reset (the room's level now when no time has passed). */
  get roomAverage(): number {
    return this.time > 0 ? this.roomIntegral / this.time : this.room;
  }

  /** Advance by `dt`; returns the indexes that perked up this frame. */
  update(dt: number, looking: readonly boolean[]): number[] {
    const perked: number[] = [];
    for (let i = 0; i < this.levels.length; i++) {
      if (looking[i]) {
        if (this.levels[i] < this.t.perkUpBelow && this.unseen[i] > 0) {
          this.bursts[i] = 1;
          this.perkUps++;
          perked.push(i);
        }
        this.unseen[i] = 0;
        this.levels[i] = clamp01(this.levels[i] + dt / this.t.recoverSeconds);
      } else {
        this.unseen[i] += dt;
        if (this.unseen[i] > this.t.engageGraceSeconds) {
          this.levels[i] = clamp01(this.levels[i] - dt / this.t.disengageSeconds);
        }
      }
      if (this.bursts[i] > 0) this.bursts[i] = Math.max(0, this.bursts[i] - dt / this.t.burstSeconds);
    }
    this.time += dt;
    this.roomIntegral += this.room * dt;
    return perked;
  }
}
