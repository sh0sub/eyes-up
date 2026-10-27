import { NudgeController, NudgeEvent, NudgeInput, Side } from '../../Assets/Scripts/NudgeController';
import { DEFAULT_TUNABLES, Zone } from '../../Assets/Scripts/core/Tunables';
import { v3 } from '../../Assets/Scripts/core/math';
import { runFor } from '../helpers/fixtures';

// Zone centers as seen from the origin, looking -Z: left = -X, right = +X.
const DIRS = [v3(-0.5, 0, -1), v3(0, 0, -1), v3(0.5, 0, -1)] as const;

function input(att: [number, number, number], gazeZone: Zone | null): NudgeInput {
  const gazeForward = gazeZone === null ? v3(0, -1, -1) : DIRS[gazeZone];
  return { zoneAttention: att, gazeZone, gazeForward, zoneDirections: DIRS };
}

function harness() {
  const chimes: Side[] = [];
  const hint = { visible: null as Side | null };
  const nc = new NudgeController(
    DEFAULT_TUNABLES,
    { playChime: (s) => chimes.push(s) },
    { show: (s) => (hint.visible = s), hide: () => (hint.visible = null) },
  );
  const events: NudgeEvent[] = [];
  const step = (seconds: number, inp: NudgeInput) => runFor(seconds, (dt) => events.push(...nc.update(dt, inp)));
  return { nc, chimes, hint, events, step };
}

// Looking right: right zone attended (1.0), left and center neglected (0).
const LOOK_RIGHT = input([0, 0, 1], 2);

describe('NudgeController (#17, M5 #16)', () => {
  it('no nudge before 8 s of neglect', () => {
    const h = harness();
    h.step(7.9, LOOK_RIGHT);
    expect(h.nc.count).toBe(0);
    expect(h.hint.visible).toBeNull();
  });

  it('LEAF neglect_triggers_nudge: right for 8.5 s -> EdgeHint "left", 1 nudge, chime left; look left -> hidden', () => {
    const h = harness();
    h.step(8.5, LOOK_RIGHT);
    expect(h.nc.count).toBe(1);
    expect(h.hint.visible).toBe('left');
    expect(h.chimes).toEqual(['left']);
    expect(h.nc.active?.zone).toBe(0);
    h.step(1 / 60, input([0.05, 0, 1], 0));
    expect(h.hint.visible).toBeNull();
    expect(h.events[h.events.length - 1]).toEqual({ type: 'nudgeEnd', zone: 0, reason: 'looked' });
  });

  it('chevron times out after 3 s if the speaker never turns', () => {
    const h = harness();
    h.step(8.1, LOOK_RIGHT);
    expect(h.hint.visible).toBe('left');
    h.step(2.8, LOOK_RIGHT);
    expect(h.hint.visible).toBe('left');
    h.step(0.3, LOOK_RIGHT);
    expect(h.hint.visible).toBeNull();
    expect(h.events.filter((e) => e.type === 'nudgeEnd')[0]).toMatchObject({ reason: 'timeout' });
  });

  it('cooldown: next nudge only 8 s after the previous start; then the longest-neglected zone (center) goes', () => {
    const h = harness();
    h.step(8.1, LOOK_RIGHT); // nudge 1 (left) at ~8.0 s
    h.step(7.8, LOOK_RIGHT); // t ≈ 15.9: still inside cooldown
    expect(h.nc.count).toBe(1);
    h.step(0.3, LOOK_RIGHT); // t ≈ 16.2
    expect(h.nc.count).toBe(2);
    const starts = h.events.filter((e) => e.type === 'nudgeStart');
    expect(starts[1]).toMatchObject({ zone: 1, side: 'left' });
  });

  it('a zone above the threshold resets its neglect timer', () => {
    const h = harness();
    h.step(5, input([0, 0, 1], 2));
    expect(h.nc.neglectSeconds(0)).toBeCloseTo(5, 6);
    h.step(1 / 60, input([0.3, 0, 1], 2));
    expect(h.nc.neglectSeconds(0)).toBe(0);
  });

  it('never nudges the zone currently looked at', () => {
    const h = harness();
    h.step(10, input([0, 1, 1], 0)); // left zone has low attention but is being looked at right now
    expect(h.events.filter((e) => e.type === 'nudgeStart').every((e) => e.type === 'nudgeStart' && e.zone !== 0)).toBe(true);
  });

  it('center zone side = direction to turn (looking far left -> "right")', () => {
    const h = harness();
    h.step(8.1, input([1, 0, 1], 0)); // only center neglected (right counted attended)
    expect(h.events[0]).toMatchObject({ type: 'nudgeStart', zone: 1, side: 'right' });
  });

  it('cancel hides the hint; reset clears count and timers', () => {
    const h = harness();
    h.step(8.1, LOOK_RIGHT);
    expect(h.nc.cancel()).toMatchObject({ reason: 'cancelled' });
    expect(h.hint.visible).toBeNull();
    expect(h.nc.cancel()).toBeNull();
    h.nc.reset();
    expect(h.nc.count).toBe(0);
    expect(h.nc.neglectSeconds(0)).toBe(0);
  });
});
