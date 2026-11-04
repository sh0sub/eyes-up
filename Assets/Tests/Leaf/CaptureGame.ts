/**
 * Capture helper, NOT a done-criterion test (game layer): `capture_game` picks a 3-person audience, looks at
 * member 2 (right) while members 0 and 1 slump (~19 s, held 4 s: the slump still, camera aimed so 1 and 2 share the frame), then looks at
 * member 1 so the next frames show it perking up in a cyan burst beside the lit member 2 with the room meter amber.
 * The LEAF overlay is hidden during the run and for 60 s after.
 *
 * Stages are marked in the Logger ("[capture_game] slumped" / "perk"), the scenario returns at "perk".
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { lookAtMember, muteLeafOverlay, setUp, startAndWaitForRehearsal, tap } from './EyesUpLeafHelpers';

@component
export class CaptureGame extends Scenario {
  async run(): Promise<void> {
    const release = muteLeafOverlay(90);
    try {
      const rig = await setUp();
      // Three people (not six): the whole audience fits the preview frame, so a slumped member and a lit one share a still.
      await tap(rig, 'Audience_3');
      await sleep(300);
      await startAndWaitForRehearsal(rig);
      lookAtMember(rig, 2);
      await sleep(19000);
      print(`[capture_game] slumped room ${rig.session.roomAttention.toFixed(2)} eng ${rig.session.engagementValues.map((v) => v.toFixed(2)).join(',')}`);
      await sleep(4000); // hold: slumped member 1 beside the lit member 2
      lookAtMember(rig, 1);
      await sleep(450);
      print(`[capture_game] perk eng[1] ${rig.session.engagementValues[1].toFixed(2)}`);
    } finally {
      release();
    }
  }
}
