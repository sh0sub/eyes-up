/**
 * Podium view model (plan M7): Prev / Next / Finish pinch buttons, section counter, elapsed time.
 * Visible only while the head pitches down at least `podiumPitchDeg` (15° since design pass 2; the plan said ~12°), like a
 * wristwatch. Re-place is a small button
 * on the left, hidden during Rehearsal (plan edge "어디서나 → Placing").
 */
import { Phase } from './AppStateMachine';
import { Vec3Like, formatMSS, pitchDeg } from './math';

export interface PodiumState {
  visible: boolean;
  sectionLabel: string;
  elapsedLabel: string;
  /** Artifact S4: "elapsed / target", e.g. "1:21 / 3:00". Just elapsed when no target is given. */
  timerLabel: string;
  controlsEnabled: boolean;
  replaceVisible: boolean;
}

export interface PodiumInput {
  phase: Phase;
  gazeForward: Vec3Like;
  cardIndex: number;
  cardTotal: number;
  elapsedSeconds: number;
  /** Talk length in seconds (Setup). Optional: omitted or 0 shows elapsed only. */
  targetSeconds?: number;
  podiumPitchDeg: number;
}

export function podiumState(i: PodiumInput): PodiumState {
  const onStage = i.phase === 'Placing' || i.phase === 'Rehearsal';
  return {
    visible: onStage && pitchDeg(i.gazeForward) <= -i.podiumPitchDeg,
    sectionLabel: i.cardTotal > 0 ? `${i.cardIndex + 1} / ${i.cardTotal}` : '',
    elapsedLabel: formatMSS(i.elapsedSeconds),
    timerLabel:
      i.targetSeconds && i.targetSeconds > 0 ? `${formatMSS(i.elapsedSeconds)} / ${formatMSS(i.targetSeconds)}` : formatMSS(i.elapsedSeconds),
    controlsEnabled: i.phase === 'Rehearsal',
    replaceVisible: i.phase !== 'Rehearsal' && i.phase !== 'Launch',
  };
}
