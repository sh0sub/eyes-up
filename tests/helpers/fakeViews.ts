import { HaloVisual } from '../../Assets/Scripts/AttentionMeter';
import { AudienceLook } from '../../Assets/Scripts/core/AudienceLook';
import { RoomMeterVisual, SessionEvent, SessionViews } from '../../Assets/Scripts/core/EyesUpSession';
import { Side } from '../../Assets/Scripts/NudgeController';
import { StageLayout } from '../../Assets/Scripts/StagePlacer';
import { StageLineVisual } from '../../Assets/Scripts/StageLine';

/** Records what a Lens scene would show, so tests can assert on "scene state". */
export class FakeScene {
  audienceVisible = false;
  audienceActiveCount = 0;
  fade = 0;
  layout: StageLayout | null = null;
  halos: HaloVisual[] = [];
  applauseScales: number[] = [];
  card: { mode: 'hidden' | 'card' | 'pill'; text: string } = { mode: 'hidden', text: '' };
  edgeHint: Side | null = null;
  chimes: Side[] = [];
  stageLine: StageLineVisual = { progress: 0, amber: false, pulse: 0 };
  sfx: string[] = [];
  looks: AudienceLook[] = [];
  meter: RoomMeterVisual | null = null;
  meterVisible = false;
  applauseVolume: number | null = null;
  events: SessionEvent[] = [];

  views(): SessionViews {
    return {
      audience: {
        place: (layout, count) => {
          this.layout = layout;
          this.audienceActiveCount = count;
        },
        setVisible: (v) => (this.audienceVisible = v),
        setFade: (a) => (this.fade = a),
        setApplauseScale: (s) => this.applauseScales.push(s),
        applyHalo: (i, v) => (this.halos[i] = v),
        applyLook: (i, l) => (this.looks[i] = l),
      },
      cueCard: {
        showCard: (s) => (this.card = { mode: 'card', text: s.title }),
        showPill: (tag) => (this.card = { mode: 'pill', text: tag }),
        hide: () => (this.card = { mode: 'hidden', text: '' }),
      },
      nudgeAudio: { playChime: (s) => this.chimes.push(s) },
      edgeHint: { show: (s) => (this.edgeHint = s), hide: () => (this.edgeHint = null) },
      stageLine: { apply: (v) => (this.stageLine = v) },
      stageLineAudio: { playTimeUpTone: () => this.sfx.push('tone') },
      sfx: {
        playTick: () => this.sfx.push('tick'),
        playApplause: (v) => {
          this.sfx.push('applause');
          this.applauseVolume = v ?? null;
        },
      },
      roomMeter: { apply: (m) => (this.meter = m), setVisible: (v) => (this.meterVisible = v) },
    };
  }
}
