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
import { EyesUpSession } from '../../Scripts/core/EyesUpSession';

export interface Rig {
  app: EyesUpApp;
  session: EyesUpSession;
  gaze: ScriptedGazeProvider;
  interactor: DefaultLeafInteractor;
}

/** Wait for the lens to initialize, switch to scripted gaze looking straight ahead (level). */
export async function setUp(): Promise<Rig> {
  await sleep(1500);
  const root = findSceneObjectByName('EyesUp');
  if (!root) throw new Error('EyesUp root not found');
  const app = root.getComponent(EyesUpApp.getTypeName()) as EyesUpApp;
  if (!app) throw new Error('EyesUpApp component not found');
  const gaze = app.useScriptedGazeNow();
  const f = gaze.forward;
  const flat = new vec3(f.x, 0, f.z);
  gaze.setForward(flat.length > 1e-4 ? { x: flat.x, y: 0, z: flat.z } : { x: 0, y: 0, z: -1 });
  return { app, session: app.getSession(), gaze, interactor: new DefaultLeafInteractor() };
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
