/**
 * RoomMeter.ts — the room energy bar and the score HUD row (game layer).
 *
 * Win cycle 1 (user direction 11-09: keep the luminous-line hologram, add game feel): the meter reads like an HP / energy bar. One row,
 * billboarded to the speaker between the cue card and the heads:
 *
 *   SCORE 0120   ROOM [■■■■■■■|■■■] 86%   COMBO x3
 *
 * - 10 discrete additive segments in a hairline capsule; colour from meterTone (cyan >= 70 %, amber >= 40 %, red below, red pulses at 0.8 Hz).
 *   Unlit segments are faint slots of the same hue (never a grey fill: the display is additive).
 * - A 2 px white notch after segment 7 is the goal (0.70) with "GOAL" under it (where the old "target" caption sat).
 * - Rising across the goal: the bar pulses 1.05x over 250 ms and 7 small sparkles slide out along the notch and fade (400 ms).
 *   Falling below it: the segment just lost flashes red for 200 ms.
 * - SCORE ticks to each new value over 200 ms with a 1.15x punch; COMBO xN (amber-gold) appears at x2 with a 1.3 -> 1.0 stamp over 180 ms and
 *   tints red for 150 ms when the chain breaks, then hides.
 * Logic (segments, crossings, combo, tick and punch curves) is pure and unit-tested in core/GameScore.ts and core/LiveScore.ts.
 */
import { METER_GOAL_SEGMENTS, METER_SEGMENTS, MeterTone, goalCrossing, lowPulse, meterSegments } from './core/GameScore';
import { RoomMeterVisual, RoomMeterView } from './core/EyesUpSession';
import { comboLabel, punchScale, scoreLabel, tickValue } from './core/LiveScore';
import { NO_FILL, PANEL_STROKE, STAGE_GLOW_CM, STAGE_STROKE_CM, addPanelGlow, addRoundedSurface, addStar, addSurface, addText, child, faceTowards } from './EyesUpUI';

/**
 * Layout (cm at 2.5 m, measured in the preview: about 3.2 cm per glyph at size 250). The Lens renders a narrower frustum than the Preview paints, and
 * the visible half width at the stage is about 68 cm, so the whole row is centred and kept inside +-61 cm. The bar is 34 x 7.8 cm.
 */
const CAP_W = 34;
const CAP_H = 7.8;
const SCORE_W = 29;
const ROOM_W = 12.6;
const PCT_W = 13.5;
const COMBO_W = 25;
const ROW_GAP = 1.2;
const HUD_GAP = 3;
const ROW_W = SCORE_W + HUD_GAP + ROOM_W + ROW_GAP + CAP_W + ROW_GAP + PCT_W + HUD_GAP + COMBO_W;
const ROW_LEFT = -ROW_W / 2;
const ROW_RIGHT = ROW_W / 2;
const SCORE_RIGHT = ROW_LEFT + SCORE_W;
const ROOM_RIGHT = SCORE_RIGHT + HUD_GAP + ROOM_W;
const CAP_LEFT = ROOM_RIGHT + ROW_GAP;
const CAP_CX = CAP_LEFT + CAP_W / 2;
const PCT_LEFT = CAP_LEFT + CAP_W + ROW_GAP;
const COMBO_LEFT = PCT_LEFT + PCT_W + HUD_GAP;
const SEG_INSET = 1.1;
const SEG_GAP = 0.5;
const SEG_H = CAP_H - 2 * SEG_INSET;
const SEG_W = (CAP_W - 2 * SEG_INSET - (METER_SEGMENTS - 1) * SEG_GAP) / METER_SEGMENTS;
const segX = (k: number): number => CAP_LEFT + SEG_INSET + SEG_W / 2 + k * (SEG_W + SEG_GAP);
const NOTCH_X = CAP_LEFT + SEG_INSET + METER_GOAL_SEGMENTS * (SEG_W + SEG_GAP) - SEG_GAP / 2;
const NOTCH_W = 0.55;
const GOAL_H = 4.4;
const GOAL_GAP = 0.8;
const LABEL_SIZE = 200;
const NUM_SIZE = 240;
const HUD_SIZE = 230;

/** Total extents (cm, local) used by the nudge chevron's keep-clear rectangle in EyesUpApp: the whole HUD row. */
export const METER_WIDTH_CM = ROW_RIGHT - ROW_LEFT;
export const METER_CENTER_X_CM = (ROW_LEFT + ROW_RIGHT) / 2;
export const METER_CAPSULE_H_CM = CAP_H;
/** Extent above the root (half the bar plus the notch overshoot) and below it (half the bar, a gap, the "GOAL" row). */
export const METER_ABOVE_CM = CAP_H / 2 + 1.2;
export const METER_BELOW_CM = CAP_H / 2 + GOAL_GAP + GOAL_H;

const TONE_RGB: Record<MeterTone, [number, number, number]> = {
  good: [0.1, 0.95, 1.0],
  mid: [1.0, 0.72, 0.12],
  low: [1.0, 0.3, 0.37],
};
const RED: [number, number, number] = [1.0, 0.3, 0.37];
const CYAN = new vec4(0.45, 0.92, 1.0, 1);
const GOLD: [number, number, number] = [1.0, 0.76, 0.29];
const WHITE = new vec4(1, 1, 1, 1);
const SPARK_RGB: [number, number, number] = [0.88, 1.0, 1.0];
const SPARKS = 7;
const SPARK_SECONDS = 0.4;
const PULSE_SECONDS = 0.25;
const FLASH_SECONDS = 0.2;
const STAMP_SECONDS = 0.18;
const BREAK_SECONDS = 0.15;
const UNLIT_ALPHA = 0.07;

/** What EyesUpApp feeds the HUD each frame (from EyesUpSession's live score). */
export interface HudInput {
  score: number;
  combo: number;
}

export class RoomMeter implements RoomMeterView {
  readonly root: SceneObject;
  private readonly bar: SceneObject;
  private readonly segs: RenderMeshVisual[] = [];
  private readonly sparks: SceneObject[] = [];
  private readonly sparkVisuals: RenderMeshVisual[] = [];
  private readonly pct: Text;
  private readonly scoreText: Text;
  private readonly comboText: Text;
  private time = 0;
  private level = 1;
  private tone: MeterTone = 'good';
  private lit = METER_SEGMENTS;
  private shownPercent = -1;
  private pulseAge = 99;
  private flashAge = 99;
  private flashSeg = -1;
  // HUD state
  private target = 0;
  private from = 0;
  private gainAge = 99;
  private shownScore = -1;
  private combo = 0;
  private stampAge = 99;
  private breakAge = 99;
  private brokenCombo = 0;

  constructor() {
    this.root = global.scene.createSceneObject('RoomMeter');
    this.bar = child(this.root, 'Bar', new vec3(CAP_CX, 0, 0));
    addPanelGlow(child(this.bar, 'CapsuleGlow', new vec3(0, 0, -0.05)), CAP_W, CAP_H, CAP_H / 2, 0, -1, STAGE_GLOW_CM * 0.6);
    addRoundedSurface(child(this.bar, 'Capsule'), CAP_W, CAP_H, 0, NO_FILL, PANEL_STROKE, CAP_H / 2, STAGE_STROKE_CM);
    for (let k = 0; k < METER_SEGMENTS; k++) {
      const r = k === 0 || k === METER_SEGMENTS - 1 ? SEG_H / 2 : 0.5;
      this.segs.push(addRoundedSurface(child(this.bar, `Seg${k}`, new vec3(segX(k) - CAP_CX, 0, 0.1)), SEG_W, SEG_H, 0, new vec4(TONE_RGB.good[0], TONE_RGB.good[1], TONE_RGB.good[2], 0.9), null, r));
    }
    addSurface(child(this.bar, 'GoalNotch', new vec3(NOTCH_X - CAP_CX, 0, 0.2)), NOTCH_W, CAP_H + 2.4, 0, WHITE, null);
    const sparkRoot = child(this.bar, 'Sparks', new vec3(NOTCH_X - CAP_CX, 0, 0.3));
    for (let k = 0; k < SPARKS; k++) {
      const so = child(sparkRoot, `Spark${k}`);
      this.sparkVisuals.push(addStar(so, 'Star', 4, 1.3, 0.32, new vec3(0, 0, 0), new vec4(SPARK_RGB[0], SPARK_RGB[1], SPARK_RGB[2], 0)));
      so.enabled = false;
      this.sparks.push(so);
    }
    this.rowText('RoomLabel', 'ROOM', LABEL_SIZE, ROOM_W, ROOM_RIGHT - ROOM_W, HorizontalAlignment.Right, CYAN);
    this.pct = this.rowText('Percent', '100%', NUM_SIZE, PCT_W, PCT_LEFT, HorizontalAlignment.Left, WHITE);
    this.scoreText = this.rowText('ScoreText', scoreLabel(0), HUD_SIZE, SCORE_W, SCORE_RIGHT - SCORE_W, HorizontalAlignment.Right, CYAN);
    this.comboText = this.rowText('ComboText', '', HUD_SIZE, COMBO_W, COMBO_LEFT, HorizontalAlignment.Left, new vec4(GOLD[0], GOLD[1], GOLD[2], 1));
    // "GOAL" hangs from the notch to the right (left-aligned), so it stays clear of the centre member's "+10" pop.
    const goal = addText(this.root, 'Goal', 'GOAL', 'Body', 12, GOAL_H, 250, WHITE, new vec3(NOTCH_X - 0.3, -(CAP_H / 2 + GOAL_GAP + GOAL_H / 2), 0.1));
    goal.size = 200;
    goal.horizontalAlignment = HorizontalAlignment.Left;
    goal.layoutRect = Rect.create(0, 12, -GOAL_H / 2, GOAL_H / 2);
    goal.setRenderOrder(11);
    this.root.enabled = false;
  }

  /** A left- or right-aligned text cell on the row; its pivot is at the cell's left edge (`x`). */
  private rowText(name: string, value: string, size: number, w: number, x: number, align: HorizontalAlignment, color: vec4): Text {
    const anchorX = align === HorizontalAlignment.Right ? x + w : x;
    const t = addText(this.root, name, value, 'Body', w, CAP_H, 250, color, new vec3(anchorX, 0, 0.1));
    t.size = size;
    t.horizontalAlignment = align;
    t.layoutRect = align === HorizontalAlignment.Right ? Rect.create(-w, 0, -CAP_H / 2, CAP_H / 2) : Rect.create(0, w, -CAP_H / 2, CAP_H / 2);
    t.getSceneObject().getTransform().setLocalPosition(new vec3(anchorX, 0, 0.1));
    t.setRenderOrder(11);
    return t;
  }

  apply(v: RoomMeterVisual): void {
    const crossing = goalCrossing(this.level, v.level);
    if (crossing === 1) {
      this.pulseAge = 0;
      this.sparks.forEach((s) => (s.enabled = true));
    } else if (crossing === -1) {
      this.flashAge = 0;
      this.flashSeg = METER_GOAL_SEGMENTS - 1;
    }
    this.level = v.level;
    this.tone = v.tone;
    this.lit = meterSegments(v.level);
    if (v.percent !== this.shownPercent) {
      this.shownPercent = v.percent;
      this.pct.text = `${v.percent}%`;
    }
  }

  /** Per-frame HUD and animation step (EyesUpApp.onUpdate). */
  tick(dt: number, hud: HudInput): void {
    if (!this.root.enabled) return;
    this.time += dt;
    this.pulseAge += dt;
    this.flashAge += dt;
    this.gainAge += dt;
    this.stampAge += dt;
    this.breakAge += dt;
    this.paintSegments();
    this.paintSparks();
    const ps = this.pulseAge < PULSE_SECONDS ? 1 + 0.05 * Math.sin((Math.PI * this.pulseAge) / PULSE_SECONDS) : 1;
    this.bar.getTransform().setLocalScale(new vec3(ps, ps, 1));
    this.paintScore(hud.score);
    this.paintCombo(hud.combo);
  }

  /** Reset the HUD for a new run (Again / Re-place). */
  resetHud(): void {
    this.target = 0;
    this.from = 0;
    this.gainAge = 99;
    this.shownScore = -1;
    this.combo = 0;
    this.stampAge = 99;
    this.breakAge = 99;
    this.comboText.text = '';
    this.level = 1;
    this.pulseAge = 99;
    this.flashAge = 99;
    this.sparks.forEach((sp) => (sp.enabled = false));
  }

  private paintSegments(): void {
    const rgb = TONE_RGB[this.tone];
    const pulse = this.tone === 'low' ? lowPulse(this.time, 0.55, 1) : 1;
    this.segs.forEach((v, k) => {
      const flashing = k === this.flashSeg && this.flashAge < FLASH_SECONDS;
      if (flashing) v.mainPass.baseColor = new vec4(RED[0], RED[1], RED[2], 1);
      else if (k < this.lit) v.mainPass.baseColor = new vec4(rgb[0], rgb[1], rgb[2], 0.92 * pulse);
      else v.mainPass.baseColor = new vec4(rgb[0], rgb[1], rgb[2], UNLIT_ALPHA);
    });
  }

  private paintSparks(): void {
    const t = this.pulseAge;
    if (t >= SPARK_SECONDS) {
      if (this.sparks[0].enabled) this.sparks.forEach((s) => (s.enabled = false));
      return;
    }
    const k = t / SPARK_SECONDS;
    const ease = 1 - (1 - k) * (1 - k);
    this.sparks.forEach((s, i) => {
      // Spread up the notch, alternating left and right, sliding out along the bar.
      const y = -CAP_H / 2 + (CAP_H * i) / (SPARKS - 1);
      const side = i % 2 === 0 ? 1 : -1;
      const dx = side * (2 + 4 * ease) * (1 + 0.3 * (i % 3));
      s.getTransform().setLocalPosition(new vec3(dx, y + 1.5 * ease * (i % 2 === 0 ? 1 : -1), 0));
      const sc = 1 - 0.5 * k;
      s.getTransform().setLocalScale(new vec3(sc, sc, 1));
      this.sparkVisuals[i].mainPass.baseColor = new vec4(SPARK_RGB[0], SPARK_RGB[1], SPARK_RGB[2], 1 - k);
    });
  }

  private paintScore(score: number): void {
    if (score !== this.target) {
      this.from = this.shownScore < 0 ? score : this.shownScore;
      this.target = score;
      this.gainAge = 0;
    }
    const v = tickValue(this.from, this.target, this.gainAge);
    if (v !== this.shownScore) {
      this.shownScore = v;
      this.scoreText.text = scoreLabel(v);
    }
    const s = punchScale(this.gainAge);
    this.scoreText.getSceneObject().getTransform().setLocalScale(new vec3(s, s, 1));
  }

  private paintCombo(combo: number): void {
    if (combo !== this.combo) {
      if (combo > this.combo && combo >= 2) this.stampAge = 0;
      if (combo < this.combo && this.combo >= 2) {
        this.breakAge = 0;
        this.brokenCombo = this.combo;
      }
      this.combo = combo;
    }
    const tr = this.comboText.getSceneObject().getTransform();
    if (this.combo >= 2) {
      this.comboText.text = comboLabel(this.combo);
      this.comboText.textFill.color = new vec4(GOLD[0], GOLD[1], GOLD[2], 1);
      const s = this.stampAge < STAMP_SECONDS ? 1.3 - 0.3 * (this.stampAge / STAMP_SECONDS) : 1;
      tr.setLocalScale(new vec3(s, s, 1));
    } else if (this.breakAge < BREAK_SECONDS) {
      this.comboText.text = comboLabel(this.brokenCombo);
      this.comboText.textFill.color = new vec4(RED[0], RED[1], RED[2], 1 - this.breakAge / BREAK_SECONDS);
      tr.setLocalScale(new vec3(1, 1, 1));
    } else if (this.comboText.text !== '') {
      this.comboText.text = '';
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
