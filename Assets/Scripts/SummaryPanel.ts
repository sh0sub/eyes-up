/**
 * SummaryPanel.ts — Lens component for the Summary panel (plan M8: 50×40 cm, 1.5 m ahead, eye level).
 * Time, gaze % per zone (bars fill in 0.6 s), longest look-away, card expands, balance score,
 * Again / Done. Logic: core/SummaryModel.ts (unit-tested).
 *
 * Builds its own UIKit UI (EyesUpUI.ts). Each zone bar is a cyan surface quad (EyesUpUI.addSurface) inside a pivot that sits
 * at the bar's left edge, so scaling the pivot on X grows the bar from the left (checked in Lens
 * Studio: SceneObject local scale X, not a Frame width).
 * Placement (1.5 m ahead at eye level, facing the head) is done by EyesUpApp on Summary.
 */
import { StatsSnapshot } from './SessionStats';
import { summaryState, BAR_FILL_SECONDS } from './core/SummaryModel';
import { Panel, TEXT_ACCENT, TEXT_SECONDARY, addButton, addSurface, child, flexRow, makePanel, textRow } from './EyesUpUI';

/** Zone bar fill (design pass 2): bright cyan (pass 1 used a UIKit 'simple' BackPlate, which never drew). */
const BAR_FILL = new vec4(0.45, 0.78, 1.0, 0.9);
const W = 50;
const H = 40;
const DIST = 150;
const BAR_W = 24;
const BAR_H = 1.4;

@component
export class SummaryPanel extends BaseScriptComponent {
  @input @hint('Panel title') title: string = 'Rehearsal summary';

  private panel!: Panel;
  private timeText!: Text;
  /** [left, center, right] percent labels. */
  private zoneTexts: Text[] = [];
  /** [left, center, right] bar pivots; scaled on X from 0 to percent/100. */
  private zoneBars: SceneObject[] = [];
  private longestText!: Text;
  private cardsText!: Text;
  private balanceText!: Text;

  private onAgain: (() => void) | null = null;
  private onDone: (() => void) | null = null;
  private snapshot: StatsSnapshot | null = null;
  private shown = 0;
  private wantVisible = false;

  onAwake(): void {
    this.panel = makePanel(this.getSceneObject(), W, H, 2.0, 0.6);
    const c = this.panel.content;
    textRow(c, 'SummaryTitle', this.title, 'Headline1', W - 4, 3.6, DIST);
    this.timeText = textRow(c, 'TimeText', '0:00', 'HeadlineXL', W - 4, 4.0, DIST, TEXT_ACCENT);
    for (const name of ['Left', 'Center', 'Right']) {
      const row = flexRow(c, `Zone${name}`, W - 6, 2.8, 1.2);
      this.zoneTexts.push(textRow(row, `Zone${name}Text`, `${name.toLowerCase()} 100%`, 'Body', 12, 2.4, DIST));
      const barCell = flexRow(row, `Zone${name}BarCell`, BAR_W, 2.4, 0);
      const pivot = child(barCell, `Zone${name}Bar`, new vec3(-BAR_W / 2, 0, 0.1));
      const bar = child(pivot, 'Fill', new vec3(BAR_W / 2, 0, 0));
      addSurface(bar, BAR_W, BAR_H, 0, BAR_FILL, null); // bright cyan fill, readable on additive
      this.zoneBars.push(pivot);
    }
    this.longestText = textRow(c, 'LongestText', 'Longest look-away: 0 s, left', 'Body', W - 6, 2.4, DIST, TEXT_SECONDARY);
    this.cardsText = textRow(c, 'CardsText', 'Card expands: 0', 'Body', W - 6, 2.4, DIST, TEXT_SECONDARY);
    this.balanceText = textRow(c, 'BalanceText', 'Balance: 100 / 100', 'Subheadline', W - 6, 2.4, DIST);
    const buttons = flexRow(c, 'SummaryButtons', W - 6, 4.6, 3);
    addButton(buttons, 'AgainButton', 'Again', 12, 4.2, DIST, () => this.onAgain?.(), { icon: 'replay', primary: true });
    addButton(buttons, 'DoneButton', 'Done', 12, 4.2, DIST, () => this.onDone?.(), { icon: 'check' });
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

  /** Text currently shown as the talk time (m:ss). */
  get timeLabel(): string {
    return this.timeText ? this.timeText.text : '';
  }

  show(snapshot: StatsSnapshot | null): void {
    this.snapshot = snapshot;
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
    if (!this.snapshot || !this.timeText) return;
    const s = summaryState(this.snapshot, this.shown);
    this.timeText.text = s.timeLabel;
    s.zones.forEach((z, i) => {
      if (this.zoneTexts[i]) this.zoneTexts[i].text = `${z.name} ${z.label}`;
      if (this.zoneBars[i]) this.zoneBars[i].getTransform().setLocalScale(new vec3(Math.max(0.001, z.bar), 1, 1));
    });
    this.longestText.text = `Longest look-away: ${s.longestLookAwayLabel}`;
    this.cardsText.text = `Card expands: ${s.cardExpandsLabel}`;
    this.balanceText.text = `Balance: ${s.balanceLabel}`;
  }
}
