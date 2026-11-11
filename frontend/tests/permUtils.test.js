import { describe, it, expect } from 'vitest';
import {
  toCycleNotation, shiftCycleNotation, inversePerm, leapFromLabels, leapArrows,
} from '../src/lib/permUtils';
import { formatOrder } from '../src/lib/format';

describe('toCycleNotation', () => {
  it('writes disjoint cycles, omitting fixed points', () => {
    expect(toCycleNotation([1, 2, 0])).toBe('(1 2 3)');
    expect(toCycleNotation([1, 2, 0], 0)).toBe('(0 1 2)');
    expect(toCycleNotation([1, 0, 2, 4, 3])).toBe('(1 2)(4 5)');
    expect(toCycleNotation([0, 1, 2])).toBe('()');
    expect(toCycleNotation([])).toBe('()');
  });
});

describe('shiftCycleNotation', () => {
  it('shifts every label', () => {
    expect(shiftCycleNotation('(1,2,3)(10,11)', -1)).toBe('(0,1,2)(9,10)');
    expect(shiftCycleNotation('(1,2)', 0)).toBe('(1,2)');
    expect(shiftCycleNotation('()', -1)).toBe('()');
  });
});

describe('formatOrder', () => {
  it('groups digits of moderate orders', () => {
    expect(formatOrder(1)).toEqual({ text: '1' });
    expect(formatOrder(1152)).toEqual({ text: '1,152' });
    expect(formatOrder('3251404800')).toEqual({ text: '3,251,404,800' });
    expect(formatOrder('100000000000000000000000').text).toBe('100,000,000,000,000,000,000,000');
  });

  it('abbreviates very large orders but keeps the exact digits', () => {
    const digits = '265252859812191058636308480000000';   // 30!
    expect(formatOrder(digits)).toEqual({ mantissa: '2.65', exponent: 32, exact: digits });
  });
});

describe('working leap', () => {
  // What the app does when a hop (1-indexed one-line) is performed: the label
  // on vertex i moves to vertex hop[i].
  const perform = (labels, hop) => {
    const next = new Array(labels.length);
    hop.forEach((image, i) => { next[image - 1] = labels[i]; });
    return next;
  };
  const identity = (n) => [...Array(n).keys()];
  const rotate = [2, 3, 4, 5, 6, 1];             // (1,2,3,4,5,6)
  const swaps = [2, 1, 4, 3, 6, 5];              // (1,2)(3,4)(5,6)

  it('inversePerm inverts', () => {
    expect(inversePerm([1, 2, 0])).toEqual([2, 0, 1]);
    expect(inversePerm([])).toEqual([]);
  });

  it('after one hop, the leap is that hop', () => {
    const labels = perform(identity(6), rotate);
    expect(toCycleNotation(leapFromLabels(labels))).toBe('(1 2 3 4 5 6)');
  });

  it('hops compose in the order they are performed', () => {
    let labels = perform(identity(6), rotate);
    labels = perform(labels, rotate);
    expect(toCycleNotation(leapFromLabels(labels))).toBe('(1 3 5)(2 4 6)');
    // rotate, then swaps: 1 -> 2 -> 1, 2 -> 3 -> 4, 4 -> 5 -> 6, 6 -> 1 -> 2
    labels = perform(perform(identity(6), rotate), swaps);
    expect(leapFromLabels(labels).map((x) => x + 1)).toEqual([1, 4, 3, 6, 5, 2]);
  });

  it('arrows run from each vertex to its image', () => {
    const labels = perform(identity(3), [2, 3, 1]);
    expect(leapArrows(leapFromLabels(labels))).toEqual([
      { source: 0, target: 1, double: false },
      { source: 1, target: 2, double: false },
      { source: 2, target: 0, double: false },
    ]);
    expect(leapArrows([1, 0, 2])).toEqual([{ source: 0, target: 1, double: true }]);
    expect(leapArrows([0, 1, 2])).toEqual([]);
  });
});
