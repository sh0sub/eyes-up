import { SessionStats, balanceScore, roundPercents } from '../../Assets/Scripts/SessionStats';
import { runFor } from '../helpers/fixtures';

describe('SessionStats (#15)', () => {
  it('accumulates zone gaze time and duration (null zone counts toward duration only)', () => {
    const s = new SessionStats();
    runFor(2, (dt) => s.update(dt, 0));
    runFor(3, (dt) => s.update(dt, 1));
    runFor(1, (dt) => s.update(dt, null));
    const snap = s.snapshot();
    expect(snap.durationSeconds).toBeCloseTo(6, 6);
    expect(snap.zoneSeconds[0]).toBeCloseTo(2, 6);
    expect(snap.zoneSeconds[1]).toBeCloseTo(3, 6);
    expect(snap.zoneSeconds[2]).toBe(0);
    expect(snap.zonePercents).toEqual([40, 60, 0]);
  });

  it('video example 22/58/20 and percents always sum to 100', () => {
    expect(roundPercents([22, 58, 20])).toEqual([22, 58, 20]);
    for (const v of [[1, 1, 1], [2, 2, 3], [0.1, 0.7, 0.2], [5, 0, 0]] as const) {
      const p = roundPercents(v as [number, number, number]);
      expect(p[0] + p[1] + p[2]).toBe(100);
    }
    expect(roundPercents([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('longest look-away tracks the longest continuous stretch per zone and its name', () => {
    const s = new SessionStats();
    runFor(11, (dt) => s.update(dt, 2)); // left and center ignored for 11 s
    runFor(1, (dt) => s.update(dt, 0)); // left gets a look, center keeps running
    runFor(1, (dt) => s.update(dt, 1));
    const snap = s.snapshot();
    expect(snap.longestLookAway.zone).toBe(1);
    expect(snap.longestLookAway.zoneName).toBe('center');
    expect(snap.longestLookAway.seconds).toBeCloseTo(12, 6);
    expect(snap.longestLookAway.startSeconds).toBeCloseTo(0, 6);
  });

  it('longest look-away records when it began ("at 1:12"); a later, longer run replaces it', () => {
    const s = new SessionStats();
    // 0:00–1:12: rotate right/center/left every second (center last seen 1:10–1:11, left 1:11–1:12),
    // so no look-away exceeds 2 s.
    runFor(72, (dt) => s.update(dt, (2 - (Math.floor(s.snapshot().durationSeconds + 1e-9) % 3)) as 0 | 1 | 2));
    runFor(11, (dt) => s.update(dt, 2)); // then 11 s on the right: center ignored since 1:11
    let snap = s.snapshot();
    expect(snap.longestLookAway.zoneName).toBe('center');
    expect(snap.longestLookAway.seconds).toBeCloseTo(12, 0);
    expect(snap.longestLookAway.startSeconds).toBeCloseTo(71, 0);
    runFor(1, (dt) => s.update(dt, 1)); // center seen again
    runFor(20, (dt) => s.update(dt, 0)); // right now ignored 21 s, starting at 1:23
    snap = s.snapshot();
    expect(snap.longestLookAway.zoneName).toBe('right');
    expect(snap.longestLookAway.startSeconds).toBeCloseTo(83, 0);
    s.reset();
    expect(s.snapshot().longestLookAway.startSeconds).toBe(0);
  });

  it('first zone to reach the record wins ties (left before center)', () => {
    const s = new SessionStats();
    runFor(11, (dt) => s.update(dt, 2));
    runFor(1, (dt) => s.update(dt, 2));
    expect(s.snapshot().longestLookAway.zoneName).toBe('left');
  });

  it('counts card expansions and nudges', () => {
    const s = new SessionStats();
    s.recordCardExpand();
    s.recordCardExpand();
    s.recordNudge();
    expect(s.snapshot()).toMatchObject({ cardExpands: 2, nudges: 1 });
  });

  it('balance score: 100 even, 0 one-sided, monotonic in between', () => {
    expect(balanceScore([1, 1, 1])).toBe(100);
    expect(balanceScore([0, 5, 0])).toBe(0);
    expect(balanceScore([22, 58, 20])).toBe(63);
    expect(balanceScore([30, 40, 30])).toBeGreaterThan(balanceScore([22, 58, 20]));
    expect(balanceScore([0, 0, 0])).toBe(0);
  });

  it('reset clears everything', () => {
    const s = new SessionStats();
    runFor(1, (dt) => s.update(dt, 0));
    s.recordNudge();
    s.reset();
    expect(s.snapshot()).toMatchObject({ durationSeconds: 0, nudges: 0, cardExpands: 0, zonePercents: [0, 0, 0] });
  });
});
