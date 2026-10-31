/**
 * Podium.ts — Lens component: Prev / Next / Finish pinch buttons + Re-place (small, left),
 * section counter and elapsed time, 55 cm ahead / 30 cm below the head (plan M7).
 *
 * Builds its own UIKit UI (EyesUpUI.ts). Buttons are UIKit `Button`s (each owns a SIK Interactable
 * created at initialize, so LEAF finds them by SceneObject name: PrevButton, NextButton,
 * FinishButton, ReplaceButton). Triggers use the Element-level `onTriggerUp`, per specs-build-ui.
 * Logic lives in core/PodiumModel.ts (unit-tested). Buttons are 3.6 cm tall at 55 cm (Re-place 3.2; brief: ≥ 3 cm).
 */
import { PodiumState } from './core/PodiumModel';
import { Panel, TEXT_ACCENT, addButton, faceTowards, flexRow, makePanel, textRow } from './EyesUpUI';

export interface PodiumHandlers {
  prev(): void;
  next(): void;
  finish(): void;
  replace(): void;
}

/** Pass 3 (demo legibility): 30 → 34 cm wide so the larger labels fit; buttons 7.2 × 3.6 cm (≥ 3 cm). */
const W = 34;
const H = 11;
const DIST = 55;

@component
export class Podium extends BaseScriptComponent {
  private panel!: Panel;
  private sectionText!: Text;
  private elapsedText!: Text;
  private replaceButton!: SceneObject;
  private handlers: PodiumHandlers | null = null;
  private visible = false;
  private frames = 0;

  onAwake(): void {
    this.panel = makePanel(this.getSceneObject(), W, H, 1.0, 0.8);
    const c = this.panel.content;
    // Pass 3: info Headline2 → Title2, button labels Button (39) → HeadlineXL (62) / Headline1 (54).
    const info = flexRow(c, 'PodiumInfo', W - 2, 3.2, 2);
    this.sectionText = textRow(info, 'SectionText', '1 / 6', 'Title2', 11, 3.0, DIST, TEXT_ACCENT);
    this.elapsedText = textRow(info, 'ElapsedText', '0:00', 'Title2', 11, 3.0, DIST);
    const buttons = flexRow(c, 'PodiumButtons', W - 2, 3.8, 1.0);
    this.replaceButton = addButton(buttons, 'ReplaceButton', 'Re-place', 6.0, 3.2, DIST, () => this.handlers?.replace(), {
      labelRole: 'Headline1',
    }).button.getSceneObject();
    addButton(buttons, 'PrevButton', 'Prev', 7.2, 3.6, DIST, () => this.handlers?.prev(), { icon: 'chevron_left', labelRole: 'HeadlineXL' });
    addButton(buttons, 'NextButton', 'Next', 7.2, 3.6, DIST, () => this.handlers?.next(), { icon: 'chevron_right', labelRole: 'HeadlineXL' });
    addButton(buttons, 'FinishButton', 'Finish', 7.2, 3.6, DIST, () => this.handlers?.finish(), {
      icon: 'flag',
      primary: true,
      labelRole: 'HeadlineXL',
    });
  }

  bind(handlers: PodiumHandlers): void {
    this.handlers = handlers;
  }

  /** Place the podium root in world space (cm), facing the head. */
  placeAt(x: number, y: number, z: number, head?: vec3): void {
    this.getSceneObject().getTransform().setWorldPosition(new vec3(x, y, z));
    if (head) faceTowards(this.getSceneObject(), head, false);
  }

  apply(state: PodiumState): void {
    // Keep the panel enabled for the first frames so every UIKit element initializes (G3).
    this.frames++;
    const visible = this.frames < 3 ? true : state.visible;
    if (visible !== this.visible || this.frames <= 3) {
      this.visible = visible;
      this.panel.root.enabled = visible;
    }
    if (!state.visible) return;
    this.sectionText.text = state.sectionLabel;
    this.elapsedText.text = state.elapsedLabel;
    this.replaceButton.enabled = state.replaceVisible;
  }
}
