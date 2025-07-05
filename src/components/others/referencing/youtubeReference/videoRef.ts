import { App, moment } from 'obsidian';
import { runQuickSuggest } from 'suggests/quickSuggest';

import type { YouTubeResourceOptions } from '../youtubeDataAPI/parsedData';
import getParsedYouTubeData from '../youtubeDataAPI/parsedData';

import { iso8601DurationToReadableFormat } from 'utils/time';
import { getSetting } from 'utils/obsidian/settings';

import type { ParsedYouTubeVideo } from '../youtubeDataAPI/parsers/video';


// --- Registry ---
type ReferenceStyleKey = 'APA' | 'MLA_Creator' | 'MLA_Uploader' | 'YAML' | 'MD_Links' | 'Sortable' | 'Song';

type VideoReferenceParser = (video: ParsedYouTubeVideo) => string;

interface VideoReferenceStyle {
  key: ReferenceStyleKey;
  label: string;
  parser: VideoReferenceParser;
  description?: string;
  allowDurationAppend?: boolean;
}

export const VIDEO_REFERENCE_STYLES: VideoReferenceStyle[] = [
  {
    key: 'APA',
    label: 'APA, 7th Edition',
    parser: videoApaReference,
    description: 'From the Publication Manual of the American Psychological Association, Seventh Edition',
    allowDurationAppend: true,
  },

  {
    key: 'MLA_Creator',
    label: 'MLA, 9th Edition - Primary Creator',
    parser: videoMlaPrimaryCreatorReference,
    description: 'From the MLA Handbook, Ninth Edition (Modern Language Association of America)',
    allowDurationAppend: true,
  },

  {
    key: 'MLA_Uploader',
    label: 'MLA, 9th Edition - Unclear Primary Creator (Uploader)',
    parser: videoMlaUnclearCreatorReference,
    description: 'From the MLA Handbook, Ninth Edition (Modern Language Association of America)',
    allowDurationAppend: true,
  },

  {
    key: 'YAML',
    label: 'YAML 1.2 Data',
    parser: videoYamlDataReference,
    description: 'YAML specification v1.2.2',
  },

  {
    key: 'MD_Links',
    label: 'Video & Channel Markdown-linked statement',
    parser: videoMdLinkedReference,
    description: '<video_link> uploaded by <channel_link>',
  },

  {
    key: 'Sortable',
    label: 'Sortable by: publication date, channel',
    parser: videoPlainSortReference,
    description: '1971-01-01 Channel: _Title_ (1h 1m 1s). https://www.example.com',
  },

  {
    key: 'Song',
    label: 'Song - Artist format',
    parser: videoPlainSongReference,
    description: 'Song - Artist (privacy_status)',
  },

  // {
  //   key: '',
  //   label: '',
  //   parser: ,
  //   description: '',
  // },

  // ... more styles
];

// --- Style selection utility ---
function getStyleByKey(key: ReferenceStyleKey): VideoReferenceStyle | undefined {
  return VIDEO_REFERENCE_STYLES.find(style => style.key === key);
}


// <reference_format> (1h 13m 5s)
function withDuration(parser: VideoReferenceParser): VideoReferenceParser {
  return (video) => `${parser(video)} (${iso8601DurationToReadableFormat(video.duration)})`;
}


// --- Main function ---
export default async function getYouTubeVideoReference(
  app: App, opts: YouTubeResourceOptions
): Promise<string[] | undefined> {

  const parsedVideos = await getParsedYouTubeData('videos', opts);
  if (!parsedVideos) return;

  const referenceSelection = await runQuickSuggest(
    app,
    VIDEO_REFERENCE_STYLES.map(s => s.key),
    key => {
      const style = getStyleByKey(key as ReferenceStyleKey)!;
      return `${style.label}:\n${style.parser(parsedVideos[0])}`;
    },
    'Select VIDEO reference style...'
  );
  if (!referenceSelection) return;

  const style = getStyleByKey(referenceSelection as ReferenceStyleKey)!;
  let parser = style.parser;

  if (style.allowDurationAppend && getSetting(app, 'appendDurationToApaMla')) {
    parser = withDuration(parser);
  }

  return parsedVideos.map(parser);
}



/* APA Reference */
// Publication Manual of the American Psychological Association, Seventh Edition
// https://apastyle.apa.org/style-grammar-guidelines/references/examples/youtube-references (2020-02)

// Channel. (1971, January 1). _Title_ [Video]. YouTube. https://www.example.com
function videoApaReference(video: ParsedYouTubeVideo): string {
  const date = moment(video.publishedAt).format('YYYY, MMMM D');
  const channel = video.channel.title.trim();
  let title = video.title.trim();
  if (title.slice(-1) === '.') title = title.slice(0, -1); // Remove dot '.' if necessary
  return `${channel}. (${date}). _${title}_ [Video]. YouTube. ${video.url}`;
}


/* MLA References */
// MLA Handbook, Ninth Edition
// https://style.mla.org/citing-youtube-videos/ (2022-03-30)

// Primary creator or author
// Channel. "Title." _YouTube_, 1 Jan. 1971, www.example.com.
function videoMlaPrimaryCreatorReference(video: ParsedYouTubeVideo): string {
  const date = moment(video.publishedAt).format('D MMM. YYYY');
  const channel = video.channel.title.trim();
  let title = video.title.trim();
  if (!title.match(/[.!?]$/)) title += '.'; // Add dot '.' if necessary
  // URI Scheme specifications: https://datatracker.ietf.org/doc/html/rfc3986#page-17
  const url = video.url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, '')
  return `${channel}. "${title}" _YouTube_, ${date}, ${url}.`;
}

// Unclear primary creator or author (uploader)
// "Title." _YouTube_, uploaded by Channel, 1 Jan. 1971, www.example.com.
function videoMlaUnclearCreatorReference(video: ParsedYouTubeVideo): string {
  const date = moment(video.publishedAt).format('D MMM. YYYY');
  const channel = video.channel.title.trim();
  let title = video.title;
  if (!title.match(/[.!?]$/)) title += '.'; // Add dot '.' if necessary
  const url = video.url.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, '')
  return `"${title}" _YouTube_, uploaded by ${channel}, ${date}, ${url}.`;
}


/* YAML Data */
// YAML specification v1.2.2 (2021-10-01)
// https://yaml.org/spec/1.2.2/
// TODO: Ensure valid YAML 1.2 output (utility function)
function videoYamlDataReference(video: ParsedYouTubeVideo): string {
  // https://yaml.org/spec/1.2.2/#61-indentation-spaces
  const indent = 4;
  const indentSp = ' '.repeat(indent);

  // https://yaml.org/spec/1.2.2/#8111-block-indentation-indicator
  const getYamlMultilineScalar = (value: string, currentIndentDepth: number = 0, indentSize: number = indent) => {
    const lines = value.split('\n');
    if (lines.length === 1) return value;
    const totalIndent = indentSize * (currentIndentDepth + 1);
    const indentedLines = lines.map(l => ' '.repeat(totalIndent) + l);
    return `|\n${indentedLines.join('\n')}`;
  };

  const lines: string[] = [];

  lines.push(`title: ${video.title}`);
  lines.push(`description: ${getYamlMultilineScalar(video.description)}`);
  lines.push(`publishedAt: ${video.publishedAt}`);
  lines.push(`thumbnailUrl: ${video.thumbnailUrl}`);

  lines.push(`channel:`);
  lines.push(`${indentSp}id: ${video.channel.id}`);
  lines.push(`${indentSp}url: ${video.channel.url}`);
  lines.push(`${indentSp}title: ${video.channel.title}`);

  lines.push(`duration: ${video.duration}`);

  lines.push(`stats:`);
  lines.push(`${indentSp}views: ${video.stats.viewCount}`);
  lines.push(`${indentSp}likes: ${video.stats.likeCount}`);
  lines.push(`${indentSp}comments: ${video.stats.commentCount}`);

  lines.push(`id: ${video.id}`);
  lines.push(`url: ${video.url}`);

  lines.push(`retrievedAt: ${moment().utc().format()}`);

  return lines.join('\n');
}



/* CUSTOM REFERENCES */



/* Video & Channel Markdown-linked statement */
// [Title](video_url) uploaded by [Channel](channel_url)
function videoMdLinkedReference(video: ParsedYouTubeVideo): string {
  const channel = video.channel.title.trim();
  const title = video.title.trim();
  return `[${title}](${video.url}) uploaded by [${channel}](${video.channel.url})`;
}


/* SORT OPTIMIZED */

// 1971-01-01 Channel: _Title_ (1h 13m 5s). https://www.example.com
function videoPlainSortReference(video: ParsedYouTubeVideo): string {
  const date = moment(video.publishedAt).format('YYYY-MM-DD');
  const channel = video.channel.title.trim();
  const title = video.title.trim();
  let refStr = `${date} ${channel}: _${title}_`;
  if (video.duration)
    refStr += ` (${iso8601DurationToReadableFormat(video.duration)})`;
  refStr +=`. ${video.url}`;
  return refStr;
}

// 1971-01-01 [Channel](channel_url): [Title](video_url) (1h 13m 5s)
function videoMdLinkedSortReference(video: ParsedYouTubeVideo): string {
  const date = moment(video.publishedAt).format('YYYY-MM-DD');
  const channel = video.channel.title.trim();
  const channelUrl = video.channel.url;
  const title = video.title.trim().replace(/\[([^\]]*)\]/g, '($1)');
  let refStr = `${date} [${channel}](${channelUrl}): [${title}](${video.url})`;
  if (video.duration)
    refStr += ` (${iso8601DurationToReadableFormat(video.duration)})`;
  return refStr;
}



/* MUSIC PLAYLISTS ITEMS */

// Title - Channel
// Title - Channel (unlisted)
// https://www.example.com (private)
function videoPlainSongReference(video: ParsedYouTubeVideo): string {
  const channel = video.channel.title.trim().replace(/ - Topic$/, '');
  const title = video.title.trim();
  let itemStr = '';

  if (video.privacyStatus !== 'private') {
    itemStr += `${title} - ${channel}`;
  } else {
    itemStr = `${video.url} (private)`;
  }

  if (video.privacyStatus === 'unlisted') {
    itemStr += ' (unlisted)';
  }

  return itemStr;
}

// [Title](video_url) - [Channel](channel_url)
// [Title](video_url) - [Channel](channel_url) (unlisted)
// https://www.example.com (private)
function videoLinkedSongReference(video: ParsedYouTubeVideo): string {
  const channel = video.channel.title.trim().replace(/ - Topic$/, '');
  const title = video.title.trim();
  let itemStr = '';

  if (video.privacyStatus !== 'private') {
    itemStr += `[${title}](${video.url})`;
    itemStr += ' - ';
    itemStr += `[${channel}](${video.channel.url})`;
  } else {
    itemStr = `${video.url} (private)`;
  }

  if (video.privacyStatus === 'unlisted') {
    itemStr += ' (unlisted)';
  }

  return itemStr;
}


/* OTHERS */

// ### [Title](video_url) (1h 13m 5s)
// Channel. (1971, January 1). _Title_ [Video]. YouTube. https://www.example.com
function videoMdHeadingAndAPAReference(video: ParsedYouTubeVideo): string {
  const title = video.title.trim().replace(/\[([^\]]*)\]/g, '($1)');
  let heading = `### [${title}](${video.url})`;
  if (video.duration)
    heading += ` (${iso8601DurationToReadableFormat(video.duration)})`;
  const reference = videoApaReference(video);
  return `${heading}\n${reference}`;
}

// ![](https://i.ytimg.com/vi/video_id/mqdefault.jpg)
function videoThumbnailReference(video: ParsedYouTubeVideo): string {
  return `![](${video.thumbnailUrl})`
}


