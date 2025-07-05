
// Reference: https://developers.google.com/youtube/v3/docs/channels
export type ParsedYouTubeChannel = {
  id: string;
  url: string;
  handle: string; // unique and short channel identifier that starts with '@'
  handleUrl: string;
  // sectionUrls: {[key: string]: string};

  /* snippet */
  title: string;
  description: string;
  // customUrl: string; // handle
  publishedAt: string; // specified in ISO 8601 format
  thumbnailUrl: string; // medium (240 x 240 pixels)
  defaultLanguage: string;
  country: string;

  /* statistics */
  stats: {
    viewCount: number; // for all the videos in all formats
    subscriberCount: number; // rounded down to three significant figures
    hiddenSubscriberCount: boolean;
    videoCount: number; // public videos uploaded to the channel
  };

  /* status */
  privacyStatus: 'private' | 'public' | 'unlisted';
  isLinked: boolean; // linked to either a YouTube username or a Google+ account

  /* brandingSettings */

  /* contentOwnerDetails */
  contentOwner: {
    id: string;
    timeLinked: string;
  }
};


// Understand your YouTube channel's URLs: https://support.google.com/youtube/answer/6180214
export default function parseYouTubeChannel(data: any): ParsedYouTubeChannel {
  const channelId = data.id;
  const channelHandle = data.snippet.customUrl;
  return {
    id: channelId,
    url: `https://www.youtube.com/channel/${channelId}`,
    handle: channelHandle,
    handleUrl: `https://www.youtube.com/${channelHandle}`,

    /* snippet */
    title: data.snippet.title,
    description: data.snippet.description,
    publishedAt: data.snippet.publishedAt,
    thumbnailUrl: data.snippet.thumbnails.medium.url,
    defaultLanguage: data.snippet.defaultLanguage,
    country: data.snippet.country,

    /* statistics */
    stats: {
      viewCount: data.statistics.viewCount,
      subscriberCount: data.statistics.subscriberCount,
      hiddenSubscriberCount: data.statistics.hiddenSubscriberCount,
      videoCount: data.statistics.videoCount,
    },

    /* status */
    privacyStatus: data.status.privacyStatus,
    isLinked: data.status.isLinked,

    /* contentOwnerDetails */
    contentOwner: {
      id: data.contentOwnerDetails.contentOwner,
      timeLinked: data.contentOwnerDetails.timeLinked,
    },
  };
}


// A YouTube Channel section's URL has the form: `${handleUrl}/${sectionName}`
// The Home section is just the handle URL.

  // // Updated 2025-06-30 21:12:14 -06:00
  // const channelSections = [
  //   'videos',
  //   'streams', // Live
  //   'podcasts', // As in @isaacarthurSFIA
  //   'courses', // As in @3blue1brown
  //   'playlists',
  //   'posts',
  //   'store',
  //   /* Excluded */
  //   // 'featured', // Home page
  //   /* No longer available */
  //   // 'community',
  //   // 'channels',
  //   // 'about',
  // ];
