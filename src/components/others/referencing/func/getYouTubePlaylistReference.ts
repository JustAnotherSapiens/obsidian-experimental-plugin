import { App, moment } from 'obsidian';
import { runQuickSuggest } from 'suggests/quickSuggest';
import { getYouTubeParsedItems } from '../youtubeAPI/getYouTubeItems';
import { getSetting } from 'utils/obsidian/settings';



// https://style.mla.org/citing-a-playlist/#:~:text=Cite%20a%20playlist%20by%20following%20the%20MLA%20template,or%20YouTube%2C%20in%20the%20Title%20of%20Container%20element.



const playlistReferenceParsers: Record<string, CallableFunction> = {
  MLA: playlistMlaReference,
  mdLinked: playlistMdLinkedReference,
  mdLinkedSort: playlistMdLinkedSortReference,
  cleanSort: playlistCleanSortReference,
  thumbnail: playlistThumbnailReference,
};



export default async function getYouTubePlaylistReference(app: App, apiKey: string, idSource: string): Promise<string[] | undefined> {

  const parsedPlaylists = await getYouTubeParsedItems(apiKey, idSource, 'playlists');
  if (!parsedPlaylists) return;
  const samplePlaylist = parsedPlaylists[0];

  // Prompt for a reference style
  const referenceSelection = await runQuickSuggest(app,
    Object.keys(playlistReferenceParsers),
    (key: string) => `${key}:\n${playlistReferenceParsers[key](samplePlaylist)}`,
    'Select PLAYLIST reference style...'
  );
  if (!referenceSelection) return;

  return parsedPlaylists.map(
    (playlist: any) => playlistReferenceParsers[referenceSelection](playlist)
  );
}



function playlistMlaReference(playlist: any) {
  const date = moment(playlist.publishedAt).format('D MMM. YYYY');
  const channel = playlist.channel.title;
  let title = playlist.title;
  if (!title.match(/(?:[.!?])$/)) title += '.';
  return `"${title}" _YouTube_, created by ${channel}, ${date}, ${playlist.url}.`;
}


function playlistMdLinkedReference(playlist: any) {
  return `[${playlist.title}](${playlist.url}) created by [${playlist.channel.title}](${playlist.channel.url})`;
}


function playlistMdLinkedSortReference(playlist: any) {
  const date = moment(playlist.publishedAt).format('YYYY-MM-DD');
  const channel = playlist.channel.title;
  const channelUrl = playlist.channel.url;
  const title = playlist.title.trim().replace(/([[\]()])/g, '\\$1');
  return `${date} [${channel}](${channelUrl}): [${title}](${playlist.url}) (${playlist.videoCount} videos)`;
}


function playlistCleanSortReference(playlist: any) {
  const date = moment(playlist.publishedAt).format('YYYY-MM-DD');
  const channel = playlist.channel.title;
  const title = playlist.title.trim();
  return `${date} ${channel}: _${title}_ (${playlist.videoCount} videos). ${playlist.url}`;
}


function playlistThumbnailReference(playlist: any) {
  return `![](${playlist.thumbnail})`
}
