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

/**
 * Cycle 1 (D2): a 4-step type scale. Title 1.6 cm, Heading 1.1 cm, Body 0.9 cm, Caption 0.7 cm at the
 * 110 cm reference (about 65 size units per cm of cap height, measured in the Preview). Nothing is
 * set below Caption. The older role names stay as aliases so call sites keep compiling.
 */
export type TextRole = 'Title' | 'Heading' | 'Body' | 'Caption' | 'Title1' | 'Title2' | 'HeadlineXL' | 'Headline1' | 'Headline2' | 'Subheadline' | 'Button' | 'Callout';

const TITLE = { size: 104, weight: 700 };
const HEADING = { size: 72, weight: 700 };
const BODY = { size: 60, weight: 500 };
const CAPTION = { size: 46, weight: 500 };
const TYPE_SCALE: Record<TextRole, { size: number; weight: number }> = {
  Title: TITLE,
  Heading: HEADING,
  Body: BODY,
  Caption: CAPTION,
  Title1: TITLE,
  Title2: TITLE,
  HeadlineXL: HEADING,
  Headline1: HEADING,
  Headline2: BODY,
  Subheadline: CAPTION,
  Button: BODY,
  Callout: BODY,
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
export const BOX_NEUTRAL: [vec4, vec4] = [new vec4(0.09, 0.15, 0.36, 0.92), new vec4(0.5, 0.69, 1.0, 0.6)];
/** Round 6: opaque, brighter stat tiles and tip, so wall art does not bleed through their text on the additive display. */
export const BOX_SOLID: [vec4, vec4] = [new vec4(0.09, 0.15, 0.36, 0.96), new vec4(0.5, 0.69, 1.0, 0.7)];
export const BOX_AMBER_SOLID: [vec4, vec4] = [new vec4(0.34, 0.23, 0.05, 0.96), new vec4(1.0, 0.8, 0.38, 0.95)];
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
/**
 * Cycle 1 (D1): the one shared panel material. Navy #0B1230 at 78 %, a 0.18 cm (about 1.5 px) #7FB0FF
 * stroke at 35 %, continuous rounded corners. Setup, cue card, pill, podium, Summary and the room
 * meter pill all use it. The previous blue-grey fill washed out to lavender on the additive display.
 */
export const PANEL_FILL = new vec4(0x07 / 255, 0x0d / 255, 0x22 / 255, 0.9);
export const PANEL_STROKE = new vec4(0x9c / 255, 0xc4 / 255, 1, 0.55);
export const PANEL_RADIUS_CM = 1.6;
export const PANEL_STROKE_CM = 0.24;
/**
 * Cycle 3 (F1): fixed draw order. The audience (bodies, heads, halos, phones, shadows) draws first at AUDIENCE_RENDER_ORDER, every panel
 * backdrop next at PANEL_BACKDROP_ORDER, then buttons / strokes / text on top. There is no full-screen dimmer any more: each panel is its
 * own 90 % rounded plate, so no axis-aligned lighter / darker patches sort against the room.
 */
export const AUDIENCE_RENDER_ORDER = -20;
export const PANEL_BACKDROP_ORDER = -10;
const BUTTON_STROKE_CM = 0.18;
/**
 * Cycle 4 (G5): the shared panel material's soft outer glow, a 1 cm cyan falloff at 20 % (three stepped bands: 20 / 12 / 5 %) just
 * outside the stroke, so a panel reads as light on the additive display. Drawn after the audience, before the panel fill.
 */
export const PANEL_GLOW_CM = 1;
const PANEL_GLOW_BANDS = [0.2, 0.12, 0.05];
export const PANEL_GLOW_ORDER = PANEL_BACKDROP_ORDER - 1;
const SURFACE_FILL = PANEL_FILL;
const SURFACE_BORDER = PANEL_STROKE;
/** Button faces: brighter blue-grey than the surface, with a light frame. */
const BUTTON_FACE = new vec4(0x10 / 255, 0x1a / 255, 0x3a / 255, 0.95);
const BUTTON_FACE_HOVER = new vec4(0.2, 0.32, 0.62, 1);
const BUTTON_FACE_PRESS = new vec4(0.3, 0.46, 0.82, 1);
const BUTTON_BORDER = new vec4(0x5e / 255, 0x86 / 255, 0xd6 / 255, 1);
/** Cycle 2 (E1): selected segment = deep teal face, cyan 2 px stroke, cyan glow. */
const SELECTED_FACE = new vec4(0x12 / 255, 0x32 / 255, 0x4f / 255, 0.97);
const SELECTED_HOVER = new vec4(0.1, 0.27, 0.42, 1);
const SELECTED_PRESS = new vec4(0.14, 0.38, 0.56, 1);
const SELECTED_BORDER = new vec4(0x5f / 255, 0xd4 / 255, 1, 1);
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
 * Rounded shapes are runtime meshes (a fan for the fill, a strip for the stroke ring), cached by
 * size. Corners are quarter circles with CORNER_SEGMENTS steps. Built with MeshBuilder, position + uv.
 */
const CORNER_SEGMENTS = 10;
const meshCache = new Map<string, RenderMesh>();

function outlinePoints(w: number, h: number, r: number): number[][] {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const pts: number[][] = [];
  const corners: Array<[number, number, number]> = [
    [w / 2 - rr, h / 2 - rr, 0],
    [-(w / 2 - rr), h / 2 - rr, Math.PI / 2],
    [-(w / 2 - rr), -(h / 2 - rr), Math.PI],
    [w / 2 - rr, -(h / 2 - rr), Math.PI * 1.5],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let k = 0; k <= CORNER_SEGMENTS; k++) {
      const a = a0 + (k / CORNER_SEGMENTS) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
  }
  return pts;
}

function buildMesh(verts: number[][], indices: number[]): RenderMesh {
  const mb = new MeshBuilder([
    { name: 'position', components: 3 },
    { name: 'texture0', components: 2 },
  ]);
  mb.topology = MeshTopology.Triangles;
  mb.indexType = MeshIndexType.UInt16;
  mb.appendVerticesInterleaved(verts.flatMap((v) => [v[0], v[1], 0, v[0], v[1]]));
  mb.appendIndices(indices);
  mb.updateMesh();
  return mb.getMesh();
}

function roundedFillMesh(w: number, h: number, r: number): RenderMesh {
  const key = `f|${w.toFixed(2)}|${h.toFixed(2)}|${r.toFixed(2)}`;
  const hit = meshCache.get(key);
  if (hit) return hit;
  const pts = outlinePoints(w, h, r);
  const n = pts.length;
  const idx: number[] = [];
  for (let i = 0; i < n; i++) idx.push(0, 1 + i, 1 + ((i + 1) % n));
  const mesh = buildMesh([[0, 0], ...pts], idx);
  meshCache.set(key, mesh);
  return mesh;
}

function roundedRingMesh(w: number, h: number, r: number, stroke: number): RenderMesh {
  const key = `r|${w.toFixed(2)}|${h.toFixed(2)}|${r.toFixed(2)}|${stroke.toFixed(2)}`;
  const hit = meshCache.get(key);
  if (hit) return hit;
  const outer = outlinePoints(w, h, r);
  const inner = outlinePoints(w - 2 * stroke, h - 2 * stroke, Math.max(0, r - stroke));
  const n = outer.length;
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    idx.push(i, j, n + j, i, n + j, n + i);
  }
  const mesh = buildMesh([...outer, ...inner], idx);
  meshCache.set(key, mesh);
  return mesh;
}

function meshVisual(parent: SceneObject, name: string, mesh: RenderMesh, z: number, color: vec4): RenderMeshVisual {
  const so = child(parent, name, new vec3(0, 0, z));
  const rmv = so.createComponent('Component.RenderMeshVisual') as RenderMeshVisual;
  rmv.mesh = mesh;
  const mat = SURFACE_MATERIAL.clone();
  mat.mainPass.baseColor = color;
  rmv.mainMaterial = mat;
  return rmv;
}

/**
 * A rounded surface: fill plus, when `frame` is given, a stroke ring on top (hierarchy: Fill, then
 * Frame). `radius` is clamped to half the short side; `h / 2` makes a capsule. Returns the fill.
 */
export function addRoundedSurface(parent: SceneObject, w: number, h: number, z: number, fill: vec4, frame: vec4 | null, radius: number = PANEL_RADIUS_CM, stroke: number = PANEL_STROKE_CM): RenderMeshVisual {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  const f = meshVisual(parent, 'Fill', roundedFillMesh(w, h, r), z, fill);
  if (frame) meshVisual(parent, 'Frame', roundedRingMesh(w, h, r, stroke), z + 0.02, frame);
  return f;
}

/** Cycle 4 (G5): the panel glow (concentric rounded bands around a w x h panel); `order` is the render order of every band. Returns the root. */
export function addPanelGlow(parent: SceneObject, w: number, h: number, radius: number, z: number, order: number = PANEL_GLOW_ORDER): SceneObject {
  const root = child(parent, 'Glow', new vec3(0, 0, z));
  const band = PANEL_GLOW_CM / PANEL_GLOW_BANDS.length;
  PANEL_GLOW_BANDS.forEach((a, k) => {
    const grow = PANEL_GLOW_CM - k * band; // outer edge, in cm beyond the panel edge
    const v = meshVisual(root, `Band${k}`, roundedRingMesh(w + 2 * grow, h + 2 * grow, radius + grow, band), 0, new vec4(0x5f / 255, 0xd4 / 255, 1, a));
    v.setRenderOrder(order);
  });
  return root;
}

/** A ring (circle outline) of outer radius `radius` cm and `thickness` cm, centred on `parent`. */
export function addCircleRing(parent: SceneObject, name: string, radius: number, thickness: number, z: number, color: vec4): RenderMeshVisual {
  return meshVisual(child(parent, name), 'Ring', roundedRingMesh(radius * 2, radius * 2, radius, thickness), z, color);
}

/** A filled circle of radius `radius` cm. */
export function addDot(parent: SceneObject, name: string, radius: number, local: vec3, color: vec4): RenderMeshVisual {
  const v = meshVisual(parent, name, roundedFillMesh(radius * 2, radius * 2, radius), 0, color);
  v.getSceneObject().getTransform().setLocalPosition(local);
  return v;
}

/**
 * Visible surface. Without `radius` (0): a light frame quad with a slightly smaller fill quad in
 * front (flat bars, tiles). With `radius` > 0: a rounded surface (panels, buttons, boxes, pills).
 * Returns the fill so callers can recolor it (button hover / press).
 */
export function addSurface(parent: SceneObject, w: number, h: number, z: number, fill: vec4, frame: vec4 | null, radius = 0): RenderMeshVisual {
  if (radius > 0) return addRoundedSurface(parent, w, h, z, fill, frame, radius);
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
const OUTLINE_FACE = new vec4(0x10 / 255, 0x1a / 255, 0x3a / 255, 0.92);
const OUTLINE_FACE_HOVER = new vec4(0.14, 0.22, 0.46, 1);
const OUTLINE_FACE_PRESS = new vec4(0.24, 0.36, 0.7, 1);
const OUTLINE_BORDER = new vec4(0x5e / 255, 0x86 / 255, 0xd6 / 255, 1);
const FACES: Record<'normal' | 'primary' | 'amber' | 'mint' | 'outline', FaceSet> = {
  outline: [OUTLINE_FACE, OUTLINE_FACE_HOVER, OUTLINE_FACE_PRESS, OUTLINE_BORDER],
  normal: [BUTTON_FACE, BUTTON_FACE_HOVER, BUTTON_FACE_PRESS, BUTTON_BORDER],
  primary: [PRIMARY_FACE, PRIMARY_FACE_HOVER, PRIMARY_FACE_PRESS, PRIMARY_BORDER],
  amber: [AMBER_FACE, AMBER_FACE_HOVER, AMBER_FACE_PRESS, AMBER_BORDER],
  mint: [MINT_FACE, MINT_FACE_HOVER, MINT_FACE_PRESS, MINT_BORDER],
};

const BUTTON_RADIUS_CM = 1.1;
/** Selected segments get a soft cyan glow ring around the face (D1: "optional cyan glow on the active element"). */
const GLOW_COLOR = new vec4(0.37, 0.83, 1.0, 0.4);

/** Themes a button's face; returns `setSelected` (cyan face + frame + glow, artifact S1 segments). */
function themeButton(button: Button, so: SceneObject, w: number, h: number, kind: keyof typeof FACES): (selected: boolean) => void {
  let [face, hover, press] = FACES[kind];
  const border = FACES[kind][3];
  const radius = Math.min(BUTTON_RADIUS_CM, h / 2);
  const surfaceRoot = child(so, 'Surface', new vec3(0, 0, 0.02));
  const surface = addRoundedSurface(surfaceRoot, w, h, 0, face, border, radius, BUTTON_STROKE_CM);
  const frame = surfaceRoot.getChild(1).getComponent('Component.RenderMeshVisual') as RenderMeshVisual;
  const glow = meshVisual(surfaceRoot, 'Glow', roundedRingMesh(w + 0.9, h + 0.9, radius + 0.45, 0.45), -0.02, GLOW_COLOR);
  glow.getSceneObject().enabled = false;
  const set = (c: vec4) => (surface.mainPass.baseColor = c);
  button.onHoverEnter.add(() => set(hover));
  button.onHoverExit.add(() => set(face));
  button.onTriggerDown.add(() => set(press));
  button.onTriggerUp.add(() => set(hover));
  return (selected: boolean) => {
    if (selected) [face, hover, press] = [SELECTED_FACE, SELECTED_HOVER, SELECTED_PRESS];
    else [face, hover, press] = FACES[kind];
    set(face);
    frame.mainPass.baseColor = selected ? SELECTED_BORDER : border;
    glow.getSceneObject().enabled = selected;
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
  addPanelGlow(root, widthCm, heightCm, PANEL_RADIUS_CM, 0);
  const backdrop = addRoundedSurface(root, widthCm, heightCm, 0, SURFACE_FILL, SURFACE_BORDER, PANEL_RADIUS_CM); // drawn before Content
  backdrop.setRenderOrder(PANEL_BACKDROP_ORDER);
  (root.getChild(root.getChildrenCount() - 1).getComponent('Component.RenderMeshVisual') as RenderMeshVisual | null)?.setRenderOrder(PANEL_BACKDROP_ORDER + 1); // its stroke ring

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
  addRoundedSurface(so, widthCm, heightCm, 0, tone[0], tone[1], Math.min(BUTTON_RADIUS_CM, heightCm / 2));
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
    // With a subline the group is as wide as the longer of the two lines (the subline is Caption, about 0.66 of the label size).
    const textW = Math.min(widthCm - iconSize - 1.2, Math.max(label.length * glyph, opts.subline ? opts.subline.length * glyph * 0.66 : 0));
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
    sub.size = roleSize('Caption', distanceCm);
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
