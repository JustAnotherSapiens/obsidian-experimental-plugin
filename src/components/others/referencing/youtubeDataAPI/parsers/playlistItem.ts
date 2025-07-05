
// Reference: https://developers.google.com/youtube/v3/docs/playlistItems
export type ParsedYouTubePlaylistItem = {
  id: string; // uniquely identifies the playlist item (not the video)
  // url: string;

  /* snippet */
  addedAt: string; // date and time that the item was added to the playlist
  title: string;
  description: string;
  thumbnailUrl: string | undefined; // medium (320 x 180 pixels)
  channel: { // the channel that the playlist item belongs to
    id: string; // snippet.channelId
    url: string;
    title: string; // snippet.channelTitle
  };
  ownerChannel: { // the channel that uploaded this video
    id: string; // snippet.videoOwnerChannelId
    url: string;
    title: string; // snippet.videoOwnerChannelTitle
  };
  playlistId: string; // snippet.playlistId
  position: number; // zero-based index  snippet.position
  resource: {
    kind: string; // snippet.resourceId.kind
    isVideo: boolean;
    videoId: string | undefined; // ~ snippet.resourceId.videoId
  };

  /* ~ contentDetails */
  details: {
    videoId: string; // contentDetails.videoId
    videoUrl: string;
    videoShortUrl: string;
    videoPublishedAt: string; // contentDetails.videoPublishedAt
    note: string; // user-generated note (up to 280 characters) contentDetails.note
  } | undefined;

  /* status */
  privacyStatus: 'private' | 'public' | 'unlisted';

  // FOOTNOTES:
  // ~ Only present if the value of snippet.resourceId.kind is 'youtube#video'
};


export default function parseYouTubePlaylistItem(data: any): ParsedYouTubePlaylistItem {
  const playlistItemId = data.id;
  const playlistChannelId = data.snippet.channelId;
  const ownerChannelId = data.snippet.videoOwnerChannelId;

  // Private items return an empty data.snippet.thumbnails object
  const itemPrivacyStatus = data.status.privacyStatus;
  const isPrivate = itemPrivacyStatus === 'private';

  const resourceKind = data.snippet.resourceId.kind;
  const isVideoResource = resourceKind === 'youtube#video';
  const videoId = isVideoResource ? data.snippet.resourceId.videoId : undefined;

  return {
    id: playlistItemId,

    /* snippet */
    addedAt: data.snippet.publishedAt,
    title: data.snippet.title,
    description: data.snippet.description,
    thumbnailUrl: !isPrivate ? data.snippet.thumbnails.medium.url : undefined,
    channel: {
      id: playlistChannelId,
      url: `https://www.youtube.com/channel/${playlistChannelId}`,
      title: data.snippet.channelTitle,
    },
    ownerChannel: {
      id: ownerChannelId,
      url: `https://www.youtube.com/channel/${ownerChannelId}`,
      title: data.snippet.videoOwnerChannelTitle,
    },
    playlistId: data.snippet.playlistId,
    position: data.snippet.position,
    resource: {
      kind: resourceKind,
      isVideo: isVideoResource,
      videoId: videoId,
    },

    /* contentDetails */
    details: isVideoResource ? {
      videoId: data.contentDetails.videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoShortUrl: `https://youtu.be/${videoId}`,
      videoPublishedAt: data.contentDetails.videoPublishedAt,
      note: data.contentDetails.note,
    } : undefined,

    /* status */
    privacyStatus: itemPrivacyStatus,
  };
}
