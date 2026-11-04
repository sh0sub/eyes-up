import { EyesUpSession, applauseScale } from '../../Assets/Scripts/core/EyesUpSession';
import { ScriptedGazeProvider } from '../../Assets/Scripts/GazeProvider';
import { v3 } from '../../Assets/Scripts/core/math';
import { FakeScene } from '../helpers/fakeViews';
import { HEAD, runFor } from '../helpers/fixtures';

function harness() {
  const gaze = new ScriptedGazeProvider(HEAD);
  const scene = new FakeScene();
  const s = new EyesUpSession(gaze, {}, scene.views());
  s.onEvent((e) => scene.events.push(e));
  const tick = (sec: number) => runFor(sec, (dt) => s.update(dt));
  const lookAtMember = (i: number) => gaze.lookAt(s.layout!.eyeTargets[i]);
  return { s, gaze, scene, tick, lookAtMember };
}

function toRehearsal() {
  const h = harness();
  h.s.launch();
  h.s.configure({ audienceCount: 6 }); // the default audience is 3 (Cycle 3); these rules use two members per zone
  h.s.start();
  h.tick(0.6);
  return h;
}

describe('EyesUpSession / EyesUpApp core (M1 #3, #7)', () => {
  it('Launch -> Setup on lens start; Setup -> Placing on Start (tick SFX); Placing -> Rehearsal after 0.5 s fade', () => {
    const { s, scene, tick } = harness();
    expect(s.phase).toBe('Launch');
    s.launch();
    expect(s.phase).toBe('Setup');
    s.start();
    expect(s.phase).toBe('Placing');
    expect(scene.sfx).toContain('tick');
    tick(0.25);
    expect(scene.fade).toBeCloseTo(0.5, 1);
    expect(s.phase).toBe('Placing');
    tick(0.3);
    expect(s.phase).toBe('Rehearsal');
    expect(scene.audienceVisible).toBe(true);
  });

  it('Rehearsal start shows card 1 (CardExpanded) then pill after 4 s', () => {
    const { s, scene, tick } = toRehearsal();
    expect(s.subStates()).toContain('CardExpanded');
    expect(scene.card).toEqual({ mode: 'card', text: 'The problem' });
    tick(4.1);
    expect(s.subStates()).not.toContain('CardExpanded');
    expect(scene.card.mode).toBe('pill');
  });

  it('Rehearsal -> Nudge after 8 s neglect; Nudge -> Rehearsal when gaze reaches the zone', () => {
    const { s, tick, lookAtMember, scene } = toRehearsal();
    lookAtMember(5);
    tick(8.5);
    expect(s.subStates()).toContain('Nudge');
    expect(scene.edgeHint).toBe('left');
    lookAtMember(0);
    tick(1 / 60);
    expect(s.subStates()).not.toContain('Nudge');
  });

  it('pinch Next/Prev and pill dwell >= 1 s enter CardExpanded; 4 s later back to pill', () => {
    const { s, gaze, tick } = toRehearsal();
    tick(4.1);
    expect(s.next()).toBe(true);
    expect(s.cardTitle).toBe('Why glasses');
    expect(s.subStates()).toContain('CardExpanded');
    tick(4.1);
    expect(s.cardMode).toBe('pill');
    gaze.lookAt(s.layout!.cardAnchor);
    tick(1.1);
    expect(s.cardMode).toBe('card');
    expect(s.liveStats().cardExpands).toBe(1);
    expect(s.prev()).toBe(true);
    expect(s.cardTitle).toBe('The problem');
  });

  it('pass 7 regression: dwell works with a nudge showing and when the pill reappears under the gaze', () => {
    // Live repro: Start, look right ~12 s (left chevron), Next on the podium, face the audience
    // until the pill, dwell on it; the card re-expands, then shrinks back under the gaze.
    const { s, gaze, tick, lookAtMember, scene } = toRehearsal();
    lookAtMember(5);
    tick(9); // nudge fires at 8 s and shows for 3 s
    expect(scene.edgeHint).toBe('left');
    gaze.setForward(v3(0, -0.5, -0.86)); // podium
    expect(s.next()).toBe(true);
    lookAtMember(2);
    tick(4.1);
    expect(s.cardMode).toBe('pill');
    expect(s.pillRect).not.toBeNull();
    // Facing the centre leaves the sides neglected: wait (still facing the room) for the next chevron.
    let guard = 0;
    while (!s.activeNudge && guard++ < 60 * 20) tick(1 / 60);
    expect(scene.edgeHint).not.toBeNull();
    expect(s.cardMode).toBe('pill');

    // Dwell #1 with the chevron visible: ~1 s on the pill re-expands the card.
    gaze.lookAt(s.pillRect!.center);
    tick(0.9);
    expect(s.cardMode).toBe('pill');
    expect(s.activeNudge).not.toBeNull();
    expect(scene.edgeHint).not.toBeNull();
    tick(0.2);
    expect(s.cardMode).toBe('card');
    expect(s.liveStats().cardExpands).toBe(1);

    // Keep looking at the same spot: the card shrinks back to the pill under the gaze.
    guard = 0;
    while (s.cardMode !== 'pill' && guard++ < 60 * 10) tick(1 / 60);
    expect(s.cardMode).toBe('pill');
    // Armed on reappearance: ~1 s of continuous gaze re-expands it (before pass 7: latched forever).
    tick(0.9);
    expect(s.cardMode).toBe('pill');
    tick(0.2);
    expect(s.cardMode).toBe('card');
    expect(s.liveStats().cardExpands).toBe(2);
  });

  it('Rehearsal -> TimeUp at elapsed >= target; Finish still works from TimeUp; finishPrompt at +30 s', () => {
    const { s, tick, scene } = harness();
    s.launch();
    s.configure({ lengthMinutes: 3 });
    s.start();
    tick(0.6);
    tick(180.1);
    expect(s.subStates()).toContain('TimeUp');
    expect(scene.stageLine.amber).toBe(true);
    expect(scene.events.some((e) => e.type === 'finishPrompt')).toBe(false);
    tick(30);
    expect(scene.events.filter((e) => e.type === 'finishPrompt')).toHaveLength(1);
    expect(s.finish()).toBe(true);
    expect(s.phase).toBe('Finishing');
  });

  it('Finishing -> Summary after 1.5 s applause (scale 0.95..1.05), summary frozen at Finish', () => {
    const { s, tick, scene } = toRehearsal();
    tick(5);
    s.finish();
    expect(scene.sfx).toContain('applause');
    expect(scene.card.mode).toBe('hidden');
    tick(1.4);
    expect(s.phase).toBe('Finishing');
    tick(0.15);
    expect(s.phase).toBe('Summary');
    const sc = scene.applauseScales.filter((x) => x !== 1);
    expect(Math.max(...sc)).toBeLessThanOrEqual(1.05 + 1e-9);
    expect(Math.min(...sc)).toBeGreaterThanOrEqual(0.95 - 1e-9);
    expect(s.summary!.durationSeconds).toBeCloseTo(5.1, 1); // 0.1 s of the 0.6 s warm-up tick is already rehearsal
  });

  it('Summary -> Placing on Again (same config, fresh stats) and -> Setup on Done', () => {
    const { s, tick } = toRehearsal();
    s.finish();
    tick(1.6);
    expect(s.again()).toBe(true);
    expect(s.phase).toBe('Placing');
    expect(s.summary).toBeNull();
    tick(0.6);
    expect(s.elapsedSeconds).toBeLessThan(0.1);
    s.finish();
    tick(1.6);
    expect(s.done()).toBe(true);
    expect(s.phase).toBe('Setup');
  });

  it('Re-place from anywhere after Launch re-lays the stage on the current head yaw', () => {
    const { s, gaze, tick } = toRehearsal();
    gaze.setForward(v3(1, 0, 0));
    expect(s.replace()).toBe(true);
    expect(s.phase).toBe('Placing');
    expect(s.layout!.stageCenter.x).toBeCloseTo(250, 6);
    tick(0.6);
    expect(s.phase).toBe('Rehearsal');
  });

  it('Re-place from the Summary panel (artifact F2) re-seats the stage and restarts the talk', () => {
    const { s, gaze, tick } = toRehearsal();
    s.finish();
    tick(1.6);
    expect(s.phase).toBe('Summary');
    gaze.setForward(v3(-1, 0, 0));
    expect(s.replace()).toBe(true);
    expect(s.phase).toBe('Placing');
    expect(s.summary).toBeNull();
    expect(s.layout!.stageCenter.x).toBeCloseTo(-250, 6);
    tick(0.6);
    expect(s.phase).toBe('Rehearsal');
  });

  it('ignores illegal pinches and validates config', () => {
    const { s } = harness();
    expect(s.start()).toBe(false);
    expect(s.next()).toBe(false);
    expect(s.finish()).toBe(false);
    s.launch();
    expect(() => s.configure({ deckId: 'missing' })).toThrow();
    expect(s.configure({ audienceCount: 9, deckId: 'self-intro' })).toBe(true);
    s.start();
    expect(s.configure({ audienceCount: 3 })).toBe(false);
    expect(s.layout!.seats).toHaveLength(9);
  });

  it('applauseScale shape', () => {
    expect(applauseScale(0, 1.5)).toBe(1);
    expect(applauseScale(0.125, 1.5)).toBeCloseTo(1.05, 9);
    expect(applauseScale(0.375, 1.5)).toBeCloseTo(0.95, 9);
    expect(applauseScale(2, 1.5)).toBe(1);
  });
});

describe('game layer in the session', () => {
  it('a neglected member slumps, the room meter drops, and looking recovers it with a perk-up', () => {
    const { s, scene, tick, lookAtMember } = toRehearsal();
    lookAtMember(0);
    tick(18);
    expect(s.engagementValues[4]).toBeLessThan(0.5);
    expect(scene.looks[4].headDropCm).toBeLessThan(-8);
    expect(scene.looks[4].phoneGlow).toBeGreaterThan(0);
    expect(s.engagementValues[0]).toBe(1);
    expect(scene.meter!.level).toBeLessThan(0.8);
    expect(scene.meter!.tone).not.toBe('low');
    const before = scene.meter!.level;
    lookAtMember(4);
    tick(2);
    expect(s.engagementValues[4]).toBe(1);
    expect(scene.events.some((e) => e.type === 'perkUp' && e.index === 4)).toBe(true);
    expect(scene.meter!.level).toBeGreaterThan(before);
  });

  it('Finish yields a score and grade; applause scales with it; best-previous is remembered across Again', () => {
    const { s, scene, tick, lookAtMember } = toRehearsal();
    for (const i of [0, 2, 5, 1, 3, 4]) {
      lookAtMember(i);
      tick(1.5);
    }
    expect(s.finish()).toBe(true);
    const first = s.game!;
    expect(first.bestPrevious).toBeNull();
    expect(first.score).toBeGreaterThan(40);
    expect(scene.applauseVolume).toBeCloseTo(0.3 + 0.7 * (first.score / 100), 6);
    tick(1.6);
    expect(s.phase).toBe('Summary');
    expect(s.again()).toBe(true);
    tick(0.6);
    expect(s.game).toBeNull();
    // a run that ignores the room scores lower and sees the earlier best
    lookAtMember(0);
    tick(30);
    s.finish();
    const second = s.game!;
    expect(second.score).toBeLessThan(first.score);
    expect(second.bestPrevious?.score).toBe(first.score);
    expect(second.newBest).toBe(false);
  });

  it('a lowest-score finish gives a smaller applause pulse than a high-score one', () => {
    expect(Math.abs(applauseScale(0.125, 1.5, 0.09) - 1)).toBeGreaterThan(Math.abs(applauseScale(0.125, 1.5, 0.02) - 1));
    expect(applauseScale(0.125, 1.5)).toBeCloseTo(applauseScale(0.125, 1.5, 0.05), 12);
  });
});
