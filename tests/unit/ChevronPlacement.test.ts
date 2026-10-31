import { ChevronBox, PlacementOptions, PlaneRect, isClear, placeChevron } from '../../Assets/Scripts/core/ChevronPlacement';

// Same numbers as EyesUpApp: backing 15 x 19 cm, 4.2 cm above the hint origin; hint base x = 21, y = -6.5.
const BOX: ChevronBox = { halfW: 7.9, below: 5.6, above: 14.5 };
const BASE = { x: 21, y: -6.5 };
const WIDE: PlacementOptions = { margin: 1.5, viewHalfW: 62, viewHalfH: 62 };
const NARROW: PlacementOptions = { margin: 1.5, viewHalfW: 33, viewHalfH: 25 };

// Podium 34 x 11 cm at 55 cm, projected to the 100 cm plane: 62 x 20 cm, centered in view.
const PODIUM: PlaneRect = { minX: -31, maxX: 31, minY: -10, maxY: 10 };

describe('placeChevron', () => {
  it('regression: centered pill in a narrow view (aspect 0.875) steps down just clear of the pill', () => {
    const pill: PlaneRect = { minX: -15.23, maxX: 15.23, minY: 8.6, maxY: 13.8 };
    const podiumOffscreen: PlaneRect = { minX: -32.5, maxX: 32.5, minY: -66.5, maxY: -43.7 };
    const dims: PlacementOptions = { margin: 1.5, viewHalfW: 28.9, viewHalfH: 33.06 };
    for (const side of ['left', 'right'] as const) {
      const r = placeChevron(side, BASE, BOX, [podiumOffscreen, pill], dims)!;
      expect(r).not.toBeNull();
      expect(Math.abs(r.x)).toBeCloseTo(21, 5);
      expect(r.y).toBeLessThan(-6.5);
      expect(r.y).toBeGreaterThan(-9);
      expect(isClear(r.x, r.y, BOX, [pill], dims)).toBe(true);
    }
  });


  it('regression: a centered pill (15.2 x 5.2 cm in the plane) pushes the chevron out, not away (no float tie)', () => {
    const pill: PlaneRect = { minX: -15.2, maxX: 15.2, minY: 8.6, maxY: 13.8 };
    const dims: PlacementOptions = { margin: 1.5, viewHalfW: 33.1, viewHalfH: 33.1 };
    for (const side of ['left', 'right'] as const) {
      const r = placeChevron(side, BASE, BOX, [pill], dims);
      expect(r).not.toBeNull();
      expect(isClear(r!.x, r!.y, BOX, [pill], dims)).toBe(true);
    }
  });

  it('keeps the view-edge spot when no panel is near', () => {
    expect(placeChevron('right', BASE, BOX, [], WIDE)).toEqual({ x: 21, y: -6.5 });
    expect(placeChevron('left', BASE, BOX, [], WIDE)).toEqual({ x: -21, y: -6.5 });
  });

  it('regression: the right chevron no longer covers the podium panel (it slides outward)', () => {
    const r = placeChevron('right', BASE, BOX, [PODIUM], WIDE)!;
    expect(r.x).toBeGreaterThanOrEqual(PODIUM.maxX + WIDE.margin + BOX.halfW);
    expect(isClear(r.x, r.y, BOX, [PODIUM], WIDE)).toBe(true);
  });

  it('mirrors for the left side', () => {
    const r = placeChevron('left', BASE, BOX, [PODIUM], WIDE)!;
    expect(r.x).toBeLessThanOrEqual(PODIUM.minX - WIDE.margin - BOX.halfW);
  });

  it('moves above or below the panel (the nearer clear side) when the view edge is too close to slide', () => {
    const r = placeChevron('right', BASE, BOX, [PODIUM], { margin: 1.5, viewHalfW: 45, viewHalfH: 45 })!;
    expect(r.y - BOX.below > PODIUM.maxY || r.y + BOX.above < PODIUM.minY).toBe(true);
    expect(isClear(r.x, r.y, BOX, [PODIUM], { margin: 1.5, viewHalfW: 45, viewHalfH: 45 })).toBe(true);
  });

  it('returns null rather than overlap when nothing fits (narrow device view)', () => {
    expect(placeChevron('right', BASE, BOX, [PODIUM], NARROW)).toBeNull();
    expect(placeChevron('left', BASE, BOX, [PODIUM], NARROW)).toBeNull();
  });

  it('ignores panels that are far off to the other side', () => {
    const farLeft: PlaneRect = { minX: -60, maxX: -40, minY: -10, maxY: 10 };
    expect(placeChevron('right', BASE, BOX, [farLeft], WIDE)).toEqual({ x: 21, y: -6.5 });
  });

  it('never returns a spot that overlaps any panel, across panel offsets and both sides', () => {
    for (let cx = -50; cx <= 50; cx += 5) {
      for (let cy = -20; cy <= 20; cy += 10) {
        const p: PlaneRect = { minX: cx - 31, maxX: cx + 31, minY: cy - 10, maxY: cy + 10 };
        for (const side of ['left', 'right'] as const) {
          const r = placeChevron(side, BASE, BOX, [p], WIDE);
          if (r) expect(isClear(r.x, r.y, BOX, [p], WIDE)).toBe(true);
        }
      }
    }
  });
});
