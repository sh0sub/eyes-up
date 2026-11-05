/**
 * MINIMAL hand-written stand-in for Lens Studio globals, used ONLY so `npm run typecheck`
 * can check the Lens component files in Node. It is not complete and not authoritative:
 * Lens Studio provides the real declarations (Support/StudioLib.d.ts) when the project is opened,
 * and `RecompileTypeScriptTool` checks the components against those. Every member below is
 * something the Eyes Up components use; signatures were copied from Support/StudioLib.d.ts and
 * the UIKit 4.0 sources (package `UIKit.lspkg`) in Cache/TypeScript/Src/Packages (Lens Studio 5.24.1).
 */
declare function component(target: any): any;
declare function input(...args: any[]): any;
declare function hint(text: string): any;
declare function allowUndefined(target: any, key: string): void;
declare function print(message: any): void;
declare function getDeltaTime(): number;

declare class vec2 {
  constructor(x: number, y: number);
  x: number;
  y: number;
}
declare class vec3 {
  constructor(x: number, y: number, z: number);
  x: number;
  y: number;
  z: number;
  readonly length: number;
  add(v: vec3): vec3;
  sub(v: vec3): vec3;
  uniformScale(s: number): vec3;
  normalize(): vec3;
  static up(): vec3;
}
declare class vec4 {
  constructor(x: number, y: number, z: number, w: number);
  x: number;
  y: number;
  z: number;
  w: number;
}
declare class quat {
  static lookAt(forward: vec3, up: vec3): quat;
  static angleAxis(angle: number, axis: vec3): quat;
}
declare class Rect {
  static create(left: number, right: number, bottom: number, top: number): Rect;
}
declare enum HorizontalAlignment {
  Left,
  Center,
  Right,
}
declare enum VerticalAlignment {
  Bottom,
  Center,
  Top,
}
declare enum HorizontalOverflow {
  Overflow,
  Truncate,
  Wrap,
  Shrink,
}
declare enum VerticalOverflow {
  Overflow,
  Truncate,
  Shrink,
}

declare class mat4 {
  multiplyPoint(p: vec3): vec3;
}

declare class Camera {
  fov: number;
  aspect: number;
}

declare class Transform {
  getWorldTransform(): mat4;
  getInvertedWorldTransform(): mat4;
  getWorldPosition(): vec3;
  setWorldPosition(p: vec3): void;
  getLocalPosition(): vec3;
  setLocalPosition(p: vec3): void;
  setWorldRotation(r: quat): void;
  setLocalRotation(r: quat): void;
  getLocalScale(): vec3;
  setLocalScale(s: vec3): void;
  getWorldScale(): vec3;
  readonly back: vec3;
  readonly forward: vec3;
  readonly right: vec3;
  readonly up: vec3;
}

declare class SceneObject {
  enabled: boolean;
  readonly isEnabledInHierarchy: boolean;
  name: string;
  getTransform(): Transform;
  setParent(parent: SceneObject): void;
  getChildrenCount(): number;
  getChild(index: number): SceneObject;
  createComponent(typeName: string): any;
  getComponent(typeName: string): any;
  destroy(): void;
}

declare class ScriptScene {
  createSceneObject(name: string): SceneObject;
}
declare namespace TextInputSystem {
  enum KeyboardType {
    Text,
  }
  enum ReturnKeyType {
    Done,
  }
  class KeyboardOptions {
    enablePreview: boolean;
    keyboardType: KeyboardType;
    returnKeyType: ReturnKeyType;
    initialText: string;
    onTextChanged: (text: string, range: vec2) => void;
    onReturnKeyPressed: () => void;
    onError: (error: number, description: string) => void;
  }
}
declare const global: {
  scene: ScriptScene;
  textInputSystem: { requestKeyboard(options: TextInputSystem.KeyboardOptions): void; dismissKeyboard(): void };
};

declare class Component {
  enabled: boolean;
  getSceneObject(): SceneObject;
  getTransform(): Transform;
}

declare class Asset {
  name: string;
}
declare function requireAsset(path: string): Asset;
declare function require(path: string): unknown;
declare class Texture extends Asset {
  control: unknown;
}
declare enum TextureFormat {
  RGBA8Unorm,
}
declare class ProceduralTextureProvider {
  static createWithFormat(width: number, height: number, format: TextureFormat): Texture;
  setPixels(x: number, y: number, width: number, height: number, data: Uint8Array): void;
}
declare class Font extends Asset {}
declare class Pass {
  baseColor: vec4;
  baseTex: Texture;
  depthTest: boolean;
  depthWrite: boolean;
}
declare class Material extends Asset {
  mainPass: Pass;
  clone(): Material;
}
declare class RenderMesh extends Asset {
  readonly aabbMin: vec3;
  readonly aabbMax: vec3;
}
declare enum MeshTopology {
  Triangles,
}
declare enum MeshIndexType {
  UInt16,
}
declare class MeshBuilder {
  constructor(layout: Array<{ name: string; components: number }>);
  topology: MeshTopology;
  indexType: MeshIndexType;
  appendVerticesInterleaved(verts: number[]): void;
  appendIndices(indices: number[]): void;
  updateMesh(): void;
  getMesh(): RenderMesh;
}
declare class RenderMeshVisual extends Component {
  mesh: RenderMesh;
  mainPass: Pass;
  mainMaterial: Material;
  setRenderOrder(value: number): void;
}
declare class Image extends Component {
  mainPass: Pass;
  mainMaterial: Material;
}
declare namespace Audio {
  enum PlaybackMode {
    LowPower,
    LowLatency,
  }
}
declare class AudioComponent extends Component {
  playbackMode: Audio.PlaybackMode;
  volume: number;
  play(loops: number): void;
  stop(fade: boolean): void;
}
declare class TextFill {
  color: vec4;
}
declare class Text extends Component {
  font: Font;
  text: string;
  size: number;
  depthTest: boolean;
  textFill: TextFill;
  horizontalAlignment: HorizontalAlignment;
  verticalAlignment: VerticalAlignment;
  horizontalOverflow: HorizontalOverflow;
  verticalOverflow: VerticalOverflow;
  layoutRect: Rect;
  setRenderOrder(value: number): void;
}

declare class SceneEvent {
  bind(callback: (eventData?: any) => void): void;
}

declare class ScriptComponent extends Component {}

declare class BaseScriptComponent extends ScriptComponent {
  static getTypeName(): string;
  createEvent(eventType: 'OnStartEvent' | 'UpdateEvent' | 'OnEnableEvent' | 'OnDisableEvent'): SceneEvent;
}

declare module 'UIKit.lspkg/Scripts/BackPlate' {
  export class BackPlate extends BaseScriptComponent {
    size: vec2;
    style: 'default' | 'dark' | 'simple';
  }
}
declare module 'UIKit.lspkg/Scripts/Components/Button/Button' {
  export class Button extends BaseScriptComponent {
    size: vec3;
    onHoverEnter: { add(callback: (event?: any) => void): void };
    onHoverExit: { add(callback: (event?: any) => void): void };
    onTriggerDown: { add(callback: (event?: any) => void): void };
    onTriggerUp: { add(callback: (event?: any) => void): void };
  }
}
declare module 'UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes' {
  export enum FlexDirection {
    Row = 'row',
    Column = 'column',
  }
  export enum FlexJustify {
    Start = 'start',
    Center = 'center',
  }
  export enum FlexAlign {
    Start = 'start',
    Center = 'center',
    Stretch = 'stretch',
  }
}
declare module 'UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem' {
  export class FlexItem extends BaseScriptComponent {
    overrideWidth: number;
    overrideHeight: number;
    flexShrink: number;
    flexGrow: number;
  }
}
declare module 'UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout' {
  import { FlexItem } from 'UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem';
  import { FlexAlign, FlexDirection, FlexJustify } from 'UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes';
  export class FlexLayout extends BaseScriptComponent {
    width: number;
    height: number;
    direction: FlexDirection;
    justifyContent: FlexJustify;
    alignItems: FlexAlign;
    rowGap: number;
    columnGap: number;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
    addItems(items: ReadonlyArray<FlexItem>): void;
  }
}
