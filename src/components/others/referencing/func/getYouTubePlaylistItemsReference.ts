import { App, moment } from 'obsidian';

import { runQuickSuggest } from 'suggests/quickSuggest';
import { runQuickPromptModal } from 'modals/promptModal'; 

import {
  getYouTubePlaylistItems,
  getYouTubeParsedPlaylistItems,
} from '../youtubeAPI/getPlaylistItems';
import { parseYouTubePlaylistItem } from '../youtubeAPI/defaultParsers';
import { VIDEO_REFERENCE_PARSERS } from './getYouTubeVideoReference';



export default async function getYouTubePlaylistItemsReference(app: App, playlistId: string): Promise<string[] | undefined> {

  const defaultItemCount = 30;
  const userCountInput = await runQuickPromptModal(app, {promptText: `video count? (default: ${defaultItemCount})`});
  if (userCountInput === undefined) return;

  let itemCount = defaultItemCount;
  if (userCountInput.trim() !== '') {
    const parsedCountInput = Number(userCountInput);
    if (!Number.isNaN(parsedCountInput) && parsedCountInput >= 0) {
      itemCount = parsedCountInput;
    }
  }

  const parsedItems = await getYouTubeParsedPlaylistItems(playlistId, itemCount);
  if (!parsedItems) return;
  const sampleItem = parsedItems[0];

  console.debug('parsed playlistItems:', parsedItems);

  // Prompt for a reference style
  const referenceSelection = await runQuickSuggest(app,
    Object.keys(VIDEO_REFERENCE_PARSERS),
    (key: string) => `${key}:\n${VIDEO_REFERENCE_PARSERS[key](sampleItem)}`,
    'Select ITEM reference style...'
  );
  if (!referenceSelection) return;

  return parsedItems.map(
    (video: any) => VIDEO_REFERENCE_PARSERS[referenceSelection](video)
  );
}
