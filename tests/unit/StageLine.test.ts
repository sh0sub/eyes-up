import { StageLine, StageLineEvent, pulseValue } from '../../Assets/Scripts/StageLine';
import { runFor } from '../helpers/fixtures';

function harness(target = 180) {
  let tones = 0;
  const visuals: number[] = [];
  const line = new StageLine({ apply: (v) => visuals.push(v.pulse) }, { playTimeUpTone: () => tones++ });
  line.reset(target);
  let elapsed = 0;
  const events: StageLineEvent[] = [];
  const advance = (s: number) =>
    runFor(s, (dt) => {
      elapsed += dt;
      events.push(...line.update(elapsed, dt));
    });
  return { line, events, advance, visuals, tones: () => tones };
}

describe('StageLine (#19, S2 #18)', () => {
  it('progress tracks elapsed / target', () => {
    const h = harness(180);
    h.advance(90);
    expect(h.line.current.progress).toBeCloseTo(0.5, 3);
  });

  it('one pulse at 60 s remaining, two at 30 s, each exactly once', () => {
    const h = harness(180);
    h.advance(119.9);
    expect(h.events).toEqual([]);
    h.advance(0.2);
    expect(h.events).toEqual([{ type: 'pulse', count: 1, remaining: 60 }]);
    h.advance(30);
    expect(h.events[1]).toEqual({ type: 'pulse', count: 2, remaining: 30 });
    expect(h.events.filter((e) => e.type === 'pulse')).toHaveLength(2);
  });

  it('pulse brightness rises and returns to 0; 2-pulse shape has two peaks', () => {
    expect(pulseValue(0.2, 1)).toBeCloseTo(1, 6);
    expect(pulseValue(0.5, 1)).toBe(0);
    expect(pulseValue(0.8, 2)).toBeCloseTo(1, 6);
    expect(pulseValue(1.3, 2)).toBe(0);
  });

  it('at 0 s: amber stays on, one tone, rehearsal continues past target (progress clamps at 1)', () => {
    const h = harness(180);
    h.advance(180.1);
    expect(h.line.current.amber).toBe(true);
    expect(h.tones()).toBe(1);
    h.advance(20);
    expect(h.line.current.amber).toBe(true);
    expect(h.line.current.progress).toBe(1);
    expect(h.tones()).toBe(1);
    expect(h.events.filter((e) => e.type === 'timeUp')).toHaveLength(1);
  });

  it('reset clears amber and validates target', () => {
    const h = harness(180);
    h.advance(181);
    h.line.reset(300);
    expect(h.line.current).toEqual({ progress: 0, amber: false, pulse: 0 });
    expect(() => h.line.reset(0)).toThrow();
  });
});
