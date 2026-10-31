import { CueCardController, CueCardView } from '../../Assets/Scripts/CueCardController';
import { getDeck } from '../../Assets/Scripts/DeckData';
import { DEFAULT_TUNABLES } from '../../Assets/Scripts/core/Tunables';
import { runFor } from '../helpers/fixtures';

function harness() {
  const log: string[] = [];
  const morphs: number[] = [];
  const view: CueCardView = {
    showCard: (s, i, n) => log.push(`card:${s.title}:${i + 1}/${n}`),
    showPill: (tag) => log.push(`pill:${tag}`),
    hide: () => log.push('hide'),
    applyMorph: (m) => morphs.push(m),
  };
  const cc = new CueCardController(DEFAULT_TUNABLES, view);
  cc.load(getDeck('eyes-up-pitch'));
  return { cc, log, morphs, tick: (s: number) => runFor(s, (dt) => cc.update(dt)) };
}

describe('CueCardController (#8, M6 #5)', () => {
  it('start shows card 1 for 4 s, then the 3-word pill', () => {
    const { cc, log, tick } = harness();
    cc.start();
    expect(cc.mode).toBe('card');
    tick(3.9);
    expect(cc.mode).toBe('card');
    tick(0.2);
    expect(cc.mode).toBe('pill');
    expect(log.slice(-2)).toEqual(['card:The problem:1/5', 'pill:Screens pull eyes']);
  });

  it('LEAF next_shows_card_then_pill: Next -> "Why glasses", pill after 4.3 s', () => {
    const { cc, tick } = harness();
    cc.start();
    tick(4.1);
    const e = cc.next();
    expect(e).toMatchObject({ type: 'card', title: 'Why glasses', reason: 'next' });
    expect(cc.section?.title).toBe('Why glasses');
    tick(4.3);
    expect(cc.mode).toBe('pill');
  });

  it('LEAF dwell_expands_pill: dwell on the pill re-expands the same card and counts it', () => {
    const { cc, tick } = harness();
    cc.start();
    tick(4.1);
    expect(cc.expand('dwell')).toMatchObject({ type: 'card', index: 0, reason: 'dwell' });
    expect(cc.mode).toBe('card');
    expect(cc.expandCount).toBe(1);
    tick(4.1);
    expect(cc.mode).toBe('pill');
  });

  it('dwell is ignored while the card is already open', () => {
    const { cc } = harness();
    cc.start();
    expect(cc.expand()).toBeNull();
    expect(cc.expandCount).toBe(0);
  });

  it('Next/Prev clamp at the ends and still re-show the card', () => {
    const { cc } = harness();
    cc.start();
    cc.prev();
    expect(cc.index).toBe(0);
    for (let i = 0; i < 10; i++) cc.next();
    // Pass 4: the pitch deck has 5 sections (artifact S1).
    expect(cc.index).toBe(4);
    expect(cc.sectionChangeCount).toBe(4);
    expect(cc.mode).toBe('card');
  });

  it('countdown line: 1 when the card opens, 0.5 at 2 s, 0 in pill / hidden (artifact S4)', () => {
    const { cc, tick } = harness();
    expect(cc.countdown).toBe(0); // hidden
    cc.start();
    expect(cc.countdown).toBe(1);
    tick(2);
    expect(cc.countdown).toBeCloseTo(0.5, 2);
    tick(2.1);
    expect(cc.mode).toBe('pill');
    expect(cc.countdown).toBe(0);
    cc.expand();
    expect(cc.countdown).toBe(1); // re-expanded card restarts the line
    cc.hide();
    expect(cc.countdown).toBe(0);
  });

  it('Next during an open card restarts the 4 s timer', () => {
    const { cc, tick } = harness();
    cc.start();
    tick(3);
    cc.next();
    tick(3);
    expect(cc.mode).toBe('card');
  });

  it('pill<->card tween morphs 0->1 over 0.25 s and back', () => {
    const { cc, morphs, tick } = harness();
    cc.start();
    tick(0.3);
    expect(cc.morph).toBe(1);
    expect(morphs.length).toBeGreaterThan(5);
    tick(4);
    expect(cc.morph).toBe(0);
  });

  it('hide and load guard', () => {
    const { cc } = harness();
    cc.start();
    cc.hide();
    expect(cc.mode).toBe('hidden');
    const bare = new CueCardController(DEFAULT_TUNABLES);
    expect(() => bare.start()).toThrow(/load/);
  });
});
