/**
 * RoomMeter.ts — the glanceable room attention meter (game layer, artifact-free design note).
 *
 * A thin bar floating between the audience's heads and the cue card (see EyesUpApp.placeAt),
 * billboarded to the speaker, with the whole-room percentage at its left end (the right end collided with lit halos) on a dark backplate. The fill is cyan while
 * the room is with you, amber when it is slipping and coral when you are losing it. It is small on
 * purpose: one colour and one number, no extra panel in the field of view.
 */
import { MeterTone } from './core/GameScore';
import { RoomMeterVisual, RoomMeterView } from './core/EyesUpSession';
import { addSurface, addText, child, faceTowards } from './EyesUpUI';

const TRACK_W = 46;
const BAR_H = 4;
const LABEL_W = 44;
/**
 * Indigo plate behind label + bar. Cycle 4 (D4) tried a darker plate (down to opaque black): the Preview renders these quads like an additive
 * display, where black is clear, so it was invisible. Contrast comes from a bright frame, a lighter track, a white 50 % tick and bigger type instead.
 */
const PLATE_COLOR = new vec4(0.07, 0.1, 0.3, 0.88);
const PLATE_PAD = 1.8;
const TRACK_COLOR = new vec4(0.5, 0.56, 0.95, 0.95);
const TRACK_FRAME = new vec4(0.92, 0.95, 1, 0.95);
const TICK_COLOR = new vec4(1, 1, 1, 0.9);
/** Cycle 4 (D4): a white tick at 50 % of the track; the tone switches amber -> cyan at 60 % (core/GameScore.meterTone). */
const TICK_AT = 0.5;
const TONE_COLOR: Record<MeterTone, vec4> = {
  good: new vec4(0.25, 0.88, 1.0, 1),
  mid: new vec4(1.0, 0.76, 0.28, 1),
  low: new vec4(1.0, 0.42, 0.36, 1),
};
/** The label sits at 2.5 m: Title2 scaled by distance is about 3.5 cm tall. */
const DIST = 250;
/** Label text size: Title2 at 250 cm is 211 (about 20 px or more at glasses scale); this is a bit larger so "Room 42%" reads at thumbnail size. */
const LABEL_SIZE = 270;

export class RoomMeter implements RoomMeterView {
  readonly root: SceneObject;
  private readonly pivot: SceneObject;
  private readonly fill: RenderMeshVisual;
  private readonly label: Text;
  private shownPercent = -1;
  private shownTone: MeterTone | null = null;

  constructor() {
    this.root = global.scene.createSceneObject('RoomMeter');
    const left = -(TRACK_W + LABEL_W) / 2;
    const x0 = left + LABEL_W; // the bar starts after the label
    addSurface(child(this.root, 'Plate', new vec3(0, 0, -0.2)), TRACK_W + LABEL_W + 2 * PLATE_PAD, BAR_H + 2 * PLATE_PAD + 1.6, 0, PLATE_COLOR, null);
    addSurface(child(this.root, 'Track', new vec3(x0 + TRACK_W / 2, 0, 0)), TRACK_W + 0.6, BAR_H + 0.6, 0, TRACK_COLOR, TRACK_FRAME);
    this.pivot = child(this.root, 'FillPivot', new vec3(x0, 0, 0.1));
    this.fill = addSurface(child(this.pivot, 'Bar', new vec3(TRACK_W / 2, 0, 0)), TRACK_W, BAR_H, 0, TONE_COLOR.good, null);
    // The 50 % tick stands above the fill (z) and a little taller than the bar so it reads as a threshold.
    addSurface(child(this.root, 'Tick50', new vec3(x0 + TRACK_W * TICK_AT, 0, 0.2)), 0.5, BAR_H + 1.6, 0, TICK_COLOR, null);
    this.label = addText(this.root, 'Percent', 'Room 100%', 'Title2', LABEL_W, 4.4, DIST, TONE_COLOR.good, new vec3(left + LABEL_W / 2 - 0.5, 0, 0.1));
    this.label.size = LABEL_SIZE;
    this.label.setRenderOrder(11);
    this.root.enabled = false;
  }

  apply(v: RoomMeterVisual): void {
    this.pivot.getTransform().setLocalScale(new vec3(Math.max(0.001, v.level), 1, 1));
    if (v.tone !== this.shownTone) {
      this.shownTone = v.tone;
      this.fill.mainPass.baseColor = TONE_COLOR[v.tone];
      this.label.textFill.color = TONE_COLOR[v.tone];
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
