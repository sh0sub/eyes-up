/**
 * ChevronPlacement.ts — where the amber nudge chevron sits so it never covers a panel.
 *
 * The chevron is head-locked (a child of the camera), so everything is measured in the camera's
 * view plane, in cm at the chevron's own distance (100 cm ahead): +x right, +y up. Panels (podium,
 * cue card) are projected into that plane by the Lens adapter and arrive here as plain rects.
 * Rule: keep the base spot (view edge, per the artifact S3 mockup) when it is clear; otherwise slide
 * outward toward the view edge; otherwise move above, then below, the blocking panels (or into any free pocket straight above / below the base spot); if none of
 * that fits inside the view, return null (the chime still plays, no chevron is drawn over a panel).
 */
export type Side = 'left' | 'right';

export interface PlaneRect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Chevron backing relative to the hint origin (cm, at its largest pulse scale). */
export interface ChevronBox {
  halfW: number;
  below: number;
  above: number;
}

export interface PlacementOptions {
  /** Clear gap kept between the chevron backing and any panel. */
  margin: number;
  /** Half extent of the visible plane (cm): the backing must stay inside it. */
  viewHalfW: number;
  viewHalfH: number;
}

export interface PlacementResult {
  x: number;
  y: number;
}

function boxRect(x: number, y: number, b: ChevronBox, pad: number): PlaneRect {
  return { minX: x - b.halfW - pad, maxX: x + b.halfW + pad, minY: y - b.below - pad, maxY: y + b.above + pad };
}

/** Vertical scan step (cm in the view plane) for the free-pocket candidates. */
const SCAN_STEP = 0.5;

/** Edges that touch within this tolerance (cm) are not an overlap: candidates are built to sit exactly on the margin. */
const EPS = 1e-6;

export function rectsOverlap(a: PlaneRect, b: PlaneRect): boolean {
  return a.minX < b.maxX - EPS && a.maxX > b.minX + EPS && a.minY < b.maxY - EPS && a.maxY > b.minY + EPS;
}

function inView(x: number, y: number, b: ChevronBox, o: PlacementOptions): boolean {
  const r = boxRect(x, y, b, 0);
  return r.minX >= -o.viewHalfW && r.maxX <= o.viewHalfW && r.minY >= -o.viewHalfH && r.maxY <= o.viewHalfH;
}

/** True when the chevron backing at (x, y) is clear of every panel by `margin` and inside the view. */
export function isClear(x: number, y: number, b: ChevronBox, panels: readonly PlaneRect[], o: PlacementOptions): boolean {
  if (!inView(x, y, b, o)) return false;
  const r = boxRect(x, y, b, o.margin);
  return !panels.some((p) => rectsOverlap(r, p));
}

/** Hint origin for `side`, starting at `base` (|x| = view-edge spot, y); null = no clear spot. */
export function placeChevron(
  side: Side,
  base: PlacementResult,
  b: ChevronBox,
  allPanels: readonly PlaneRect[],
  o: PlacementOptions,
): PlacementResult | null {
  const sign = side === 'left' ? -1 : 1;
  const bx = sign * Math.abs(base.x);
  // Panels outside the visible plane (e.g. the podium while looking up) cannot collide.
  const view: PlaneRect = { minX: -o.viewHalfW, maxX: o.viewHalfW, minY: -o.viewHalfH, maxY: o.viewHalfH };
  const panels = allPanels.filter((p) => rectsOverlap(p, view));
  if (isClear(bx, base.y, b, panels, o)) return { x: bx, y: base.y };

  // Candidates: slide outward past the panels beside the chevron, or go above / below all panels.
  const candidates: PlacementResult[] = [];
  let outer = Math.abs(bx);
  for (const p of panels) {
    const edge = sign < 0 ? -p.minX : p.maxX;
    if (edge + o.margin + b.halfW > outer && p.maxY + o.margin > base.y - b.below && p.minY - o.margin < base.y + b.above) {
      outer = edge + o.margin + b.halfW;
    }
  }
  candidates.push({ x: sign * outer, y: base.y });
  candidates.push({ x: bx, y: Math.max(...panels.map((p) => p.maxY)) + o.margin + b.below });
  candidates.push({ x: bx, y: Math.min(...panels.map((p) => p.minY)) - o.margin - b.above });

  // Free pockets between obstacles (e.g. the wall left of the room meter, above one low head): scan up and down at the base x.
  for (let dy = SCAN_STEP; dy <= 2 * o.viewHalfH; dy += SCAN_STEP) {
    candidates.push({ x: bx, y: base.y + dy }, { x: bx, y: base.y - dy });
  }

  // The clear candidate that moves the chevron least.
  let best: PlacementResult | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(c.x - bx, c.y - base.y);
    if (d < bestDist && isClear(c.x, c.y, b, panels, o)) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}
