import { DECKS, DEFAULT_DECK_ID, getDeck, tagWordCount } from '../../Assets/Scripts/DeckData';

describe('DeckData (#9)', () => {
  it('provides exactly two sample decks with unique ids', () => {
    expect(DECKS).toHaveLength(2);
    expect(new Set(DECKS.map((d) => d.id)).size).toBe(2);
  });

  it('default deck is "Eyes Up pitch" and contains the "Why glasses" section used by LEAF', () => {
    const deck = getDeck(DEFAULT_DECK_ID);
    expect(deck.name).toBe('Eyes Up pitch');
    expect(deck.sections[1].title).toBe('Why glasses');
  });

  it('every section has a title, 1-3 points and a three-word pill tag', () => {
    for (const deck of DECKS) {
      expect(deck.sections.length).toBeGreaterThanOrEqual(2);
      for (const s of deck.sections) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.points.length).toBeGreaterThanOrEqual(1);
        expect(s.points.length).toBeLessThanOrEqual(3);
        expect(tagWordCount(s.tag)).toBe(3);
      }
    }
  });

  it('is JSON-serializable (JSON constants)', () => {
    expect(JSON.parse(JSON.stringify(DECKS))).toEqual(DECKS);
  });

  it('throws on unknown deck id', () => {
    expect(() => getDeck('nope')).toThrow(/Unknown deck/);
  });
});
