/**
 * DeckData.ts — two sample decks as JSON constants (plan: "샘플 덱 2종(JSON 상수)").
 *
 * Each section has a full card (title + up to 3 short points) and a 3-word pill tag
 * shown after the card shrinks. Text is English because the demo video is English.
 * No Lens Studio APIs are used here.
 */
export interface DeckSection {
  title: string;
  points: string[];
  /** Three words shown on the pill (꼬리표). */
  tag: string;
}

export interface Deck {
  id: string;
  name: string;
  sections: DeckSection[];
}

export const DECKS: readonly Deck[] = [
  {
    id: 'eyes-up-pitch',
    name: 'Eyes Up pitch',
    sections: [
      {
        title: 'The problem',
        points: ['We rehearse looking at screens', 'On stage we keep looking for one'],
        tag: 'Screens pull eyes',
      },
      {
        title: 'Why glasses',
        points: ['A laptop pulls your eyes down', 'Glasses keep the room in view'],
        tag: 'Eyes stay up',
      },
      {
        title: 'How it works',
        points: ['Halo fills when you look', 'Chime and arrow for the side you miss'],
        tag: 'Halo, chime, arrow',
      },
      {
        title: 'Notes only when stuck',
        points: ['Card shows for four seconds', 'Look at the tag to see it again'],
        tag: 'Notes when stuck',
      },
      {
        title: 'Your numbers',
        points: ['Gaze share per side', 'Longest look-away, time, balance'],
        tag: 'Numbers at end',
      },
      {
        title: 'Who it is for',
        points: ['Non-native speakers', 'Students, founders, job seekers'],
        tag: 'Practice with people',
      },
    ],
  },
  {
    id: 'interview-intro',
    name: 'Interview self-intro',
    sections: [
      {
        title: 'Who I am',
        points: ['Name and current role', 'One line on what I do best'],
        tag: 'Name and role',
      },
      {
        title: 'One story',
        points: ['A problem I owned', 'What I did, what changed'],
        tag: 'Problem, action, result',
      },
      {
        title: 'Why this team',
        points: ['What I admire here', 'Where I can help first'],
        tag: 'Where I help',
      },
      {
        title: 'Close',
        points: ['Thank them', 'Invite a question'],
        tag: 'Thanks, any questions',
      },
    ],
  },
];

export const DEFAULT_DECK_ID = 'eyes-up-pitch';

export function getDeck(id: string): Deck {
  const deck = DECKS.find((d) => d.id === id);
  if (!deck) throw new Error(`Unknown deck id: ${id}`);
  return deck;
}

/** Count of words in a pill tag; tags are meant to be exactly three words. */
export function tagWordCount(tag: string): number {
  return tag.trim().split(/\s+/).filter((w) => w.length > 0).length;
}
