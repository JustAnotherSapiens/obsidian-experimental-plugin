import { describe, it } from 'node:test';
import assert from 'assert';
import getYouTubePlaylistIDs from './playlistIDs';

const cases: Array<{
  name: string;
  text: string;
  expected: string[] | undefined;
}> = [
  {
    name: 'Single /playlist URL',
    text: 'See playlist: https://www.youtube.com/playlist?list=PL123abcDEF456ghi',
    expected: ['PL123abcDEF456ghi'],
  },
  {
    name: '/watch URL with playlist parameter',
    text: 'Watch this: https://www.youtube.com/watch?v=abc123XYZ45&list=PLabc456DEFG',
    expected: ['PLabc456DEFG'],
  },
  {
    name: '/watch URL with playlist as first parameter',
    text: 'Playlist first: https://www.youtube.com/watch?list=PLxyz987&v=video1',
    expected: ['PLxyz987'],
  },
  {
    name: 'Multiple playlists in one text, various formats',
    text: `
      https://www.youtube.com/playlist?list=PLone
      https://www.youtube.com/watch?v=abc&list=PLtwo
      https://www.youtube.com/embed/videoseries?list=PLthree
    `,
    expected: ['PLone', 'PLtwo', 'PLthree'],
  },
  {
    name: '/embed/videoseries URL',
    text: 'Embedded: https://www.youtube.com/embed/videoseries?list=PLemBed',
    expected: ['PLemBed'],
  },
  {
    name: 'Playlist URL with extra params and fragments',
    text: 'With params: https://www.youtube.com/playlist?list=PLmany123&index=5#t=1m',
    expected: ['PLmany123'],
  },
  {
    name: 'Multiple playlists, duplicate IDs',
    text: [
      'https://www.youtube.com/playlist?list=PLdup',
      'https://www.youtube.com/watch?v=vid1&list=PLdup'
    ].join('\n'),
    expected: ['PLdup', 'PLdup'],
  },
  {
    name: 'Mixed playlist and video URLs',
    text: [
      'https://www.youtube.com/playlist?list=PLlistA',
      'https://www.youtube.com/watch?v=xyz123',
      'https://www.youtube.com/watch?v=another&list=PLlistB',
    ].join('\n'),
    expected: ['PLlistA', 'PLlistB'],
  },
  {
    name: 'No playlist in YouTube video-only URL',
    text: 'No playlist: https://www.youtube.com/watch?v=xyz',
    expected: undefined,
  },
  {
    name: 'No playlist in malformed playlist URL',
    text: 'Bad URL: https://www.youtube.com/playlist?li=PLnotfound',
    expected: undefined,
  },
  {
    name: 'URL without www.',
    text: 'https://youtube.com/playlist?list=PLnoWWW',
    expected: ['PLnoWWW'],
  },
  {
    name: 'Handles whitespace and newlines',
    text: `
      Some intro text.

      https://www.youtube.com/playlist?list=PLwhite
    `,
    expected: ['PLwhite'],
  },
  {
    name: 'Playlist ID with dashes and underscores',
    text: 'https://www.youtube.com/playlist?list=PL_A-1_b-C_d_2',
    expected: ['PL_A-1_b-C_d_2'],
  },
  {
    name: 'Playlist param in the middle of query string',
    text: 'https://www.youtube.com/watch?v=abc123&list=PLmiddle123&ab_channel=test',
    expected: ['PLmiddle123'],
  },
];

describe('getYouTubePlaylistIDs()', () => {
  for (const { name, text, expected } of cases) {
    it(name, () => {
      assert.deepStrictEqual(getYouTubePlaylistIDs(text), expected);
    });
  }

  it('returns correct type contract', () => {
    const result: string[] | undefined = getYouTubePlaylistIDs(
      'https://www.youtube.com/playlist?list=PLone https://www.youtube.com/watch?v=vid&list=PLtwo'
    );
    assert.ok(Array.isArray(result) || result === undefined);
  });
});
