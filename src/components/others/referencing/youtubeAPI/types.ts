
const YouTubeAPIRequestTargets = [
  'videos',
  'channels',
  'playlists',
  'playlistItems',
] as const;
export type YouTubeAPITarget = typeof YouTubeAPIRequestTargets[number];


export type YouTubeAPIRequestParameters = {
  target: YouTubeAPITarget;
  requestedParts?: string[];
  queryParameters: Record<string, string | number>;
};


// TODO(TypeScript): Add this properly.
type YouTubeAPIQueryParameters = {
  // Required parameters
  key: string; // API Key
  part: string;
  // Filters (exactly one of the following parameters)
  id?: string;
  playlistId?: string;
  // Optional parameters
  maxResults?: number; // unsigned integer
  onBehalfOfContentOwner?: string;
  pageToken?: string;
  videoId?: string;
};
// type YouTubeApiQueryParam

