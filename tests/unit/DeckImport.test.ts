import { parseDeckText } from '../../Assets/Scripts/core/DeckImport';
import { IMPORTED_DECK_ID, getDeck, getImportedDeck, setImportedDeck } from '../../Assets/Scripts/DeckData';
import { SetupModel } from '../../Assets/Scripts/core/SetupModel';

describe('deck import via text (artifact F14)', () => {
  it('parses the single-line format', () => {
    const s = parseDeckText('Hook: ask a question; show the demo | Ask: fund the pilot');
    expect(s).toEqual([
      { title: 'Hook', points: ['ask a question', 'show the demo'], tag: 'Hook' },
      { title: 'Ask', points: ['fund the pilot'], tag: 'Ask' },
    ]);
  });

  it('parses the multi-line format with bullets, caps points at 3 and tags at 3 words', () => {
    const s = parseDeckText('Why this matters to everyone here\n- a\n* b\n\u2022 c\n- d\n\nSecond card\n- x');
    expect(s).toHaveLength(2);
    expect(s[0].points).toEqual(['a', 'b', 'c']);
    expect(s[0].tag).toBe('Why this matters');
    expect(s[1]).toEqual({ title: 'Second card', points: ['x'], tag: 'Second card' });
  });

  it('ignores empty input and limits to 8 cards', () => {
    expect(parseDeckText('  \n \n | ')).toEqual([]);
    expect(parseDeckText(Array.from({ length: 12 }, (_, i) => `C${i}: p`).join(' | '))).toHaveLength(8);
  });

  it('SetupModel only accepts the imported deck after an import', () => {
    const m = new SetupModel();
    expect(() => m.selectDeck(IMPORTED_DECK_ID)).toThrow();
    const sections = parseDeckText('One: a | Two: b');
    setImportedDeck(sections);
    m.selectDeck(IMPORTED_DECK_ID);
    expect(m.deckName).toBe('Imported deck');
    expect(m.deckCardCount).toBe(2);
    expect(getDeck(IMPORTED_DECK_ID).sections).toBe(getImportedDeck()!.sections);
  });
});
