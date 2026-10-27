/**
 * CueCardController.ts — cue card that shows for 4 s, then shrinks to a 3-word pill (plan M6).
 *
 * - Section start (rehearsal start, Next, Prev): full card for `cardSeconds` (4 s), then pill.
 * - Pill dwell (GazeTracker fires after 1 s): re-expand the current card for 4 s.
 * - (Stretch, not implemented) ASR 6 s silence would call `expand('silence')` the same way.
 * - pill<->card tween: `morph` eases 0 (pill) <-> 1 (card) over `tweenSeconds`; the Lens view
 *   interpolates scale/size from it.
 *
 * `expandCount` counts re-expansions the speaker asked for (dwell, and later ASR silence) — the
 * "card expands" number on the summary. Next/Prev section changes are counted separately.
 */
import { Deck, DeckSection } from './DeckData';
import { Tunables } from './core/Tunables';

export type CardMode = 'hidden' | 'card' | 'pill';
export type CardReason = 'start' | 'next' | 'prev' | 'dwell' | 'silence';

/** Lens adapter: UIKit Frame + Text on the CueCard SceneObject (Billboard). */
export interface CueCardView {
  showCard(section: DeckSection, index: number, total: number): void;
  showPill(tag: string): void;
  hide(): void;
  /** 0 = pill, 1 = full card. Called every update while tweening. */
  applyMorph?(morph: number): void;
}

export type CardEvent =
  | { type: 'card'; index: number; title: string; reason: CardReason }
  | { type: 'pill'; index: number; tag: string };

/** design: duration of the pill<->card tween. */
export const CARD_TWEEN_SECONDS = 0.25;

export class CueCardController {
  private deck: Deck | null = null;
  private idx = 0;
  private _mode: CardMode = 'hidden';
  private timer = 0;
  private _morph = 0;
  private expands = 0;
  private sectionChanges = 0;

  constructor(
    private readonly t: Pick<Tunables, 'cardSeconds'>,
    private readonly view?: CueCardView,
  ) {}

  load(deck: Deck): void {
    if (deck.sections.length === 0) throw new Error('deck has no sections');
    this.deck = deck;
    this.hide();
    this.idx = 0;
    this.expands = 0;
    this.sectionChanges = 0;
  }

  get mode(): CardMode {
    return this._mode;
  }

  get index(): number {
    return this.idx;
  }

  get total(): number {
    return this.deck ? this.deck.sections.length : 0;
  }

  get section(): DeckSection | null {
    return this.deck ? this.deck.sections[this.idx] : null;
  }

  get expandCount(): number {
    return this.expands;
  }

  get sectionChangeCount(): number {
    return this.sectionChanges;
  }

  get morph(): number {
    return this._morph;
  }

  /** Seconds the card has been open (0 when pill/hidden). */
  get cardSecondsShown(): number {
    return this._mode === 'card' ? this.timer : 0;
  }

  start(): CardEvent {
    this.idx = 0;
    return this.showCard('start');
  }

  next(): CardEvent {
    if (this.idx < this.total - 1) {
      this.idx++;
      this.sectionChanges++;
    }
    return this.showCard('next');
  }

  prev(): CardEvent {
    if (this.idx > 0) {
      this.idx--;
      this.sectionChanges++;
    }
    return this.showCard('prev');
  }

  /** Re-expand from the pill (dwell / ASR silence). Ignored unless the pill is showing. */
  expand(reason: 'dwell' | 'silence' = 'dwell'): CardEvent | null {
    if (this._mode !== 'pill') return null;
    this.expands++;
    return this.showCard(reason);
  }

  hide(): void {
    this._mode = 'hidden';
    this.timer = 0;
    this._morph = 0;
    this.view?.hide();
  }

  update(dt: number): CardEvent | null {
    let event: CardEvent | null = null;
    if (this._mode === 'card') {
      this.timer += dt;
      if (this.timer >= this.t.cardSeconds - 1e-9) {
        this._mode = 'pill';
        this.timer = 0;
        const tag = this.requireSection().tag;
        this.view?.showPill(tag);
        event = { type: 'pill', index: this.idx, tag };
      }
    }
    const target = this._mode === 'card' ? 1 : 0;
    if (this._mode !== 'hidden' && this._morph !== target) {
      const step = dt / CARD_TWEEN_SECONDS;
      this._morph = target > this._morph ? Math.min(1, this._morph + step) : Math.max(0, this._morph - step);
      this.view?.applyMorph?.(this._morph);
    }
    return event;
  }

  private showCard(reason: CardReason): CardEvent {
    const s = this.requireSection();
    this._mode = 'card';
    this.timer = 0;
    this.view?.showCard(s, this.idx, this.total);
    return { type: 'card', index: this.idx, title: s.title, reason };
  }

  private requireSection(): DeckSection {
    if (!this.deck) throw new Error('CueCardController: load(deck) first');
    return this.deck.sections[this.idx];
  }
}
