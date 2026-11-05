/**
 * RoomMeter.ts — the glanceable room attention meter (game layer, artifact-free design note).
 *
 * Cycle 1 (D3): two shared-material pieces and no outer plate. A capsule pill on the left holds
 * "Room NN%" (panel material, white text), and a dark capsule track on the right holds a saturated
 * solid fill (cyan while the room is with you, amber when it is slipping, coral when you are losing
 * it) with a white tick at 50 %. Billboarded to the speaker between the audience's heads and the
 * cue card (see EyesUpApp.placeAt; the card keeps a 2.6 cm gap above it).
 */
import { MeterTone } from './core/GameScore';
import { RoomMeterVisual, RoomMeterView } from './core/EyesUpSession';
import { PANEL_FILL, PANEL_STROKE, TEXT_PRIMARY, addRoundedSurface, addSurface, addText, child, faceTowards } from './EyesUpUI';

const TRACK_W = 46;
const BAR_H = 4.2;
const PILL_W = 36;
const PILL_H = 6.6;
const GAP = 2;
/** Total extents (cm, local) used by the nudge chevron's keep-clear rectangle in EyesUpApp. */
export const METER_WIDTH_CM = PILL_W + GAP + TRACK_W;
export const METER_HEIGHT_CM = PILL_H;
/** Darker than the pill so the saturated fill is the brightest thing in the row. */
const TRACK_COLOR = new vec4(0.02, 0.04, 0.13, 0.92);
const TRACK_FRAME = new vec4(0.5, 0.69, 1.0, 0.6);
const FILL_INSET = 0.5;
const TICK_COLOR = new vec4(1, 1, 1, 0.95);
/** A white tick at 50 % of the track; the tone switches amber -> cyan at 60 % (core/GameScore.meterTone). */
const TICK_AT = 0.5;
const TONE_COLOR: Record<MeterTone, vec4> = {
  good: new vec4(0.2, 0.9, 1.0, 1),
  mid: new vec4(1.0, 0.76, 0.28, 1),
  low: new vec4(1.0, 0.42, 0.36, 1),
};
/** The label sits at 2.5 m: Body-step text scaled for that distance, as on the cue card. */
const LABEL_SIZE = 230;

export class RoomMeter implements RoomMeterView {
  readonly root: SceneObject;
  private readonly pivot: SceneObject;
  private readonly fill: RenderMeshVisual;
  private readonly label: Text;
  private shownPercent = -1;
  private shownTone: MeterTone | null = null;

  constructor() {
    this.root = global.scene.createSceneObject('RoomMeter');
    const left = -METER_WIDTH_CM / 2;
    const pillX = left + PILL_W / 2;
    const trackX = left + PILL_W + GAP + TRACK_W / 2;
    addRoundedSurface(child(this.root, 'Pill', new vec3(pillX, 0, 0)), PILL_W, PILL_H, 0, PANEL_FILL, PANEL_STROKE, PILL_H / 2);
    addRoundedSurface(child(this.root, 'Track', new vec3(trackX, 0, 0)), TRACK_W, BAR_H, 0, TRACK_COLOR, TRACK_FRAME, BAR_H / 2, 0.25);
    // The fill grows from the track's left end: a pivot at the left edge is scaled on X (the rounded ends squash a little at low levels).
    const fillW = TRACK_W - 2 * FILL_INSET;
    const fillH = BAR_H - 2 * FILL_INSET;
    this.pivot = child(this.root, 'FillPivot', new vec3(trackX - TRACK_W / 2 + FILL_INSET, 0, 0.1));
    this.fill = addRoundedSurface(child(this.pivot, 'Bar', new vec3(fillW / 2, 0, 0)), fillW, fillH, 0, TONE_COLOR.good, null, fillH / 2);
    addSurface(child(this.root, 'Tick50', new vec3(trackX - TRACK_W / 2 + TRACK_W * TICK_AT, 0, 0.2)), 0.4, BAR_H + 1.4, 0, TICK_COLOR, null);
    this.label = addText(this.root, 'Percent', 'Room 100%', 'Body', PILL_W - 2, PILL_H, 250, TEXT_PRIMARY, new vec3(pillX, 0, 0.1));
    this.label.size = LABEL_SIZE;
    this.label.setRenderOrder(11);
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
