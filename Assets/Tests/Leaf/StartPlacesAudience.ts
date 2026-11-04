/** LEAF `start_places_audience`: 0.6 s after Start with the Setup default untouched, 3 audience members are active at 250 ± 5 cm. */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { findSceneObjectByName, sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { pressStart, setUp } from './EyesUpLeafHelpers';

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
  }
}
