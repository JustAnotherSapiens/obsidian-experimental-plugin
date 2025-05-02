import { requestYouTubeAPI } from './request';



export function getYouTubePlaylistIDs(text: string) {
  const ids = [];
  const lines = text.split('\n');
  const regex = /https:\/\/www\.youtube\.com\/playlist\?list=([^&?]+)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) ids.push(match[1]);
  }

  if (ids.length <= 0) {
    console.debug(`No YouTube playlist IDs found in: ${text}`);
    return;
  }

  return ids;
}



// https://developers.google.com/youtube/v3/docs/playlists/list
export async function getYouTubePlaylists(idSource: string): Promise<any[] | undefined> {

  const ids = getYouTubePlaylistIDs(idSource);
  if (!ids) return;

  const response = await requestYouTubeAPI({
    target: 'playlists',
    queryParameters: { id: ids.join(',') },
  });
  if (!response) return;

  console.debug(`YouTube API (playlists request):`, response.json);
  return response.json.items;
}

