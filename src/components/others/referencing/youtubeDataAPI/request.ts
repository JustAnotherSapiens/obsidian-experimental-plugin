import {
  Notice,
  requestUrl,
  RequestUrlParam,
  RequestUrlResponse,
} from 'obsidian';



// TODO: Add support for more resources.
// https://developers.google.com/youtube/v3/getting-started#resources
export type YouTubeAPIBasicResource = 'videos' | 'channels' | 'playlists';
export type YouTubeAPIResource = YouTubeAPIBasicResource | 'playlistItems';


type YouTubeAPIQueryParameters = {
  key: string;
  part: string; // Comma-separated list of resource properties
  id?: string; // Comma-separated string of IDs
  forHandle?: string; // Channel handle 
  playlistId?: string;
  maxResults?: number;
  pageToken?: string;
  // https://developers.google.com/youtube/v3/guides/authentication
  access_token?: string;
};




function validateYouTubeAPIQueryParameters(obj: unknown): obj is YouTubeAPIQueryParameters {
  const errors: string[] = [];
  if (typeof obj !== 'object' || obj === null) {
    errors.push('Input is not an object.');
  } else {
    const o = obj as Record<string, unknown>;

    // Known keys
    const allowedKeys = [
      'key', 'part', 'id', 'forHandle', 'playlistId', 'maxResults', 'pageToken', 'access_token'
    ] as const;

    // Unknown keys detection (checks only own properties)
    for (const k of Object.keys(o)) {
      if (!allowedKeys.includes(k as any)) {
        errors.push(`Unknown property: '${k}'`);
      }
    }

    // Required string keys
    for (const reqKey of ['key', 'part'] as const) {
      if (!(reqKey in o)) {
        errors.push(`Missing required property: '${reqKey}'.`);
      } else if (typeof o[reqKey] !== 'string') {
        errors.push(`Property '${reqKey}' must be a string`);
      }
    }

    // Optional string keys
    for (const strKey of ['id', 'forHandle', 'playlistId', 'pageToken', 'access_token'] as const) {
      if (strKey in o && typeof o[strKey] !== 'string') {
        errors.push(`Property '${strKey}' must be a string if present.`);
      }
    }

    // Optional number keys
    for (const numKey of ['maxResults'] as const) {
      if (numKey in o && typeof o[numKey] !== 'number') {
        errors.push(`Property '${numKey}' must be a number if present.`);
      }
    }

    // Enforce *exactly one* of 'id', 'playlistId', 'forHandle'
    const hasId = typeof o.id === 'string' && o.id.length > 0;
    const hasForHandle = typeof o.forHandle === 'string' && o.forHandle.length > 0;
    const hasPlaylistId = typeof o.playlistId === 'string' && o.playlistId.length > 0;

    const present = [
      hasId ? 'id' : null,
      hasPlaylistId ? 'playlistId' : null,
      hasForHandle ? 'forHandle' : null,
    ].filter(Boolean);

    if (present.length === 0) {
      errors.push("Exactly one of 'id', 'playlistId', or 'forHandle' is required.");
    } else if (present.length > 1) {
      errors.push(`Only one of 'id', 'playlistId', or 'forHandle' may be provided. (Found: ${present.join(', ')})`);
    }

  }

  if (errors.length > 0) {
    console.warn('YouTubeAPIQueryParameters validation failed:', errors.join(' | '));
    return false;
  }
  return true;
}



export default async function requestYouTubeDataAPI(resource: YouTubeAPIResource, queryParams: YouTubeAPIQueryParameters): Promise<RequestUrlResponse | undefined> {

  // PARAMETER VALIDATION
  if (!validateYouTubeAPIQueryParameters(queryParams)) return;

  // PARAMETER STRING CONSTRUCTION
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
  const urlParameterList = [];
  for (const paramKey in queryParams) {
    const paramValue = queryParams[paramKey as keyof YouTubeAPIQueryParameters];
    if (typeof paramValue === 'string') {
      urlParameterList.push(`${paramKey}=${encodeURIComponent(paramValue)}`);
    }
  }
  const urlParameters = urlParameterList.join('&');

  // REQUEST CONSTRUCTION
  // https://developers.google.com/youtube/v3/docs
  // Videos: list (HTTP GET request) https://developers.google.com/youtube/v3/docs/videos/list
  const request: RequestUrlParam = {
    url: `https://www.googleapis.com/youtube/v3/${resource}?${urlParameters}`,
    method: 'GET',
    contentType: 'application/json',
    throw: false, // Don't throw an error on HTTP error status codes (400+)
  };

  // REQUEST ATTEMPT
  let response;
  try {
    response = await requestUrl(request);
  } catch (error) {
    const errorMessage = `An error occurred while attempting the request: ${request}`;
    console.debug(errorMessage);
    console.error(error);
    return;
  }

  // RESPONSE HANDLING
  if (response.status >= 400) {
    const message = `YouTube API request failed (${response.status})`;
    console.warn(message, response);
    new Notice(message, 8000);
    return;
  }

  return response;
}



// CODE GRAVEYARD


// function hasNonTrivialString<K extends string>(obj: Record<string, unknown>, key: K): obj is Record<K, string> {
//   return (
//     Object.prototype.hasOwnProperty.call(obj, key) && // Key exists
//     typeof obj[key] === 'string' && // Value is string
//     (obj[key] as string).length > 0 // Non-empty
//   );
// }


// validationParams?: Exclude<keyof YouTubeAPIQueryParameters, 'key' | 'part'>,

