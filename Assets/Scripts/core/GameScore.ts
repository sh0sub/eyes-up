/**
 * GameScore.ts — the end-of-session attention score, grade, best-previous compare and applause
 * strength (game layer). Pure TypeScript.
 *
 * score (0..100) = balance × (0.35 + 0.65 × average room engagement). Balance is the existing
 * gaze-balance number (0 when you never looked up), so a session that ignores the audience cannot
 * score well even though members start engaged; a perfectly even session that keeps everyone with
 * you scores 100. Grade: S ≥ 85, A ≥ 70, B ≥ 50, else C. Bests are kept per stage in core/StageProgress.ts.
 */
import { clamp01 } from './math';

export type Grade = 'S' | 'A' | 'B' | 'C';

export const GRADE_S = 85;
export const GRADE_A = 70;
export const GRADE_B = 50;

export interface GameResult {
  score: number;
  grade: Grade;
  /** 0..100, the time-averaged room engagement. */
  engagementPercent: number;
  /** Live points earned from real eye contact (core/LiveScore.ts); equals `score` for callers that pass no points. */
  points: number;
  /** 1..3 stars from real stats (see `starsFor`). */
  stars: number;
  /** Best earlier result in this lens session (null on the first run). */
  bestPrevious: BestRun | null;
  /** True when this run's points beat `bestPrevious` (always false on the first run). */
  newBest: boolean;
}

export interface BestRun {
  score: number;
  grade: Grade;
  /** Live points of that run (older callers: falls back to `score`). */
  points?: number;
}

/** Stars: 1 for finishing, +1 when the room stayed with you (time-averaged engagement >= the meter target 0.70), +1 for balance >= 80. */
export const STAR_BALANCE_AT = 80;
export function starsFor(averageEngagement: number, balanceScore: number): number {
  return 1 + (averageEngagement >= 0.7 - 1e-9 ? 1 : 0) + (balanceScore >= STAR_BALANCE_AT ? 1 : 0);
}

export function attentionScore(balanceScore: number, averageEngagement: number): number {
  const b = Math.min(100, Math.max(0, balanceScore)) / 100;
  return Math.round(100 * b * (0.35 + 0.65 * clamp01(averageEngagement)));
}

export function gradeFor(score: number): Grade {
  if (score >= GRADE_S) return 'S';
  if (score >= GRADE_A) return 'A';
  if (score >= GRADE_B) return 'B';
  return 'C';
}

export function gameResult(
  balanceScore: number,
  averageEngagement: number,
  bestPrevious: BestRun | null,
  points?: number,
): GameResult {
  const score = attentionScore(balanceScore, averageEngagement);
  const pts = points ?? score;
  return {
    score,
    grade: gradeFor(score),
    engagementPercent: Math.round(100 * clamp01(averageEngagement)),
    points: pts,
    stars: starsFor(averageEngagement, balanceScore),
    bestPrevious: bestPrevious ? { ...bestPrevious } : null,
    newBest: bestPrevious !== null && pts > bestPoints(bestPrevious),
  };
}

export function bestPoints(b: BestRun): number {
  return b.points ?? b.score;
}

/** Summary banner: 'NEW BEST' when this run beat the best, 'Best 1240' otherwise, '' on a first run. */
export function bestBanner(r: GameResult): string {
  if (!r.bestPrevious) return '';
  return r.newBest ? 'NEW BEST' : `Best ${bestPoints(r.bestPrevious)}`;
}

/** Subline under the Again button: 'beat 1240' (the higher of this run and the best), '' on nothing to beat. */
export function beatLabel(r: GameResult): string {
  const target = r.bestPrevious ? Math.max(r.points, bestPoints(r.bestPrevious)) : r.points;
  return target > 0 ? `beat ${target}` : '';
}

/** Applause pulse amplitude: 0.02 at score 0, 0.05 at the old plan value near 50, 0.09 at 100. */
export function applauseAmplitude(score: number): number {
  return 0.02 + 0.07 * clamp01(score / 100);
}

/** Applause volume 0.3..1 for the audio component. */
export function applauseVolume(score: number): number {
  return 0.3 + 0.7 * clamp01(score / 100);
}

/** "New best!" / "Best so far 72 · A" / "" (first run). */
export function compareLabel(r: GameResult): string {
  if (!r.bestPrevious) return '';
  if (r.newBest) return `New best! (was ${bestPoints(r.bestPrevious)})`;
  return `Best so far ${bestPoints(r.bestPrevious)} · ${r.bestPrevious.grade}`;
}

/** Room meter tone (design cycle 3, F8): 'good' ≥ 0.70 (cyan, the target tick), 'mid' ≥ 0.40 (amber), else 'low' (coral). */
export const METER_GOOD_AT = 0.7;
export const METER_MID_AT = 0.4;
export type MeterTone = 'good' | 'mid' | 'low';
export function meterTone(level: number): MeterTone {
  return level >= METER_GOOD_AT ? 'good' : level >= METER_MID_AT ? 'mid' : 'low';
}

/** HP-style room meter: the bar is split into this many discrete segments; the goal notch sits after segment `METER_GOAL_SEGMENTS` (0.70). */
export const METER_SEGMENTS = 10;
export const METER_GOAL_SEGMENTS = Math.round(METER_GOOD_AT * METER_SEGMENTS);

/**
 * Lit segments for a room level 0..1: whole tenths, rounded down (so 0.69 shows 6, under the goal notch, matching its amber tone), but a room that
 * is not empty always shows at least one segment.
 */
export function meterSegments(level: number, n = METER_SEGMENTS): number {
  const l = clamp01(level);
  if (l <= 0) return 0;
  return Math.max(1, Math.min(n, Math.floor(l * n + 1e-6)));
}

/** +1 when the level rose across the goal (0.70) this frame, -1 when it fell below it, else 0. */
export function goalCrossing(prev: number, next: number): 1 | -1 | 0 {
  if (prev < METER_GOOD_AT && next >= METER_GOOD_AT) return 1;
  if (prev >= METER_GOOD_AT && next < METER_GOOD_AT) return -1;
  return 0;
}

/** Low-tone pulse (red gauge, red meter segments): an alpha between `lo` and `hi` at 0.8 Hz; `t` in seconds. */
export function lowPulse(t: number, lo = 0.4, hi = 0.8, hz = 0.8): number {
  return lo + (hi - lo) * (0.5 + 0.5 * Math.sin(2 * Math.PI * hz * t));
}
