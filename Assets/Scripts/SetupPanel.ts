/**
 * SetupPanel.ts — Lens component for the Setup panel (plan S1: 40×30 cm, 1.1 m ahead, eye level −10 cm).
 * Length slider (3/5/10 min), audience (3/6/9), deck toggle (2 samples), Start rehearsal.
 * Logic: core/SetupModel.ts (unit-tested). Widgets come from the scene (UIKit, built by CLAD).
 *
 * Slider values arrive as 0..1 through `onLengthSlider` / `onAudienceSlider`; hook them to the UIKit
 * Slider's value-changed event in the scene. (미확인: Lens Studio에서 확인 — UIKit Slider 이벤트 이름)
 */
import { Interactable } from 'SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable';
import { SetupModel, setupExitScale, SETUP_EXIT_SECONDS } from './core/SetupModel';
import { SessionConfig } from './core/EyesUpSession';

@component
export class SetupPanel extends BaseScriptComponent {
  @input startButton!: Interactable;
  @input deckButton!: Interactable;
  @input lengthText!: Text;
  @input audienceText!: Text;
  @input deckText!: Text;

  readonly model = new SetupModel();
  private onStart: ((config: SessionConfig) => void) | null = null;
  private exitTime = -1;

  onAwake(): void {
    this.deckButton.onTriggerEnd.add(() => {
      this.model.toggleDeck();
      this.refresh();
    });
    this.startButton.onTriggerEnd.add(() => {
      if (this.exitTime >= 0) return;
      this.exitTime = 0; // 0.3 s shrink, then hand the config to EyesUpApp
    });
    this.createEvent('UpdateEvent').bind(() => this.tickExit(getDeltaTime()));
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
    this.getSceneObject().enabled = visible;
    if (visible) {
      this.exitTime = -1;
      this.getSceneObject().getTransform().setLocalScale(new vec3(1, 1, 1));
    }
  }

  private tickExit(dt: number): void {
    if (this.exitTime < 0) return;
    this.exitTime += dt;
    const s = setupExitScale(this.exitTime);
    this.getSceneObject().getTransform().setLocalScale(new vec3(s, s, s));
    if (this.exitTime >= SETUP_EXIT_SECONDS) {
      this.exitTime = -1;
      this.onStart?.(this.model.config);
    }
  }

  private refresh(): void {
    const l = this.model.labels;
    this.lengthText.text = l.length;
    this.audienceText.text = l.audience;
    this.deckText.text = l.deck;
  }
}
