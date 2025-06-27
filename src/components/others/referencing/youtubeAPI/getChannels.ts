import { getYouTubeVideoIDs } from './getVideos';
import { getYouTubePlaylistIDs } from './getPlaylists';

import { requestYouTubeAPI } from './request';

// STEPS
// 1. Extract individual ID
// 2. Classify it as either video or playlist ID
// 3. Request the channel ID

// In any case it is more efficient to make 2 groups to only send 2 requests.


async function requestYouTubeChannelIDs(apiKey: string, target: 'videos' | 'playlists', ids: string[]) {

  const response = await requestYouTubeAPI({
    apiKey: apiKey,
    target: target,
    requestedParts: ['snippet'],
    queryParameters: { id: ids.join(',') },
  });
  if (!response) return;

  return response.json.items.map(
    (item: any) => item.snippet.channelId
  );
}



function getYouTubeChannelIDs(apiKey: string, text: string) {

  let ids: any[] = [];

  const videoIDs = getYouTubeVideoIDs(text);
  if (videoIDs) {
    const channelIDs = requestYouTubeChannelIDs(apiKey, 'videos', videoIDs);
    if (channelIDs) ids = ids.concat(channelIDs);
  }

  const playlistIDs = getYouTubePlaylistIDs(text);
  if (playlistIDs) {
    const channelIDs = requestYouTubeChannelIDs(apiKey, 'playlists', playlistIDs);
    if (channelIDs) ids = ids.concat(channelIDs);
  }

  if (ids.length <= 0) {
    console.debug(`No YouTube channel IDs resolved from: ${text}`);
    return;
  }

  return ids;
}



// https://developers.google.com/youtube/v3/docs/channels
export async function getYouTubeChannels(apiKey: string, idSource: string): Promise<any[] | undefined> {

  const ids = getYouTubeChannelIDs(apiKey, idSource);
  if (!ids) return;

  const response = await requestYouTubeAPI({
    apiKey: apiKey,
    target: 'channels',
    requestedParts: ['id', 'status', 'contentDetails', 'snippet', 'statistics'],
    queryParameters: { id: ids.join(',') },
  });
  if (!response) return;

  console.debug(`YouTube API (channels request):`, response.json);
  return response.json.items;
}

