

/* VIDEO */
export function parseYouTubeVideo(data: any) {
  const video: any = {};
  video.id = data.id;
  video.url = `https://www.youtube.com/watch?v=${video.id}`;
  video.shortUrl = `https://youtu.be/${video.id}`;

  // 'snippet'
  video.title = data.snippet.title;
  video.publishedAt = data.snippet.publishedAt;
  video.defaultAudioLanguage = data.snippet.defaultAudioLanguage;
  video.description = data.snippet.description;
  // video.thumbnails = data.snippet.thumbnails;
  video.thumbnail = data.snippet.thumbnails.medium.url;
  video.channel = {};
  video.channel.id = data.snippet.channelId;
  video.channel.url = `https://www.youtube.com/channel/${video.channel.id}`;
  video.channel.title = data.snippet.channelTitle;

  // 'contentDetails'
  video.duration = data.contentDetails.duration;

  // 'status' 
  video.privacyStatus = data.status.privacyStatus;

  // 'statistics'
  video.stats = {};
  video.stats.views = data.statistics.viewCount;
  video.stats.likes = data.statistics.likeCount;
  video.stats.dislikes = data.statistics.dislikeCount;
  video.stats.comments = data.statistics.commentCount;

  return video;
}



/* PLAYLIST */
export function parseYouTubePlaylist(data: any) {
  const playlist: any = {};
  playlist.id = data.id;
  playlist.url = `https://www.youtube.com/playlist?list=${playlist.id}`;

  // 'snippet'
  playlist.title = data.snippet.title;
  playlist.channel = {};
  playlist.channel.id = data.snippet.channelId;
  playlist.channel.url = `https://www.youtube.com/channel/${playlist.channel.id}`;
  playlist.channel.title = data.snippet.channelTitle;
  // playlist.thumbnails = data.snippet.thumbnails;
  playlist.thumbnail = data.snippet.thumbnails.medium.url;
  playlist.description = data.snippet.description;
  playlist.publishedAt = data.snippet.publishedAt;

  // 'contentDetails'
  playlist.videoCount = data.contentDetails.itemCount;

  // 'status'
  playlist.privacyStatus = data.status.privacyStatus;

  return playlist;
}


/* PLAYLIST ITEM */
export function parseYouTubePlaylistItem(data: any) {
  const item: any = {};

  // 'snippet'
  item.title = data.snippet.title;
  // item.thumbnails = datum.snippet.thumbnails;
  // Videos that have gone private will have an empty object at 'thumbnails'
  item.thumbnail = data.snippet.thumbnails.medium ? data.snippet.thumbnails.medium.url : '';
  item.position = data.snippet.position;


  item.playlistChannel = {};
  item.playlistChannel.id = data.snippet.channelId;
  item.playlistChannel.url = `https://www.youtube.com/channel/${item.playlistChannel.id}`;
  item.playlistChannel.title = data.snippet.channelTitle;

  item.channel = {};
  item.channel.id = data.snippet.videoOwnerChannelId ?? '';
  item.channel.url = item.channel.id ? `https://www.youtube.com/channel/${item.channel.id}`: '';
  item.channel.title = data.snippet.videoOwnerChannelTitle ?? '';

  item.playlistId = data.snippet.playlistId;

  // 'contentDetails'
  item.id = data.contentDetails.videoId;
  item.url = `https://www.youtube.com/watch?v=${item.id}`;
  item.shortUrl = `https://youtu.be/${item.id}`;
  item.publishedAt = data.contentDetails.videoPublishedAt;

  item.urlInPlaylist = `https://www.youtube.com/watch?v=${item.id}&list=${item.playlistId}`;

  // 'status'
  item.privacyStatus = data.status.privacyStatus;

  return item;
}



/* CHANNEL */
export function parseYouTubeChannel(data: any) {
  const youTubeUrl = "https://www.youtube.com";
  const channelSections = [
    "featured",
    "videos",
    "streams",
    "playlists",
    "community",
    "store",
    "channels",
    "about",
  ];
  const channel: any = {};
  channel.id = data.id;

  // 'snippet'
  channel.title = data.snippet.title;
  channel.country = data.snippet.country;
  channel.publishedAt = data.snippet.publishedAt;
  channel.defaultLanguage = data.snippet.defaultLanguage;
  channel.description = data.snippet.description;
  // channel.thumbnails = data.snippet.thumbnails;
  channel.thumbnail = data.snippet.thumbnails.medium.url;

  channel.urls = {};
  channel.urls.mainOld = `${youTubeUrl}/channel/${channel.id}`;
  channel.urls.mainNew = `${youTubeUrl}/${data.snippet.customUrl}`;
  for (const section of channelSections) {
    channel.urls[section] = `${channel.urls.mainNew}/${section}`;
  }

  // 'statistics'
  channel.stats = {};
  channel.stats.views = data.statistics.viewCount;
  channel.stats.subscribers = data.statistics.subscriberCount;
  channel.stats.videos = data.statistics.videoCount;

  return channel;
}

