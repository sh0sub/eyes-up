import { scenariosIndex } from 'Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator';
import { ScenarioMetadata } from 'Leaf.lspkg/Scenarios/scenario/ScenarioMetadata';
import { CaptureGame } from './CaptureGame';
import { CaptureLoop } from './CaptureLoop';
import { CaptureNudgeHold } from './CaptureNudgeHold';
import { CapturePodium } from './CapturePodium';
import { CaptureSummary } from './CaptureSummary';
import { DemoReel } from './DemoReel';
import { DwellExpandsPill } from './DwellExpandsPill';
import { FinishGivesGrade } from './FinishGivesGrade';
import { FinishPulsesAtTime } from './FinishPulsesAtTime';
import { FinishShowsSummary } from './FinishShowsSummary';
import { GazeFillsHalo } from './GazeFillsHalo';
import { NeglectDisengagesThenRecovers } from './NeglectDisengagesThenRecovers';
import { NeglectTriggersNudge } from './NeglectTriggersNudge';
import { NextShowsCardThenPill } from './NextShowsCardThenPill';
import { RepeatedNudge } from './RepeatedNudge';
import { StartPlacesAudience } from './StartPlacesAudience';

/** Registers the Eyes Up scenarios; ids match the done criteria in devpost/design-brief.md. */
@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    { id: 'start_places_audience', typename: StartPlacesAudience.getTypeName() },
    { id: 'gaze_fills_halo', typename: GazeFillsHalo.getTypeName() },
    { id: 'neglect_triggers_nudge', typename: NeglectTriggersNudge.getTypeName() },
    { id: 'next_shows_card_then_pill', typename: NextShowsCardThenPill.getTypeName() },
    { id: 'dwell_expands_pill', typename: DwellExpandsPill.getTypeName() },
    { id: 'finish_shows_summary', typename: FinishShowsSummary.getTypeName() },
    { id: 'repeated_nudge', typename: RepeatedNudge.getTypeName() },
    // capture helper for devpost screenshot 03, not a done criterion
    { id: 'capture_nudge_hold', typename: CaptureNudgeHold.getTypeName() },
    { id: 'capture_podium', typename: CapturePodium.getTypeName() },
    { id: 'capture_summary', typename: CaptureSummary.getTypeName() },
    // pass 5: Finish pulse at time-up (S4), extra check beyond the 7 done criteria
    { id: 'finish_pulses_at_time', typename: FinishPulsesAtTime.getTypeName() },
    // game layer: engagement slump / recovery, and the grade on the Summary
    { id: 'neglect_disengages_then_recovers', typename: NeglectDisengagesThenRecovers.getTypeName() },
    { id: 'finish_gives_grade', typename: FinishGivesGrade.getTypeName() },
    // game layer capture helper for the walkthrough screenshots, not a done criterion
    { id: 'capture_game', typename: CaptureGame.getTypeName() },
    // Cycle 4 (A2): Run 1 vs Run 2 numbers for the learning-loop table, capture helper, not a done criterion
    { id: 'capture_loop', typename: CaptureLoop.getTypeName() },
    // pass 3: ~75 s showcase for the demo video, not a done criterion
    { id: 'demo_reel', typename: DemoReel.getTypeName() },
  ];
}
