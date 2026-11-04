/**
 * Capture helper, NOT a done-criterion test (game layer): `capture_game` looks at the left side, lets
 * the right side slump (~19 s), then looks at member 3 (right of centre, in view in the preview) so a screenshot taken right after the scenario
 * returns shows one member perking up in a cyan burst among slumped neighbours with the room meter amber.
 * The LEAF overlay is hidden during the run and for 60 s after.
 *
 * Stages are marked in the Logger ("[capture_game] slumped" / "perk"), the scenario returns at "perk".
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { lookAtMember, muteLeafOverlay, setUp, startAndWaitForRehearsal } from './EyesUpLeafHelpers';

@component
export class CaptureGame extends Scenario {
  async run(): Promise<void> {
    const release = muteLeafOverlay(90);
    try {
      const rig = await setUp();
      await startAndWaitForRehearsal(rig);
      lookAtMember(rig, 1);
      await sleep(19000);
      print(`[capture_game] slumped room ${rig.session.roomAttention.toFixed(2)} eng ${rig.session.engagementValues.map((v) => v.toFixed(2)).join(',')}`);
      lookAtMember(rig, 3);
      await sleep(450);
      print(`[capture_game] perk eng[3] ${rig.session.engagementValues[3].toFixed(2)}`);
    } finally {
      release();
    }
  }
}
