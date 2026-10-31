/**
 * Podium.ts — Lens component: Prev / Next / Finish pinch buttons + Re-place (small, left),
 * section counter and elapsed time, 55 cm ahead / 30 cm below the head (plan M7).
 *
 * Builds its own UIKit UI (EyesUpUI.ts). Buttons are UIKit `Button`s (each owns a SIK Interactable
 * created at initialize, so LEAF finds them by SceneObject name: PrevButton, NextButton,
 * FinishButton, ReplaceButton). Triggers use the Element-level `onTriggerUp`, per specs-build-ui.
 * Logic lives in core/PodiumModel.ts (unit-tested). Buttons are 3.4 cm tall at 55 cm (brief: ≥ 3 cm).
 */
import { PodiumState } from './core/PodiumModel';
import { Panel, TEXT_ACCENT, addButton, faceTowards, flexRow, makePanel, textRow } from './EyesUpUI';

export interface PodiumHandlers {
  prev(): void;
  next(): void;
  finish(): void;
  replace(): void;
}

const W = 30;
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
    const info = flexRow(c, 'PodiumInfo', W - 2, 2.6, 2);
    this.sectionText = textRow(info, 'SectionText', '1 / 6', 'Headline2', 10, 2.4, DIST, TEXT_ACCENT);
    this.elapsedText = textRow(info, 'ElapsedText', '0:00', 'Headline2', 10, 2.4, DIST);
    const buttons = flexRow(c, 'PodiumButtons', W - 2, 3.6, 1.0);
    this.replaceButton = addButton(buttons, 'ReplaceButton', 'Re-place', 5.6, 3.0, DIST, () => this.handlers?.replace()).button.getSceneObject();
    addButton(buttons, 'PrevButton', 'Prev', 6.4, 3.4, DIST, () => this.handlers?.prev(), { icon: 'chevron_left' });
    addButton(buttons, 'NextButton', 'Next', 6.4, 3.4, DIST, () => this.handlers?.next(), { icon: 'chevron_right' });
    addButton(buttons, 'FinishButton', 'Finish', 6.4, 3.4, DIST, () => this.handlers?.finish(), { icon: 'flag', primary: true });
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
