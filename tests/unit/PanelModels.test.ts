import { AUDIENCE_OPTIONS, LENGTH_OPTIONS, SetupModel, optionToSlider, setupExitScale, snapToOption } from '../../Assets/Scripts/core/SetupModel';
import { podiumState } from '../../Assets/Scripts/core/PodiumModel';
import { summaryState } from '../../Assets/Scripts/core/SummaryModel';
import { StatsSnapshot } from '../../Assets/Scripts/SessionStats';
import { v3 } from '../../Assets/Scripts/core/math';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';

describe('SetupModel (#28 SetupPanel logic, S1 #22)', () => {
  it('defaults 3 min / 6 people / Eyes Up pitch', () => {
    const m = new SetupModel();
    expect(m.config).toEqual({ lengthMinutes: 3, audienceCount: 6, deckId: 'eyes-up-pitch' });
    expect(m.labels).toEqual({ length: '3 min', audience: '6 people', deck: 'Eyes Up pitch' });
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
    expect(m.toggleDeck()).toBe('interview-intro');
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
});

describe('SummaryModel (#28 SummaryPanel logic, M8 #20)', () => {
  const snap: StatsSnapshot = {
    durationSeconds: 172.6,
    zoneSeconds: [22, 58, 20],
    zonePercents: [22, 58, 20],
    longestLookAway: { seconds: 11.2, zone: 0, zoneName: 'left' },
    cardExpands: 2,
    nudges: 3,
    balanceScore: 63,
  };
  it('formats the video example: 2:52, 22/58/20, "11 s, left"', () => {
    const s = summaryState(snap, 1);
    expect(s.timeLabel).toBe('2:52');
    expect(s.zones.map((z) => z.label)).toEqual(['22%', '58%', '20%']);
    expect(s.zones.reduce((a, z) => a + z.percent, 0)).toBe(100);
    expect(s.longestLookAwayLabel).toBe('11 s, left');
    expect(s.balanceLabel).toBe('63 / 100');
    expect(s.cardExpandsLabel).toBe('2');
  });
  it('bars fill over 0.6 s', () => {
    expect(summaryState(snap, 0).zones[1].bar).toBe(0);
    expect(summaryState(snap, 0.3).zones[1].bar).toBeCloseTo(0.29, 9);
    expect(summaryState(snap, 0.6).zones[1].bar).toBeCloseTo(0.58, 9);
  });
});
