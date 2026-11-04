/**
 * SummaryPanel.ts — Lens component for the Summary panel (plan M8: 50×40 cm, 1.5 m ahead, eye level).
 * Pass 4 layout follows artifact S5: "Nice work — m:ss" + Balance badge, "target m:ss · deck",
 * three zone rows (name · bar · %, amber when out of 15–35 %), three stat boxes (longest look-away
 * with timestamp, Cards "2 of 5", Nudges "1"; Cycle 2 folded them into one line), a one-line tip, Again / Done.
 * Pass 5 adds S5's gaze timeline strip (③) between the zone bars and the stat boxes, a mint check
 * icon left of the title and a "Session complete" chip above the panel. The panel grew 40 → 53 cm
 * tall to fit the strip (D27).
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
import {
  BOX_MINT,
  BOX_AMBER_SOLID,
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
  addIcon,
  addIconCell,
  addSurface,
  addText,
  child,
  flexRow,
  makePanel,
  textRow,
} from './EyesUpUI';

/** Zone bar fill (design pass 2): bright cyan. Track behind it: dim blue-grey. */
const BAR_FILL = new vec4(0.45, 0.78, 1.0, 0.9);
const BAR_TRACK = new vec4(0.3, 0.38, 0.5, 0.6);
/** Timeline (artifact S5 ③): coral longest look-away, amber nudge marker. */
const CORAL = new vec4(1.0, 0.45, 0.4, 1);
const CORAL_FILL = new vec4(0.42, 0.14, 0.13, 0.95);
const NUDGE_AMBER = new vec4(1.0, 0.75, 0.3, 1);
const GRADE_COLOR: Record<Grade, vec4> = {
  S: new vec4(1.0, 0.86, 0.4, 1),
  A: new vec4(0.55, 1.0, 0.8, 1),
  B: new vec4(0.55, 0.85, 1.0, 1),
  C: new vec4(1.0, 0.62, 0.42, 1),
};
const BUTTON_PLATE = new vec4(0.08, 0.11, 0.18, 1);
const BUTTON_PLATE_FRAME = new vec4(0.6, 0.78, 0.95, 0.9);
const W = 50;
/** Game pass: 53 -> 60 cm to fit the grade row (attention score, grade, best-previous). */
const H = 64;
/** Whole-panel scale: the Summary used to clip its top in the preview frame. */
const PANEL_SCALE = 1.2;
const DIST = 150;
const BAR_W = 23;
const BAR_H = 1.6;
/** Timeline block: 44 × 7.4 cm. Row labels on the left, a 40 cm strip, nudge markers below. */
const TL_W = W - 6;
const TL_H = 9.2;
const TL_X0 = -18.5;
const TL_STRIP_W = 40;
const TL_ROW_Y = [3.5, 1.2, -1.1];
const TL_ROW_H = 1.9;
const TL_NUDGE_Y = -3.4;

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
  private timelineBlock: SceneObject | null = null;
  private timelineDyn: SceneObject | null = null;
  private statsText!: Text;
  private tipText!: Text;

  private onAgain: (() => void) | null = null;
  private onDone: (() => void) | null = null;
  private onReplace: (() => void) | null = null;
  private snapshot: StatsSnapshot | null = null;
  private ctx: SummaryContext | undefined;
  private shown = 0;
  private wantVisible = false;

  onAwake(): void {
    this.panel = makePanel(this.getSceneObject(), W, H, 2.0, 1.3);
    this.panel.root.getTransform().setLocalScale(new vec3(PANEL_SCALE, PANEL_SCALE, PANEL_SCALE));
    const c = this.panel.content;
    // "Session complete" chip above the panel (artifact S5).
    const chip = child(this.panel.root, 'CompleteChip', new vec3(0, H / 2 + 2.8, 0.6));
    addSurface(chip, 20, 3.4, 0, BOX_MINT[0], BOX_MINT[1]);
    addIcon(chip, 'check_circle', 2.0, new vec3(-7.2, 0, 0.08));
    addText(chip, 'CompleteChipText', 'Session complete', 'Headline2', 15, 3.4, DIST, TEXT_MINT, new vec3(1.2, 0, 0.08));
    // Header: check icon + title (artifact S5 ①). Balance moved into the game tile's sub-line.
    const header = flexRow(c, 'SummaryHeader', W - 4, 5.6, 1.2);
    addIconCell(header, 'SummaryCheck', 'check_circle', 3.4, 3.6, 5.6);
    this.titleText = textRow(header, 'TimeText', 'Nice work — 0:00', 'Headline1', W - 10, 5.6, DIST);
    this.titleText.size = 100; // larger than the stat tiles, smaller than the tip (127) and the grade (520)
    this.titleText.horizontalAlignment = HorizontalAlignment.Left;
    // Game layer: a big grade tile (the payoff) + attention score, room engagement, balance and best-previous.
    const game = flexRow(c, 'GameRow', W - 6, 13, 1.2);
    this.gradeText = addBox(game, 'GradeBadge', '-', 'Title1', 14, 13, DIST, TEXT_MINT, BOX_SOLID);
    this.gradeText.size = 520; // about 2x the earlier 260: the grade is the hero of the game layer
    this.gameText = addBox(game, 'GameText', '', 'Headline1', W - 6 - 14 - 1.2, 13, DIST, TEXT_PRIMARY, BOX_SOLID);
    this.gameText.size = 96; // between the title (100 would crowd it) and the stat tiles: 3 short lines still fit the 28.8 cm tile
    // Zone rows: name · bar · percent (artifact S5 ②).
    for (const name of ['Left', 'Center', 'Right']) {
      const row = flexRow(c, `Zone${name}`, W - 6, 3.4, 1.2);
      const zn = textRow(row, `Zone${name}Name`, name, 'Headline1', 10, 3.4, DIST);
      zn.size = 92; // zone labels and percentages are what the Summary is read for: larger than Headline1 (74 at this distance)
      this.zoneNames.push(zn);
      const barCell = flexRow(row, `Zone${name}BarCell`, BAR_W, 3, 0);
      addSurface(child(barCell, 'Track', new vec3(0, 0, 0.05)), BAR_W, BAR_H, 0, BAR_TRACK, null);
      const pivot = child(barCell, `Zone${name}Bar`, new vec3(-BAR_W / 2, 0, 0.1));
      const bar = child(pivot, 'Fill', new vec3(BAR_W / 2, 0, 0));
      addSurface(bar, BAR_W, BAR_H, 0, BAR_FILL, null);
      this.zoneBars.push(pivot);
      const zp = textRow(row, `Zone${name}Text`, '0%', 'Headline1', 8.4, 3.4, DIST);
      zp.size = 92;
      this.zoneTexts.push(zp);
    }
    // Gaze timeline strip (artifact S5 ③), drawn in show().
    this.timelineBlock = addBlock(c, 'GazeTimeline', TL_W, TL_H);
    // Stat tiles collapsed to one line (Cycle 2 M2): longest look-away, Cards and Nudges read as one row at 2.5 m.
    this.statsText = addBox(c, 'StatsText', '', 'Headline2', W - 6, 4.4, DIST, TEXT_PRIMARY, BOX_SOLID);
    // The coaching tip is the second-largest text on the panel (after the grade).
    this.tipText = addBox(c, 'TipText', '', 'Title2', W - 6, 5.2, DIST, TEXT_TIP, BOX_AMBER_SOLID);
    // An opaque dark plate (own frame) behind the buttons, so they never read as part of the wall art behind the panel's lower edge.
    const buttons = flexRow(c, 'SummaryButtons', W - 6, 6.2, 2);
    addSurface(child(buttons, 'ButtonPlate', new vec3(0, 0, -0.1)), W - 6, 6.2, 0, BUTTON_PLATE, BUTTON_PLATE_FRAME);
    const big = { labelRole: 'Headline1' as const };
    addButton(buttons, 'AgainButton', 'Again', 13, 4.6, DIST, () => this.onAgain?.(), { icon: 'replay', ...big });
    addButton(buttons, 'DoneButton', 'Done', 13, 4.6, DIST, () => this.onDone?.(), { icon: 'check', primary: true, ...big });
    // Pass 6 (artifact F2): Re-place (same size and type role as Again / Done), reachable here once the rehearsal is over (the podium
    // hides it during Rehearsal). Seats the stage again where you now face and restarts the talk.
    addButton(buttons, 'SummaryReplaceButton', 'Re-place', 13, 4.6, DIST, () => this.onReplace?.(), big);
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
    });
    this.statsText.text = s.statsLine;
    this.tipText.text = s.tip;
    this.gradeText.text = s.gradeLabel || '-';
    this.gradeText.textFill.color = s.grade ? GRADE_COLOR[s.grade] : TEXT_SECONDARY;
    this.gameText.text = s.scoreLabel
      ? [s.scoreLabel, `${s.engagementShort} · Balance ${s.balanceLabel}`, s.compareLabel].filter((l) => l).join('\n')
      : '';
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

    TL_ROW_Y.forEach((y) => addSurface(child(root, 'Track', new vec3(TL_X0 + TL_STRIP_W / 2, y, 0.05)), TL_STRIP_W, TL_ROW_H, 0, BAR_TRACK, null));
    for (const seg of tl.segments) {
      const w = Math.max(0.2, (seg.end - seg.start) * TL_STRIP_W - 0.15);
      addSurface(child(root, 'Seg', new vec3(xOf((seg.start + seg.end) / 2), TL_ROW_Y[seg.zone], 0.1)), w, TL_ROW_H, 0, BAR_FILL, null);
    }
    const labels: Array<() => void> = [];
    if (tl.longest) {
      const lw = Math.max(3.0, (tl.longest.end - tl.longest.start) * TL_STRIP_W);
      // Keep the box inside the strip even when the look-away is shorter than its label.
      const cx = Math.min(TL_X0 + TL_STRIP_W - lw / 2, Math.max(TL_X0 + lw / 2, xOf((tl.longest.start + tl.longest.end) / 2)));
      const y = TL_ROW_Y[tl.longest.zone];
      addSurface(child(root, 'Longest', new vec3(cx, y, 0.2)), lw, TL_ROW_H + 0.5, 0, CORAL_FILL, CORAL);
      const label = tl.longest.label;
      labels.push(() => addText(root, 'LongestLabel', label, 'Headline2', lw, TL_ROW_H + 0.5, DIST, CORAL, new vec3(cx, y, 0.3)));
    }
    tl.nudges.forEach((f) => {
      const x = xOf(f);
      addSurface(child(root, 'NudgeStem', new vec3(x, (TL_ROW_Y[2] + TL_NUDGE_Y) / 2, 0.25)), 0.12, TL_ROW_Y[2] - TL_NUDGE_Y, 0, NUDGE_AMBER, null);
      addSurface(child(root, 'NudgeDot', new vec3(x, TL_NUDGE_Y, 0.3)), 0.8, 0.8, 0, NUDGE_AMBER, null);
    });
    labels.forEach((f) => f());
    ['L', 'C', 'R'].forEach((n, z) => {
      const rl = addText(root, `Row${n}`, n, 'Headline1', 2.5, TL_ROW_H + 0.4, DIST, amberRows[z] ? TEXT_AMBER : TEXT_PRIMARY, new vec3(-20.6, TL_ROW_Y[z], 0.1));
      rl.size = 80;
    });
  }
}
