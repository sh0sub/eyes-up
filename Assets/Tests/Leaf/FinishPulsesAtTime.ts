/**
 * LEAF `finish_pulses_at_time` (pass 5, not one of the 7 done criteria): the podium's Finish button
 * rests before the talk length and pulses at 1 Hz once it is reached (artifact S4 / brief).
 * To avoid a 3-minute wait the session clock is fast-forwarded to 2 s before the target. That is a
 * test-only write to a private field; everything after it (clock, podium state, pulse) is real.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { findSceneObjectByName, sleep, waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { lookDownAtPodium, setUp, startAndWaitForRehearsal } from './EyesUpLeafHelpers';

async function sampleScales(so: SceneObject, ms: number): Promise<number[]> {
  const out: number[] = [];
  for (let t = 0; t < ms; t += 100) {
    out.push(so.getTransform().getLocalScale().x);
    await sleep(100);
  }
  return out;
}

@component
export class FinishPulsesAtTime extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp();
    await startAndWaitForRehearsal(rig);
    (rig.session as unknown as { _elapsed: number })._elapsed = rig.session.targetSeconds - 2;
    await lookDownAtPodium(rig);
    const finish = findSceneObjectByName('FinishButton');
    if (!finish) throw new Error('FinishButton not found');
    const before = await sampleScales(finish, 800);
    expect(Math.max(...before), 'Finish at rest before the target').toBeWithinRange(0.99, 1.01);
    await waitUntil(() => rig.session.elapsedSeconds >= rig.session.targetSeconds, 3000, () => 'target reached');
    const after = await sampleScales(finish, 1500);
    expect(Math.max(...after), 'Finish pulse peak').toBeWithinRange(1.08, 1.13);
    expect(Math.min(...after), 'Finish pulse trough').toBeWithinRange(0.99, 1.04);
  }
}
