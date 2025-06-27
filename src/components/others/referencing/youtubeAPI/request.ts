import {
  Notice,
  requestUrl,
  RequestUrlResponse,
} from 'obsidian';



const YOUTUBE_API_BASE_URL =  'https://www.googleapis.com/youtube/v3/';


const YouTubeAPIRequestTargets = [
  'videos',
  'channels',
  'playlists',
  'playlistItems',
] as const;

export type YouTubeAPITarget = typeof YouTubeAPIRequestTargets[number];


export type YouTubeAPIRequestParameters = {
  apiKey: string;
  target: YouTubeAPITarget;
  requestedParts?: string[];
  queryParameters: Record<string, string | number>;
};



export async function requestYouTubeAPI(args: YouTubeAPIRequestParameters): Promise<RequestUrlResponse | undefined> {

  let url = YOUTUBE_API_BASE_URL + args.target + '?';

  // Add the API key always as the first parameter.
  if (args.apiKey) {
    url += `key=${args.apiKey}&`;
  } else {
    const message = `A Google API key is required to request YouTube data.`;
    console.warn(message);
    new Notice(message, 5000);
    return;
  }

  // Add any additional parameter.
  for (const parameter in args.queryParameters) {
    url += `${parameter}=${args.queryParameters[parameter]}&`;
  }

  // Default: request common parts.
  if (!args.requestedParts || args.requestedParts.length === 0) {
    args.requestedParts = ['id', 'status', 'contentDetails', 'snippet'];
  }

  // Add the 'part' always as the last parameter.
  url += `part=${args.requestedParts.join('%2C')}`;


  // REQUEST URL
  const requestUrlParam = {
    url: url,
    method: 'GET',
    contentType: 'application/json',
    throw: false, // Don't throw an error on HTTP error status codes (400+)
  };

  let response;

  try {
    response = await requestUrl(requestUrlParam);
  } catch (error) {
    const errorMessage = `An error occurred when attempting the request: ${requestUrlParam}`;
    console.debug(errorMessage);
    console.error(error);
    return;
  }

  // Handle the response
  if (response.status >= 400) {
    const message = `YouTube API request failed (${response.status})`;
    console.warn(message, response);
    new Notice(message, 8000);
    return;
  }

  return response;
}




// CODE GRAVEYARD

// // TODO(TypeScript): Add this properly.
// type YouTubeAPIQueryParameters = {
//   // Required parameters
//   key: string; // API Key
//   part: string;
//   // Filters (exactly one of the following parameters)
//   id?: string;
//   playlistId?: string;
//   // Optional parameters
//   maxResults?: number; // unsigned integer
//   onBehalfOfContentOwner?: string;
//   pageToken?: string;
//   videoId?: string;
// };
// // type YouTubeApiQueryParam

