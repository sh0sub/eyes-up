import { AppAction, AppStateMachine, Phase } from '../../Assets/Scripts/core/AppStateMachine';

describe('AppStateMachine (M1 #3)', () => {
  it('walks the full loop Launch -> Setup -> Placing -> Rehearsal -> Finishing -> Summary -> Setup', () => {
    const sm = new AppStateMachine();
    const seen: Phase[] = [sm.phase];
    sm.onChange((_f, to) => seen.push(to));
    for (const a of ['launch', 'start', 'placed', 'finish', 'applauseDone', 'done'] as AppAction[]) {
      expect(sm.dispatch(a)).toBe(true);
    }
    expect(seen).toEqual(['Launch', 'Setup', 'Placing', 'Rehearsal', 'Finishing', 'Summary', 'Setup']);
  });

  it('Again goes Summary -> Placing', () => {
    const sm = new AppStateMachine();
    ['launch', 'start', 'placed', 'finish', 'applauseDone'].forEach((a) => sm.dispatch(a as AppAction));
    expect(sm.dispatch('again')).toBe(true);
    expect(sm.phase).toBe('Placing');
  });

  it('rejects illegal transitions without changing phase', () => {
    const sm = new AppStateMachine();
    expect(sm.dispatch('start')).toBe(false);
    expect(sm.dispatch('replace')).toBe(false);
    sm.dispatch('launch');
    expect(sm.dispatch('finish')).toBe(false);
    expect(sm.dispatch('again')).toBe(false);
    expect(sm.phase).toBe('Setup');
  });

  it('Re-place works from any phase after Launch', () => {
    for (const path of [['launch'], ['launch', 'start', 'placed'], ['launch', 'start', 'placed', 'finish', 'applauseDone']]) {
      const sm = new AppStateMachine();
      path.forEach((a) => sm.dispatch(a as AppAction));
      expect(sm.dispatch('replace')).toBe(true);
      expect(sm.phase).toBe('Placing');
    }
  });
});
