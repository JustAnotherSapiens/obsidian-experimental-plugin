import getYouTubeVideosData from './getData/videos';
import getYouTubeChannelsData from './getData/channels';
import getYouTubePlaylistsData from './getData/playlists';
import getYouTubePlaylistItemsData from './getData/playlistItems';

import type { ParsedYouTubeVideo } from './parsers/video';
import type { ParsedYouTubeChannel } from './parsers/channel';
import type { ParsedYouTubePlaylist } from './parsers/playlist';
import type { ParsedYouTubePlaylistItem } from './parsers/playlistItem';

import parseYouTubeVideo from './parsers/video';
import parseYouTubeChannel from './parsers/channel';
import parseYouTubePlaylist from './parsers/playlist';
import parseYouTubePlaylistItem from './parsers/playlistItem';


export type YouTubeResourceOptions = {
  apiKey: string;
  idSource: string;
  count?: number; // Optional, only used for playlistItems
};


function videosGetter(opts: YouTubeResourceOptions) {
  return getYouTubeVideosData(opts.apiKey, opts.idSource);
}

function channelsGetter(opts: YouTubeResourceOptions) {
  return getYouTubeChannelsData(opts.apiKey, opts.idSource);
}

function playlistsGetter(opts: YouTubeResourceOptions) {
  return getYouTubePlaylistsData(opts.apiKey, opts.idSource);
}

function playlistItemsGetter(opts: YouTubeResourceOptions) {
  if (opts.count == null) throw new Error('count is required for playlistItems');
  return getYouTubePlaylistItemsData(opts.apiKey, opts.idSource, opts.count);
}


type YouTubeResourceMap = {
  videos: ParsedYouTubeVideo;
  channels: ParsedYouTubeChannel;
  playlists: ParsedYouTubePlaylist;
  playlistItems: ParsedYouTubePlaylistItem;
};


type YouTubeResourceGetter = (opts: YouTubeResourceOptions) => Promise<any[] | undefined>;

const YT_RESOURCE_GETTERS: { [K in keyof YouTubeResourceMap]: YouTubeResourceGetter } = {
  videos: videosGetter,
  channels: channelsGetter,
  playlists: playlistsGetter,
  playlistItems: playlistItemsGetter,
};


type YouTubeResourceParser<K extends keyof YouTubeResourceMap> = (data: any) => YouTubeResourceMap[K];

const YT_RESOURCE_PARSERS: { [K in keyof YouTubeResourceMap]: YouTubeResourceParser<K> } = {
  videos: parseYouTubeVideo,
  channels: parseYouTubeChannel,
  playlists: parseYouTubePlaylist,
  playlistItems: parseYouTubePlaylistItem,
};


export default async function getParsedYouTubeData<K extends keyof YouTubeResourceMap>(
  resource: K,
  opts: YouTubeResourceOptions
): Promise<YouTubeResourceMap[K][] | undefined> {
  const getResources = YT_RESOURCE_GETTERS[resource];
  const parseResource = YT_RESOURCE_PARSERS[resource];
  if (!getResources || !parseResource) return;
  const rawData = await getResources(opts);
  if (!rawData) return;
  return rawData.map((resourceData: any) => parseResource(resourceData));
}

