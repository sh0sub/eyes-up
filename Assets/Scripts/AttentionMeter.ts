/**
 * AttentionMeter.ts — attention[0..1] per audience member, and the halo look derived from it.
 *
 * plan: "보면 1 s에 가득, 안 보면 12 s에 소진. 밝기·크기, 실루엣 1.0→1.05".
 * Linear integration: +dt/fillSeconds while looked at, -dt/drainSeconds otherwise, clamped.
 *
 * The Lens side applies `haloVisual(i)` to the halo material (mainPass.baseColor) and the
 * silhouette scale through the `HaloView` adapter; nothing here touches Lens Studio APIs.
 */
import { Tunables, Zone, zoneOf } from './core/Tunables';
import { clamp01, lerp } from './core/math';

export interface HaloVisual {
  /** Final halo color with alpha, linear 0..1 (rgba). Black is never used (additive display). */
  color: [number, number, number, number];
  /** Silhouette scale, 1.0 (ignored) -> 1.05 (fully attended). */
  scale: number;
}

/** Lens adapter: e.g. `renderMeshVisual.mainPass.baseColor = new vec4(...color)`, `transform.setLocalScale(...)`. */
export interface HaloView {
  applyHalo(index: number, visual: HaloVisual): void;
}

/**
 * design: cool dim glass -> saturated cyan (artifact S2: "watched member glows cyan"). Pass 6: the
 * old cyan-white (0.85, 0.97, 1.0) washed out to a pale disc on the additive display, so the lit
 * end keeps red low. Not black, per Spectacles UI guidance.
 */
export const HALO_DIM: readonly [number, number, number] = [0.3, 0.45, 0.92];
export const HALO_BRIGHT: readonly [number, number, number] = [0.18, 0.86, 1.0];
/** Game pass: 0.15 -> 0.3 so an unwatched halo is still a visible blue ring, not grey-on-grey. */
export const HALO_MIN_ALPHA = 0.3;
export const HALO_MAX_SCALE = 1.05;

export type AttentionTunables = Pick<Tunables, 'fillSeconds' | 'drainSeconds'>;

export class AttentionMeter {
  private values: number[] = [];

  constructor(private readonly t: AttentionTunables) {}

  reset(count: number): void {
    this.values = new Array<number>(count).fill(0);
  }

  get count(): number {
    return this.values.length;
  }

  get attention(): readonly number[] {
    return this.values;
  }

  update(dt: number, looking: readonly boolean[]): void {
    const up = dt / this.t.fillSeconds;
    const down = dt / this.t.drainSeconds;
    for (let i = 0; i < this.values.length; i++) {
      this.values[i] = clamp01(this.values[i] + (looking[i] ? up : -down));
    }
  }

  /** "한 구역 전체가 0.2 미만" — a zone counts as neglected when its most-attended member is below the threshold. */
  zoneAttention(zone: Zone): number {
    let max = 0;
    for (let i = 0; i < this.values.length; i++) {
      if (zoneOf(i, this.values.length) === zone && this.values[i] > max) max = this.values[i];
    }
    return max;
  }

  zoneAttentions(): [number, number, number] {
    return [this.zoneAttention(0), this.zoneAttention(1), this.zoneAttention(2)];
  }

  haloVisual(i: number): HaloVisual {
    return haloVisualFor(this.values[i] ?? 0);
  }

  applyTo(view: HaloView): void {
    for (let i = 0; i < this.values.length; i++) view.applyHalo(i, this.haloVisual(i));
  }
}

/** `burstAlpha` (0..1) comes from the engagement perk-up burst (core/AudienceLook.ts). */
export function haloVisualFor(attention: number, burstAlpha = 0): HaloVisual {
  const a = clamp01(attention);
  return {
    color: [
      lerp(HALO_DIM[0], HALO_BRIGHT[0], a),
      lerp(HALO_DIM[1], HALO_BRIGHT[1], a),
      lerp(HALO_DIM[2], HALO_BRIGHT[2], a),
      Math.min(1, lerp(HALO_MIN_ALPHA, 1, a) + burstAlpha),
    ],
    scale: lerp(1, HALO_MAX_SCALE, a),
  };
}
