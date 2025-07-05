import { Notice } from 'obsidian';

import getYouTubeVideoIDs from '../../youtubeHelpers/videoIDs';
import requestYouTubeDataAPI from '../request';

// https://developers.google.com/youtube/v3/docs/videos/list
export default async function getYouTubeVideosData(apiKey: string, idSource: string): Promise<any[] | undefined> {

  const ids = getYouTubeVideoIDs(idSource);
  if (!ids) {
    const msg = 'No YouTube video IDs found';
    new Notice(msg, 3000);
    console.debug(`${msg} in:\n${idSource}`);
    return;
  }

  const response = await requestYouTubeDataAPI('videos', {
    key: apiKey,
    part: [
      'id',
      'snippet',
      'contentDetails',
      'status',
      'statistics',
    ].join(','),
    id: ids.join(','),
  });

  if (!response) return;

  console.debug(`Google API request (YouTube Videos):`, response.json.items);
  return response.json.items;
}
