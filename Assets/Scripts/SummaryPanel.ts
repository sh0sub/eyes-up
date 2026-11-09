/**
 * SummaryPanel.ts — Lens component for the Summary panel (plan M8: 50×40 cm, 1.5 m ahead, eye level).
 * Pass 4 layout follows artifact S5: "Nice work — m:ss" + Balance badge, "target m:ss · deck",
 * three zone rows (name · bar · %, amber when out of 15–35 %), three stat boxes (longest look-away
 * with timestamp, Cards "2 of 5", Nudges "1"; Cycle 2 folded them into one line), a one-line tip, Again / Done.
 * Pass 5 adds S5's gaze timeline strip (③) and a mint check icon left of the title. Cycle 4 (D3) dropped the
 * "Session complete" toast and the stat line, enlarged zone labels (1.3x), made the timeline about 2x taller
 * and the buttons 5.6 cm tall (Again widest and primary).
 * Logic: core/SummaryModel.ts and core/GazeTimeline.ts (unit-tested).
 *
 * Each zone bar is a cyan surface quad (EyesUpUI.addSurface) inside a pivot that sits at the bar's
 * left edge, so scaling the pivot on X grows the bar from the left (SceneObject local scale X).
 * Timeline segments are plain quads rebuilt once per show (≤ 60 columns merged into runs).
 * Placement (1.5 m ahead at eye level, facing the head) is done by EyesUpApp on Summary.
 */
import { StatsSnapshot } from './SessionStats';
import { SummaryContext, summaryState, BAR_FILL_SECONDS } from './core/SummaryModel';
import { gazeTimeline } from './core/GazeTimeline';
import { Grade } from './core/GameScore';
import { FlexJustify } from 'UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes';
import { SUMMARY_PANEL_H_CM, SUMMARY_PANEL_SCALE, SUMMARY_PANEL_W_CM } from './core/Framing';
import {
  BOX_AMBER_SOLID,
  BOX_NEUTRAL,
  BOX_SOLID,
  NO_FILL,
  addStar,
  TEXT_TIP,
  Panel,
  TEXT_AMBER,
  TEXT_MINT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  addBlock,
  addBox,
  addButton,
  addIconCell,
  addRoundedSurface,
  addSurface,
  addText,
  child,
  flexRow,
  makePanel,
  textRow,
} from './EyesUpUI';

/** Zone bar fill (design pass 2): bright cyan. Track behind it: dim blue-grey. */
const BAR_FILL = new vec4(0.4, 0.86, 1.0, 0.95);
/** Round 4: timeline segments are luminous rounded capsules (a tinted body and a bright thin outline), not solid blocks. */
const SEG_FILL = new vec4(0.35, 0.85, 1.0, 0.4);
const SEG_LINE = new vec4(0.6, 0.94, 1.0, 1);
const SEG_STROKE_CM = 0.13;
const BAR_FILL_AMBER = new vec4(1.0, 0.76, 0.3, 0.95);
/** Redesign: the track is a faint tinted capsule with a thin line (no dark fill: the display is additive). */
const BAR_TRACK = new vec4(0.4, 0.7, 1.0, 0.1);
const BAR_TRACK_LINE = new vec4(0.5, 0.8, 1.0, 0.6);
const BAR_SHEEN = new vec4(1, 1, 1, 0.4);
const THIN_STROKE_CM = 0.14;
/** Timeline (artifact S5 ③): coral longest look-away, amber nudge marker. */
const CORAL = new vec4(1.0, 0.45, 0.4, 1);
const CORAL_FILL = new vec4(1.0, 0.45, 0.4, 0.14);
const NUDGE_AMBER = new vec4(1.0, 0.75, 0.3, 1);
/** Win cycle 1: the grade is an outline stamp; mint for S / A, cyan for B, amber for C. */
const GRADE_COLOR: Record<Grade, vec4> = {
  S: new vec4(0.55, 1.0, 0.8, 1),
  A: new vec4(0.55, 1.0, 0.8, 1),
  B: new vec4(0.55, 0.88, 1.0, 1),
  C: new vec4(1.0, 0.76, 0.29, 1),
};
/** Stamp timing (seconds after the panel opens): lands at 2.2x -> 1.0x over 220 ms after 400 ms, the 6 degree tilt settles in 150 ms, one ring expands 1.0 -> 1.4x over 400 ms. */
const STAMP_DELAY = 0.4;
const STAMP_SECONDS = 0.22;
const TILT_SECONDS = 0.15;
const STAMP_RING_SECONDS = 0.4;
/** Stars pop in 150 ms apart once the stamp has landed. */
const STAR_START = STAMP_DELAY + STAMP_SECONDS + 0.05;
const STAR_STEP = 0.15;
const STAR_POP = 0.15;
const STAR_R = 1.2;
const STAR_GAP = 3.6;
const STAR_Y = -4.2;
const STAR_GOLD = new vec4(1.0, 0.76, 0.29, 1);
const STAR_EMPTY = new vec4(0.55, 0.85, 1.0, 0.75);
/** NEW BEST banner: amber with a 1.6 s shimmer (brightens toward white and back twice). */
const BANNER_AMBER = new vec4(1.0, 0.76, 0.29, 1);
const SHIMMER_SECONDS = 1.6;
const ANIM_SECONDS = 2.0;
const GRADE_W = 16;
const GRADE_H = 11.6;
const W = SUMMARY_PANEL_W_CM;
/**
 * Game pass: 53 -> 60 cm to fit the grade row; Cycle 4 (D3): 74 cm. Cycle 5 (R1): 78 cm for the bigger grade, tip, a legend line and taller buttons.
 * Panel size and scale live in core/Framing.ts: a unit test keeps the whole panel (header and grade included) inside the preview viewport.
 */
const H = SUMMARY_PANEL_H_CM;
const PANEL_SCALE = SUMMARY_PANEL_SCALE;
const DIST = 150;
const BAR_W = 24;
const BAR_H = 2.6;
/** Timeline block: 44 × 7.4 cm. Row labels on the left, a 40 cm strip, nudge markers below. */
const TL_W = W - 6;
/** Cycle 4 (D3): 9.2 -> 15 cm, rows 1.9 -> 3.4 cm tall (1.8x), so segments and the coral look-away read at thumbnail size. */
const TL_H = 19;
const TL_X0 = -21.5;
const TL_STRIP_W = 47;
/** Round 3: rows 4.2 cm tall (was 3.6) with 1.2 cm between them, and the nudge dot and its label on a row of their own below. */
const TL_ROW_Y = [6.0, 0.6, -4.8];
const TL_ROW_H = 4.2;
/** Round 4: the coral look-away label lives in the nudge row (swatch + text), never over the rows' bars. */
const LEGEND_SIZE = 108;
/** Measured in the Preview: about 1.35 cm per character at LEGEND_SIZE. */
const LEGEND_CHAR_CM = 1.4;
const TL_NUDGE_Y = -8.5;
/** Zone labels and percentages: 92 -> 120 (about 1.3x). Buttons: 5.6 cm tall targets, Again is the widest. */
const ZONE_TEXT_SIZE = 128;
const BUTTON_H = 8.4;
const ZONE_ROW_H = 4.3;
/** Round 3: stats lines, chip and look-away labels are body size or larger (nothing tiny). */
const STAT_SIZE = 124;
const CHIP_SIZE = 108;

@component
export class SummaryPanel extends BaseScriptComponent {
  @input @hint('Unused since pass 4 (title is "Nice work — m:ss")') title: string = 'Rehearsal summary';

  private panel!: Panel;
  private titleText!: Text;
  private gradeText!: Text;
  private gameText!: Text;
  /** [left, center, right] zone names and percent labels. */
  private zoneNames: Text[] = [];
  private zoneTexts: Text[] = [];
  /** [left, center, right] bar pivots; scaled on X from 0 to percent/100. */
  private zoneBars: SceneObject[] = [];
  private zoneFills: RenderMeshVisual[] = [];
  private timelineBlock: SceneObject | null = null;
  private timelineDyn: SceneObject | null = null;
  private tipText!: Text;
  private chipText!: Text;
  private chipBox: SceneObject | null = null;
  private gradeLabel: SceneObject | null = null;
  private gradeFrame: RenderMeshVisual | null = null;
  private stampRing: SceneObject | null = null;
  private stampRingVisual: RenderMeshVisual | null = null;
  private stars: Array<{ root: SceneObject; full: RenderMeshVisual; empty: RenderMeshVisual }> = [];
  private starCount = 0;
  private newBest = false;
  private gradeTone: vec4 = GRADE_COLOR.B;
  private againSub: Text | null = null;

  private onAgain: (() => void) | null = null;
  private onDone: (() => void) | null = null;
  private onReplace: (() => void) | null = null;
  private snapshot: StatsSnapshot | null = null;
  private ctx: SummaryContext | undefined;
  private shown = 0;
  private wantVisible = false;

  onAwake(): void {
    this.panel = makePanel(this.getSceneObject(), W, H, 2.2, 1.7);
    this.panel.root.getTransform().setLocalScale(new vec3(PANEL_SCALE, PANEL_SCALE, PANEL_SCALE));
    const c = this.panel.content;
    // Cycle 4 (D3): the "Session complete" toast above the panel is gone (it overlapped the panel edge and added nothing the title does not say).
    // Header: check icon + title (artifact S5 ①). Balance moved into the game tile's sub-line.
    // Round 4: the compare chip ("First run", "New best! (was 39)") shares the header row, which frees a whole row for the timeline legend and the gaps.
    const header = flexRow(c, 'SummaryHeader', W - 4.4, 5.2, 1.2);
    addIconCell(header, 'SummaryCheck', 'check_circle', 3.4, 3.6, 5.2);
    this.titleText = textRow(header, 'TimeText', 'Nice work — 0:00', 'Headline1', 22.5, 5.2, DIST);
    this.titleText.size = 112; // larger than the stat tiles, smaller than the tip (127) and the grade (520)
    this.titleText.horizontalAlignment = HorizontalAlignment.Left;
    // Game layer: a big grade tile (the payoff) + attention score, room engagement, balance and best-previous.
    const game = flexRow(c, 'GameRow', W - 6, 11.6, 1.2);
    // Win cycle 1: the grade tile is an outline-only stamp (no fill) with the 3-star row under the letter.
    this.gradeText = addBox(game, 'GradeBadge', '-', 'Title1', GRADE_W, GRADE_H, DIST, TEXT_MINT, [NO_FILL, BOX_SOLID[1]]);
    this.gradeText.size = 440; // the letter shares the tile with the stars; still the largest text on the panel
    this.gradeLabel = this.gradeText.getSceneObject();
    const gradeBox = this.gradeLabel.getParent();
    this.gradeFrame = gradeBox.getChild(1).getComponent('Component.RenderMeshVisual') as RenderMeshVisual;
    this.gradeLabel.getTransform().setLocalPosition(new vec3(0, 1.6, this.gradeLabel.getTransform().getLocalPosition().z));
    this.stampRing = child(gradeBox, 'StampRing', new vec3(0, 0, 0.15));
    addRoundedSurface(this.stampRing, GRADE_W, GRADE_H, 0, NO_FILL, GRADE_COLOR.A, 1.2, 0.3);
    this.stampRingVisual = this.stampRing.getChild(1).getComponent('Component.RenderMeshVisual') as RenderMeshVisual;
    this.stampRing.enabled = false;
    for (let k = 0; k < 3; k++) {
      const root = child(gradeBox, `Star${k}`, new vec3((k - 1) * STAR_GAP, STAR_Y, 0.25));
      const empty = addStar(root, 'Empty', 5, STAR_R, 0.45, new vec3(0, 0, 0), STAR_EMPTY, 0.28);
      const full = addStar(root, 'Full', 5, STAR_R, 0.45, new vec3(0, 0, 0.02), STAR_GOLD);
      root.getTransform().setLocalScale(new vec3(0.001, 0.001, 1));
      this.stars.push({ root, full, empty });
    }
    this.gameText = addBox(game, 'GameText', '', 'Headline1', W - 6 - 16 - 1.2, 11.6, DIST, TEXT_PRIMARY, BOX_SOLID);
    this.gameText.size = STAT_SIZE; // Round 3: three short lines (Attention, Room, Balance) at body size; the "New best" line is its own chip below
    // Round 3: the compare line ("New best! (was 39)", "Best so far 78 · A") is a chip of its own (round 4: at the right of the header row).
    this.chipText = addBox(header, 'CompareChip', '', 'Headline1', 24, 4.6, DIST, TEXT_PRIMARY, [NO_FILL, BOX_NEUTRAL[1]]);
    this.chipText.size = CHIP_SIZE;
    this.chipBox = this.chipText.getSceneObject().getParent();
    // Zone rows: name · bar · percent (artifact S5 ②).
    for (const name of ['Left', 'Center', 'Right']) {
      const row = flexRow(c, `Zone${name}`, W - 6, ZONE_ROW_H, 1.2);
      const zn = textRow(row, `Zone${name}Name`, name, 'Headline1', 12, ZONE_ROW_H, DIST);
      zn.size = ZONE_TEXT_SIZE; // zone labels and percentages are what the Summary is read for: larger than Headline1 (74 at this distance)
      this.zoneNames.push(zn);
      const barCell = flexRow(row, `Zone${name}BarCell`, BAR_W - 1, 3.4, 0);
      addRoundedSurface(child(barCell, 'Track', new vec3(0, 0, 0.05)), BAR_W, BAR_H, 0, BAR_TRACK, BAR_TRACK_LINE, BAR_H / 2, THIN_STROKE_CM);
      const pivot = child(barCell, `Zone${name}Bar`, new vec3(-BAR_W / 2, 0, 0.1));
      const bar = child(pivot, 'Fill', new vec3(BAR_W / 2, 0, 0));
      this.zoneFills.push(addRoundedSurface(bar, BAR_W, BAR_H, 0, BAR_FILL, null, BAR_H / 2));
      addRoundedSurface(child(bar, 'Sheen', new vec3(0, BAR_H * 0.2, 0.02)), BAR_W - 1.4, BAR_H * 0.3, 0, BAR_SHEEN, null, BAR_H * 0.15);
      this.zoneBars.push(pivot);
      const zp = textRow(row, `Zone${name}Text`, '0%', 'Headline1', 9.4, ZONE_ROW_H, DIST);
      zp.size = ZONE_TEXT_SIZE;
      this.zoneTexts.push(zp);
    }
    // Gaze timeline strip (artifact S5 ③), drawn in show().
    this.timelineBlock = addBlock(c, 'GazeTimeline', TL_W, TL_H);
    // Round 3: no legend row; the coral box says "N s away" and the amber nudge dot says "nudge" right where they are drawn (see buildTimeline).
    // Cycle 4 (D3): the one-line stat row is gone; the longest look-away is the coral box in the timeline, the grade and tip carry the rest.
    // The coaching tip is the second-largest text on the panel (after the grade).
    this.tipText = addBox(c, 'TipText', '', 'Title2', W - 6, 7.8, DIST, TEXT_TIP, BOX_AMBER_SOLID);
    this.tipText.size = 148; // Cycle 5 (R1): a bigger amber bar, the second-largest text after the grade
    // Round 4: three buttons spread with equal space between them and at both ends (the row is the panel's inner width).
    const buttons = flexRow(c, 'SummaryButtons', W - 4.4, BUTTON_H + 1.2, 1.2, FlexJustify.SpaceEvenly);
    const big = { labelRole: 'Heading' as const };
    // Again is the practice loop: the widest, primary (cyan) button. Done and Re-place are secondary.
    // Cycle 5 (R1): Again is the only filled cyan button and says what it is for; Done and Move stage are outlines.
    // Redesign: all three are outlines with one label size (Heading); only the accent differs (Again is the bright cyan, with a glow).
    // Win cycle 1: Again is the one big mint button (about 2x the others) with "beat 1240" under it; Done and Move stage are small outlines.
    this.againSub = addButton(buttons, 'AgainButton', 'Again', 24, BUTTON_H, DIST, () => this.onAgain?.(), { icon: 'replay', mint: true, subline: 'beat your score', sublineRole: 'Body', ...big }).subline;
    addButton(buttons, 'DoneButton', 'Done', 12, BUTTON_H, DIST, () => this.onDone?.(), { icon: 'check', outline: true, ...big });
    // Pass 6 (artifact F2): Re-place (same size and type role as Again / Done), reachable here once the rehearsal is over (the podium
    // hides it during Rehearsal). Seats the stage again where you now face and restarts the talk.
    addButton(buttons, 'SummaryReplaceButton', 'Move stage', 14, BUTTON_H, DIST, () => this.onReplace?.(), { outline: true, ...big });
    // Hidden state is applied in UpdateEvent, after every UIKit element ran OnStart (G3).
    this.createEvent('UpdateEvent').bind(() => {
      if (this.panel.root.enabled !== this.wantVisible) this.panel.root.enabled = this.wantVisible;
      this.tick(getDeltaTime());
    });
  }

  bind(onAgain: () => void, onDone: () => void, onReplace?: () => void): void {
    this.onAgain = onAgain;
    this.onDone = onDone;
    this.onReplace = onReplace ?? null;
  }

  get isShowing(): boolean {
    return this.wantVisible;
  }

  /** Text currently shown as the talk time (m:ss), taken from the "Nice work — m:ss" title. */
  get timeLabel(): string {
    if (!this.titleText) return '';
    const parts = this.titleText.text.split('— ');
    return parts[parts.length - 1];
  }

  show(snapshot: StatsSnapshot | null, ctx?: SummaryContext): void {
    this.snapshot = snapshot;
    this.ctx = ctx;
    this.shown = 0;
    this.wantVisible = snapshot !== null;
    if (snapshot) {
      if (this.panel) this.panel.root.enabled = true;
      this.render();
      this.buildTimeline(snapshot);
    }
  }

  private tick(dt: number): void {
    if (!this.snapshot || this.shown > ANIM_SECONDS) return;
    this.shown += dt;
    if (this.shown <= BAR_FILL_SECONDS + dt) this.render();
    this.animate();
  }

  /** Stamp, stamp ring, star pop-in and the NEW BEST shimmer, all driven by `shown` (seconds since the panel opened). */
  private animate(): void {
    const t = this.shown;
    if (this.gradeLabel) {
      const k = (t - STAMP_DELAY) / STAMP_SECONDS;
      const visible = k >= 0;
      const s = !visible ? 0.001 : k >= 1 ? 1 : 2.2 - 1.2 * (1 - (1 - k) * (1 - k));
      const tr = this.gradeLabel.getTransform();
      tr.setLocalScale(new vec3(s, s, 1));
      const tk = (t - STAMP_DELAY - STAMP_SECONDS) / TILT_SECONDS;
      const tilt = tk < 0 ? 6 : tk >= 1 ? 0 : 6 * (1 - tk);
      tr.setLocalRotation(quat.angleAxis((-tilt * Math.PI) / 180, new vec3(0, 0, 1)));
      if (this.gradeFrame) {
        const c = this.gradeTone;
        this.gradeFrame.mainPass.baseColor = new vec4(c.x, c.y, c.z, visible ? 0.95 : 0.35);
      }
    }
    if (this.stampRing && this.stampRingVisual) {
      const rk = (t - STAMP_DELAY - STAMP_SECONDS) / STAMP_RING_SECONDS;
      const on = rk >= 0 && rk < 1;
      if (this.stampRing.enabled !== on) this.stampRing.enabled = on;
      if (on) {
        const s = 1 + 0.4 * (1 - (1 - rk) * (1 - rk));
        this.stampRing.getTransform().setLocalScale(new vec3(s, s, 1));
        const c = this.gradeTone;
        this.stampRingVisual.mainPass.baseColor = new vec4(c.x, c.y, c.z, 0.9 * (1 - rk));
      }
    }
    this.stars.forEach((st, i) => {
      const k = (t - STAR_START - i * STAR_STEP) / STAR_POP;
      const s = k <= 0 ? 0.001 : k >= 1 ? 1 : k < 0.6 ? (1.25 * k) / 0.6 : 1.25 - 0.25 * ((k - 0.6) / 0.4);
      st.root.getTransform().setLocalScale(new vec3(s, s, 1));
      const earned = i < this.starCount;
      if (st.full.getSceneObject().enabled !== earned) st.full.getSceneObject().enabled = earned;
      if (st.empty.getSceneObject().enabled !== !earned) st.empty.getSceneObject().enabled = !earned;
    });
    if (this.newBest) {
      const k = Math.min(1, t / SHIMMER_SECONDS);
      const w = k >= 1 ? 0 : 0.6 * Math.max(0, Math.sin(2 * Math.PI * 2 * k));
      const c = BANNER_AMBER;
      this.chipText.textFill.color = new vec4(c.x + (1 - c.x) * w, c.y + (1 - c.y) * w, c.z + (1 - c.z) * w, 1);
      if (this.chipBox) {
        const bs = 1 + 0.06 * w;
        this.chipBox.getTransform().setLocalScale(new vec3(bs, bs, 1));
      }
    }
  }

  private render(): void {
    if (!this.snapshot || !this.titleText) return;
    const s = summaryState(this.snapshot, this.shown, this.ctx);
    this.titleText.text = s.titleLabel;
    s.zones.forEach((z, i) => {
      const color = z.outOfRange ? TEXT_AMBER : TEXT_PRIMARY;
      if (this.zoneNames[i]) this.zoneNames[i].textFill.color = color;
      if (this.zoneTexts[i]) {
        this.zoneTexts[i].text = z.label;
        this.zoneTexts[i].textFill.color = color;
      }
      if (this.zoneBars[i]) this.zoneBars[i].getTransform().setLocalScale(new vec3(Math.max(0.001, z.bar), 1, 1));
      if (this.zoneFills[i]) this.zoneFills[i].mainPass.baseColor = z.outOfRange ? BAR_FILL_AMBER : BAR_FILL;
    });
    this.tipText.text = s.tip;
    this.tipText.size = s.tip.length > 30 ? 116 : 148; // the longest tip ("Next time, look at the center more.") must stay inside the 44 cm bar
    this.gradeText.text = s.gradeLabel || '-';
    this.gradeTone = s.grade ? GRADE_COLOR[s.grade] : TEXT_SECONDARY;
    this.gradeText.textFill.color = this.gradeTone;
    this.starCount = s.stars;
    this.gameText.text = s.scoreLabel ? [s.scoreLabel, s.engagementShort, `Balance ${s.balanceLabel}`].join('\n') : '';
    // Win cycle 1: the banner slot says NEW BEST (amber, shimmering) or "Best 1240"; a first run shows nothing there.
    this.newBest = s.newBest;
    this.chipText.text = s.bestBanner;
    this.chipText.size = s.newBest ? 150 : CHIP_SIZE;
    if (!s.newBest) this.chipText.textFill.color = TEXT_PRIMARY;
    if (this.chipBox && this.chipBox.enabled !== (s.bestBanner !== '')) this.chipBox.enabled = s.bestBanner !== '';
    if (this.againSub) this.againSub.text = s.beatLabel || 'beat your score';
  }

  /**
   * Artifact S5 ③: L / C / R rows of cyan segments over 0:00 … end, the longest look-away outlined
   * in coral with its seconds, and an amber dot under each nudge (the "nudge" word and the time axis were dropped: too small to read on Specs; the Nudges tile and the title carry them). Quads go
   * first and texts last so the labels draw on top (hierarchy order).
   */
  private buildTimeline(snapshot: StatsSnapshot): void {
    if (!this.timelineBlock) return;
    if (this.timelineDyn) this.timelineDyn.destroy();
    const root = child(this.timelineBlock, 'Dyn');
    this.timelineDyn = root;
    const tl = gazeTimeline(snapshot);
    const amberRows = summaryState(snapshot, 1).zones.map((z) => z.outOfRange);
    const xOf = (f: number) => TL_X0 + f * TL_STRIP_W;
    const stripRight = TL_X0 + TL_STRIP_W;

    TL_ROW_Y.forEach((y) => addRoundedSurface(child(root, 'Track', new vec3(TL_X0 + TL_STRIP_W / 2, y, 0.05)), TL_STRIP_W, TL_ROW_H, 0, BAR_TRACK, BAR_TRACK_LINE, TL_ROW_H / 2, THIN_STROKE_CM));
    for (const seg of tl.segments) {
      const w = Math.max(0.9, (seg.end - seg.start) * TL_STRIP_W - 0.2);
      const h = TL_ROW_H - 0.8;
      addRoundedSurface(child(root, 'Seg', new vec3(xOf((seg.start + seg.end) / 2), TL_ROW_Y[seg.zone], 0.1)), w, h, 0, SEG_FILL, SEG_LINE, h / 2, SEG_STROKE_CM);
    }
    const labels: Array<() => void> = [];
    // Intervals of the nudge row already taken by a nudge dot or the first nudge's label (x extents, cm).
    const taken: Array<[number, number]> = [];
    tl.nudges.forEach((f) => taken.push([xOf(f) - 1.4, xOf(f) + 1.4]));
    if (tl.nudges.length > 0) {
      const x = xOf(tl.nudges[0]);
      taken.push(x + 10 < stripRight ? [x + 0.6, x + 10] : [x - 10, x - 0.6]);
    }
    if (tl.longest) {
      // Round 4: the coral box spans exactly the look-away (no minimum width, so it never covers a neighbouring bar) and carries no text; its
      // "N s away" label is a legend in the nudge row below, in the first free spot.
      const x0 = xOf(tl.longest.start) + 0.25;
      const x1 = xOf(tl.longest.end) - 0.25;
      const lw = Math.max(1.6, x1 - x0);
      const cx = Math.min(stripRight - lw / 2, Math.max(TL_X0 + lw / 2, (x0 + x1) / 2));
      const y = TL_ROW_Y[tl.longest.zone];
      addRoundedSurface(child(root, 'Longest', new vec3(cx, y, 0.2)), lw, TL_ROW_H + 0.5, 0, CORAL_FILL, CORAL, Math.min(1.2, lw / 2), 0.2);
      // Win cycle 1: "29s away" when it fits the nudge row, the bare "29s" between nudge dots when it does not, nothing rather than an overlap.
      const free = (a: number, w: number) => !taken.some(([lo, hi]) => a < hi && a + w > lo);
      const place = (w: number): number | null => {
        for (let cand = stripRight - w; cand >= TL_X0; cand -= 0.5) if (free(cand, w)) return cand;
        return null;
      };
      for (const label of [`${tl.longest.label} away`, tl.longest.label]) {
        const textW = label.length * LEGEND_CHAR_CM;
        const lx = place(3 + textW);
        if (lx === null) continue;
        addRoundedSurface(child(root, 'LegendSwatch', new vec3(lx + 1.1, TL_NUDGE_Y, 0.2)), 2.2, 1.5, 0, CORAL_FILL, CORAL, 0.75, 0.16);
        labels.push(() => {
          const t = addText(root, 'LongestLabel', label, 'Headline1', textW, 3, DIST, CORAL, new vec3(lx + 3 + textW / 2, TL_NUDGE_Y, 0.3));
          t.size = LEGEND_SIZE;
        });
        break;
      }
    }
    tl.nudges.forEach((f) => {
      const x = xOf(f);
      // An amber line through the three rows with a ringed dot under it: where the nudge happened.
      const top = TL_ROW_Y[0] + TL_ROW_H / 2 + 0.6;
      addSurface(child(root, 'NudgeStem', new vec3(x, (TL_NUDGE_Y + top) / 2, 0.25)), 0.26, top - TL_NUDGE_Y, 0, NUDGE_AMBER, null);
      addRoundedSurface(child(root, 'NudgeDot', new vec3(x, TL_NUDGE_Y, 0.3)), 1.7, 1.7, 0, NUDGE_AMBER, null, 0.85);
    });
    // The first nudge is named where it is drawn ("nudge" beside its dot), on the side with room.
    if (tl.nudges.length > 0) {
      const x = xOf(tl.nudges[0]);
      const right = x + 10 < stripRight;
      labels.push(() => {
        const t = addText(root, 'NudgeLabel', 'nudge', 'Headline2', 8, 3, DIST, NUDGE_AMBER, new vec3(right ? x + 1.4 : x - 1.4, TL_NUDGE_Y, 0.3));
        t.size = 108;
        t.horizontalAlignment = right ? HorizontalAlignment.Left : HorizontalAlignment.Right;
        t.layoutRect = right ? Rect.create(0, 8, -1.5, 1.5) : Rect.create(-8, 0, -1.5, 1.5);
      });
    }
    labels.forEach((f) => f());
    ['L', 'C', 'R'].forEach((n, z) => {
      const rl = addText(root, `Row${n}`, n, 'Headline1', 2.5, TL_ROW_H + 0.4, DIST, amberRows[z] ? TEXT_AMBER : TEXT_PRIMARY, new vec3(-24.4, TL_ROW_Y[z], 0.1));
      rl.size = 120;
    });
  }
}
