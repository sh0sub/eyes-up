/**
 * RoomMeter.ts — the glanceable room attention meter (game layer).
 *
 * Design cycle 3 (F8): one capsule, centred on the audience. A dark capsule track holds a saturated fill (cyan at 70 % or above, amber
 * below 70 %, coral below 40 %) and a 3 px tick at the 70 % mark with a "target" caption above it. "Room NN%" sits on the same caption
 * row above the capsule's left end, so the meter is one shape plus one line of text (no separate pill). The root is the capsule centre;
 * it is billboarded to the speaker 4 cm above the tallest head (see EyesUpApp.placeAt). Sizes are the spec's 24 x 2.4 cm scaled about
 * 2.2x for the 2.5 m stage distance, the same way the cue card type is scaled.
 */
import { METER_GOOD_AT, MeterTone } from './core/GameScore';
import { RoomMeterVisual, RoomMeterView } from './core/EyesUpSession';
import { PANEL_FILL, PANEL_STROKE, STAGE_GLOW_CM, STAGE_STROKE_CM, TEXT_PRIMARY, addPanelGlow, addRoundedSurface, addSurface, addText, child, faceTowards } from './EyesUpUI';

/**
 * Round 3 layout: "Room NN%" to the LEFT of the bar at body size (230, larger than the 190 tag text), the bar about 30 % thicker (6.2 -> 8.2 cm)
 * with a brighter, wider tick, and "target" directly under the tick. The row is centred on the root; the bar sits to the right of the label.
 */
const CAP_W = 40;
const CAP_H = 8.2;
const LABEL_W = 29;
const LABEL_GAP = 2.2;
const TARGET_H = 4.4;
const TARGET_GAP = 0.8;
/** Total extents (cm, local) used by the nudge chevron's keep-clear rectangle in EyesUpApp. */
export const METER_WIDTH_CM = LABEL_W + LABEL_GAP + CAP_W;
export const METER_CAPSULE_H_CM = CAP_H;
/** Extent above the root (half the bar) and below it (half the bar, a gap, the "target" row). */
export const METER_ABOVE_CM = CAP_H / 2;
export const METER_BELOW_CM = CAP_H / 2 + TARGET_GAP + TARGET_H;
const TRACK_COLOR = PANEL_FILL;
const FILL_INSET = 0.8;
const TICK_COLOR = new vec4(1, 1, 1, 1);
/** 2.2 cm at 250 cm: a bright, wide tick that reads next to the pill. */
const TICK_W = 1.7;
const TONE_COLOR: Record<MeterTone, vec4> = {
  good: new vec4(0.1, 0.95, 1.0, 1),
  mid: new vec4(1.0, 0.72, 0.12, 1),
  low: new vec4(1.0, 0.3, 0.28, 1),
};
const TARGET_COLOR = new vec4(0.85, 0.95, 1.0, 1);
/** Caption text at 2.5 m: Body-step size, at least the size of the tag text (190). */
const LABEL_SIZE = 230;
const TARGET_SIZE = 210;

export class RoomMeter implements RoomMeterView {
  readonly root: SceneObject;
  private readonly pivot: SceneObject;
  private readonly fill: RenderMeshVisual;
  private readonly label: Text;
  private shownPercent = -1;
  private shownTone: MeterTone | null = null;

  constructor() {
    this.root = global.scene.createSceneObject('RoomMeter');
    const rowLeft = -METER_WIDTH_CM / 2;
    const capCx = rowLeft + LABEL_W + LABEL_GAP + CAP_W / 2;
    const left = capCx - CAP_W / 2;
    addPanelGlow(child(this.root, 'CapsuleGlow', new vec3(capCx, 0, -0.05)), CAP_W, CAP_H, CAP_H / 2, 0, -1, STAGE_GLOW_CM * 0.6);
    addRoundedSurface(child(this.root, 'Capsule', new vec3(capCx, 0, 0)), CAP_W, CAP_H, 0, TRACK_COLOR, PANEL_STROKE, CAP_H / 2, STAGE_STROKE_CM);
    // The fill grows from the capsule's left end: a pivot at the left edge is scaled on X.
    const fillW = CAP_W - 2 * FILL_INSET;
    const fillH = CAP_H - 2 * FILL_INSET;
    this.pivot = child(this.root, 'FillPivot', new vec3(left + FILL_INSET, 0, 0.1));
    this.fill = addRoundedSurface(child(this.pivot, 'Bar', new vec3(fillW / 2, 0, 0)), fillW, fillH, 0, TONE_COLOR.good, null, fillH / 2);
    addRoundedSurface(child(this.pivot, 'Sheen', new vec3(fillW / 2, fillH * 0.2, 0.05)), fillW - 1.2, fillH * 0.32, 0, new vec4(1, 1, 1, 0.38), null, fillH * 0.16);
    const tickX = left + CAP_W * METER_GOOD_AT;
    addSurface(child(this.root, 'Tick70', new vec3(tickX, 0, 0.2)), TICK_W, CAP_H + 2.2, 0, TICK_COLOR, null);
    this.label = addText(this.root, 'Percent', 'Room 100%', 'Body', LABEL_W, CAP_H, 250, TEXT_PRIMARY, new vec3(rowLeft, 0, 0.1));
    this.label.size = LABEL_SIZE;
    this.label.horizontalAlignment = HorizontalAlignment.Left;
    this.label.layoutRect = Rect.create(0, LABEL_W, -CAP_H / 2, CAP_H / 2);
    this.label.getSceneObject().getTransform().setLocalPosition(new vec3(rowLeft, 0, 0.1));
    this.label.setRenderOrder(11);
    // "target" hangs straight under the tick, clear of the bar by a gap.
    const targetY = -(CAP_H / 2 + TARGET_GAP + TARGET_H / 2);
    const target = addText(this.root, 'Target', 'target', 'Body', 20, TARGET_H, 250, TARGET_COLOR, new vec3(tickX, targetY, 0.1));
    target.size = TARGET_SIZE;
    target.setRenderOrder(11);
    this.root.enabled = false;
  }

  apply(v: RoomMeterVisual): void {
    this.pivot.getTransform().setLocalScale(new vec3(Math.max(0.001, v.level), 1, 1));
    if (v.tone !== this.shownTone) {
      this.shownTone = v.tone;
      this.fill.mainPass.baseColor = TONE_COLOR[v.tone];
    }
    if (v.percent !== this.shownPercent) {
      this.shownPercent = v.percent;
      this.label.text = `Room ${v.percent}%`;
    }
  }

  setVisible(visible: boolean): void {
    this.root.enabled = visible;
  }

  placeAt(position: vec3, head: vec3): void {
    this.root.getTransform().setWorldPosition(position);
    faceTowards(this.root, head, true);
  }
}
