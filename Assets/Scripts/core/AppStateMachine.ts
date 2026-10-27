/**
 * Top-level app phases and their legal transitions (plan "상태 머신 노드·엣지 (EyesUpApp.ts 기준)").
 *
 *   Launch → Setup → Placing → Rehearsal → Finishing → Summary → {Setup, Placing}
 *   anywhere (after Launch) → Placing via Re-place
 *
 * The plan's Rehearsal sub-states (Nudge, CardExpanded, TimeUp) can overlap in time, so they are
 * modeled as flags on the session (EyesUpSession.subStates), not as exclusive phases here.
 */
export type Phase = 'Launch' | 'Setup' | 'Placing' | 'Rehearsal' | 'Finishing' | 'Summary';
export type AppAction = 'launch' | 'start' | 'placed' | 'finish' | 'applauseDone' | 'again' | 'done' | 'replace';

const TABLE: Record<AppAction, { from: Phase[] | 'any-after-launch'; to: Phase }> = {
  launch: { from: ['Launch'], to: 'Setup' }, // lens start
  start: { from: ['Setup'], to: 'Placing' }, // pinch Start
  placed: { from: ['Placing'], to: 'Rehearsal' }, // fade-in done (0.5 s)
  finish: { from: ['Rehearsal'], to: 'Finishing' }, // pinch Finish (Rehearsal incl. TimeUp)
  applauseDone: { from: ['Finishing'], to: 'Summary' }, // applause 1.5 s
  again: { from: ['Summary'], to: 'Placing' }, // pinch Again
  done: { from: ['Summary'], to: 'Setup' }, // pinch Done
  replace: { from: 'any-after-launch', to: 'Placing' }, // pinch Re-place
};

export type PhaseListener = (from: Phase, to: Phase, action: AppAction) => void;

export class AppStateMachine {
  private _phase: Phase = 'Launch';
  private listeners: PhaseListener[] = [];

  get phase(): Phase {
    return this._phase;
  }

  can(action: AppAction): boolean {
    const rule = TABLE[action];
    return rule.from === 'any-after-launch' ? this._phase !== 'Launch' : rule.from.indexOf(this._phase) >= 0;
  }

  /** Apply an action. Returns false (and changes nothing) if it is not legal in the current phase. */
  dispatch(action: AppAction): boolean {
    if (!this.can(action)) return false;
    const from = this._phase;
    this._phase = TABLE[action].to;
    for (const l of this.listeners) l(from, this._phase, action);
    return true;
  }

  onChange(listener: PhaseListener): void {
    this.listeners.push(listener);
  }
}
