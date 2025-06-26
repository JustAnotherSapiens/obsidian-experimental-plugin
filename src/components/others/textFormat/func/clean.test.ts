import { describe, it } from 'node:test';
import assert from 'assert';
import {
  removeNumberReferences,
  removeNonBreakingSpaces,
  removeWikiLinks,
} from './clean.js';

describe('removeNumberReferences()', () => {
  const validCases: [string, string][] = [
    ["plain text", "plain text"],
    ["refNum[1]", "refNum"],
    ["refDigits[138]", "refDigits"],
    ["refLink[2](a://foo.com)", "refLink"],
    ['wikiLink[[2]](a://foo.com/bar#sec)', "wikiLink"],
    ["refLinkVar[3](/a/b/c.md)", "refLinkVar"],
    ["refNum[4] with text", "refNum with text"],
    ["refLink[5](a://foo.com) with text", "refLink with text"],
    ["refLinkVar[6](/a/b/c.md) with text", "refLinkVar with text"],
    ["refNum[5] and refLink[6](a://foo.com) with text", "refNum and refLink with text"],
    ["Spaced [1] references [2](a://foo.com) here", "Spaced  references  here"],
  ];

  validCases.forEach(([input, expected]) => {
    it(`should convert "${input}" to "${expected}"`, () => {
      const actual = removeNumberReferences(input);
      assert.strictEqual(actual, expected);
    });
  });
});

describe('removeNonBreakingSpaces()', () => {
  const validCases: [string, string][] = [
    ["a b", "a b"],
    ["a nbsp ", "a nbsp "],
    ["a nbsp b", "a nbsp b"],
    ["a nbsp nbsp b nbsp c", "a nbsp nbsp b nbsp c"],
  ];

  validCases.forEach(([input, expected]) => {
    it(`should convert "${input}" to "${expected}"`, () => {
      const actual = removeNonBreakingSpaces(input);
      assert.strictEqual(actual, expected);
    });
  });
});

describe('removeWikiLinks()', () => {
  const validCases: [string, string][] = [
    ["a b", "a b"],
    ["a [link](url)", "a link"],
    ["[link](url) b", "link b"],
    ["a [link1](url1) and [link2](url2)", "a link1 and link2"],
    ["a [b c](url)", "a b c"],
    ["a [b c](d e)", "a b c"],
    ['a [b c](d "e")', "a b c"],
    // ["a [outer [inner](in-url)](out-url)", "a outer inner"], // No nested link support
  ];

  validCases.forEach(([input, expected]) => {
    it(`should convert "${input}" to "${expected}"`, () => {
      const actual = removeWikiLinks(input);
      assert.strictEqual(actual, expected);
    });
  });
});
