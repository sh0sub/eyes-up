/**
 * MINIMAL hand-written stand-in for Lens Studio globals, used ONLY so `npm run typecheck`
 * can check the Lens component files in Node. It is not complete and not authoritative:
 * Lens Studio provides the real declarations (Support/) when the project is opened.
 * Every member below is something the Eyes Up components use. (미확인: Lens Studio에서 확인)
 */
declare function component(target: any): any;
declare function input(...args: any[]): any;
declare function hint(text: string): any;
declare function allowUndefined(target: any, key: string): void;
declare function print(message: any): void;
declare function getDeltaTime(): number;

declare class vec3 {
  constructor(x: number, y: number, z: number);
  x: number;
  y: number;
  z: number;
}
declare class vec4 {
  constructor(x: number, y: number, z: number, w: number);
  x: number;
  y: number;
  z: number;
  w: number;
}

declare class Transform {
  getWorldPosition(): vec3;
  setWorldPosition(p: vec3): void;
  getLocalScale(): vec3;
  setLocalScale(s: vec3): void;
  readonly back: vec3;
  readonly forward: vec3;
}

declare class SceneObject {
  enabled: boolean;
  name: string;
  getTransform(): Transform;
}

declare class Component {
  enabled: boolean;
  getSceneObject(): SceneObject;
  getTransform(): Transform;
}

declare class Pass {
  baseColor: vec4;
}
declare class Material {
  mainPass: Pass;
}
declare class RenderMeshVisual extends Component {
  mainPass: Pass;
  mainMaterial: Material;
}
declare class AudioComponent extends Component {
  play(loops: number): void;
  stop(fade: boolean): void;
}
declare class Text extends Component {
  text: string;
}

declare class SceneEvent {
  bind(callback: (eventData?: any) => void): void;
}

declare class ScriptComponent extends Component {}

declare class BaseScriptComponent extends ScriptComponent {
  createEvent(eventType: 'OnStartEvent' | 'UpdateEvent' | 'OnEnableEvent' | 'OnDisableEvent'): SceneEvent;
}

declare module 'SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable' {
  /** SIK Interactable (pinch target). Only the event we use is declared. */
  export class Interactable extends BaseScriptComponent {
    onTriggerEnd: { add(callback: (event?: any) => void): void };
  }
}
