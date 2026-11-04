/**
 * Capture helper, NOT a done-criterion test: `capture_nudge_hold` triggers the real left nudge
 * (8 s of gaze on the right) with the hint window stretched from 3 s to 20 s for this run only, so a
 * screenshot taken after the scenario returns still shows the chevron (devpost 03-nudge-chevron).
 * A 3 s window is shorter than the scenario-return + capture round trip. Look and placement are
 * unchanged; only the duration is held. Pass 5: the LEAF overlay is hidden for the capture.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { lookAtMember, muteLeafOverlay, setUp, startAndWaitForRehearsal, tap } from './EyesUpLeafHelpers';

@component
export class CaptureNudgeHold extends Scenario {
  async run(): Promise<void> {
    const release = muteLeafOverlay(30);
    try {
      const rig = await setUp();
      rig.session.t.nudgeHintSeconds = 20; // capture only; the lens default stays 3 s
      // Three people, as in capture_game: the whole audience fits the preview frame, so the outline chevron is judged against real heads.
      await tap(rig, 'Audience_3');
      await startAndWaitForRehearsal(rig);
      lookAtMember(rig, 2);
      await waitUntil(() => rig.session.activeNudge !== null, 10000, () => 'nudge');
    } finally {
      release();
    }
  }
}
