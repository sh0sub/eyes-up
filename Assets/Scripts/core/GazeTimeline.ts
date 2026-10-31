/**
 * Gaze timeline view model (artifact S5 ③): three rows (L / C / R) of segments over the session
 * (0:00 … end), the longest look-away outlined in coral with its seconds, and an amber dot +
 * "nudge" at each nudge time. Input is the 0.5 s zone history from SessionStats; it is downsampled
 * to at most `maxColumns` columns (majority vote per column) and merged into runs per row.
 * All positions are fractions 0..1 of the strip width.
 */
import { StatsSnapshot } from '../SessionStats';
import { Zone } from './Tunables';
import { formatMSS } from './math';

export const TIMELINE_MAX_COLUMNS = 60;

export interface TimelineSegment {
  zone: Zone;
  start: number;
  end: number;
}

export interface GazeTimelineState {
  columns: Array<Zone | null>;
  /** Merged runs of equal columns (no segment for "nobody"). */
  segments: TimelineSegment[];
  /** Longest look-away on its zone's row, e.g. label "11 s". Null under 1 s or with no session time. */
  longest: { zone: Zone; start: number; end: number; label: string } | null;
  /** Nudge start positions. */
  nudges: number[];
  /** Axis ticks: "0:00", whole steps, and the end time. */
  axis: Array<{ at: number; label: string }>;
}

/**
 * Majority vote per column. Column i covers buckets [⌊i·n/m⌋, ⌊(i+1)·n/m⌋). A zone wins ties
 * against "nobody"; zone ties go left → right.
 */
export function downsampleZones(zones: ReadonlyArray<Zone | null>, maxColumns = TIMELINE_MAX_COLUMNS): Array<Zone | null> {
  const n = zones.length;
  if (n <= maxColumns) return [...zones];
  const out: Array<Zone | null> = [];
  for (let i = 0; i < maxColumns; i++) {
    const from = Math.floor((i * n) / maxColumns);
    const to = Math.floor(((i + 1) * n) / maxColumns);
    const counts = [0, 0, 0, 0];
    for (let k = from; k < to; k++) {
      const z = zones[k];
      counts[z === null ? 3 : z]++;
    }
    let best = 0;
    for (let z = 1; z < 3; z++) if (counts[z] > counts[best]) best = z;
    out.push(counts[3] > counts[best] ? null : (best as Zone));
  }
  return out;
}

/** Runs of equal, non-null columns as fractions of the strip. */
export function columnSegments(columns: ReadonlyArray<Zone | null>): TimelineSegment[] {
  const m = columns.length;
  const segs: TimelineSegment[] = [];
  let i = 0;
  while (i < m) {
    const z = columns[i];
    let j = i + 1;
    while (j < m && columns[j] === z) j++;
    if (z !== null) segs.push({ zone: z, start: i / m, end: j / m });
    i = j;
  }
  return segs;
}

/** Tick step: the smallest of 10/15/30/60/120/300 s that gives at most 3 ticks after 0:00. */
export function axisTicks(durationSeconds: number): Array<{ at: number; label: string }> {
  if (!(durationSeconds > 0)) return [{ at: 0, label: '0:00' }];
  const steps = [10, 15, 30, 60, 120, 300];
  const step = steps.find((s) => Math.floor(durationSeconds / s) <= 3) ?? 600;
  const ticks = [{ at: 0, label: '0:00' }];
  // Skip whole ticks that would crowd the end label (closer than 15 % of the strip).
  for (let t = step; t < durationSeconds * 0.85; t += step) ticks.push({ at: t / durationSeconds, label: formatMSS(t) });
  ticks.push({ at: 1, label: formatMSS(durationSeconds) });
  return ticks;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function gazeTimeline(s: StatsSnapshot, maxColumns = TIMELINE_MAX_COLUMNS): GazeTimelineState {
  const columns = downsampleZones(s.timeline.zones, maxColumns);
  const d = s.durationSeconds;
  const away = s.longestLookAway;
  const longest =
    d > 0 && away.seconds >= 1
      ? {
          zone: away.zone,
          start: clamp01(away.startSeconds / d),
          end: clamp01((away.startSeconds + away.seconds) / d),
          label: `${Math.round(away.seconds)} s`,
        }
      : null;
  return {
    columns,
    segments: columnSegments(columns),
    longest,
    nudges: d > 0 ? s.timeline.nudgeTimes.map((t) => clamp01(t / d)) : [],
    axis: axisTicks(d),
  };
}
