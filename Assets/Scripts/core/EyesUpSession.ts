/**
 * EyesUpSession — the whole Eyes Up loop without Lens Studio.
 *
 * EyesUpApp.ts (the Lens component) owns one of these, feeds it `update(getDeltaTime())` from an
 * UpdateEvent, forwards pinch callbacks (start/next/prev/finish/again/done/replace), and gives it
 * view adapters that touch SceneObjects. Tests and the integration test drive it directly with a
 * ScriptedGazeProvider and fake views.
 */
import { AttentionMeter, HaloView } from '../AttentionMeter';
import { CardEvent, CueCardController, CueCardView } from '../CueCardController';
import { DEFAULT_DECK_ID, getDeck } from '../DeckData';
import { GazeProvider } from '../GazeProvider';
import { GazeTracker } from '../GazeTracker';
import { EdgeHintView, NudgeAudio, NudgeController, NudgeEvent } from '../NudgeController';
import { SessionStats, StatsSnapshot } from '../SessionStats';
import { StageLayout, computeStageLayout } from '../StagePlacer';
import { StageLine, StageLineAudio, StageLineEvent, StageLineView } from '../StageLine';
import { AppAction, AppStateMachine, Phase } from './AppStateMachine';
import { Tunables, ZONES, Zone, makeTunables, zoneOf } from './Tunables';
import { Vec3Like, add, scale, sub } from './math';

export interface SessionConfig {
  /** Talk length in minutes (Setup slider: 3 / 5 / 10). */
  lengthMinutes: number;
  /** Audience size (3 / 6 / 9). */
  audienceCount: number;
  deckId: string;
}

export const DEFAULT_CONFIG: Readonly<SessionConfig> = Object.freeze({
  lengthMinutes: 3,
  audienceCount: 6,
  deckId: DEFAULT_DECK_ID,
});

/** Lens adapter for the Audience_1..9 prefabs (AudienceMember.ts on the Lens side). */
export interface AudienceView extends HaloView {
  place(layout: StageLayout, count: number): void;
  setVisible(visible: boolean): void;
  /** 0..1 during the 0.5 s fade-in. */
  setFade(alpha: number): void;
  /** Applause pulse scale (0.95..1.05) during Finishing, 1 otherwise. */
  setApplauseScale(scale: number): void;
}

export interface SfxView {
  playTick(): void;
  playApplause(): void;
}

export interface SessionViews {
  audience?: AudienceView;
  cueCard?: CueCardView;
  nudgeAudio?: NudgeAudio;
  edgeHint?: EdgeHintView;
  stageLine?: StageLineView;
  stageLineAudio?: StageLineAudio;
  sfx?: SfxView;
}

export type SessionEvent =
  | { type: 'phase'; from: Phase; to: Phase; action: AppAction }
  | CardEvent
  | NudgeEvent
  | StageLineEvent
  | { type: 'finishPrompt' };

export type SubState = 'Nudge' | 'CardExpanded' | 'TimeUp';

export class EyesUpSession {
  readonly t: Tunables;
  private readonly sm = new AppStateMachine();
  private readonly tracker: GazeTracker;
  private readonly attention: AttentionMeter;
  private readonly stats = new SessionStats();
  private readonly nudge: NudgeController;
  private readonly card: CueCardController;
  private readonly line: StageLine;
  private listeners: Array<(e: SessionEvent) => void> = [];

  private _config: SessionConfig = { ...DEFAULT_CONFIG };
  private _layout: StageLayout | null = null;
  private phaseTime = 0;
  private _elapsed = 0;
  private finishPrompted = false;
  private _summary: StatsSnapshot | null = null;

  constructor(
    private readonly gaze: GazeProvider,
    tunables: Partial<Tunables> = {},
    private readonly views: SessionViews = {},
  ) {
    this.t = makeTunables(tunables);
    this.tracker = new GazeTracker(this.t);
    this.attention = new AttentionMeter(this.t);
    this.nudge = new NudgeController(this.t, views.nudgeAudio, views.edgeHint);
    this.card = new CueCardController(this.t, views.cueCard);
    this.line = new StageLine(views.stageLine, views.stageLineAudio);
    this.sm.onChange((from, to, action) => this.emit({ type: 'phase', from, to, action }));
  }

  // ---- queries -------------------------------------------------------------------------------

  get phase(): Phase {
    return this.sm.phase;
  }

  get config(): SessionConfig {
    return { ...this._config };
  }

  get layout(): StageLayout | null {
    return this._layout;
  }

  get elapsedSeconds(): number {
    return this._elapsed;
  }

  get targetSeconds(): number {
    return this._config.lengthMinutes * 60;
  }

  get attentionValues(): readonly number[] {
    return this.attention.attention;
  }

  get cardMode() {
    return this.card.mode;
  }

  get cardIndex(): number {
    return this.card.index;
  }

  get cardTotal(): number {
    return this.card.total;
  }

  /** 1 → 0 over the time the card is open (cyan countdown line on the card). */
  get cardCountdown(): number {
    return this.card.countdown;
  }

  get cardTitle(): string | null {
    return this.card.section ? this.card.section.title : null;
  }

  get activeNudge() {
    return this.nudge.active;
  }

  get nudgeCount(): number {
    return this.nudge.count;
  }

  get stageLineVisual() {
    return this.line.current;
  }

  get summary(): StatsSnapshot | null {
    return this._summary;
  }

  get gazeZone(): Zone | null {
    return this.tracker.gazeZone;
  }

  liveStats(): StatsSnapshot {
    return this.stats.snapshot();
  }

  lookingAt(i: number): boolean {
    return this.tracker.lookingAt(i);
  }

  subStates(): SubState[] {
    if (this.phase !== 'Rehearsal') return [];
    const s: SubState[] = [];
    if (this.nudge.active) s.push('Nudge');
    if (this.card.mode === 'card') s.push('CardExpanded');
    if (this._elapsed >= this.targetSeconds) s.push('TimeUp');
    return s;
  }

  onEvent(listener: (e: SessionEvent) => void): void {
    this.listeners.push(listener);
  }

  // ---- actions (pinch handlers) --------------------------------------------------------------

  launch(): boolean {
    return this.sm.dispatch('launch');
  }

  /** Setup panel edits. Only allowed in Setup (values persist for Again). */
  configure(patch: Partial<SessionConfig>): boolean {
    if (this.phase !== 'Setup') return false;
    const next = { ...this._config, ...patch };
    getDeck(next.deckId); // throws on unknown deck
    if (!(next.lengthMinutes > 0) || !Number.isInteger(next.audienceCount) || next.audienceCount < 1) {
      throw new Error(`invalid session config ${JSON.stringify(next)}`);
    }
    this._config = next;
    return true;
  }

  start(): boolean {
    if (!this.sm.can('start')) return false;
    this.views.sfx?.playTick();
    return this.enterPlacing('start');
  }

  again(): boolean {
    return this.sm.can('again') ? this.enterPlacing('again') : false;
  }

  replace(): boolean {
    return this.sm.can('replace') ? this.enterPlacing('replace') : false;
  }

  done(): boolean {
    if (!this.sm.can('done')) return false;
    this.views.audience?.setVisible(false);
    return this.sm.dispatch('done');
  }

  next(): boolean {
    if (this.phase !== 'Rehearsal') return false;
    this.emit(this.card.next());
    return true;
  }

  prev(): boolean {
    if (this.phase !== 'Rehearsal') return false;
    this.emit(this.card.prev());
    return true;
  }

  finish(): boolean {
    if (!this.sm.can('finish')) return false;
    this._summary = this.stats.snapshot();
    const cancelled = this.nudge.cancel();
    if (cancelled) this.emit(cancelled);
    this.card.hide();
    this.tracker.setPillTarget(null);
    this.phaseTime = 0;
    this.views.sfx?.playApplause();
    return this.sm.dispatch('finish');
  }

  // ---- frame ---------------------------------------------------------------------------------

  update(dt: number): void {
    if (!(dt > 0)) return;
    this.phaseTime += dt;
    switch (this.phase) {
      case 'Placing':
        this.views.audience?.setFade(Math.min(1, this.phaseTime / this.t.placingSeconds));
        if (this.phaseTime >= this.t.placingSeconds - 1e-9) this.beginRehearsal();
        break;
      case 'Rehearsal':
        this.rehearsalFrame(dt);
        break;
      case 'Finishing':
        this.views.audience?.setApplauseScale(applauseScale(this.phaseTime, this.t.applauseSeconds));
        if (this.phaseTime >= this.t.applauseSeconds - 1e-9) {
          this.views.audience?.setApplauseScale(1);
          this.phaseTime = 0;
          this.sm.dispatch('applauseDone');
        }
        break;
      default:
        break;
    }
  }

  // ---- internals -----------------------------------------------------------------------------

  private enterPlacing(action: 'start' | 'again' | 'replace'): boolean {
    const n = this._config.audienceCount;
    this._layout = computeStageLayout(this.gaze.origin, this.gaze.forward, n, this.t);
    this.tracker.setTargets(this._layout.eyeTargets);
    this.attention.reset(n);
    this.card.load(getDeck(this._config.deckId));
    const cancelled = this.nudge.cancel();
    if (cancelled) this.emit(cancelled);
    this.nudge.reset();
    this._summary = null;
    this.phaseTime = 0;
    this.views.audience?.place(this._layout, n);
    this.views.audience?.setVisible(true);
    this.views.audience?.setFade(0);
    this.views.audience?.setApplauseScale(1);
    this.attention.applyTo(this.views.audience ?? NO_HALO);
    return this.sm.dispatch(action);
  }

  private beginRehearsal(): void {
    this._elapsed = 0;
    this.finishPrompted = false;
    this.stats.reset();
    this.line.reset(this.targetSeconds);
    this.phaseTime = 0;
    this.views.audience?.setFade(1);
    this.sm.dispatch('placed');
    this.emit(this.card.start());
  }

  private rehearsalFrame(dt: number): void {
    this._elapsed += dt;
    const layout = this._layout as StageLayout;
    const frame = this.tracker.update(dt, this.gaze);

    this.attention.update(dt, frame.looking);
    if (this.views.audience) this.attention.applyTo(this.views.audience);
    this.stats.update(dt, frame.gazeZone);

    const origin = this.gaze.origin;
    const zoneDirections = ZONES.map((z) => sub(zoneCenter(layout.eyeTargets, z), origin)) as [Vec3Like, Vec3Like, Vec3Like];
    for (const e of this.nudge.update(dt, {
      zoneAttention: this.attention.zoneAttentions(),
      gazeZone: frame.gazeZone,
      gazeForward: this.gaze.forward,
      zoneDirections,
    })) {
      if (e.type === 'nudgeStart') this.stats.recordNudge();
      this.emit(e);
    }

    if (frame.dwellFired) {
      const e = this.card.expand('dwell');
      if (e) {
        this.stats.recordCardExpand();
        this.emit(e);
      }
    }
    const cardEvent = this.card.update(dt);
    if (cardEvent) this.emit(cardEvent);
    this.tracker.setPillTarget(this.card.mode === 'pill' ? layout.cardAnchor : null);

    for (const e of this.line.update(this._elapsed, dt)) this.emit(e);

    if (!this.finishPrompted && this._elapsed >= this.targetSeconds + this.t.finishPromptAfterSeconds) {
      this.finishPrompted = true;
      this.emit({ type: 'finishPrompt' });
    }
  }

  private emit(e: SessionEvent): void {
    for (const l of this.listeners) l(e);
  }
}

const NO_HALO: HaloView = { applyHalo: () => undefined };

function zoneCenter(points: readonly Vec3Like[], zone: Zone): Vec3Like {
  let sum: Vec3Like = { x: 0, y: 0, z: 0 };
  let n = 0;
  points.forEach((p, i) => {
    if (zoneOf(i, points.length) === zone) {
      sum = add(sum, p);
      n++;
    }
  });
  return n > 0 ? scale(sum, 1 / n) : sum;
}

/** Applause pulse: scale 0.95 <-> 1.05, three times over `duration` (plan S3). */
export function applauseScale(t: number, duration: number): number {
  if (t <= 0 || t >= duration) return 1;
  return 1 + 0.05 * Math.sin((2 * Math.PI * 3 * t) / duration);
}
