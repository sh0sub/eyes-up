import { BODY_HEIGHT_CM, FADE_END_CM, FADE_ROWS, FADE_START_CM, SHADOW_LAYERS, bodyFadeAlpha, bodyFadePixels, headDepthScale, shadowBars } from '../../Assets/Scripts/core/BodyFade';
import { audienceLook, HEAD_UP_Y } from '../../Assets/Scripts/core/AudienceLook';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';

describe('body fade (Cycle 6, D2)', () => {
  it('is transparent at the bottom, opaque from the shoulders down to FADE_START_CM, and monotonic in between', () => {
    expect(bodyFadeAlpha(0)).toBe(0);
    expect(bodyFadeAlpha(FADE_END_CM)).toBe(0);
    expect(bodyFadeAlpha(FADE_START_CM)).toBe(1);
    expect(bodyFadeAlpha(BODY_HEIGHT_CM)).toBe(1);
    let prev = 0;
    for (let h = FADE_END_CM; h <= FADE_START_CM; h += 2) {
      expect(bodyFadeAlpha(h)).toBeGreaterThanOrEqual(prev);
      prev = bodyFadeAlpha(h);
    }
  });

  it('is already transparent just above the preview frame bottom for the squashed (slumped) body', () => {
    // Frame bottom is about 57 cm above the feet; squashed to 90 %, height h maps to 0.9 h of the mesh.
    expect(bodyFadeAlpha(57 / 0.9)).toBeLessThan(0.02);
  });

  it('texture: row 0 (feet) is clear, the top row opaque; the plain variant is opaque everywhere', () => {
    const px = bodyFadePixels(2);
    expect(px.length).toBe(2 * FADE_ROWS * 4);
    expect(px[3]).toBe(0);
    expect(px[(FADE_ROWS - 1) * 2 * 4 + 3]).toBe(255);
    expect(bodyFadePixels(2, true).every((v) => v === 255)).toBe(true);
  });

  it('shadow bars form a symmetric ellipse inside the layer extents, widest in the middle', () => {
    for (const layer of SHADOW_LAYERS) {
      const bars = shadowBars(layer);
      expect(Math.max(...bars.map((b) => b.w))).toBeLessThanOrEqual(2 * layer.halfW);
      expect(bars[0].w).toBeCloseTo(bars[bars.length - 1].w, 6);
      expect(bars[Math.floor(bars.length / 2)].w).toBeGreaterThan(bars[0].w);
      expect(bars[0].y).toBeCloseTo(-bars[bars.length - 1].y, 6);
    }
  });
});

describe('slumped head scale cap (Cycle 6, D2)', () => {
  const D = DEFAULT_TUNABLES.stageDistanceCm;
  it('never exceeds the lit head scale and shrinks as the head creeps toward the viewer', () => {
    expect(headDepthScale(0, D)).toBe(1);
    expect(headDepthScale(-10, D)).toBe(1);
    expect(headDepthScale(40, D)).toBeCloseTo(0.84, 5);
  });

  it('the slumped head keeps the lit head apparent size (within 2 %), mirroring AudienceRig placement', () => {
    const look = audienceLook(0);
    const k = look.bodyScaleY;
    const lean = (look.headPitchDeg * 0.35 * Math.PI) / 180;
    const forward = HEAD_UP_Y * k * Math.sin(lean) + 8; // slump = 1
    const apparent = headDepthScale(forward, D) * (D / (D - forward));
    expect(apparent).toBeGreaterThan(0.98);
    expect(apparent).toBeLessThan(1.02);
  });
});
