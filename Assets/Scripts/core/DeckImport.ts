/**
 * DeckImport.ts — parse a typed-in talk outline into cue-card sections (artifact F14, stretch:
 * "deck import via text input"). Pure logic, no Lens Studio APIs.
 *
 * Format (cards split by a blank line or "|"):
 *   Single line:  Title: point; point | Next title: point; point
 *   Multi line:   Title
 *                 - point
 *                 - point
 *
 *                 Next title
 *                 - point
 * At most 3 points per card and 8 cards. The pill tag is the first three words of the title.
 */
import { DeckSection } from '../DeckData';

export const MAX_IMPORT_CARDS = 8;
export const MAX_IMPORT_POINTS = 3;

const BULLET = /^\s*[-*\u2022]\s*/;

function clean(s: string): string {
  return s.replace(BULLET, '').trim();
}

export function parseDeckText(text: string): DeckSection[] {
  const sections: DeckSection[] = [];
  for (const block of text.split(/\n\s*\n|\|/)) {
    const lines = block
      .split('\n')
      .map(clean)
      .filter((l) => l.length > 0);
    if (lines.length === 0) continue;
    let title = lines[0];
    let points = lines.slice(1);
    if (points.length === 0 && title.includes(':')) {
      const i = title.indexOf(':');
      points = title
        .slice(i + 1)
        .split(';')
        .map(clean)
        .filter((p) => p.length > 0);
      title = title.slice(0, i).trim();
    }
    if (title.length === 0) continue;
    const tag = title.split(/\s+/).slice(0, 3).join(' ');
    sections.push({ title, points: points.slice(0, MAX_IMPORT_POINTS), tag });
    if (sections.length >= MAX_IMPORT_CARDS) break;
  }
  return sections;
}
