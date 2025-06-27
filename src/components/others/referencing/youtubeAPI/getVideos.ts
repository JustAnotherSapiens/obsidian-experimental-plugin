import { requestYouTubeAPI } from './request';



export function getYouTubeVideoIDs(text: string) {
  const ids = [];
  const lines = text.split('\n');
  const regex = /https:\/\/(?:www\.youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) ids.push(match[1]);
  }

  if (ids.length <= 0) {
    console.debug(`No YouTube video IDs found in: ${text}`);
    return;
  }

  return ids;
}



// https://developers.google.com/youtube/v3/docs/videos/list
export async function getYouTubeVideos(apiKey: string, idSource: string): Promise<any[] | undefined> {

  const ids = getYouTubeVideoIDs(idSource);
  if (!ids) return;

  const response = await requestYouTubeAPI({
    apiKey: apiKey,
    target: 'videos',
    requestedParts: ['id', 'status', 'contentDetails', 'snippet', 'statistics'],
    queryParameters: { id: ids.join(',') },
  });
  if (!response) return;

  console.debug(`YouTube API (videos request):`, response.json);
  return response.json.items;
}


// // Video Parts

// id
// status
// snippet
// contentDetails

// recordingDetails
// topicDetails

// statistics

// liveStreamingDetails
// paidProductPlacementDetails

// player

// localizations.(key) // a BCP-47 language code
// localizations

// (Only for the owner)
// fileDetails
// processingDetails
// suggestions
