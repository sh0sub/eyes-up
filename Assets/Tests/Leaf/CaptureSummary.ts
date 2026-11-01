/**
 * Capture helper, NOT a done-criterion test (pass 5): `capture_summary` runs a ~50 s rehearsal that
 * is mostly balanced but really gets one nudge, so the Summary shows the coral longest look-away on the gaze
 * timeline and a nudge marker (devpost 06-summary). Everything is real app logic; gaze is scripted.
 * Center, then the right side ~9 s → left nudge → look left → a sweep of the room, Next card, a second sweep → Finish. The LEAF overlay is
 * hidden during the run and for 60 s after, so the Summary can be captured clean.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep, waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { lookAtMember, lookAtPill, lookDownAtPodium, muteLeafOverlay, setUp, startAndWaitForRehearsal, tap } from './EyesUpLeafHelpers';

@component
export class CaptureSummary extends Scenario {
  async run(): Promise<void> {
    const release = muteLeafOverlay(60);
    try {
      const rig = await setUp();
      await startAndWaitForRehearsal(rig);
      lookAtMember(rig, 3);
      await sleep(2000);
      lookAtMember(rig, 5);
      await waitUntil(() => rig.session.activeNudge !== null, 12000, () => 'nudge');
      await sleep(600);
      lookAtMember(rig, 1);
      await sleep(1500);
      // Balanced remainder: sweep the room, take the next card from the podium, read it, sweep again.
      for (const [i, ms] of [
        [0, 2500],
        [2, 2500],
        [3, 2500],
        [4, 2500],
        [5, 2500],
      ] as const) {
        lookAtMember(rig, i);
        await sleep(ms);
      }
      await lookDownAtPodium(rig);
      await tap(rig, 'NextButton');
      // The new card shrinks to its pill after 4 s; a 1.1 s look at the pill re-opens it (counts as a card expand).
      lookAtMember(rig, 0);
      await sleep(1600);
      lookAtMember(rig, 4);
      await sleep(1600);
      lookAtMember(rig, 1);
      await sleep(1600);
      lookAtPill(rig);
      await sleep(1800);
      for (const [i, ms] of [
        [5, 1800],
        [3, 2000],
        [1, 2200],
        [4, 2000],
        [2, 1800],
        [0, 2200],
        [5, 1800],
        [3, 1500],
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
