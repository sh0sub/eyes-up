/**
 * End-to-end simulation of one rehearsal, without Lens Studio:
 * Setup -> Start -> audience placed -> scripted gaze sequence -> attention / halo -> nudge fires,
 * resolves and respects cooldown -> cue card Next / pill / dwell -> stage line -> Finish ->
 * applause -> Summary stats -> Again / Done.
 *
 * Each `it` block's name maps 1:1 to a LEAF scenario from docs/plan.md ("LEAF 시나리오").
 * The LEAF versions still have to be written and run inside Lens Studio (D8, #30); this test
 * proves the logic those scenarios will exercise.
 */
import { EyesUpSession } from '../../Assets/Scripts/core/EyesUpSession';
import { ScriptedGazeProvider } from '../../Assets/Scripts/GazeProvider';
import { horizontalDistance } from '../../Assets/Scripts/core/math';
import { podiumState } from '../../Assets/Scripts/core/PodiumModel';
import { summaryState } from '../../Assets/Scripts/core/SummaryModel';
import { FakeScene } from '../helpers/fakeViews';
import { HEAD, runFor } from '../helpers/fixtures';

describe('Eyes Up rehearsal — simulated end-to-end (LEAF scenarios 1-6)', () => {
  const gaze = new ScriptedGazeProvider(HEAD);
  const scene = new FakeScene();
  const session = new EyesUpSession(gaze, {}, scene.views());
  session.onEvent((e) => scene.events.push(e));
  const tick = (s: number) => runFor(s, (dt) => session.update(dt));
  const lookAt = (i: number) => gaze.lookAt(session.layout!.eyeTargets[i]);
  const count = (type: string) => scene.events.filter((e) => e.type === type).length;

  it('setup: lens start lands on Setup with defaults 3 min / 6 / Eyes Up pitch', () => {
    session.launch();
    expect(session.phase).toBe('Setup');
    expect(session.config).toEqual({ lengthMinutes: 3, audienceCount: 6, deckId: 'eyes-up-pitch' });
  });

  it('1 start_places_audience: Start -> after 0.6 s, 6 audience members active at 250±5 cm', () => {
    session.start();
    tick(0.6);
    expect(session.phase).toBe('Rehearsal');
    expect(scene.audienceVisible).toBe(true);
    expect(scene.audienceActiveCount).toBe(6);
    expect(scene.fade).toBe(1);
    for (const seat of scene.layout!.seats) expect(Math.abs(horizontalDistance(seat, HEAD) - 250)).toBeLessThanOrEqual(5);
  });

  it('2 gaze_fills_halo: gaze on #3 for 1.2 s -> attention[3] >= 0.95, attention[1] <= 0.1; halo brightens + scales', () => {
    lookAt(3);
    tick(1.2);
    expect(session.attentionValues[3]).toBeGreaterThanOrEqual(0.95);
    expect(session.attentionValues[1]).toBeLessThanOrEqual(0.1);
    expect(scene.halos[3].scale).toBeGreaterThan(1.04);
    expect(scene.halos[3].color[3]).toBeGreaterThan(scene.halos[1].color[3]);
  });

  it('3 neglect_triggers_nudge: right zone for 8.5 s -> EdgeHint "left", 1 nudge; look left 0.5 s -> hidden', () => {
    lookAt(4); // right zone; left has been ignored since the rehearsal started
    tick(8.5);
    expect(scene.edgeHint).toBe('left');
    expect(scene.chimes).toEqual(['left']);
    expect(session.nudgeCount).toBe(1);
    expect(session.subStates()).toContain('Nudge');
    lookAt(0);
    tick(0.5);
    expect(scene.edgeHint).toBeNull();
    expect(session.subStates()).not.toContain('Nudge');
  });

  it('nudge cooldown: no second nudge within 8 s of the first, even while zones stay neglected', () => {
    const startsBefore = count('nudgeStart');
    lookAt(5); // back to the right; center has been ignored all along
    tick(1);
    expect(count('nudgeStart')).toBe(startsBefore); // cooldown still active (~1.5 s since first nudge... < 8 s)
    tick(8);
    expect(count('nudgeStart')).toBe(startsBefore + 1); // after cooldown, center (longest neglected) is nudged
    const last = scene.events.filter((e) => e.type === 'nudgeStart').pop();
    expect(last).toMatchObject({ zone: 1, side: 'left' });
    tick(3.1); // chevron times out after 3 s
    expect(scene.edgeHint).toBeNull();
  });

  it('4 next_shows_card_then_pill: Next -> "Why glasses", pill 4.3 s later', () => {
    expect(session.cardMode).toBe('pill'); // card 1 shrank long ago
    session.next();
    expect(scene.card).toEqual({ mode: 'card', text: 'Why glasses' });
    tick(4.3);
    expect(scene.card).toEqual({ mode: 'pill', text: 'Eyes stay up' });
  });

  it('5 dwell_expands_pill: looking at the pill 1.1 s -> card expands again', () => {
    gaze.lookAt(session.layout!.cardAnchor);
    tick(1.1);
    expect(scene.card).toEqual({ mode: 'card', text: 'Why glasses' });
    expect(session.liveStats().cardExpands).toBe(1);
  });

  it('podium shows section and elapsed only when looking down', () => {
    const up = podiumState({
      phase: session.phase,
      gazeForward: gaze.forward,
      cardIndex: session.cardIndex,
      cardTotal: session.cardTotal,
      elapsedSeconds: session.elapsedSeconds,
      podiumPitchDeg: session.t.podiumPitchDeg,
    });
    expect(up.visible).toBe(false);
    gaze.lookAt(session.layout!.podiumPosition);
    const down = podiumState({ ...up, phase: session.phase, gazeForward: gaze.forward, cardIndex: session.cardIndex, cardTotal: session.cardTotal, elapsedSeconds: session.elapsedSeconds, podiumPitchDeg: session.t.podiumPitchDeg });
    expect(down.visible).toBe(true);
    expect(down.sectionLabel).toBe('2 / 5');
    const timed = podiumState({
      phase: session.phase,
      gazeForward: gaze.forward,
      cardIndex: session.cardIndex,
      cardTotal: session.cardTotal,
      elapsedSeconds: 81,
      targetSeconds: session.targetSeconds,
      podiumPitchDeg: session.t.podiumPitchDeg,
    });
    expect(timed.timerLabel).toBe('1:21 / 3:00');
    expect(session.cardCountdown).toBeGreaterThan(0); // Next just opened "Why glasses"
  });

  it('balanced gaze sweep for the rest of the talk; stage line pulses at 60 s / 30 s and turns amber at 0 s', () => {
    // Sweep left/center/right evenly until 3:05 (past the 3:00 target).
    const order = [0, 2, 4, 5, 3, 1];
    for (let k = 0; session.elapsedSeconds < 185 - 1e-6; k++) {
      lookAt(order[k % order.length]);
      tick(Math.min(2, 185 - session.elapsedSeconds));
    }
    const pulses = scene.events.filter((e) => e.type === 'pulse');
    expect(pulses).toEqual([
      { type: 'pulse', count: 1, remaining: 60 },
      { type: 'pulse', count: 2, remaining: 30 },
    ]);
    expect(scene.stageLine.amber).toBe(true);
    expect(scene.sfx).toContain('tone');
    expect(session.subStates()).toContain('TimeUp');
  });

  it('6 finish_shows_summary: Finish -> applause 1.5 s -> Summary; zone % sum 100±1, time m:ss', () => {
    expect(session.finish()).toBe(true);
    expect(scene.sfx).toContain('applause');
    tick(1.6);
    expect(session.phase).toBe('Summary');
    const snap = session.summary!;
    const view = summaryState(snap, 1);
    const sum = snap.zonePercents[0] + snap.zonePercents[1] + snap.zonePercents[2];
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(1);
    expect(view.timeLabel).toMatch(/^\d+:\d{2}$/);
    expect(view.timeLabel).toBe('3:05');
    // The sweep was even, but the opening (pill dwell, podium, nudge drills) skews it slightly.
    expect(snap.balanceScore).toBeGreaterThan(70);
    // 3 nudges: left (8 s), center (after cooldown), and left again while the speaker stared
    // right during the card drill — the stats count must match the emitted events.
    expect(snap.nudges).toBe(count('nudgeStart'));
    expect(snap.nudges).toBe(3);
    expect(snap.cardExpands).toBe(1);
    // Longest look-away: center was ignored from ~1.3 s (after #3) until the pill dwell (~26.7 s).
    expect(snap.longestLookAway.seconds).toBeGreaterThan(15);
    expect(snap.longestLookAway.zoneName).toBe('center');
  });

  it('Again restarts with the same config and fresh stats; Done returns to Setup', () => {
    expect(session.again()).toBe(true);
    tick(0.6);
    expect(session.phase).toBe('Rehearsal');
    expect(session.nudgeCount).toBe(0);
    expect(session.liveStats().cardExpands).toBe(0);
    expect(scene.card).toEqual({ mode: 'card', text: 'The problem' });
    session.finish();
    tick(1.6);
    expect(session.done()).toBe(true);
    expect(session.phase).toBe('Setup');
    expect(scene.audienceVisible).toBe(false);
  });
});
