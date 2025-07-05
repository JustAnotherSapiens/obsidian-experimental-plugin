import { Notice } from 'obsidian';

import getYouTubePlaylistIDs from '../../youtubeHelpers/playlistIDs';
import requestYouTubeDataAPI from '../request';

// https://developers.google.com/youtube/v3/docs/playlists/list
export default async function getYouTubePlaylistsData(apiKey: string, idSource: string): Promise<any[] | undefined> {

  const ids = getYouTubePlaylistIDs(idSource);
  if (!ids) {
    const msg = 'No YouTube playlist IDs found';
    new Notice(msg, 3000);
    console.debug(`${msg} in:\n${idSource}`);
    return;
  }

  const response = await requestYouTubeDataAPI('playlists', {
    key: apiKey,
    part: [
      'id',
      'snippet',
      'status',
      'contentDetails',
    ].join(','),
    id: ids.join(','),
  });

  if (!response) return;

  console.debug(`Google API request (YouTube Playlists):`, response.json.items);
  return response.json.items;
}
