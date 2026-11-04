/**
 * EyesUpUI.ts — shared UIKit composition helpers for the Eyes Up panels (Setup, Podium, Summary).
 *
 * Follows the CLAD `specs-build-ui` conventions: Canvas at the panel root, a UIKit BackPlate as the
 * surface, a `Content` child lifted +0.6 cm in Z holding a FlexLayout column, FlexItems auto-discovered
 * on start, UIKit `Button`s with a raw Text label lifted +0.08 cm, and text sized through one
 * type-scale table (`applyTextRole`) scaled by the panel's viewing distance.
 *
 * Specs is additive (black = transparent). Pass 2 theme: translucent blue-grey surfaces with a light
 * hairline frame, brighter blue-grey button faces with a visible border (hover / press tint), light
 * text in Inter, and Material icons on the key buttons. See the note above `quad()` for why the
 * surfaces are quads.
 */
import { BackPlate } from 'UIKit.lspkg/Scripts/BackPlate';
import { Button } from 'UIKit.lspkg/Scripts/Components/Button/Button';
import { FlexItem } from 'UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem';
import { FlexLayout } from 'UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout';
import { FlexAlign, FlexDirection, FlexJustify } from 'UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes';

export type TextRole = 'Title1' | 'Title2' | 'HeadlineXL' | 'Headline1' | 'Headline2' | 'Subheadline' | 'Button' | 'Callout' | 'Body' | 'Caption';

/** specs-build-ui type scale, calibrated for 110 cm. Caption (38) is the readable floor. */
const TYPE_SCALE: Record<TextRole, { size: number; weight: number }> = {
  Title1: { size: 105, weight: 700 },
  Title2: { size: 93, weight: 700 },
  HeadlineXL: { size: 62, weight: 700 },
  Headline1: { size: 54, weight: 700 },
  Headline2: { size: 48, weight: 700 },
  Subheadline: { size: 41, weight: 700 },
  Button: { size: 39, weight: 500 },
  Callout: { size: 39, weight: 700 },
  Body: { size: 39, weight: 500 },
  Caption: { size: 38, weight: 500 },
};

/** Light text colors (never black on an additive display). */
export const TEXT_PRIMARY = new vec4(1, 1, 1, 1);
export const TEXT_SECONDARY = new vec4(1, 1, 1, 0.7);
/** Round 3 (artifact S1): row labels and captions on the panel need near-white contrast. */
export const TEXT_LABEL = new vec4(1, 1, 1, 0.95);
export const TEXT_ACCENT = new vec4(0.55, 0.85, 1.0, 1);
export const TEXT_AMBER = new vec4(1.0, 0.75, 0.3, 1);
/** Pass 4 (artifact S5): mint for the Balance badge. */
export const TEXT_MINT = new vec4(0.55, 1.0, 0.8, 1);
/** Pass 4: box tones (fill, frame) for badges, pills, stat boxes and the tip line. */
export const BOX_NEUTRAL: [vec4, vec4] = [new vec4(0.22, 0.29, 0.4, 0.95), new vec4(0.6, 0.78, 0.95, 0.55)];
/** Round 6: opaque, brighter stat tiles and tip, so wall art does not bleed through their text on the additive display. */
export const BOX_SOLID: [vec4, vec4] = [new vec4(0.34, 0.44, 0.58, 1), new vec4(0.75, 0.88, 1.0, 0.9)];
export const BOX_AMBER_SOLID: [vec4, vec4] = [new vec4(0.55, 0.42, 0.14, 1), new vec4(1.0, 0.82, 0.4, 1)];
/** Tip text on BOX_AMBER_SOLID: pale warm white. */
export const TEXT_TIP = new vec4(1.0, 0.95, 0.8, 1);
export const BOX_MINT: [vec4, vec4] = [new vec4(0.12, 0.36, 0.3, 0.95), new vec4(0.5, 1.0, 0.8, 0.9)];
export const BOX_AMBER: [vec4, vec4] = [new vec4(0.34, 0.26, 0.1, 0.95), new vec4(1.0, 0.78, 0.35, 0.85)];
/** Cyan accent for countdown lines and bars. */
export const ACCENT_CYAN = new vec4(0.45, 0.85, 1.0, 0.95);

const CONTENT_Z = 0.6;
const BUTTON_LABEL_Z = 0.08;

/** Theme font (FontSelector → Assets/Fonts/Inter.ttf). */
const THEME_FONT = requireAsset('../Fonts/Inter.ttf') as Font;
/** ImageMaterialPreset (premultiplied alpha, depthTest on / depthWrite off) for icon Images. */
const IMAGE_MATERIAL = requireAsset('../Materials/ImageMaterial.mat') as Material;

/** Material Symbols imported with IconSelector (defaults: Rounded, 600, white, 512 px). */
export type IconName =
  | 'play_arrow'
  | 'chevron_left'
  | 'chevron_right'
  | 'flag'
  | 'replay'
  | 'check'
  | 'check_circle'
  | 'double_arrow_left'
  | 'double_arrow_right';
const ICONS: Record<IconName, Texture> = {
  // Pass 5: pre-tinted imports (mint check circle for S5, amber double chevrons for S3).
  check_circle: requireAsset('../Icons/check_circle_hex8cffcc.png') as Texture,
  double_arrow_left: requireAsset('../Icons/keyboard_double_arrow_left_hexffb833.png') as Texture,
  double_arrow_right: requireAsset('../Icons/keyboard_double_arrow_right_hexffb833.png') as Texture,
  play_arrow: requireAsset('../Icons/play_arrow.png') as Texture,
  chevron_left: requireAsset('../Icons/chevron_left.png') as Texture,
  chevron_right: requireAsset('../Icons/chevron_right.png') as Texture,
  flag: requireAsset('../Icons/flag.png') as Texture,
  replay: requireAsset('../Icons/replay.png') as Texture,
  check: requireAsset('../Icons/check.png') as Texture,
};

// ---- theme (design pass 2: never black; the additive display shows roughly color × alpha) ----
/**
 * Panel surface: blue-grey with a light hairline frame. Pass 3 (demo legibility): alpha 0.80 → 0.95
 * and a slightly deeper tone, so the room behind reads less through the panel while white text
 * keeps its contrast. On the additive display nothing is fully opaque.
 */
const SURFACE_FILL = new vec4(0.14, 0.2, 0.31, 1);
const SURFACE_BORDER = new vec4(0.6, 0.78, 0.95, 0.7);
/** Button faces: brighter blue-grey than the surface, with a light frame. */
const BUTTON_FACE = new vec4(0.3, 0.42, 0.58, 0.95);
const BUTTON_FACE_HOVER = new vec4(0.4, 0.56, 0.76, 1);
const BUTTON_FACE_PRESS = new vec4(0.5, 0.68, 0.9, 1);
const BUTTON_BORDER = new vec4(0.78, 0.9, 1, 0.9);
/** Primary action (Start / Finish / Again): cyan-teal face. */
const PRIMARY_FACE = new vec4(0.18, 0.5, 0.62, 0.95);
const PRIMARY_FACE_HOVER = new vec4(0.25, 0.64, 0.78, 1);
const PRIMARY_FACE_PRESS = new vec4(0.34, 0.76, 0.9, 1);
const PRIMARY_BORDER = new vec4(0.7, 0.95, 1, 1);
/** Pass 4 (artifact S4): Finish is amber-framed, distinct from the cyan Next. */
const AMBER_FACE = new vec4(0.42, 0.31, 0.12, 0.95);
const AMBER_FACE_HOVER = new vec4(0.56, 0.42, 0.16, 1);
const AMBER_FACE_PRESS = new vec4(0.7, 0.53, 0.2, 1);
const AMBER_BORDER = new vec4(1, 0.8, 0.4, 1);

/*
 * Why quads and not UIKit's own visuals: in this project (Lens Studio 5.24.1 + UIKit 4.0, which
 * targets 5.25) UIKit's RoundedRectangle (`CollapsedSquircle` mesh/shader) never draws. A BackPlate
 * forced to solid red still shows nothing in the Preview, with no log errors, while scene meshes
 * and UIKit-hosted Images draw fine (pass-2 probe). That is pass-1 gap G2. So BackPlate and
 * Button keep doing layout, colliders and interaction, and the visible surface and frame are plain
 * unlit quads (Materials/PanelSurface.mat, Normal blend, depthWrite off) drawn in hierarchy order
 * under the Canvas. This is a recorded deviation from CLAD's "no hand-rolled backplate" rule
 * (build-notes, pass 2, D10). Remove it once UIKit draws on this Lens Studio version.
 */
const SURFACE_MATERIAL = requireAsset('../Materials/PanelSurface.mat') as Material;
const QUAD_MESH = requireAsset('../Materials/PanelQuad.mesh') as RenderMesh;
const FRAME_CM = 0.15;

/** An unlit colored rectangle `w × h` cm, centered on `parent`'s origin, at local z `z`. */
function quad(parent: SceneObject, name: string, w: number, h: number, z: number, color: vec4): RenderMeshVisual {
  const so = child(parent, name, new vec3(0, 0, z));
  const rmv = so.createComponent('Component.RenderMeshVisual') as RenderMeshVisual;
  rmv.mesh = QUAD_MESH;
  const mat = SURFACE_MATERIAL.clone();
  mat.mainPass.baseColor = color;
  rmv.mainMaterial = mat;
  // The plane preset's size and orientation are read from its AABB rather than assumed.
  const ext = QUAD_MESH.aabbMax.sub(QUAD_MESH.aabbMin);
  const t = so.getTransform();
  if (ext.z > ext.y) {
    // XZ plane (faces +Y): stand it up so it faces +Z like the UI.
    t.setLocalRotation(quat.angleAxis(Math.PI / 2, new vec3(1, 0, 0)));
    t.setLocalScale(new vec3(w / Math.max(ext.x, 1e-4), 1, h / Math.max(ext.z, 1e-4)));
  } else {
    t.setLocalScale(new vec3(w / Math.max(ext.x, 1e-4), h / Math.max(ext.y, 1e-4), 1));
  }
  return rmv;
}

/**
 * Visible surface: a light frame quad with a slightly smaller fill quad in front. Returns the
 * fill so callers can recolor it (button hover / press).
 */
export function addSurface(parent: SceneObject, w: number, h: number, z: number, fill: vec4, frame: vec4 | null): RenderMeshVisual {
  if (frame) quad(parent, 'Frame', w, h, z, frame);
  return quad(parent, 'Fill', frame ? w - 2 * FRAME_CM : w, frame ? h - 2 * FRAME_CM : h, z + 0.02, fill);
}

/** Pass 6 (artifact S1): mint Start button (mint text, mint frame) and the cyan "selected" segment. */
const MINT_FACE = new vec4(0.12, 0.36, 0.3, 0.95);
const MINT_FACE_HOVER = new vec4(0.17, 0.5, 0.41, 1);
const MINT_FACE_PRESS = new vec4(0.24, 0.64, 0.52, 1);
const MINT_BORDER = new vec4(0.5, 1.0, 0.8, 0.95);

type FaceSet = [vec4, vec4, vec4, vec4];
/** Cycle 5 (R1): secondary buttons are outlines (dark face, light frame) so the one filled cyan button is the obvious next step. */
const OUTLINE_FACE = new vec4(0.1, 0.15, 0.25, 1);
const OUTLINE_FACE_HOVER = new vec4(0.2, 0.3, 0.45, 1);
const OUTLINE_FACE_PRESS = new vec4(0.3, 0.44, 0.62, 1);
const OUTLINE_BORDER = new vec4(0.78, 0.9, 1, 1);
const FACES: Record<'normal' | 'primary' | 'amber' | 'mint' | 'outline', FaceSet> = {
  outline: [OUTLINE_FACE, OUTLINE_FACE_HOVER, OUTLINE_FACE_PRESS, OUTLINE_BORDER],
  normal: [BUTTON_FACE, BUTTON_FACE_HOVER, BUTTON_FACE_PRESS, BUTTON_BORDER],
  primary: [PRIMARY_FACE, PRIMARY_FACE_HOVER, PRIMARY_FACE_PRESS, PRIMARY_BORDER],
  amber: [AMBER_FACE, AMBER_FACE_HOVER, AMBER_FACE_PRESS, AMBER_BORDER],
  mint: [MINT_FACE, MINT_FACE_HOVER, MINT_FACE_PRESS, MINT_BORDER],
};

/** Themes a button's face; returns `setSelected` (cyan face + frame, artifact S1 segments). */
function themeButton(button: Button, so: SceneObject, w: number, h: number, kind: keyof typeof FACES): (selected: boolean) => void {
  let [face, hover, press] = FACES[kind];
  const border = FACES[kind][3];
  const surface = addSurface(so, w, h, 0.02, face, border);
  // addSurface adds the 'Frame' quad first, then the 'Fill' quad.
  const frame = so.getChild(0).getComponent('Component.RenderMeshVisual') as RenderMeshVisual;
  const set = (c: vec4) => (surface.mainPass.baseColor = c);
  button.onHoverEnter.add(() => set(hover));
  button.onHoverExit.add(() => set(face));
  button.onTriggerDown.add(() => set(press));
  button.onTriggerUp.add(() => set(hover));
  return (selected: boolean) => {
    [face, hover, press] = FACES[selected ? 'primary' : kind];
    set(face);
    frame.mainPass.baseColor = selected ? PRIMARY_BORDER : border;
  };
}

export function addIcon(parent: SceneObject, icon: IconName, sizeCm: number, local: vec3): Image {
  const so = child(parent, 'Icon', local);
  so.getTransform().setLocalScale(new vec3(sizeCm, sizeCm, 1));
  const img = so.createComponent('Component.Image') as Image;
  const mat = IMAGE_MATERIAL.clone();
  mat.mainPass.baseTex = ICONS[icon];
  mat.mainPass.depthTest = true;
  mat.mainPass.depthWrite = false;
  img.mainMaterial = mat;
  return img;
}

export function roleSize(role: TextRole, distanceCm = 110): number {
  return TYPE_SCALE[role].size * (distanceCm / 110);
}

export function applyTextRole(t: Text, role: TextRole, distanceCm = 110): void {
  t.size = roleSize(role, distanceCm);
  (t as Text & { weight?: number }).weight = TYPE_SCALE[role].weight;
}

export function child(parent: SceneObject, name: string, local?: vec3): SceneObject {
  const so = global.scene.createSceneObject(name);
  so.setParent(parent);
  if (local) so.getTransform().setLocalPosition(local);
  return so;
}

export interface Panel {
  /** Enable/disable this to show or hide the panel (the script host itself stays enabled). */
  root: SceneObject;
  /** FlexLayout column host; add rows with `textRow` / `buttonRow`. */
  content: SceneObject;
  backPlate: BackPlate;
}

/**
 * Canvas + dark BackPlate (fixed `widthCm × heightCm`) + a centered FlexLayout column.
 * The panel lives under a `Panel` child so the host script keeps running while it is hidden.
 */
export function makePanel(host: SceneObject, widthCm: number, heightCm: number, padCm: number, gapCm: number): Panel {
  const root = child(host, 'Panel');
  root.createComponent('Component.Canvas');
  const backPlate = root.createComponent(BackPlate.getTypeName()) as BackPlate;
  backPlate.style = 'dark';
  backPlate.size = new vec2(widthCm, heightCm);
  addSurface(root, widthCm, heightCm, 0, SURFACE_FILL, SURFACE_BORDER); // drawn before Content

  const content = child(root, 'Content', new vec3(0, 0, CONTENT_Z));
  const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout;
  flex.width = widthCm;
  flex.height = heightCm;
  flex.direction = FlexDirection.Column;
  flex.justifyContent = FlexJustify.Center;
  flex.alignItems = FlexAlign.Center;
  flex.rowGap = gapCm;
  flex.paddingTop = padCm;
  flex.paddingBottom = padCm;
  flex.paddingLeft = padCm;
  flex.paddingRight = padCm;
  return { root, content, backPlate };
}

// FlexItems are NOT passed to `addItems`: children are built in onAwake, before the parent
// FlexLayout initializes, so its default `autoDiscoverItemsOnStart` picks them up. Calling
// `addItems` before init throws in UIKit 4.0 ("Cannot add items while autoDiscoverItemsOnStart is
// enabled and the layout is not initialized") — checked in Lens Studio 5.24.1.

function makeText(so: SceneObject, value: string, role: TextRole, widthCm: number, heightCm: number, distanceCm: number, color: vec4): Text {
  const t = so.createComponent('Component.Text') as Text;
  t.text = value;
  t.font = THEME_FONT;
  t.depthTest = true;
  applyTextRole(t, role, distanceCm);
  t.textFill.color = color;
  t.horizontalAlignment = HorizontalAlignment.Center;
  t.verticalAlignment = VerticalAlignment.Center;
  t.horizontalOverflow = HorizontalOverflow.Overflow;
  t.verticalOverflow = VerticalOverflow.Overflow;
  t.layoutRect = Rect.create(-widthCm / 2, widthCm / 2, -heightCm / 2, heightCm / 2);
  return t;
}

/** Pass 5: a free-positioned text (not a FlexItem) at `local`, for overlays such as timeline labels. */
export function addText(
  parent: SceneObject,
  name: string,
  value: string,
  role: TextRole,
  widthCm: number,
  heightCm: number,
  distanceCm: number,
  color: vec4,
  local: vec3,
): Text {
  return makeText(child(parent, name, local), value, role, widthCm, heightCm, distanceCm, color);
}

/** Pass 5: a free-positioned icon cell inside a flex row (FlexItem `cellW × cellH`, icon centered). */
export function addIconCell(parent: SceneObject, name: string, icon: IconName, sizeCm: number, cellW: number, cellH: number): Image {
  const so = child(parent, name);
  const img = addIcon(so, icon, sizeCm, new vec3(0, 0, BUTTON_LABEL_Z));
  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem;
  item.overrideWidth = cellW;
  item.overrideHeight = cellH;
  item.flexShrink = 0;
  return img;
}

/** Pass 5: an empty FlexItem block `w × h` to draw into by hand (e.g. the Summary gaze timeline). */
export function addBlock(parent: SceneObject, name: string, w: number, h: number): SceneObject {
  const so = child(parent, name);
  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem;
  item.overrideWidth = w;
  item.overrideHeight = h;
  item.flexShrink = 0;
  return so;
}

/** One text row in a FlexLayout column (or one cell in a row). */
export function textRow(
  parent: SceneObject,
  name: string,
  value: string,
  role: TextRole,
  widthCm: number,
  heightCm: number,
  distanceCm = 110,
  color: vec4 = TEXT_PRIMARY,
): Text {
  const so = child(parent, name);
  const t = makeText(so, value, role, widthCm, heightCm, distanceCm, color);
  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem;
  item.overrideWidth = widthCm;
  item.overrideHeight = heightCm;
  item.flexShrink = 0;
  return t;
}

/** A horizontal FlexLayout row inside a column. */
export function flexRow(parent: SceneObject, name: string, widthCm: number, heightCm: number, gapCm: number): SceneObject {
  const so = child(parent, name);
  const flex = so.createComponent(FlexLayout.getTypeName()) as FlexLayout;
  flex.width = widthCm;
  flex.height = heightCm;
  flex.direction = FlexDirection.Row;
  flex.justifyContent = FlexJustify.Center;
  flex.alignItems = FlexAlign.Center;
  flex.columnGap = gapCm;
  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem;
  item.overrideWidth = widthCm;
  item.overrideHeight = heightCm;
  item.flexShrink = 0;
  return so;
}

export interface ButtonOptions {
  /** Leading Material icon (IconSelector import). */
  icon?: IconName;
  /** Primary action styling (cyan-teal face). */
  primary?: boolean;
  /** Type-scale role of the label (default 'Button'). Pass 3 uses larger roles for demo legibility. */
  labelRole?: TextRole;
  /** Amber-framed face (Finish, artifact S4). Ignored when `primary` is set. */
  amber?: boolean;
  /** Mint face and mint label (Start rehearsal, artifact S1). Ignored when `primary` is set. */
  mint?: boolean;
  /** Outline styling (dark face, light frame) for secondary buttons. Ignored when `primary` is set. */
  outline?: boolean;
  /** A second, smaller line under the label (for example 'beat your grade'). */
  subline?: string;
}

/**
 * Pass 4: a framed box in a flex row/column with centered text (badges, the SETUP pill, stat boxes,
 * the tip line). `value` may hold '\n' for two lines.
 */
export function addBox(
  parent: SceneObject,
  name: string,
  value: string,
  role: TextRole,
  widthCm: number,
  heightCm: number,
  distanceCm: number,
  color: vec4,
  tone: [vec4, vec4] = BOX_NEUTRAL,
): Text {
  const so = child(parent, name);
  addSurface(so, widthCm, heightCm, 0, tone[0], tone[1]);
  const labelSo = child(so, 'Label', new vec3(0, 0, BUTTON_LABEL_Z));
  const t = makeText(labelSo, value, role, widthCm - 0.6, heightCm, distanceCm, color);
  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem;
  item.overrideWidth = widthCm;
  item.overrideHeight = heightCm;
  item.flexShrink = 0;
  return t;
}

/**
 * UIKit Button with a raw Text label and an optional leading icon. The SceneObject is named `name`
 * so LEAF can find its Interactable with `findInteractablesByName(name)`. Size is set before the
 * Button initializes. Icon + label are centered as a group on the face, both lifted +0.08 cm.
 */
export function addButton(
  parent: SceneObject,
  name: string,
  label: string,
  widthCm: number,
  heightCm: number,
  distanceCm: number,
  onClick: () => void,
  opts: ButtonOptions = {},
): { button: Button; label: Text; setSelected: (selected: boolean) => void } {
  const so = child(parent, name);
  const button = so.createComponent(Button.getTypeName()) as Button;
  button.size = new vec3(widthCm, heightCm, 1);
  const setSelected = themeButton(button, so, widthCm, heightCm, opts.primary ? 'primary' : opts.mint ? 'mint' : opts.amber ? 'amber' : opts.outline ? 'outline' : 'normal');
  const role = opts.labelRole ?? 'Button';
  let labelX = 0;
  let labelW = widthCm - 0.5;
  if (opts.icon) {
    const iconSize = Math.min(heightCm * 0.6, 2.4);
    const gap = 0.3;
    // Estimated label width (Inter at size 39 ≈ 0.42 cm per glyph at 110 cm) so the
    // icon + label group is centered on the face.
    const glyph = (roleSize(role, distanceCm) / 39) * 0.42;
    const textW = Math.min(widthCm - iconSize - 1.2, label.length * glyph);
    const groupW = iconSize + gap + textW;
    addIcon(so, opts.icon, iconSize, new vec3(-groupW / 2 + iconSize / 2, 0, BUTTON_LABEL_Z));
    labelX = -groupW / 2 + iconSize + gap + textW / 2;
    labelW = textW + 0.4;
  }
  // With a subline the label moves up and the subline (about 60 % of the label size) sits under it.
  const labelSo = child(so, 'Label', new vec3(labelX, opts.subline ? heightCm * 0.17 : 0, BUTTON_LABEL_Z));
  const text = makeText(labelSo, label, role, labelW, opts.subline ? heightCm * 0.6 : heightCm, distanceCm, opts.mint && !opts.primary ? TEXT_MINT : TEXT_PRIMARY);
  if (opts.subline) {
    const sub = makeText(child(so, 'Subline', new vec3(labelX, -heightCm * 0.27, BUTTON_LABEL_Z)), opts.subline, role, labelW, heightCm * 0.3, distanceCm, TEXT_LABEL);
    sub.size = roleSize(role, distanceCm) * 0.62;
  }
  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem;
  item.overrideWidth = widthCm;
  item.overrideHeight = heightCm;
  item.flexShrink = 0;
  button.onTriggerUp.add(() => onClick());
  return { button, label: text, setSelected };
}

/** Rotate `so` so its front (+Z, the UI face) points at `target` (optionally yaw-only). */
export function faceTowards(so: SceneObject, target: vec3, yawOnly: boolean): void {
  const t = so.getTransform();
  const p = t.getWorldPosition();
  let dir = target.sub(p);
  if (yawOnly) dir = new vec3(dir.x, 0, dir.z);
  if (dir.length < 1e-4) return;
  t.setWorldRotation(quat.lookAt(dir.normalize(), vec3.up()));
}
