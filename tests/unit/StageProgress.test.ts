import { describe, expect, it } from 'vitest';
import { BESTS_STORE_KEY, KeyValueStore, StageBests, stageCardBest, stageCardTitle, stageHeader, stageNumber, starRow } from '../../Assets/Scripts/core/StageProgress';
import { gameResult } from '../../Assets/Scripts/core/GameScore';

function memStore(initial = ''): KeyValueStore & { value: string } {
  return {
    value: initial,
    getString() {
      return this.value;
    },
    putString(_k, v) {
      this.value = v;
    },
  };
}

describe('stage labels', () => {
  it('maps audience 3/6/9 to Stage 1/2/3', () => {
    expect([3, 6, 9].map(stageNumber)).toEqual([1, 2, 3]);
    expect(stageHeader(3)).toBe('STAGE 1 - 3 listeners');
    expect(stageHeader(9)).toBe('STAGE 3 - 9 listeners');
    expect(stageCardTitle(6)).toBe('Stage 2');
  });
  it('fills stars from the left and clamps', () => {
    expect(starRow(0)).toEqual([false, false, false]);
    expect(starRow(2)).toEqual([true, true, false]);
    expect(starRow(7)).toEqual([true, true, true]);
    expect(starRow(-1)).toEqual([false, false, false]);
  });
});

describe('StageBests', () => {
  const run = (points: number, avg = 0.8, balance = 90) => gameResult(balance, avg, null, points);

  it('a fresh install has no records: empty stars and no number', () => {
    const b = new StageBests(memStore());
    expect(b.get(3)).toBeNull();
    expect(stageCardBest(b.get(3))).toBe('Not played');
  });
  it('records per stage, keeps the higher points and the most stars', () => {
    const b = new StageBests();
    b.record(3, run(500, 0.8, 90));
    b.record(3, run(300, 0.8, 90));
    expect(b.get(3)?.points).toBe(500);
    b.record(3, run(900, 0.2, 40)); // more points, fewer stars
    expect(b.get(3)?.points).toBe(900);
    expect(b.get(3)?.stars).toBe(3);
    expect(b.get(6)).toBeNull();
    expect(stageCardBest(b.get(3))).toBe('Best 900');
  });
  it('survives a restart through the store', () => {
    const s = memStore();
    new StageBests(s).record(6, run(1240));
    expect(new StageBests(s).get(6)?.points).toBe(1240);
    expect(s.value).toContain('1240');
  });
  it('ignores corrupt or out-of-range stored data', () => {
    expect(new StageBests(memStore('not json')).get(3)).toBeNull();
    expect(new StageBests(memStore('{"3":{"points":"x"}}')).get(3)).toBeNull();
    expect(new StageBests(memStore('{"4":{"points":10,"stars":1,"score":1,"grade":"A"}}')).get(4)).toBeNull();
    expect(new StageBests(memStore('{"3":{"points":10,"stars":9,"score":1,"grade":"A"}}')).get(3)).toBeNull();
  });
  it('a store that throws never breaks a run', () => {
    const b = new StageBests({
      getString() {
        throw new Error('no storage');
      },
      putString() {
        throw new Error('no storage');
      },
    });
    b.record(3, run(100));
    expect(b.get(3)?.points).toBe(100);
  });
  it('clear forgets every stage and persists that', () => {
    const s = memStore();
    const b = new StageBests(s);
    b.record(3, run(100));
    b.clear();
    expect(new StageBests(s).get(3)).toBeNull();
    expect(BESTS_STORE_KEY).toBe('eyesup.bests.v1');
  });
});
