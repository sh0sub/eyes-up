/**
 * GameScore.ts — the end-of-session attention score, grade, best-previous compare and applause
 * strength (game layer). Pure TypeScript.
 *
 * score (0..100) = balance × (0.35 + 0.65 × average room engagement). Balance is the existing
 * gaze-balance number (0 when you never looked up), so a session that ignores the audience cannot
 * score well even though members start engaged; a perfectly even session that keeps everyone with
 * you scores 100. Grade: S ≥ 85, A ≥ 70, B ≥ 50, else C. Session memory only: nothing is stored.
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
  /** Best earlier result in this lens session (null on the first run). */
  bestPrevious: { score: number; grade: Grade } | null;
  /** True when this run beats `bestPrevious` (always false on the first run). */
  newBest: boolean;
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
  bestPrevious: { score: number; grade: Grade } | null,
): GameResult {
  const score = attentionScore(balanceScore, averageEngagement);
  return {
    score,
    grade: gradeFor(score),
    engagementPercent: Math.round(100 * clamp01(averageEngagement)),
    bestPrevious: bestPrevious ? { ...bestPrevious } : null,
    newBest: bestPrevious !== null && score > bestPrevious.score,
  };
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
  if (r.newBest) return `New best! (was ${r.bestPrevious.score})`;
  return `Best so far ${r.bestPrevious.score} · ${r.bestPrevious.grade}`;
}

/** Room meter tone (design cycle 3, F8): 'good' ≥ 0.70 (cyan, the target tick), 'mid' ≥ 0.40 (amber), else 'low' (coral). */
export const METER_GOOD_AT = 0.7;
export const METER_MID_AT = 0.4;
export type MeterTone = 'good' | 'mid' | 'low';
export function meterTone(level: number): MeterTone {
  return level >= METER_GOOD_AT ? 'good' : level >= METER_MID_AT ? 'mid' : 'low';
}
