import { audienceLook, HEAD_SINK_CM, HEAD_TILT_DEG } from '../../Assets/Scripts/core/AudienceLook';
import { EngagementModel } from '../../Assets/Scripts/core/Engagement';
import {
  applauseAmplitude,
  attentionScore,
  compareLabel,
  gameResult,
  gradeFor,
  meterTone,
} from '../../Assets/Scripts/core/GameScore';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';
import { beatLabel, bestBanner, starsFor } from '../../Assets/Scripts/core/GameScore';
import {
  COMBO_CAP,
  LiveScore,
  comboLabel,
  comboMultiplier,
  floatPop,
  lightPoints,
  punchScale,
  scoreLabel,
  tickValue,
} from '../../Assets/Scripts/core/LiveScore';
import { summaryState } from '../../Assets/Scripts/core/SummaryModel';
import { runFor } from '../helpers/fixtures';

const only = (i: number, n = 6) => Array.from({ length: n }, (_, k) => k === i);

describe('EngagementModel (game layer)', () => {
  const T = DEFAULT_TUNABLES;

  it('starts fully engaged and holds through the grace period', () => {
    const m = new EngagementModel(T);
    m.reset(6);
    expect(m.engagement.every((v) => v === 1)).toBe(true);
    runFor(T.engageGraceSeconds - 0.1, (dt) => m.update(dt, only(-1)));
    expect(m.engagement[2]).toBe(1);
  });

  it('an unseen member slips linearly after the grace and bottoms out at 0', () => {
    const m = new EngagementModel(T);
    m.reset(6);
    runFor(T.engageGraceSeconds + T.disengageSeconds / 2, (dt) => m.update(dt, only(-1)));
    expect(m.engagement[0]).toBeCloseTo(0.5, 1);
    runFor(T.disengageSeconds, (dt) => m.update(dt, only(-1)));
    expect(m.engagement[0]).toBe(0);
  });

  it('looking at a member recovers it in recoverSeconds and fires one perk-up', () => {
    const m = new EngagementModel(T);
    m.reset(6);
    runFor(T.engageGraceSeconds + T.disengageSeconds * 0.8, (dt) => m.update(dt, only(0)));
    expect(m.engagement[3]).toBeLessThan(T.perkUpBelow);
    const perked: number[] = [];
    runFor(T.recoverSeconds + 0.05, (dt) => perked.push(...m.update(dt, only(3))));
    expect(perked).toEqual([3]);
    expect(m.engagement[3]).toBe(1);
    expect(m.perkUpCount).toBe(1);
    expect(m.unseenSeconds(3)).toBe(0);
  });

  it('the burst runs 1 -> 0 over burstSeconds; the engaged member never bursts', () => {
    const m = new EngagementModel(T);
    m.reset(3);
    runFor(1, (dt) => m.update(dt, only(0, 3)));
    expect(m.perkUpCount).toBe(0);
    runFor(T.engageGraceSeconds + T.disengageSeconds * 0.9, (dt) => m.update(dt, only(0, 3)));
    m.update(1 / 60, only(1, 3));
    expect(m.burst[1]).toBeGreaterThan(0.9);
    runFor(T.burstSeconds + 0.05, (dt) => m.update(dt, only(1, 3)));
    expect(m.burst[1]).toBe(0);
  });

  it('room is the mean and roomAverage is time-weighted', () => {
    const m = new EngagementModel(T);
    m.reset(2);
    expect(m.room).toBe(1);
    expect(m.roomAverage).toBe(1);
    runFor(T.engageGraceSeconds + T.disengageSeconds, (dt) => m.update(dt, [false, false]));
    expect(m.room).toBe(0);
    expect(m.roomAverage).toBeGreaterThan(0.1);
    expect(m.roomAverage).toBeLessThan(0.6);
  });
});

describe('audienceLook', () => {
  it('engaged is upright and has no phone glow; disengaged droops, squashes and glows', () => {
    const up = audienceLook(1);
    const down = audienceLook(0);
    expect(up.headDropCm).toBe(0);
    expect(up.headPitchDeg).toBe(0);
    expect(up.bodyScaleY).toBe(1);
    expect(up.phoneGlow).toBe(0);
    expect(down.headDropCm).toBeCloseTo(-HEAD_SINK_CM, 6);
    expect(down.headPitchDeg).toBeGreaterThan(30);
    expect(down.bodyScaleY).toBeLessThan(0.95);
    expect(down.phoneGlow).toBe(1);
  });

  it('a slumped head tilts about 30 degrees and shows zzz; engaged and perked-up members do not', () => {
    expect(audienceLook(1).headTiltDeg).toBe(0);
    expect(audienceLook(1).zzz).toBe(0);
    expect(audienceLook(0).headTiltDeg).toBeCloseTo(HEAD_TILT_DEG, 6);
    expect(HEAD_TILT_DEG).toBe(30);
    expect(audienceLook(0).zzz).toBe(1);
    expect(audienceLook(0.2, 1).zzz).toBe(0);
    expect(audienceLook(0.2, 1).headTiltDeg).toBe(0);
  });

  it('a slumped body keeps about 60 % of the engaged saturation (muted, not a pale ghost) and is dimmer', () => {
    const hsvSat = (c: number[]) => (Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2])) / Math.max(c[0], c[1], c[2]);
    const ratio = hsvSat(audienceLook(0).bodyColor) / hsvSat(audienceLook(1).bodyColor);
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(0.7);
    expect(audienceLook(0).bodyColor[3]).toBeLessThan(audienceLook(1).bodyColor[3]);
  });

  it('the perk-up ring pulse expands and fades over the burst, and is off without one', () => {
    expect(audienceLook(0.2, 0).pulseAlpha).toBe(0);
    const start = audienceLook(0.2, 1);
    const end = audienceLook(0.2, 0.05);
    expect(start.pulseScale).toBeCloseTo(1, 6);
    expect(end.pulseScale).toBeGreaterThan(2.2);
    expect(start.pulseAlpha).toBeGreaterThan(0.8);
    expect(end.pulseAlpha).toBeLessThan(0.2);
  });

  it('colors are saturated blue when engaged (not grey) and never black', () => {
    const [r, g, b, a] = audienceLook(1).bodyColor;
    expect(b - r).toBeGreaterThan(0.5);
    expect(a).toBeGreaterThan(0.5);
    for (const e of [0, 0.5, 1]) expect(Math.max(...audienceLook(e).bodyColor.slice(0, 3))).toBeGreaterThan(0.5);
    expect(g).toBeGreaterThan(0.5);
  });

  it('the burst lifts a slumped head and turns cyan, then settles', () => {
    const slumped = audienceLook(0.2);
    const burst = audienceLook(0.2, 1);
    expect(burst.headDropCm).toBeGreaterThan(slumped.headDropCm);
    expect(burst.headPitchDeg).toBeLessThan(slumped.headPitchDeg);
    expect(burst.bodyColor[1]).toBeGreaterThan(slumped.bodyColor[1]);
    expect(audienceLook(0.5, 0.5).haloBurstScale).toBeGreaterThan(1.5);
    expect(audienceLook(0.5, 0).haloBurstScale).toBe(1);
  });
});

describe('score and grade', () => {
  it('perfect balance with a fully engaged room scores 100 and S', () => {
    expect(attentionScore(100, 1)).toBe(100);
    expect(gradeFor(100)).toBe('S');
  });

  it('never looking up cannot score, however engaged the room started', () => {
    expect(attentionScore(0, 1)).toBe(0);
    expect(gradeFor(0)).toBe('C');
  });

  it('losing the room costs score at equal balance', () => {
    expect(attentionScore(90, 0)).toBe(31);
    expect(attentionScore(90, 1)).toBe(90);
    expect(attentionScore(90, 0.5)).toBeGreaterThan(attentionScore(90, 0.2));
  });

  it('grade boundaries: 85 S, 70 A, 50 B', () => {
    expect([100, 85, 84, 70, 69, 50, 49, 0].map(gradeFor)).toEqual(['S', 'S', 'A', 'A', 'B', 'B', 'C', 'C']);
  });

  it('applause amplitude grows with the score (0.02..0.09)', () => {
    expect(applauseAmplitude(0)).toBeCloseTo(0.02, 9);
    expect(applauseAmplitude(100)).toBeCloseTo(0.09, 9);
    expect(applauseAmplitude(80)).toBeGreaterThan(applauseAmplitude(30));
  });

  it('best-previous compare: none on first run, new best, or best so far', () => {
    const first = gameResult(90, 1, null);
    expect(first.newBest).toBe(false);
    expect(compareLabel(first)).toBe('');
    const better = gameResult(95, 1, { score: first.score - 20, grade: 'A' });
    expect(better.newBest).toBe(true);
    expect(compareLabel(better)).toBe(`New best! (was ${first.score - 20})`);
    const worse = gameResult(40, 0.5, { score: 88, grade: 'S' });
    expect(worse.newBest).toBe(false);
    expect(compareLabel(worse)).toBe('Best so far 88 · S');
  });

  it('meter tone: cyan, amber, coral', () => {
    expect([1, 0.7, 0.69, 0.5, 0.4, 0.39, 0.1].map(meterTone)).toEqual(['good', 'good', 'mid', 'mid', 'mid', 'low', 'low']);
  });

  it('summary state carries score, grade and compare labels', () => {
    const snap = {
      durationSeconds: 60,
      zoneSeconds: [20, 20, 20] as [number, number, number],
      zonePercents: [34, 33, 33] as [number, number, number],
      longestLookAway: { seconds: 5, zone: 0 as const, zoneName: 'left' as const, startSeconds: 3 },
      cardExpands: 1,
      nudges: 0,
      balanceScore: 99,
      timeline: { bucketSeconds: 0.5, zones: [], nudgeTimes: [] },
    };
    const game = gameResult(99, 0.9, { score: 50, grade: 'B' });
    const s = summaryState(snap, 1, { targetSeconds: 180, deckName: 'd', game });
    expect(s.gradeLabel).toBe(game.grade);
    expect(s.scoreLabel).toBe(`Score ${game.points}`);
    expect(s.engagementLabel).toBe('Room engaged 90%');
    expect(s.engagementShort).toBe('Room 90%');
    expect(s.compareLabel).toContain('New best');
    expect(summaryState(snap, 1).gradeLabel).toBe('');
  });
});

describe('LiveScore (live points and combo from real dwell)', () => {
  const look = (m: LiveScore, i: number, sec: number, n = 6) => {
    const gains: ReturnType<LiveScore['update']> = [];
    runFor(sec, (dt) => gains.push(...m.update(dt, only(i, n))));
    return gains;
  };

  it('a glance shorter than the 1 s dwell scores nothing; the dwell lights the listener for +10', () => {
    const m = new LiveScore(1);
    m.reset(6);
    expect(look(m, 0, 0.9)).toEqual([]);
    expect(m.score).toBe(0);
    look(m, -1, 0.1);
    const g = look(m, 0, 1.0);
    expect(g).toEqual([{ index: 0, points: 10, kind: 'light', combo: 1 }]);
    expect(m.score).toBe(10);
    expect(m.isLit(0)).toBe(true);
  });

  it('holding pays +3 per extra second, capped at +9 per look (staring is not the skill)', () => {
    const m = new LiveScore(1);
    m.reset(6);
    look(m, 0, 1.0);
    look(m, 0, 2.0);
    expect(m.score).toBe(16);
    look(m, 0, 10);
    expect(m.score).toBe(19);
  });

  it('re-lighting the same listener within 4 s scores 0 and counts a repeat; after 4 s it scores again', () => {
    const m = new LiveScore(1);
    m.reset(6);
    look(m, 0, 1.0);
    look(m, -1, 1.0);
    look(m, 0, 1.0);
    expect(m.score).toBe(10);
    expect(m.repeats).toBe(1);
    look(m, -1, 4.5);
    look(m, 0, 1.0);
    expect(m.score).toBe(20);
  });

  it('spreading across distinct listeners chains a combo x2..x5 with a 1 + 0.25/step multiplier', () => {
    const m = new LiveScore(1);
    m.reset(6);
    const pts: number[] = [];
    for (const i of [0, 1, 2, 3, 4, 5]) {
      for (const g of look(m, i, 1.0)) if (g.kind === 'light') pts.push(g.points);
      look(m, -1, 0.2);
    }
    expect(pts).toEqual([10, 13, 15, 18, 20, 20]);
    expect(m.combo).toBe(COMBO_CAP);
    expect(comboLabel(m.combo)).toBe('COMBO x5');
    expect(comboMultiplier(2)).toBe(1.25);
    expect(lightPoints(9)).toBe(20);
  });

  it('spreading beats staring: one minute across the room scores far more than one minute on one person', () => {
    const spread = new LiveScore(1);
    spread.reset(6);
    for (let k = 0; k < 40; k++) {
      look(spread, k % 6, 1.2);
      look(spread, -1, 0.3);
    }
    const stare = new LiveScore(1);
    stare.reset(6);
    look(stare, 0, 60);
    expect(stare.score).toBe(19);
    expect(spread.score).toBeGreaterThan(10 * stare.score);
  });

  it('a 3 s gap with nobody lit breaks the combo and records when', () => {
    const m = new LiveScore(1);
    m.reset(6);
    look(m, 0, 1.0);
    look(m, 1, 1.0);
    expect(m.combo).toBe(2);
    look(m, -1, 3.2);
    expect(m.combo).toBe(0);
    expect(m.comboBrokenAt).toBeGreaterThan(5);
    const g = look(m, 2, 1.0);
    expect(g[0].combo).toBe(1);
    expect(g[0].points).toBe(10);
  });

  it('a repeat breaks the combo', () => {
    const m = new LiveScore(1);
    m.reset(6);
    look(m, 0, 1.0);
    look(m, 1, 1.0);
    look(m, 0, 1.0);
    expect(m.combo).toBe(0);
    expect(m.score).toBe(23);
  });

  it('no look, no points', () => {
    const m = new LiveScore(1);
    m.reset(3);
    look(m, -1, 120, 3);
    expect(m.score).toBe(0);
  });

  it('HUD helpers: padded score, tick, punch and the +N float', () => {
    expect(scoreLabel(120)).toBe('SCORE 0120');
    expect(scoreLabel(12345)).toBe('SCORE 12345');
    expect(comboLabel(1)).toBe('');
    expect(tickValue(100, 120, 0.1)).toBe(110);
    expect(tickValue(100, 120, 0.3)).toBe(120);
    expect(punchScale(0)).toBeCloseTo(1.15, 6);
    expect(punchScale(0.25)).toBe(1);
    expect(floatPop(0)).toEqual({ y: 0, alpha: 1 });
    expect(floatPop(0.2)!.y).toBeGreaterThan(4);
    expect(floatPop(0.4)).toBeNull();
  });
});

describe('Stars and NEW BEST (Summary)', () => {
  it('stars: 1 for finishing, +1 room average >= 0.70, +1 balance >= 80', () => {
    expect(starsFor(0.5, 50)).toBe(1);
    expect(starsFor(0.7, 50)).toBe(2);
    expect(starsFor(0.5, 80)).toBe(2);
    expect(starsFor(0.95, 92)).toBe(3);
  });

  it('NEW BEST compares live points, not the attention score; first run shows no banner', () => {
    const first = gameResult(90, 1, null, 400);
    expect(first.points).toBe(400);
    expect(bestBanner(first)).toBe('');
    expect(beatLabel(first)).toBe('beat 400');
    const better = gameResult(60, 0.6, { score: 95, grade: 'S', points: 400 }, 520);
    expect(better.newBest).toBe(true);
    expect(bestBanner(better)).toBe('NEW BEST');
    const worse = gameResult(99, 1, { score: 60, grade: 'B', points: 520 }, 300);
    expect(worse.newBest).toBe(false);
    expect(bestBanner(worse)).toBe('Best 520');
    expect(beatLabel(worse)).toBe('beat 520');
  });
});
