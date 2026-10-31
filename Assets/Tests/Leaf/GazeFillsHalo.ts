/** LEAF `gaze_fills_halo`: after 1.2 s of scripted gaze on #3, attention[3] ≥ 0.95 and #1 ≤ 0.1. */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { lookAtMember, setUp, startAndWaitForRehearsal } from './EyesUpLeafHelpers';

@component
export class GazeFillsHalo extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp();
    await startAndWaitForRehearsal(rig);
    lookAtMember(rig, 3);
    await sleep(1200);
    const a = rig.session.attentionValues;
    expect(a[3], 'attention[3]').toBeGreaterThan(0.95 - 1e-6);
    expect(a[1], 'attention[1]').toBeLessThan(0.1 + 1e-6);
  }
}
