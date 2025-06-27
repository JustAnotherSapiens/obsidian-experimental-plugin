import { getYouTubeVideos } from './getVideos';
import { getYouTubePlaylists } from './getPlaylists';
import { getYouTubeChannels } from './getChannels';
import { getYouTubePlaylistItems } from './getPlaylistItems';

import {
  parseYouTubeVideo,
  parseYouTubePlaylist,
  parseYouTubeChannel,
  parseYouTubePlaylistItem,
} from './defaultParsers';

import {
  YouTubeAPITarget
} from './types';



type YouTubeAPIBasicTarget = Exclude<YouTubeAPITarget, 'playlistItems'>;



export async function getYouTubeParsedItems(apiKey: string, idSource: string, target: YouTubeAPIBasicTarget) {
  const items = await getYouTubeItems(apiKey, idSource, target);
  if (!items) return;

  const itemParser = getDefaultYouTubeItemParser(target);
  return items.map((item: any) => itemParser(item));
}


function getDefaultYouTubeItemParser(target: YouTubeAPIBasicTarget) {
  switch (target) {
    case 'videos': return parseYouTubeVideo; 
    case 'playlists': return parseYouTubePlaylist;
    case 'channels': return parseYouTubeChannel;
  }
}

// TODO: Pass the API key here
export async function getYouTubeItems(apiKey: string, idSource: string, target: YouTubeAPIBasicTarget) {
  switch (target) {
    case 'videos': return await getYouTubeVideos(apiKey, idSource); 
    case 'playlists': return await getYouTubePlaylists(apiKey, idSource);
    case 'channels': return await getYouTubeChannels(apiKey, idSource);
  }
}








