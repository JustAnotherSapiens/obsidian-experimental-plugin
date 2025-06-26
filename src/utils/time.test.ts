import { describe, it } from 'node:test';
import assert from 'assert';
import { iso8601DurationToReadableFormat } from './time.js';

describe('iso8601DurationToReadableFormat()', () => {
  const validCases: [string, string][] = [
    ["P1Y",               "1y"],
    ["P2M",               "2mo"],
    ["P3W",               "3w"],
    ["P4D",               "4d"],
    ["PT5H",              "5h"],
    ["PT6M",              "6m"],
    ["PT7S",              "7s"],
    ["P1Y2M3DT4H5M6S",    "1y 2mo 3d 4h 5m 6s"],
    ["P3W2D",             "3w 2d"],
    ["P1Y1M1W1DT1H1M1S",  "1y 1mo 1w 1d 1h 1m 1s"],
    ["PT10H30M",          "10h 30m"],
    ["P2Y6M5D",           "2y 6mo 5d"],
    ["P",                 ""],
    ["PT0S",              "0s"],
    ["PT0H0M0S",          "0h 0m 0s"],
    ["P0Y0M0DT0H0M0S",    "0y 0mo 0d 0h 0m 0s"],
    ["PT12.345S",         "12.345s"],
    ["PT0.5S",            "0.5s"],
  ];

  validCases.forEach(([input, expected]) => {
    it(`should convert "${input}" to "${expected}"`, () => {
      const actual = iso8601DurationToReadableFormat(input);
      assert.strictEqual(actual, expected);
    });
  });

  it('should throw an error for invalid format', () => {
    assert.throws(() => {
      iso8601DurationToReadableFormat("INVALID");
    }, /Invalid ISO 8601 duration format/);
  });
});
