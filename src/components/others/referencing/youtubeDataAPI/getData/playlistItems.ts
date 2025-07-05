import requestYouTubeDataAPI from '../request';

export default async function getYouTubePlaylistItemsData(apiKey: string, playlistId: string, count: number): Promise<any[] | undefined> {
  if (count === 0) return [];
  if (count < 0) {
    console.debug(`Invalid count for playlist items: ${count}`);
    return;
  }

  const playlistItems: any[] = [];
  const resultsPerPageLimit = 50;
  const maxResults = Math.min(count, resultsPerPageLimit);

  const baseQueryParams = {
    key: apiKey,
    part: [
      'id',
      'snippet',
      'contentDetails',
      'status',
    ].join(','),
    playlistId,
    maxResults,
  };

  const firstResponse = await requestYouTubeDataAPI('playlistItems', baseQueryParams);
  if (!firstResponse) {
    console.debug(`Failed to retrieve the first page of playlist items: ${baseQueryParams}`);
    return;
  }
  playlistItems.push(...firstResponse.json.items);

  let nextPageToken = firstResponse.json.nextPageToken;
  const totalResults = Math.min(firstResponse.json.pageInfo.totalResults, count);

  while (playlistItems.length < totalResults && nextPageToken) {
    const nextPage = await requestYouTubeDataAPI('playlistItems', {
      ...baseQueryParams,
      pageToken: nextPageToken,
    });
    if (!nextPage) {
      console.debug(`Failed to retrieve next page: ${baseQueryParams}`);
      break;
    }
    playlistItems.push(...nextPage.json.items);
    nextPageToken = nextPage.json.nextPageToken;
  }

  const itemsToReturn = playlistItems.slice(0, count);
  console.debug(`YouTube API ${itemsToReturn.length} playlistItems retrieved:`, itemsToReturn);
  return itemsToReturn;
}
