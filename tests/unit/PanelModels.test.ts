import {
  AUDIENCE_OPTIONS,
  LENGTH_OPTIONS,
  SETUP_CAPTION,
  SETUP_PILL,
  SetupModel,
  optionToSlider,
  setupExitScale,
  snapToOption,
} from '../../Assets/Scripts/core/SetupModel';
import { podiumState } from '../../Assets/Scripts/core/PodiumModel';
import { summaryState, summaryTip, zoneOutOfRange } from '../../Assets/Scripts/core/SummaryModel';
import { CHEVRON_MIN_ALPHA, chevronAlpha, chevronPulse } from '../../Assets/Scripts/NudgeController';
import { StatsSnapshot } from '../../Assets/Scripts/SessionStats';
import { v3 } from '../../Assets/Scripts/core/math';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';

describe('SetupModel (#28 SetupPanel logic, S1 #22)', () => {
  it('defaults 3 min / 3 people / Eyes Up pitch', () => {
    const m = new SetupModel();
    expect(m.config).toEqual({ lengthMinutes: 3, audienceCount: 3, deckId: 'eyes-up-pitch' });
    expect(m.labels).toEqual({ length: '3 min', audience: '3 people', deck: 'Eyes Up pitch', deckCards: '5 cards' });
  });

  it('artifact S1: deck card counts, SETUP pill and caption wording', () => {
    const m = new SetupModel();
    expect(m.deckCardCount).toBe(5);
    m.toggleDeck();
    expect(m.labels.deck).toBe('Self-intro');
    expect(m.labels.deckCards).toBe('3 cards');
    expect(SETUP_PILL).toBe('SETUP');
    expect(SETUP_CAPTION).toBe("Stage appears 2.5 m ahead of where you're facing.");
  });

  it('sliders snap to 3/5/10 and 3/6/9', () => {
    const m = new SetupModel();
    expect([0, 0.3, 0.5, 0.8, 1, 2].map((v) => snapToOption(LENGTH_OPTIONS, v))).toEqual([3, 5, 5, 10, 10, 10]);
    expect(m.setAudienceSlider(1)).toBe(9);
    expect(m.setLengthSlider(0.49)).toBe(5);
    expect(optionToSlider(AUDIENCE_OPTIONS, 6)).toBe(0.5);
  });

  it('deck toggles between the two samples; unknown id throws', () => {
    const m = new SetupModel();
    expect(m.toggleDeck()).toBe('self-intro');
    expect(m.toggleDeck()).toBe('eyes-up-pitch');
    expect(() => m.selectDeck('x')).toThrow();
  });

  it('exit shrink lasts 0.3 s', () => {
    expect(setupExitScale(0)).toBe(1);
    expect(setupExitScale(0.15)).toBeCloseTo(0.5, 9);
    expect(setupExitScale(0.4)).toBe(0);
  });
});

describe('PodiumModel (#28 Podium logic, M7 #6)', () => {
  const base = { cardIndex: 1, cardTotal: 6, elapsedSeconds: 75.4, podiumPitchDeg: DEFAULT_TUNABLES.podiumPitchDeg };
  it('default threshold is 15° (design pass 2, was 12°)', () => {
    expect(DEFAULT_TUNABLES.podiumPitchDeg).toBe(15);
  });
  it('visible only on stage when looking down >= 15°', () => {
    expect(podiumState({ ...base, phase: 'Rehearsal', gazeForward: v3(0, 0, -1) }).visible).toBe(false);
    // resting / preview default pitch (−12°) and ~14° no longer flash the podium
    expect(podiumState({ ...base, phase: 'Rehearsal', gazeForward: v3(0, -Math.tan((12 * Math.PI) / 180), -1) }).visible).toBe(false);
    expect(podiumState({ ...base, phase: 'Rehearsal', gazeForward: v3(0, -0.25, -1) }).visible).toBe(false); // ~14°
    expect(podiumState({ ...base, phase: 'Rehearsal', gazeForward: v3(0, -0.3, -1) }).visible).toBe(true); // ~16.7°
    // still tunable: an explicit 12° threshold keeps the old behavior
    expect(podiumState({ ...base, podiumPitchDeg: 12, phase: 'Rehearsal', gazeForward: v3(0, -0.25, -1) }).visible).toBe(true);
    expect(podiumState({ ...base, phase: 'Summary', gazeForward: v3(0, -1, -1) }).visible).toBe(false);
  });
  it('labels: section counter and m:ss elapsed; Re-place hidden during Rehearsal', () => {
    const p = podiumState({ ...base, phase: 'Rehearsal', gazeForward: v3(0, -1, -1) });
    expect(p.sectionLabel).toBe('2 / 6');
    expect(p.elapsedLabel).toBe('1:15');
    expect(p.controlsEnabled).toBe(true);
    expect(p.replaceVisible).toBe(false);
    expect(podiumState({ ...base, phase: 'Placing', gazeForward: v3(0, -1, -1) }).replaceVisible).toBe(true);
  });
  it('artifact S4 timer: "elapsed / target"; elapsed only without a target', () => {
    const down = { ...base, phase: 'Rehearsal' as const, gazeForward: v3(0, -1, -1) };
    expect(podiumState({ ...down, elapsedSeconds: 81, targetSeconds: 180 }).timerLabel).toBe('1:21 / 3:00');
    expect(podiumState(down).timerLabel).toBe('1:15');
    expect(podiumState({ ...down, targetSeconds: 0 }).timerLabel).toBe('1:15');
  });
});

describe('chevronPulse (artifact S3: 1 Hz while visible)', () => {
  it('starts full, dips at half a period, back to full each second', () => {
    expect(chevronPulse(0)).toBe(1);
    expect(chevronPulse(0.25)).toBeCloseTo(0.5, 9);
    expect(chevronPulse(0.5)).toBeCloseTo(0, 9);
    expect(chevronPulse(1)).toBeCloseTo(1, 9);
    expect(chevronPulse(-1)).toBe(1);
  });
});

describe('chevronAlpha (round 6: nudge cue stays visible)', () => {
  it('never drops below the floor and reaches 1 at the peak', () => {
    expect(CHEVRON_MIN_ALPHA).toBeGreaterThanOrEqual(0.7);
    expect(chevronAlpha(0)).toBe(CHEVRON_MIN_ALPHA);
    expect(chevronAlpha(1)).toBe(1);
    expect(chevronAlpha(-3)).toBe(CHEVRON_MIN_ALPHA);
    expect(chevronAlpha(9)).toBe(1);
  });
});

describe('SummaryModel (#28 SummaryPanel logic, M8 #20)', () => {
  const snap: StatsSnapshot = {
    durationSeconds: 172.6,
    zoneSeconds: [22, 58, 20],
    zonePercents: [22, 58, 20],
    longestLookAway: { seconds: 11.2, zone: 0, zoneName: 'left', startSeconds: 72.4 },
    cardExpands: 2,
    nudges: 3,
    balanceScore: 63,
    timeline: { bucketSeconds: 0.5, zones: [], nudgeTimes: [] },
  };
  it('formats the artifact S5 example: "Nice work — 2:52", 22/58/20, "11 s · left · at 1:12"', () => {
    const s = summaryState(snap, 1, { targetSeconds: 180, deckName: 'Eyes Up pitch' });
    expect(s.timeLabel).toBe('2:52');
    expect(s.titleLabel).toBe('Nice work — 2:52');
    expect(s.targetLabel).toBe('target 3:00 · Eyes Up pitch');
    expect(s.zones.map((z) => z.label)).toEqual(['22%', '58%', '20%']);
    expect(s.zones.reduce((a, z) => a + z.percent, 0)).toBe(100);
    expect(s.zones.map((z) => z.outOfRange)).toEqual([false, true, false]);
    expect(s.longestLookAwayLabel).toBe('11 s · left · at 1:12');
    expect(s.balanceLabel).toBe('63');
    expect(s.cardExpandsLabel).toBe('2');
    expect(s.cardsLabel).toBe('2');
    expect(s.nudgesLabel).toBe('3');
    expect(s.tip).toBe('Next time, look right more.');
    expect(summaryState(snap, 1).targetLabel).toBe('');
    // Separate tiles (artifact S5 spec: Cards "2 of 5", Nudges "1"): the deck size is shown when known.
    const withDeck = summaryState(snap, 1, { targetSeconds: 180, deckName: 'x', cardCount: 5 });
    expect(withDeck.cardsLabel).toBe('2 of 5');
    expect(withDeck.nudgesLabel).toBe('3');
    // Cycle 2 M2: the three tiles are one line.
    expect(withDeck.statsLine).toBe('Look-away 11 s left · Cards 2 of 5 · Nudges 3');
    expect(summaryState(snap, 1).statsLine).toBe('Look-away 11 s left · Cards 2 · Nudges 3');
  });
  it('zone range is 15 < share < 35 (artifact S5); amber outside', () => {
    expect([14, 15, 16, 34, 35, 36].map(zoneOutOfRange)).toEqual([true, true, false, false, true, true]);
  });
  it('tip comes from the weakest zone; ties go left first; balanced and empty cases', () => {
    expect(summaryTip([10, 60, 30])).toBe('Next time, look left more.');
    expect(summaryTip([40, 10, 50])).toBe('Next time, look at the center more.');
    expect(summaryTip([20, 60, 20])).toBe('Next time, look left more.');
    expect(summaryTip([34, 33, 33])).toBe('Nice balance. Keep it up.');
    expect(summaryTip([0, 0, 0])).toBe('Next time, look up at the audience.');
  });
  it('bars fill over 0.6 s', () => {
    expect(summaryState(snap, 0).zones[1].bar).toBe(0);
    expect(summaryState(snap, 0.3).zones[1].bar).toBeCloseTo(0.29, 9);
    expect(summaryState(snap, 0.6).zones[1].bar).toBeCloseTo(0.58, 9);
  });
});
