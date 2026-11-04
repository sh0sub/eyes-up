/**
 * EyesUpApp.ts — Lens component on the `EyesUp` root: state machine host, service injection,
 * tunables (plan: angle 7°, fill 1 s, drain 12 s, nudge 8 s, card 4 s, dwell 1 s).
 *
 * All behavior lives in core/EyesUpSession.ts (unit + integration tested in Node). This file only
 * adapts Lens Studio objects to the session's view interfaces and forwards pinches.
 * Checked in Lens Studio 5.24.1 (Spectacles target):
 *  - camera look direction = Transform.back (see GazeProvider.ts)
 *  - halo color via RenderMeshVisual.mainPass.baseColor (vec4 rgba). The halo material is cloned
 *    per member at awake, otherwise every halo shares one material and lights up together.
 *  - AudioComponent.play(1) for chime/tick/tone/applause; unwired audio slots are skipped.
 *    NudgeAudio_L / NudgeAudio_R are children of the camera at x = ∓100 cm with Spatial Audio +
 *    Position Effect on, so the chime comes from the neglected side (pass 2).
 *
 * Scene contract (built by CLAD): `audienceRoot` holds Audience_1..9, each with a child `Halo`
 * (RenderMeshVisual). If the `audience` / `halos` arrays are not wired, they are collected from
 * `audienceRoot` at awake.
 */
import { AudienceRig } from './AudienceRig';
import { HaloVisual } from './AttentionMeter';
import { CueCardView } from './CueCardController';
import { getDeck } from './DeckData';
import { chevronAlpha, chevronPulse } from './NudgeController';
import { CameraGazeProvider, ScriptedGazeProvider, SwitchableGazeProvider } from './GazeProvider';
import { PODIUM_H_CM, PODIUM_W_CM, Podium } from './Podium';
import { RoomMeter } from './RoomMeter';
import { SetupPanel } from './SetupPanel';
import { StageLayout } from './StagePlacer';
import { SummaryPanel } from './SummaryPanel';
import { AudienceLook } from './core/AudienceLook';
import { AudienceView, EyesUpSession, SessionViews } from './core/EyesUpSession';
import { PillRect } from './core/PillHit';
import { ChevronBox, PlaneRect, placeChevron } from './core/ChevronPlacement';
import { podiumState } from './core/PodiumModel';
import { Vec3Like } from './core/math';
import { ACCENT_CYAN, addIcon, addSurface, child, faceTowards } from './EyesUpUI';

/**
 * Pass 5 nudge chevron (artifact S3): a 6 × 6 cm amber double chevron ("‹‹" / "››", Material
 * keyboard_double_arrow_*) above a "left" / "right" caption. The hint's scene Text (±20 cm, 100 cm
 * ahead of the camera) becomes the caption; the icon is added at awake 4 cm above it.
 */
const CHEVRON_CM = 10;
const CHEVRON_ICON_Y = 6.5;
/** Cycle 2 (M5): no box around the chevron; it is the icon plus caption. These are their extents about the hint origin (cm), used for placement only. */
const CHEVRON_EXT_HALF_W = 5.5;
const CHEVRON_EXT_BELOW = 1.5;
const CHEVRON_EXT_ABOVE = 11.5;
/** A member's body is about this wide (half, cm in the stage) for the chevron's keep-clear rects. */
const MEMBER_BODY_HALF_W_CM = 26;
/** Round 7: hint x offset (was 20) and drop so the backing clears the opening pill's corner in the nudge still. */
const CHEVRON_X_CM = 21;
/** Round 7: hint dropped this far so the backing's top edge sits below the pill's bottom edge. */
const CHEVRON_DROP_CM = 6.5;
/** Hint plane: the chevron is head-locked 100 cm ahead; panels are projected into that plane for placement. */
const CHEVRON_PLANE_CM = 100;
/** Clear gap kept between the chevron backing and any panel (cm in the plane). */
const CHEVRON_PANEL_MARGIN_CM = 1.5;
/** Backing extents about the hint origin at the largest pulse scale (1.05). */
const CHEVRON_BOX: ChevronBox = {
  halfW: CHEVRON_EXT_HALF_W * 1.05,
  below: CHEVRON_EXT_BELOW * 1.05,
  above: CHEVRON_EXT_ABOVE * 1.05,
};
const CHEVRON_TEXT = new vec4(1.0, 0.82, 0.35, 1);
/** ≈ 1.5 cm caption at 100 cm (S3: "left" 1.5 cm). */
const CHEVRON_CAPTION_SIZE = 150;

/** Stage line colors (design): cool white while running, amber at 0 s. Never black. */
const LINE_COLOR: [number, number, number] = [0.75, 0.85, 1.0];
const LINE_AMBER: [number, number, number] = [1.0, 0.72, 0.2];

/** Panel placement (brief "Where things live"). */
const SETUP_DISTANCE_CM = 110;
/** Round 6: negative = above eye level; the panel clears the room's wall art in Preview and on device. */
const SETUP_BELOW_EYES_CM = -10;
const SUMMARY_DISTANCE_CM = 150;
/** Round 6: raised so the stat tiles and tip clear the room's wall art (additive display: art shows through any fill). */
const SUMMARY_ABOVE_EYES_CM = 29;
/** design: panels follow the head only while the preview/device pose settles, then stay put. */
const PANEL_SETTLE_SECONDS = 1.0;

/**
 * Pass 4 cue card (artifact S4, widened per its own note): a 64 × 26 cm backing at 2.5 m, title
 * (size 240, was 200) and two bullets (140, was 130), and a cyan countdown line that empties over the 4 s.
 * The pill keeps 90 % of card scale (was 40 %) so the 3-word tag reads from the start position.
 */
/**
 * Game pass (jury: "cue card text too small at Spectacles scale"): title 240 -> 290, bullets 140 -> 180, card
 * 64 x 26 -> 84 x 34 cm, pill height 10 -> 12 cm. The pill's effective size is 290 x 1.2 = 348 (was 240 x 1.3 = 312).
 */
const CARD_W = 84;
const CARD_H = 34;
/** The card sits above the anchor (bottom edge 1 cm below it) so it clears the audience's heads and the room meter. */
const CARD_CENTER_Y = 16;
const CARD_TITLE_Y = 25.5;
const CARD_BODY_Y = 13.2;
const CARD_COUNTDOWN_Y = 1.6;
const CARD_COUNTDOWN_W = 78;
const CARD_TITLE_SIZE = 290;
const CARD_BODY_SIZE = 180;
const PILL_SCALE = 1.2;
const PILL_H = 12;
const PILL_Y = 11;
/**
 * The room meter floats between the heads and the card. Raised 6 cm (was 4 cm below the anchor, now 6 cm above; Cycle 2: with 3 members 42 cm apart the outer halos reached the label) so lit halos
 * (burst ring up to 1.6x) no longer cover it; the card is lifted by the same amount so the two never overlap.
 */
const METER_BELOW_ANCHOR_CM = -8;
const CARD_LIFT_CM = 14;
/**
 * Cycle 3 (S4): a faint dark rounded plate stands 40 cm behind the audience so the busy wall frames do not sit behind heads and bodies.
 * It is an alpha-blended plate for the Preview; on an additive display a dark plate adds nothing (black is clear), so it costs nothing there.
 */
const SCRIM_BEHIND_CM = 40;
const SCRIM_PAD_CM = 40;
const SCRIM_HEIGHT_CM = 205;
const SCRIM_CENTER_ABOVE_FLOOR_CM = 78;
const SCRIM_CORNER_CM = 9;
const SCRIM_COLOR = new vec4(0.03, 0.05, 0.16, 0.35);
/** Room meter plate extents about its centre (cm, local): track 52 + label 28 + padding, 3 + padding tall (RoomMeter.ts). */
const METER_HALF_W_CM = 47;
const METER_HALF_H_CM = 4.4;
/** Footprint of a "zzz" marker in the member's space (cm), kept clear by the nudge chevron. */
const ZZZ_HALF_W_CM = 11;
const ZZZ_HALF_H_CM = 6;
/** Halo alpha above this counts as lit: the chevron then stays above the head line. */
const LIT_HALO_ALPHA = 0.55;
/** Lit halo ring radius around a head, cm (rest scale 36 cm, diameter). */
const LIT_HALO_RADIUS_CM = 22;
/** Measured in Preview: ≈ 0.0124 cm per size unit per glyph for Inter titles (size 200 → 2.5 cm). */
const PILL_GLYPH_CM = 0.0124 * CARD_TITLE_SIZE;
/** Game pass (jury: grey-on-grey): a deeper indigo card with a bright cyan frame; white text keeps its contrast. */
const CARD_FILL = new vec4(0.1, 0.18, 0.46, 0.93);
const CARD_FRAME = new vec4(0.5, 0.88, 1.0, 0.95);

@component
export class EyesUpApp extends BaseScriptComponent {
  // ---- tunables (plan) ----
  @input @hint('Gaze counts as "looking at" within this angle (deg)') lookAngleDeg: number = 7;
  @input @hint('Seconds for a halo to fill') fillSeconds: number = 1;
  @input @hint('Seconds for a halo to drain') drainSeconds: number = 12;
  @input @hint('Seconds a zone may stay below 0.2 before a nudge') nudgeSeconds: number = 8;
  @input @hint('Seconds the cue card stays open') cardSeconds: number = 4;
  @input @hint('Seconds of gaze on the pill to re-open the card') dwellSeconds: number = 1;
  @input @hint('Head pitch (deg, downward) that shows the podium. Design pass 2: 15 (was 12)') podiumPitchDeg: number = 15;

  // ---- scene references ----
  @input camera!: SceneObject;
  @input @hint('Parent of Audience_1..9 (used when the arrays below are empty)') audienceRoot!: SceneObject;
  @input @allowUndefined @hint('Audience_1..9 roots, left to right (optional)') audience: SceneObject[] = [];
  @input @allowUndefined @hint('One halo visual per audience member (optional)') halos: RenderMeshVisual[] = [];
  @input cueCard!: SceneObject;
  @input cueCardTitle!: Text;
  @input cueCardBody!: Text;
  @input edgeHintLeft!: SceneObject;
  @input edgeHintRight!: SceneObject;
  @input @allowUndefined nudgeAudioL!: AudioComponent;
  @input @allowUndefined nudgeAudioR!: AudioComponent;
  @input stageLine!: SceneObject;
  @input stageLineVisual!: RenderMeshVisual;
  @input @allowUndefined tickAudio!: AudioComponent;
  @input @allowUndefined toneAudio!: AudioComponent;
  @input @allowUndefined applauseAudio!: AudioComponent;
  @input podium!: Podium;
  @input setupPanel!: SetupPanel;
  @input summaryPanel!: SummaryPanel;
  @input @hint('LEAF only: drive gaze from ScriptedGazeProvider instead of the camera') useScriptedGaze: boolean = false;

  private session!: EyesUpSession;
  private gaze!: SwitchableGazeProvider;
  private cameraGaze!: CameraGazeProvider;
  private scripted: ScriptedGazeProvider | null = null;
  private panelAge = 0;
  private views!: SessionViews;
  private rig: AudienceRig | null = null;
  private meter: RoomMeter | null = null;
  private scrim: SceneObject | null = null;
  private cardBg: SceneObject | null = null;
  private pillBg: SceneObject | null = null;
  /** Width (cm, before world scale) of the current pill backing. */
  private pillWidth = 0;
  private countdownPivot: SceneObject | null = null;
  /** Seconds since the chevron appeared (1 Hz pulse) and each side's base text color. */
  private hintAge = 0;
  private hintTexts: [Text | null, Text | null] = [null, null];
  private hintIcons: [Image | null, Image | null] = [null, null];
  private hintBase: [vec3, vec3] = [new vec3(0, 0, 0), new vec3(0, 0, 0)];
  private hintHidden: [boolean, boolean] = [false, false];
  private hintColors: [vec4, vec4] = [new vec4(1, 1, 1, 1), new vec4(1, 1, 1, 1)];

  onAwake(): void {
    this.collectAudience();
    this.buildCueCard();
    [this.edgeHintLeft, this.edgeHintRight].forEach((so, i) => {
      if (!so) return;
      const hp = so.getTransform().getLocalPosition();
      this.hintBase[i] = new vec3((i === 0 ? -1 : 1) * CHEVRON_X_CM, hp.y - CHEVRON_DROP_CM, hp.z);
      so.getTransform().setLocalPosition(this.hintBase[i]);
      const t = so.getComponent('Component.Text') as Text;
      if (t) {
        t.text = i === 0 ? 'left' : 'right';
        t.size = CHEVRON_CAPTION_SIZE;
        t.textFill.color = CHEVRON_TEXT;
        t.setRenderOrder(12);
        this.hintColors[i] = CHEVRON_TEXT;
      }
      this.hintTexts[i] = t;
      const icon = addIcon(so, i === 0 ? 'double_arrow_left' : 'double_arrow_right', CHEVRON_CM, new vec3(0, CHEVRON_ICON_Y, 0));
      this.hintIcons[i] = icon;
    });
    // Each halo gets its own material so attention colors are per member.
    this.halos.forEach((h) => {
      if (h) h.mainMaterial = h.mainMaterial.clone();
    });
    if (this.stageLineVisual) this.stageLineVisual.mainMaterial = this.stageLineVisual.mainMaterial.clone();

    this.rig = new AudienceRig(this.audience);
    this.meter = new RoomMeter();
    this.scrim = this.buildScrim();

    this.cameraGaze = new CameraGazeProvider(this.camera.getTransform());
    this.gaze = new SwitchableGazeProvider(this.cameraGaze);
    if (this.useScriptedGaze) this.useScriptedGazeNow();

    this.views = this.makeViews();
    this.session = new EyesUpSession(
      this.gaze,
      {
        lookAngleDeg: this.lookAngleDeg,
        fillSeconds: this.fillSeconds,
        drainSeconds: this.drainSeconds,
        nudgeSeconds: this.nudgeSeconds,
        nudgeCooldownSeconds: this.nudgeSeconds,
        cardSeconds: this.cardSeconds,
        dwellSeconds: this.dwellSeconds,
        podiumPitchDeg: this.podiumPitchDeg,
      },
      this.views,
    );

    this.session.onEvent((e) => {
      if (e.type === 'phase') this.onPhase();
      if (e.type === 'finishPrompt') {
        this.cueCard.enabled = true;
        this.cueCardTitle.text = 'Finish?';
      }
    });

    // The panel components live on child SceneObjects whose scripts awake after this one, so
    // their methods are only callable from OnStart (checked in Lens Studio 5.24.1: calling
    // `setupPanel.bind` in onAwake throws "undefined is not a function").
    this.createEvent('OnStartEvent').bind(() => {
      // specs-audio: Specs defaults to LowPower (adds latency). The chime and tick answer the
      // user's gaze / pinch, so they use LowLatency; applause and the time-up tone stay LowPower.
      // Property writes belong in OnStart, not onAwake.
      [this.nudgeAudioL, this.nudgeAudioR, this.tickAudio].forEach((a) => {
        if (a) a.playbackMode = Audio.PlaybackMode.LowLatency;
      });
      this.setupPanel.bind((config) => {
        this.session.configure(config);
        this.session.start();
      });
      this.podium.bind({
        prev: () => this.session.prev(),
        next: () => this.session.next(),
        finish: () => this.session.finish(),
        replace: () => this.session.replace(),
      });
      this.summaryPanel.bind(
        () => this.session.again(),
        () => this.session.done(),
        () => this.session.replace(),
      );
      this.hideStage();
      this.session.launch(); // Launch -> Setup on lens start
    });
    this.createEvent('UpdateEvent').bind(() => this.onUpdate(getDeltaTime()));
  }

  /**
   * LEAF hook: switch gaze to a ScriptedGazeProvider that starts at the current camera pose and
   * return it. Idempotent. LEAF cannot move the preview camera (brief "Risks").
   */
  useScriptedGazeNow(): ScriptedGazeProvider {
    if (!this.scripted) {
      const t = this.camera.getTransform();
      this.scripted = new ScriptedGazeProvider(t.getWorldPosition(), t.back);
    }
    this.gaze.use(this.scripted);
    return this.scripted;
  }

  /**
   * LEAF hook (Cycle 4, D1): scripted gaze re-synced to the live camera pose, level (yaw only), so a scenario never inherits the
   * gaze that the previous run left behind. Returns the provider.
   */
  resetScriptedGaze(): ScriptedGazeProvider {
    const g = this.useScriptedGazeNow();
    const t = this.camera.getTransform();
    const p = t.getWorldPosition();
    const b = t.back;
    g.setOrigin({ x: p.x, y: p.y, z: p.z });
    const flat = new vec3(b.x, 0, b.z);
    g.setForward(flat.length > 1e-4 ? { x: flat.x, y: 0, z: flat.z } : { x: 0, y: 0, z: -1 });
    return g;
  }

  /** LEAF hook: the ScriptedGazeProvider (null until scripted gaze is on). */
  getScriptedGaze(): ScriptedGazeProvider | null {
    return this.scripted;
  }

  /** LEAF/debug hook: the Audience_i roots, left to right. */
  audienceMembers(): SceneObject[] {
    return this.audience;
  }

  /** LEAF/debug hook: read-only access to the session. */
  getSession(): EyesUpSession {
    return this.session;
  }

  private collectAudience(): void {
    if ((!this.audience || this.audience.length === 0) && this.audienceRoot) {
      this.audience = [];
      for (let i = 0; i < this.audienceRoot.getChildrenCount(); i++) this.audience.push(this.audienceRoot.getChild(i));
    }
    if (!this.halos || this.halos.length === 0) {
      this.halos = this.audience.map((a) => {
        for (let i = 0; i < a.getChildrenCount(); i++) {
          const c = a.getChild(i);
          if (c.name === 'Halo') return c.getComponent('Component.RenderMeshVisual') as RenderMeshVisual;
        }
        return null as unknown as RenderMeshVisual;
      });
    }
  }

  private headPosition(): vec3 {
    const o = this.gaze.origin;
    return new vec3(o.x, o.y, o.z);
  }

  /** Point `dist` cm ahead of the head along the flattened gaze, `dy` cm up. */
  private aheadOfHead(dist: number, dy: number): vec3 {
    const f = this.gaze.forward;
    let flat = new vec3(f.x, 0, f.z);
    flat = flat.length > 1e-4 ? flat.normalize() : new vec3(0, 0, -1);
    return this.headPosition().add(flat.uniformScale(dist)).add(new vec3(0, dy, 0));
  }

  private onUpdate(dt: number): void {
    this.session.update(dt);
    this.panelAge += dt;
    this.placePanels();
    this.podium.apply(
      podiumState({
        phase: this.session.phase,
        gazeForward: this.gaze.forward,
        cardIndex: this.session.cardIndex,
        cardTotal: this.session.cardTotal,
        elapsedSeconds: this.session.elapsedSeconds,
        targetSeconds: this.session.targetSeconds,
        podiumPitchDeg: this.session.t.podiumPitchDeg,
      }),
    );
    // Cue card / pill is billboarded toward the head (yaw only, so text stays upright).
    if (this.cueCard.enabled) faceTowards(this.cueCard, this.headPosition(), true);
    if (this.countdownPivot && this.cueCard.enabled) {
      this.countdownPivot.getTransform().setLocalScale(new vec3(Math.max(0.001, this.session.cardCountdown), 1, 1));
    }
    if (this.meter && this.meter.root.enabled) faceTowards(this.meter.root, this.headPosition(), true);
    this.pulseChevron(dt);
  }

  /** Artifact S3: the visible chevron pulses at 1 Hz (brightness and a slight scale). */
  private pulseChevron(dt: number): void {
    const hints = [this.edgeHintLeft, this.edgeHintRight];
    if (!hints.some((h) => h && h.enabled)) return;
    this.hintAge += dt;
    const p = chevronPulse(this.hintAge);
    hints.forEach((so, i) => {
      if (!so || !so.enabled) return;
      this.placeHint(so, i);
      if (this.hintHidden[i]) return;
      const t = this.hintTexts[i];
      const c = this.hintColors[i];
      const a = chevronAlpha(p);
      if (t) t.textFill.color = new vec4(c.x, c.y, c.z, c.w * a);
      // Icon material is premultiplied: scale every channel to fade.
      const img = this.hintIcons[i];
      if (img) img.mainMaterial.mainPass.baseColor = new vec4(a, a, a, a);
      const s = 0.9 + 0.15 * p;
      so.getTransform().setLocalScale(new vec3(s, s, s));
    });
  }

  /** World-space rect (corners via `host`'s transform) projected into the chevron's view plane, or null if behind the camera. */
  private projectRect(host: SceneObject, cx: number, cy: number, halfW: number, halfH: number): PlaneRect | null {
    const wt = host.getTransform().getWorldTransform();
    const inv = this.camera.getTransform().getInvertedWorldTransform();
    let r: PlaneRect | null = null;
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const p = inv.multiplyPoint(wt.multiplyPoint(new vec3(cx + dx * halfW, cy + dy * halfH, 0)));
      if (p.z > -5) return null;
      const k = CHEVRON_PLANE_CM / -p.z;
      const x = p.x * k;
      const y = p.y * k;
      r = r ? { minX: Math.min(r.minX, x), maxX: Math.max(r.maxX, x), minY: Math.min(r.minY, y), maxY: Math.max(r.maxY, y) } : { minX: x, maxX: x, minY: y, maxY: y };
    }
    return r;
  }

  /** View-plane rect of each member's silhouette (head and halo ring down to the floor) (only lit ones when `litOnly`), skipping members behind the camera. */
  private headRects(litOnly: boolean): PlaneRect[] {
    const inv = this.camera.getTransform().getInvertedWorldTransform();
    const rects: PlaneRect[] = [];
    this.audience.forEach((so, i) => {
      const h = this.halos[i];
      if (!so.enabled || !h || (litOnly && h.mainPass.baseColor.w < LIT_HALO_ALPHA)) return;
      const headWorld = so.getTransform().getWorldTransform().multiplyPoint(new vec3(0, 153, 0));
      const p = inv.multiplyPoint(headWorld);
      if (p.z > -5) return;
      const k = CHEVRON_PLANE_CM / -p.z;
      const sc = so.getTransform().getWorldScale().x;
      const r = LIT_HALO_RADIUS_CM * k * sc;
      // The whole silhouette (head to floor) is kept clear, not just the head: the chevron belongs on the wall above it.
      const half = Math.max(r, MEMBER_BODY_HALF_W_CM * k * sc);
      rects.push({ minX: p.x * k - half, maxX: p.x * k + half, minY: -1000, maxY: p.y * k + r });
    });
    // A visible "zzz" is a small obstacle of its own, also in the lit-only fallback (a slumped member is not lit).
    this.audience.forEach((so, i) => {
      const z = so.enabled && this.rig ? this.rig.zzzWorld(i) : null;
      if (!z) return;
      const p = inv.multiplyPoint(z);
      if (p.z > -5) return;
      const k = CHEVRON_PLANE_CM / -p.z;
      rects.push({ minX: p.x * k - ZZZ_HALF_W_CM * k, maxX: p.x * k + ZZZ_HALF_W_CM * k, minY: p.y * k - ZZZ_HALF_H_CM * k, maxY: p.y * k + ZZZ_HALF_H_CM * k });
    });
    return rects;
  }

  /** Keep the head-locked chevron clear of the podium and the cue card (core/ChevronPlacement.ts). */
  private placeHint(so: SceneObject, i: number): void {
    const panels: PlaneRect[] = [];
    const podiumRoot = this.podium.getSceneObject();
    if (podiumRoot.enabled) {
      const r = this.projectRect(podiumRoot, 0, 0, PODIUM_W_CM / 2, PODIUM_H_CM / 2);
      if (r) panels.push(r);
    }
    if (this.cueCard.enabled) {
      const asPill = !!this.pillBg && this.pillBg.enabled && this.pillWidth > 0;
      const r = asPill
        ? this.projectRect(this.cueCard, 0, PILL_Y, this.pillWidth / 2, PILL_H / 2)
        : this.projectRect(this.cueCard, 0, CARD_CENTER_Y, CARD_W / 2, CARD_H / 2);
      if (r) panels.push(r);
    }
    // Heads (each member's head and halo ring, lit ones first as the fallback) and the room meter are obstacles too: the chevron
    // goes into free wall above a head, never over a member or the meter.
    const meterRect = this.meter && this.meter.root.enabled ? this.projectRect(this.meter.root, 0, 0, METER_HALF_W_CM, METER_HALF_H_CM) : null;
    const lit = this.headRects(true);
    const all = this.headRects(false);
    const cam = this.camera.getComponent('Component.Camera') as Camera;
    const halfH = CHEVRON_PLANE_CM * Math.tan(cam.fov / 2);
    const base = this.hintBase[i];
    const place = (extra: PlaneRect[]) =>
      placeChevron(
        i === 0 ? 'left' : 'right',
        { x: base.x, y: base.y },
        CHEVRON_BOX,
        [...panels, ...extra],
        { margin: CHEVRON_PANEL_MARGIN_CM, viewHalfW: halfH * cam.aspect, viewHalfH: halfH },
      );
    const withMeter = (rects: PlaneRect[]) => (meterRect ? [...rects, meterRect] : rects);
    // Never drop the cue: if there is no room, avoid only the lit heads (and the meter), then only the meter, then only the panels.
    const spot = place(withMeter(all)) || place(withMeter(lit)) || place(withMeter([])) || place([]);
    this.hintHidden[i] = spot === null;
    if (spot === null) {
      so.getTransform().setLocalScale(new vec3(0, 0, 0));
      return;
    }
    so.getTransform().setLocalPosition(new vec3(spot.x, spot.y, base.z));
  }

  /**
   * Pass 4: backing quad, countdown line and pill backing for the cue card. The texts get a later
   * render order so they draw over the translucent backings (depthWrite is off on PanelSurface).
   */
  private buildCueCard(): void {
    if (!this.cueCard || !this.cueCardTitle || !this.cueCardBody) return;
    this.cardBg = child(this.cueCard, 'CardBg', new vec3(0, 0, -0.6));
    addSurface(child(this.cardBg, 'Surface', new vec3(0, CARD_CENTER_Y, 0)), CARD_W, CARD_H, 0, CARD_FILL, CARD_FRAME);
    this.countdownPivot = child(this.cardBg, 'Countdown', new vec3(-CARD_COUNTDOWN_W / 2, CARD_COUNTDOWN_Y, 0.1));
    addSurface(child(this.countdownPivot, 'Line', new vec3(CARD_COUNTDOWN_W / 2, 0, 0)), CARD_COUNTDOWN_W, 0.6, 0, ACCENT_CYAN, null);
    this.pillBg = child(this.cueCard, 'PillBg', new vec3(0, PILL_Y, -0.6));
    this.pillBg.enabled = false;
    this.cueCardTitle.size = CARD_TITLE_SIZE;
    this.cueCardBody.size = CARD_BODY_SIZE;
    [this.cueCardTitle, this.cueCardBody].forEach((t) => t.setRenderOrder(10));
    this.cueCardTitle.getSceneObject().getTransform().setLocalPosition(new vec3(0, CARD_TITLE_Y, 0));
    this.cueCardBody.getSceneObject().getTransform().setLocalPosition(new vec3(0, CARD_BODY_Y, 0));
  }

  private setCardLayout(pill: string | null): void {
    if (this.cardBg) this.cardBg.enabled = pill === null;
    this.cueCardTitle.getSceneObject().getTransform().setLocalPosition(new vec3(0, pill === null ? CARD_TITLE_Y : PILL_Y, 0));
    if (!this.pillBg) return;
    this.pillBg.enabled = pill !== null;
    if (pill === null) return;
    for (let i = this.pillBg.getChildrenCount() - 1; i >= 0; i--) this.pillBg.getChild(i).destroy();
    this.pillWidth = pill.length * PILL_GLYPH_CM + 8;
    addSurface(this.pillBg, this.pillWidth, PILL_H, 0, CARD_FILL, CARD_FRAME);
  }

  /**
   * Pass 6: the dwell target is the pill backing as it is on screen — PillBg's world position
   * (5 cm up the billboarded card, × the 0.9 pill scale), its world axes, and its backing size ×
   * world scale. Before this the dwell aimed a 7° cone at `layout.cardAnchor`, which also covered
   * the centre audience and kept the dwell latched (build-notes Pass 6).
   */
  private pillRect(): PillRect | null {
    if (!this.pillBg || !this.pillBg.isEnabledInHierarchy || this.pillWidth <= 0) return null;
    const t = this.pillBg.getTransform();
    const s = t.getWorldScale();
    const p = t.getWorldPosition();
    const r = t.right;
    const u = t.up;
    return {
      center: { x: p.x, y: p.y, z: p.z },
      right: { x: r.x, y: r.y, z: r.z },
      up: { x: u.x, y: u.y, z: u.z },
      halfWidth: (this.pillWidth / 2) * Math.abs(s.x),
      halfHeight: (PILL_H / 2) * Math.abs(s.y),
    };
  }

  /**
   * World-anchor the Setup / Summary panel in front of the head. Called every frame for the first
   * PANEL_SETTLE_SECONDS of the phase, then the panel stays put (not head-locked). Checked in Lens
   * Studio 5.24.1: the Interactive preview moves the camera after OnStart, so a one-shot placement
   * at phase entry lands the panel behind the user.
   */
  private placePanels(): void {
    const phase = this.session.phase;
    if (this.panelAge > PANEL_SETTLE_SECONDS) return;
    if (phase === 'Setup') {
      const so = this.setupPanel.getSceneObject();
      so.getTransform().setWorldPosition(this.aheadOfHead(SETUP_DISTANCE_CM, -SETUP_BELOW_EYES_CM));
      faceTowards(so, this.headPosition(), true);
    }
    if (phase === 'Summary') {
      const so = this.summaryPanel.getSceneObject();
      so.getTransform().setWorldPosition(this.aheadOfHead(SUMMARY_DISTANCE_CM, SUMMARY_ABOVE_EYES_CM));
      faceTowards(so, this.headPosition(), true);
    }
  }

  private onPhase(): void {
    const phase = this.session.phase;
    this.panelAge = 0;
    this.placePanels();
    this.setupPanel.show(phase === 'Setup');
    this.summaryPanel.show(phase === 'Summary' ? this.session.summary : null, {
      targetSeconds: this.session.targetSeconds,
      deckName: getDeck(this.session.config.deckId).name,
      cardCount: getDeck(this.session.config.deckId).sections.length,
      game: this.session.game,
    });
    const onStage = phase === 'Placing' || phase === 'Rehearsal' || phase === 'Finishing';
    this.stageLine.enabled = onStage;
    this.meter?.setVisible(onStage);
    if (this.scrim) this.scrim.enabled = onStage;
    if (!onStage) this.cueCard.enabled = false;
    if (phase === 'Summary') {
      // Pass 3: the Summary panel is translucent (and the display additive), so lit halos behind it
      // showed through. While Summary is open the halos fade out and the silhouettes are hidden;
      // Again re-places and fades them back in (EyesUpSession.enterPlacing).
      this.views.audience?.setFade(0);
      this.audience.forEach((a) => (a.enabled = false));
    }
    const layout = this.session.layout;
    if (layout && phase === 'Placing') {
      this.podium.placeAt(layout.podiumPosition.x, layout.podiumPosition.y, layout.podiumPosition.z, this.headPosition());
    }
  }

  /** Cycle 3 (S4): a rounded, faint dark plate (three non-overlapping quads, so the alpha does not double up) behind the audience. */
  private buildScrim(): SceneObject {
    const root = global.scene.createSceneObject('AudienceScrim');
    root.enabled = false;
    return root;
  }

  private placeScrim(layout: StageLayout, count: number, head: vec3): void {
    const root = this.scrim;
    if (!root) return;
    while (root.getChildrenCount() > 0) root.getChild(0).destroy();
    const first = layout.seats[0];
    const last = layout.seats[count - 1];
    const span = Math.hypot(last.x - first.x, last.z - first.z);
    const w = span + 80 + 2 * SCRIM_PAD_CM;
    const h = SCRIM_HEIGHT_CM;
    const c = SCRIM_CORNER_CM;
    const parts: [string, number, number, number][] = [
      ['Mid', 0, w - 2 * c, h],
      ['Left', -(w - c) / 2, c, h - 2 * c],
      ['Right', (w - c) / 2, c, h - 2 * c],
    ];
    parts.forEach(([name, x, pw, ph]) => {
      const v = addSurface(child(root, name, new vec3(x, 0, 0)), pw, ph, 0, SCRIM_COLOR, null);
      v.setRenderOrder(-5);
    });
    const floorY = layout.stageCenter.y;
    const fx = layout.facing.x;
    const fz = layout.facing.z;
    root.getTransform().setWorldPosition(
      new vec3(layout.stageCenter.x + fx * SCRIM_BEHIND_CM, floorY + SCRIM_CENTER_ABOVE_FLOOR_CM, layout.stageCenter.z + fz * SCRIM_BEHIND_CM),
    );
    faceTowards(root, head, true);
  }

  private hideStage(): void {
    this.audience.forEach((a) => (a.enabled = false));
    this.cueCard.enabled = false;
    this.edgeHintLeft.enabled = false;
    this.edgeHintRight.enabled = false;
    this.stageLine.enabled = false;
    this.meter?.setVisible(false);
    if (this.scrim) this.scrim.enabled = false;
    this.summaryPanel.show(null);
  }

  private play(a: AudioComponent | undefined, volume?: number): void {
    if (!a) return;
    if (volume !== undefined) a.volume = volume;
    a.play(1);
  }

  private makeViews(): SessionViews {
    const setPos = (so: SceneObject, p: Vec3Like) => so.getTransform().setWorldPosition(new vec3(p.x, p.y, p.z));
    const baseScale: number[] = [];
    let fade = 1;
    let applause = 1;
    const lastHalo: HaloVisual[] = [];
    const lastLook: AudienceLook[] = [];
    const applyLook = (i: number) => {
      if (lastLook[i] && this.rig) this.rig.apply(i, lastLook[i], fade);
    };
    const applyMember = (i: number) => {
      const v = lastHalo[i];
      if (!v || !this.audience[i]) return;
      const s = v.scale * applause * (baseScale[i] ?? 1);
      this.audience[i].getTransform().setLocalScale(new vec3(s, s, s));
      if (this.halos[i]) this.halos[i].mainPass.baseColor = new vec4(v.color[0], v.color[1], v.color[2], v.color[3] * fade);
    };

    const audience: AudienceView = {
      place: (layout: StageLayout, count: number) => {
        const head = this.headPosition();
        this.audience.forEach((so, i) => {
          so.enabled = i < count;
          if (i < count) {
            setPos(so, layout.seats[i]);
            faceTowards(so, head, true); // silhouettes face the speaker
            baseScale[i] = baseScale[i] ?? so.getTransform().getLocalScale().x;
          }
        });
        setPos(this.cueCard, { x: layout.cardAnchor.x, y: layout.cardAnchor.y + CARD_LIFT_CM, z: layout.cardAnchor.z });
        this.meter?.placeAt(
          new vec3(layout.cardAnchor.x, layout.cardAnchor.y - METER_BELOW_ANCHOR_CM, layout.cardAnchor.z),
          head,
        );
        setPos(this.stageLine, layout.stageCenter);
        faceTowards(this.stageLine, head, true);
        this.placeScrim(layout, count, head);
      },
      setVisible: (v) => this.audience.forEach((so, i) => (so.enabled = v && i < (this.session ? this.session.config.audienceCount : 0))),
      setFade: (a) => {
        fade = a;
        lastHalo.forEach((_, i) => applyMember(i));
        lastLook.forEach((_, i) => applyLook(i));
      },
      setApplauseScale: (s) => {
        applause = s;
        lastHalo.forEach((_, i) => applyMember(i));
      },
      applyHalo: (i, v) => {
        lastHalo[i] = v;
        applyMember(i);
      },
      applyLook: (i, look) => {
        lastLook[i] = look;
        applyLook(i);
      },
    };

    const cueCard: CueCardView = {
      showCard: (section) => {
        this.cueCard.enabled = true;
        this.cueCardTitle.text = section.title;
        this.cueCardBody.text = section.points.map((p) => `• ${p}`).join('\n');
        this.cueCardBody.getSceneObject().enabled = true;
        this.setCardLayout(null);
      },
      showPill: (tag) => {
        this.cueCardTitle.text = tag;
        this.cueCardBody.getSceneObject().enabled = false;
        this.setCardLayout(tag);
      },
      hide: () => (this.cueCard.enabled = false),
      applyMorph: (m) => {
        const s = PILL_SCALE + (1 - PILL_SCALE) * m; // pass 4: pill is 90% of the card size (was 40%)
        this.cueCard.getTransform().setLocalScale(new vec3(s, s, s));
      },
      pillRect: () => this.pillRect(),
    };

    return {
      audience,
      cueCard,
      nudgeAudio: { playChime: (side) => this.play(side === 'left' ? this.nudgeAudioL : this.nudgeAudioR) },
      edgeHint: {
        show: (side) => {
          this.hintAge = 0;
          this.edgeHintLeft.enabled = side === 'left';
          this.edgeHintRight.enabled = side === 'right';
        },
        hide: () => {
          this.edgeHintLeft.enabled = false;
          this.edgeHintRight.enabled = false;
        },
      },
      stageLine: {
        apply: (v) => {
          const c = v.amber ? LINE_AMBER : LINE_COLOR;
          const boost = 1 + 0.6 * v.pulse;
          this.stageLineVisual.mainPass.baseColor = new vec4(
            Math.min(1, c[0] * boost),
            Math.min(1, c[1] * boost),
            Math.min(1, c[2] * boost),
            0.9,
          );
          // The line spans the stage (child visual is unit width); progress grows it.
          const t = this.stageLine.getTransform();
          const s = t.getLocalScale();
          t.setLocalScale(new vec3(Math.max(0.001, v.progress), s.y, s.z));
        },
      },
      stageLineAudio: { playTimeUpTone: () => this.play(this.toneAudio) },
      sfx: { playTick: () => this.play(this.tickAudio), playApplause: (v) => this.play(this.applauseAudio, v) },
      roomMeter: this.meter ?? undefined,
    };
  }
}
