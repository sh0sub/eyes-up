import { SessionStats, TIMELINE_BUCKET_SECONDS } from '../../Assets/Scripts/SessionStats';
import { TIMELINE_MAX_COLUMNS, axisTicks, columnSegments, downsampleZones, gazeTimeline } from '../../Assets/Scripts/core/GazeTimeline';
import { finishPulse, podiumState } from '../../Assets/Scripts/core/PodiumModel';
import { DEFAULT_TUNABLES, Zone } from '../../Assets/Scripts/core/Tunables';
import { v3 } from '../../Assets/Scripts/core/math';
import { runFor } from '../helpers/fixtures';

describe('SessionStats zone history (pass 5, artifact S5 ③)', () => {
  it('one entry per 0.5 s bucket with the zone looked at most; partial last bucket included', () => {
    const s = new SessionStats();
    runFor(1, (dt) => s.update(dt, 0));
    runFor(1, (dt) => s.update(dt, 2));
    runFor(0.5, (dt) => s.update(dt, null));
    runFor(0.2, (dt) => s.update(dt, 1));
    const h = s.snapshot().timeline;
    expect(h.bucketSeconds).toBe(TIMELINE_BUCKET_SECONDS);
    expect(h.zones).toEqual([0, 0, 2, 2, null, 1]);
  });

  it('a bucket split between zones goes to the larger share; zones win ties against nobody', () => {
    const s = new SessionStats();
    s.update(0.2, 0);
    s.update(0.3, 1); // bucket 1: center 0.3 > left 0.2
    s.update(0.25, null);
    s.update(0.25, 2); // bucket 2: tie right vs nobody → right
    s.update(1.0, null); // one long frame spans two buckets
    expect(s.snapshot().timeline.zones).toEqual([1, 2, null, null]);
  });

  it('records nudge times and clears on reset', () => {
    const s = new SessionStats();
    runFor(3, (dt) => s.update(dt, 2));
    s.recordNudge();
    expect(s.snapshot().timeline.nudgeTimes[0]).toBeCloseTo(3, 6);
    s.reset();
    expect(s.snapshot().timeline).toEqual({ bucketSeconds: 0.5, zones: [], nudgeTimes: [] });
  });
});

describe('GazeTimeline (pass 5, artifact S5 ③)', () => {
  it('downsamples to at most 60 columns by majority; short histories pass through', () => {
    const short: Array<Zone | null> = [0, 1, null];
    expect(downsampleZones(short)).toEqual(short);
    const long: Array<Zone | null> = [];
    for (let i = 0; i < 342; i++) long.push(i < 171 ? 1 : 2); // 2:51 at 0.5 s
    const cols = downsampleZones(long);
    expect(cols.length).toBe(TIMELINE_MAX_COLUMNS);
    expect(cols[0]).toBe(1);
    expect(cols[59]).toBe(2);
    expect(downsampleZones([0, 0, 1, null, null, null], 2)).toEqual([0, null]);
    expect(downsampleZones([0, null, null, 2], 2)).toEqual([0, 2]); // zone beats nobody on a tie
  });

  it('merges equal columns into segments (fractions of the strip), skipping nobody', () => {
    expect(columnSegments([0, 0, null, 2])).toEqual([
      { zone: 0, start: 0, end: 0.5 },
      { zone: 2, start: 0.75, end: 1 },
    ]);
  });

  it('axis: 0:00, whole steps, end time; ticks too close to the end are dropped', () => {
    expect(axisTicks(171).map((t) => t.label)).toEqual(['0:00', '1:00', '2:00', '2:51']);
    expect(axisTicks(40).map((t) => t.label)).toEqual(['0:00', '0:15', '0:30', '0:40']);
    expect(axisTicks(62).map((t) => t.label)).toEqual(['0:00', '0:30', '1:02']);
    expect(axisTicks(0)).toEqual([{ at: 0, label: '0:00' }]);
  });

  it('2:51 session: longest look-away on the left outlined from 1:10, nudge marker at 1:23', () => {
    const s = new SessionStats();
    const second = () => Math.floor(s.snapshot().durationSeconds + 1e-9);
    // 0:00–1:12 rotate left/center/right each second (left last seen 1:09–1:10).
    runFor(72, (dt) => s.update(dt, (second() % 3) as Zone));
    runFor(11, (dt) => s.update(dt, second() % 2 === 0 ? 1 : 2)); // left ignored until 1:23
    s.recordNudge();
    runFor(88, (dt) => s.update(dt, (second() % 3) as Zone));
    const tl = gazeTimeline(s.snapshot());
    expect(tl.columns.length).toBe(60);
    expect(tl.longest).not.toBeNull();
    expect(tl.longest?.zone).toBe(0);
    expect(tl.longest?.label).toBe('14 s'); // 1:10 → 1:24 (second 84 is the next "left")
    expect(tl.longest?.start).toBeCloseTo(70 / 171, 2);
    expect(tl.nudges[0]).toBeCloseTo(83 / 171, 2);
    expect(tl.axis.map((a) => a.label)).toEqual(['0:00', '1:00', '2:00', '2:51']);
    expect(tl.segments.every((g) => g.end > g.start && g.start >= 0 && g.end <= 1)).toBe(true);
  });

  it('no outline under 1 s or without session time', () => {
    const s = new SessionStats();
    expect(gazeTimeline(s.snapshot()).longest).toBeNull();
    runFor(0.5, (dt) => s.update(dt, 1));
    expect(gazeTimeline(s.snapshot()).longest).toBeNull();
    expect(gazeTimeline(s.snapshot()).nudges).toEqual([]);
  });
});

describe('Podium Finish pulse (pass 5, artifact S4 / brief)', () => {
  it('rests before the target, 1 Hz wave from the moment it is reached', () => {
    expect(finishPulse(179.9, 180)).toBe(0);
    expect(finishPulse(180, 180)).toBe(1);
    expect(finishPulse(180.5, 180)).toBeCloseTo(0, 9);
    expect(finishPulse(181, 180)).toBeCloseTo(1, 9);
    expect(finishPulse(500, 0)).toBe(0);
    expect(finishPulse(500)).toBe(0);
  });

  it('only during Rehearsal', () => {
    const base = { cardIndex: 0, cardTotal: 5, elapsedSeconds: 181, targetSeconds: 180, gazeForward: v3(0, -1, -1), podiumPitchDeg: DEFAULT_TUNABLES.podiumPitchDeg };
    expect(podiumState({ ...base, phase: 'Rehearsal' }).finishPulse).toBeCloseTo(1, 9);
    expect(podiumState({ ...base, phase: 'Placing' }).finishPulse).toBe(0);
    expect(podiumState({ ...base, phase: 'Rehearsal', elapsedSeconds: 60 }).finishPulse).toBe(0);
  });
});
