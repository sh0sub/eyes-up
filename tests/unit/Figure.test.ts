import { describe, expect, it } from 'vitest';
import { audienceLook } from '../../Assets/Scripts/core/AudienceLook';
import { FIGURE_HUES, centroid, ellipsePts, figureColors, figureHue, offsetPts, roundedRectPts, scalePts, tagText, tagTone, torsoOutline } from '../../Assets/Scripts/core/Figure';

const sat = (c: readonly number[]): number => {
  const mx = Math.max(c[0], c[1], c[2]);
  return mx === 0 ? 0 : (mx - Math.min(c[0], c[1], c[2])) / mx;
};

describe('figure hues', () => {
  it('gives neighbouring seats clearly different hues and cycles after the palette', () => {
    for (let i = 0; i < 8; i++) {
      const a = figureHue(i);
      const b = figureHue(i + 1);
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      expect(d).toBeGreaterThan(0.4);
    }
    expect(figureHue(FIGURE_HUES.length)).toEqual(figureHue(0));
  });
  it('keeps every hue saturated and luminous', () => {
    FIGURE_HUES.forEach((h) => {
      expect(Math.max(...h)).toBeGreaterThan(0.9);
      expect(sat(h)).toBeGreaterThan(0.45);
    });
  });
});

describe('figure geometry', () => {
  it('torso: neck narrower than shoulders, symmetric, standing on the floor and ending at the neck top', () => {
    const t = torsoOutline();
    const ys = t.map((p) => p[1]);
    expect(Math.min(...ys)).toBe(-70);
    expect(Math.max(...ys)).toBeGreaterThan(70);
    const maxHalf = Math.max(...t.map((p) => p[0]));
    expect(maxHalf).toBeGreaterThan(25);
    const topHalf = Math.max(...t.filter((p) => p[1] === Math.max(...ys)).map((p) => p[0]));
    expect(topHalf).toBeLessThan(8);
    const c = centroid(t);
    expect(Math.abs(c[0])).toBeLessThan(1e-9);
  });
  it('offsets grow and shrink a polygon regardless of winding', () => {
    const e = ellipsePts(10, 13, 32);
    const out = offsetPts(e, 2);
    const inn = offsetPts(e, -2);
    const w = (pts: [number, number][]) => Math.max(...pts.map((p) => p[0]));
    expect(w(out)).toBeGreaterThan(11.5);
    expect(w(inn)).toBeLessThan(8.5);
    const rev = offsetPts(e.slice().reverse(), 2);
    expect(w(rev)).toBeGreaterThan(11.5);
  });
  it('scalePts and roundedRectPts', () => {
    const e = ellipsePts(10, 10, 16);
    const s = scalePts(e, 0.5, 0.5, [0, 0], 3, 4);
    expect(centroid(s)[0]).toBeCloseTo(3, 6);
    expect(centroid(s)[1]).toBeCloseTo(4, 6);
    const r = roundedRectPts(12, 84, 6, 5, 7);
    expect(Math.max(...r.map((p) => p[1]))).toBeCloseTo(49, 6);
    expect(Math.min(...r.map((p) => p[0]))).toBeCloseTo(-1, 6);
  });
});

describe('figure colours', () => {
  const hue = figureHue(3);
  it('an engaged member is more saturated, more opaque and rimmed brighter than a drained one', () => {
    const up = figureColors(hue, 1, 0, 0, 1);
    const down = figureColors(hue, 0, 0, 0, 1);
    expect(sat(up.body)).toBeGreaterThan(sat(down.body));
    expect(up.body[3]).toBeGreaterThan(down.body[3]);
    expect(up.rim[3]).toBeGreaterThan(down.rim[3]);
    expect(up.head[3]).toBeGreaterThan(down.head[3]);
  });
  it('different seats stay different when engaged', () => {
    const a = figureColors(figureHue(0), 1, 0, 0, 1).body;
    const b = figureColors(figureHue(1), 1, 0, 0, 1).body;
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeGreaterThan(0.4);
  });
  it('a lit member rims toward cyan-white and glows more; a perk-up flash shifts toward cyan', () => {
    const plain = figureColors(figureHue(0), 1, 0, 0, 1);
    const lit = figureColors(figureHue(0), 1, 0, 1, 1);
    expect(lit.rim[2]).toBeGreaterThan(plain.rim[2]);
    expect(lit.glow[3]).toBeGreaterThan(plain.glow[3]);
    const flash = figureColors(figureHue(0), 0.2, 1, 0, 1);
    const calm = figureColors(figureHue(0), 0.2, 0, 0, 1);
    expect(flash.body[1]).toBeGreaterThan(calm.body[1]);
  });
  it('fade scales every alpha', () => {
    const half = figureColors(hue, 1, 0, 0, 0.5);
    const full = figureColors(hue, 1, 0, 0, 1);
    expect(half.rim[3]).toBeCloseTo(full.rim[3] / 2, 6);
    expect(figureColors(hue, 1, 0, 0, 0).body[3]).toBe(0);
  });
});

describe('per-person tag', () => {
  it('reads "#n NN%" with 1-based seats and the room meter tones', () => {
    expect(tagText(0, 1)).toBe('#1 100%');
    expect(tagText(2, 0.554)).toBe('#3 55%');
    expect(tagText(1, 0)).toBe('#2 0%');
    expect(tagTone(0.8)).toBe('good');
    expect(tagTone(0.5)).toBe('mid');
    expect(tagTone(0.1)).toBe('low');
  });
  it('the audience look carries the engagement and burst the tag and figure read', () => {
    const l = audienceLook(0.35, 0.5);
    expect(l.engagement).toBeCloseTo(0.35, 9);
    expect(l.burst).toBeCloseTo(0.5, 9);
  });
});
