/**
 * SummaryPanel.ts — Lens component for the Summary panel (plan M8: 50×40 cm, 1.5 m ahead, eye level).
 * Pass 4 layout follows artifact S5: "Nice work — m:ss" + Balance badge, "target m:ss · deck",
 * three zone rows (name · bar · %, amber when out of 15–35 %), two stat boxes (longest look-away
 * with timestamp, card expands · nudges), a one-line tip, Again / Done.
 * Logic: core/SummaryModel.ts (unit-tested). The gaze timeline strip is not built (skipped, pass 4).
 *
 * Each zone bar is a cyan surface quad (EyesUpUI.addSurface) inside a pivot that sits at the bar's
 * left edge, so scaling the pivot on X grows the bar from the left (SceneObject local scale X).
 * Placement (1.5 m ahead at eye level, facing the head) is done by EyesUpApp on Summary.
 */
import { StatsSnapshot } from './SessionStats';
import { SummaryContext, summaryState, BAR_FILL_SECONDS } from './core/SummaryModel';
import {
  BOX_AMBER,
  BOX_MINT,
  BOX_NEUTRAL,
  Panel,
  TEXT_AMBER,
  TEXT_MINT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  addBox,
  addButton,
  addSurface,
  child,
  flexRow,
  makePanel,
  textRow,
} from './EyesUpUI';

/** Zone bar fill (design pass 2): bright cyan. Track behind it: dim blue-grey. */
const BAR_FILL = new vec4(0.45, 0.78, 1.0, 0.9);
const BAR_TRACK = new vec4(0.3, 0.38, 0.5, 0.6);
const W = 50;
const H = 40;
const DIST = 150;
const BAR_W = 27;
const BAR_H = 1.2;

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
    // Header: title + Balance badge (artifact S5 ①).
    const header = flexRow(c, 'SummaryHeader', W - 4, 5.6, 1.5);
    this.titleText = textRow(header, 'TimeText', 'Nice work — 0:00', 'Title2', W - 16, 5.6, DIST);
    this.balanceText = addBox(header, 'BalanceBadge', '0\nBalance', 'Headline1', 9.5, 5.6, DIST, TEXT_MINT, BOX_MINT);
    this.targetText = textRow(c, 'TargetText', 'target 0:00', 'Subheadline', W - 4, 2.2, DIST, TEXT_SECONDARY);
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
}
