import { describe, it } from 'node:test';
import assert from 'node:assert';

import { wrapAround } from './generic';


describe('utils/generic.ts: wrapAround()', () => {
  const size = 8;

  describe('positive integers', () => {
    const lowerValue = size - 1;
    const greaterValue = size + 1;

    it('return value if value < size', () => {
      assert.strictEqual(wrapAround(lowerValue, size), lowerValue);
    });

    it('return 0 if value == size', () => {
      assert.strictEqual(wrapAround(size, size), 0);
    });

    it('return value % size if value > size', () => {
      assert.strictEqual(wrapAround(greaterValue, size), greaterValue % size);
    });
  });

  describe('negative integers', () => {
    const offset = size % 2 + 1;
    const multiplier = 5;

    it('return size - offset if 0 > value > -size', () => {
      assert.strictEqual(wrapAround(-offset, size), size - offset);
    });

    it('return size - offset if value < -size', () => {
      assert.strictEqual(wrapAround(-(size * multiplier) - offset, size), size - offset);
    });

  });

});

