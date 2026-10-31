/**
 * SessionStats.ts — zone gaze time, longest look-away, card/nudge counts, balance score.
 *
 * Fed once per Rehearsal frame with the current gaze zone (or null when looking at nothing).
 * - Zone time: dt is added to the zone being looked at.
 * - Look-away: for each zone, the current continuous stretch it has NOT been looked at;
 *   the longest stretch over the session (and its zone) is reported ("Longest look-away: 11 seconds, left").
 * - Balance score 0..100: 100 = perfectly even thirds, 0 = all gaze on one zone
 *   (1 − total-variation distance from uniform, normalized). The formula is a design choice; the plan only names the metric.
 * - Zone history (pass 5, artifact S5 ③ gaze timeline): one entry per 0.5 s bucket holding the zone
 *   looked at longest in that bucket (null = mostly nobody), plus the session time of each nudge.
 *   core/GazeTimeline.ts downsamples it to ≤ 60 columns for the Summary strip.
 */
import { ZONES, ZONE_NAMES, Zone, ZoneName } from './core/Tunables';

/** Seconds per zone-history bucket. */
export const TIMELINE_BUCKET_SECONDS = 0.5;

export interface ZoneHistory {
  bucketSeconds: number;
  /** One entry per bucket, oldest first; the last (partial) bucket is included when it has time. */
  zones: Array<Zone | null>;
  /** Session time (s) of each nudge start. */
  nudgeTimes: number[];
}

export interface StatsSnapshot {
  durationSeconds: number;
  zoneSeconds: [number, number, number];
  /** Integer percentages [left, center, right] summing to exactly 100 (or all 0 if no gaze at all). */
  zonePercents: [number, number, number];
  /** `startSeconds` = session time when that look-away began (Summary: "11 s · left · at 1:12"). */
  longestLookAway: { seconds: number; zone: Zone; zoneName: ZoneName; startSeconds: number };
  cardExpands: number;
  nudges: number;
  balanceScore: number;
  timeline: ZoneHistory;
}

export class SessionStats {
  private duration = 0;
  private zoneTime: [number, number, number] = [0, 0, 0];
  private awayRun: [number, number, number] = [0, 0, 0];
  private longest = { seconds: 0, zone: 0 as Zone, startSeconds: 0 };
  private cards = 0;
  private nudgeCount = 0;
  private history: Array<Zone | null> = [];
  private nudgeTimes: number[] = [];
  /** Time per [left, center, right, nobody] inside the open bucket, and how full it is. */
  private bucket: [number, number, number, number] = [0, 0, 0, 0];
  private bucketFill = 0;

  reset(): void {
    this.duration = 0;
    this.zoneTime = [0, 0, 0];
    this.awayRun = [0, 0, 0];
    this.longest = { seconds: 0, zone: 0, startSeconds: 0 };
    this.cards = 0;
    this.nudgeCount = 0;
    this.history = [];
    this.nudgeTimes = [];
    this.bucket = [0, 0, 0, 0];
    this.bucketFill = 0;
  }

  update(dt: number, gazeZone: Zone | null): void {
    this.duration += dt;
    for (const z of ZONES) {
      if (z === gazeZone) {
        this.zoneTime[z] += dt;
        this.awayRun[z] = 0;
      } else {
        this.awayRun[z] += dt;
        if (this.awayRun[z] > this.longest.seconds) {
          this.longest = { seconds: this.awayRun[z], zone: z, startSeconds: this.duration - this.awayRun[z] };
        }
      }
    }
    this.recordHistory(dt, gazeZone);
  }

  /** Splits `dt` across 0.5 s buckets; a bucket closes with the zone that got the most of it. */
  private recordHistory(dt: number, gazeZone: Zone | null): void {
    const slot = gazeZone === null ? 3 : gazeZone;
    let rest = dt;
    while (rest > 1e-9) {
      const take = Math.min(rest, TIMELINE_BUCKET_SECONDS - this.bucketFill);
      this.bucket[slot] += take;
      this.bucketFill += take;
      rest -= take;
      if (this.bucketFill >= TIMELINE_BUCKET_SECONDS - 1e-9) {
        this.history.push(bucketZone(this.bucket));
        this.bucket = [0, 0, 0, 0];
        this.bucketFill = 0;
      }
    }
  }

  recordCardExpand(): void {
    this.cards++;
  }

  recordNudge(): void {
    this.nudgeCount++;
    this.nudgeTimes.push(this.duration);
  }

  get nudges(): number {
    return this.nudgeCount;
  }

  get cardExpands(): number {
    return this.cards;
  }

  snapshot(): StatsSnapshot {
    const zonePercents = roundPercents(this.zoneTime);
    return {
      durationSeconds: this.duration,
      zoneSeconds: [...this.zoneTime] as [number, number, number],
      zonePercents,
      longestLookAway: { ...this.longest, zoneName: ZONE_NAMES[this.longest.zone] },
      cardExpands: this.cards,
      nudges: this.nudgeCount,
      balanceScore: balanceScore(this.zoneTime),
      timeline: {
        bucketSeconds: TIMELINE_BUCKET_SECONDS,
        zones: this.bucketFill > 1e-9 ? [...this.history, bucketZone(this.bucket)] : [...this.history],
        nudgeTimes: [...this.nudgeTimes],
      },
    };
  }
}

/** The zone with the most time in a bucket; null when "nobody" got strictly more than each zone. Ties go left → right. */
function bucketZone(b: readonly [number, number, number, number]): Zone | null {
  let best = 0;
  for (let z = 1; z < 3; z++) if (b[z] > b[best]) best = z;
  return b[3] > b[best] ? null : (best as Zone);
}

/** Largest-remainder rounding so the three integers always sum to 100. */
export function roundPercents(values: readonly [number, number, number]): [number, number, number] {
  const total = values[0] + values[1] + values[2];
  if (total <= 0) return [0, 0, 0];
  const raw = values.map((v) => (v / total) * 100);
  const floors = raw.map(Math.floor);
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - floors[i] })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    floors[i]++;
    rest--;
  }
  return floors as [number, number, number];
}

export function balanceScore(values: readonly [number, number, number]): number {
  const total = values[0] + values[1] + values[2];
  if (total <= 0) return 0;
  const tvd = 0.5 * values.reduce((acc, v) => acc + Math.abs(v / total - 1 / 3), 0);
  return Math.round(100 * (1 - tvd / (2 / 3)));
}
