/**
 * Capture helper, NOT a done-criterion test (pass 5): `capture_summary` runs a short, deliberately
 * unbalanced rehearsal so the Summary shows an amber zone, the coral longest look-away on the gaze
 * timeline and a nudge marker (devpost 06-summary). Everything is real app logic; gaze is scripted.
 * Right side ~9 s → left nudge → a brief look left → center → right → Finish. The LEAF overlay is
 * hidden during the run and for 60 s after, so the Summary can be captured clean.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep, waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { lookAtMember, lookDownAtPodium, muteLeafOverlay, setUp, startAndWaitForRehearsal, tap } from './EyesUpLeafHelpers';

@component
export class CaptureSummary extends Scenario {
  async run(): Promise<void> {
    const release = muteLeafOverlay(60);
    try {
      const rig = await setUp();
      await startAndWaitForRehearsal(rig);
      lookAtMember(rig, 5);
      await waitUntil(() => rig.session.activeNudge !== null, 12000, () => 'nudge');
      await sleep(600);
      lookAtMember(rig, 1);
      await sleep(1500);
      for (const [i, ms] of [
        [2, 2500],
        [3, 2500],
        [4, 2000],
        [5, 3000],
        [3, 2000],
      ] as const) {
        lookAtMember(rig, i);
        await sleep(ms);
      }
      await lookDownAtPodium(rig);
      await tap(rig, 'FinishButton');
      const f = rig.gaze.forward;
      rig.gaze.setForward({ x: f.x, y: 0, z: f.z });
      await waitUntil(() => rig.session.phase === 'Summary', 4000, () => 'summary');
      const s = rig.session.summary;
      if (s) print(`[capture_summary] zones ${s.zonePercents.join('/')} longest ${s.longestLookAway.seconds.toFixed(1)} s ${s.longestLookAway.zoneName} nudges ${s.nudges}`);
    } finally {
      release();
    }
  }
}
