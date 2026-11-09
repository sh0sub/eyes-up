/**
 * StageProgress.ts — the level-select layer on Setup (game layer): the audience size is the stage (3 / 6 / 9 listeners = Stage 1 / 2 / 3)
 * and every stage remembers its best real run. Nothing here is invented: a fresh install has no records, so every stage shows empty stars.
 * Records are kept through a small key-value store (Lens PersistentStorageSystem on the device, see EyesUpApp) and survive a restart.
 * Pure TypeScript, no Lens Studio API.
 */
import { BestRun, GameResult, Grade } from './GameScore';

export const AUDIENCE_OPTIONS = [3, 6, 9] as const;
export const BESTS_STORE_KEY = 'eyesup.bests.v1';

export interface KeyValueStore {
  getString(key: string): string;
  putString(key: string, value: string): void;
}

export interface StageBest extends BestRun {
  points: number;
  /** Most stars earned on this stage in any run (0..3). */
  stars: number;
}

/** 3 / 6 / 9 listeners -> 1 / 2 / 3; an audience size outside the options maps to the nearest stage at or below it. */
export function stageNumber(audience: number): number {
  let stage = 1;
  AUDIENCE_OPTIONS.forEach((n, i) => {
    if (audience >= n) stage = i + 1;
  });
  return stage;
}

/** Header line: "STAGE 1 - 3 listeners". */
export function stageHeader(audience: number): string {
  return `STAGE ${stageNumber(audience)} - ${audience} listeners`;
}

/** Stage card title: "Stage 1". */
export function stageCardTitle(audience: number): string {
  return `Stage ${stageNumber(audience)}`;
}

/** Stage card footer: "Best 1240", or "Not played" when this stage has no finished run. */
export function stageCardBest(best: StageBest | null): string {
  return best ? `Best ${best.points}` : 'Not played';
}

/** Which of the three stars are filled, left to right. */
export function starRow(stars: number): [boolean, boolean, boolean] {
  const n = Math.max(0, Math.min(3, Math.floor(stars)));
  return [n >= 1, n >= 2, n >= 3];
}

const GRADES: readonly Grade[] = ['S', 'A', 'B', 'C'];

function isRecord(v: unknown): v is StageBest {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.points === 'number' && Number.isFinite(r.points) && r.points >= 0 &&
    typeof r.stars === 'number' && r.stars >= 1 && r.stars <= 3 &&
    typeof r.score === 'number' && Number.isFinite(r.score) &&
    typeof r.grade === 'string' && GRADES.includes(r.grade as Grade)
  );
}

/** The best finished run per stage, read from and written through `store` (in memory when there is none; corrupt data reads as no record). */
export class StageBests {
  private records = new Map<number, StageBest>();

  constructor(private readonly store: KeyValueStore | null = null) {
    this.load();
  }

  private load(): void {
    if (!this.store) return;
    let raw = '';
    try {
      raw = this.store.getString(BESTS_STORE_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const key of Object.keys(parsed)) {
        const value = parsed[key];
        if (AUDIENCE_OPTIONS.includes(Number(key) as (typeof AUDIENCE_OPTIONS)[number]) && isRecord(value)) this.records.set(Number(key), value);
      }
    } catch {
      this.records.clear();
    }
  }

  private save(): void {
    if (!this.store) return;
    const out: Record<string, StageBest> = {};
    this.records.forEach((v, k) => (out[String(k)] = v));
    try {
      this.store.putString(BESTS_STORE_KEY, JSON.stringify(out));
    } catch {
      // Storage failing must never break the run; the record stays in memory.
    }
  }

  get(audience: number): StageBest | null {
    const r = this.records.get(audience);
    return r ? { ...r } : null;
  }

  /** Remember a finished run: the higher points replace the best, stars only ever go up. */
  record(audience: number, result: GameResult): void {
    const prev = this.records.get(audience);
    const better = !prev || result.points > prev.points;
    const base = better ? { score: result.score, grade: result.grade, points: result.points } : { score: prev.score, grade: prev.grade, points: prev.points };
    this.records.set(audience, { ...base, stars: Math.max(prev?.stars ?? 0, result.stars) });
    this.save();
  }

  /** Forget every stage (LEAF: a scenario that needs a known first run). */
  clear(): void {
    this.records.clear();
    this.save();
  }
}
