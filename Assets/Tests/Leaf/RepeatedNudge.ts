/**
 * LEAF `repeated_nudge` (pass 2, build-notes G7): neglect left → nudge → look left → neglect again →
 * a second LEFT nudge shows the chevron again. Polls every frame (waitUntil), so a 3 s hint
 * window cannot be missed the way ~5 s manual polls could.
 *
 * Expected timing (Node test tests/unit/NudgeRepeat.test.ts): left re-arms ~11.6 s after the
 * 0.5 s look, but the never-watched center zone takes the next 8 s cooldown slot, so the second
 * left nudge lands ~16 s after the first.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { findSceneObjectByName, sleep, waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { lookAtMember, setUp, startAndWaitForRehearsal } from './EyesUpLeafHelpers';

@component
export class RepeatedNudge extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp();
    await startAndWaitForRehearsal(rig);
    const hint = findSceneObjectByName('EdgeHintLeft');
    if (!hint) throw new Error('EdgeHintLeft not found');
    const leftActive = () => {
      const n = rig.session.activeNudge;
      return hint.isEnabledInHierarchy && !!n && n.zone === 0;
    };

    lookAtMember(rig, 5); // right zone
    await waitUntil(leftActive, 9500, () => 'first left nudge');
    expect(rig.session.nudgeCount, 'nudge count after first').toBe(1);

    lookAtMember(rig, 0); // look left: the nudge resolves
    await sleep(500);
    expect(hint.isEnabledInHierarchy, 'EdgeHintLeft hidden after looking left').toBe(false);

    lookAtMember(rig, 5); // neglect left again
    await waitUntil(leftActive, 18000, () => `second left nudge (count ${rig.session.nudgeCount})`);
    expect(hint.isEnabledInHierarchy, 'EdgeHintLeft visible again').toBe(true);
    expect(rig.session.nudgeCount >= 3, 'left, center, left — none dropped').toBe(true);
  }
}
