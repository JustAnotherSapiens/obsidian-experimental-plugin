import { App, moment } from 'obsidian';
import { runQuickSuggest } from 'suggests/quickSuggest';

import type { YouTubeResourceOptions } from '../youtubeDataAPI/parsedData';
import getParsedYouTubeData from '../youtubeDataAPI/parsedData';

import type { ParsedYouTubeChannel } from '../youtubeDataAPI/parsers/channel';



// --- Registry ---
type ReferenceStyleKey = 'APA' | 'YAML';

type ChannelReferenceParser = (video: ParsedYouTubeChannel) => string;

interface ChannelReferenceStyle {
  key: ReferenceStyleKey;
  label: string;
  parser: ChannelReferenceParser;
  description?: string;
  showDurationOption?: boolean;
}

export const CHANNEL_REFERENCE_STYLES: ChannelReferenceStyle[] = [
  {
    key: 'APA',
    label: 'APA (American Psychological Association)',
    parser: channelApaReference,
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
    parser: channelYamlDataReference,
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
function getStyleByKey(key: ReferenceStyleKey): ChannelReferenceStyle | undefined {
  return CHANNEL_REFERENCE_STYLES.find(style => style.key === key);
}



// --- Main function ---
export default async function getYouTubeChannelReference(
  app: App, opts: YouTubeResourceOptions
): Promise<string[] | undefined> {

  const parsedChannels = await getParsedYouTubeData('channels', opts);
  if (!parsedChannels) return;

  const referenceSelection = await runQuickSuggest(
    app,
    CHANNEL_REFERENCE_STYLES.map(s => s.key),
    key => {
      const style = getStyleByKey(key as ReferenceStyleKey)!;
      return `${style.label}:\n${style.parser(parsedChannels[0])}`;
    },
    'Select CHANNEL reference style...'
  );
  if (!referenceSelection) return;

  const style = getStyleByKey(referenceSelection)!;
  return parsedChannels.map(style.parser);
}



/* APA Reference */
// Publication Manual of the American Psychological Association, Seventh Edition
// https://apastyle.apa.org/style-grammar-guidelines/references/examples/youtube-references (2020-02)

// Channel. (n.d.). _Home_ [YouTube channel]. YouTube. Retrieved January 1, 1971, from https://www.example.com
function channelApaReference(channel: ParsedYouTubeChannel): string {
  const retrieveDate = moment().format('MMMM D, YYYY');
  let title = channel.title.trim();
  if (title.slice(-1) === '.') title = title.slice(0, -1); // Remove dot '.' if necessary
  return `${title}. (n.d.). _Home_ [YouTube channel]. YouTube. Retrieved ${retrieveDate}, from ${channel.url}`;
}


/* YAML DATA */
// YAML specification v1.2.2 (2021-10-01)
// https://yaml.org/spec/1.2.2/
function channelYamlDataReference(channel: ParsedYouTubeChannel): string {
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
  lines.push(`title: ${channel.title}`);
  lines.push(`description: ${getYamlMultilineScalar(channel.description)}`);
  lines.push(`publishedAt: ${channel.publishedAt}`);
  lines.push(`thumbnailUrl: ${channel.thumbnailUrl}`);

  lines.push(`country: ${channel.country}`);

  lines.push(`stats:`);
  lines.push(`${indentSp}videos: ${channel.stats.videoCount}`);
  lines.push(`${indentSp}subscribers: ${channel.stats.subscriberCount}`);
  lines.push(`${indentSp}views: ${channel.stats.viewCount}`);

  lines.push(`id: ${channel.id}`);
  lines.push(`handle: ${channel.handle}`);
  lines.push(`url: ${channel.url}`);
  lines.push(`handleUrl: ${channel.handleUrl}`);

  lines.push(`retrievedAt: ${moment().utc().format()}`);

  return lines.join('\n');
}
