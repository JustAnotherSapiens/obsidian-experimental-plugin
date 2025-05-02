import { requestYouTubeAPI } from './request';

import { parseYouTubePlaylistItem } from './defaultParsers';



export async function getYouTubeParsedPlaylistItems(playlistId: string, count: number): Promise<any[] | undefined> {
  const playlistItems = await getYouTubePlaylistItems(playlistId, count);
  if (!playlistItems) return;

  return playlistItems.map(
    (item: any) => parseYouTubePlaylistItem(item)
  );
}



// https://developers.google.com/youtube/v3/docs/playlistItems/list
export async function getYouTubePlaylistItems(playlistId: string, count: number): Promise<any[] | undefined> {

  const resultsPerPageLimit = 50;

  const minPagesForAllItems = Math.ceil(count / resultsPerPageLimit);
  const spreadedResultsPerPage = Math.ceil(count / minPagesForAllItems);

  const countFitsSinglePage = count >= 0 && count <= resultsPerPageLimit;
  const maxResults = countFitsSinglePage ? count : spreadedResultsPerPage;

  const firstResponse = await requestYouTubeAPI({
    target: 'playlistItems',
    queryParameters: {
      playlistId: playlistId,
      maxResults: maxResults, // default: 5
    }
  });
  if (!firstResponse) return;


  let playlistItems: any[] = [];
  playlistItems = playlistItems.concat(firstResponse.json.items);


  if (!countFitsSinglePage) {
    let nextPageToken = firstResponse.json.nextPageToken;
    const targetCount = Math.min(firstResponse.json.pageInfo.totalResults, count);

    while (targetCount > playlistItems.length) {
      if (!nextPageToken) break;

      const nextPage = await requestYouTubeAPI({
        target: 'playlistItems',
        queryParameters: {
          playlistId: playlistId,
          pageToken: nextPageToken,
        }
      });

      if (!nextPage) {
        console.debug('Failed to retrieve next page.');
        break;
      }

      playlistItems = playlistItems.concat(nextPage.json.items);
      nextPageToken = nextPage.json.nextPageToken;
      // console.log(nextPage.json);

    }
  }

  console.debug(`YouTube API ${playlistItems.length} playlistItems retrieved:`, playlistItems);
  return playlistItems.slice(0, count);
}
