/**
 * Pass-2 investigation of build-notes G7 ("repeated nudges stopped showing after the second one").
 * Deterministic scripted gaze through the real EyesUpSession: neglect left → nudge → look left →
 * neglect again → second nudge. Records every frame where the EdgeHint is visible so a missed
 * nudge cannot hide between polls.
 */
import { EyesUpSession } from '../../Assets/Scripts/core/EyesUpSession';
import { ScriptedGazeProvider } from '../../Assets/Scripts/GazeProvider';
import { FakeScene } from '../helpers/fakeViews';
import { HEAD } from '../helpers/fixtures';

function rig() {
  const gaze = new ScriptedGazeProvider(HEAD);
  const scene = new FakeScene();
  const session = new EyesUpSession(gaze, {}, scene.views());
  session.onEvent((e) => scene.events.push(e));
  session.launch();
  session.start();
  let t = 0;
  const shows: Array<{ t: number; side: string; zone: number }> = [];
  session.onEvent((e) => {
    if (e.type === 'nudgeStart') shows.push({ t, side: e.side, zone: e.zone });
  });
  const tick = (s: number) => {
    const dt = 1 / 60;
    for (let i = 0; i < Math.round(s * 60); i++) {
      session.update(dt);
      t += dt;
    }
  };
  tick(0.6); // Placing -> Rehearsal
  const lookAt = (i: number) => gaze.lookAt(session.layout!.eyeTargets[i]);
  return { session, scene, tick, lookAt, shows, now: () => t };
}

describe('Repeated nudges (G7 investigation)', () => {
  it('neglect left → nudge → look left → neglect again → second LEFT nudge', () => {
    const r = rig();
    r.lookAt(4); // right zone
    r.tick(8.5);
    expect(r.scene.edgeHint).toBe('left');
    expect(r.shows.filter((s) => s.zone === 0)).toHaveLength(1);

    r.lookAt(0); // look left: nudge ends
    r.tick(0.5);
    expect(r.scene.edgeHint).toBeNull();
    const leftAt = r.now();

    r.lookAt(4); // neglect left again
    // Left attention reached ~0.5 in 0.5 s; it must drain below 0.2 (12 s drain → ~3.6 s) and then
    // stay there 8 s, so left re-arms ~11.6 s after the look. The center zone (never looked at)
    // takes the next cooldown slot (first nudge + 8 s), so left gets the slot after (first + 16 s).
    r.tick(20);
    const leftNudges = r.shows.filter((s) => s.zone === 0);
    expect(leftNudges.length).toBeGreaterThanOrEqual(2);
    expect(leftNudges[1].side).toBe('left');
    expect(leftNudges[1].t - leftAt).toBeGreaterThan(11.5); // not before it re-armed
    expect(leftNudges[1].t - r.shows[0].t).toBeCloseTo(16, 1); // first free cooldown slot
    expect(r.shows.map((s) => s.zone)).toEqual([0, 1, 0]); // left, center, left — nothing dropped
    // the chevron really came back (view adapter saw a second 'left' show + chime)
    expect(r.scene.chimes.filter((c) => c === 'left').length).toBeGreaterThanOrEqual(2);
  });

  it('a long one-sided talk keeps nudging every cooldown (no "stops after the second")', () => {
    const r = rig();
    r.lookAt(5);
    r.tick(60);
    // left and center alternate, one start per 8 s cooldown: t ≈ 8, 16, 24, 32, 40, 48, 56
    expect(r.shows.length).toBe(7);
    expect(r.session.nudgeCount).toBe(7);
    for (let i = 1; i < r.shows.length; i++) expect(r.shows[i].t - r.shows[i - 1].t).toBeCloseTo(8, 1);
    // every nudge is hidden again after 3 s, so the next show is a visible on-edge
    expect(r.scene.events.filter((e) => e.type === 'nudgeEnd')).toHaveLength(7);
  });

  it('after a zone was fully watched, its next nudge needs drain + 8 s (~17.6 s) plus a free cooldown slot, by design', () => {
    const r = rig();
    r.lookAt(0);
    r.tick(1.5); // left fully lit (attention 1)
    const leftAt = r.now();
    r.lookAt(5);
    r.tick(25);
    const left = r.shows.filter((s) => s.zone === 0);
    expect(left.length).toBeGreaterThanOrEqual(1);
    // 1 → 0.2 at 12 s drain = 9.6 s, then 8 s of neglect → re-armed at ~17.6 s; center holds the
    // 8 s and 16 s slots, so left fires at the 24 s slot (~22.4 s after the look).
    expect(left[0].t - leftAt).toBeGreaterThan(17.5);
    expect(left[0].t - leftAt).toBeLessThan(23);
    expect(r.shows.map((s) => s.zone)).toEqual([1, 1, 0]);
  });
});
