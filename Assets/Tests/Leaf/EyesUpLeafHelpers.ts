/**
 * Shared steps for the Eyes Up LEAF scenarios (one scenario per done criterion in
 * devpost/design-brief.md). LEAF cannot move the preview camera, so gaze is injected through
 * EyesUpApp.useScriptedGazeNow() → ScriptedGazeProvider (brief "Risks").
 */
import { DefaultLeafInteractor } from 'Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor';
import { findInteractableByName } from 'Leaf.lspkg/Interactors/InteractableUtils';
import { UpdateDispatcher } from 'Leaf.lspkg/Utils/common/UpdateDispatcher';
import { findSceneObjectByName, sleep, waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { EyesUpApp } from '../../Scripts/EyesUpApp';
import { ScriptedGazeProvider } from '../../Scripts/GazeProvider';
import { PHONE_BOTTOM_BELOW_CENTER_CM, PHONE_Y_CM } from '../../Scripts/core/AudienceLook';
import { EyesUpSession } from '../../Scripts/core/EyesUpSession';

export interface Rig {
  app: EyesUpApp;
  session: EyesUpSession;
  gaze: ScriptedGazeProvider;
  interactor: DefaultLeafInteractor;
}

/**
 * Wait for the lens to initialize, switch to scripted gaze looking straight ahead (level).
 * `audience`: pinch that Setup segment (3, 6 or 9). Leave it out to keep the Setup default (3 people since Cycle 3, so the whole room fits the lens viewport).
 */
export async function setUp(audience?: 3 | 6 | 9): Promise<Rig> {
  await sleep(1500);
  const root = findSceneObjectByName('EyesUp');
  if (!root) throw new Error('EyesUp root not found');
  const app = root.getComponent(EyesUpApp.getTypeName()) as EyesUpApp;
  if (!app) throw new Error('EyesUpApp component not found');
  // Canonical reset (Cycle 4, D1): gaze re-synced to the live camera (no yaw left over from the last run) ...
  const gaze = app.resetScriptedGaze();
  const rig = { app, session: app.getSession(), gaze, interactor: new DefaultLeafInteractor() };
  // ... a leftover Rehearsal / Summary closed back to Setup (a new Start resets engagement, cards and stats) ...
  await returnToSetup(rig);
  // ... and the audience segment pinched explicitly: the Setup default (3) when the scenario names none.
  await tap(rig, `Audience_${audience ?? 3}`);
  await sleep(300);
  return rig;
}

/** Bring a Lens that a previous scenario left in Placing, Rehearsal, Finishing or Summary back to Setup. */
export async function returnToSetup(rig: Rig): Promise<void> {
  const s = rig.session;
  if (s.phase === 'Setup') return;
  if (s.phase === 'Placing') await waitUntil(() => s.phase === 'Rehearsal', 5000);
  if (s.phase === 'Rehearsal') s.finish();
  if (s.phase === 'Finishing') await waitUntil(() => s.phase === 'Summary', 5000);
  if (s.phase === 'Summary') s.done();
  await waitUntil(() => s.phase === 'Setup', 3000, () => 'setup');
  await sleep(300);
}

/**
 * Viewport check (Cycle 4, D1): every active member's head (centre +-20 cm sideways and up/down) projects inside the
 * lens viewport with a 10 % margin. Uses the preview camera, so run it from the canonical camera pose
 * (scripts/video/preview-reset.sh). Returns the worst offending coordinate in 0..1 viewport units (inside = within 0.05..0.95).
 */
export function headFrameProblems(rig: Rig): string[] {
  const camSo = findSceneObjectByName('Camera Object');
  const cam = camSo ? (camSo.getComponent('Component.Camera') as Camera) : null;
  if (!cam) throw new Error('Camera Object has no Camera');
  const problems: string[] = [];
  const members = rig.app.audienceMembers();
  const count = rig.session.config.audienceCount;
  for (let i = 0; i < count; i++) {
    let head: SceneObject | null = null;
    for (let k = 0; k < members[i].getChildrenCount(); k++) if (members[i].getChild(k).name === 'Head') head = members[i].getChild(k);
    if (!head) throw new Error(`Head of member ${i} not found`);
    const c = head.getTransform().getWorldPosition();
    const right = members[i].getTransform().right.uniformScale(20);
    const up = vec3.up().uniformScale(20);
    for (const p of [c.add(right), c.sub(right), c.add(up), c.sub(up)]) {
      const sp = cam.worldSpaceToScreenSpace(p);
      if (sp.x < 0.05 || sp.x > 0.95 || sp.y < 0.05 || sp.y > 0.95) problems.push(`member ${i} head edge at (${sp.x.toFixed(2)}, ${sp.y.toFixed(2)})`);
    }
  }
  return problems;
}

/**
 * Cycle 5 (R2): the slumped members' phone glow must end inside the bottom 4 % of the viewport at the canonical pose
 * (phone centre PHONE_Y_CM above the member's floor, its lowest edge PHONE_BOTTOM_BELOW_CENTER_CM below that).
 */
export function phoneBottomProblems(rig: Rig): string[] {
  const camSo = findSceneObjectByName('Camera Object');
  const cam = camSo ? (camSo.getComponent('Component.Camera') as Camera) : null;
  if (!cam) throw new Error('Camera Object has no Camera');
  const problems: string[] = [];
  const members = rig.app.audienceMembers();
  for (let i = 0; i < rig.session.config.audienceCount; i++) {
    const p = members[i].getTransform().getWorldPosition();
    const sp = cam.worldSpaceToScreenSpace(new vec3(p.x, p.y + PHONE_Y_CM - PHONE_BOTTOM_BELOW_CENTER_CM, p.z));
    if (sp.y < 0.04 || sp.y > 0.96) problems.push(`member ${i} phone glow bottom at y ${sp.y.toFixed(2)}`);
  }
  return problems;
}

export async function tap(rig: Rig, name: string): Promise<void> {
  const target = findInteractableByName(name, undefined, true);
  if (!target) throw new Error(`Interactable "${name}" not found or not enabled`);
  await rig.interactor.trigger(target);
}

/** Pinch Start on the Setup panel; returns once the pinch completed. */
export async function pressStart(rig: Rig): Promise<void> {
  await tap(rig, 'StartButton');
}

export async function startAndWaitForRehearsal(rig: Rig): Promise<void> {
  await pressStart(rig);
  await waitUntil(() => rig.session.phase === 'Rehearsal', 5000);
}

export function lookAtMember(rig: Rig, i: number): void {
  const layout = rig.session.layout;
  if (!layout) throw new Error('no stage layout yet');
  rig.gaze.lookAt(layout.eyeTargets[i]);
}

export function lookAtPill(rig: Rig): void {
  const layout = rig.session.layout;
  if (!layout) throw new Error('no stage layout yet');
  // Pass 6: aim at the pill as it is on screen (the dwell hit test uses its live rectangle).
  const rect = rig.session.pillRect;
  rig.gaze.lookAt(rect ? rect.center : layout.cardAnchor);
}

/** Pitch the scripted gaze ~29° down (podium shows at ≥ podiumPitchDeg, 15° by default) and wait for it to appear. */
export async function lookDownAtPodium(rig: Rig): Promise<void> {
  const layout = rig.session.layout;
  if (!layout) throw new Error('no stage layout yet');
  rig.gaze.lookAt(layout.podiumPosition);
  await waitUntil(() => {
    const b = findSceneObjectByName('NextButton');
    return !!b && b.isEnabledInHierarchy;
  }, 3000);
  await sleep(200);
}

/**
 * Capture helpers only: hide the LEAF on-screen log strip (`LeafDebugUICamera`) every frame until
 * `holdSeconds` after the returned `release()` is called, so a screenshot taken after the scenario
 * returns is clean.
 */
export function muteLeafOverlay(holdSeconds = 60): () => void {
  const dispatcher = UpdateDispatcher.getInstance();
  const hide = () => {
    const overlay = findSceneObjectByName('LeafDebugUICamera');
    if (overlay && overlay.enabled) overlay.enabled = false;
  };
  const unsubscribe = dispatcher.onUpdate.add(hide);
  hide();
  return () => dispatcher.createDelayedEvent(() => unsubscribe(), holdSeconds);
}

export function textOf(name: string): string {
  const so = findSceneObjectByName(name);
  if (!so) throw new Error(`${name} not found`);
  const t = so.getComponent('Component.Text') as Text;
  return t ? t.text : '';
}

/** Text of the box named `name` (UIKit boxes keep their Text on a child called "Label"). */
export function boxTextOf(name: string): string {
  const so = findSceneObjectByName(name);
  if (!so) throw new Error(`${name} not found`);
  for (let i = 0; i < so.getChildrenCount(); i++) {
    const c = so.getChild(i);
    const t = c.getComponent('Component.Text') as Text;
    if (t) return t.text;
  }
  return '';
}

/** Local Y of the Head child of audience member `i` (the game layer sinks it as the member disengages). */
export function headYOf(rig: Rig, i: number): number {
  const member = rig.app.audienceMembers()[i];
  for (let k = 0; k < member.getChildrenCount(); k++) {
    const c = member.getChild(k);
    if (c.name === 'Head') return c.getTransform().getLocalPosition().y;
  }
  throw new Error(`Head of member ${i} not found`);
}
