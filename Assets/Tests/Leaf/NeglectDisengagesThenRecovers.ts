/**
 * LEAF `neglect_disengages_then_recovers` (game layer): after ~17 s of gaze on member 0, member 4 is
 * below 0.5 engagement, its Head has sunk in the scene, the room meter reads below 100% and the room
 * is below 0.9. One look at member 4 for 1.8 s brings it back to full, lifts the head and the meter.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { headYOf, lookAtMember, setUp, startAndWaitForRehearsal, textOf } from './EyesUpLeafHelpers';

@component
export class NeglectDisengagesThenRecovers extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp(6); // six people: these checks use members in every zone
    await startAndWaitForRehearsal(rig);
    const restY = headYOf(rig, 4);
    lookAtMember(rig, 0);
    await sleep(17000);
    const eng = rig.session.engagementValues;
    expect(eng[4], 'engagement[4] after 17 s unseen').toBeLessThan(0.5);
    expect(eng[0], 'engagement[0] while watched').toBeGreaterThan(0.99);
    expect(headYOf(rig, 4), 'Head y of #4 sank').toBeLessThan(restY - 5);
    expect(rig.session.roomAttention, 'room attention').toBeLessThan(0.9);
    const slumpedMeter = textOf('Percent');
    expect(/^\d+%$/.test(slumpedMeter) && slumpedMeter !== '100%', `meter "${slumpedMeter}" dropped`).toBe(true);
    const before = rig.session.roomAttention;
    // Win cycle 1: staring at #1 for 17 s pays the light (+10) and the capped hold (+9) only.
    const scoreBefore = rig.session.score;
    expect(scoreBefore >= 10 && scoreBefore <= 19, `score ${scoreBefore} after staring at one listener is the light plus the capped hold`).toBe(true);
    lookAtMember(rig, 4);
    await sleep(1800);
    expect(rig.session.engagementValues[4], 'engagement[4] after a look').toBeGreaterThan(0.99);
    expect(headYOf(rig, 4), 'Head y of #4 recovered').toBeGreaterThan(restY - 1);
    expect(rig.session.roomAttention, 'room attention rose').toBeGreaterThan(before);
    expect(rig.session.score, 'lighting a new listener scores').toBeGreaterThan(scoreBefore);
    expect(textOf('ScoreText').startsWith('SCORE '), `HUD "${textOf('ScoreText')}"`).toBe(true);
  }
}
