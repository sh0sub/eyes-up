/**
 * LEAF `demo_reel` (pass 3): a deterministic ~75 s showcase for the demo video, NOT a done
 * criterion. Everything runs through the real app: gaze comes from ScriptedGazeProvider and pinches
 * are LEAF interactor triggers on the real UIKit Buttons. Nothing is staged or sped up, and no
 * tunable is changed.
 *
 * Order: Setup panel → pinch Start → audience appears → gaze sweeps center → right with halos
 * filling → long stare at the right → left neglect nudge (chime + chevron) → gaze moves left and the
 * chevron clears → podium → Next → "Why glasses" card → pill after 4 s → dwell on the pill → card
 * re-expands → podium → Finish → applause → Summary.
 *
 * Demo-only additions (scenario-local, the lens is unchanged):
 *  - a small gaze reticle at the scripted gaze target. LEAF can't move the preview camera, so
 *    without it the viewer can't see where the simulated head points.
 *  - the LEAF on-screen log strip (`LeafDebugUICamera`) is muted and hidden during the run and for
 *    15 s after it.
 *  - every step and every session event is printed as `[demo_reel] t=<s>s <event>` (t from the
 *    scenario start) so devpost/demo-reel-timeline.md can be written from a real run.
 */
import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { Logger, LogLevel } from 'Leaf.lspkg/Utils/common/Logger';
import { UpdateDispatcher } from 'Leaf.lspkg/Utils/common/UpdateDispatcher';
import { findSceneObjectByName, sleep, waitUntil } from 'Leaf.lspkg/Utils/common/Utils';
import { addSurface, child, faceTowards } from '../../Scripts/EyesUpUI';
import { Rig, pressStart, setUp, tap } from './EyesUpLeafHelpers';

/** Reticle size as a fraction of its distance from the head (≈ 0.9° across). */
const RETICLE_ANGULAR = 0.016;
const RETICLE_OUTER = new vec4(1.0, 0.95, 0.8, 0.95);
const RETICLE_INNER = new vec4(1.0, 0.72, 0.25, 1.0);

class GazeReticle {
  private readonly root: SceneObject;
  private target: vec3 | null = null;

  constructor(private readonly rig: Rig) {
    this.root = global.scene.createSceneObject('DemoGazeReticle');
    const diamond = child(this.root, 'Diamond');
    diamond.getTransform().setLocalRotation(quat.angleAxis(Math.PI / 4, new vec3(0, 0, 1)));
    addSurface(diamond, 1, 1, 0, RETICLE_OUTER, null);
    const inner = child(diamond, 'Inner', new vec3(0, 0, 0.01));
    addSurface(inner, 0.5, 0.5, 0, RETICLE_INNER, null);
    this.root.enabled = false;
  }

  /** Point the scripted gaze at `p` and park the reticle just in front of it. */
  look(p: vec3): void {
    this.rig.gaze.lookAt({ x: p.x, y: p.y, z: p.z });
    this.target = p;
    this.root.enabled = true;
    this.update();
  }

  hide(): void {
    this.root.enabled = false;
  }

  update(): void {
    if (!this.target || !this.root.enabled) return;
    const o = this.rig.gaze.origin;
    const head = new vec3(o.x, o.y, o.z);
    const toHead = head.sub(this.target);
    const dist = toHead.length;
    const pos = this.target.add(toHead.normalize().uniformScale(Math.min(4, dist * 0.05)));
    const t = this.root.getTransform();
    t.setWorldPosition(pos);
    const s = Math.max(0.6, dist * RETICLE_ANGULAR);
    t.setLocalScale(new vec3(s, s, s));
    faceTowards(this.root, head, false);
  }
}

function worldPos(name: string): vec3 {
  const so = findSceneObjectByName(name);
  if (!so) throw new Error(`${name} not found`);
  return so.getTransform().getWorldPosition();
}

function v(p: { x: number; y: number; z: number }): vec3 {
  return new vec3(p.x, p.y, p.z);
}

@component
export class DemoReel extends Scenario {
  private t0 = 0;
  private readonly marks: string[] = [];

  private mark(event: string): void {
    const line = `t=${(getTime() - this.t0).toFixed(1)}s ${event}`;
    this.marks.push(line);
    print(`[demo_reel] ${line}`);
  }

  async run(): Promise<void> {
    this.t0 = getTime();
    const dispatcher = UpdateDispatcher.getInstance();
    const prevLevel = Logger.logLevel;
    Logger.logLevel = LogLevel.ERROR; // no on-screen INFO lines during the reel
    const hideOverlay = () => {
      const overlay = findSceneObjectByName('LeafDebugUICamera');
      if (overlay && overlay.enabled) overlay.enabled = false;
    };
    const unsubscribeHide = dispatcher.onUpdate.add(hideOverlay);
    hideOverlay();
    try {
      await this.reel();
    } finally {
      Logger.logLevel = prevLevel;
      dispatcher.createDelayedEvent(() => unsubscribeHide(), 15);
      print(`[demo_reel] TIMELINE\n${this.marks.join('\n')}`);
    }
  }

  private async reel(): Promise<void> {
    this.mark('scenario start; Setup panel on screen (lens just reset)');
    const rig = await setUp(); // 1.5 s settle, then scripted gaze, level
    const session = rig.session;
    const reticle = new GazeReticle(rig);
    const unsubscribeReticle = UpdateDispatcher.getInstance().onUpdate.add(() => reticle.update());

    session.onEvent((e) => {
      if (e.type === 'phase') this.mark(`phase ${e.from} → ${e.to}`);
      else if (e.type === 'card') this.mark(`cue card "${e.title}" (${e.reason})`);
      else if (e.type === 'pill') this.mark(`card shrinks to pill "${e.tag}"`);
      else if (e.type === 'nudgeStart') this.mark(`NUDGE ${e.side}: chime from the ${e.side} + amber chevron`);
      else if (e.type === 'nudgeEnd') this.mark(`nudge ends (${e.reason})`);
    });
    const member = (i: number): vec3 => {
      const layout = session.layout;
      if (!layout) throw new Error('no stage layout yet');
      return v(layout.eyeTargets[i]);
    };
    const lookMember = (i: number) => {
      reticle.look(member(i));
      this.mark(`gaze → audience #${i + 1}`);
    };

    // ---- Setup (≈ 12 s on screen) ----
    await sleep(3500);
    reticle.look(worldPos('LengthButton'));
    this.mark('gaze reads the Setup panel: Length');
    await sleep(1700);
    reticle.look(worldPos('AudienceButton'));
    this.mark('gaze: Audience');
    await sleep(1700);
    reticle.look(worldPos('DeckButton'));
    this.mark('gaze: Deck');
    await sleep(1700);
    reticle.look(worldPos('StartButton'));
    this.mark('gaze: Start rehearsal');
    await sleep(1800);
    this.mark('pinch Start (simulated)');
    await pressStart(rig);
    // Level gaze before the 0.3 s shrink ends, so the stage is laid out straight ahead.
    const f = rig.gaze.forward;
    rig.gaze.setForward({ x: f.x, y: 0, z: f.z });
    reticle.hide();
    await waitUntil(() => session.phase === 'Rehearsal', 5000, () => 'rehearsal');
    // The left zone is never watched, so its 8 s neglect clock runs from the rehearsal start: the
    // sweep (center → right) fits in the first ~5.5 s, then the stare on the far right lasts until
    // the nudge fires at ~8 s.
    await sleep(700);

    // ---- Sweep center → right, halos fill ----
    for (const i of [2, 3, 4]) {
      lookMember(i);
      await sleep(1600);
    }
    // ---- Long stare at the right side until the left nudge ----
    lookMember(5);
    this.mark('long stare at the right side');
    await waitUntil(() => !!session.activeNudge && session.activeNudge.side === 'left', 15000, () => 'left nudge');
    await sleep(1800); // chevron + chime on screen (hint lasts 3 s unless looked at)

    // ---- Look left: the chevron clears ----
    lookMember(1);
    await waitUntil(() => !session.activeNudge, 1500, () => 'nudge cleared');
    this.mark('chevron cleared (looked left)');
    await sleep(1800);
    lookMember(0);
    await sleep(2000);
    lookMember(2);
    await sleep(1600);
    lookMember(4);
    await sleep(1600);

    // ---- Podium → Next → "Why glasses" ----
    const podium = v((session.layout as NonNullable<typeof session.layout>).podiumPosition);
    reticle.look(podium);
    this.mark('look down: podium appears');
    await waitUntil(() => {
      const b = findSceneObjectByName('NextButton');
      return !!b && b.isEnabledInHierarchy;
    }, 3000);
    await sleep(1500);
    reticle.look(worldPos('NextButton'));
    await sleep(800);
    this.mark('pinch Next (simulated)');
    await tap(rig, 'NextButton');
    const card = v((session.layout as NonNullable<typeof session.layout>).cardAnchor);
    reticle.look(card);
    this.mark('gaze up to the cue card');
    await waitUntil(() => session.cardMode === 'pill', 6000, () => 'pill');
    await sleep(800);

    // ---- Look at the audience, then dwell on the pill ----
    lookMember(5);
    await sleep(1800);
    lookMember(1);
    await sleep(1800);
    lookMember(3);
    await sleep(1600);
    reticle.look(card);
    this.mark('gaze dwells on the pill');
    await waitUntil(() => session.cardMode === 'card', 3000, () => 'card re-expands');
    await sleep(3000);
    // ---- Talk to the room: every zone gets a look ----
    lookMember(0);
    await sleep(1600);
    lookMember(4);
    await sleep(1600);
    lookMember(2);
    await sleep(1600);
    lookMember(5);
    await sleep(1600);

    // ---- Podium → Finish → applause → Summary ----
    reticle.look(podium);
    this.mark('look down: podium');
    await sleep(1500);
    reticle.look(worldPos('FinishButton'));
    await sleep(800);
    this.mark('pinch Finish (simulated)');
    await tap(rig, 'FinishButton');
    const f2 = rig.gaze.forward;
    rig.gaze.setForward({ x: f2.x, y: 0, z: f2.z });
    reticle.hide();
    await waitUntil(() => session.phase === 'Summary', 4000, () => 'summary');
    const s = session.summary;
    if (s) this.mark(`Summary zone %: left ${s.zonePercents[0]} / center ${s.zonePercents[1]} / right ${s.zonePercents[2]}`);
    await sleep(14000);
    unsubscribeReticle();
    this.mark('reel end (Summary still on screen)');
  }
}
