/**
 * EyesUpApp.ts — Lens component on the `EyesUp` root: state machine host, service injection,
 * tunables (plan: angle 7°, fill 1 s, drain 12 s, nudge 8 s, card 4 s, dwell 1 s).
 *
 * All behavior lives in core/EyesUpSession.ts (unit + integration tested in Node). This file only
 * adapts Lens Studio objects to the session's view interfaces and forwards pinches.
 * Untested in Lens Studio so far: (미확인: Lens Studio에서 확인)
 *  - camera look direction = Transform.back (see GazeProvider.ts)
 *  - halo color via RenderMeshVisual.mainPass.baseColor (vec4 rgba)
 *  - AudioComponent.play(1) for chime/tick/tone/applause
 */
import { HaloVisual } from './AttentionMeter';
import { CueCardView } from './CueCardController';
import { CameraGazeProvider, GazeProvider, ScriptedGazeProvider } from './GazeProvider';
import { Podium } from './Podium';
import { SetupPanel } from './SetupPanel';
import { StageLayout } from './StagePlacer';
import { SummaryPanel } from './SummaryPanel';
import { AudienceView, EyesUpSession, SessionViews } from './core/EyesUpSession';
import { podiumState } from './core/PodiumModel';
import { Vec3Like } from './core/math';

/** Stage line colors (design): cool white while running, amber at 0 s. Never black. */
const LINE_COLOR: [number, number, number] = [0.75, 0.85, 1.0];
const LINE_AMBER: [number, number, number] = [1.0, 0.72, 0.2];

@component
export class EyesUpApp extends BaseScriptComponent {
  // ---- tunables (plan) ----
  @input @hint('Gaze counts as "looking at" within this angle (deg)') lookAngleDeg: number = 7;
  @input @hint('Seconds for a halo to fill') fillSeconds: number = 1;
  @input @hint('Seconds for a halo to drain') drainSeconds: number = 12;
  @input @hint('Seconds a zone may stay below 0.2 before a nudge') nudgeSeconds: number = 8;
  @input @hint('Seconds the cue card stays open') cardSeconds: number = 4;
  @input @hint('Seconds of gaze on the pill to re-open the card') dwellSeconds: number = 1;

  // ---- scene references ----
  @input camera!: SceneObject;
  @input @hint('Audience_1..9 roots, left to right') audience!: SceneObject[];
  @input @hint('One halo visual per audience member') halos!: RenderMeshVisual[];
  @input cueCard!: SceneObject;
  @input cueCardTitle!: Text;
  @input cueCardBody!: Text;
  @input edgeHintLeft!: SceneObject;
  @input edgeHintRight!: SceneObject;
  @input nudgeAudioL!: AudioComponent;
  @input nudgeAudioR!: AudioComponent;
  @input stageLine!: SceneObject;
  @input stageLineVisual!: RenderMeshVisual;
  @input tickAudio!: AudioComponent;
  @input toneAudio!: AudioComponent;
  @input applauseAudio!: AudioComponent;
  @input podium!: Podium;
  @input setupPanel!: SetupPanel;
  @input summaryPanel!: SummaryPanel;
  @input @hint('LEAF only: drive gaze from ScriptedGazeProvider instead of the camera') useScriptedGaze: boolean = false;

  private session!: EyesUpSession;
  private gaze!: GazeProvider;
  private scripted: ScriptedGazeProvider | null = null;

  onAwake(): void {
    const camTransform = this.camera.getTransform();
    if (this.useScriptedGaze) {
      this.scripted = new ScriptedGazeProvider(camTransform.getWorldPosition(), camTransform.back);
      this.gaze = this.scripted;
    } else {
      this.gaze = new CameraGazeProvider(camTransform);
    }

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
      },
      this.makeViews(),
    );

    this.session.onEvent((e) => {
      if (e.type === 'phase') this.onPhase();
      if (e.type === 'finishPrompt') this.cueCardTitle.text = 'Finish?';
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

    this.createEvent('OnStartEvent').bind(() => {
      this.hideStage();
      this.session.launch(); // Launch -> Setup on lens start
    });
    this.createEvent('UpdateEvent').bind(() => this.onUpdate(getDeltaTime()));
  }

  /** LEAF hook: the ScriptedGazeProvider (null unless useScriptedGaze). */
  getScriptedGaze(): ScriptedGazeProvider | null {
    return this.scripted;
  }

  /** LEAF/debug hook: read-only access to the session. */
  getSession(): EyesUpSession {
    return this.session;
  }

  private onUpdate(dt: number): void {
    this.session.update(dt);
    this.podium.apply(
      podiumState({
        phase: this.session.phase,
        gazeForward: this.gaze.forward,
        cardIndex: this.session.cardIndex,
        cardTotal: this.session.cardTotal,
        elapsedSeconds: this.session.elapsedSeconds,
        podiumPitchDeg: this.session.t.podiumPitchDeg,
      }),
    );
  }

  private onPhase(): void {
    const phase = this.session.phase;
    this.setupPanel.show(phase === 'Setup');
    this.summaryPanel.show(phase === 'Summary' ? this.session.summary : null);
    const onStage = phase === 'Placing' || phase === 'Rehearsal' || phase === 'Finishing';
    this.stageLine.enabled = onStage;
    if (!onStage) this.cueCard.enabled = false;
    const layout = this.session.layout;
    if (layout && phase === 'Placing') this.podium.placeAt(layout.podiumPosition.x, layout.podiumPosition.y, layout.podiumPosition.z);
  }

  private hideStage(): void {
    this.audience.forEach((a) => (a.enabled = false));
    this.cueCard.enabled = false;
    this.edgeHintLeft.enabled = false;
    this.edgeHintRight.enabled = false;
    this.stageLine.enabled = false;
    this.summaryPanel.show(null);
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
        this.audience.forEach((so, i) => {
          so.enabled = i < count;
          if (i < count) {
            setPos(so, layout.seats[i]);
            baseScale[i] = baseScale[i] ?? so.getTransform().getLocalScale().x;
          }
        });
        setPos(this.cueCard, layout.cardAnchor);
        setPos(this.stageLine, layout.stageCenter);
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
        this.cueCardBody.text = section.points.join('\n');
        this.cueCardBody.getSceneObject().enabled = true;
      },
      showPill: (tag) => {
        this.cueCardTitle.text = tag;
        this.cueCardBody.getSceneObject().enabled = false;
      },
      hide: () => (this.cueCard.enabled = false),
      applyMorph: (m) => {
        const s = 0.4 + 0.6 * m; // pill is 40% of the card size (design)
        this.cueCard.getTransform().setLocalScale(new vec3(s, s, s));
      },
    };

    return {
      audience,
      cueCard,
      nudgeAudio: { playChime: (side) => (side === 'left' ? this.nudgeAudioL : this.nudgeAudioR).play(1) },
      edgeHint: {
        show: (side) => {
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
          this.stageLine.getTransform().setLocalScale(new vec3(Math.max(0.001, v.progress), 1, 1));
        },
      },
      stageLineAudio: { playTimeUpTone: () => this.toneAudio.play(1) },
      sfx: { playTick: () => this.tickAudio.play(1), playApplause: () => this.applauseAudio.play(1) },
    };
  }
}
