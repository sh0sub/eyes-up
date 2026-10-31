import { AttentionMeter, HaloVisual, haloVisualFor } from '../../Assets/Scripts/AttentionMeter';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';
import { runFor } from '../helpers/fixtures';

const only = (i: number, n = 6) => Array.from({ length: n }, (_, k) => k === i);

describe('AttentionMeter (#14, M4 #11)', () => {
  it('fills to 1.0 in 1 s of looking (0.5 at 0.5 s)', () => {
    const m = new AttentionMeter(DEFAULT_TUNABLES);
    m.reset(6);
    runFor(0.5, (dt) => m.update(dt, only(3)));
    expect(m.attention[3]).toBeCloseTo(0.5, 6);
    runFor(0.5, (dt) => m.update(dt, only(3)));
    expect(m.attention[3]).toBeCloseTo(1, 6);
  });

  it('LEAF gaze_fills_halo: #3 for 1.2 s -> attention[3] >= 0.95, attention[1] <= 0.1', () => {
    const m = new AttentionMeter(DEFAULT_TUNABLES);
    m.reset(6);
    runFor(1.2, (dt) => m.update(dt, only(3)));
    expect(m.attention[3]).toBeGreaterThanOrEqual(0.95);
    expect(m.attention[1]).toBeLessThanOrEqual(0.1);
  });

  it('drains from 1.0 to 0 over 12 s (0.5 at 6 s), clamped at 0', () => {
    const m = new AttentionMeter(DEFAULT_TUNABLES);
    m.reset(6);
    runFor(1, (dt) => m.update(dt, only(0)));
    runFor(6, (dt) => m.update(dt, only(-1)));
    expect(m.attention[0]).toBeCloseTo(0.5, 6);
    runFor(6.5, (dt) => m.update(dt, only(-1)));
    expect(m.attention[0]).toBe(0);
  });

  it('zoneAttention = max member attention in the zone', () => {
    const m = new AttentionMeter(DEFAULT_TUNABLES);
    m.reset(6);
    runFor(0.3, (dt) => m.update(dt, only(1)));
    expect(m.zoneAttention(0)).toBeCloseTo(0.3, 6);
    expect(m.zoneAttentions()).toEqual([m.attention[1], 0, 0]);
  });

  it('halo visual: dim/transparent at 0, bright/opaque and scale 1.05 at 1, never black', () => {
    const lo = haloVisualFor(0);
    const hi = haloVisualFor(1);
    expect(lo.scale).toBe(1);
    expect(hi.scale).toBeCloseTo(1.05, 9);
    expect(hi.color[3]).toBe(1);
    expect(lo.color[3]).toBeLessThan(hi.color[3]);
    for (const v of [lo, hi, haloVisualFor(0.5)]) expect(Math.max(...v.color.slice(0, 3))).toBeGreaterThan(0.3);
    expect(haloVisualFor(2)).toEqual(hi);
  });

  it('halo lit color is saturated cyan, not a pale white disc (artifact S2)', () => {
    const [r, g, b] = haloVisualFor(1).color;
    expect(r).toBeLessThan(0.3);
    expect(g).toBeGreaterThan(0.8);
    expect(b).toBeGreaterThan(0.95);
    // bright end is clearly more saturated than the dim end
    const dim = haloVisualFor(0).color;
    expect(g - r).toBeGreaterThan(dim[1] - dim[0]);
  });

  it('applyTo pushes one visual per member to the view adapter', () => {
    const m = new AttentionMeter(DEFAULT_TUNABLES);
    m.reset(3);
    const calls: Array<[number, HaloVisual]> = [];
    m.applyTo({ applyHalo: (i, v) => calls.push([i, v]) });
    expect(calls.map((c) => c[0])).toEqual([0, 1, 2]);
  });
});
