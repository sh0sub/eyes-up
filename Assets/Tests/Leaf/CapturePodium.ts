/**
 * Capture helper, NOT a done-criterion test: `capture_podium` starts a rehearsal and leaves the
 * scripted gaze pitched down at the podium (~29°, above the 15° threshold), so a screenshot taken
 * after the scenario returns shows it (devpost 05-podium; the first seconds after Start give 04-cue-card). Three people, LEAF overlay hidden. The preview camera itself is not moved.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { lookDownAtPodium, muteLeafOverlay, setUp, startAndWaitForRehearsal } from './EyesUpLeafHelpers';

@component
export class CapturePodium extends Scenario {
  async run(): Promise<void> {
    const release = muteLeafOverlay(60); // clean captures: no LEAF log text over the preview
    try {
      const rig = await setUp(3);
      await startAndWaitForRehearsal(rig);
      await lookDownAtPodium(rig);
    } finally {
      release();
    }
  }
}
