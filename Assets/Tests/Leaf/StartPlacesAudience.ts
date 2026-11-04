/**
 * LEAF `start_places_audience`: 0.6 s after Start with the Setup default untouched, 3 audience members are active at 250 ± 5 cm,
 * and (Cycle 4, D1) all 3 heads project inside the lens viewport with a 10 % margin and (Cycle 5, R2) every phone glow ends inside the bottom 4 % (run from the canonical camera pose, scripts/video/preview-reset.sh).
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { findSceneObjectByName, sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { headFrameProblems, phoneBottomProblems, pressStart, setUp } from './EyesUpLeafHelpers';

@component
export class StartPlacesAudience extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp();
    await pressStart(rig);
    await sleep(600);
    const head = rig.gaze.origin;
    let active = 0;
    for (let i = 1; i <= 9; i++) {
      const so = findSceneObjectByName(`Audience_${i}`);
      if (!so || !so.isEnabledInHierarchy) continue;
      active++;
      const p = so.getTransform().getWorldPosition();
      const horizontal = Math.sqrt((p.x - head.x) ** 2 + (p.z - head.z) ** 2);
      expect(horizontal, `Audience_${i} horizontal distance`).toBeWithinRange(245, 255);
    }
    expect(active, 'active audience members').toBe(3);
    const problems = headFrameProblems(rig);
    expect(problems.length, `heads outside the 10 % viewport margin: ${problems.join('; ')}`).toBe(0);
    const phones = phoneBottomProblems(rig);
    expect(phones.length, `phone glow outside the bottom 4 % margin: ${phones.join('; ')}`).toBe(0);
  }
}
