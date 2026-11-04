/**
 * RoomMeter.ts — the glanceable room attention meter (game layer, artifact-free design note).
 *
 * A thin bar floating between the audience's heads and the cue card (see EyesUpApp.placeAt),
 * billboarded to the speaker, with the whole-room percentage to its right. The fill is cyan while
 * the room is with you, amber when it is slipping and coral when you are losing it. It is small on
 * purpose: one colour and one number, no extra panel in the field of view.
 */
import { MeterTone } from './core/GameScore';
import { RoomMeterVisual, RoomMeterView } from './core/EyesUpSession';
import { addSurface, addText, child, faceTowards } from './EyesUpUI';

const TRACK_W = 52;
const BAR_H = 3;
const LABEL_W = 28;
const TRACK_COLOR = new vec4(0.38, 0.46, 0.78, 0.85);
const TONE_COLOR: Record<MeterTone, vec4> = {
  good: new vec4(0.25, 0.88, 1.0, 1),
  mid: new vec4(1.0, 0.76, 0.28, 1),
  low: new vec4(1.0, 0.42, 0.36, 1),
};
/** The label sits at 2.5 m: Title2 scaled by distance is about 3.5 cm tall. */
const DIST = 250;

export class RoomMeter implements RoomMeterView {
  readonly root: SceneObject;
  private readonly pivot: SceneObject;
  private readonly fill: RenderMeshVisual;
  private readonly label: Text;
  private shownPercent = -1;
  private shownTone: MeterTone | null = null;

  constructor() {
    this.root = global.scene.createSceneObject('RoomMeter');
    const x0 = -(TRACK_W + LABEL_W) / 2;
    addSurface(child(this.root, 'Track', new vec3(x0 + TRACK_W / 2, 0, 0)), TRACK_W, BAR_H, 0, TRACK_COLOR, null);
    this.pivot = child(this.root, 'FillPivot', new vec3(x0, 0, 0.1));
    this.fill = addSurface(child(this.pivot, 'Bar', new vec3(TRACK_W / 2, 0, 0)), TRACK_W, BAR_H, 0, TONE_COLOR.good, null);
    this.label = addText(this.root, 'Percent', 'Room 100%', 'Title2', LABEL_W, 3.6, DIST, TONE_COLOR.good, new vec3(x0 + TRACK_W + LABEL_W / 2 + 0.5, 0, 0.1));
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
