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
/** Label of an amber outline button (Finish): luminous amber, readable as text. */
export const TEXT_AMBER_LABEL = new vec4(1.0, 0.86, 0.5, 1);
/** Pass 4 (artifact S5): mint for the Balance badge. */
export const TEXT_MINT = new vec4(0.55, 1.0, 0.8, 1);
/**
 * Redesign (glass-native "luminous line" UI). Specs and the Lens Studio Preview are ADDITIVE: a dark fill cannot render darker than the
 * room, it only reads as a faint grey plate. So panels, boxes and buttons carry at most a very faint cool tint (alpha 0.05 to 0.12) and are
 * drawn as bright rounded outline strokes with a soft outer glow, one saturated accent per element (cyan, mint, amber, coral).
 */
export const LINE_CYAN = new vec4(0.58, 0.92, 1.0, 1);
export const LINE_MINT = new vec4(0.5, 1.0, 0.8, 1);
export const LINE_AMBER = new vec4(1.0, 0.8, 0.36, 1);
export const LINE_CORAL = new vec4(1.0, 0.5, 0.45, 1);
const faint = (c: vec4, a: number) => new vec4(c.x, c.y, c.z, a);
export const BOX_NEUTRAL: [vec4, vec4] = [new vec4(0.2, 0.75, 1.0, 0.14), new vec4(0.58, 0.92, 1.0, 0.9)];
/** Stat tiles and tip: same faint tint, accent stroke. */
export const BOX_SOLID: [vec4, vec4] = [new vec4(0.2, 0.75, 1.0, 0.14), new vec4(0.58, 0.92, 1.0, 0.95)];
export const BOX_AMBER_SOLID: [vec4, vec4] = [faint(LINE_AMBER, 0.1), LINE_AMBER];
/** Tip text on BOX_AMBER_SOLID: pale warm white. */
export const TEXT_TIP = new vec4(1.0, 0.95, 0.8, 1);
export const BOX_MINT: [vec4, vec4] = [faint(LINE_MINT, 0.1), LINE_MINT];
export const BOX_AMBER: [vec4, vec4] = [faint(LINE_AMBER, 0.1), LINE_AMBER];
/** Cyan accent for countdown lines and bars. */
export const ACCENT_CYAN = new vec4(0.45, 0.88, 1.0, 1);

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
export const PANEL_FILL = new vec4(0.2, 0.75, 1.0, 0.1);
/** Round 4: a panel with no fill at all (the podium): one stroke and a glow, nothing else. */
export const NO_FILL = new vec4(0.2, 0.75, 1.0, 0);
export const PANEL_STROKE = new vec4(0.62, 0.93, 1.0, 1);
export const PANEL_RADIUS_CM = 1.6;
/** One stroke width for every panel, box and button at the 110 cm reference (stage elements scale it by their distance). */
export const PANEL_STROKE_CM = 0.22;
/**
 * Cycle 3 (F1): fixed draw order. The audience (bodies, heads, halos, phones, shadows) draws first at AUDIENCE_RENDER_ORDER, every panel
 * backdrop next at PANEL_BACKDROP_ORDER, then buttons / strokes / text on top. There is no full-screen dimmer.
 */
export const AUDIENCE_RENDER_ORDER = -60;
export const PANEL_BACKDROP_ORDER = -10;
const BUTTON_STROKE_CM = PANEL_STROKE_CM;
/** The same stroke at the stage distance (cue card, pill, room meter, tags: about 2.3x the 110 cm reference). */
export const STAGE_STROKE_CM = 0.5;
export const STAGE_GLOW_CM = 2.6;
/**
 * Soft outer glow of the shared panel material: five stepped cyan bands over 1.4 cm just outside the stroke (34 / 24 / 15 / 8 / 3.5 %), so a
 * panel reads as light. Drawn after the audience, before the panel fill.
 */
export const PANEL_GLOW_CM = 1.2;
/** Round 3: outermost band first, so the glow is faintest at its outer edge and brightest next to the stroke (it used to be the other way round and read as a second outline). */
/** Round 4: ten bands on a smooth quadratic ramp that peaks at 0.1 next to the stroke (the old 0.2 inner band read as a second outline). */
const PANEL_GLOW_BANDS = Array.from({ length: 10 }, (_, k) => 0.1 * Math.pow((k + 1) / 10, 2.2));
export const PANEL_GLOW_ORDER = PANEL_BACKDROP_ORDER - 1;
const SURFACE_FILL = PANEL_FILL;
const SURFACE_BORDER = PANEL_STROKE;
/** Button faces: the same faint tint, a mid-cyan stroke; hover and press raise the tint. */
const BUTTON_FACE = new vec4(0.2, 0.75, 1.0, 0.12);
const BUTTON_FACE_HOVER = new vec4(0.45, 0.78, 1.0, 0.16);
const BUTTON_FACE_PRESS = new vec4(0.5, 0.85, 1.0, 0.3);
const BUTTON_BORDER = new vec4(0.5, 0.82, 1.0, 0.95);
/** Selected segment = cyan tint, bright cyan-white stroke, cyan glow. */
const SELECTED_FACE = new vec4(0.3, 0.85, 1.0, 0.24);
const SELECTED_HOVER = new vec4(0.3, 0.85, 1.0, 0.2);
const SELECTED_PRESS = new vec4(0.4, 0.9, 1.0, 0.34);
const SELECTED_BORDER = new vec4(0.78, 1, 1, 1);
/** Primary action (Next / Again): cyan tint and bright stroke. */
const PRIMARY_FACE = new vec4(0.3, 0.85, 1.0, 0.08);
const PRIMARY_FACE_HOVER = new vec4(0.3, 0.85, 1.0, 0.2);
const PRIMARY_FACE_PRESS = new vec4(0.4, 0.9, 1.0, 0.34);
const PRIMARY_BORDER = new vec4(0.82, 1, 1, 1);
/** Finish is amber. */
const AMBER_FACE = new vec4(1, 0.72, 0.22, 0.07);
const AMBER_FACE_HOVER = new vec4(1, 0.72, 0.22, 0.2);
const AMBER_FACE_PRESS = new vec4(1, 0.78, 0.3, 0.34);
const AMBER_BORDER = new vec4(1, 0.82, 0.4, 1);

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
  OWN_VISUALS.add(rmv);
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

/**
 * Every mesh this UI draws itself. UIKit's own visuals (the BackPlate rectangle and each Button's rounded rectangle, dark grey) also draw on
 * the panel in 5.24.1 and read as grey plates on an additive display, so `muteUiKitVisuals` switches off every other mesh under a panel.
 */
const OWN_VISUALS = new Set<RenderMeshVisual>();
function sweepMute(so: SceneObject): void {
  const list = so.getComponents('Component.RenderMeshVisual') as RenderMeshVisual[];
  for (const v of list) if (v.enabled && !OWN_VISUALS.has(v)) v.enabled = false;
  for (let i = 0; i < so.getChildrenCount(); i++) sweepMute(so.getChild(i));
}
export function muteUiKitVisuals(root: SceneObject): void {
  // Round 4: one sweeper per call, bound to Update AND LateUpdate. UIKit re-enables its visuals from OnEnable (VisualElement.enable) and a
  // panel is shown or hidden at any time, so a sweep in Update alone could leave a dark squircle drawing for a frame; the LateUpdate sweep runs
  // after every Update and OnEnable of the frame, just before rendering. A new component per call keeps it behind later-created UIKit scripts.
  const sc = global.scene.createSceneObject('UiKitMute').createComponent('Component.ScriptComponent');
  const sweep = () => {
    if (root.enabled) sweepMute(root);
  };
  sc.createEvent('UpdateEvent').bind(sweep);
  sc.createEvent('LateUpdateEvent').bind(sweep);
}

function meshVisual(parent: SceneObject, name: string, mesh: RenderMesh, z: number, color: vec4): RenderMeshVisual {
  const so = child(parent, name, new vec3(0, 0, z));
  const rmv = so.createComponent('Component.RenderMeshVisual') as RenderMeshVisual;
  OWN_VISUALS.add(rmv);
  rmv.mesh = mesh;
  const mat = SURFACE_MATERIAL.clone();
  mat.mainPass.baseColor = color;
  mat.mainPass.blendMode = BlendMode.Add;
  mat.mainPass.colorMask = new vec4b(true, true, true, false);
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
export function addPanelGlow(parent: SceneObject, w: number, h: number, radius: number, z: number, order: number = PANEL_GLOW_ORDER, spread: number = PANEL_GLOW_CM): SceneObject {
  const root = child(parent, 'Glow', new vec3(0, 0, z));
  const band = spread / PANEL_GLOW_BANDS.length;
  PANEL_GLOW_BANDS.forEach((a, k) => {
    const grow = spread - k * band; // outer edge, in cm beyond the panel edge
    const v = meshVisual(root, `Band${k}`, roundedRingMesh(w + 2 * grow, h + 2 * grow, radius + grow, band), 0, new vec4(0x5f / 255, 0xd4 / 255, 1, a));
    v.setRenderOrder(order);
  });
  return root;
}

/** A ring (circle outline) of outer radius `radius` cm and `thickness` cm, centred on `parent`. */
export function addCircleRing(parent: SceneObject, name: string, radius: number, thickness: number, z: number, color: vec4): RenderMeshVisual {
  return meshVisual(child(parent, name), 'Ring', roundedRingMesh(radius * 2, radius * 2, radius, thickness), z, color);
}

/**
 * Game layer: a `points`-pointed star (5 = rating star, 4 = sparkle) of outer radius `radius` cm and inner radius `radius * inner`, centred on
 * `local`. `ring` > 0 draws only an outline band of that share of the radius (an unearned star); otherwise the star is filled (additive).
 */
export function addStar(parent: SceneObject, name: string, points: number, radius: number, inner: number, local: vec3, color: vec4, ring = 0): RenderMeshVisual {
  const key = `star|${points}|${radius.toFixed(2)}|${inner.toFixed(2)}|${ring.toFixed(2)}`;
  let mesh = meshCache.get(key);
  if (!mesh) {
    const pts = (k: number): number[][] => {
      const out: number[][] = [];
      for (let i = 0; i < points * 2; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / points;
        const r = (i % 2 === 0 ? radius : radius * inner) * k;
        out.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return out;
    };
    const outer = pts(1);
    const n = outer.length;
    const idx: number[] = [];
    if (ring > 0) {
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        idx.push(i, j, n + j, i, n + j, n + i);
      }
      mesh = buildMesh([...outer, ...pts(1 - ring)], idx);
    } else {
      for (let i = 0; i < n; i++) idx.push(0, 1 + i, 1 + ((i + 1) % n));
      mesh = buildMesh([[0, 0], ...outer], idx);
    }
    meshCache.set(key, mesh);
  }
  const v = meshVisual(parent, name, mesh, 0, color);
  v.getSceneObject().getTransform().setLocalPosition(local);
  return v;
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
const MINT_FACE = new vec4(0.3, 1.0, 0.7, 0.06);
const MINT_FACE_HOVER = new vec4(0.3, 1.0, 0.7, 0.2);
const MINT_FACE_PRESS = new vec4(0.4, 1.0, 0.78, 0.34);
const MINT_BORDER = new vec4(0.55, 1.0, 0.82, 1);

type FaceSet = [vec4, vec4, vec4, vec4];
/** Secondary buttons are outlines (faint tint, mid-cyan stroke). */
const FACES: Record<'normal' | 'primary' | 'amber' | 'mint' | 'outline', FaceSet> = {
  outline: [BUTTON_FACE, BUTTON_FACE_HOVER, BUTTON_FACE_PRESS, BUTTON_BORDER],
  normal: [BUTTON_FACE, BUTTON_FACE_HOVER, BUTTON_FACE_PRESS, BUTTON_BORDER],
  primary: [PRIMARY_FACE, PRIMARY_FACE_HOVER, PRIMARY_FACE_PRESS, PRIMARY_BORDER],
  amber: [AMBER_FACE, AMBER_FACE_HOVER, AMBER_FACE_PRESS, AMBER_BORDER],
  mint: [MINT_FACE, MINT_FACE_HOVER, MINT_FACE_PRESS, MINT_BORDER],
};
/** Accent kinds keep a soft glow of their own colour even when not selected. */
const KIND_GLOW: Partial<Record<keyof typeof FACES, vec4>> = {
  primary: new vec4(0.37, 0.83, 1.0, 0.13),
  mint: new vec4(0.4, 1.0, 0.75, 0.15),
  amber: new vec4(1.0, 0.75, 0.3, 0.13),
};

const BUTTON_RADIUS_CM = 1.1;
/** Selected segments get a soft cyan glow ring around the face (D1: "optional cyan glow on the active element"). */
const GLOW_COLOR = new vec4(0.37, 0.83, 1.0, 0.14);
const GLOW_SPREAD_CM = 0.5;

/** Themes a button's face; returns `setSelected` (cyan face + frame + glow, artifact S1 segments). */
function themeButton(button: Button, so: SceneObject, w: number, h: number, kind: keyof typeof FACES): (selected: boolean) => void {
  let [face, hover, press] = FACES[kind];
  const border = FACES[kind][3];
  const radius = Math.min(BUTTON_RADIUS_CM, h / 2);
  const surfaceRoot = child(so, 'Surface', new vec3(0, 0, 0.02));
  const surface = addRoundedSurface(surfaceRoot, w, h, 0, face, border, radius, BUTTON_STROKE_CM);
  const frame = surfaceRoot.getChild(1).getComponent('Component.RenderMeshVisual') as RenderMeshVisual;
  const kindGlow = KIND_GLOW[kind];
  const glowRoot = child(surfaceRoot, 'GlowRoot', new vec3(0, 0, -0.02));
  const glowA = meshVisual(glowRoot, 'Glow', roundedRingMesh(w + 2 * GLOW_SPREAD_CM, h + 2 * GLOW_SPREAD_CM, radius + GLOW_SPREAD_CM, GLOW_SPREAD_CM), 0, kindGlow ?? GLOW_COLOR);
  const glowB = meshVisual(glowRoot, 'Glow2', roundedRingMesh(w + 4 * GLOW_SPREAD_CM, h + 4 * GLOW_SPREAD_CM, radius + 2 * GLOW_SPREAD_CM, GLOW_SPREAD_CM), -0.01, kindGlow ?? GLOW_COLOR);
  const tint = (c: vec4) => {
    glowA.mainPass.baseColor = c;
    glowB.mainPass.baseColor = new vec4(c.x, c.y, c.z, c.w * 0.4);
  };
  tint(kindGlow ?? GLOW_COLOR);
  glowRoot.enabled = !!kindGlow;
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
    tint(selected ? GLOW_COLOR : kindGlow ?? GLOW_COLOR);
    glowRoot.enabled = selected || !!kindGlow;
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
export function makePanel(host: SceneObject, widthCm: number, heightCm: number, padCm: number, gapCm: number, fill: vec4 = SURFACE_FILL): Panel {
  const root = child(host, 'Panel');
  root.createComponent('Component.Canvas');
  const backPlate = root.createComponent(BackPlate.getTypeName()) as BackPlate;
  backPlate.style = 'dark';
  backPlate.size = new vec2(widthCm, heightCm);
  addPanelGlow(root, widthCm, heightCm, PANEL_RADIUS_CM, 0);
  const backdrop = addRoundedSurface(root, widthCm, heightCm, 0, fill, SURFACE_BORDER, PANEL_RADIUS_CM); // drawn before Content
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
  // UIKit's BackPlate draws its own dark rounded rectangle on the panel root, which reads as a flat grey plate on the additive display
  // (and not as the luminous outline this UI uses). It keeps its collider and layout; only its visual is switched off, every frame
  // (it is created at initialize and may be re-enabled by the component).
  muteUiKitVisuals(root);
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
export function flexRow(parent: SceneObject, name: string, widthCm: number, heightCm: number, gapCm: number, justify: FlexJustify = FlexJustify.Center): SceneObject {
  const so = child(parent, name);
  const flex = so.createComponent(FlexLayout.getTypeName()) as FlexLayout;
  flex.width = widthCm;
  flex.height = heightCm;
  flex.direction = FlexDirection.Row;
  flex.justifyContent = justify;
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
  /** Type role of the subline (default 'Caption'). */
  sublineRole?: TextRole;
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
): { button: Button; label: Text; subline: Text | null; setSelected: (selected: boolean) => void } {
  const so = child(parent, name);
  const button = so.createComponent(Button.getTypeName()) as Button;
  button.size = new vec3(widthCm, heightCm, 1);
  const setSelected = themeButton(button, so, widthCm, heightCm, opts.primary ? 'primary' : opts.mint ? 'mint' : opts.amber ? 'amber' : opts.outline ? 'outline' : 'normal');
  const role = opts.labelRole ?? 'Button';
  let labelX = 0;
  let labelW = widthCm - 0.5;
  if (opts.icon) {
    const iconSize = Math.min(heightCm * 0.6, 2.4);
    const gap = 0.8;
    // Estimated label width (Inter at size 39 ≈ 0.42 cm per glyph at 110 cm) so the
    // icon + label group is centered on the face.
    const glyph = (roleSize(role, distanceCm) / 39) * 0.42;
    // With a subline the group is as wide as the longer of the two lines (the subline is Caption, about 0.66 of the label size).
    const textW = Math.min(widthCm - iconSize - 1.2, Math.max(label.length * glyph, opts.subline ? opts.subline.length * glyph * (roleSize(opts.sublineRole ?? 'Caption') / roleSize(role)) : 0));
    const groupW = iconSize + gap + textW;
    addIcon(so, opts.icon, iconSize, new vec3(-groupW / 2 + iconSize / 2, 0, BUTTON_LABEL_Z));
    labelX = -groupW / 2 + iconSize + gap + textW / 2;
    labelW = textW + 0.4;
  }
  // With a subline the label moves up and the subline (about 60 % of the label size) sits under it.
  const labelSo = child(so, 'Label', new vec3(labelX, opts.subline ? heightCm * 0.17 : 0, BUTTON_LABEL_Z));
  const text = makeText(labelSo, label, role, labelW, opts.subline ? heightCm * 0.6 : heightCm, distanceCm, opts.primary ? TEXT_PRIMARY : opts.mint ? TEXT_MINT : opts.amber ? TEXT_AMBER_LABEL : TEXT_PRIMARY);
  let sub: Text | null = null;
  if (opts.subline) {
    sub = makeText(child(so, 'Subline', new vec3(labelX, -heightCm * 0.27, BUTTON_LABEL_Z)), opts.subline, role, labelW, heightCm * 0.3, distanceCm, TEXT_LABEL);
    sub.size = roleSize(opts.sublineRole ?? 'Caption', distanceCm);
  }
  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem;
  item.overrideWidth = widthCm;
  item.overrideHeight = heightCm;
  item.flexShrink = 0;
  button.onTriggerUp.add(() => onClick());
  return { button, label: text, subline: sub, setSelected };
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
