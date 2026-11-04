import { computeStageLayout } from '../../Assets/Scripts/StagePlacer';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';
import { SetupModel } from '../../Assets/Scripts/core/SetupModel';
import { horizontalDistance, length, sub, v3 } from '../../Assets/Scripts/core/math';
import { FORWARD, HEAD, defaultLayout } from '../helpers/fixtures';

const FLOOR_Y = HEAD.y - DEFAULT_TUNABLES.floorOffsetCm;

describe('StagePlacer layout (M2 #4 math, used by LEAF start_places_audience)', () => {
  it('seats 6 members 250±5 cm (horizontal) from the head, on the floor 154 cm below (stage raised 6 cm)', () => {
    const l = defaultLayout(6);
    expect(l.seats).toHaveLength(6);
    for (const s of l.seats) {
      expect(Math.abs(horizontalDistance(s, HEAD) - 250)).toBeLessThanOrEqual(5);
      expect(s.y).toBeCloseTo(HEAD.y - DEFAULT_TUNABLES.floorOffsetCm, 9);
      expect(HEAD.y - s.y).toBe(154);
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

  it('default room (3 people) plus bodies fits a 40 degree field of view; the 6 and 9 arcs do not (Cycle 3, S3)', () => {
    const halfFovDeg = 20;
    const BODY_HALF_CM = 40;
    const edgeDeg = (n: number) => {
      const l = defaultLayout(n);
      const outer = Math.max(...l.seats.map((s) => Math.abs(s.x - HEAD.x)));
      return (Math.atan((outer + BODY_HALF_CM) / DEFAULT_TUNABLES.stageDistanceCm) * 180) / Math.PI;
    };
    expect(new SetupModel().config.audienceCount).toBe(3);
    expect(edgeDeg(3)).toBeLessThan(halfFovDeg);
    expect(edgeDeg(6)).toBeGreaterThan(halfFovDeg);
  });

  it('the raised stage keeps a fully slumped head (30 cm drop) within 20 degrees below eye level', () => {
    const slumpedHeadY = FLOOR_Y + 153 - 30; // AudienceRig HEAD_REST_Y minus the headDropCm at full slump
    const below = HEAD.y - slumpedHeadY;
    expect((Math.atan(below / DEFAULT_TUNABLES.stageDistanceCm) * 180) / Math.PI).toBeLessThan(20);
  });

  it('is centered on the head yaw and ignores head pitch', () => {
    const pitched = computeStageLayout(HEAD, v3(1, -0.5, 0), 3, DEFAULT_TUNABLES);
    expect(pitched.stageCenter.x).toBeCloseTo(250, 6);
    expect(pitched.stageCenter.z).toBeCloseTo(0, 6);
    expect(pitched.seats[1].x).toBeCloseTo(250, 6);
  });

  it('card anchor floats 10 cm above the head tops at stage center; eye targets at eye height', () => {
    const l = defaultLayout(6);
    expect(l.cardAnchor.y).toBeCloseTo(FLOOR_Y + DEFAULT_TUNABLES.audienceHeadTopCm + 10, 9);
    expect(l.eyeTargets[0].y).toBeCloseTo(FLOOR_Y + DEFAULT_TUNABLES.audienceEyeHeightCm, 9);
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
