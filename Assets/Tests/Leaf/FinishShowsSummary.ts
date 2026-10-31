/** LEAF `finish_shows_summary`: Finish shows the Summary; zone % sum to 100 ± 1; time shown as "Nice work — m:ss". */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { findSceneObjectByName, sleep, waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { lookAtMember, lookDownAtPodium, setUp, startAndWaitForRehearsal, tap, textOf } from './EyesUpLeafHelpers';

@component
export class FinishShowsSummary extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp();
    await startAndWaitForRehearsal(rig);
    lookAtMember(rig, 0);
    await sleep(1000);
    lookAtMember(rig, 2);
    await sleep(1000);
    lookAtMember(rig, 5);
    await sleep(1000);
    await lookDownAtPodium(rig);
    await tap(rig, 'FinishButton');
    await waitUntil(() => rig.session.phase === 'Summary', 4000);
    await sleep(300);
    const panel = findSceneObjectByName('SummaryPanel');
    expect(!!panel && panel.getChild(0).isEnabledInHierarchy, 'Summary panel visible').toBe(true);
    const summary = rig.session.summary;
    expect(summary !== null, 'summary snapshot').toBe(true);
    const sum = summary ? summary.zonePercents[0] + summary.zonePercents[1] + summary.zonePercents[2] : -1;
    expect(sum, 'zone percent sum').toBeWithinRange(99, 101);
    // Pass 4 (artifact S5): the time sits in the title, "Nice work — m:ss".
    const time = textOf('TimeText');
    expect(/^Nice work — \d+:\d\d$/.test(time), `time label "${time}" is "Nice work — m:ss"`).toBe(true);
  }
}
