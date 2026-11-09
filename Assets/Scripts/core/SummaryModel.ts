/**
 * Summary panel view model (plan M8, artifact S5): "Nice work — m:ss" + "target m:ss · deck",
 * gaze % per zone (amber when out of range), a Balance badge, longest look-away with its timestamp
 * ("11 s · left · at 1:12"), separate Cards ("2 of 5") and Nudges ("1") tiles, one tip from the weakest zone, Again / Done.
 * Bars fill over 0.6 s.
 */
import { StatsSnapshot } from '../SessionStats';
import { GameResult, Grade, beatLabel, bestBanner, compareLabel } from './GameScore';
import { ZONE_NAMES, ZoneName } from './Tunables';
import { clamp01, formatMSS } from './math';

export const BAR_FILL_SECONDS = 0.6;
/**
 * Artifact S5: a zone is in range when 15% < share < 35% ("35% 미만·15% 초과"); anything else gets
 * an amber label. (Even thirds = 33%.)
 */
export const ZONE_RANGE_LOW = 15;
export const ZONE_RANGE_HIGH = 35;

export interface SummaryContext {
  /** Talk length from Setup, in seconds. */
  targetSeconds: number;
  deckName: string;
  /** Cards in the deck; shows "2 of 5" for the card-expands tile (artifact S5). */
  cardCount?: number;
  /** Game layer: attention score and grade of this run (omitted in older callers/tests). */
  game?: GameResult | null;
}

export interface SummaryState {
  /** "Nice work — 2:51" */
  titleLabel: string;
  /** "target 3:00 · Eyes Up pitch" ('' when no context is given). */
  targetLabel: string;
  timeLabel: string;
  zones: Array<{ name: ZoneName; percent: number; label: string; bar: number; outOfRange: boolean }>;
  /** "11 s · left · at 1:12" */
  longestLookAwayLabel: string;
  /** One line for the stats tile: "Look-away 11 s center · Cards 1 of 5 · Nudges 1" (the timestamp stays in longestLookAwayLabel). */
  statsLine: string;
  cardExpandsLabel: string;
  nudgesLabel: string;
  /** Cards tile value: "2 of 5" (cards opened of the deck); "2" without a deck size. */
  cardsLabel: string;
  /** Badge number, e.g. "86". */
  balanceLabel: string;
  balanceScore: number;
  /** One line from the weakest zone, e.g. "Next time, look left more." */
  tip: string;
  /** Game layer: grade letter ("A") or '' without a result. */
  gradeLabel: string;
  grade: Grade | null;
  /** "SCORE 1240" (live points, the headline) or ''. */
  scoreLabel: string;
  /** "Room 91%   Balance 84" under the headline, or ''. */
  statsSubLabel: string;
  /** 0 without a result, else 1..3. */
  stars: number;
  /** 'NEW BEST' / 'Best 1240' / '' (first run or no result). */
  bestBanner: string;
  newBest: boolean;
  /** Again subline: 'beat 1240' or ''. */
  beatLabel: string;
  /** "Room engaged 91%" or ''. */
  engagementLabel: string;
  /** "Room 91%" or '' (short form for the game tile). */
  engagementShort: string;
  /** "New best! (was 72)" / "Best so far 78 · A" / '' on a first run. */
  compareLabel: string;
}

export function zoneOutOfRange(percent: number): boolean {
  return !(percent > ZONE_RANGE_LOW && percent < ZONE_RANGE_HIGH);
}

/**
 * One coaching line. The weakest zone (lowest share; ties go left → right) gets "look … more"
 * unless every zone is in range. No gaze at all asks to look up.
 */
export function summaryTip(percents: readonly [number, number, number]): string {
  if (percents[0] + percents[1] + percents[2] <= 0) return 'Next time, look up at the audience.';
  if (percents.every((p) => !zoneOutOfRange(p))) return 'Nice balance. Keep it up.';
  let weakest = 0;
  for (let z = 1; z < 3; z++) if (percents[z] < percents[weakest]) weakest = z;
  const where = ZONE_NAMES[weakest] === 'center' ? 'at the center' : ZONE_NAMES[weakest];
  return `Next time, look ${where} more.`;
}

/** `shownSeconds` = time since the panel appeared (drives the 0.6 s bar fill). */
export function summaryState(s: StatsSnapshot, shownSeconds: number, ctx?: SummaryContext): SummaryState {
  const fill = clamp01(shownSeconds / BAR_FILL_SECONDS);
  const away = Math.round(s.longestLookAway.seconds);
  const time = formatMSS(s.durationSeconds);
  return {
    titleLabel: `Nice work — ${time}`,
    targetLabel: ctx ? `target ${formatMSS(ctx.targetSeconds)} · ${ctx.deckName}` : '',
    timeLabel: time,
    zones: ZONE_NAMES.map((name, z) => ({
      name,
      percent: s.zonePercents[z],
      label: `${s.zonePercents[z]}%`,
      bar: (s.zonePercents[z] / 100) * fill,
      outOfRange: zoneOutOfRange(s.zonePercents[z]),
    })),
    longestLookAwayLabel: `${away} s · ${s.longestLookAway.zoneName} · at ${formatMSS(s.longestLookAway.startSeconds)}`,
    statsLine: `Look-away ${away} s ${s.longestLookAway.zoneName} · Cards ${ctx?.cardCount ? `${s.cardExpands} of ${ctx.cardCount}` : `${s.cardExpands}`} · Nudges ${s.nudges}`,
    cardExpandsLabel: `${s.cardExpands}`,
    nudgesLabel: `${s.nudges}`,
    cardsLabel: ctx?.cardCount ? `${s.cardExpands} of ${ctx.cardCount}` : `${s.cardExpands}`,
    balanceLabel: `${s.balanceScore}`,
    balanceScore: s.balanceScore,
    tip: summaryTip(s.zonePercents),
    gradeLabel: ctx?.game ? ctx.game.grade : '',
    grade: ctx?.game ? ctx.game.grade : null,
    scoreLabel: ctx?.game ? `SCORE ${ctx.game.points}` : '',
    statsSubLabel: ctx?.game ? `Room ${ctx.game.engagementPercent}%   Balance ${s.balanceScore}` : '',
    stars: ctx?.game ? ctx.game.stars : 0,
    bestBanner: ctx?.game ? bestBanner(ctx.game) : '',
    newBest: ctx?.game ? ctx.game.newBest : false,
    beatLabel: ctx?.game ? beatLabel(ctx.game) : '',
    engagementLabel: ctx?.game ? `Room engaged ${ctx.game.engagementPercent}%` : '',
    engagementShort: ctx?.game ? `Room ${ctx.game.engagementPercent}%` : '',
    compareLabel: ctx?.game ? compareLabel(ctx.game) : '',
  };
}
