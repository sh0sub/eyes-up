/** LEAF `dwell_expands_pill`: 1.1 s of gaze on the pill expands the card. */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { sleep, waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { lookAtMember, lookAtPill, setUp, startAndWaitForRehearsal, textOf } from './EyesUpLeafHelpers';

@component
export class DwellExpandsPill extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp();
    await startAndWaitForRehearsal(rig);
    lookAtMember(rig, 0);
    await waitUntil(() => rig.session.cardMode === 'pill', 6000);
    lookAtPill(rig);
    await sleep(1100);
    expect(rig.session.cardMode, 'card mode after 1.1 s dwell').toBe('card');
    expect(textOf('CueCardTitle'), 'expanded card title').toBe('The problem');
  }
}
