/**
 * Podium.ts — Lens component: Prev / Next / Finish pinch buttons + Re-place (small, left),
 * section counter and elapsed time, 55 cm ahead / 30 cm below the head (plan M7).
 *
 * The scene (built by CLAD with UIKit/SIK) provides the buttons; this script only binds
 * `onTriggerEnd` and writes labels. Logic lives in core/PodiumModel.ts (unit-tested).
 * (미확인: Lens Studio에서 확인 — SIK import 경로, onTriggerEnd 이벤트 이름, UIKit 버튼이 Interactable을 노출하는지)
 */
import { Interactable } from 'SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable';
import { PodiumState } from './core/PodiumModel';

export interface PodiumHandlers {
  prev(): void;
  next(): void;
  finish(): void;
  replace(): void;
}

@component
export class Podium extends BaseScriptComponent {
  @input prevButton!: Interactable;
  @input nextButton!: Interactable;
  @input finishButton!: Interactable;
  @input replaceButton!: Interactable;
  @input sectionText!: Text;
  @input elapsedText!: Text;

  private handlers: PodiumHandlers | null = null;

  onAwake(): void {
    this.prevButton.onTriggerEnd.add(() => this.handlers?.prev());
    this.nextButton.onTriggerEnd.add(() => this.handlers?.next());
    this.finishButton.onTriggerEnd.add(() => this.handlers?.finish());
    this.replaceButton.onTriggerEnd.add(() => this.handlers?.replace());
  }

  bind(handlers: PodiumHandlers): void {
    this.handlers = handlers;
  }

  /** Place the podium root in world space (cm). */
  placeAt(x: number, y: number, z: number): void {
    this.getSceneObject().getTransform().setWorldPosition(new vec3(x, y, z));
  }

  apply(state: PodiumState): void {
    this.getSceneObject().enabled = state.visible;
    if (!state.visible) return;
    this.sectionText.text = state.sectionLabel;
    this.elapsedText.text = state.elapsedLabel;
    this.replaceButton.getSceneObject().enabled = state.replaceVisible;
  }
}
