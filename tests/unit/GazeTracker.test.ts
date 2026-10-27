import { GazeTracker } from '../../Assets/Scripts/GazeTracker';
import { ScriptedGazeProvider } from '../../Assets/Scripts/GazeProvider';
import { DEFAULT_TUNABLES, zoneOf } from '../../Assets/Scripts/core/Tunables';
import { angleDeg, isLeftOf, pitchDeg, v3 } from '../../Assets/Scripts/core/math';
import { HEAD, defaultLayout, runFor } from '../helpers/fixtures';

function setup(count = 6) {
  const layout = defaultLayout(count);
  const tracker = new GazeTracker(DEFAULT_TUNABLES);
  tracker.setTargets(layout.eyeTargets);
  const gaze = new ScriptedGazeProvider(HEAD);
  return { layout, tracker, gaze };
}

describe('math helpers', () => {
  it('angleDeg / pitchDeg / isLeftOf', () => {
    expect(angleDeg(v3(1, 0, 0), v3(0, 1, 0))).toBeCloseTo(90, 9);
    expect(pitchDeg(v3(0, -1, -1))).toBeCloseTo(-45, 9);
    expect(isLeftOf(v3(0, 0, -1), v3(-1, 0, 0))).toBe(true);
    expect(isLeftOf(v3(0, 0, -1), v3(1, 0, 0))).toBe(false);
  });
});

describe('GazeTracker (#13, M3 #10)', () => {
  it('zones split the audience into thirds (6 -> 2/2/2, 9 -> 3/3/3)', () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => zoneOf(i, 6))).toEqual([0, 0, 1, 1, 2, 2]);
    expect([0, 2, 3, 5, 6, 8].map((i) => zoneOf(i, 9))).toEqual([0, 0, 1, 1, 2, 2]);
    expect([0, 1, 2].map((i) => zoneOf(i, 3))).toEqual([0, 1, 2]);
  });

  it('looking straight at member 3 -> lookingAt(3) only, gazeZone center', () => {
    const { layout, tracker, gaze } = setup();
    gaze.lookAt(layout.eyeTargets[3]);
    const f = tracker.update(1 / 60, gaze);
    expect(f.angles[3]).toBeCloseTo(0, 6);
    expect(f.looking).toEqual([false, false, false, true, false, false]);
    expect(tracker.lookingAt(3)).toBe(true);
    expect(tracker.gazeZone).toBe(1);
    expect(tracker.zoneLookCounts()).toEqual([0, 1, 0]);
  });

  it('7° threshold: 6.9° off counts, 7.1° off does not', () => {
    const { layout, tracker, gaze } = setup();
    const target = layout.eyeTargets[0];
    const base = Math.atan2(target.x - HEAD.x, -(target.z - HEAD.z));
    const dy = target.y - HEAD.y;
    const dist = Math.hypot(target.x - HEAD.x, target.z - HEAD.z);
    const pitch = Math.atan2(dy, dist);
    const aim = (offDeg: number) => {
      const yaw = base + (offDeg * Math.PI) / 180;
      gaze.setForward(v3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)));
    };
    aim(-6.9);
    tracker.update(0.016, gaze);
    expect(tracker.lookingAt(0)).toBe(true);
    aim(-7.1);
    tracker.update(0.016, gaze);
    expect(tracker.lookingAt(0)).toBe(false);
  });

  it('looking at the floor/podium -> no zone', () => {
    const { tracker, gaze } = setup();
    gaze.setForward(v3(0, -1, -0.2));
    const f = tracker.update(0.016, gaze);
    expect(f.looking.every((l) => !l)).toBe(true);
    expect(f.gazeZone).toBeNull();
  });

  it('pill dwell fires once after 1 s, not before, and re-arms only after looking away', () => {
    const { layout, tracker, gaze } = setup();
    tracker.setPillTarget(layout.cardAnchor);
    gaze.lookAt(layout.cardAnchor);
    let fired = 0;
    runFor(0.9, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(0);
    runFor(0.2, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(1);
    runFor(3, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(1);
    gaze.lookAt(layout.eyeTargets[0]);
    tracker.update(1 / 60, gaze);
    gaze.lookAt(layout.cardAnchor);
    runFor(1.1, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(2);
  });

  it('looking at the pill does not count as looking at the nearest audience member', () => {
    const { layout, tracker, gaze } = setup();
    gaze.lookAt(layout.cardAnchor);
    const f = tracker.update(0.016, gaze);
    expect(f.looking.some((l) => l)).toBe(false);
  });

  it('disabling the pill resets partial dwell', () => {
    const { layout, tracker, gaze } = setup();
    tracker.setPillTarget(layout.cardAnchor);
    gaze.lookAt(layout.cardAnchor);
    runFor(0.8, (dt) => tracker.update(dt, gaze));
    tracker.setPillTarget(null);
    expect(tracker.pillDwellSeconds).toBe(0);
    tracker.setPillTarget(layout.cardAnchor);
    let fired = false;
    runFor(0.5, (dt) => (fired = fired || tracker.update(dt, gaze).dwellFired));
    expect(fired).toBe(false);
  });
});
