import { describe, expect, it } from 'vitest';
import { computeStageLayout } from '../../Assets/Scripts/StagePlacer';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';
import { CANONICAL_PITCH_DEG, deviceFrameBottomAt, forwardAtPitch, headExtent, insideMargin, projectToDevice, projectToViewport, summaryExtent } from '../../Assets/Scripts/core/Framing';
import { FADE_END_CM } from '../../Assets/Scripts/core/BodyFade';
import { TORSO_WIDTH_SCALE } from '../../Assets/Scripts/core/Figure';
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

describe('Win cycle 1: the Spectacles-sized frame (37 x 32 degrees), audience of 3', () => {
  const layout = computeStageLayout(head, facing, 3, DEFAULT_TUNABLES);
  const fwd = forwardAtPitch(CANONICAL_PITCH_DEG);
  const M = 0.92;
  const at = (seat: { x: number; y: number; z: number }, dx: number, dy: number) => projectToDevice(head, fwd, { x: seat.x + dx, y: seat.y + dy, z: seat.z });

  it('every head, halo, lit shoulder, attention gauge and "+N" pop sits inside the device frame with an 8 % margin', () => {
    const shoulder = 29.4 * TORSO_WIDTH_SCALE * 1.05; // widest torso row, lit (1.05x) scale
    for (const seat of layout.seats) {
      const pts = [
        at(seat, -20, 153), at(seat, 20, 153), at(seat, 0, 177), // head + halo (upright, lit)
        at(seat, -shoulder, 130), at(seat, shoulder, 130), // shoulders
        at(seat, -9, 182.2), at(seat, 9, 182.2), // gauge row
        at(seat, -8, 190.5), at(seat, 8, 190.5), // highest "+N" pop
      ];
      for (const p of pts) {
        expect(p, 'in front').not.toBeNull();
        if (p) expect(Math.abs(p.x) <= M && Math.abs(p.y) <= M, JSON.stringify(p)).toBe(true);
      }
    }
  });

  it('the figure body has faded out completely above the device frame bottom, so no stroke is cut by the frame edge', () => {
    for (const seat of layout.seats) expect(deviceFrameBottomAt(head, fwd, seat)).toBeLessThan(FADE_END_CM);
  });
});
