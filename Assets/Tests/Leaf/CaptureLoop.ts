/**
 * Capture helper, NOT a done-criterion test (Cycle 4, A2): `capture_loop` plays the learning loop twice with scripted gaze, to give the
 * Run 1 vs Run 2 table in devpost/ its real numbers. Run 1 stares at the right side of a six-person room and neglects the left
 * (a nervous speaker); Finish gives the Summary and its tip. Again, then Run 2 follows the tip: left first, then the whole room.
 * Everything else is real app logic (engagement, nudge, stats, grade). Numbers are printed as "[capture_loop] run1 ..." / "run2 ..."; the look-away uses the Summary's own formatter (`summaryState`), so the log and the on-screen Summary agree.
 * Gaze is scripted: this is an illustrative loop, not a user study.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep, waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { summaryState, summaryTip } from '../../Scripts/core/SummaryModel';
import { lookAtMember, lookDownAtPodium, muteLeafOverlay, Rig, setUp, startAndWaitForRehearsal, tap } from './EyesUpLeafHelpers';

type Step = readonly [member: number, ms: number];

async function play(rig: Rig, steps: readonly Step[]): Promise<void> {
  for (const [i, ms] of steps) {
    lookAtMember(rig, i);
    await sleep(ms);
  }
}

async function finishAndReport(rig: Rig, label: string): Promise<void> {
  await lookDownAtPodium(rig);
  await tap(rig, 'FinishButton');
  await waitUntil(() => rig.session.phase === 'Summary', 4000, () => 'summary');
  await sleep(3000); // capture only: the Summary stays up long enough for a 1 fps window recorder to catch it (was 500 ms)
  const s = rig.session.summary;
  const g = rig.session.game;
  if (s && g) {
    print(
      `[capture_loop] ${label} grade ${g.grade} score ${g.score} balance ${s.balanceScore} room ${g.engagementPercent}% ` +
        `zones L${s.zonePercents[0]}/C${s.zonePercents[1]}/R${s.zonePercents[2]} longest ${summaryState(s, 1).longestLookAwayLabel.replace(/ · /g, ' ')} ` +
        `nudges ${s.nudges} secs ${Math.round(s.durationSeconds)} tip "${summaryTip(s.zonePercents)}" new-best ${g.newBest}`,
    );
  }
}

@component
export class CaptureLoop extends Scenario {
  async run(): Promise<void> {
    const release = muteLeafOverlay(60);
    try {
      const rig = await setUp(6);
      await startAndWaitForRehearsal(rig);
      // Run 1: the right side gets the talk, the left is ignored.
      await play(rig, [[2, 3000], [4, 6500], [5, 6500], [3, 3000], [4, 3500], [5, 3000], [2, 2500]]);
      await finishAndReport(rig, 'run1');
      await tap(rig, 'AgainButton');
      await waitUntil(() => rig.session.phase === 'Rehearsal', 5000, () => 'rehearsal');
      // Run 2: follow the tip ("look left more"), then sweep the room.
      await play(rig, [[0, 3500], [1, 3000], [2, 2500], [3, 2500], [4, 2500], [5, 2500], [0, 2500], [3, 2000], [5, 2000], [1, 2000], [4, 2000]]);
      await finishAndReport(rig, 'run2');
    } finally {
      release();
    }
  }
}
