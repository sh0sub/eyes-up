/**
 * SetupPanel.ts — Lens component for the Setup panel (plan S1: 40×30 cm, 1.1 m ahead, eye level −10 cm).
 * Talk length (3/5/10 min), audience (3/6/9), deck toggle (2 samples), Start rehearsal.
 * Logic: core/SetupModel.ts (unit-tested).
 *
 * The panel builds its own UIKit UI (BackPlate + FlexLayout + Buttons, see EyesUpUI.ts).
 * Build decision: length and audience are pinch-to-cycle Buttons instead of UIKit Sliders — the
 * brief asks for "a few big targets" and pinch-only input, and a 3-stop slider is a small drag
 * target. `onLengthSlider` / `onAudienceSlider` stay as the slider-style API (0..1 → snapped option).
 * Placement (1.1 m ahead, 10 cm below the eyes, facing the head) is done by EyesUpApp on Setup.
 */
import { AUDIENCE_OPTIONS, LENGTH_OPTIONS, SetupModel, optionToSlider, setupExitScale, SETUP_EXIT_SECONDS } from './core/SetupModel';
import { SessionConfig } from './core/EyesUpSession';
import { Panel, TEXT_SECONDARY, addButton, makePanel, textRow } from './EyesUpUI';

const W = 40;
const H = 30;
const DIST = 110;

@component
export class SetupPanel extends BaseScriptComponent {
  @input @hint('Panel title') title: string = 'Eyes Up';
  @input @hint('Subtitle under the title') subtitle: string = 'Rehearse with an audience in your room';

  readonly model = new SetupModel();
  private panel!: Panel;
  private lengthText!: Text;
  private audienceText!: Text;
  private deckText!: Text;
  private onStart: ((config: SessionConfig) => void) | null = null;
  private exitTime = -1;
  private wantVisible = true;

  onAwake(): void {
    this.panel = makePanel(this.getSceneObject(), W, H, 2, 1.0);
    const c = this.panel.content;
    textRow(c, 'SetupTitle', this.title, 'Headline1', W - 4, 3.2, DIST);
    textRow(c, 'SetupSubtitle', this.subtitle, 'Caption', W - 4, 2.0, DIST, TEXT_SECONDARY);
    this.lengthText = addButton(c, 'LengthButton', '', 30, 3.6, DIST, () => this.cycleLength()).label;
    this.audienceText = addButton(c, 'AudienceButton', '', 30, 3.6, DIST, () => this.cycleAudience()).label;
    this.deckText = addButton(c, 'DeckButton', '', 30, 3.6, DIST, () => {
      this.model.toggleDeck();
      this.refresh();
    }).label;
    addButton(
      c,
      'StartButton',
      'Start rehearsal',
      22,
      4.4,
      DIST,
      () => {
        if (this.exitTime >= 0) return;
        this.exitTime = 0; // 0.3 s shrink, then hand the config to EyesUpApp
      },
      { icon: 'play_arrow', primary: true },
    );
    // Visibility is applied in UpdateEvent (after every UIKit element has run OnStart): disabling
    // a UIKit host before its OnStart stops it from ever initializing (specs-build-ui G3).
    this.createEvent('UpdateEvent').bind(() => {
      this.panel.root.enabled = this.wantVisible;
      this.tickExit(getDeltaTime());
    });
    this.refresh();
  }

  bind(onStart: (config: SessionConfig) => void): void {
    this.onStart = onStart;
  }

  onLengthSlider(value01: number): void {
    this.model.setLengthSlider(value01);
    this.refresh();
  }

  onAudienceSlider(value01: number): void {
    this.model.setAudienceSlider(value01);
    this.refresh();
  }

  show(visible: boolean): void {
    this.wantVisible = visible;
    if (this.panel) this.panel.root.enabled = visible;
    if (visible) {
      this.exitTime = -1;
      this.getSceneObject().getTransform().setLocalScale(new vec3(1, 1, 1));
    }
  }

  private cycleLength(): void {
    const opts = LENGTH_OPTIONS as readonly number[];
    const next = opts[(opts.indexOf(this.model.config.lengthMinutes) + 1) % opts.length];
    this.onLengthSlider(optionToSlider(opts, next));
  }

  private cycleAudience(): void {
    const opts = AUDIENCE_OPTIONS as readonly number[];
    const next = opts[(opts.indexOf(this.model.config.audienceCount) + 1) % opts.length];
    this.onAudienceSlider(optionToSlider(opts, next));
  }

  private tickExit(dt: number): void {
    if (this.exitTime < 0) return;
    this.exitTime += dt;
    const s = Math.max(0.001, setupExitScale(this.exitTime));
    this.getSceneObject().getTransform().setLocalScale(new vec3(s, s, s));
    if (this.exitTime >= SETUP_EXIT_SECONDS) {
      this.exitTime = -1;
      this.onStart?.(this.model.config);
    }
  }

  private refresh(): void {
    const l = this.model.labels;
    this.lengthText.text = `Length: ${l.length}`;
    this.audienceText.text = `Audience: ${l.audience}`;
    this.deckText.text = `Deck: ${l.deck}`;
  }
}
