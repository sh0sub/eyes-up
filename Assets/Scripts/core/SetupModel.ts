/**
 * Setup panel state (plan S1): talk length slider 3/5/10 min, audience 3/6/9, sample deck (2), Start.
 * Defaults: 3 min / 6 people / "Eyes Up pitch". SetupPanel.ts binds UIKit widgets to this.
 */
import { DECKS } from '../DeckData';
import { DEFAULT_CONFIG, SessionConfig } from './EyesUpSession';
import { clamp01 } from './math';

export const LENGTH_OPTIONS = [3, 5, 10] as const;
export const AUDIENCE_OPTIONS = [3, 6, 9] as const;
/** plan: on Start the panel shrinks for 0.3 s, then disappears. */
export const SETUP_EXIT_SECONDS = 0.3;

/** Snap a 0..1 slider value to the nearest option. */
export function snapToOption<T extends number>(options: readonly T[], slider01: number): T {
  const i = Math.round(clamp01(slider01) * (options.length - 1));
  return options[i];
}

export function optionToSlider(options: readonly number[], value: number): number {
  const i = options.indexOf(value);
  return i < 0 || options.length < 2 ? 0 : i / (options.length - 1);
}

export class SetupModel {
  private cfg: SessionConfig = { ...DEFAULT_CONFIG };

  get config(): SessionConfig {
    return { ...this.cfg };
  }

  setLengthSlider(v: number): number {
    this.cfg.lengthMinutes = snapToOption(LENGTH_OPTIONS, v);
    return this.cfg.lengthMinutes;
  }

  setAudienceSlider(v: number): number {
    this.cfg.audienceCount = snapToOption(AUDIENCE_OPTIONS, v);
    return this.cfg.audienceCount;
  }

  selectDeck(id: string): void {
    if (!DECKS.some((d) => d.id === id)) throw new Error(`Unknown deck id: ${id}`);
    this.cfg.deckId = id;
  }

  /** Toggle between the two sample decks (one big target instead of a dropdown). */
  toggleDeck(): string {
    const i = DECKS.findIndex((d) => d.id === this.cfg.deckId);
    this.cfg.deckId = DECKS[(i + 1) % DECKS.length].id;
    return this.cfg.deckId;
  }

  get deckName(): string {
    return (DECKS.find((d) => d.id === this.cfg.deckId) ?? DECKS[0]).name;
  }

  get labels(): { length: string; audience: string; deck: string } {
    return { length: `${this.cfg.lengthMinutes} min`, audience: `${this.cfg.audienceCount} people`, deck: this.deckName };
  }
}

/** Panel scale during the 0.3 s exit shrink. */
export function setupExitScale(t: number): number {
  return 1 - clamp01(t / SETUP_EXIT_SECONDS);
}
