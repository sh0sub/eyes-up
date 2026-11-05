/**
 * SetupPanel.ts — Lens component for the Setup panel (plan S1: 40×30 cm, 1.1 m ahead, eye level −10 cm).
 * Talk length (3/5/10 min) and audience (3/6/9) as segmented buttons, deck list (2 samples), Start rehearsal.
 * Logic: core/SetupModel.ts (unit-tested).
 *
 * The panel builds its own UIKit UI (BackPlate + FlexLayout + Buttons, see EyesUpUI.ts).
 * Build decision: UIKit Sliders are a small drag target, so the artifact's S1 controls are pinch-only
 * segmented Buttons (selected = cyan). `onLengthSlider` / `onAudienceSlider` stay as the slider-style API
 * (0..1 → snapped option).
 * Placement (1.1 m ahead, 10 cm below the eyes, facing the head) is done by EyesUpApp on Setup.
 */
import { DECKS, IMPORTED_DECK_ID, getImportedDeck, setImportedDeck } from './DeckData';
import { parseDeckText } from './core/DeckImport';
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
import { BOX_NEUTRAL, Panel, TEXT_LABEL, TEXT_PRIMARY, addBox, addButton, flexRow, makePanel, textRow } from './EyesUpUI';

/** Cycle 5 (R5): 40 x 30 -> 46 x 34 cm so the captions, labels and Start button can be about 1.3x larger. */
const W = 46;
const H = 34;
const DIST = 110;
/** R4: one label column (left-aligned) and one row width so Talk length / Audience / Deck line up. */
const LABEL_W = 10.5;
const ROW_W = W - 4;

@component
export class SetupPanel extends BaseScriptComponent {
  @input @hint('Panel title') title: string = 'Eyes Up';
  @input @hint('Subtitle under the title (artifact S1 wording)') subtitle: string = 'Rehearse with your eyes on the room.';

  readonly model = new SetupModel();
  private panel!: Panel;
  private lengthSeg: Array<{ value: number; setSelected: (on: boolean) => void }> = [];
  private audienceSeg: Array<{ value: number; setSelected: (on: boolean) => void }> = [];
  private deckButtons: Array<{ id: string; setSelected: (on: boolean) => void }> = [];
  private importLabel!: Text;
  private onStart: ((config: SessionConfig) => void) | null = null;
  private exitTime = -1;
  private wantVisible = true;

  onAwake(): void {
    // Pass 3 (demo legibility): title Headline1 → Title2, subtitle Caption → Headline2,
    // button labels Button (39) → Headline1 (54); row gap 1.0 → 0.9 so it still fits 40 × 30 cm.
    this.panel = makePanel(this.getSceneObject(), W, H, 1.4, 0.8);
    const c = this.panel.content;
    // Pass 4 (artifact S1): title with a "SETUP" pill on the right.
    const titleRow = flexRow(c, 'SetupTitleRow', W - 4, 4.4, 1);
    textRow(titleRow, 'SetupTitle', this.title, 'Title', W - 15, 4.4, DIST).horizontalAlignment = HorizontalAlignment.Left;
    addBox(titleRow, 'SetupPill', SETUP_PILL, 'Caption', 9, 2.6, DIST, TEXT_PRIMARY, BOX_NEUTRAL);
    textRow(c, 'SetupSubtitle', this.subtitle, 'Body', W - 4, 3, DIST, TEXT_LABEL).horizontalAlignment = HorizontalAlignment.Left;
    // Pass 6 (artifact S1): segmented 3/5/10 and 3/6/9 controls (selected = cyan), deck list, mint Start.
    const seg = { labelRole: 'Heading' as const };
    this.lengthSeg = this.segmentRow(c, 'Length', 'Talk length', LENGTH_OPTIONS, 'min', (v) => this.model.setLengthSlider(optionToSlider(LENGTH_OPTIONS, v)), seg);
    this.audienceSeg = this.segmentRow(c, 'Audience', 'Audience', AUDIENCE_OPTIONS, 'people', (v) => this.model.setAudienceSlider(optionToSlider(AUDIENCE_OPTIONS, v)), seg);
    const deckRow = flexRow(c, 'DeckRow', W - 4, 5.2, 1);
    textRow(deckRow, 'DeckLabel', 'Deck', 'Heading', LABEL_W, 5.2, DIST, TEXT_LABEL).horizontalAlignment = HorizontalAlignment.Left;
    this.deckButtons = DECKS.map((d) => {
      const id = d.id;
      const btn = addButton(
        deckRow,
        `Deck_${id}`,
        `${d.name}\n${d.sections.length} cards`,
        11,
        5.2,
        DIST,
        () => {
          this.model.selectDeck(id);
          this.refresh();
        },
        { labelRole: 'Body' },
      );
      return { id, setSelected: btn.setSelected };
    });
    // Artifact F14 (stretch): type a talk outline on the AR keyboard (core/DeckImport.ts format).
    const imp = addButton(deckRow, 'ImportDeckButton', 'Import\ntext', 7, 5.2, DIST, () => this.importDeck(), { labelRole: 'Body' });
    this.importLabel = imp.label;
    this.deckButtons.push({ id: IMPORTED_DECK_ID, setSelected: imp.setSelected });
    // Start + the artifact caption side by side (keeps the panel inside 40 × 30 cm).
    const startRow = flexRow(c, 'StartRow', W - 4, 5.6, 1);
    addButton(
      startRow,
      'StartButton',
      'Start rehearsal',
      25,
      5.6,
      DIST,
      () => {
        if (this.exitTime >= 0) return;
        this.exitTime = 0; // 0.3 s shrink, then hand the config to EyesUpApp
      },
      { icon: 'play_arrow', mint: true, labelRole: 'Heading' },
    );
    // The panel's Text never wraps (Overflow), so the caption breaks after "ahead".
    textRow(startRow, 'SetupCaption', SETUP_CAPTION.replace(' of ', '\nof '), 'Caption', 16, 5.6, DIST, TEXT_LABEL);
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

  /** A label + 3 segmented buttons (5.5 x 3.5 cm) + unit hint; pinching a segment selects it. */
  private segmentRow(
    parent: SceneObject,
    name: string,
    label: string,
    options: readonly number[],
    unit: string,
    pick: (value: number) => void,
    btn: { labelRole: 'Heading' },
  ): Array<{ value: number; setSelected: (on: boolean) => void }> {
    const row = flexRow(parent, `${name}Row`, W - 4, 4.2, 1);
    textRow(row, `${name}Label`, label, 'Heading', LABEL_W, 4.2, DIST, TEXT_LABEL).horizontalAlignment = HorizontalAlignment.Left;
    const segs = options.map((value) => {
      const b = addButton(
        row,
        `${name}_${value}`,
        String(value),
        6.2,
        4.1,
        DIST,
        () => {
          pick(value);
          this.refresh();
        },
        btn,
      );
      return { value, setSelected: b.setSelected };
    });
    textRow(row, `${name}Unit`, unit, 'Body', ROW_W - LABEL_W - 3 * 6.2 - 4, 4.2, DIST, TEXT_LABEL);
    return segs;
  }

  /** Open the AR keyboard; Return imports the typed outline as the "Imported deck" (device only: no keyboard in Preview). */
  private importDeck(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- Lens Studio module load
      require('LensStudio:TextInputModule');
      const options = new TextInputSystem.KeyboardOptions();
      options.enablePreview = true;
      options.keyboardType = TextInputSystem.KeyboardType.Text;
      options.returnKeyType = TextInputSystem.ReturnKeyType.Done;
      options.initialText = 'Hook: ask a question; show the demo | Ask: fund the pilot';
      let typed = options.initialText;
      options.onTextChanged = (text: string) => {
        typed = text;
      };
      options.onReturnKeyPressed = () => {
        global.textInputSystem.dismissKeyboard();
        this.applyImport(typed);
      };
      options.onError = (_code: number, description: string) => print(`[SetupPanel] keyboard error: ${description}`);
      global.textInputSystem.requestKeyboard(options);
    } catch (e) {
      print(`[SetupPanel] AR keyboard unavailable: ${e}`);
    }
  }

  /** Parse an outline and select it as the deck. Also the entry point for tests / LEAF. */
  applyImport(text: string): boolean {
    const sections = parseDeckText(text);
    if (sections.length === 0) return false;
    setImportedDeck(sections);
    this.model.selectDeck(IMPORTED_DECK_ID);
    this.refresh();
    return true;
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
    const cfg = this.model.config;
    this.lengthSeg.forEach((o) => o.setSelected(o.value === cfg.lengthMinutes));
    this.audienceSeg.forEach((o) => o.setSelected(o.value === cfg.audienceCount));
    this.deckButtons.forEach((o) => o.setSelected(o.id === cfg.deckId));
    const imported = getImportedDeck();
    this.importLabel.text = imported ? `Imported\n${imported.sections.length} cards` : 'Import\ntext';
  }
}
