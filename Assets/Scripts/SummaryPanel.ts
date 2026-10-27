/**
 * SummaryPanel.ts — Lens component for the Summary panel (plan M8: 50×40 cm, 1.5 m ahead, eye level).
 * Time, gaze % per zone (bars fill in 0.6 s), longest look-away, card expands, balance score,
 * Again / Done. Logic: core/SummaryModel.ts (unit-tested).
 * (미확인: Lens Studio에서 확인 — 막대는 Frame 너비 대신 로컬 스케일 X로 표현)
 */
import { Interactable } from 'SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable';
import { StatsSnapshot } from './SessionStats';
import { summaryState, BAR_FILL_SECONDS } from './core/SummaryModel';

@component
export class SummaryPanel extends BaseScriptComponent {
  @input againButton!: Interactable;
  @input doneButton!: Interactable;
  @input timeText!: Text;
  /** [left, center, right] percent labels. */
  @input zoneTexts!: Text[];
  /** [left, center, right] bar SceneObjects; scaled on X from 0 to percent/100. */
  @input zoneBars!: SceneObject[];
  @input longestText!: Text;
  @input cardsText!: Text;
  @input balanceText!: Text;

  private onAgain: (() => void) | null = null;
  private onDone: (() => void) | null = null;
  private snapshot: StatsSnapshot | null = null;
  private shown = 0;

  onAwake(): void {
    this.againButton.onTriggerEnd.add(() => this.onAgain?.());
    this.doneButton.onTriggerEnd.add(() => this.onDone?.());
    this.createEvent('UpdateEvent').bind(() => this.tick(getDeltaTime()));
  }

  bind(onAgain: () => void, onDone: () => void): void {
    this.onAgain = onAgain;
    this.onDone = onDone;
  }

  show(snapshot: StatsSnapshot | null): void {
    this.snapshot = snapshot;
    this.shown = 0;
    this.getSceneObject().enabled = snapshot !== null;
    if (snapshot) this.render();
  }

  private tick(dt: number): void {
    if (!this.snapshot || this.shown > BAR_FILL_SECONDS) return;
    this.shown += dt;
    this.render();
  }

  private render(): void {
    if (!this.snapshot) return;
    const s = summaryState(this.snapshot, this.shown);
    this.timeText.text = s.timeLabel;
    s.zones.forEach((z, i) => {
      if (this.zoneTexts[i]) this.zoneTexts[i].text = `${z.name} ${z.label}`;
      if (this.zoneBars[i]) this.zoneBars[i].getTransform().setLocalScale(new vec3(Math.max(0.001, z.bar), 1, 1));
    });
    this.longestText.text = s.longestLookAwayLabel;
    this.cardsText.text = s.cardExpandsLabel;
    this.balanceText.text = s.balanceLabel;
  }
}
