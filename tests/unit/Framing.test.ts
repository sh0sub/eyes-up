import { describe, expect, it } from 'vitest';
import { computeStageLayout } from '../../Assets/Scripts/StagePlacer';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';
import { CANONICAL_PITCH_DEG, forwardAtPitch, headExtent, insideMargin, projectToViewport, summaryExtent } from '../../Assets/Scripts/core/Framing';
import { PHONE_BOTTOM_BELOW_CENTER_CM, PHONE_Y_CM } from '../../Assets/Scripts/core/AudienceLook';

const head = { x: 0, y: 0, z: 0 };
const facing = { x: 0, y: 0, z: -1 };

describe('Preview framing (Cycle 4, D1)', () => {
  it('projects a point straight ahead to the viewport centre', () => {
    const p = projectToViewport(head, facing, { x: 0, y: 0, z: -250 });
    expect(p?.x).toBeCloseTo(0, 6);
    expect(p?.y).toBeCloseTo(0, 6);
    expect(projectToViewport(head, facing, { x: 0, y: 0, z: 50 })).toBeNull();
  });

  it('puts all 3 default heads (upright and fully slumped) inside a 10 % margin at the canonical pitch', () => {
    const layout = computeStageLayout(head, facing, 3, DEFAULT_TUNABLES);
    const fwd = forwardAtPitch(CANONICAL_PITCH_DEG);
    for (const seat of layout.seats) {
      const e = headExtent(head, fwd, seat);
      expect(e).not.toBeNull();
      if (e) expect(insideMargin(e), JSON.stringify(e)).toBe(true);
    }
  });

  it('keeps the shoulders in frame: the body just below the upright head is visible for every member', () => {
    const layout = computeStageLayout(head, facing, 3, DEFAULT_TUNABLES);
    const fwd = forwardAtPitch(CANONICAL_PITCH_DEG);
    for (const seat of layout.seats) {
      const p = projectToViewport(head, fwd, { x: seat.x, y: seat.y + 125, z: seat.z });
      expect(p && Math.abs(p.y) < 1 && Math.abs(p.x) < 1).toBe(true);
    }
  });

  it('would clip a 6-member arc at the edge (why the Setup default is 3)', () => {
    const layout = computeStageLayout(head, facing, 6, DEFAULT_TUNABLES);
    const fwd = forwardAtPitch(CANONICAL_PITCH_DEG);
    const inside = layout.seats.map((s) => {
      const e = headExtent(head, fwd, s);
      return !!e && insideMargin(e);
    });
    expect(inside.every(Boolean)).toBe(false);
  });
});

describe('Cycle 5 framing (R1, R2)', () => {
  it('keeps the whole Summary panel (header and grade tile included) inside the viewport, with its top 8 to 16 % below the viewport top', () => {
    const e = summaryExtent(head, forwardAtPitch(CANONICAL_PITCH_DEG));
    expect(e).not.toBeNull();
    if (!e) return;
    expect(e.top, JSON.stringify(e)).toBeLessThanOrEqual(0.92);
    expect(e.top).toBeGreaterThanOrEqual(0.84);
    expect(e.bottom).toBeGreaterThanOrEqual(-0.95);
    expect(e.left).toBeGreaterThanOrEqual(-0.9);
    expect(e.right).toBeLessThanOrEqual(0.9);
  });

  it('keeps every slumped member\'s phone glow inside the bottom 4 % margin of the viewport', () => {
    const layout = computeStageLayout(head, facing, 3, DEFAULT_TUNABLES);
    const fwd = forwardAtPitch(CANONICAL_PITCH_DEG);
    for (const seat of layout.seats) {
      const p = projectToViewport(head, fwd, { x: seat.x, y: seat.y + PHONE_Y_CM - PHONE_BOTTOM_BELOW_CENTER_CM, z: seat.z });
      expect(p && p.y >= -0.96, JSON.stringify(p)).toBe(true);
    }
  });
});
