import { App, moment } from 'obsidian';
import { runQuickSuggest } from 'suggests/quickSuggest';

import type { YouTubeResourceOptions } from '../youtubeDataAPI/parsedData';
import getParsedYouTubeData from '../youtubeDataAPI/parsedData';

import type { ParsedYouTubePlaylist } from '../youtubeDataAPI/parsers/playlist';



// --- Registry ---
type ReferenceStyleKey = 'APA' | 'YAML';

type PlaylistReferenceParser = (video: ParsedYouTubePlaylist) => string;

interface PlaylistReferenceStyle {
  key: ReferenceStyleKey;
  label: string;
  parser: PlaylistReferenceParser;
  description?: string;
  showDurationOption?: boolean;
}

export const PLAYLIST_REFERENCE_STYLES: PlaylistReferenceStyle[] = [
  {
    key: 'APA',
    label: 'APA (American Psychological Association)',
    parser: playlistApaReference,
    description: 'APA 7th Edition Style Manual format',
  },

  // UNAVAILABLE
  // {
  //   key: 'MLA',
  //   label: 'MLA (Modern Language Association)',
  //   parser: channelMlaReference,
  //   description: 'MLA Handbook 9th Edition format'
  // },

  {
    key: 'YAML',
    label: 'YAML 1.2 Data',
    parser: playlistYamlDataReference,
    description: 'YAML specification v1.2.2',
  }

  // {
  //   key: '',
  //   label: '',
  //   parser: ,
  //   description: '',
  // }

  // ... more styles
];

// --- Style selection utility ---
function getStyleByKey(key: ReferenceStyleKey): PlaylistReferenceStyle | undefined {
  return PLAYLIST_REFERENCE_STYLES.find(style => style.key === key);
}



// --- Main function ---
export default async function getYouTubePlaylistReference(
  app: App, opts: YouTubeResourceOptions
): Promise<string[] | undefined> {

  const parsedPlaylists = await getParsedYouTubeData('playlists', opts);
  if (!parsedPlaylists) return;

  const referenceSelection = await runQuickSuggest(
    app,
    PLAYLIST_REFERENCE_STYLES.map(s => s.key),
    key => {
      const style = getStyleByKey(key as ReferenceStyleKey)!;
      return `${style.label}:\n${style.parser(parsedPlaylists[0])}`;
    },
    'Select PLAYLIST reference style...'
  );
  if (!referenceSelection) return;

  const style = getStyleByKey(referenceSelection)!;
  return parsedPlaylists.map(style.parser);
}



/* APA Reference */
// Publication Manual of the American Psychological Association, Seventh Edition
// https://apastyle.apa.org/style-grammar-guidelines/references/examples/youtube-references (2020-02)

// (UNOFFICIAL) Based on the structure of Video and Channel reference
// Channel. (1971, January 1). _Title_ [Video]. YouTube. https://www.example.com
// Channel. (n.d.). _Home_ [YouTube channel]. YouTube. Retrieved January 1, 1971, from https://www.example.com

// Channel. (1971, January 1). _Title_ [Playlist]. YouTube. Retrieved January 1, 1971, from https://www.example.com
function playlistApaReference(playlist: ParsedYouTubePlaylist): string {
  const retrieveDate = moment().format('MMMM D, YYYY');
  const date = moment(playlist.publishedAt).format('YYYY, MMMM D');
  const channel = playlist.channel.title.trim();
  let title = playlist.title.trim();
  if (title.slice(-1) === '.') title = title.slice(0, -1); // Remove dot '.' if necessary
  return `${channel}. (${date}). _${title}_ [Playlist]. YouTube. Retrieved ${retrieveDate}, from ${playlist.url}`;
}


/* YAML DATA */
// YAML specification v1.2.2 (2021-10-01)
// https://yaml.org/spec/1.2.2/
function playlistYamlDataReference(playlist: ParsedYouTubePlaylist): string {
  const indent = 4;
  const indentSp = ' '.repeat(indent);

  const getYamlMultilineScalar = (value: string, currentIndentDepth: number = 0, indentSize: number = indent) => {
    const lines = value.split('\n');
    if (lines.length === 1) return value;
    const totalIndent = indentSize * (currentIndentDepth + 1);
    const indentedLines = lines.map(l => ' '.repeat(totalIndent) + l);
    return `|\n${indentedLines.join('\n')}`;
  };

  const lines: string[] = [];

  lines.push(`title: ${playlist.title}`);
  lines.push(`description: ${getYamlMultilineScalar(playlist.description)}`);
  lines.push(`publishedAt: ${playlist.publishedAt}`);
  lines.push(`thumbnailUrl: ${playlist.thumbnailUrl}`);

  lines.push(`channel:`);
  lines.push(`${indentSp}id: ${playlist.channel.id}`);
  lines.push(`${indentSp}url: ${playlist.channel.url}`);
  lines.push(`${indentSp}title: ${playlist.channel.title}`);

  lines.push(`itemCount: ${playlist.itemCount}`);

  lines.push(`id: ${playlist.id}`);
  lines.push(`url: ${playlist.url}`);

  lines.push(`retrievedAt: ${moment().utc().format()}`);

  return lines.join('\n');
}

