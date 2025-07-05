
// Reference: https://developers.google.com/youtube/v3/docs/playlists
export type ParsedYouTubePlaylist = {
  id: string;
  url: string;

  /* snippet */
  publishedAt: string; // specified in ISO 8601 format
  title: string;
  description: string;
  thumbnailUrl: string; // medium (320 x 180 pixels)
  channel: {
    id: string;
    url: string;
    title: string;
  };
  defaultLanguage: string;

  /* status */
  privacyStatus: 'private' | 'public' | 'unlisted';
  podcastStatus: 'enabled' | 'disabled' | 'unspecified';

  /* contentDetails */
  itemCount: number;
};


export default function parseYouTubePlaylist(data: any): ParsedYouTubePlaylist {
  const playlistId = data.id;
  const channelId = data.snippet.channelId;
  return {
    id: playlistId,
    url: `https://www.youtube.com/playlist?list=${playlistId}`,

    /* snippet */
    publishedAt: data.snippet.publishedAt,
    title: data.snippet.title,
    description: data.snippet.description,
    thumbnailUrl: data.snippet.thumbnails.medium.url,
    channel: {
      id: channelId,
      url: `https://www.youtube.com/channel/${channelId}`,
      title: data.snippet.channelTitle,
    },
    defaultLanguage: data.snippet.defaultLanguage,

    /* status */
    privacyStatus: data.status.privacyStatus,
    podcastStatus: data.status.podcastStatus,

    /* contentDetails */
    itemCount: data.contentDetails.itemCount,
  };
}
