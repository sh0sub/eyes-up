/** LEAF `next_shows_card_then_pill`: Next shows "Why glasses", and 4.3 s later it is a pill. */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { lookAtMember, lookDownAtPodium, setUp, startAndWaitForRehearsal, tap, textOf } from './EyesUpLeafHelpers';

@component
export class NextShowsCardThenPill extends Scenario {
  async run(): Promise<void> {
    const rig = await setUp();
    await startAndWaitForRehearsal(rig);
    await lookDownAtPodium(rig);
    await tap(rig, 'NextButton');
    lookAtMember(rig, 0);
    expect(textOf('CueCardTitle'), 'card title after Next').toBe('Why glasses');
    expect(rig.session.cardMode, 'card mode after Next').toBe('card');
    await sleep(4300);
    expect(rig.session.cardMode, 'card mode 4.3 s later').toBe('pill');
    expect(textOf('CueCardTitle'), 'pill tag').toBe('Eyes stay up');
  }
}
