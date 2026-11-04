/**
 * LEAF `neglect_triggers_nudge`: after 8.5 s of gaze on the right zone the EdgeHint is active and
 * says "left", with nudge count 1. After 0.5 s of gaze on the left it is inactive.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { findSceneObjectByName, sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { lookAtMember, setUp, startAndWaitForRehearsal, textOf } from './EyesUpLeafHelpers';

@component
export class NeglectTriggersNudge extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp(6); // six people: these checks use members in every zone
    await startAndWaitForRehearsal(rig);
    lookAtMember(rig, 5); // right zone (members 4–5 of 6)
    await sleep(8500);
    const hint = findSceneObjectByName('EdgeHintLeft');
    expect(!!hint && hint.isEnabledInHierarchy, 'EdgeHintLeft active').toBe(true);
    expect(textOf('EdgeHintLeft').includes('left'), 'EdgeHint text says "left"').toBe(true);
    const nudge = rig.session.activeNudge;
    expect(nudge ? nudge.side : 'none', 'nudge side').toBe('left');
    expect(rig.session.nudgeCount, 'nudge count').toBe(1);
    lookAtMember(rig, 0); // left zone
    await sleep(500);
    expect(hint.isEnabledInHierarchy, 'EdgeHintLeft after looking left').toBe(false);
  }
}
