/**
 * SummaryPanel.ts — Lens component for the Summary panel (plan M8: 50×40 cm, 1.5 m ahead, eye level).
 * Pass 4 layout follows artifact S5: "Nice work — m:ss" + Balance badge, "target m:ss · deck",
 * three zone rows (name · bar · %, amber when out of 15–35 %), two stat boxes (longest look-away
 * with timestamp, card expands · nudges), a one-line tip, Again / Done.
 * Pass 5 adds S5's gaze timeline strip (③) between the zone bars and the stat boxes, a mint check
 * icon left of the title and a "Session complete" chip above the panel. The panel grew 40 → 47 cm
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
import {
  BOX_AMBER,
  BOX_MINT,
  BOX_NEUTRAL,
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
const W = 50;
const H = 47;
const DIST = 150;
const BAR_W = 27;
const BAR_H = 1.2;
/** Timeline block: 44 × 10 cm. Row labels on the left, a 40 cm strip, nudge row and time axis below. */
const TL_W = W - 6;
const TL_H = 10;
const TL_X0 = -18.5;
const TL_STRIP_W = 40;
const TL_ROW_Y = [4.0, 2.1, 0.2];
const TL_ROW_H = 1.4;
const TL_NUDGE_Y = -1.7;
const TL_AXIS_Y = -3.9;

@component
export class SummaryPanel extends BaseScriptComponent {
  @input @hint('Unused since pass 4 (title is "Nice work — m:ss")') title: string = 'Rehearsal summary';

  private panel!: Panel;
  private titleText!: Text;
  private targetText!: Text;
  private balanceText!: Text;
  /** [left, center, right] zone names and percent labels. */
  private zoneNames: Text[] = [];
  private zoneTexts: Text[] = [];
  /** [left, center, right] bar pivots; scaled on X from 0 to percent/100. */
  private zoneBars: SceneObject[] = [];
  private timelineBlock: SceneObject | null = null;
  private timelineDyn: SceneObject | null = null;
  private longestText!: Text;
  private cardsText!: Text;
  private tipText!: Text;

  private onAgain: (() => void) | null = null;
  private onDone: (() => void) | null = null;
  private snapshot: StatsSnapshot | null = null;
  private ctx: SummaryContext | undefined;
  private shown = 0;
  private wantVisible = false;

  onAwake(): void {
    this.panel = makePanel(this.getSceneObject(), W, H, 2.0, 0.5);
    const c = this.panel.content;
    // "Session complete" chip above the panel (artifact S5).
    const chip = child(this.panel.root, 'CompleteChip', new vec3(0, H / 2 + 2.8, 0.6));
    addSurface(chip, 20, 3.4, 0, BOX_MINT[0], BOX_MINT[1]);
    addIcon(chip, 'check_circle', 2.0, new vec3(-7.2, 0, 0.08));
    addText(chip, 'CompleteChipText', 'Session complete', 'Headline2', 15, 3.4, DIST, TEXT_MINT, new vec3(1.2, 0, 0.08));
    // Header: check icon + title + Balance badge (artifact S5 ①).
    const header = flexRow(c, 'SummaryHeader', W - 4, 5.6, 1.2);
    addIconCell(header, 'SummaryCheck', 'check_circle', 3.4, 3.6, 5.6);
    this.titleText = textRow(header, 'TimeText', 'Nice work — 0:00', 'Title2', W - 20, 5.6, DIST);
    this.titleText.horizontalAlignment = HorizontalAlignment.Left;
    this.balanceText = addBox(header, 'BalanceBadge', '0\nBalance', 'Headline1', 9.5, 5.6, DIST, TEXT_MINT, BOX_MINT);
    this.targetText = textRow(c, 'TargetText', 'target 0:00', 'Subheadline', W - 4, 2.2, DIST, TEXT_SECONDARY);
    // Line the target up under the title (title cell starts 4.8 cm in from the header's left edge).
    this.targetText.horizontalAlignment = HorizontalAlignment.Left;
    this.targetText.layoutRect = Rect.create(-(W - 4) / 2 + 4.8, (W - 4) / 2, -1.1, 1.1);
    // Zone rows: name · bar · percent (artifact S5 ②).
    for (const name of ['Left', 'Center', 'Right']) {
      const row = flexRow(c, `Zone${name}`, W - 6, 2.7, 1.2);
      this.zoneNames.push(textRow(row, `Zone${name}Name`, name, 'Headline2', 8, 2.7, DIST));
      const barCell = flexRow(row, `Zone${name}BarCell`, BAR_W, 2.4, 0);
      addSurface(child(barCell, 'Track', new vec3(0, 0, 0.05)), BAR_W, BAR_H, 0, BAR_TRACK, null);
      const pivot = child(barCell, `Zone${name}Bar`, new vec3(-BAR_W / 2, 0, 0.1));
      const bar = child(pivot, 'Fill', new vec3(BAR_W / 2, 0, 0));
      addSurface(bar, BAR_W, BAR_H, 0, BAR_FILL, null);
      this.zoneBars.push(pivot);
      this.zoneTexts.push(textRow(row, `Zone${name}Text`, '0%', 'Headline2', 6.5, 2.7, DIST));
    }
    // Gaze timeline strip (artifact S5 ③), drawn in show().
    this.timelineBlock = addBlock(c, 'GazeTimeline', TL_W, TL_H);
    // Stat boxes (artifact S5 ④).
    const stats = flexRow(c, 'SummaryStats', W - 6, 4.8, 1.2);
    this.longestText = addBox(stats, 'LongestText', 'Longest look-away\n0 s', 'Headline2', 23.4, 4.8, DIST, TEXT_PRIMARY, BOX_NEUTRAL);
    this.cardsText = addBox(stats, 'CardsText', 'Card expands · Nudges\n0 · 0', 'Headline2', 19.4, 4.8, DIST, TEXT_PRIMARY, BOX_NEUTRAL);
    this.tipText = addBox(c, 'TipText', '', 'Headline2', W - 6, 3.0, DIST, TEXT_AMBER, BOX_AMBER);
    const buttons = flexRow(c, 'SummaryButtons', W - 6, 4.4, 3);
    const big = { labelRole: 'Headline2' as const };
    addButton(buttons, 'AgainButton', 'Again', 12, 4.2, DIST, () => this.onAgain?.(), { icon: 'replay', ...big });
    addButton(buttons, 'DoneButton', 'Done', 12, 4.2, DIST, () => this.onDone?.(), { icon: 'check', primary: true, ...big });
    // Hidden state is applied in UpdateEvent, after every UIKit element ran OnStart (G3).
    this.createEvent('UpdateEvent').bind(() => {
      if (this.panel.root.enabled !== this.wantVisible) this.panel.root.enabled = this.wantVisible;
      this.tick(getDeltaTime());
    });
  }

  bind(onAgain: () => void, onDone: () => void): void {
    this.onAgain = onAgain;
    this.onDone = onDone;
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
    this.targetText.text = s.targetLabel;
    this.balanceText.text = `${s.balanceLabel}\nBalance`;
    s.zones.forEach((z, i) => {
      const color = z.outOfRange ? TEXT_AMBER : TEXT_PRIMARY;
      if (this.zoneNames[i]) this.zoneNames[i].textFill.color = color;
      if (this.zoneTexts[i]) {
        this.zoneTexts[i].text = z.label;
        this.zoneTexts[i].textFill.color = color;
      }
      if (this.zoneBars[i]) this.zoneBars[i].getTransform().setLocalScale(new vec3(Math.max(0.001, z.bar), 1, 1));
    });
    this.longestText.text = `Longest look-away\n${s.longestLookAwayLabel}`;
    this.cardsText.text = `Card expands · Nudges\n${s.cardsNudgesLabel}`;
    this.tipText.text = s.tip;
  }

  /**
   * Artifact S5 ③: L / C / R rows of cyan segments over 0:00 … end, the longest look-away outlined
   * in coral with its seconds, an amber dot + "nudge" under each nudge, and a time axis. Quads go
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
      labels.push(() => addText(root, 'LongestLabel', label, 'Subheadline', lw, TL_ROW_H + 0.5, DIST, CORAL, new vec3(cx, y, 0.3)));
    }
    let lastLabelX = -Infinity;
    tl.nudges.forEach((f) => {
      const x = xOf(f);
      addSurface(child(root, 'NudgeStem', new vec3(x, (TL_ROW_Y[2] + TL_NUDGE_Y) / 2, 0.25)), 0.12, TL_ROW_Y[2] - TL_NUDGE_Y, 0, NUDGE_AMBER, null);
      addSurface(child(root, 'NudgeDot', new vec3(x, TL_NUDGE_Y, 0.3)), 0.6, 0.6, 0, NUDGE_AMBER, null);
      // One "nudge" word per marker unless it would overlap the previous one.
      if (x - lastLabelX > 6) {
        lastLabelX = x;
        const lx = Math.min(x + 2.9, TL_X0 + TL_STRIP_W - 2.4);
        labels.push(() => addText(root, 'NudgeLabel', 'nudge', 'Subheadline', 5, 1.6, DIST, NUDGE_AMBER, new vec3(lx, TL_NUDGE_Y, 0.3)));
      }
    });
    labels.forEach((f) => f());
    ['L', 'C', 'R'].forEach((n, z) => {
      addText(root, `Row${n}`, n, 'Headline2', 2.5, TL_ROW_H + 0.4, DIST, amberRows[z] ? TEXT_AMBER : TEXT_PRIMARY, new vec3(-20.6, TL_ROW_Y[z], 0.1));
    });
    tl.axis.forEach((tick, i) => {
      const last = i === tl.axis.length - 1;
      // The first label starts at 0:00 and the last ends at the strip's right edge.
      const x = xOf(tick.at) + (i === 0 ? 1.6 : last ? -1.6 : 0);
      addText(root, 'Axis', tick.label, 'Subheadline', 4.5, 1.6, DIST, TEXT_SECONDARY, new vec3(x, TL_AXIS_Y, 0.1));
    });
  }
}
