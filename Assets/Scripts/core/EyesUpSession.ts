/**
 * EyesUpSession — the whole Eyes Up loop without Lens Studio.
 *
 * EyesUpApp.ts (the Lens component) owns one of these, feeds it `update(getDeltaTime())` from an
 * UpdateEvent, forwards pinch callbacks (start/next/prev/finish/again/done/replace), and gives it
 * view adapters that touch SceneObjects. Tests and the integration test drive it directly with a
 * ScriptedGazeProvider and fake views.
 */
import { AttentionMeter, HaloView, haloVisualFor } from '../AttentionMeter';
import { CardEvent, CueCardController, CueCardView } from '../CueCardController';
import { DEFAULT_DECK_ID, getDeck } from '../DeckData';
import { GazeProvider } from '../GazeProvider';
import { GazeTracker } from '../GazeTracker';
import { EdgeHintView, NudgeAudio, NudgeController, NudgeEvent } from '../NudgeController';
import { SessionStats, StatsSnapshot } from '../SessionStats';
import { StageLayout, computeStageLayout } from '../StagePlacer';
import { StageLine, StageLineAudio, StageLineEvent, StageLineView } from '../StageLine';
import { AppAction, AppStateMachine, Phase } from './AppStateMachine';
import { AudienceLook, audienceLook } from './AudienceLook';
import { EngagementModel } from './Engagement';
import { GameResult, MeterTone, applauseAmplitude, applauseVolume, gameResult, meterTone } from './GameScore';
import { KeyValueStore, StageBests } from './StageProgress';
import { LiveScore, ScoreGain } from './LiveScore';
import { PillRect, uprightPillRect } from './PillHit';
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
  audienceCount: 3,
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
  /** Game layer: slump / dim / phone glow / perk-up burst for member `i` (optional, Lens side only). */
  applyLook?(index: number, look: AudienceLook): void;
}

export interface SfxView {
  playTick(): void;
  /** `volume` 0.3..1 scales with the attention score (game layer). */
  playApplause(volume?: number): void;
}

/** Game layer: the glanceable room attention meter (0..1 level, tone picks the colour). */
export interface RoomMeterVisual {
  level: number;
  tone: MeterTone;
  /** Whole percent, e.g. 86. */
  percent: number;
}

export interface RoomMeterView {
  apply(visual: RoomMeterVisual): void;
  setVisible(visible: boolean): void;
}

export interface SessionViews {
  audience?: AudienceView;
  cueCard?: CueCardView;
  nudgeAudio?: NudgeAudio;
  edgeHint?: EdgeHintView;
  stageLine?: StageLineView;
  stageLineAudio?: StageLineAudio;
  sfx?: SfxView;
  roomMeter?: RoomMeterView;
  /** Where per-stage bests are kept (Lens persistent storage); in memory when absent. */
  bestsStore?: KeyValueStore;
}

export type SessionEvent =
  | { type: 'phase'; from: Phase; to: Phase; action: AppAction }
  | CardEvent
  | NudgeEvent
  | StageLineEvent
  | { type: 'finishPrompt' }
  | { type: 'perkUp'; index: number }
  | ({ type: 'score' } & ScoreGain);

export type SubState = 'Nudge' | 'CardExpanded' | 'TimeUp';

export class EyesUpSession {
  readonly t: Tunables;
  private readonly sm = new AppStateMachine();
  private readonly tracker: GazeTracker;
  private readonly attention: AttentionMeter;
  private readonly engagement: EngagementModel;
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
  private _game: GameResult | null = null;
  /** Best finished run per stage (audience size). */
  readonly stageBests: StageBests;
  private readonly live: LiveScore;

  constructor(
    private readonly gaze: GazeProvider,
    tunables: Partial<Tunables> = {},
    private readonly views: SessionViews = {},
  ) {
    this.t = makeTunables(tunables);
    this.stageBests = new StageBests(views.bestsStore ?? null);
    this.tracker = new GazeTracker(this.t);
    this.attention = new AttentionMeter(this.t);
    this.engagement = new EngagementModel(this.t);
    this.live = new LiveScore(this.t.fillSeconds);
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

  /** Per-member engagement 0..1 (game layer). */
  get engagementValues(): readonly number[] {
    return this.engagement.engagement;
  }

  /** Mean engagement of the room now, 0..1 (the room attention meter). */
  get roomAttention(): number {
    return this.engagement.room;
  }

  /** Live points of this run (core/LiveScore.ts). */
  get score(): number {
    return this.live.score;
  }

  /** Current combo chain (2..5 shows "COMBO xN"). */
  get combo(): number {
    return this.live.combo;
  }

  get lastGain(): ScoreGain | null {
    return this.live.lastGain;
  }

  /** Rehearsal seconds at which the combo last broke (-Infinity = never); compare with `scoreClock`. */
  get comboBrokenAt(): number {
    return this.live.comboBrokenAt;
  }

  /** The live-score clock (rehearsal seconds). */
  get scoreClock(): number {
    return this.live.elapsed;
  }

  /** Points of the best finished run on the current stage (0 before the first Finish there). */
  get bestPoints(): number {
    return this.stageBests.get(this._config.audienceCount)?.points ?? 0;
  }

  /** Score / grade of the finished run (null until Finish). */
  get game(): GameResult | null {
    return this._game;
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

  /** The pill rectangle the dwell is tested against (null unless the pill is showing). */
  get pillRect(): PillRect | null {
    return this.tracker.pillRect;
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
    const stage = this._config.audienceCount;
    this._game = gameResult(this._summary.balanceScore, this.engagement.roomAverage, this.stageBests.get(stage), this.live.score);
    this.stageBests.record(stage, this._game);
    const cancelled = this.nudge.cancel();
    if (cancelled) this.emit(cancelled);
    this.card.hide();
    this.tracker.setPillTarget(null);
    this.phaseTime = 0;
    this.views.sfx?.playApplause(applauseVolume(this._game.score));
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
        this.views.audience?.setApplauseScale(
          applauseScale(this.phaseTime, this.t.applauseSeconds, applauseAmplitude(this._game?.score ?? 50)),
        );
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
    this.tracker.setPillTarget(null); // pass 7: no stale pill rect or dwell latch across Re-place / Again
    this.attention.reset(n);
    this.card.load(getDeck(this._config.deckId));
    const cancelled = this.nudge.cancel();
    if (cancelled) this.emit(cancelled);
    this.nudge.reset();
    this._summary = null;
    this._game = null;
    this.engagement.reset(n);
    this.live.reset(n);
    this.phaseTime = 0;
    this.views.audience?.place(this._layout, n);
    this.views.audience?.setVisible(true);
    this.views.audience?.setFade(0);
    this.views.audience?.setApplauseScale(1);
    this.attention.applyTo(this.views.audience ?? NO_HALO);
    this.applyGame();
    this.views.roomMeter?.setVisible(true);
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
    for (const index of this.engagement.update(dt, frame.looking)) this.emit({ type: 'perkUp', index });
    for (const g of this.live.update(dt, frame.looking)) this.emit({ type: 'score', ...g });
    this.applyGame();
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
    // Pass 6: dwell on the pill's real rectangle (live transform), not a cone around cardAnchor.
    this.tracker.setPillTarget(this.card.mode === 'pill' ? this.currentPillRect(layout) : null);

    for (const e of this.line.update(this._elapsed, dt)) this.emit(e);

    if (!this.finishPrompted && this._elapsed >= this.targetSeconds + this.t.finishPromptAfterSeconds) {
      this.finishPrompted = true;
      this.emit({ type: 'finishPrompt' });
    }
  }

  /** Push halo, silhouette look and the room meter to the views. */
  private applyGame(): void {
    const view = this.views.audience;
    if (view) {
      const att = this.attention.attention;
      const eng = this.engagement.engagement;
      const burst = this.engagement.burst;
      for (let i = 0; i < att.length; i++) {
        const look = audienceLook(eng[i], burst[i]);
        view.applyHalo(i, haloVisualFor(att[i], look.haloBurstAlpha));
        view.applyLook?.(i, look);
      }
    }
    const level = this.engagement.room;
    this.views.roomMeter?.apply({ level, tone: meterTone(level), percent: Math.round(100 * level) });
  }

  private currentPillRect(layout: StageLayout): PillRect | null {
    const view = this.views.cueCard;
    if (view && view.pillRect) return view.pillRect();
    return uprightPillRect(layout.cardAnchor, this.gaze.origin, FALLBACK_PILL_HALF_W, FALLBACK_PILL_HALF_H);
  }

  private emit(e: SessionEvent): void {
    for (const l of this.listeners) l(e);
  }
}

const NO_HALO: HaloView = { applyHalo: () => undefined };
/** Pill size used when the view does not report one (Node tests): ~30 × 10 cm at the card anchor. */
const FALLBACK_PILL_HALF_W = 15;
const FALLBACK_PILL_HALF_H = 5;

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

/** Applause pulse: scale 1 ± amplitude (0.05 = plan S3; the game layer scales it 0.02 to 0.09 with the score), three times over `duration` (plan S3). */
export function applauseScale(t: number, duration: number, amplitude = 0.05): number {
  if (t <= 0 || t >= duration) return 1;
  return 1 + amplitude * Math.sin((2 * Math.PI * 3 * t) / duration);
}
