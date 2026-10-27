/**
 * StageLine.ts — floor line under the audience that shows rehearsal progress (plan S2).
 *
 * - progress = elapsed / target (0..1).
 * - 60 s remaining: one pulse; 30 s remaining: two pulses; 0 s: line turns amber and stays amber,
 *   plus a short tone. The rehearsal keeps going after 0 s (TimeUp sub-state).
 * - The timer digits live on the podium only; the audience side only gets this line.
 *
 * The Lens view draws it with MeshBuilder or a thin Frame and reads `StageLineVisual` each frame.
 */
import { clamp01 } from './core/math';

export interface StageLineVisual {
  progress: number;
  amber: boolean;
  /** 0..1 pulse brightness boost (0 when not pulsing). */
  pulse: number;
}

export interface StageLineView {
  apply(visual: StageLineVisual): void;
}

export interface StageLineAudio {
  playTimeUpTone(): void;
}

export type StageLineEvent = { type: 'pulse'; count: 1 | 2; remaining: 60 | 30 } | { type: 'timeUp' };

/** design: one pulse lasts 0.4 s, pulses are 0.2 s apart. */
export const PULSE_SECONDS = 0.4;
export const PULSE_GAP_SECONDS = 0.2;

const MARKS: ReadonlyArray<{ remaining: 60 | 30; count: 1 | 2 }> = [
  { remaining: 60, count: 1 },
  { remaining: 30, count: 2 },
];

export class StageLine {
  private target = 180;
  private lastElapsed = 0;
  private amber = false;
  private pulseTime = -1;
  private pulseCount = 0;
  private visual: StageLineVisual = { progress: 0, amber: false, pulse: 0 };

  constructor(
    private readonly view?: StageLineView,
    private readonly audio?: StageLineAudio,
  ) {}

  reset(targetSeconds: number): void {
    if (!(targetSeconds > 0)) throw new Error(`target must be > 0, got ${targetSeconds}`);
    this.target = targetSeconds;
    this.lastElapsed = 0;
    this.amber = false;
    this.pulseTime = -1;
    this.pulseCount = 0;
    this.visual = { progress: 0, amber: false, pulse: 0 };
    this.view?.apply(this.visual);
  }

  get current(): StageLineVisual {
    return this.visual;
  }

  get targetSeconds(): number {
    return this.target;
  }

  update(elapsed: number, dt: number): StageLineEvent[] {
    const events: StageLineEvent[] = [];
    const before = this.target - this.lastElapsed;
    const after = this.target - elapsed;
    for (const m of MARKS) {
      if (before > m.remaining && after <= m.remaining && this.target > m.remaining) {
        this.pulseTime = 0;
        this.pulseCount = m.count;
        events.push({ type: 'pulse', count: m.count, remaining: m.remaining });
      }
    }
    if (!this.amber && after <= 0) {
      this.amber = true;
      this.audio?.playTimeUpTone();
      events.push({ type: 'timeUp' });
    }
    this.lastElapsed = elapsed;

    let pulse = 0;
    if (this.pulseTime >= 0) {
      this.pulseTime += dt;
      pulse = pulseValue(this.pulseTime, this.pulseCount);
      if (this.pulseTime >= this.pulseCount * (PULSE_SECONDS + PULSE_GAP_SECONDS)) this.pulseTime = -1;
    }
    this.visual = { progress: clamp01(elapsed / this.target), amber: this.amber, pulse };
    this.view?.apply(this.visual);
    return events;
  }
}

/** Brightness of `count` sine pulses at time `t` after the trigger. */
export function pulseValue(t: number, count: number): number {
  const period = PULSE_SECONDS + PULSE_GAP_SECONDS;
  if (t < 0 || t >= count * period) return 0;
  const local = t % period;
  return local < PULSE_SECONDS ? Math.sin((Math.PI * local) / PULSE_SECONDS) : 0;
}
