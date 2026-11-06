/**
 * AudienceRig.ts — Lens adapter for the game layer's silhouette look (core/AudienceLook.ts).
 *
 * Each Audience_i holds Body (box 80 x 140 x 64), Head (ellipsoid) and Halo children. The rig
 * clones the Body / Head materials per member (otherwise every silhouette shares one tint), then
 * per frame: tints them, leans the body forward about the feet, sinks and pushes the head forward
 * (the head is a sphere, so a pitch would be invisible: the droop is position) and rolls it about 25 degrees,
 * lights a small rounded phone screen with a faint light cone at the lap, shows a "zzz" marker, and pulses the Halo ring on a perk-up burst.
 * Local axes: the silhouette faces +Z (the speaker), so a forward lean is +Z.
 */
import { AudienceLook, HEAD_ABOVE_NECK_SLUMP_CM, HEAD_ABOVE_NECK_UP_CM, PHONE_Y_CM } from './core/AudienceLook';
import { FADE_ROWS, SHADOW_LAYERS, bodyFadePixels, headDepthScale, shadowBars } from './core/BodyFade';
import { BODY_ORIGIN_CM, FigureColors, TORSO_ROWS, TORSO_WIDTH_SCALE, HEAD_HALF_H, HEAD_HALF_W, Pt, centroid, ellipsePts, figureColors, figureHue, figureVariant, FigureVariant, offsetPts, roundedRectPts, scalePts, tagText, tagTone, torsoOutline } from './core/Figure';
import { DEFAULT_TUNABLES } from './core/Tunables';
import { AUDIENCE_RENDER_ORDER, STAGE_STROKE_CM, LINE_AMBER, LINE_CORAL, LINE_CYAN, addCircleRing, addDot, addRoundedSurface, addSurface, addText, child } from './EyesUpUI';
import { polyFill, polyRing, polyStrip } from './FigureMesh';

/** Cycle 6 (D2): the soft shadow sits where the body has faded out, just above the bottom of the preview frame (about 57 cm above the feet). */
const SHADOW_Y = 74;
const SHADOW_Z = -1;
const SHADOW_RGB: [number, number, number] = [0.12, 0.2, 0.62];
/** Cycle 6 (D2): the lower part of the body fades out through an alpha texture on the body mesh. */
function makeBodyFadeTexture(plain = false): Texture | null {
  try {
    const tex = ProceduralTextureProvider.createWithFormat(2, FADE_ROWS, TextureFormat.RGBA8Unorm);
    (tex.control as ProceduralTextureProvider).setPixels(0, 0, 2, FADE_ROWS, bodyFadePixels(2, plain));
    return tex;
  } catch (e) {
    print('EyesUp: body fade texture unavailable: ' + e);
    return null;
  }
}

const BODY_REST_Y = 70;
const BODY_REST_H = 140;
const HEAD_REST_Y = 153;
/** Neck top relative to the body centre (the body box is centred at 70 cm; the neck top is 141 cm above the floor). */
const NECK_TOP_REL_CM = 71;
/** Forward lean of the body, as a share of the head pitch. */
const LEAN_SHARE = 0.35;
/** The head also creeps toward the speaker by this many cm at full slump. */
const HEAD_FORWARD_CM = 8;
/**
 * A small bright phone screen (a plus-shaped quad pair gives rounded corners) with a faint stepped light cone rising toward
 * the face. Sized to read at 2.5 m without becoming a card; the whole thing stays within the silhouette's lap, inside the frame.
 */
/** Cycle 5 (R2): the phone sits 6 cm higher (80 -> 86) so its glow stays inside the frame bottom at the canonical pose; Cycle 6 (D2): 89 because the floor is 3 cm lower (floorOffsetCm 152), so it stays where it was in the frame. */
const PHONE_Y = PHONE_Y_CM;
const PHONE_W = 9;
const PHONE_H = 14;
const PHONE_CORNER = 1.6;
const CONE_STEPS = 4;
const PHONE_RGB: [number, number, number] = [1.0, 0.8, 0.3];
/** Cycle 4 (D1): the 'zzz' stands straight above its own head (x offset 0; it used to sit 14 cm to the right, between two heads). */
const ZZZ_ABOVE_HEAD_CM = 30;
/** 'zzz' marker: lavender, above the sunk head and clear of the head (and of the nudge chevron on its side). Title2 at 420 cm is about 7 cm tall in the silhouette's space. */
const ZZZ_RGB = new vec4(0.85, 0.85, 1.0, 1);
const ZZZ_DIST = 420;
/**
 * Perk-up ring pulse (Cycle 1, D3): one smooth cyan ring mesh, radius 12 cm at scale 1, capped at
 * scale 2.1 (outer edge about 26 cm from the head centre) so it never reaches the room meter row,
 * which starts about 29 cm above the head centre. It used to grow to 48 cm and strike through "Room".
 */
const RING_RADIUS = 12;
const RING_THICK = 1.7;
const RING_MAX_SCALE = 2.1;
const RING_RGB: [number, number, number] = [0.88, 1.0, 1.0];

interface Member {
  body: SceneObject | null;
  head: SceneObject | null;
  halo: SceneObject | null;
  bodyVisual: RenderMeshVisual | null;
  headVisual: RenderMeshVisual | null;
  bodyRestScale: vec3;
  haloRestScale: vec3;
  phone: SceneObject;
  screenVisuals: RenderMeshVisual[];
  coneVisuals: RenderMeshVisual[];
  zzz: SceneObject;
  zzzText: Text;
  ring: SceneObject;
  ringVisuals: RenderMeshVisual[];
  shadow: RenderMeshVisual[][];
  shadowFade: number;
  headRestScale: vec3;
  figure: Figure;
  variant: FigureVariant;
  /** +1 (counter-clockwise, leaning left) / -1: which way this seat rolls when it slumps; the left seat leans outward so neighbours do not overlap. */
  rollSign: number;
  tag: Tag;
  haloGlow: RenderMeshVisual[];
  /** How much the speaker is looking at this member, 0..1 (from the halo colour). */
  lit: number;
}

/** One figure layer: a mesh visual and the colour it takes from FigureColors. */
interface Layer {
  visual: RenderMeshVisual;
  color: keyof FigureColors;
  /** Multiplier on the colour's alpha (a layer can be fainter than its group colour). */
  k: number;
}
interface Figure {
  layers: Layer[];
  hue: [number, number, number];
  lastKey: string;
}
interface Tag {
  root: SceneObject;
  text: Text;
  fill: RenderMeshVisual;
  frame: RenderMeshVisual;
  shown: string;
  index: number;
  owner: SceneObject;
}

/**
 * Per-person tag ("#2 55%"): a capsule outline just under the head (a name badge on the shoulders), following the head as it sinks.
 * There is no free row above the heads: the room meter and the cue card use it, and the frame is full.
 */
/**
 * Round 2: every tag stands on one baseline above the halo tops (upright lit halo top 175 cm, a 1.8 cm gap, half the 7 cm tag), the same for
 * every member in every state, so tags never overlap a neighbour's outline. A slumped member's head sinks well below it; its zzz marks the head.
 */
const TAG_BASELINE_Y = 182.2;
const TAG_Z = 14;
const TAG_W = 23;
const TAG_H = 6.4;
const TAG_TEXT_SIZE = 190;
/** Halo ring 36 -> 32 cm across: the lit ring's top is 177 cm, which leaves room for the tag row under the meter. */
const HALO_SCALE = 32 / 36;
const TAG_DIST = 250;
const TAG_TEXT: Record<'good' | 'mid' | 'low', vec4> = {
  good: new vec4(0.78, 0.97, 1, 1),
  mid: new vec4(1, 0.93, 0.7, 1),
  low: new vec4(1, 0.78, 0.74, 1),
};
const TAG_LINE: Record<'good' | 'mid' | 'low', vec4> = { good: LINE_CYAN, mid: LINE_AMBER, low: LINE_CORAL };
/** Halo ring: unit ring (outer diameter 1) that the halo object scales to about 36 cm, plus a faint wider glow ring. */
const HALO_RING_STROKE = 0.085;
const HALO_GLOW_STROKE = 0.14;
const HALO_GLOW_SIZE = 1.3;

function byName(parent: SceneObject, name: string): SceneObject | null {
  for (let i = 0; i < parent.getChildrenCount(); i++) {
    const c = parent.getChild(i);
    if (c.name === name) return c;
  }
  return null;
}

function visualOf(so: SceneObject | null, fadeTexture: Texture | null = null): RenderMeshVisual | null {
  if (!so) return null;
  const v = so.getComponent('Component.RenderMeshVisual') as RenderMeshVisual;
  if (!v) return null;
  v.mainMaterial = v.mainMaterial.clone();
  if (fadeTexture) {
    v.mainPass.baseTex = fadeTexture;
  }
  return v;
}

function layerVisual(parent: SceneObject, name: string, mesh: RenderMesh, mat: Material, z: number): RenderMeshVisual {
  const so = child(parent, name, new vec3(0, 0, z));
  const v = so.createComponent('Component.RenderMeshVisual') as RenderMeshVisual;
  v.mesh = mesh;
  v.mainMaterial = mat.clone();
  v.mainPass.blendMode = BlendMode.Add;
  v.mainPass.colorMask = new vec4b(true, true, true, false);
  return v;
}

const BODY_V = { yMin: -BODY_ORIGIN_CM, yMax: 70 };
const ZERO: Pt = [0, 0];

/**
 * The layered glass figure (core/Figure.ts): torso with neck and shoulders and a head, each built from a soft glow, a base fill, two inner
 * highlights, arm lines (torso), two eye dots (head) and a bright rim line. The original box and ellipsoid visuals are switched off; the
 * layers hang under a holder that cancels the object's rest scale, so the existing lean, squash, sink and tilt maths still drive them.
 */
function buildFigure(index: number, body: SceneObject | null, head: SceneObject | null, bodyVisual: RenderMeshVisual | null, headVisual: RenderMeshVisual | null, bodyRest: vec3, headRest: vec3): Figure {
  const layers: Layer[] = [];
  const fig: Figure = { layers, hue: figureHue(index), lastKey: '' };
  if (body && bodyVisual) {
    const mat = bodyVisual.mainMaterial;
    bodyVisual.enabled = false;
    const holder = child(body, 'Fig', new vec3(0, 0, 0));
    holder.getTransform().setLocalScale(new vec3(1 / bodyRest.x, 1 / bodyRest.y, 1 / bodyRest.z));
    const torso = torsoOutline();
    const c = centroid(torso);
    const add = (name: string, mesh: RenderMesh, color: keyof FigureColors, k = 1) => layers.push({ visual: layerVisual(holder, name, mesh, mat, 0.04 * layers.length), color, k });
    add('TorsoGlow', polyFill('torsoGlow', offsetPts(torso, 1.8), BODY_V), 'glow');
    add('TorsoFill', polyFill('torso', torso, BODY_V), 'body');
    add('TorsoLight1', polyFill('torsoHi1', scalePts(torso, 0.62, 0.8, c, -4, 8), BODY_V), 'highlight');
    add('TorsoLight2', polyFill('torsoHi2', scalePts(torso, 0.34, 0.52, c, -7, 17), BODY_V), 'highlight');
    // Inner contours (the arm hanging from the shoulder, a V collar) and a brighter rim on the light (left) side give the torso volume without a fill.
    const aw = 12.5 * TORSO_WIDTH_SCALE;
    const ax = 21 * TORSO_WIDTH_SCALE;
    add('ArmL', polyRing('armL', roundedRectPts(aw, 84, aw / 2, -ax, 11), 0.85, BODY_V), 'arms');
    add('ArmR', polyRing('armR', roundedRectPts(aw, 84, aw / 2, ax, 11), 0.85, BODY_V), 'arms');
    add('Collar', polyStrip('collar', [[-7, 66], [0, 52], [7, 66]], 0.9, [0, -30], BODY_V), 'collar');
    // An open stroke along both sides: no flat line across the neck top (it showed through a sunk head like a beard).
    add('TorsoRim', polyStrip('torsoRimOpen', torso, 1.5, c, BODY_V), 'rim');
    add('TorsoRimLight', polyStrip('torsoRimLight', torso.slice(TORSO_ROWS), 3.4, c, BODY_V), 'rimLight');
    // Soft highlight along the light-side shoulder, a little inside the rim.
    add('ShoulderLight', polyStrip('shoulderLight', offsetPts(torso, -2.4).slice(-7, -2), 4.5, c, BODY_V), 'shoulder');
  }
  if (head && headVisual) {
    const mat = headVisual.mainMaterial;
    headVisual.enabled = false;
    const holder = child(head, 'Fig', new vec3(0, 0, 0));
    holder.getTransform().setLocalScale(new vec3(1 / headRest.x, 1 / headRest.y, 1 / headRest.z));
    const ell = ellipsePts(HEAD_HALF_W, HEAD_HALF_H, 48);
    const add = (name: string, mesh: RenderMesh, color: keyof FigureColors, z: number) => layers.push({ visual: layerVisual(holder, name, mesh, mat, z), color, k: 1 });
    // Round 3: a slight head turn per person: the eyes slide and close up toward one side, the highlight follows.
    const v = figureVariant(index);
    const ex = v.turn * 3.2;
    const gap = 3.6 - 0.9 * Math.abs(v.turn);
    const tk = `${index % 9}`;
    add('HeadGlow', polyFill('headGlow', offsetPts(ell, 1.5), null), 'headGlow', 0.6);
    add('HeadFill', polyFill('head', ell, null), 'head', 0.65);
    add('HeadLight1', polyFill('headHi1', scalePts(ell, 0.62, 0.62, ZERO, -2.6, 3.2), null), 'headHighlight', 0.7);
    add('HeadLight2', polyFill('headHi2', scalePts(ell, 0.3, 0.3, ZERO, -4, 5.6), null), 'headHighlight', 0.75);
    add('EyeL', polyFill(`eyeL${tk}`, ellipsePts(1.1 * (1 - 0.18 * Math.max(0, v.turn)), 1.5, 14, ex - gap, 1.6), null), 'eyes', 0.8);
    add('EyeR', polyFill(`eyeR${tk}`, ellipsePts(1.1 * (1 + 0.0 * v.turn) * (1 - 0.18 * Math.max(0, -v.turn)), 1.5, 14, ex + gap, 1.6), null), 'eyes', 0.8);
    add('HeadRim', polyRing('headRim', ell, 1.3, null), 'headRim', 0.85);
    add('HeadRimLight', polyStrip('headRimLight', ell.slice(13, 31), 2.2, ZERO, null), 'rimLight', 0.9);
  }
  return fig;
}

function makeHaloRings(halo: SceneObject): RenderMeshVisual[] {
  const v = halo.getComponent('Component.RenderMeshVisual') as RenderMeshVisual | null;
  if (!v) return [];
  v.mesh = polyRing('haloRing', ellipsePts(0.5, 0.5, 72), HALO_RING_STROKE, null);
  const g = child(halo, 'HaloGlowRing', new vec3(0, 0, -0.1));
  const gv = g.createComponent('Component.RenderMeshVisual') as RenderMeshVisual;
  gv.mesh = polyRing('haloGlow', ellipsePts(0.5 * HALO_GLOW_SIZE, 0.5 * HALO_GLOW_SIZE, 72), HALO_GLOW_STROKE, null);
  gv.mainMaterial = v.mainMaterial.clone();
  return [gv];
}

function makeTag(root: SceneObject, index: number): Tag {
  const tagRoot = child(root, 'Tag', new vec3(0, 126, TAG_Z));
  const surf = child(tagRoot, 'Capsule');
  const fill = addRoundedSurface(surf, TAG_W, TAG_H, 0, new vec4(LINE_CYAN.x, LINE_CYAN.y, LINE_CYAN.z, 0.1), LINE_CYAN, TAG_H / 2, STAGE_STROKE_CM);
  const frame = surf.getChild(1).getComponent('Component.RenderMeshVisual') as RenderMeshVisual;
  const text = addText(tagRoot, 'TagText', tagText(index, 1), 'Title', TAG_W, TAG_H, TAG_DIST, TAG_TEXT.good, new vec3(0, 0, 0.3));
  text.size = TAG_TEXT_SIZE;
  return { root: tagRoot, text, fill, frame, shown: '', index, owner: root };
}

export class AudienceRig {
  private members: Member[] = [];

  constructor(audience: SceneObject[]) {
    const fadeTexture = makeBodyFadeTexture();
    // The silhouette material now samples a base texture (ENABLE_BASE_TEX), so the head gets an opaque white one.
    const plainTexture = makeBodyFadeTexture(true);
    this.members = audience.map((root, index) => {
      const body = byName(root, 'Body');
      const head = byName(root, 'Head');
      const halo = byName(root, 'Halo');
      const phoneRig = child(root, 'PhoneRig');
      const phone = child(phoneRig, 'Phone', new vec3(0, PHONE_Y, 44));
      // Tilted back like a phone held at the lap.
      phone.getTransform().setLocalRotation(quat.angleAxis(-Math.PI / 4, new vec3(1, 0, 0)));
      const clear = new vec4(PHONE_RGB[0], PHONE_RGB[1], PHONE_RGB[2], 0);
      const screen = child(phone, 'Screen');
      // Redesign: one rounded glass screen with a bright rim instead of three overlapping quads (their edges were jagged).
      const screenFill = addRoundedSurface(screen, PHONE_W, PHONE_H, 0, clear, clear, PHONE_CORNER + 0.4, 0.8);
      const screenVisuals = [screenFill, screen.getChild(1).getComponent('Component.RenderMeshVisual') as RenderMeshVisual];
      // Light cone: widening, ever fainter steps stacked upward from the screen toward the face.
      const cone = child(phoneRig, 'PhoneCone', new vec3(0, PHONE_Y + 8, 40));
      const coneVisuals: RenderMeshVisual[] = [];
      for (let k = 0; k < CONE_STEPS; k++) {
        const w = PHONE_W + 7 * (k + 1);
        // Design cycle 3 (F1): nested ellipses instead of stacked rectangles, so the glow has no axis-aligned edges.
        const step = child(cone, `Cone${k}`, new vec3(0, 7 + 9 * k, -0.2 - 0.05 * k));
        step.getTransform().setLocalScale(new vec3(1, (12 + 4 * k) / w, 1));
        coneVisuals.push(addDot(step, 'Glow', w / 2, new vec3(0, 0, 0), clear));
      }
      cone.getTransform().setLocalRotation(quat.angleAxis(-Math.PI / 10, new vec3(1, 0, 0)));
      phoneRig.enabled = false;
      const zzz = child(root, 'Zzz', new vec3(0, 170, 20));
      const zzzText = addText(zzz, 'ZzzText', 'zzz', 'Title2', 14, 8, ZZZ_DIST, ZZZ_RGB, new vec3(0, 0, 0));
      zzz.enabled = false;
      const ring = child(root, 'PerkRing', new vec3(0, HEAD_REST_Y, 14));
      const ringVisuals: RenderMeshVisual[] = [addCircleRing(ring, 'Circle', RING_RADIUS, RING_THICK, 0, new vec4(RING_RGB[0], RING_RGB[1], RING_RGB[2], 0))];
      ring.enabled = false;
      // Soft floor shadow: nested ellipses of horizontal bars behind the body.
      const shadowRoot = child(root, 'Shadow', new vec3(0, SHADOW_Y, SHADOW_Z));
      shadowRoot.enabled = false; // redesign: the torso fades out by itself; the blue floor haze read as a grey band
      const shadow = SHADOW_LAYERS.map((layer, li) =>
        shadowBars(layer).map((b, bi) =>
          addSurface(child(shadowRoot, `S${li}_${bi}`, new vec3(0, b.y, -0.02 * li)), Math.max(0.1, b.w), b.h, 0, new vec4(SHADOW_RGB[0], SHADOW_RGB[1], SHADOW_RGB[2], 0), null),
        ),
      );
      const bodyVisual = visualOf(body, fadeTexture);
      const headVisual = visualOf(head, plainTexture);
      const bodyRestScale = body ? body.getTransform().getLocalScale() : new vec3(80, 140, 64);
      const headRestScale = head ? head.getTransform().getLocalScale() : new vec3(22, 25, 22);
      const haloRestScale = halo ? halo.getTransform().getLocalScale().uniformScale(HALO_SCALE) : new vec3(32, 32, 32);
      const variant = figureVariant(index);
      const rollSign = index % 3 === 0 ? 1 : index % 3 === 1 ? -0.45 : -1;
      const figure = buildFigure(index, body, head, bodyVisual, headVisual, bodyRestScale, headRestScale);
      const tag = makeTag(root, index);
      const haloGlow = halo ? makeHaloRings(halo) : [];
      return {
        body,
        head,
        halo,
        bodyVisual,
        headVisual,
        bodyRestScale,
        haloRestScale,
        phone: phoneRig,
        screenVisuals,
        coneVisuals,
        zzz,
        zzzText,
        ring,
        ringVisuals,
        shadow,
        shadowFade: -1,
        headRestScale,
        figure,
        variant,
        rollSign,
        tag,
        haloGlow,
        lit: 0,
      };
    });
  }

  /** `fade` 0..1 is the Placing fade-in / Summary fade-out. */
  apply(i: number, look: AudienceLook, fade: number): void {
    const m = this.members[i];
    if (!m) return;
    this.applyFigure(m, look, fade);
    // The member's root is scaled up to 1.05 when looked at; the tag cancels it, so every tag keeps one world baseline, size and width.
    const rs = Math.max(0.5, m.tag.owner.getTransform().getWorldScale().x);
    m.tag.root.getTransform().setLocalPosition(new vec3(0, TAG_BASELINE_Y / rs, TAG_Z / rs));
    m.tag.root.getTransform().setLocalScale(new vec3(1 / rs, 1 / rs, 1 / rs));

    const slump = Math.min(1, look.headPitchDeg / 38);
    const lean = (look.headPitchDeg * LEAN_SHARE * Math.PI) / 180;
    const k = look.bodyScaleY * m.variant.height;
    const roll = (m.rollSign * look.bodyRollDeg * Math.PI) / 180;
    const rot = quat.angleAxis(roll, new vec3(0, 0, 1)).multiply(quat.angleAxis(lean, new vec3(1, 0, 0)));
    // Round 3: the whole figure drops and rolls as one; the head then sits on the (dropped, rolled) neck, so a slumped member is a hunched
    // person with the chin down instead of a head floating inside a hollow shell.
    const cy = BODY_REST_Y * k;
    const bodyPos = new vec3(0, cy * Math.cos(lean) + look.bodyDropCm, cy * Math.sin(lean));
    if (m.body) {
      const t = m.body.getTransform();
      t.setLocalRotation(rot);
      t.setLocalPosition(bodyPos);
      t.setLocalScale(new vec3(m.bodyRestScale.x * m.variant.width, BODY_REST_H * k, m.bodyRestScale.z));
    }
    const above = (HEAD_ABOVE_NECK_UP_CM + (HEAD_ABOVE_NECK_SLUMP_CM - HEAD_ABOVE_NECK_UP_CM) * slump) * k;
    const headOff = rot.multiplyVec3(new vec3(0, NECK_TOP_REL_CM * k + above, 0));
    const headPos = new vec3(bodyPos.x + headOff.x, bodyPos.y + headOff.y, bodyPos.z + headOff.z + HEAD_FORWARD_CM * slump);
    if (m.head) {
      const ht = m.head.getTransform();
      ht.setLocalPosition(headPos);
      // Cycle 6 (D2): creeping toward the viewer must not make the slumped head draw larger than the lit one.
      const ds = headDepthScale(headPos.z, DEFAULT_TUNABLES.stageDistanceCm);
      ht.setLocalScale(new vec3(m.headRestScale.x * ds, m.headRestScale.y * ds, m.headRestScale.z * ds));
      const headRoll = (0.5 * look.headTiltDeg * m.rollSign * Math.PI) / 180 + (m.variant.roll * (1 - slump) * Math.PI) / 180 + roll;
      ht.setLocalRotation(quat.angleAxis(headRoll, new vec3(0, 0, 1)));
    }
    if (m.halo) {
      // The halo ring stays around the head as it sinks, and pops outward on a perk-up burst.
      const s = look.haloBurstScale;
      const t = m.halo.getTransform();
      t.setLocalPosition(headPos);
      const ds = headDepthScale(headPos.z, DEFAULT_TUNABLES.stageDistanceCm);
      t.setLocalScale(new vec3(m.haloRestScale.x * s * ds, m.haloRestScale.y * s * ds, m.haloRestScale.z * s * ds));
    }
    if (m.shadowFade !== fade) {
      m.shadowFade = fade;
      m.shadow.forEach((bars, li) => bars.forEach((v) => (v.mainPass.baseColor = new vec4(SHADOW_RGB[0], SHADOW_RGB[1], SHADOW_RGB[2], SHADOW_LAYERS[li].alpha * fade))));
    }
    const pa = look.pulseAlpha * fade;
    if (m.ring.enabled !== pa > 0.01) m.ring.enabled = pa > 0.01;
    if (pa > 0.01) {
      const rt = m.ring.getTransform();
      rt.setLocalPosition(new vec3(headPos.x, headPos.y, headPos.z + 14));
      const rs = Math.min(look.pulseScale, RING_MAX_SCALE);
      rt.setLocalScale(new vec3(rs, rs, 1));
      m.ringVisuals.forEach((v) => (v.mainPass.baseColor = new vec4(RING_RGB[0], RING_RGB[1], RING_RGB[2], pa)));
    }
    const glow = look.phoneGlow * fade;
    if (m.phone.enabled !== glow > 0.01) m.phone.enabled = glow > 0.01;
    if (glow > 0.01) {
      m.screenVisuals.forEach((v, k) => (v.mainPass.baseColor = k === 0 ? new vec4(PHONE_RGB[0], PHONE_RGB[1], PHONE_RGB[2], 0.22 * glow) : new vec4(1, 0.93, 0.7, glow)));
      // The three screen quads overlap; keep the sum opaque but not blown out.
      m.coneVisuals.forEach((v, k) => (v.mainPass.baseColor = new vec4(PHONE_RGB[0], PHONE_RGB[1], PHONE_RGB[2], (0.13 - 0.025 * k) * glow)));
    }
    const z = look.zzz * fade;
    if (m.zzz.enabled !== z > 0.01) m.zzz.enabled = z > 0.01;
    if (z > 0.01) {
      m.zzz.getTransform().setLocalPosition(new vec3(headPos.x, headPos.y + ZZZ_ABOVE_HEAD_CM, headPos.z + 6));
      m.zzzText.textFill.color = new vec4(ZZZ_RGB.x, ZZZ_RGB.y, ZZZ_RGB.z, z);
    }
  }

  /** Colours the figure layers and the "#n NN%" tag; skipped when nothing visible changed. */
  private applyFigure(m: Member, look: AudienceLook, fade: number): void {
    const f = m.figure;
    const key = `${look.engagement.toFixed(2)}|${look.burst.toFixed(2)}|${m.lit.toFixed(2)}|${fade.toFixed(2)}`;
    if (key !== f.lastKey) {
      f.lastKey = key;
      const col = figureColors(f.hue, look.engagement, look.burst, m.lit, fade);
      f.layers.forEach((l) => {
        const c = col[l.color];
        l.visual.mainPass.baseColor = new vec4(c[0], c[1], c[2], c[3] * l.k);
      });
    }
    const t = tagText(m.tag.index, look.engagement);
    const tone = tagTone(look.engagement);
    if (t !== m.tag.shown) {
      m.tag.shown = t;
      m.tag.text.text = t;
    }
    const line = TAG_LINE[tone];
    const tc = TAG_TEXT[tone];
    m.tag.text.textFill.color = new vec4(tc.x, tc.y, tc.z, fade);
    m.tag.frame.mainPass.baseColor = new vec4(line.x, line.y, line.z, 0.95 * fade);
    m.tag.fill.mainPass.baseColor = new vec4(line.x, line.y, line.z, 0.1 * fade);
    if (m.tag.root.enabled !== fade > 0.02) m.tag.root.enabled = fade > 0.02;
  }

  /** Halo colour from the session: the glow ring follows it, and `lit` warms the figure's rim. */
  setHalo(i: number, color: [number, number, number, number], fade: number): void {
    const m = this.members[i];
    if (!m) return;
    m.lit = Math.min(1, Math.max(0, (color[3] - 0.3) / 0.7));
    m.haloGlow.forEach((v) => (v.mainPass.baseColor = new vec4(color[0], color[1], color[2], color[3] * 0.28 * fade)));
  }

  /**
   * Explicit draw order inside the audience (every mesh sorts by hierarchy and depth otherwise): shadow first, then each figure layer in
   * stacking order, halo rings, the phone glow and the perk-up ring on top. All below the panels.
   */
  applyRenderOrders(): void {
    const base = AUDIENCE_RENDER_ORDER;
    this.members.forEach((m) => {
      m.shadow.forEach((bars) => bars.forEach((v) => v.setRenderOrder(base)));
      m.figure.layers.forEach((l, k) => l.visual.setRenderOrder(base + 1 + k));
      const top = base + 1 + m.figure.layers.length;
      if (m.halo) (m.halo.getComponent('Component.RenderMeshVisual') as RenderMeshVisual).setRenderOrder(top);
      m.haloGlow.forEach((v) => v.setRenderOrder(top - 1));
      m.screenVisuals.forEach((v) => v.setRenderOrder(top + 2));
      m.coneVisuals.forEach((v) => v.setRenderOrder(top + 1));
      m.ringVisuals.forEach((v) => v.setRenderOrder(top + 3));
      m.tag.fill.setRenderOrder(top + 4);
      m.tag.frame.setRenderOrder(top + 5);
      m.tag.text.setRenderOrder(top + 6);
    });
  }

  /** World position of member `i`'s visible "zzz" marker, or null when it is hidden (the nudge chevron keeps clear of it). */
  zzzWorld(i: number): vec3 | null {
    const m = this.members[i];
    if (!m || !m.zzz.enabled) return null;
    return m.zzz.getTransform().getWorldPosition();
  }

  /** World position of member `i`'s visible "#n NN%" tag, or null when hidden. */
  tagWorld(i: number): vec3 | null {
    const m = this.members[i];
    return m && m.tag.root.enabled ? m.tag.root.getTransform().getWorldPosition() : null;
  }

  /** World position of member `i`'s head (its current, possibly slumped, position), or null when there is no head object. */
  headWorld(i: number): vec3 | null {
    const m = this.members[i];
    return m && m.head ? m.head.getTransform().getWorldPosition() : null;
  }

  /** Hide every phone (used when the audience is hidden). */
  hidePhones(): void {
    this.members.forEach((m) => {
      m.phone.enabled = false;
      m.zzz.enabled = false;
      m.ring.enabled = false;
    });
  }
}
