/**
 * Capture helper, NOT a done-criterion test: `capture_podium` starts a rehearsal and leaves the
 * scripted gaze pitched down at the podium (~29°, above the 15° threshold), so a screenshot taken
 * after the scenario returns shows it (devpost 05-podium). The preview camera itself is not moved.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { lookDownAtPodium, setUp, startAndWaitForRehearsal } from './EyesUpLeafHelpers';

@component
export class CapturePodium extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp();
    await startAndWaitForRehearsal(rig);
    await lookDownAtPodium(rig);
  }
}
