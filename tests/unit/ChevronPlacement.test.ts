import { ChevronBox, PlacementOptions, PlaneRect, isClear, placeChevron, rectsOverlap } from '../../Assets/Scripts/core/ChevronPlacement';

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

  it('halo case: a lit-head band across the view puts the outline chevron above the head line, clear of every member', () => {
    // Lit halos of three members at the base spot's height, spanning the view: no sideways slide is possible.
    const heads: PlaneRect = { minX: -45, maxX: 45, minY: -18, maxY: 4 };
    for (const side of ['left', 'right'] as const) {
      const r = placeChevron(side, BASE, BOX, [heads], WIDE)!;
      expect(r).not.toBeNull();
      expect(isClear(r.x, r.y, BOX, [heads], WIDE)).toBe(true);
      // Sits above the band (its bottom edge is over the heads) rather than covering a member.
      expect(r.y - BOX.below).toBeGreaterThanOrEqual(heads.maxY + WIDE.margin - 1e-6);
    }
  });

  it('halo case: with no room above, the chevron goes below the band; with no room either way it is dropped', () => {
    const heads: PlaneRect = { minX: -45, maxX: 45, minY: -18, maxY: 4 };
    const tight: PlacementOptions = { margin: 1.5, viewHalfW: 62, viewHalfH: 22 };
    const below = placeChevron('right', BASE, BOX, [heads], tight);
    expect(below === null || isClear(below.x, below.y, BOX, [heads], tight)).toBe(true);
    const noRoom: PlacementOptions = { margin: 1.5, viewHalfW: 62, viewHalfH: 20 };
    expect(placeChevron('right', BASE, BOX, [heads], noRoom)).toBeNull();
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

describe('placeChevron free pockets (halo case, per-member head rects)', () => {
  it('goes into the free wall above a low head instead of above the tallest lit halo or over a member', () => {
    // Left member low (slumped, top at y = -2), centre low, right member lit with a tall ring up to y = 24; the room meter sits right of the left pocket at y 13..21.
    const heads: PlaneRect[] = [
      { minX: -42, maxX: -24, minY: -20, maxY: -2 },
      { minX: -9, maxX: 9, minY: -20, maxY: -2 },
      { minX: 24, maxX: 42, minY: -10, maxY: 24 },
    ];
    const meter: PlaneRect = { minX: -8, maxX: 22, minY: 13, maxY: 21 };
    const o: PlacementOptions = { margin: 1.5, viewHalfW: 62, viewHalfH: 40 };
    const r = placeChevron('left', BASE, BOX, [...heads, meter], o)!;
    expect(r).not.toBeNull();
    expect(isClear(r.x, r.y, BOX, [...heads, meter], o)).toBe(true);
    // Stays on the left (base x), above the left head, below the view top.
    expect(r.x).toBeCloseTo(-21, 5);
    expect(r.y - BOX.below).toBeGreaterThanOrEqual(-2 + o.margin - 1e-6);
  });

  it('returns null rather than overlap when the pockets are all full', () => {
    const wall: PlaneRect = { minX: -62, maxX: 62, minY: -62, maxY: 62 };
    expect(placeChevron('right', BASE, BOX, [wall], WIDE)).toBeNull();
  });
});

describe('placeChevron: head no-go rectangles (Cycle 6, D1)', () => {
  // 3 members 42 cm apart at 2.5 m, in the 100 cm view plane (x0.4): halo ring radius 8.8 cm, upright head centre y = 1.6, fully slumped head y = -18.
  const ring = 8.8;
  const headRect = (x: number, y: number): PlaneRect => ({ minX: x - ring, maxX: x + ring, minY: y - ring, maxY: y + ring });
  const meter: PlaneRect = { minX: -18.8, maxX: 18.8, minY: 13.4, maxY: 17 };
  const dims: PlacementOptions = { margin: 1.5, viewHalfW: 29, viewHalfH: 33 };
  const hintBox: ChevronBox = { halfW: 5.8, below: 1.6, above: 12.1 };

  it('left member slumped: the left chevron lands on the free wall above that head, clear of all three heads and the meter', () => {
    const heads = [headRect(-16.8, -18), headRect(0, 1.6), headRect(16.8, 1.6)];
    const r = placeChevron('left', { x: -21, y: -6.5 }, hintBox, [...heads, meter], dims)!;
    expect(r).not.toBeNull();
    expect(isClear(r.x, r.y, hintBox, [...heads, meter], dims)).toBe(true);
    for (const h of heads) expect(rectsOverlap(boxRectOf(r, hintBox), h)).toBe(false);
  });

  it('right member upright beside a slumped one: the right chevron also avoids every head', () => {
    const heads = [headRect(-16.8, 1.6), headRect(0, -18), headRect(16.8, 1.6)];
    const r = placeChevron('right', { x: 21, y: -6.5 }, hintBox, [...heads, meter], dims);
    if (r) for (const h of heads) expect(rectsOverlap(boxRectOf(r, hintBox), h)).toBe(false);
  });

  it('returns null rather than overlapping a head when the free wall is gone', () => {
    const wall: PlaneRect = { minX: -29, maxX: 29, minY: -33, maxY: 33 };
    expect(placeChevron('left', { x: -21, y: -6.5 }, hintBox, [wall], dims)).toBeNull();
  });
});

function boxRectOf(p: { x: number; y: number }, b: ChevronBox): PlaneRect {
  return { minX: p.x - b.halfW, maxX: p.x + b.halfW, minY: p.y - b.below, maxY: p.y + b.above };
}
