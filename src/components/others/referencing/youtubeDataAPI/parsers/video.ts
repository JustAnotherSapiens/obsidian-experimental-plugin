
// Reference: https://developers.google.com/youtube/v3/docs/videos
export type ParsedYouTubeVideo = {
  id: string;
  url: string;
  shortUrl: string;

  /* snippet */
  publishedAt: string; // specified in ISO 8601 format
  title: string;       // up to 100 valid UTF-8 characters except < and >
  description: string; // up to 5000 bytes in valid UTF-8 characters except < and >
  thumbnailUrl: string; // medium (320 x 180 pixels)
  channel: {
    id: string;
    url: string;
    title: string;
  };
  defaultLanguage: string;
  defaultAudioLanguage: string;

  /* contentDetails */
  duration: string; // an ISO 8601 duration

  /* status */
  privacyStatus: 'private' | 'public' | 'unlisted';
  license: 'creativeCommon' | 'yotube';

  /* statistics */
  stats: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
  };
};


export default function parseYouTubeVideo(data: any): ParsedYouTubeVideo {
  const videoId = data.id;
  const channelId = data.snippet.channelId;
  return {
    id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    shortUrl: `https://youtu.be/${videoId}`,

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
    defaultAudioLanguage: data.snippet.defaultAudioLanguage,

    /* contentDetails */
    duration: data.contentDetails.duration,

    /* status */
    privacyStatus: data.status.privacyStatus,
    license: data.status.license,

    /* statistics */
    stats: {
      viewCount: data.statistics.viewCount,
      likeCount: data.statistics.likeCount,
      commentCount: data.statistics.commentCount,
    },
  };
}
