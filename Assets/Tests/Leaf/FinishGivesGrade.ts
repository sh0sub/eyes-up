/**
 * LEAF `finish_gives_grade` (game layer): after a short balanced sweep, Finish shows the Summary with a
 * grade tile (S/A/B/C) and "Score n" text that matches the session's game result. Win cycle 1: the live score rises only when the gaze
 * lights a new listener, and stays flat on a repeat within 4 s.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { sleep, waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { boxTextOf, lookAtMember, lookDownAtPodium, setUp, startAndWaitForRehearsal, tap } from './EyesUpLeafHelpers';

@component
export class FinishGivesGrade extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp(6); // six people: these checks use members in every zone
    await startAndWaitForRehearsal(rig);
    let last = rig.session.score;
    for (const i of [0, 2, 4, 1, 3, 5]) {
      lookAtMember(rig, i);
      await sleep(1100);
      expect(rig.session.score, `score after lighting #${i + 1}`).toBeGreaterThan(last);
      last = rig.session.score;
    }
    // A repeat: back to #6 right after leaving it scores nothing new for the light.
    lookAtMember(rig, 3);
    await sleep(300);
    lookAtMember(rig, 5);
    await sleep(1100);
    const afterRepeat = rig.session.score;
    expect(afterRepeat - last, 'repeat within 4 s adds at most the hold bonus').toBeLessThan(4);
    expect(rig.session.combo, 'repeat breaks the combo').toBe(0);
    await lookDownAtPodium(rig);
    await tap(rig, 'FinishButton');
    await waitUntil(() => rig.session.phase === 'Summary', 4000, () => 'summary');
    await sleep(400);
    const game = rig.session.game;
    expect(game !== null, 'game result').toBe(true);
    if (!game) return;
    const grade = boxTextOf('GradeBadge');
    expect(/^[SABC]$/.test(grade) && grade === game.grade, `grade tile "${grade}" is ${game.grade}`).toBe(true);
    const text = boxTextOf('GameText');
    expect(text.startsWith(`Score ${game.points}`), `game text "${text}" starts with the points ${game.points}`).toBe(true);
    expect(game.points, 'summary points are the live score').toBe(afterRepeat);
    expect(game.score, 'score').toBeGreaterThan(30);
  }
}
