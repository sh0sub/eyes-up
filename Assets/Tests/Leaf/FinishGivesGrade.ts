/**
 * LEAF `finish_gives_grade` (game layer): after a short balanced sweep, Finish shows the Summary with a
 * grade tile (S/A/B/C) and "Attention n" text that matches the session's game result.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { sleep, waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { boxTextOf, lookAtMember, lookDownAtPodium, setUp, startAndWaitForRehearsal, tap } from './EyesUpLeafHelpers';

@component
export class FinishGivesGrade extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp();
    await startAndWaitForRehearsal(rig);
    for (const i of [0, 2, 4, 1, 3, 5]) {
      lookAtMember(rig, i);
      await sleep(1100);
    }
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
    expect(text.startsWith(`Attention ${game.score}`), `game text "${text}" starts with the score ${game.score}`).toBe(true);
    expect(game.score, 'score').toBeGreaterThan(30);
  }
}
