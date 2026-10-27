/**
 * Summary panel view model (plan M8): time (m:ss), gaze % per zone, longest look-away,
 * card expands, balance score, Again / Done. Bars fill over 0.6 s.
 */
import { StatsSnapshot } from '../SessionStats';
import { ZONE_NAMES, ZoneName } from './Tunables';
import { clamp01, formatMSS } from './math';

export const BAR_FILL_SECONDS = 0.6;

export interface SummaryState {
  timeLabel: string;
  zones: Array<{ name: ZoneName; percent: number; label: string; bar: number }>;
  longestLookAwayLabel: string;
  cardExpandsLabel: string;
  nudgesLabel: string;
  balanceLabel: string;
  balanceScore: number;
}

/** `shownSeconds` = time since the panel appeared (drives the 0.6 s bar fill). */
export function summaryState(s: StatsSnapshot, shownSeconds: number): SummaryState {
  const fill = clamp01(shownSeconds / BAR_FILL_SECONDS);
  const away = Math.round(s.longestLookAway.seconds);
  return {
    timeLabel: formatMSS(s.durationSeconds),
    zones: ZONE_NAMES.map((name, z) => ({
      name,
      percent: s.zonePercents[z],
      label: `${s.zonePercents[z]}%`,
      bar: (s.zonePercents[z] / 100) * fill,
    })),
    longestLookAwayLabel: `${away} s, ${s.longestLookAway.zoneName}`,
    cardExpandsLabel: `${s.cardExpands}`,
    nudgesLabel: `${s.nudges}`,
    balanceLabel: `${s.balanceScore} / 100`,
    balanceScore: s.balanceScore,
  };
}
