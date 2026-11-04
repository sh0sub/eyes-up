/**
 * AudienceRig.ts — Lens adapter for the game layer's silhouette look (core/AudienceLook.ts).
 *
 * Each Audience_i holds Body (box 80 x 140 x 64), Head (ellipsoid) and Halo children. The rig
 * clones the Body / Head materials per member (otherwise every silhouette shares one tint), then
 * per frame: tints them, leans the body forward about the feet, sinks and pushes the head forward
 * (the head is a sphere, so a pitch would be invisible: the droop is position), lights an amber
 * phone-glow quad at the lap, and pulses the Halo ring on a perk-up burst.
 * Local axes: the silhouette faces +Z (the speaker), so a forward lean is +Z.
 */
import { AudienceLook } from './core/AudienceLook';
import { addSurface, child } from './EyesUpUI';

const BODY_REST_Y = 70;
const BODY_REST_H = 140;
const HEAD_REST_Y = 153;
/** Forward lean of the body, as a share of the head pitch. */
const LEAN_SHARE = 0.35;
/** The head also creeps toward the speaker by this many cm at full slump. */
const HEAD_FORWARD_CM = 8;
/** A small bright phone screen with a soft halo behind it; sized to read at 2.5 m without becoming a card. */
const PHONE_W = 8;
const PHONE_H = 13;
const GLOW_W = 20;
const GLOW_H = 26;
const PHONE_RGB: [number, number, number] = [1.0, 0.8, 0.3];

interface Member {
  body: SceneObject | null;
  head: SceneObject | null;
  halo: SceneObject | null;
  bodyVisual: RenderMeshVisual | null;
  headVisual: RenderMeshVisual | null;
  bodyRestScale: vec3;
  haloRestScale: vec3;
  phone: SceneObject;
  phoneVisual: RenderMeshVisual;
  glowVisual: RenderMeshVisual;
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
      const phone = child(root, 'Phone', new vec3(0, 84, 42));
      // Tilted back like a phone held at the lap; the soft glow sits just behind the bright screen.
      phone.getTransform().setLocalRotation(quat.angleAxis(-Math.PI / 4, new vec3(1, 0, 0)));
      const glowVisual = addSurface(child(phone, 'Glow', new vec3(0, 0, -0.1)), GLOW_W, GLOW_H, 0, new vec4(PHONE_RGB[0], PHONE_RGB[1], PHONE_RGB[2], 0), null);
      const phoneVisual = addSurface(child(phone, 'Screen'), PHONE_W, PHONE_H, 0, new vec4(PHONE_RGB[0], PHONE_RGB[1], PHONE_RGB[2], 0), null);
      phone.enabled = false;
      return {
        body,
        head,
        halo,
        bodyVisual: visualOf(body),
        headVisual: visualOf(head),
        bodyRestScale: body ? body.getTransform().getLocalScale() : new vec3(80, 140, 64),
        haloRestScale: halo ? halo.getTransform().getLocalScale() : new vec3(36, 36, 36),
        phone,
        phoneVisual,
        glowVisual,
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
    if (m.head) m.head.getTransform().setLocalPosition(headPos);
    if (m.halo) {
      // The halo ring stays around the head as it sinks, and pops outward on a perk-up burst.
      const s = look.haloBurstScale;
      const t = m.halo.getTransform();
      t.setLocalPosition(headPos);
      t.setLocalScale(new vec3(m.haloRestScale.x * s, m.haloRestScale.y * s, m.haloRestScale.z * s));
    }
    const glow = look.phoneGlow * fade;
    if (m.phone.enabled !== glow > 0.01) m.phone.enabled = glow > 0.01;
    if (glow > 0.01) {
      m.phoneVisual.mainPass.baseColor = new vec4(PHONE_RGB[0], PHONE_RGB[1], PHONE_RGB[2], 0.95 * glow);
      m.glowVisual.mainPass.baseColor = new vec4(PHONE_RGB[0], PHONE_RGB[1], PHONE_RGB[2], 0.2 * glow);
    }
  }

  /** Hide every phone (used when the audience is hidden). */
  hidePhones(): void {
    this.members.forEach((m) => (m.phone.enabled = false));
  }
}
