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
import { AudienceLook, HEAD_UP_Y } from './core/AudienceLook';
import { AudienceView, EyesUpSession, SessionViews } from './core/EyesUpSession';
import { SUMMARY_CENTER_Y_CM, SUMMARY_DISTANCE_CM } from './core/Framing';
import { PillRect } from './core/PillHit';
import { ChevronBox, PlaneRect, placeChevron } from './core/ChevronPlacement';
import { podiumState } from './core/PodiumModel';
import { Vec3Like } from './core/math';
import { ACCENT_CYAN, AUDIENCE_RENDER_ORDER, PANEL_FILL, STAGE_GLOW_CM, STAGE_STROKE_CM, addCircleRing, addPanelGlow, PANEL_STROKE, TEXT_LABEL, TEXT_PRIMARY, TEXT_SECONDARY, addDot, addIcon, addRoundedSurface, addSurface, child, faceTowards } from './EyesUpUI';
import { METER_ABOVE_CM, METER_CAPSULE_H_CM, METER_WIDTH_CM } from './RoomMeter';

/**
 * Pass 5 nudge chevron (artifact S3): a 6 × 6 cm amber double chevron ("‹‹" / "››", Material
 * keyboard_double_arrow_*) above a "left" / "right" caption. The hint's scene Text (±20 cm, 100 cm
 * ahead of the camera) becomes the caption; the icon is added at awake 4 cm above it.
 */
const CHEVRON_CM = 7.6;
const CHEVRON_ICON_Y = 7.3;
/**
 * Cycle 1 (D9): a dark backing circle (r 5.6 cm) with an amber hairline behind the double chevron, so it reads on a beige room, a "Look left" /
 * "Look right" caption in Body, and the 1 Hz pulse. Extents about the hint origin (cm), used for placement only.
 */
/** Round 2: the whole chevron block is 0.8x its old size, so it fits the free wall left of the audience at the canonical pose without covering a tag. */
const CHEVRON_BACK_R = 5.7;
const CHEVRON_EXT_HALF_W = 6.2;
const CHEVRON_EXT_BELOW = 1.9;
const CHEVRON_EXT_ABOVE = 13.4;
/** A member's body is about this wide (half, cm in the stage) for the chevron's keep-clear rects. */
const MEMBER_BODY_HALF_W_CM = 26;
/** Round 7: hint x offset (was 20) and drop so the backing clears the opening pill's corner in the nudge still. */
const CHEVRON_X_CM = 21.5;
/** Cycle 4 (G9): the disc + caption block sits at the vertical centre of the frame, its outer edge this far from the FOV edge (cm in the plane). */
const CHEVRON_EDGE_GAP_CM = 2;
/** Hint plane: the chevron is head-locked 100 cm ahead; panels are projected into that plane for placement. */
const CHEVRON_PLANE_CM = 100;
/** Clear gap kept between the chevron backing and any panel (cm in the plane). */
const CHEVRON_PANEL_MARGIN_CM = 2.5;
/** Backing extents about the hint origin at the largest pulse scale (1.05). */
const CHEVRON_BOX: ChevronBox = {
  halfW: CHEVRON_EXT_HALF_W * 1.05,
  below: CHEVRON_EXT_BELOW * 1.05,
  above: CHEVRON_EXT_ABOVE * 1.05,
};
const CHEVRON_TEXT = new vec4(1.0, 0.82, 0.35, 1);
/** ≈ 1.5 cm caption at 100 cm (S3: "left" 1.5 cm). */
const CHEVRON_CAPTION_SIZE = 124;
/** Additive display: a near-black backing adds no light, so the disc is a deep luminous blue that the amber chevron stands out from. */
const CHEVRON_BACK_FILL = new vec4(1.0, 0.75, 0.3, 0.04);
const CHEVRON_BACK_RING = new vec4(1.0, 0.84, 0.45, 1);
/** Round 2: a thin crisp ring (0.3 cm at the 100 cm plane) and two thin glow rings, so the glow is clean instead of one wide muddy band. */
const CHEVRON_RING_CM = 0.3;
const CHEVRON_BACK_GLOW = new vec4(1.0, 0.75, 0.3, 0.26);
const CHEVRON_BACK_GLOW2 = new vec4(1.0, 0.75, 0.3, 0.1);
const CHEVRON_BACK_COLORS = [CHEVRON_BACK_FILL, CHEVRON_BACK_RING, CHEVRON_BACK_GLOW, CHEVRON_BACK_GLOW2];

/** Stage line colors (design): cool white while running, amber at 0 s. Never black. */
const LINE_COLOR: [number, number, number] = [0.45, 0.92, 1.0];
const LINE_AMBER: [number, number, number] = [1.0, 0.72, 0.2];

/** Panel placement (brief "Where things live"). */
const SETUP_DISTANCE_CM = 110;
/** Round 6: negative = above eye level; the panel clears the room's wall art in Preview and on device. */
const SETUP_BELOW_EYES_CM = -10;
/** Cycle 5 (R1): the Summary used to sit 29 cm above the eyes and clipped its top in the preview frame; its distance and centre height now live in core/Framing.ts (unit tested to stay inside the viewport). */
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
const CARD_W = 110;
/**
 * Cycle 1 (D4): 26 -> 28.5 cm so the title has clear room above it, with a 2.8 cm inner padding (1.2 cm at the 110 cm reference scale).
 * The card's top edge stays where it was (floor + 219 cm, inside the preview frame); its bottom edge is 2.6 cm above the room meter's top edge.
 */
const CARD_H = 28.5;
const CARD_PAD = 2.8;
const CARD_CENTER_Y = 10.55;
const CARD_RADIUS = 2.6;
/** Left text column (title and bullets share it); the cyan accent bar and the bullet dots share the column to its left. */
const CARD_TEXT_X = -CARD_W / 2 + CARD_PAD + 3.6;
const CARD_ACCENT_X = -CARD_W / 2 + CARD_PAD + 0.5;
const CARD_RIGHT_X = CARD_W / 2 - CARD_PAD;
const CARD_TITLE_Y = 18.6;
/** First bullet centre and spacing (3 bullets use the tighter step). */
const CARD_BULLET_Y = 10.8;
const CARD_BULLET_STEP = 6.2;
const CARD_BULLET_STEP_3 = 5.0;
const CARD_COUNTDOWN_Y = -2.3;
const CARD_COUNTDOWN_W = CARD_W - 2 * CARD_PAD;
/** Hierarchy at 2.5 m (Cycle 1, D2): Heading title 320, Body bullets 225, Caption counter 175 (the 72 : 60 : 46 steps of the type scale, scaled for the card's distance). */
const CARD_TITLE_SIZE = 320;
const CARD_BODY_SIZE = 225;
const CARD_COUNTER_SIZE = 175;
const MAX_BULLETS = 3;
const PILL_SCALE = 1.2;
const PILL_H = 10;
const PILL_Y = 11;
/** The cyan dot inside the pill: radius and the width reserved for it. */
const PILL_DOT_R = 1.2;
const PILL_DOT_ZONE = 5;
/** Pill text is the card title one notch quieter, so the pill weighs less than the card. */
const PILL_TEXT_SIZE = 290;
/**
 * The room meter floats between the heads and the card, 9.5 cm above the card anchor (its bottom edge is 3 cm above the lit halo's top edge).
 * Cycle 1 (D3): the card's bottom edge is 2.6 cm above the meter's top edge (the old gap was about 1 cm after the card got padding).
 */
/**
 * Cycle 3 (F8): the capsule floats 4 cm above the tallest (lit) head top; the card keeps the old 9.5 cm centre-to-centre offset plus the
 * label row that now sits above the capsule (2.6 cm gap above the label).
 */
const METER_ABOVE_HEAD_CM = 11;
/**
 * Round 2: the audience stands 11 cm lower in the view (floorOffsetCm 163) and the halo ring is 32 cm across, so a row of "#n NN%" tags fits between
 * the lit halo tops (177 cm) and the meter's bottom edge (11 cm above them); the card stays where it was. The card's bottom edge is 3.6 cm above
 * the top of the meter's label row (the card centre sits CARD_CENTER_Y above its origin, half its height further down).
 */
const METER_CARD_OFFSET_CM = METER_ABOVE_CM + 3.6 + (CARD_H / 2 - CARD_CENTER_Y);
/** Room meter extents about its centre (cm, local), from RoomMeter.ts: capsule width, capsule plus label row above it. */
const METER_HALF_W_CM = METER_WIDTH_CM / 2;
const METER_HALF_H_CM = METER_ABOVE_CM;
/** Footprint of a "zzz" marker in the member's space (cm), kept clear by the nudge chevron. */
const ZZZ_HALF_W_CM = 11;
const ZZZ_HALF_H_CM = 6;
/** Footprint of a member's "#n NN%" tag (cm in the member's space). */
const TAG_HALF_W_CM = 13;
const TAG_HALF_H_CM = 4.5;
/** Lit halo ring radius around a head, cm (rest scale 36 cm, diameter). */
const LIT_HALO_RADIUS_CM = 17;
/** Top of the lit halo above the floor: resting head height plus the halo radius. */
const LIT_HEAD_TOP_CM = (HEAD_UP_Y + 16) * 1.05;
/** Measured in Preview: ≈ 0.0124 cm per size unit per glyph for Inter titles (size 200 → 2.5 cm). */
const PILL_GLYPH_CM = 0.0124 * PILL_TEXT_SIZE;

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
  private cardBg: SceneObject | null = null;
  private stageGlow: Array<{ visual: RenderMeshVisual; alpha: number }> = [];
  private pillBg: SceneObject | null = null;
  /** Width (cm, before world scale) of the current pill backing. */
  private pillWidth = 0;
  private countdownPivot: SceneObject | null = null;
  /** Cycle 1 (D4): per-mode fade setters (card pieces, pill pieces) driven by the 0.25 s morph, plus the card's bullet pool. */
  private cardFade: Array<(a: number) => void> = [];
  private pillFade: Array<(a: number) => void> = [];
  private lastMorph = 0;
  private bulletTexts: Text[] = [];
  private bulletDots: SceneObject[] = [];
  private counterText: Text | null = null;
  /** Seconds since the chevron appeared (1 Hz pulse) and each side's base text color. */
  private hintAge = 0;
  private hintTexts: [Text | null, Text | null] = [null, null];
  private hintIcons: [Image | null, Image | null] = [null, null];
  private hintBase: [vec3, vec3] = [new vec3(0, 0, 0), new vec3(0, 0, 0)];
  private hintHidden: [boolean, boolean] = [false, false];
  /** The chevron's backing circle and ring, faded with the pulse. */
  private hintBacking: [RenderMeshVisual[], RenderMeshVisual[]] = [[], []];
  private hintColors: [vec4, vec4] = [new vec4(1, 1, 1, 1), new vec4(1, 1, 1, 1)];

  onAwake(): void {
    this.collectAudience();
    this.buildCueCard();
    [this.edgeHintLeft, this.edgeHintRight].forEach((so, i) => {
      if (!so) return;
      const hp = so.getTransform().getLocalPosition();
      this.hintBase[i] = new vec3((i === 0 ? -1 : 1) * CHEVRON_X_CM, -(CHEVRON_BOX.above - CHEVRON_BOX.below) / 2, hp.z);
      so.getTransform().setLocalPosition(this.hintBase[i]);
      const t = so.getComponent('Component.Text') as Text;
      if (t) {
        t.text = i === 0 ? 'Look left' : 'Look right';
        t.size = CHEVRON_CAPTION_SIZE;
        t.textFill.color = CHEVRON_TEXT;
        t.setRenderOrder(12);
        this.hintColors[i] = CHEVRON_TEXT;
      }
      this.hintTexts[i] = t;
      const back = child(so, 'Backing', new vec3(0, CHEVRON_ICON_Y, -0.1));
      this.hintBacking[i] = [addDot(back, 'Disc', CHEVRON_BACK_R, new vec3(0, 0, 0), CHEVRON_BACK_FILL), addCircleRing(back, 'Rim', CHEVRON_BACK_R, CHEVRON_RING_CM, 0.02, CHEVRON_BACK_RING), addCircleRing(back, 'Glow', CHEVRON_BACK_R + 0.9, 0.9, -0.02, CHEVRON_BACK_GLOW), addCircleRing(back, 'Glow2', CHEVRON_BACK_R + 1.9, 1.0, -0.03, CHEVRON_BACK_GLOW2)];
      const icon = addIcon(so, i === 0 ? 'double_arrow_left' : 'double_arrow_right', CHEVRON_CM, new vec3(0, CHEVRON_ICON_Y, 0));
      this.hintIcons[i] = icon;
    });
    // Each halo gets its own material so attention colors are per member.
    this.halos.forEach((h) => {
      if (h) h.mainMaterial = h.mainMaterial.clone();
    });
    if (this.stageLineVisual) {
      this.stageLineVisual.mainMaterial = this.stageLineVisual.mainMaterial.clone();
      this.styleStageLine();
    }

    this.rig = new AudienceRig(this.audience);
    // Cycle 3 (F1): every audience layer draws before (behind) every panel backdrop.
    this.audience.forEach((a) => this.orderMeshes(a, AUDIENCE_RENDER_ORDER));
    this.rig.applyRenderOrders();
    this.meter = new RoomMeter();

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
  /**
   * Redesign: the stage line is a thin bright cyan line (the old 0.6 x 3 cm bar showed its flat top as a grey-blue slab when seen from above)
   * with a soft glow either side and a faint reflection a few cm nearer the viewer. Local +Z faces the head; progress still scales X.
   */
  private styleStageLine(): void {
    const main = this.stageLineVisual;
    main.mainPass.depthWrite = false;
    const mainSo = main.getSceneObject();
    mainSo.getTransform().setLocalScale(new vec3(360, 0.3, 0.8));
    const parent = mainSo.getParent();
    const mk = (name: string, z: number, depth: number, alpha: number) => {
      const so = global.scene.createSceneObject(name);
      so.setParent(parent);
      so.getTransform().setLocalPosition(new vec3(0, 0, z));
      so.getTransform().setLocalScale(new vec3(360, 0.2, depth));
      const v = so.createComponent('Component.RenderMeshVisual') as RenderMeshVisual;
      v.mesh = main.mesh;
      v.mainMaterial = main.mainMaterial.clone();
      v.mainPass.depthWrite = false;
      this.stageGlow.push({ visual: v, alpha });
    };
    mk('StageGlowNear', 30, 3.4, 0.3);
    mk('StageGlowWide', 30, 8, 0.12);
    mk('StageReflection', 36, 0.8, 0.2);
  }

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
      this.hintBacking[i].forEach((v, k) => {
        const c = CHEVRON_BACK_COLORS[k];
        v.mainPass.baseColor = new vec4(c.x, c.y, c.z, c.w * a);
      });
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

  /**
   * View-plane no-go rectangles for the nudge chevron, skipping members behind the camera.
   * `heads`: only the head and halo ring at the head's CURRENT position (a slumped head sits lower and further forward than the rest pose); the chevron never covers these.
   * `silhouette`: the whole body column down to the floor too (preferred: the chevron then lands on the wall above the member).
   */
  private headRects(mode: 'heads' | 'silhouette'): PlaneRect[] {
    const inv = this.camera.getTransform().getInvertedWorldTransform();
    const rects: PlaneRect[] = [];
    this.audience.forEach((so, i) => {
      if (!so.enabled || !this.halos[i]) return;
      const restWorld = so.getTransform().getWorldTransform().multiplyPoint(new vec3(0, 153, 0));
      const headWorld = (this.rig && this.rig.headWorld(i)) || restWorld;
      const p = inv.multiplyPoint(headWorld);
      const pr = inv.multiplyPoint(restWorld);
      if (p.z > -5 || pr.z > -5) return;
      const k = CHEVRON_PLANE_CM / -p.z;
      const kr = CHEVRON_PLANE_CM / -pr.z;
      const sc = so.getTransform().getWorldScale().x;
      const r = LIT_HALO_RADIUS_CM * k * sc;
      rects.push({ minX: p.x * k - r, maxX: p.x * k + r, minY: p.y * k - r, maxY: p.y * k + r });
      if (mode === 'silhouette') {
        // The body column below and the rest-pose head line above: the chevron belongs on the wall above the member.
        const rr = LIT_HALO_RADIUS_CM * kr * sc;
        const half = Math.max(rr, MEMBER_BODY_HALF_W_CM * kr * sc);
        rects.push({ minX: pr.x * kr - half, maxX: pr.x * kr + half, minY: -1000, maxY: pr.y * kr + rr });
      }
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

  /** View-plane rectangles of each member's visible "#n NN%" tag (just under the head, or above a slumped one). */
  private tagRects(): PlaneRect[] {
    const inv = this.camera.getTransform().getInvertedWorldTransform();
    const rects: PlaneRect[] = [];
    this.audience.forEach((so, i) => {
      const t = so.enabled && this.rig ? this.rig.tagWorld(i) : null;
      if (!t) return;
      const p = inv.multiplyPoint(t);
      if (p.z > -5) return;
      const k = CHEVRON_PLANE_CM / -p.z;
      const sc = so.getTransform().getWorldScale().x;
      rects.push({ minX: p.x * k - TAG_HALF_W_CM * k * sc, maxX: p.x * k + TAG_HALF_W_CM * k * sc, minY: p.y * k - TAG_HALF_H_CM * k * sc, maxY: p.y * k + TAG_HALF_H_CM * k * sc });
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
    // Every head and halo ring (at its current, possibly slumped, position) and the room meter are obstacles too.
    const meterRect = this.meter && this.meter.root.enabled ? this.projectRect(this.meter.root, 0, 0, METER_HALF_W_CM, METER_HALF_H_CM) : null;
    const heads = this.headRects('heads');
    const silhouettes = this.headRects('silhouette');
    const cam = this.camera.getComponent('Component.Camera') as Camera;
    const halfH = CHEVRON_PLANE_CM * Math.tan(cam.fov / 2);
    const base = this.hintBase[i];
    const halfW = halfH * cam.aspect; // the Lens frustum (the Preview paints the room wider than the Lens renders)
    base.x = (i === 0 ? -1 : 1) * (halfW - CHEVRON_EDGE_GAP_CM - CHEVRON_BOX.halfW);
    const place = (extra: PlaneRect[]) =>
      placeChevron(
        i === 0 ? 'left' : 'right',
        { x: base.x, y: base.y },
        CHEVRON_BOX,
        [...panels, ...extra],
        { margin: CHEVRON_PANEL_MARGIN_CM, viewHalfW: halfW, viewHalfH: halfH },
      );
    const withMeter = (rects: PlaneRect[]) => (meterRect ? [...rects, meterRect] : rects);
    // Heads and halos are hard no-go (Cycle 6, D1): prefer wall clear of whole silhouettes and the meter, then clear of heads and the meter, then of heads only.
    // If even that has no room the chevron is hidden (the chime still plays) rather than drawn over a head.
    // Tags are kept clear when there is room; otherwise the chevron may cover one (a nudge must stay visible).
    const tags = this.tagRects();
    const spot = place(withMeter([...silhouettes, ...tags])) || place(withMeter([...heads, ...tags])) || place([...heads, ...tags]) || place(withMeter(silhouettes)) || place(withMeter(heads)) || place(heads);
    this.hintHidden[i] = spot === null;
    if (spot === null) {
      so.getTransform().setLocalScale(new vec3(0, 0, 0));
      return;
    }
    so.getTransform().setLocalPosition(new vec3(spot.x, spot.y, base.z));
  }

  /** Registers every mesh under `root` (and `root` itself) for fading with `list`. */
  private fadeMeshes(list: Array<(a: number) => void>, root: SceneObject): void {
    const v = root.getComponent('Component.RenderMeshVisual') as RenderMeshVisual | null;
    if (v) {
      const c = v.mainPass.baseColor;
      list.push((a) => (v.mainPass.baseColor = new vec4(c.x, c.y, c.z, c.w * a)));
    }
    for (let i = 0; i < root.getChildrenCount(); i++) this.fadeMeshes(list, root.getChild(i));
  }

  /** Explicit draw order for every mesh under `root` (alpha-blended meshes are otherwise sorted by depth, which let a card's fill cover a dot). */
  private orderMeshes(root: SceneObject, order: number): void {
    const v = root.getComponent('Component.RenderMeshVisual') as RenderMeshVisual | null;
    if (v) v.setRenderOrder(order);
    for (let i = 0; i < root.getChildrenCount(); i++) this.orderMeshes(root.getChild(i), order);
  }

  private fadeText(list: Array<(a: number) => void>, t: Text): void {
    const c = t.textFill.color;
    list.push((a) => (t.textFill.color = new vec4(c.x, c.y, c.z, c.w * a)));
  }

  /** A left-aligned card text (font taken from the scene's body Text), drawn over the backings. */
  private cardText(parent: SceneObject, name: string, size: number, color: vec4, align: HorizontalAlignment, rect: Rect, local: vec3): Text {
    const t = child(parent, name, local).createComponent('Component.Text') as Text;
    t.font = this.cueCardBody.font;
    t.size = size;
    t.textFill.color = color;
    t.horizontalAlignment = align;
    t.verticalAlignment = VerticalAlignment.Center;
    t.horizontalOverflow = HorizontalOverflow.Overflow;
    t.verticalOverflow = VerticalOverflow.Overflow;
    t.layoutRect = rect;
    t.setRenderOrder(10);
    return t;
  }

  /**
   * Cycle 1 (D1, D4): the cue card on the shared panel material (navy 78 %, rounded, hairline stroke), with a 2.8 cm inner padding, a
   * left-aligned Heading title beside one cyan accent bar, left-aligned Body bullets with cyan dots in the same column, an "n / N" counter
   * in Caption, and the countdown line inside the bottom padding. The texts get a later render order so they draw over the backings.
   */
  private buildCueCard(): void {
    if (!this.cueCard || !this.cueCardTitle || !this.cueCardBody) return;
    this.cardBg = child(this.cueCard, 'CardBg', new vec3(0, 0, -0.6));
    addPanelGlow(child(this.cardBg, 'SurfaceGlow', new vec3(0, CARD_CENTER_Y, -0.05)), CARD_W, CARD_H, CARD_RADIUS, 0, -1, STAGE_GLOW_CM);
    addRoundedSurface(child(this.cardBg, 'Surface', new vec3(0, CARD_CENTER_Y, 0)), CARD_W, CARD_H, 0, PANEL_FILL, PANEL_STROKE, CARD_RADIUS, STAGE_STROKE_CM);
    addRoundedSurface(child(this.cardBg, 'Accent', new vec3(CARD_ACCENT_X, CARD_TITLE_Y, 0.1)), 0.9, 6.6, 0, ACCENT_CYAN, null, 0.45);
    this.countdownPivot = child(this.cardBg, 'Countdown', new vec3(-CARD_COUNTDOWN_W / 2, CARD_COUNTDOWN_Y, 0.1));
    addSurface(child(this.countdownPivot, 'Line', new vec3(CARD_COUNTDOWN_W / 2, 0, 0)), CARD_COUNTDOWN_W, 0.9, 0, ACCENT_CYAN, null);
    const left = Rect.create(CARD_TEXT_X, CARD_RIGHT_X, -4, 4);
    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bulletDots.push(addDot(this.cardBg, `BulletDot${i}`, 0.75, new vec3(CARD_ACCENT_X, 0, 0.1), ACCENT_CYAN).getSceneObject());
      this.bulletTexts.push(this.cardText(this.cardBg, `Bullet${i}`, CARD_BODY_SIZE, TEXT_LABEL, HorizontalAlignment.Left, left, new vec3(0, 0, 0.6)));
    }
    this.counterText = this.cardText(this.cardBg, 'Counter', CARD_COUNTER_SIZE, TEXT_SECONDARY, HorizontalAlignment.Right, Rect.create(CARD_RIGHT_X - 20, CARD_RIGHT_X, -3, 3), new vec3(0, CARD_TITLE_Y, 0.6));
    this.orderMeshes(this.cardBg, 4);
    this.orderMeshes(this.cardBg.getChild(0), 3);
    this.fadeMeshes(this.cardFade, this.cardBg);
    this.bulletTexts.forEach((t) => this.fadeText(this.cardFade, t));
    this.fadeText(this.cardFade, this.counterText);
    this.pillBg = child(this.cueCard, 'PillBg', new vec3(0, PILL_Y, -0.6));
    this.pillBg.enabled = false;
    this.cueCardTitle.textFill.color = TEXT_PRIMARY;
    this.fadeText(this.cardFade, this.cueCardTitle);
    this.fadeText(this.pillFade, this.cueCardTitle);
    this.cueCardTitle.setRenderOrder(10);
    this.cueCardTitle.horizontalOverflow = HorizontalOverflow.Overflow;
    this.cueCardTitle.verticalAlignment = VerticalAlignment.Center;
    // The scene's own body Text is replaced by the bullet pool above.
    this.cueCardBody.getSceneObject().enabled = false;
    this.setCardLayout(null);
  }

  /** Cycle 1 (D4): fills the bullet pool and counter for a section (called when the card opens). */
  private fillCard(points: string[], index: number, total: number): void {
    const n = Math.min(points.length, MAX_BULLETS);
    const step = n > 2 ? CARD_BULLET_STEP_3 : CARD_BULLET_STEP;
    for (let i = 0; i < MAX_BULLETS; i++) {
      const on = i < n;
      this.bulletTexts[i].getSceneObject().enabled = on;
      this.bulletDots[i].enabled = on;
      if (!on) continue;
      const y = CARD_BULLET_Y - i * step;
      this.bulletTexts[i].text = points[i];
      this.bulletTexts[i].getSceneObject().getTransform().setLocalPosition(new vec3(0, y, 0.6));
      this.bulletDots[i].getTransform().setLocalPosition(new vec3(CARD_ACCENT_X, y + 0.2, 0.1));
    }
    if (this.counterText) this.counterText.text = `${index + 1} / ${total}`;
  }

  /** Fades the visible mode in with the morph: the card with m, the pill with 1 - m. */
  private applyFades(): void {
    const pill = !!this.pillBg && this.pillBg.enabled;
    const a = pill ? 1 - this.lastMorph : this.lastMorph;
    (pill ? this.pillFade : this.cardFade).forEach((f) => f(a));
  }

  private setCardLayout(pill: string | null): void {
    const title = this.cueCardTitle;
    const so = title.getSceneObject();
    if (this.cardBg) this.cardBg.enabled = pill === null;
    if (pill === null) {
      title.size = CARD_TITLE_SIZE;
      title.horizontalAlignment = HorizontalAlignment.Left;
      title.layoutRect = Rect.create(CARD_TEXT_X, CARD_RIGHT_X - 22, -5, 5);
      so.getTransform().setLocalPosition(new vec3(0, CARD_TITLE_Y, 0));
    } else {
      title.size = PILL_TEXT_SIZE;
      title.horizontalAlignment = HorizontalAlignment.Center;
      title.layoutRect = Rect.create(-40, 40, -5, 5);
      so.getTransform().setLocalPosition(new vec3(PILL_DOT_ZONE / 2, PILL_Y, 0));
    }
    if (!this.pillBg) return;
    this.pillBg.enabled = pill !== null;
    if (pill !== null) {
      for (let i = this.pillBg.getChildrenCount() - 1; i >= 0; i--) this.pillBg.getChild(i).destroy();
      this.pillWidth = pill.length * PILL_GLYPH_CM + 8 + PILL_DOT_ZONE;
      addPanelGlow(child(this.pillBg, 'PillGlow', new vec3(0, 0, -0.05)), this.pillWidth, PILL_H, PILL_H / 2, 0, -1, STAGE_GLOW_CM);
      addRoundedSurface(child(this.pillBg, 'Capsule'), this.pillWidth, PILL_H, 0, PANEL_FILL, PANEL_STROKE, PILL_H / 2, STAGE_STROKE_CM);
      addDot(this.pillBg, 'PillDot', PILL_DOT_R, new vec3(-this.pillWidth / 2 + PILL_H / 2, 0, 0.1), ACCENT_CYAN);
      this.orderMeshes(this.pillBg, 4);
      this.orderMeshes(this.pillBg.getChild(0), 3);
      this.pillFade.length = 0;
      this.fadeMeshes(this.pillFade, this.pillBg);
      this.fadeText(this.pillFade, title);
    }
    this.applyFades();
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
      so.getTransform().setWorldPosition(this.aheadOfHead(SUMMARY_DISTANCE_CM, SUMMARY_CENTER_Y_CM));
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

  private hideStage(): void {
    this.audience.forEach((a) => (a.enabled = false));
    this.cueCard.enabled = false;
    this.edgeHintLeft.enabled = false;
    this.edgeHintRight.enabled = false;
    this.stageLine.enabled = false;
    this.meter?.setVisible(false);
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
      this.rig?.setHalo(i, v.color, fade);
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
        const meterY = layout.stageCenter.y + LIT_HEAD_TOP_CM + METER_ABOVE_HEAD_CM + METER_CAPSULE_H_CM / 2;
        setPos(this.cueCard, { x: layout.cardAnchor.x, y: meterY + METER_CARD_OFFSET_CM, z: layout.cardAnchor.z });
        this.meter?.placeAt(new vec3(layout.cardAnchor.x, meterY, layout.cardAnchor.z), head);
        setPos(this.stageLine, layout.stageCenter);
        faceTowards(this.stageLine, head, true);
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
      showCard: (section, index, total) => {
        this.cueCard.enabled = true;
        this.cueCardTitle.text = section.title;
        this.fillCard(section.points, index, total);
        this.setCardLayout(null);
      },
      showPill: (tag) => {
        this.cueCardTitle.text = tag;
        this.setCardLayout(tag);
      },
      hide: () => {
        this.cueCard.enabled = false;
        this.lastMorph = 0;
      },
      applyMorph: (m) => {
        this.lastMorph = m;
        const s = PILL_SCALE + (1 - PILL_SCALE) * m; // the pill is 1.2x the card's scale: the card shrinks to the pill, the pill pops out
        this.cueCard.getTransform().setLocalScale(new vec3(s, s, s));
        this.applyFades();
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
            0.95,
          );
          this.stageGlow.forEach((g) => (g.visual.mainPass.baseColor = new vec4(Math.min(1, c[0] * boost), Math.min(1, c[1] * boost), Math.min(1, c[2] * boost), g.alpha)));
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
