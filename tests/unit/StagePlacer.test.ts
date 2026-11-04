import { computeStageLayout } from '../../Assets/Scripts/StagePlacer';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';
import { horizontalDistance, length, sub, v3 } from '../../Assets/Scripts/core/math';
import { FORWARD, HEAD, defaultLayout } from '../helpers/fixtures';

describe('StagePlacer layout (M2 #4 math, used by LEAF start_places_audience)', () => {
  it('seats 6 members 250±5 cm (horizontal) from the head, on the floor 160 cm below', () => {
    const l = defaultLayout(6);
    expect(l.seats).toHaveLength(6);
    for (const s of l.seats) {
      expect(Math.abs(horizontalDistance(s, HEAD) - 250)).toBeLessThanOrEqual(5);
      expect(s.y).toBeCloseTo(0, 9);
    }
  });

  it('neighbors are 60 cm apart along the arc (chord ≈ 60 cm) and index 0 is leftmost (-X)', () => {
    const l = defaultLayout(6);
    for (let i = 1; i < 6; i++) {
      expect(length(sub(l.seats[i], l.seats[i - 1]))).toBeCloseTo(60, 0);
      expect(l.seats[i].x).toBeGreaterThan(l.seats[i - 1].x);
    }
    expect(l.seats[0].z).toBeLessThan(0);
  });

  it('seats 3 or fewer closer (42 cm) so the whole arc fits the lens viewport, 4 and more keep 60 cm', () => {
    const three = defaultLayout(3);
    expect(length(sub(three.seats[1], three.seats[0]))).toBeCloseTo(42, 0);
    expect(length(sub(three.seats[2], three.seats[1]))).toBeCloseTo(42, 0);
    // outer members stay within +-28 cm of the arc's chord half-span, well inside the +-72 cm viewport at 2.5 m
    expect(Math.abs(three.seats[2].z - three.seats[0].z)).toBeLessThan(90);
    expect(length(sub(defaultLayout(4).seats[1], defaultLayout(4).seats[0]))).toBeCloseTo(60, 0);
  });

  it('is centered on the head yaw and ignores head pitch', () => {
    const pitched = computeStageLayout(HEAD, v3(1, -0.5, 0), 3, DEFAULT_TUNABLES);
    expect(pitched.stageCenter.x).toBeCloseTo(250, 6);
    expect(pitched.stageCenter.z).toBeCloseTo(0, 6);
    expect(pitched.seats[1].x).toBeCloseTo(250, 6);
  });

  it('card anchor floats 10 cm above the head tops at stage center; eye targets at eye height', () => {
    const l = defaultLayout(6);
    expect(l.cardAnchor.y).toBeCloseTo(DEFAULT_TUNABLES.audienceHeadTopCm + 10, 9);
    expect(l.eyeTargets[0].y).toBeCloseTo(DEFAULT_TUNABLES.audienceEyeHeightCm, 9);
    expect(l.facing).toEqual(FORWARD);
  });

  it('supports 3 and 9 audience sizes and rejects invalid counts', () => {
    expect(defaultLayout(3).seats).toHaveLength(3);
    expect(defaultLayout(9).seats).toHaveLength(9);
    expect(() => defaultLayout(0)).toThrow();
  });
});

describe('StagePlacer podium position (M7 #6 numbers)', () => {
  it('podium is 55 cm ahead and 30 cm below the head', () => {
    const l = defaultLayout(6);
    expect(l.podiumPosition.y).toBeCloseTo(HEAD.y - 30, 9);
    expect(l.podiumPosition.z).toBeCloseTo(-55, 9);
  });
});
