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
import {
  AUDIENCE_OPTIONS,
  LENGTH_OPTIONS,
  SETUP_CAPTION,
  SETUP_EXIT_SECONDS,
  SETUP_PILL,
  SetupModel,
  optionToSlider,
  setupExitScale,
} from './core/SetupModel';
import { SessionConfig } from './core/EyesUpSession';
import { BOX_NEUTRAL, Panel, TEXT_PRIMARY, TEXT_SECONDARY, addBox, addButton, flexRow, makePanel, textRow } from './EyesUpUI';

const W = 40;
const H = 30;
const DIST = 110;

@component
export class SetupPanel extends BaseScriptComponent {
  @input @hint('Panel title') title: string = 'Eyes Up';
  @input @hint('Subtitle under the title (artifact S1 wording)') subtitle: string = 'Rehearse with your eyes on the room.';

  readonly model = new SetupModel();
  private panel!: Panel;
  private lengthText!: Text;
  private audienceText!: Text;
  private deckText!: Text;
  private onStart: ((config: SessionConfig) => void) | null = null;
  private exitTime = -1;
  private wantVisible = true;

  onAwake(): void {
    // Pass 3 (demo legibility): title Headline1 → Title2, subtitle Caption → Headline2,
    // button labels Button (39) → Headline1 (54); row gap 1.0 → 0.9 so it still fits 40 × 30 cm.
    this.panel = makePanel(this.getSceneObject(), W, H, 2, 0.9);
    const c = this.panel.content;
    // Pass 4 (artifact S1): title with a "SETUP" pill on the right.
    const titleRow = flexRow(c, 'SetupTitleRow', W - 4, 4.0, 1);
    textRow(titleRow, 'SetupTitle', this.title, 'Title2', W - 15, 4.0, DIST);
    addBox(titleRow, 'SetupPill', SETUP_PILL, 'Subheadline', 9, 2.6, DIST, TEXT_PRIMARY, BOX_NEUTRAL);
    textRow(c, 'SetupSubtitle', this.subtitle, 'Headline2', W - 4, 2.2, DIST, TEXT_SECONDARY);
    const big = { labelRole: 'Headline1' as const };
    this.lengthText = addButton(c, 'LengthButton', '', 30, 3.6, DIST, () => this.cycleLength(), big).label;
    this.audienceText = addButton(c, 'AudienceButton', '', 30, 3.6, DIST, () => this.cycleAudience(), big).label;
    this.deckText = addButton(
      c,
      'DeckButton',
      '',
      30,
      3.6,
      DIST,
      () => {
        this.model.toggleDeck();
        this.refresh();
      },
      big,
    ).label;
    // Start + the artifact caption side by side (keeps the panel inside 40 × 30 cm).
    const startRow = flexRow(c, 'StartRow', W - 4, 4.4, 1);
    addButton(
      startRow,
      'StartButton',
      'Start rehearsal',
      20,
      4.4,
      DIST,
      () => {
        if (this.exitTime >= 0) return;
        this.exitTime = 0; // 0.3 s shrink, then hand the config to EyesUpApp
      },
      { icon: 'play_arrow', primary: true, labelRole: 'Headline1' },
    );
    // The panel's Text never wraps (Overflow), so the caption breaks after "ahead".
    textRow(startRow, 'SetupCaption', SETUP_CAPTION.replace(' of ', '\nof '), 'Subheadline', 15, 4.4, DIST, TEXT_SECONDARY);
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
    this.deckText.text = `Deck: ${l.deck} · ${l.deckCards}`;
  }
}
