/**
 * LiveScore.ts — the live points / combo layer on top of real eye contact (game layer, cycle 1 of the "win" loop).
 *
 * A listener is *lit* once you have looked at them continuously for `litSeconds` (the halo's 1 s fill). Every number here comes
 * from that real dwell, so the only way to score well is the actual skill: spreading eye contact across the room.
 *
 * - Lighting a listener (not-lit -> lit) gives `LIGHT_POINTS` (10) × the combo multiplier.
 * - Holding a lit listener gives `HOLD_POINTS_PER_S` (3) per extra full second, at most `HOLD_MAX_POINTS` per look
 *   (staring at one person is not the skill, so it stops paying after 3 s).
 * - Re-lighting the same listener within `REPEAT_SECONDS` (4 s) of looking away from them gives 0 and breaks the combo.
 * - Combo: distinct listeners lit one after another, each within `COMBO_GAP_SECONDS` (3 s) of the last eye-contact activity
 *   (the previous lit look's end). x2..x5 (cap); the light multiplier is 1 + 0.25 per step above 1 (x2 -> 1.25, x5 -> 2).
 *   A repeat or a 3 s gap without a new light resets it.
 * Pure TypeScript, no Lens Studio API.
 */

export const LIGHT_POINTS = 10;
export const HOLD_POINTS_PER_S = 3;
export const HOLD_MAX_POINTS = 9;
export const REPEAT_SECONDS = 4;
export const COMBO_GAP_SECONDS = 3;
export const COMBO_CAP = 5;
export const COMBO_STEP = 0.25;

export type ScoreGainKind = 'light' | 'hold';

export interface ScoreGain {
  index: number;
  points: number;
  kind: ScoreGainKind;
  /** Combo after this gain (1 = no chain yet). */
  combo: number;
}

export function comboMultiplier(combo: number): number {
  const c = Math.min(COMBO_CAP, Math.max(1, Math.floor(combo)));
  return 1 + COMBO_STEP * (c - 1);
}

export function lightPoints(combo: number): number {
  return Math.round(LIGHT_POINTS * comboMultiplier(combo));
}

export class LiveScore {
  private looked: number[] = [];
  private lit: boolean[] = [];
  private held: number[] = [];
  private holdPaid: number[] = [];
  /** Session time the listener last stopped being looked at while lit (-Infinity = never). */
  private litEndedAt: number[] = [];
  private time = 0;
  private lastActivity = -Infinity;
  private lastLit = -1;
  private _score = 0;
  private _combo = 0;
  private _lastGain: ScoreGain | null = null;
  private _comboBrokenAt = -Infinity;
  private _lights = 0;
  private _repeats = 0;

  constructor(private readonly litSeconds = 1) {}

  reset(count: number): void {
    this.looked = new Array<number>(count).fill(0);
    this.lit = new Array<boolean>(count).fill(false);
    this.held = new Array<number>(count).fill(0);
    this.holdPaid = new Array<number>(count).fill(0);
    this.litEndedAt = new Array<number>(count).fill(-Infinity);
    this.time = 0;
    this.lastActivity = -Infinity;
    this.lastLit = -1;
    this._score = 0;
    this._combo = 0;
    this._lastGain = null;
    this._comboBrokenAt = -Infinity;
    this._lights = 0;
    this._repeats = 0;
  }

  get score(): number {
    return this._score;
  }

  /** Current chain length (0 or 1 = no combo shown; the HUD shows x2..x5). */
  get combo(): number {
    return this._combo;
  }

  get lastGain(): ScoreGain | null {
    return this._lastGain;
  }

  /** Session seconds when the combo last broke (-Infinity = never). */
  get comboBrokenAt(): number {
    return this._comboBrokenAt;
  }

  get elapsed(): number {
    return this.time;
  }

  /** Distinct-light count (scored lights) and repeats (0-point re-lights) this run. */
  get lights(): number {
    return this._lights;
  }

  get repeats(): number {
    return this._repeats;
  }

  isLit(i: number): boolean {
    return this.lit[i] ?? false;
  }

  /** Advance by `dt` with who is looked at this frame; returns the gains scored this frame (in member order). */
  update(dt: number, looking: readonly boolean[]): ScoreGain[] {
    const gains: ScoreGain[] = [];
    if (!(dt > 0)) return gains;
    this.time += dt;
    for (let i = 0; i < this.lit.length; i++) {
      if (looking[i]) {
        this.looked[i] += dt;
        if (!this.lit[i]) {
          if (this.looked[i] >= this.litSeconds - 1e-9) this.light(i, gains);
        } else {
          this.held[i] += dt;
          this.lastActivity = this.time;
          const due = Math.min(HOLD_MAX_POINTS, HOLD_POINTS_PER_S * Math.floor(this.held[i] + 1e-9));
          if (due > this.holdPaid[i]) {
            const pts = due - this.holdPaid[i];
            this.holdPaid[i] = due;
            this._score += pts;
            const g: ScoreGain = { index: i, points: pts, kind: 'hold', combo: Math.max(1, this._combo) };
            this._lastGain = g;
            gains.push(g);
          }
        }
      } else {
        if (this.lit[i]) {
          this.lit[i] = false;
          this.litEndedAt[i] = this.time;
          this.lastActivity = this.time;
        }
        this.looked[i] = 0;
        this.held[i] = 0;
        this.holdPaid[i] = 0;
      }
    }
    if (this._combo >= 1 && this.time - this.lastActivity > COMBO_GAP_SECONDS && !this.lit.some((l) => l)) this.breakCombo();
    return gains;
  }

  private light(i: number, gains: ScoreGain[]): void {
    this.lit[i] = true;
    this.held[i] = 0;
    this.holdPaid[i] = 0;
    const repeat = this.time - this.litEndedAt[i] < REPEAT_SECONDS;
    this.lastActivity = this.time;
    if (repeat) {
      this._repeats++;
      this.breakCombo();
      this.lastLit = i;
      return;
    }
    // The same listener twice in a row (after 4 s) still scores, but it is not a chain across the room.
    const chained = this._combo >= 1 && this.lastLit >= 0 && i !== this.lastLit;
    this._combo = chained ? Math.min(COMBO_CAP, this._combo + 1) : 1;
    this.lastLit = i;
    const pts = lightPoints(this._combo);
    this._score += pts;
    this._lights++;
    const g: ScoreGain = { index: i, points: pts, kind: 'light', combo: this._combo };
    this._lastGain = g;
    gains.push(g);
  }

  private breakCombo(): void {
    if (this._combo >= 2) this._comboBrokenAt = this.time;
    this._combo = 0;
  }
}

/** HUD text for the score counter: "SCORE 0120" (4 digits, grows past 9999). */
export function scoreLabel(score: number): string {
  return `SCORE ${String(Math.max(0, Math.round(score))).padStart(4, '0')}`;
}

/** "COMBO x3" for a combo of 2 or more, else ''. */
export function comboLabel(combo: number): string {
  return combo >= 2 ? `COMBO x${Math.min(COMBO_CAP, combo)}` : '';
}

/** Counter tick: the displayed value eases from `from` to `to` over `seconds` (200 ms); `t` = seconds since the gain. */
export function tickValue(from: number, to: number, t: number, seconds = 0.2): number {
  if (t >= seconds) return to;
  if (t <= 0) return from;
  return Math.round(from + (to - from) * (t / seconds));
}

/** 1.15x punch at the gain that settles to 1 over `seconds`. */
export function punchScale(t: number, peak = 1.15, seconds = 0.2): number {
  if (t < 0 || t >= seconds) return 1;
  return peak - (peak - 1) * (t / seconds);
}

/** "+10" float: rises `riseCm` and fades over `seconds` with ease-out. Returns null once done. */
export function floatPop(t: number, riseCm = 8, seconds = 0.4): { y: number; alpha: number } | null {
  if (t < 0 || t >= seconds) return null;
  const k = t / seconds;
  const ease = 1 - (1 - k) * (1 - k);
  return { y: riseCm * ease, alpha: 1 - k * k };
}
