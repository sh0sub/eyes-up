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
import { SUMMARY_PANEL_H_CM, SUMMARY_PANEL_SCALE, SUMMARY_PANEL_W_CM } from './core/Framing';
import {
  BOX_AMBER_SOLID,
  BOX_NEUTRAL,
  BOX_SOLID,
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
const GRADE_COLOR: Record<Grade, vec4> = {
  S: new vec4(1.0, 0.86, 0.4, 1),
  A: new vec4(0.55, 1.0, 0.8, 1),
  B: new vec4(0.55, 0.85, 1.0, 1),
  C: new vec4(1.0, 0.62, 0.42, 1),
};
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
const TL_X0 = -19.5;
const TL_STRIP_W = 41;
/** Round 3: rows 4.2 cm tall (was 3.6) with 1.2 cm between them, and the nudge dot and its label on a row of their own below. */
const TL_ROW_Y = [6.0, 0.6, -4.8];
const TL_ROW_H = 4.2;
const TL_NUDGE_Y = -8.5;
/** The coral look-away box is at least this wide so its "N s away" label fits inside it. */
const LONGEST_MIN_W = 16.5;
/** Zone labels and percentages: 92 -> 120 (about 1.3x). Buttons: 5.6 cm tall targets, Again is the widest. */
const ZONE_TEXT_SIZE = 128;
const BUTTON_H = 8.4;
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

  private onAgain: (() => void) | null = null;
  private onDone: (() => void) | null = null;
  private onReplace: (() => void) | null = null;
  private snapshot: StatsSnapshot | null = null;
  private ctx: SummaryContext | undefined;
  private shown = 0;
  private wantVisible = false;

  onAwake(): void {
    this.panel = makePanel(this.getSceneObject(), W, H, 2.0, 1.1);
    this.panel.root.getTransform().setLocalScale(new vec3(PANEL_SCALE, PANEL_SCALE, PANEL_SCALE));
    const c = this.panel.content;
    // Cycle 4 (D3): the "Session complete" toast above the panel is gone (it overlapped the panel edge and added nothing the title does not say).
    // Header: check icon + title (artifact S5 ①). Balance moved into the game tile's sub-line.
    const header = flexRow(c, 'SummaryHeader', W - 4, 5.2, 1.2);
    addIconCell(header, 'SummaryCheck', 'check_circle', 3.4, 3.6, 5.2);
    this.titleText = textRow(header, 'TimeText', 'Nice work — 0:00', 'Headline1', W - 10, 5.2, DIST);
    this.titleText.size = 112; // larger than the stat tiles, smaller than the tip (127) and the grade (520)
    this.titleText.horizontalAlignment = HorizontalAlignment.Left;
    // Game layer: a big grade tile (the payoff) + attention score, room engagement, balance and best-previous.
    const game = flexRow(c, 'GameRow', W - 6, 12.6, 1.2);
    this.gradeText = addBox(game, 'GradeBadge', '-', 'Title1', 16, 12.6, DIST, TEXT_MINT, BOX_SOLID);
    this.gradeText.size = 650; // Cycle 5 (R1): 2.5x the first 260, in the grade colour: the grade is the hero of the game layer
    this.gameText = addBox(game, 'GameText', '', 'Headline1', W - 6 - 16 - 1.2, 12.6, DIST, TEXT_PRIMARY, BOX_SOLID);
    this.gameText.size = STAT_SIZE; // Round 3: three short lines (Attention, Room, Balance) at body size; the "New best" line is its own chip below
    // Round 3: the compare line ("New best! (was 39)", "Best so far 78 · A") is a chip of its own.
    const chipRow = flexRow(c, 'CompareRow', W - 6, 4.8, 1.2);
    this.chipText = addBox(chipRow, 'CompareChip', '', 'Headline1', 31, 4.6, DIST, TEXT_PRIMARY, BOX_NEUTRAL);
    this.chipText.size = CHIP_SIZE;
    // Zone rows: name · bar · percent (artifact S5 ②).
    for (const name of ['Left', 'Center', 'Right']) {
      const row = flexRow(c, `Zone${name}`, W - 6, 4.6, 1.2);
      const zn = textRow(row, `Zone${name}Name`, name, 'Headline1', 12, 4.6, DIST);
      zn.size = ZONE_TEXT_SIZE; // zone labels and percentages are what the Summary is read for: larger than Headline1 (74 at this distance)
      this.zoneNames.push(zn);
      const barCell = flexRow(row, `Zone${name}BarCell`, BAR_W - 1, 3.4, 0);
      addRoundedSurface(child(barCell, 'Track', new vec3(0, 0, 0.05)), BAR_W, BAR_H, 0, BAR_TRACK, BAR_TRACK_LINE, BAR_H / 2, THIN_STROKE_CM);
      const pivot = child(barCell, `Zone${name}Bar`, new vec3(-BAR_W / 2, 0, 0.1));
      const bar = child(pivot, 'Fill', new vec3(BAR_W / 2, 0, 0));
      this.zoneFills.push(addRoundedSurface(bar, BAR_W, BAR_H, 0, BAR_FILL, null, BAR_H / 2));
      addRoundedSurface(child(bar, 'Sheen', new vec3(0, BAR_H * 0.2, 0.02)), BAR_W - 1.4, BAR_H * 0.3, 0, BAR_SHEEN, null, BAR_H * 0.15);
      this.zoneBars.push(pivot);
      const zp = textRow(row, `Zone${name}Text`, '0%', 'Headline1', 9.4, 4.6, DIST);
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
    const buttons = flexRow(c, 'SummaryButtons', W - 6, BUTTON_H + 1.2, 1.2);
    const big = { labelRole: 'Heading' as const };
    // Again is the practice loop: the widest, primary (cyan) button. Done and Re-place are secondary.
    // Cycle 5 (R1): Again is the only filled cyan button and says what it is for; Done and Move stage are outlines.
    // Redesign: all three are outlines with one label size (Heading); only the accent differs (Again is the bright cyan, with a glow).
    addButton(buttons, 'AgainButton', 'Again', 18.4, BUTTON_H, DIST, () => this.onAgain?.(), { icon: 'replay', primary: true, subline: 'beat your grade', sublineRole: 'Body', ...big });
    addButton(buttons, 'DoneButton', 'Done', 10.6, BUTTON_H, DIST, () => this.onDone?.(), { icon: 'check', outline: true, ...big });
    // Pass 6 (artifact F2): Re-place (same size and type role as Again / Done), reachable here once the rehearsal is over (the podium
    // hides it during Rehearsal). Seats the stage again where you now face and restarts the talk.
    addButton(buttons, 'SummaryReplaceButton', 'Move stage', 14.6, BUTTON_H, DIST, () => this.onReplace?.(), { outline: true, ...big });
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
    if (!this.snapshot || this.shown > BAR_FILL_SECONDS) return;
    this.shown += dt;
    this.render();
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
    this.gradeText.textFill.color = s.grade ? GRADE_COLOR[s.grade] : TEXT_SECONDARY;
    this.gameText.text = s.scoreLabel ? [s.scoreLabel, s.engagementShort, `Balance ${s.balanceLabel}`].join('\n') : '';
    // The compare chip: mint for a new best, plain for "Best so far", "First run" when there is nothing to compare with.
    this.chipText.text = s.scoreLabel ? s.compareLabel || 'First run' : '';
    this.chipText.textFill.color = s.compareLabel.startsWith('New best') ? TEXT_MINT : TEXT_PRIMARY;
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

    TL_ROW_Y.forEach((y) => addRoundedSurface(child(root, 'Track', new vec3(TL_X0 + TL_STRIP_W / 2, y, 0.05)), TL_STRIP_W, TL_ROW_H, 0, BAR_TRACK, BAR_TRACK_LINE, 0.8, THIN_STROKE_CM));
    for (const seg of tl.segments) {
      const w = Math.max(0.2, (seg.end - seg.start) * TL_STRIP_W - 0.15);
      addRoundedSurface(child(root, 'Seg', new vec3(xOf((seg.start + seg.end) / 2), TL_ROW_Y[seg.zone], 0.1)), w, TL_ROW_H - 0.5, 0, BAR_FILL, null, 0.6);
    }
    const labels: Array<() => void> = [];
    if (tl.longest) {
      const lw = Math.max(LONGEST_MIN_W, (tl.longest.end - tl.longest.start) * TL_STRIP_W);
      // Keep the box inside the strip even when the look-away is shorter than its label.
      const cx = Math.min(TL_X0 + TL_STRIP_W - lw / 2, Math.max(TL_X0 + lw / 2, xOf((tl.longest.start + tl.longest.end) / 2)));
      const y = TL_ROW_Y[tl.longest.zone];
      addRoundedSurface(child(root, 'Longest', new vec3(cx, y, 0.2)), lw, TL_ROW_H + 0.6, 0, CORAL_FILL, CORAL, 0.9, 0.22);
      const label = `${tl.longest.label} away`;
      labels.push(() => addText(root, 'LongestLabel', label, 'Headline1', lw, TL_ROW_H + 0.5, DIST, CORAL, new vec3(cx, y, 0.3)).size = 112);
    }
    // The coral look-away box's row, and its x extent, so a nudge stem does not run through the "N s away" label.
    let boxRow: [number, number, number, number] | null = null;
    if (tl.longest) {
      const lw = Math.max(LONGEST_MIN_W, (tl.longest.end - tl.longest.start) * TL_STRIP_W);
      const cx = Math.min(TL_X0 + TL_STRIP_W - lw / 2, Math.max(TL_X0 + lw / 2, xOf((tl.longest.start + tl.longest.end) / 2)));
      const y = TL_ROW_Y[tl.longest.zone];
      boxRow = [cx - lw / 2 - 0.4, cx + lw / 2 + 0.4, y - TL_ROW_H / 2 - 0.5, y + TL_ROW_H / 2 + 0.5];
    }
    tl.nudges.forEach((f) => {
      const x = xOf(f);
      // An amber line through the three rows with a ringed dot under it: where the nudge happened. It skips the coral box when it falls inside it.
      const top = TL_ROW_Y[0] + TL_ROW_H / 2 + 0.6;
      const spans: Array<[number, number]> = boxRow && x > boxRow[0] && x < boxRow[1] ? [[boxRow[3], top], [TL_NUDGE_Y, boxRow[2]]] : [[TL_NUDGE_Y, top]];
      spans.forEach(([lo, hi]) => {
        if (hi - lo > 0.2) addSurface(child(root, 'NudgeStem', new vec3(x, (hi + lo) / 2, 0.25)), 0.26, hi - lo, 0, NUDGE_AMBER, null);
      });
      addRoundedSurface(child(root, 'NudgeDot', new vec3(x, TL_NUDGE_Y, 0.3)), 1.7, 1.7, 0, NUDGE_AMBER, null, 0.85);
    });
    // The first nudge is named where it is drawn ("nudge" beside its dot), on the side with room.
    if (tl.nudges.length > 0) {
      const x = xOf(tl.nudges[0]);
      const right = x + 10 < TL_X0 + TL_STRIP_W;
      labels.push(() => {
        const t = addText(root, 'NudgeLabel', 'nudge', 'Headline2', 8, 3, DIST, NUDGE_AMBER, new vec3(right ? x + 1.4 : x - 1.4, TL_NUDGE_Y, 0.3));
        t.size = 104;
        t.horizontalAlignment = right ? HorizontalAlignment.Left : HorizontalAlignment.Right;
        t.layoutRect = right ? Rect.create(0, 8, -1.5, 1.5) : Rect.create(-8, 0, -1.5, 1.5);
      });
    }
    labels.forEach((f) => f());
    ['L', 'C', 'R'].forEach((n, z) => {
      const rl = addText(root, `Row${n}`, n, 'Headline1', 2.5, TL_ROW_H + 0.4, DIST, amberRows[z] ? TEXT_AMBER : TEXT_PRIMARY, new vec3(-22.2, TL_ROW_Y[z], 0.1));
      rl.size = 120;
    });
  }
}
