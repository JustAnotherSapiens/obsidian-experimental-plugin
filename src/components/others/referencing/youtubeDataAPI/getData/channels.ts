import { Notice } from 'obsidian';

import getYouTubeChannelIDsAndHandles from '../../youtubeHelpers/channelIDs';
import requestYouTubeDataAPI from '../request';

// https://developers.google.com/youtube/v3/docs/channels/list
export default async function getYouTubeChannelsData(apiKey: string, idSource: string): Promise<any[] | undefined> {
  const idsAndHandles = getYouTubeChannelIDsAndHandles(idSource);
  if (!idsAndHandles) {
    const msg = 'No YouTube channel IDs or handles found';
    new Notice(msg, 3000);
    console.debug(`${msg} in:\n${idSource}`);
    return;
  }

  const baseQueryParams = {
    key: apiKey,
    part: [
      'id',
      'snippet',
      'statistics',
      'status',
      'contentOwnerDetails',
    ].join(','),
  };

  const allResults: any[] = [];

  // SINGLE REQUEST FOR CHANNEL IDS
  if (idsAndHandles.ids && idsAndHandles.ids.length > 0) {
    const idsQueryParams = { ...baseQueryParams, id: idsAndHandles.ids.join(',') };
    const response = await requestYouTubeDataAPI('channels', idsQueryParams);
    if (response && Array.isArray(response.json.items)) {
      allResults.push(...response.json.items);
    }
  }

  // MULTIPLE REQUEST FOR CHANNEL HANDLES
  if (idsAndHandles.handles && idsAndHandles.handles.length > 0) {
    for (const handle of idsAndHandles.handles) {
      const handleQueryParams = { ...baseQueryParams, forHandle: handle };

      const response = await requestYouTubeDataAPI('channels', handleQueryParams);
      if (response && Array.isArray(response.json.items)) {
        allResults.push(...response.json.items);
      } else {
        console.warn(`No results found for channel handle: ${handle}`);
        new Notice(`No results found for channel handle: ${handle}`, 5000);
      }
    }
  }

  if (allResults.length === 0) return;
  console.debug(`Google API request (YouTube Channels):`, allResults);
  return allResults;
}
