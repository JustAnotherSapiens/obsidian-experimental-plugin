import { describe, it } from 'node:test';
import assert from 'assert';
import getYouTubeVideoIDs from './videoIDs';

type TestCase = {
  name: string;
  text: string;
  expected: string[] | undefined;
};

const cases: TestCase[] = [
  // --- Minimal Positive Cases ---
  {
    name: 'Standard YouTube URL without protocol matches',
    text: 'youtube.com/watch?v=Xy1_zT2w3A4',
    expected: ['Xy1_zT2w3A4'],
  },
  {
    name: 'Short-form YouTube URL without protocol matches',
    text: 'youtu.be/_AbC-9jKl2Q',
    expected: ['_AbC-9jKl2Q'],
  },
  {
    name: 'YouTube URL with protocol and www matches',
    text: 'https://www.youtube.com/watch?v=aB3cD4e5F6g',
    expected: ['aB3cD4e5F6g'],
  },
  {
    name: 'YouTube URL with protocol and no www matches',
    text: 'https://youtube.com/watch?v=_7hGzQW8kLm',
    expected: ['_7hGzQW8kLm'],
  },
  {
    name: 'Multiple YouTube URLs and duplicates in one text',
    text: 'youtu.be/-9_kLmNPqr1 youtube.com/watch?v=Xy1_zT2w3A4 youtu.be/-9_kLmNPqr1',
    expected: ['-9_kLmNPqr1', 'Xy1_zT2w3A4', '-9_kLmNPqr1'],
  },
  {
    name: 'YouTube URL with trailing parameters matches ID',
    text: 'youtube.com/watch?v=UVwxyZ12aBc&ab=foo',
    expected: ['UVwxyZ12aBc'],
  },
  {
    name: 'YouTube URL with trailing fragment matches ID',
    text: 'youtube.com/watch?v=UVwxyZ12aBc#bar',
    expected: ['UVwxyZ12aBc'],
  },
  {
    name: 'YouTube URL with both parameters and fragment matches ID',
    text: 'youtube.com/watch?v=UVwxyZ12aBc&ab=foo#bar',
    expected: ['UVwxyZ12aBc'],
  },
  {
    name: 'Short-form YouTube URL with parameter matches ID',
    text: 'youtu.be/P0n9sDqLmTQ?t=10',
    expected: ['P0n9sDqLmTQ'],
  },
  {
    name: 'YouTube URL at end of line with period is handled',
    text: 'youtube.com/watch?v=qW8kLmNPqr1.',
    expected: ['qW8kLmNPqr1'],
  },
  {
    name: 'IDs in parenthesis and brackets are matched',
    text: '(youtu.be/_AbC-9jKl2Q) [youtube.com/watch?v=aB3cD4e5F6g]',
    expected: ['_AbC-9jKl2Q', 'aB3cD4e5F6g'],
  },
  {
    name: 'YouTube ID with dash, underscore, tilde is matched',
    text: 'youtu.be/A-_1_2~bcD9',
    expected: ['A-_1_2~bcD9'],
  },

  // --- Minimal Negative Cases ---
  {
    name: 'Non-YouTube domain does not match',
    text: 'see notyoutube.com/watch?v=shouldnotmatch',
    expected: undefined,
  },
  {
    name: 'Malformed YouTube path does not match',
    text: 'youtube.com/v/abcdefghijk youtube.com/embed/AbC12345678',
    expected: undefined,
  },
  {
    name: 'Uppercase YouTube domain does not match (case-sensitive)',
    text: 'YOUTUBE.COM/watch?v=shouldnotmatch',
    expected: undefined,
  },
  {
    name: 'Text with no YouTube URLs returns undefined',
    text: 'just some text',
    expected: undefined,
  },
];


describe('getYouTubeVideoIDs (table-driven)', () => {
  for (const { name, text, expected } of cases) {
    it(name, () => {
      assert.deepStrictEqual(getYouTubeVideoIDs(text), expected);
    });
  }

  it('returns correct type contract', () => {
    const result: string[] | undefined = getYouTubeVideoIDs(
      'youtube.com/watch?v=abc123XYZ45 youtu.be/a1b2c3d4E5F'
    );
    assert.ok(Array.isArray(result) || result === undefined);
  });
});







// import { describe, it } from 'node:test';
// import assert from 'assert';
// import getYouTubeVideoIDs from './videoIDs';

// // Table-driven test cases
// const cases: Array<{
//   name: string;
//   text: string;
//   expected: string[] | undefined;
// }> = [
//   {
//     name: 'Single standard YouTube URL',
//     text: 'Check this: https://www.youtube.com/watch?v=abc123XYZ45',
//     expected: ['abc123XYZ45'],
//   },
//   {
//     name: 'Single short YouTube URL',
//     text: 'Short link: https://youtu.be/a1b2c3d4E5F',
//     expected: ['a1b2c3d4E5F'],
//   },
//   {
//     name: 'Multiple YouTube URLs (various types) on separate lines',
//     text: `
//       https://www.youtube.com/watch?v=firstID12345
//       https://youtu.be/secondID67890
//     `,
//     expected: ['firstID12345', 'secondID67890'],
//   },
//   {
//     name: 'Multiple YouTube URLs on the same line',
//     text: 'https://www.youtube.com/watch?v=abc123XYZ45 https://youtu.be/a1b2c3d4E5F',
//     expected: ['abc123XYZ45', 'a1b2c3d4E5F'],
//   },
//   {
//     name: 'URL with extra parameters',
//     text: 'Watch: https://www.youtube.com/watch?v=withParams9Q8W7&ab_channel=Test',
//     expected: ['withParams9Q8W7'],
//   },
//   {
//     name: 'URL with fragment',
//     text: 'Watch this https://youtu.be/idWithFragm#t=10',
//     expected: ['idWithFragm'],
//   },
//   {
//     name: 'URL with query and fragment',
//     text: 'Video: https://www.youtube.com/watch?v=fragQ12#t=1m2s',
//     expected: ['fragQ12'],
//   },
//   {
//     name: 'URL in the middle of text',
//     text: 'Hey! https://youtu.be/midTextID89x please watch.',
//     expected: ['midTextID89x'],
//   },
//   {
//     name: 'Multiple lines, only one with YouTube URL',
//     text: 'first line\nsecond line https://www.youtube.com/watch?v=onlyOneLineID\nthird line',
//     expected: ['onlyOneLineID'],
//   },
//   {
//     name: 'YouTube URL with spaces afterwards',
//     text: 'Go here: https://youtu.be/spacedID    ',
//     expected: ['spacedID'],
//   },
//   {
//     name: 'Duplicates are preserved, order is kept',
//     text: [
//       'https://www.youtube.com/watch?v=dupID',
//       'https://www.youtube.com/watch?v=dupID',
//       'https://youtu.be/dupShort',
//       'https://youtu.be/dupShort',
//     ].join('\n'),
//     expected: ['dupID', 'dupID', 'dupShort', 'dupShort'],
//   },
//   {
//     name: 'No YouTube URLs',
//     text: 'There are no links here!',
//     expected: undefined,
//   },
//   {
//     name: 'Malformed YouTube URL (missing v=)',
//     text: 'Check: https://www.youtube.com/watch?id=notAVideo',
//     expected: undefined,
//   },
//   {
//     name: 'Malformed YouTube URL (extra path segment)',
//     text: 'https://www.youtube.com/watch/extra?v=shouldNotMatch',
//     expected: undefined,
//   },
//   {
//     name: 'Malformed short URL (trailing slash only)',
//     text: 'https://youtu.be/',
//     expected: undefined,
//   },
//   {
//     name: 'URLs with non-video ID characters',
//     text: 'https://www.youtube.com/watch?v=abc123!@#fragment',
//     expected: ['abc123'],
//   },
// ];

// describe('getYouTubeVideoIDs()', () => {
//   for (const { name, text, expected } of cases) {
//     it(name, () => {
//       assert.deepStrictEqual(getYouTubeVideoIDs(text), expected);
//     });
//   }

//   it('returns correct type contract', () => {
//     const result: string[] | undefined = getYouTubeVideoIDs(
//       'https://www.youtube.com/watch?v=abc123XYZ45 https://youtu.be/a1b2c3d4E5F'
//     );
//     assert.ok(Array.isArray(result) || result === undefined);
//   });
// });

