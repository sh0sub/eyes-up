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
import { AudienceLook } from './core/AudienceLook';
import { addSurface, addText, child } from './EyesUpUI';

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
const PHONE_W = 9;
const PHONE_H = 14;
const PHONE_CORNER = 1.6;
const CONE_STEPS = 4;
const PHONE_RGB: [number, number, number] = [1.0, 0.8, 0.3];
/** 'zzz' marker: lavender, above the sunk head and clear of the head (and of the nudge chevron on its side). Title2 at 420 cm is about 7 cm tall in the silhouette's space. */
const ZZZ_RGB = new vec4(0.85, 0.85, 1.0, 1);
const ZZZ_DIST = 420;
/** Perk-up ring pulse: a thin cyan ring of short bars (the display has no hollow disc), radius 20 cm at scale 1. */
const RING_SEGMENTS = 24;
const RING_RADIUS = 20;
const RING_BAR_LEN = 6;
const RING_BAR_THICK = 1.5;
const RING_RGB: [number, number, number] = [0.35, 0.95, 1.0];

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
}

function byName(parent: SceneObject, name: string): SceneObject | null {
  for (let i = 0; i < parent.getChildrenCount(); i++) {
    const c = parent.getChild(i);
    if (c.name === name) return c;
  }
  return null;
}

function visualOf(so: SceneObject | null): RenderMeshVisual | null {
  if (!so) return null;
  const v = so.getComponent('Component.RenderMeshVisual') as RenderMeshVisual;
  if (!v) return null;
  v.mainMaterial = v.mainMaterial.clone();
  return v;
}

export class AudienceRig {
  private members: Member[] = [];

  constructor(audience: SceneObject[]) {
    this.members = audience.map((root) => {
      const body = byName(root, 'Body');
      const head = byName(root, 'Head');
      const halo = byName(root, 'Halo');
      const phoneRig = child(root, 'PhoneRig');
      const phone = child(phoneRig, 'Phone', new vec3(0, 80, 44));
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
      const cone = child(phoneRig, 'PhoneCone', new vec3(0, 88, 40));
      const coneVisuals: RenderMeshVisual[] = [];
      for (let k = 0; k < CONE_STEPS; k++) {
        const w = PHONE_W + 7 * (k + 1);
        coneVisuals.push(addSurface(child(cone, `Cone${k}`, new vec3(0, 7 + 9 * k, -0.2 - 0.05 * k)), w, 12, 0, clear, null));
      }
      cone.getTransform().setLocalRotation(quat.angleAxis(-Math.PI / 10, new vec3(1, 0, 0)));
      phoneRig.enabled = false;
      const zzz = child(root, 'Zzz', new vec3(14, 170, 20));
      const zzzText = addText(zzz, 'ZzzText', 'zzz', 'Title2', 14, 8, ZZZ_DIST, ZZZ_RGB, new vec3(0, 0, 0));
      zzz.enabled = false;
      const ring = child(root, 'PerkRing', new vec3(0, HEAD_REST_Y, 14));
      const ringVisuals: RenderMeshVisual[] = [];
      for (let k = 0; k < RING_SEGMENTS; k++) {
        const a = (k / RING_SEGMENTS) * 2 * Math.PI;
        const bar = child(ring, `Seg${k}`, new vec3(Math.cos(a) * RING_RADIUS, Math.sin(a) * RING_RADIUS, 0));
        bar.getTransform().setLocalRotation(quat.angleAxis(a + Math.PI / 2, new vec3(0, 0, 1)));
        ringVisuals.push(addSurface(bar, RING_BAR_LEN, RING_BAR_THICK, 0, new vec4(RING_RGB[0], RING_RGB[1], RING_RGB[2], 0), null));
      }
      ring.enabled = false;
      return {
        body,
        head,
        halo,
        bodyVisual: visualOf(body),
        headVisual: visualOf(head),
        bodyRestScale: body ? body.getTransform().getLocalScale() : new vec3(80, 140, 64),
        haloRestScale: halo ? halo.getTransform().getLocalScale() : new vec3(36, 36, 36),
        phone: phoneRig,
        screenVisuals,
        coneVisuals,
        zzz,
        zzzText,
        ring,
        ringVisuals,
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
      ht.setLocalRotation(quat.angleAxis((-look.headTiltDeg * Math.PI) / 180, new vec3(0, 0, 1)));
    }
    if (m.halo) {
      // The halo ring stays around the head as it sinks, and pops outward on a perk-up burst.
      const s = look.haloBurstScale;
      const t = m.halo.getTransform();
      t.setLocalPosition(headPos);
      t.setLocalScale(new vec3(m.haloRestScale.x * s, m.haloRestScale.y * s, m.haloRestScale.z * s));
    }
    const pa = look.pulseAlpha * fade;
    if (m.ring.enabled !== pa > 0.01) m.ring.enabled = pa > 0.01;
    if (pa > 0.01) {
      const rt = m.ring.getTransform();
      rt.setLocalPosition(new vec3(headPos.x, headPos.y, headPos.z + 14));
      rt.setLocalScale(new vec3(look.pulseScale, look.pulseScale, 1));
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
      m.zzz.getTransform().setLocalPosition(new vec3(headPos.x + 14, headPos.y + 32, headPos.z + 6));
      m.zzzText.textFill.color = new vec4(ZZZ_RGB.x, ZZZ_RGB.y, ZZZ_RGB.z, z);
    }
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
