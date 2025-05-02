import { App, moment } from 'obsidian';

import { runQuickSuggest } from 'suggests/quickSuggest';
import { iso8601DurationToReadableFormat } from 'utils/time';

import { getYouTubeParsedItems } from '../youtubeAPI/getYouTubeItems';



export const VIDEO_REFERENCE_PARSERS: Record<string, CallableFunction> = {
  APA: videoApaReference,
  MLA: videoMlaReference,
  mdLinked: videoMdLinkedReference,
  mdLinkedSort: videoMdLinkedSortReference,
  plainSort: videoPlainSortReference,
  linkedSong: videoLinkedSongReference,
  plainSong: videoPlainSongReference,
  mdHeadingAndAPA: videoMdHeadingAndAPAReference,
  thumbnail: videoThumbnailReference,
};



export default async function getYouTubeVideoReference(app: App, idSource: string): Promise<string[] | undefined> {

  const parsedVideos = await getYouTubeParsedItems(idSource, 'videos');
  if (!parsedVideos) return;
  const sampleVideo = parsedVideos[0];

  // Prompt for a reference style
  const referenceSelection = await runQuickSuggest(app,
    Object.keys(VIDEO_REFERENCE_PARSERS),
    (key: string) => `${key}:\n${VIDEO_REFERENCE_PARSERS[key](sampleVideo)}`,
    "Select VIDEO reference style..."
  );
  if (!referenceSelection) return;

  // if (referenceSelection === 'thumbnail') {
  //   return parsedVideos.map(
  //     (video: any) => videoReferenceParsers.thumbnail(app, video)
  //   );
  // }

  return parsedVideos.map(
    (video: any) => VIDEO_REFERENCE_PARSERS[referenceSelection](video)
  );
}



function videoApaReference(video: any) {
  const date = moment(video.publishedAt).format("YYYY, MMMM D");
  const channel = video.channel.title.trim();
  let title = video.title.trim();
  if (title.slice(-1) === ".") title = title.slice(0, -1);
  return `${channel}. (${date}). _${title}_ [Video]. YouTube. ${video.url}`;
}


function videoMlaReference(video: any) {
  const date = moment(video.publishedAt).format("D MMM. YYYY");
  const channel = video.channel.title.trim();
  let title = video.title;
  if (!title.match(/(?:[.!?])$/)) title += ".";
  return `"${title}" _YouTube_, uploaded by ${channel}, ${date}, ${video.url}.`;
}


function videoMdLinkedReference(video: any) {
  const channel = video.channel.title.trim();
  const title = video.title.trim();
  return `[${title}](${video.url}) uploaded by [${channel}](${video.channel.url})`;
}


function videoMdLinkedSortReference(video: any) {
  const date = moment(video.publishedAt).format("YYYY-MM-DD");
  const channel = video.channel.title.trim();
  const channelUrl = video.channel.url;
  const title = video.title.trim().replace(/([[\]()])/g, '\\$1');
  let refStr = `${date} [${channel}](${channelUrl}): [${title}](${video.url})`;
  if (video.duration)
    refStr += ` (${iso8601DurationToReadableFormat(video.duration)})`;
  return refStr;
}


function videoPlainSortReference(video: any) {
  const date = moment(video.publishedAt).format("YYYY-MM-DD");
  const channel = video.channel.title.trim();
  const title = video.title.trim();
  let refStr = `${date} ${channel}: _${title}_`;
  if (video.duration)
    refStr += ` (${iso8601DurationToReadableFormat(video.duration)})`;
  refStr +=`. ${video.url}`;
  return refStr;
}


function videoLinkedSongReference(video: any) {
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


function videoPlainSongReference(video: any) {
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


function videoMdHeadingAndAPAReference(video: any) {
  const title = video.title.trim().replace(/([[\]()])/g, '\\$1');
  let heading = `### [${title}](${video.url})`;
  if (video.duration)
    heading += ` (${iso8601DurationToReadableFormat(video.duration)})`;
  const reference = videoApaReference(video);
  return `${heading}\n${reference}`;
}


function videoThumbnailReference(video: any) {
  return `![](${video.thumbnail})`
}

// async function videoThumbnailReference(app: App, video: any) {
//   const thumbnails = video.thumbnails;
//   const userSelection = await runQuickSuggest(app,
//     Object.keys(thumbnails),
//     (key: string) => `${key} (${thumbnails[key].width}x${thumbnails[key].height})`,
//     "Select thumbnail ('medium' or 'maxres' suggested):"
//   );
//   if (!userSelection) return;
//   return `![](${thumbnails[userSelection].url})`;
// }

