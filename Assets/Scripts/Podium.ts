/**
 * Podium.ts — Lens component: Prev / Next / Finish pinch buttons + Re-place (small, left),
 * section counter and elapsed time, 55 cm ahead / 30 cm below the head (plan M7).
 *
 * Builds its own UIKit UI (EyesUpUI.ts). Buttons are UIKit `Button`s (each owns a SIK Interactable
 * created at initialize, so LEAF finds them by SceneObject name: PrevButton, NextButton,
 * FinishButton, ReplaceButton). Triggers use the Element-level `onTriggerUp`, per specs-build-ui.
 * Logic lives in core/PodiumModel.ts (unit-tested). Pass 4: Next 9.6×4.8 cm, Prev/Finish 6.4×3.6,
 * Re-place 5.6×3.2 at 55 cm (brief: ≥ 3 cm).
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
/** Cycle 5 (R5): 34 x 11 -> 38 x 12.5 cm, labels and buttons about 1.15x to 1.3x larger. */
/**
 * Redesign: 38 -> 30 cm. At 55 cm ahead the Specs field of view is only about 32 degrees wide (about 31 cm), so a 38 cm panel was cut
 * off by the lens frustum at both sides (square edges in the Preview). 30 cm leaves a small margin, like the mockup's 30 x 8 cm.
 */
export const PODIUM_W_CM = 30;
export const PODIUM_H_CM = 12.5;
const W = PODIUM_W_CM;
const H = PODIUM_H_CM;
const DIST = 55;

@component
export class Podium extends BaseScriptComponent {
  private panel!: Panel;
  private sectionText!: Text;
  private elapsedText!: Text;
  private replaceButton!: SceneObject;
  private finishButton: SceneObject | null = null;
  private finishLabel: Text | null = null;
  private pulsing = false;
  private handlers: PodiumHandlers | null = null;
  private visible = false;
  private frames = 0;

  onAwake(): void {
    this.panel = makePanel(this.getSceneObject(), W, H, 1.0, 0.8);
    const c = this.panel.content;
    // Pass 4 (artifact S4): counter "n / N" + timer "m:ss / m:ss"; Next is the largest target and
    // the cyan primary; Prev / Finish smaller (Finish amber-framed). All buttons stay ≥ 3 cm tall.
    // Re-place lives in the info row (hidden during Rehearsal) so the button row stays centered.
    const info = flexRow(c, 'PodiumInfo', W - 2, 3.8, 1.2);
    this.replaceButton = addButton(info, 'ReplaceButton', 'Re-place', 6.2, 3.8, DIST, () => this.handlers?.replace(), {
      labelRole: 'Body',
    }).button.getSceneObject();
    this.sectionText = textRow(info, 'SectionText', '1 / 5', 'Title', 6, 3.4, DIST, TEXT_ACCENT);
    this.elapsedText = textRow(info, 'ElapsedText', '0:00 / 3:00', 'Title', 13, 3.4, DIST);
    const buttons = flexRow(c, 'PodiumButtons', W - 2, 5.8, 0.8);
    addButton(buttons, 'PrevButton', 'Prev', 6.8, 4.2, DIST, () => this.handlers?.prev(), { icon: 'chevron_left', labelRole: 'Heading' });
    addButton(buttons, 'NextButton', 'Next', 9.4, 5.4, DIST, () => this.handlers?.next(), {
      icon: 'chevron_right',
      primary: true,
      labelRole: 'Title',
    });
    const finish = addButton(buttons, 'FinishButton', 'Finish', 7.2, 4.2, DIST, () => this.handlers?.finish(), {
      icon: 'flag',
      amber: true,
      labelRole: 'Heading',
    });
    this.finishButton = finish.button.getSceneObject();
    this.finishLabel = finish.label;
  }

  /**
   * Pass 5 (artifact S4 / brief): once the talk length is reached, Finish pulses at 1 Hz — scale
   * 1.00 ↔ 1.12 and the label between white and amber. `p` = 0 leaves it at rest.
   */
  private pulseFinish(p: number): void {
    if (!this.finishButton) return;
    if (p === 0 && !this.pulsing) return;
    this.pulsing = p > 0;
    const s = 1 + 0.12 * p;
    this.finishButton.getTransform().setLocalScale(new vec3(s, s, 1));
    if (this.finishLabel) this.finishLabel.textFill.color = new vec4(1, 1 - 0.25 * p, 1 - 0.7 * p, 1);
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
    this.elapsedText.text = state.timerLabel;
    this.replaceButton.enabled = state.replaceVisible;
    this.pulseFinish(state.finishPulse);
  }
}
