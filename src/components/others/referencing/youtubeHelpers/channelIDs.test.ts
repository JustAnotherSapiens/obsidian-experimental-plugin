import { describe, it } from 'node:test';
import assert from 'assert';
import getYouTubeChannelIDsAndHandles from './channelIDs';

type TestCase = {
  name: string;
  text: string;
  expected: { ids?: string[]; handles?: string[] } | undefined;
};

const cases: TestCase[] = [
  // ---- Channel ID Extraction ----
  {
    name: 'Standard channel ID (ASCII)',
    text: 'Check: youtube.com/channel/UCabcdefgh1234567890abcd',
    expected: { ids: ['UCabcdefgh1234567890abcd'], handles: undefined },
  },
  {
    name: 'Channel ID with dash and tilde',
    text: 'youtube.com/channel/UC-abc123_~xyz',
    expected: { ids: ['UC-abc123_~xyz'], handles: undefined },
  },
  {
    name: 'Multiple channel IDs, duplicates preserved',
    text: 'youtube.com/channel/UCabc1 youtube.com/channel/UCabc1 youtube.com/channel/UCxyz2',
    expected: { ids: ['UCabc1', 'UCabc1', 'UCxyz2'], handles: undefined },
  },
  // ---- Handles (Valid) ----
  {
    name: 'Simple valid handle (ASCII letters and digits)',
    text: 'youtube.com/@testUser123',
    expected: { ids: undefined, handles: ['@testUser123'] },
  },
  {
    name: 'Valid handle with underscores, dash, period, middle dot',
    text: 'youtube.com/@abc_def.gh·ij-kl',
    expected: { ids: undefined, handles: ['@abc_def.gh·ij-kl'] },
  },

  {
    name: 'Valid handle (30 chars, mixed separators inside)',
    text: 'youtube.com/@a_b-c.d·e_f-g.h·i_j-k.l·m_n-op',
    expected: { ids: undefined, handles: ['@a_b-c.d·e_f-g.h·i_j-k.l·m_n-op'] }, // length 30
  },
  {
    name: 'Valid handle with non-ASCII letters',
    text: 'youtube.com/@испытание123', // Cyrillic
    expected: { ids: undefined, handles: ['@испытание123'] },
  },
  {
    name: 'Valid handle with Arabic letters',
    text: 'youtube.com/@مرحبا123',
    expected: { ids: undefined, handles: ['@مرحبا123'] },
  },
  {
    name: 'Valid handle with middle dot separator',
    text: 'youtube.com/@abc·def',
    expected: { ids: undefined, handles: ['@abc·def'] },
  },

  // ---- Handles (Invalid) ----
  {
    name: 'Handle too short (2 chars after @)',
    text: 'youtube.com/@ab',
    expected: undefined,
  },

  {
    name: 'Handle too long (31 chars after @)',
    text: 'youtube.com/@abcdefghijklmnopqrstuvwxyzABCDE',
    expected: { ids: undefined, handles: ['@abcdefghijklmnopqrstuvwxyzABCD'] },
  },
  {
    name: 'Handle ending with separator (invalid)',
    text: 'youtube.com/@abcde-',
    expected: { ids: undefined, handles: ['@abcde'] },
  },

  {
    name: 'Handle starting with separator (invalid)',
    text: 'youtube.com/@_abcde',
    expected: undefined,
  },
  {
    name: 'Handle only separators (invalid)',
    text: 'youtube.com/@--__..··--',
    expected: undefined,
  },

  // ---- Handles (Edge script cases, allowed) ----
  {
    name: 'Valid short handle with Han (allowed, 3 chars)',
    text: 'youtube.com/@汉字字',
    expected: { ids: undefined, handles: ['@汉字字'] },
  },
  {
    name: 'Valid handle with numerals and separators',
    text: 'youtube.com/@1_2-3.4·5',
    expected: { ids: undefined, handles: ['@1_2-3.4·5'] },
  },

  // ---- Mixes and Both ----
  {
    name: 'One channel ID and one handle',
    text: 'youtube.com/channel/UCabcdefg youtube.com/@foo_bar',
    expected: { ids: ['UCabcdefg'], handles: ['@foo_bar'] },
  },
  {
    name: 'Multiple IDs and handles mixed, with repetition',
    text: [
      'youtube.com/channel/UCid1 youtube.com/@foo123',
      'youtube.com/channel/UCid2 youtube.com/@bar_456',
      'youtube.com/channel/UCid1 youtube.com/@foo123'
    ].join(' '),
    expected: {
      ids: ['UCid1', 'UCid2', 'UCid1'],
      handles: ['@foo123', '@bar_456', '@foo123'],
    },
  },

  // ---- Negative and Noise ----
  {
    name: 'Non-YouTube channel/handle pattern does not match',
    text: 'notyoutube.com/channel/UCabcdefg notyoutube.com/@foo_bar',
    expected: undefined,
  },
  {
    name: 'Malformed path does not match',
    text: 'youtube.com/c/UCabcdefg youtube.com/user/foobar',
    expected: undefined,
  },
  {
    name: 'Text with no matches returns undefineds',
    text: 'Some other random text!',
    expected: undefined,
  },
];

describe('getYouTubeChannelIDsAndHandles()', () => {
  for (const { name, text, expected } of cases) {
    it(name, () => {
      assert.deepStrictEqual(getYouTubeChannelIDsAndHandles(text), expected);
    });
  }
});













// import { describe, it } from 'node:test';
// import assert from 'assert';
// import getYouTubeChannelIDsAndHandles from './channelIDs';

// const cases: Array<{
//   name: string;
//   text: string;
//   expected:
//     | { ids?: string[]; handles?: string[] }
//     | undefined;
// }> = [
//   {
//     name: 'Single channel ID URL',
//     text: 'Visit https://www.youtube.com/channel/UCabcdefgh1234567890abcd',
//     expected: {
//       ids: ['UCabcdefgh1234567890abcd'],
//       handles: undefined
//     },
//   },
//   {
//     name: 'Single channel handle URL',
//     text: 'Check this channel: https://www.youtube.com/@handle_name',
//     expected: {
//       ids: undefined,
//       handles: ['@handle_name']
//     },
//   },
//   {
//     name: 'Both channel ID and handle, different lines',
//     text: [
//       'https://www.youtube.com/channel/UCabcdefgh1234567890abcd',
//       'https://www.youtube.com/@handle123',
//     ].join('\n'),
//     expected: {
//       ids: ['UCabcdefgh1234567890abcd'],
//       handles: ['@handle123'],
//     },
//   },
//   {
//     name: 'Multiple IDs and handles, in order',
//     text: [
//       'first https://www.youtube.com/channel/UCid1',
//       'and https://www.youtube.com/@handle1 here',
//       'https://www.youtube.com/channel/UCid2 https://www.youtube.com/@handle2',
//     ].join('\n'),
//     expected: {
//       ids: ['UCid1', 'UCid2'],
//       handles: ['@handle1', '@handle2'],
//     },
//   },
//   {
//     name: 'Handles and IDs mixed with extra text and whitespace',
//     text:
//       'before https://www.youtube.com/channel/UCfirstID after https://www.youtube.com/@first_handle end',
//     expected: {
//       ids: ['UCfirstID'],
//       handles: ['@first_handle'],
//     },
//   },
//   {
//     name: 'URL with parameters (should not break matching)',
//     text: [
//       'https://www.youtube.com/channel/UCabcdefgh1234567890abcd?view=videos',
//       'https://www.youtube.com/@handle_name#about',
//     ].join('\n'),
//     expected: {
//       ids: ['UCabcdefgh1234567890abcd'],
//       handles: ['@handle_name'],
//     },
//   },
//   {
//     name: 'URL without www.',
//     text: [
//       'https://youtube.com/channel/UCshortid',
//       'https://youtube.com/@plainhandle',
//     ].join(' '),
//     expected: {
//       ids: ['UCshortid'],
//       handles: ['@plainhandle'],
//     },
//   },
//   {
//     name: 'Malformed channel ID URL (missing ID part)',
//     text: 'https://www.youtube.com/channel/',
//     expected: undefined,
//   },
//   {
//     name: 'Malformed handle URL (missing handle)',
//     text: 'https://www.youtube.com/@',
//     expected: undefined,
//   },
//   {
//     name: 'No matches',
//     text: 'No channel here.',
//     expected: undefined,
//   },
//   {
//     name: 'Duplicates preserved, in order',
//     text: [
//       'https://www.youtube.com/channel/UCiddup',
//       'https://www.youtube.com/channel/UCiddup',
//       'https://www.youtube.com/@dup_handle',
//       'https://www.youtube.com/@dup_handle',
//     ].join('\n'),
//     expected: {
//       ids: ['UCiddup', 'UCiddup'],
//       handles: ['@dup_handle', '@dup_handle'],
//     },
//   },
//   {
//     name: 'Handles with dots and dashes',
//     text: 'https://www.youtube.com/@user.name-42',
//     expected: {
//       ids: undefined,
//       handles: ['@user.name-42'],
//     },
//   },
//   {
//     name: 'Handles with underscores',
//     text: 'https://www.youtube.com/@user_name',
//     expected: {
//       ids: undefined,
//       handles: ['@user_name'],
//     },
//   },
// ];

// describe('getYouTubeChannelIDsAndHandles()', () => {
//   for (const { name, text, expected } of cases) {
//     it(name, () => {
//       assert.deepStrictEqual(getYouTubeChannelIDsAndHandles(text), expected);
//     });
//   }

//   it('returns correct types for result fields', () => {
//     const result = getYouTubeChannelIDsAndHandles(
//       'https://www.youtube.com/channel/UCabcdefgh1234567890abcd https://www.youtube.com/@handle'
//     );
//     if (result) {
//       assert.ok(
//         result.ids === undefined || Array.isArray(result.ids),
//         'ids should be array or undefined'
//       );
//       assert.ok(
//         result.handles === undefined || Array.isArray(result.handles),
//         'handles should be array or undefined'
//       );
//     }
//   });
// });

