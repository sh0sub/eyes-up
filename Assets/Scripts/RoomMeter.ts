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
import { PANEL_STROKE, TEXT_PRIMARY, addRoundedSurface, addSurface, addText, child, faceTowards } from './EyesUpUI';

const CAP_W = 53;
const CAP_H = 5.3;
const LABEL_H = 4.2;
const LABEL_GAP = 0.6;
/** Total extents (cm, local) used by the nudge chevron's keep-clear rectangle in EyesUpApp. */
export const METER_WIDTH_CM = CAP_W;
export const METER_CAPSULE_H_CM = CAP_H;
/** Extent above the capsule centre: half the capsule, a gap, the label row. */
export const METER_ABOVE_CM = CAP_H / 2 + LABEL_GAP + LABEL_H;
const TRACK_COLOR = new vec4(0.02, 0.04, 0.13, 0.92);
const FILL_INSET = 0.55;
const TICK_COLOR = new vec4(1, 1, 1, 0.95);
/** 3 px at the stage distance. */
const TICK_W = 1.0;
const TONE_COLOR: Record<MeterTone, vec4> = {
  good: new vec4(0.2, 0.9, 1.0, 1),
  mid: new vec4(1.0, 0.76, 0.28, 1),
  low: new vec4(1.0, 0.42, 0.36, 1),
};
const TARGET_COLOR = new vec4(0.78, 0.9, 1.0, 0.9);
/** Caption text at 2.5 m: Body-step size for the label, Caption-step for "target". */
const LABEL_SIZE = 230;
const TARGET_SIZE = 170;

export class RoomMeter implements RoomMeterView {
  readonly root: SceneObject;
  private readonly pivot: SceneObject;
  private readonly fill: RenderMeshVisual;
  private readonly label: Text;
  private shownPercent = -1;
  private shownTone: MeterTone | null = null;

  constructor() {
    this.root = global.scene.createSceneObject('RoomMeter');
    const left = -CAP_W / 2;
    addRoundedSurface(child(this.root, 'Capsule', new vec3(0, 0, 0)), CAP_W, CAP_H, 0, TRACK_COLOR, PANEL_STROKE, CAP_H / 2, 0.25);
    // The fill grows from the capsule's left end: a pivot at the left edge is scaled on X.
    const fillW = CAP_W - 2 * FILL_INSET;
    const fillH = CAP_H - 2 * FILL_INSET;
    this.pivot = child(this.root, 'FillPivot', new vec3(left + FILL_INSET, 0, 0.1));
    this.fill = addRoundedSurface(child(this.pivot, 'Bar', new vec3(fillW / 2, 0, 0)), fillW, fillH, 0, TONE_COLOR.good, null, fillH / 2);
    const tickX = left + CAP_W * METER_GOOD_AT;
    addSurface(child(this.root, 'Tick70', new vec3(tickX, 0, 0.2)), TICK_W, CAP_H + 1.6, 0, TICK_COLOR, null);
    const rowY = CAP_H / 2 + LABEL_GAP + LABEL_H / 2;
    this.label = addText(this.root, 'Percent', 'Room 100%', 'Body', 26, LABEL_H, 250, TEXT_PRIMARY, new vec3(left + 13, rowY, 0.1));
    this.label.size = LABEL_SIZE;
    this.label.horizontalAlignment = HorizontalAlignment.Left;
    this.label.layoutRect = Rect.create(0, 26, -LABEL_H / 2, LABEL_H / 2);
    this.label.getSceneObject().getTransform().setLocalPosition(new vec3(left, rowY, 0.1));
    this.label.setRenderOrder(11);
    const target = addText(this.root, 'Target', 'target', 'Caption', 14, LABEL_H, 250, TARGET_COLOR, new vec3(tickX, rowY, 0.1));
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
