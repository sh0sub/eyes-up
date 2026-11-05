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
import { AudienceLook, PHONE_Y_CM } from './core/AudienceLook';
import { FADE_ROWS, SHADOW_LAYERS, bodyFadePixels, headDepthScale, shadowBars } from './core/BodyFade';
import { DEFAULT_TUNABLES } from './core/Tunables';
import { addCircleRing, addDot, addSurface, addText, child } from './EyesUpUI';

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
}

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

export class AudienceRig {
  private members: Member[] = [];

  constructor(audience: SceneObject[]) {
    const fadeTexture = makeBodyFadeTexture();
    // The silhouette material now samples a base texture (ENABLE_BASE_TEX), so the head gets an opaque white one.
    const plainTexture = makeBodyFadeTexture(true);
    this.members = audience.map((root) => {
      const body = byName(root, 'Body');
      const head = byName(root, 'Head');
      const halo = byName(root, 'Halo');
      const phoneRig = child(root, 'PhoneRig');
      const phone = child(phoneRig, 'Phone', new vec3(0, PHONE_Y, 44));
      // Tilted back like a phone held at the lap.
      phone.getTransform().setLocalRotation(quat.angleAxis(-Math.PI / 4, new vec3(1, 0, 0)));
      const clear = new vec4(PHONE_RGB[0], PHONE_RGB[1], PHONE_RGB[2], 0);
      const screen = child(phone, 'Screen');
      const screenVisuals = [
        addSurface(child(screen, 'Wide'), PHONE_W, PHONE_H - 2 * PHONE_CORNER, 0, clear, null),
        addSurface(child(screen, 'Tall'), PHONE_W - 2 * PHONE_CORNER, PHONE_H, 0, clear, null),
        addSurface(child(screen, 'Mid'), PHONE_W - 0.8, PHONE_H - 0.8, 0, clear, null),
      ];
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
      const shadow = SHADOW_LAYERS.map((layer, li) =>
        shadowBars(layer).map((b, bi) =>
          addSurface(child(shadowRoot, `S${li}_${bi}`, new vec3(0, b.y, -0.02 * li)), Math.max(0.1, b.w), b.h, 0, new vec4(SHADOW_RGB[0], SHADOW_RGB[1], SHADOW_RGB[2], 0), null),
        ),
      );
      return {
        body,
        head,
        halo,
        bodyVisual: visualOf(body, fadeTexture),
        headVisual: visualOf(head, plainTexture),
        bodyRestScale: body ? body.getTransform().getLocalScale() : new vec3(80, 140, 64),
        haloRestScale: halo ? halo.getTransform().getLocalScale() : new vec3(36, 36, 36),
        phone: phoneRig,
        screenVisuals,
        coneVisuals,
        zzz,
        zzzText,
        ring,
        ringVisuals,
        shadow,
        shadowFade: -1,
        headRestScale: head ? head.getTransform().getLocalScale() : new vec3(22, 25, 22),
      };
    });
  }

  /** `fade` 0..1 is the Placing fade-in / Summary fade-out. */
  apply(i: number, look: AudienceLook, fade: number): void {
    const m = this.members[i];
    if (!m) return;
    const c = look.bodyColor;
    const h = look.headColor;
    if (m.bodyVisual) m.bodyVisual.mainPass.baseColor = new vec4(c[0], c[1], c[2], c[3] * fade);
    if (m.headVisual) m.headVisual.mainPass.baseColor = new vec4(h[0], h[1], h[2], h[3] * fade);

    const slump = Math.min(1, look.headPitchDeg / 38);
    const lean = (look.headPitchDeg * LEAN_SHARE * Math.PI) / 180;
    const k = look.bodyScaleY;
    if (m.body) {
      const t = m.body.getTransform();
      t.setLocalRotation(quat.angleAxis(lean, new vec3(1, 0, 0)));
      const cy = BODY_REST_Y * k;
      t.setLocalPosition(new vec3(0, cy * Math.cos(lean), cy * Math.sin(lean)));
      t.setLocalScale(new vec3(m.bodyRestScale.x, BODY_REST_H * k, m.bodyRestScale.z));
    }
    const hy = HEAD_REST_Y * k;
    const headPos = new vec3(0, hy * Math.cos(lean) + look.headDropCm, hy * Math.sin(lean) + HEAD_FORWARD_CM * slump);
    if (m.head) {
      const ht = m.head.getTransform();
      ht.setLocalPosition(headPos);
      // Cycle 6 (D2): creeping toward the viewer must not make the slumped head draw larger than the lit one.
      const ds = headDepthScale(headPos.z, DEFAULT_TUNABLES.stageDistanceCm);
      ht.setLocalScale(new vec3(m.headRestScale.x * ds, m.headRestScale.y * ds, m.headRestScale.z * ds));
      ht.setLocalRotation(quat.angleAxis((-look.headTiltDeg * Math.PI) / 180, new vec3(0, 0, 1)));
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
      m.screenVisuals.forEach((v) => (v.mainPass.baseColor = new vec4(PHONE_RGB[0], PHONE_RGB[1], PHONE_RGB[2], 0.95 * glow)));
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

  /** World position of member `i`'s visible "zzz" marker, or null when it is hidden (the nudge chevron keeps clear of it). */
  zzzWorld(i: number): vec3 | null {
    const m = this.members[i];
    if (!m || !m.zzz.enabled) return null;
    return m.zzz.getTransform().getWorldPosition();
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
