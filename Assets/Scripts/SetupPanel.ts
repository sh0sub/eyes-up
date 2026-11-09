/**
 * SetupPanel.ts — Lens component for the Setup panel (plan S1: 40×30 cm, 1.1 m ahead, eye level −10 cm).
 * Level select: the audience size is the stage (3/6/9 listeners = Stage 1/2/3, core/StageProgress.ts), talk length as segmented buttons, deck list (2 samples), PLAY.
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
  SetupModel,
  optionToSlider,
  setupExitScale,
} from './core/SetupModel';
import { StageBests, stageCardBest, stageCardTitle, stageHeader, starRow } from './core/StageProgress';
import { SessionConfig } from './core/EyesUpSession';
import { FlexJustify } from 'UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes';
import { LINE_CYAN, PANEL_STROKE_CM, Panel, TEXT_ACCENT, TEXT_AMBER, TEXT_LABEL, TEXT_PRIMARY, addBlock, addButton, addCircleRing, addDot, addRoundedSurface, addStar, addSurface, addText, child, flexRow, makePanel, textRow } from './EyesUpUI';

/**
 * Level select (game layer): panel 54 x 53 cm at scale 1.08. The width is capped by the lens frustum (about 64 cm at 1.1 m); stage cards replace the
 * old Audience row and a wide mint PLAY replaces "Start rehearsal". Interactable names stay (Audience_n, StartButton) so LEAF and the flows are unchanged.
 */
const W = 54;
const H = 53;
const PANEL_SCALE = 1.08;
const DIST = 110;
/** R4: one label column (left-aligned) and one row width so Talk length / Deck line up. */
const LABEL_W = 11.5;
const ROW_W = W - 4;
const ROW_GAP = 1.4;
const CHIP_TEXT_SIZE = 76;
const CARD_W = 15.6;
const CARD_H = 13.5;
const CARD_STAR_R = 1.05;
const CARD_STAR_GAP = 3;
const STAR_GOLD = new vec4(1.0, 0.76, 0.29, 1);
const STAR_EMPTY = new vec4(0.55, 0.85, 1.0, 0.75);
const PLAY_W = 34;
const PLAY_H = 7.8;

interface StageCard {
  value: number;
  setSelected: (on: boolean) => void;
  best: Text;
  stars: Array<{ full: SceneObject; empty: SceneObject }>;
}

@component
export class SetupPanel extends BaseScriptComponent {
  @input @hint('Panel title') title: string = 'Eyes Up';

  readonly model = new SetupModel();
  private panel!: Panel;
  private lengthSeg: Array<{ value: number; setSelected: (on: boolean) => void }> = [];
  private stageCards: StageCard[] = [];
  private stageText!: Text;
  private bests: StageBests | null = null;
  private deckButtons: Array<{ id: string; setSelected: (on: boolean) => void }> = [];
  private importLabel!: Text;
  private onStart: ((config: SessionConfig) => void) | null = null;
  private exitTime = -1;
  private wantVisible = true;

  onAwake(): void {
    this.panel = makePanel(this.getSceneObject(), W, H, 1.6, ROW_GAP);
    this.panel.root.getTransform().setLocalScale(new vec3(PANEL_SCALE, PANEL_SCALE, PANEL_SCALE));
    const c = this.panel.content;
    // Header: logo, title and the selected stage in cyan.
    const titleRow = flexRow(c, 'SetupTitleRow', ROW_W, 6.2, 1, FlexJustify.Start);
    this.buildLogo(addBlock(titleRow, 'SetupLogo', 4.4, 4.4));
    textRow(titleRow, 'SetupTitle', this.title, 'Title', 18.6, 6.2, DIST).horizontalAlignment = HorizontalAlignment.Left;
    this.stageText = textRow(titleRow, 'SetupStage', stageHeader(AUDIENCE_OPTIONS[0]), 'Heading', ROW_W - 4.4 - 18.6 - 2, 6.2, DIST, TEXT_ACCENT);
    this.stageText.size = 92;
    this.stageText.horizontalAlignment = HorizontalAlignment.Right;
    // Level select: one card per audience size (Stage 1 / 2 / 3), stars and best score from stored runs.
    const stageRow = flexRow(c, 'AudienceRow', ROW_W, CARD_H, 1.2, FlexJustify.Center);
    this.stageCards = AUDIENCE_OPTIONS.map((n) => this.stageCard(stageRow, n));
    const seg = { labelRole: 'Heading' as const };
    this.lengthSeg = this.segmentRow(c, 'Length', 'Talk length', LENGTH_OPTIONS, 'min', (v) => this.model.setLengthSlider(optionToSlider(LENGTH_OPTIONS, v)), seg);
    const deckRow = flexRow(c, 'DeckRow', ROW_W, 6.6, 1, FlexJustify.Start);
    textRow(deckRow, 'DeckLabel', 'Deck', 'Heading', LABEL_W, 6.6, DIST, TEXT_LABEL).horizontalAlignment = HorizontalAlignment.Left;
    this.deckButtons = DECKS.map((d) => {
      const id = d.id;
      const btn = addButton(
        deckRow,
        `Deck_${id}`,
        `${d.name}\n${d.sections.length} cards`,
        13.6,
        6.6,
        DIST,
        () => {
          this.model.selectDeck(id);
          this.refresh();
        },
        { labelRole: 'Body' },
      );
      btn.label.size = CHIP_TEXT_SIZE;
      return { id, setSelected: btn.setSelected };
    });
    // Artifact F14 (stretch): type a talk outline on the AR keyboard (core/DeckImport.ts format).
    const imp = addButton(deckRow, 'ImportDeckButton', 'Import\ntext', 8.6, 6.6, DIST, () => this.importDeck(), { labelRole: 'Body' });
    imp.label.size = CHIP_TEXT_SIZE;
    this.importLabel = imp.label;
    this.deckButtons.push({ id: IMPORTED_DECK_ID, setSelected: imp.setSelected });
    // PLAY is the one big mint button on the panel.
    const startRow = flexRow(c, 'StartRow', ROW_W, PLAY_H, 1, FlexJustify.Center);
    addButton(
      startRow,
      'StartButton',
      'PLAY',
      PLAY_W,
      PLAY_H,
      DIST,
      () => {
        if (this.exitTime >= 0) return;
        this.exitTime = 0; // 0.3 s shrink, then hand the config to EyesUpApp
      },
      { icon: 'play_arrow', mint: true, labelRole: 'Heading', labelSize: 118 },
    );
    const caption = textRow(c, 'SetupCaption', SETUP_CAPTION, 'Body', ROW_W, 3.2, DIST, TEXT_LABEL);
    caption.size = 68;
    // Visibility is applied in UpdateEvent (after every UIKit element has run OnStart): disabling
    // a UIKit host before its OnStart stops it from ever initializing (specs-build-ui G3).
    this.createEvent('UpdateEvent').bind(() => {
      this.panel.root.enabled = this.wantVisible;
      this.tickExit(getDeltaTime());
    });
    this.refresh();
  }

  bind(onStart: (config: SessionConfig) => void, bests: StageBests | null = null): void {
    this.onStart = onStart;
    this.bests = bests;
    this.refresh();
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
      if (this.panel) this.refresh();
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
    const row = flexRow(parent, `${name}Row`, ROW_W, 5.4, 1, FlexJustify.Start);
    textRow(row, `${name}Label`, label, 'Heading', LABEL_W, 5.4, DIST, TEXT_LABEL).horizontalAlignment = HorizontalAlignment.Left;
    const segs = options.map((value) => {
      const b = addButton(
        row,
        `${name}_${value}`,
        String(value),
        7.2,
        5.3,
        DIST,
        () => {
          pick(value);
          this.refresh();
        },
        btn,
      );
      return { value, setSelected: b.setSelected };
    });
    // Same type step and height as the row label, so the unit sits on the chips' baseline.
    textRow(row, `${name}Unit`, unit, 'Heading', ROW_W - LABEL_W - 3 * 7.2 - 4, 5.4, DIST, TEXT_LABEL).horizontalAlignment = HorizontalAlignment.Left;
    return segs;
  }

  /** A pinchable stage card: stage name, listener count, three stars and the best score (the button is named Audience_n as before). */
  private stageCard(parent: SceneObject, n: number): StageCard {
    const b = addButton(parent, `Audience_${n}`, '', CARD_W, CARD_H, DIST, () => {
      this.model.setAudienceSlider(optionToSlider(AUDIENCE_OPTIONS, n));
      this.refresh();
    });
    const so = b.button.getSceneObject();
    addText(so, `Stage${n}Title`, stageCardTitle(n), 'Heading', CARD_W - 1, 3, DIST, TEXT_PRIMARY, new vec3(0, 4.6, 0.4)).size = 92;
    addText(so, `Stage${n}Count`, `${n} listeners`, 'Body', CARD_W - 1, 2.6, DIST, TEXT_LABEL, new vec3(0, 1.8, 0.4)).size = 72;
    const stars = [0, 1, 2].map((k) => {
      const root = child(so, `Stage${n}Star${k}`, new vec3((k - 1) * CARD_STAR_GAP, -1.3, 0.4));
      const empty = addStar(root, 'Empty', 5, CARD_STAR_R, 0.45, new vec3(0, 0, 0), STAR_EMPTY, 0.28).getSceneObject();
      const full = addStar(root, 'Full', 5, CARD_STAR_R, 0.45, new vec3(0, 0, 0.02), STAR_GOLD).getSceneObject();
      return { full, empty };
    });
    const best = addText(so, `Stage${n}Best`, 'Not played', 'Body', CARD_W - 1, 2.6, DIST, TEXT_AMBER, new vec3(0, -4.4, 0.4));
    best.size = 72;
    return { value: n, setSelected: b.setSelected, best, stars };
  }

  /** Logo tile (mockup S1): a rounded outline tile with an outlined eye (pupil and three lashes), in the panel's one stroke. */
  private buildLogo(block: SceneObject): void {
    addRoundedSurface(child(block, 'Tile', new vec3(0, 0, 0.05)), 4.4, 4.4, 0, new vec4(0.4, 0.7, 1.0, 0.08), LINE_CYAN, 1.1, PANEL_STROKE_CM);
    const eye = child(block, 'Eye', new vec3(0, -0.25, 0.1));
    const ring = child(eye, 'EyeRing');
    ring.getTransform().setLocalScale(new vec3(1, 0.62, 1));
    addCircleRing(ring, 'Ring', 1.55, 0.3, 0, LINE_CYAN);
    addDot(eye, 'Pupil', 0.55, new vec3(0, 0, 0), LINE_CYAN);
    [-1.0, 0, 1.0].forEach((x, k) => addSurface(child(eye, `Lash${k}`, new vec3(x, k === 1 ? 1.6 : 1.4, 0)), 0.2, 0.55, 0, LINE_CYAN, null));
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
    this.stageText.text = stageHeader(cfg.audienceCount);
    this.stageCards.forEach((card) => {
      card.setSelected(card.value === cfg.audienceCount);
      const best = this.bests?.get(card.value) ?? null;
      card.best.text = stageCardBest(best);
      const row = starRow(best?.stars ?? 0);
      card.stars.forEach((st, k) => {
        st.full.enabled = row[k];
        st.empty.enabled = !row[k];
      });
    });
    this.deckButtons.forEach((o) => o.setSelected(o.id === cfg.deckId));
    const imported = getImportedDeck();
    this.importLabel.text = imported ? `Imported\n${imported.sections.length} cards` : 'Import\ntext';
  }
}
