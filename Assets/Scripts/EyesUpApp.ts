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
import { HaloVisual } from './AttentionMeter';
import { CueCardView } from './CueCardController';
import { getDeck } from './DeckData';
import { chevronPulse } from './NudgeController';
import { CameraGazeProvider, ScriptedGazeProvider, SwitchableGazeProvider } from './GazeProvider';
import { Podium } from './Podium';
import { SetupPanel } from './SetupPanel';
import { StageLayout } from './StagePlacer';
import { SummaryPanel } from './SummaryPanel';
import { AudienceView, EyesUpSession, SessionViews } from './core/EyesUpSession';
import { podiumState } from './core/PodiumModel';
import { Vec3Like } from './core/math';
import { ACCENT_CYAN, addIcon, addSurface, child, faceTowards } from './EyesUpUI';

/**
 * Pass 5 nudge chevron (artifact S3): a 6 × 6 cm amber double chevron ("‹‹" / "››", Material
 * keyboard_double_arrow_*) above a "left" / "right" caption. The hint's scene Text (±20 cm, 100 cm
 * ahead of the camera) becomes the caption; the icon is added at awake 4 cm above it.
 */
const CHEVRON_CM = 6;
const CHEVRON_ICON_Y = 4.2;
/** ≈ 1.5 cm caption at 100 cm (S3: "left" 1.5 cm). */
const CHEVRON_CAPTION_SIZE = 90;

/** Stage line colors (design): cool white while running, amber at 0 s. Never black. */
const LINE_COLOR: [number, number, number] = [0.75, 0.85, 1.0];
const LINE_AMBER: [number, number, number] = [1.0, 0.72, 0.2];

/** Panel placement (brief "Where things live"). */
const SETUP_DISTANCE_CM = 110;
const SETUP_BELOW_EYES_CM = 10;
const SUMMARY_DISTANCE_CM = 150;
/** design: panels follow the head only while the preview/device pose settles, then stay put. */
const PANEL_SETTLE_SECONDS = 1.0;

/**
 * Pass 4 cue card (artifact S4, widened per its own note): a 64 × 26 cm backing at 2.5 m, title
 * (size 240, was 200) and two bullets (140, was 130), and a cyan countdown line that empties over the 4 s.
 * The pill keeps 90 % of card scale (was 40 %) so the 3-word tag reads from the start position.
 */
const CARD_W = 64;
const CARD_H = 26;
/** The card sits above the anchor (bottom edge 2 cm below it) so it clears the audience's heads. */
const CARD_CENTER_Y = 11;
const CARD_TITLE_Y = 18.5;
const CARD_BODY_Y = 9;
const CARD_COUNTDOWN_Y = 1.4;
const CARD_COUNTDOWN_W = 58;
const CARD_TITLE_SIZE = 240;
const CARD_BODY_SIZE = 140;
const PILL_SCALE = 0.9;
const PILL_H = 10;
const PILL_Y = 5;
/** Measured in Preview: ≈ 0.0124 cm per size unit per glyph for Inter titles (size 200 → 2.5 cm). */
const PILL_GLYPH_CM = 0.0124 * CARD_TITLE_SIZE;
const CARD_FILL = new vec4(0.17, 0.23, 0.33, 0.9);
const CARD_FRAME = new vec4(0.6, 0.85, 1.0, 0.8);

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
  private cardBg: SceneObject | null = null;
  private pillBg: SceneObject | null = null;
  private countdownPivot: SceneObject | null = null;
  /** Seconds since the chevron appeared (1 Hz pulse) and each side's base text color. */
  private hintAge = 0;
  private hintTexts: [Text | null, Text | null] = [null, null];
  private hintIcons: [Image | null, Image | null] = [null, null];
  private hintColors: [vec4, vec4] = [new vec4(1, 1, 1, 1), new vec4(1, 1, 1, 1)];

  onAwake(): void {
    this.collectAudience();
    this.buildCueCard();
    [this.edgeHintLeft, this.edgeHintRight].forEach((so, i) => {
      if (!so) return;
      const t = so.getComponent('Component.Text') as Text;
      if (t) {
        t.text = i === 0 ? 'left' : 'right';
        t.size = CHEVRON_CAPTION_SIZE;
        this.hintColors[i] = t.textFill.color;
      }
      this.hintTexts[i] = t;
      this.hintIcons[i] = addIcon(so, i === 0 ? 'double_arrow_left' : 'double_arrow_right', CHEVRON_CM, new vec3(0, CHEVRON_ICON_Y, 0));
    });
    // Each halo gets its own material so attention colors are per member.
    this.halos.forEach((h) => {
      if (h) h.mainMaterial = h.mainMaterial.clone();
    });
    if (this.stageLineVisual) this.stageLineVisual.mainMaterial = this.stageLineVisual.mainMaterial.clone();

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

  /** LEAF hook: the ScriptedGazeProvider (null until scripted gaze is on). */
  getScriptedGaze(): ScriptedGazeProvider | null {
    return this.scripted;
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
      const t = this.hintTexts[i];
      const c = this.hintColors[i];
      const a = 0.35 + 0.65 * p;
      if (t) t.textFill.color = new vec4(c.x, c.y, c.z, c.w * a);
      // Icon material is premultiplied: scale every channel to fade.
      const img = this.hintIcons[i];
      if (img) img.mainMaterial.mainPass.baseColor = new vec4(a, a, a, a);
      const s = 0.9 + 0.15 * p;
      so.getTransform().setLocalScale(new vec3(s, s, s));
    });
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
    addSurface(this.pillBg, pill.length * PILL_GLYPH_CM + 8, PILL_H, 0, CARD_FILL, CARD_FRAME);
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
      so.getTransform().setWorldPosition(this.aheadOfHead(SUMMARY_DISTANCE_CM, 0));
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
    });
    const onStage = phase === 'Placing' || phase === 'Rehearsal' || phase === 'Finishing';
    this.stageLine.enabled = onStage;
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
    this.summaryPanel.show(null);
  }

  private play(a: AudioComponent | undefined): void {
    if (a) a.play(1);
  }

  private makeViews(): SessionViews {
    const setPos = (so: SceneObject, p: Vec3Like) => so.getTransform().setWorldPosition(new vec3(p.x, p.y, p.z));
    const baseScale: number[] = [];
    let fade = 1;
    let applause = 1;
    const lastHalo: HaloVisual[] = [];
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
        setPos(this.cueCard, layout.cardAnchor);
        setPos(this.stageLine, layout.stageCenter);
        faceTowards(this.stageLine, head, true);
      },
      setVisible: (v) => this.audience.forEach((so, i) => (so.enabled = v && i < (this.session ? this.session.config.audienceCount : 0))),
      setFade: (a) => {
        fade = a;
        lastHalo.forEach((_, i) => applyMember(i));
      },
      setApplauseScale: (s) => {
        applause = s;
        lastHalo.forEach((_, i) => applyMember(i));
      },
      applyHalo: (i, v) => {
        lastHalo[i] = v;
        applyMember(i);
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
      sfx: { playTick: () => this.play(this.tickAudio), playApplause: () => this.play(this.applauseAudio) },
    };
  }
}
