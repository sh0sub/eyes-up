import { GazeTracker } from '../../Assets/Scripts/GazeTracker';
import { ScriptedGazeProvider } from '../../Assets/Scripts/GazeProvider';
import { DEFAULT_TUNABLES, zoneOf } from '../../Assets/Scripts/core/Tunables';
import { angleDeg, isLeftOf, pitchDeg, v3 } from '../../Assets/Scripts/core/math';
import { HEAD, appPill, defaultLayout, runFor } from '../helpers/fixtures';

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
    const pill = appPill(layout.cardAnchor);
    tracker.setPillTarget(pill);
    gaze.lookAt(pill.center);
    let fired = 0;
    runFor(0.9, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(0);
    runFor(0.2, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(1);
    runFor(3, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(1);
    gaze.lookAt(layout.eyeTargets[0]);
    tracker.update(1 / 60, gaze);
    gaze.lookAt(pill.center);
    runFor(1.1, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(2);
  });

  it('pass 6 regression: facing the centre audience neither dwells nor blocks a later look at the pill', () => {
    // Real camera gaze: the speaker faces the room (centre members) while the pill is up, then looks
    // straight up at the pill — with no detour to a far member. Before pass 6 the 7° cone around
    // cardAnchor covered the centre audience, so the dwell fired early and then stayed latched.
    for (const head of [HEAD, v3(0, 160, -100)]) {
      const { layout, tracker, gaze } = setup();
      gaze.setOrigin(head);
      const pill = appPill(layout.cardAnchor, head);
      tracker.setPillTarget(pill);
      let fired = 0;
      for (const i of [2, 3, 2]) {
        gaze.lookAt(layout.eyeTargets[i]);
        runFor(1.5, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
      }
      gaze.lookAt(v3(0, layout.eyeTargets[2].y, layout.eyeTargets[2].z));
      runFor(1.5, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
      expect(fired).toBe(0);
      gaze.lookAt(pill.center);
      runFor(1.1, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
      expect(fired).toBe(1);
    }
  });

  it('pass 7 regression: a pill that reappears under the gaze is armed (latch cleared while hidden)', () => {
    // Live failure: a dwell fired (latched), the card showed, and the pill came back right where the
    // speaker was looking. The latch only re-armed on an off-pill frame *while a pill target was
    // set*, so it never fired again until the gaze left the pill.
    const { layout, tracker, gaze } = setup();
    const pill = appPill(layout.cardAnchor);
    tracker.setPillTarget(pill);
    gaze.lookAt(pill.center);
    let fired = 0;
    runFor(1.1, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(1);
    // Card expanded for 4 s: no pill target; the gaze never leaves the pill area.
    tracker.setPillTarget(null);
    runFor(4, (dt) => tracker.update(dt, gaze));
    // Pill back under the gaze: needs ~1 s of continuous gaze, then fires once (no loop while staring).
    tracker.setPillTarget(pill);
    runFor(0.9, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(1);
    runFor(0.2, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(2);
    runFor(3, (dt) => (fired += tracker.update(dt, gaze).dwellFired ? 1 : 0));
    expect(fired).toBe(2);
  });

  it('looking at the pill does not count as looking at the nearest audience member', () => {
    const { layout, tracker, gaze } = setup();
    gaze.lookAt(appPill(layout.cardAnchor).center);
    const f = tracker.update(0.016, gaze);
    expect(f.looking.some((l) => l)).toBe(false);
  });

  it('disabling the pill resets partial dwell', () => {
    const { layout, tracker, gaze } = setup();
    const pill = appPill(layout.cardAnchor);
    tracker.setPillTarget(pill);
    gaze.lookAt(pill.center);
    runFor(0.8, (dt) => tracker.update(dt, gaze));
    tracker.setPillTarget(null);
    expect(tracker.pillDwellSeconds).toBe(0);
    tracker.setPillTarget(pill);
    let fired = false;
    runFor(0.5, (dt) => (fired = fired || tracker.update(dt, gaze).dwellFired));
    expect(fired).toBe(false);
  });
});
