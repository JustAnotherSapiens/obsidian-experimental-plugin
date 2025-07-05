import { App, Notice, moment } from 'obsidian';
import { runQuickSuggest } from 'suggests/quickSuggest';
import { runQuickPromptModal } from 'modals/promptModal'; 

import type { YouTubeResourceOptions } from '../youtubeDataAPI/parsedData';
import getParsedYouTubeData from '../youtubeDataAPI/parsedData';

import type { ParsedYouTubePlaylistItem } from '../youtubeDataAPI/parsers/playlistItem';

import getYouTubePlaylistIDs from '../youtubeHelpers/playlistIDs';



type ReferenceStyleKey =
  'TitleLink' |
  'FullTitleLink' |
  'Hyphen' |
  'LinkedHyphen' |
  'By' |
  'LinkedBy';
  

type PlaylistItemReferenceParser = (playlistItem: ParsedYouTubePlaylistItem) => string;

interface ItemReferenceStyle {
  key: ReferenceStyleKey;
  label: string;
  parser: PlaylistItemReferenceParser;
  description?: string;
  allowDurationAppend?: boolean;
}

export const ITEM_REFERENCE_STYLES: ItemReferenceStyle[] = [

  {
    key: 'TitleLink',
    label: 'Sortable by: publication date',
    parser: itemTitleLinkReference,
    description: '1971-01-01 _[Title](url)_',
  },

  {
    key: 'FullTitleLink',
    label: 'Sortable by: publication date, channel',
    parser: itemFullTitleLinkReference,
    description: '1971-01-01 Channel: _[Title](url)_',
  },

  {
    key: 'Hyphen',
    label: 'Song - Artist format',
    parser: itemHyphenReference,
    description: 'Title - Channel',
  },

  {
    key: 'LinkedHyphen',
    label: 'Song - Artist format',
    parser: itemLinkedHyphenReference,
    description: '_[Title](url)_ - Channel',
  },

  {
    key: 'LinkedBy',
    label: 'Linked Statement',
    parser: itemLinkedByReference,
    description: '_[Title](url)_ by Channel',
  },

  {
    key: 'By',
    label: 'Item Statement',
    parser: itemByReference,
    description: '_Title_ by Channel <short_url>',
  },

  // {
  //   key: '',
  //   label: '',
  //   parser: ,
  //   description: '',
  // },

  // ... more styles
];

// --- Style selection utility ---
function getStyleByKey(key: ReferenceStyleKey): ItemReferenceStyle | undefined {
  return ITEM_REFERENCE_STYLES.find(style => style.key === key);
}





async function getItemCount(app: App): Promise<number | undefined> {
  const defaultItemCount = 50;
  const userCountInput = await runQuickPromptModal(app, {
    promptText: `video count? (default: ${defaultItemCount})`
  });
  if (userCountInput === undefined) return;

  let itemCount = defaultItemCount;
  if (userCountInput.trim() !== '') {
    const parsedCountInput = Number(userCountInput);
    if (!Number.isNaN(parsedCountInput) && parsedCountInput >= 0) {
      itemCount = parsedCountInput;
    }
  }
  return itemCount;
}



// TODO: Option to get only 'hidden items' (unlisted, private)
export default async function getYouTubePlaylistItemsReference(
  app: App, opts: YouTubeResourceOptions
): Promise<string[] | undefined> {

  if (!opts.count) opts.count = await getItemCount(app);
  if (!opts.count) return;

  const playlistId = getYouTubePlaylistIDs(opts.idSource);
  if (!playlistId) {
    const msg = 'No YouTube playlist ID found';
    new Notice(msg, 3000);
    console.debug(`${msg} in:\n${opts.idSource}`);
    return;
  }

  // Take ONLY the first playlist ID found.
  opts.idSource = playlistId[0];

  const parsedItems = await getParsedYouTubeData('playlistItems', opts);
  if (!parsedItems) return;

  const referenceSelection = await runQuickSuggest(
    app,
    ITEM_REFERENCE_STYLES.map(s => s.key),
    key => {
      const style = getStyleByKey(key as ReferenceStyleKey)!;
      return `${style.description}\n${style.parser(parsedItems[0])}`;
    },
    'Select PLAYLIST ITEM reference style...'
  );
  if (!referenceSelection) return;

  const style = getStyleByKey(referenceSelection as ReferenceStyleKey)!;

  // <reference>
  // <reference> (unlisted)
  // <video_url> (private)
  const itemParser: PlaylistItemReferenceParser = (item) => {
    if (!item.resource.isVideo) return item.resource.kind;
    if (item.privacyStatus === 'private') {
      return `${item.details!.videoUrl} (private)`;
    }
    let itemRef = style.parser(item);
    if (item.privacyStatus === 'unlisted') itemRef += ' (unlisted)';
    return itemRef;
  };

  return parsedItems.map(itemParser);

}



/* REFERENCE STYLES */



/* SORT OPTIMIZED */
// No duration available for PlaylistItems

// 1971-01-01 _[Title](url)_
function itemTitleLinkReference(item: ParsedYouTubePlaylistItem): string {
  const date = moment(item.details!.videoPublishedAt).format('YYYY-MM-DD');
  const title = item.title.trim().replace(/\[([^\]]*)\]/g, '($1)');
  const url = item.details!.videoShortUrl;
  return `${date} _[${title}](${url})_`;
}


// 1971-01-01 Channel: _[Title](video_url)_
function itemFullTitleLinkReference(item: ParsedYouTubePlaylistItem): string {
  const date = moment(item.details!.videoPublishedAt).format('YYYY-MM-DD');
  const channel = item.ownerChannel.title.trim();
  const title = item.title.trim().replace(/\[([^\]]*)\]/g, '($1)');
  const url = item.details!.videoShortUrl;
  return `${date} ${channel}: _[${title}](${url})_`;
}

// 1971-01-01 _Title_ https://www.example.com
function itemTitleReference(item: ParsedYouTubePlaylistItem): string {
  const date = moment(item.details!.videoPublishedAt).format('YYYY-MM-DD');
  const title = item.title.trim();
  const url = item.details!.videoShortUrl;
  return `${date} _${title}_ ${url}`;
}


// 1971-01-01 Channel: _Title_ https://www.example.com
function itemFullTitleReference(item: ParsedYouTubePlaylistItem): string {
  const date = moment(item.details!.videoPublishedAt).format('YYYY-MM-DD');
  const channel = item.ownerChannel.title.trim();
  const title = item.title.trim();
  return `${date} ${channel}: _${title}_ ${item.details!.videoShortUrl}`;
}



/* HYPHEN REFERENCE (FOR SONGS) */

// Title - Channel
function itemHyphenReference(item: ParsedYouTubePlaylistItem): string {
  const title = item.title.trim();
  const channel = item.ownerChannel.title.trim().replace(/ - Topic$/, '');
  return `${title} - ${channel}`;
}

// _[Title](video_url)_ - Channel
function itemLinkedHyphenReference(item: ParsedYouTubePlaylistItem): string {
  const title = item.title.trim().replace(/\[([^\]]*)\]/g, '($1)');
  const url = item.details!.videoUrl;
  const channel = item.ownerChannel.title.trim().replace(/ - Topic$/, '');
  return `_[${title}](${url})_ - ${channel}`;
}


/* BY REFERENCE */

// _[Title](video_url)_ by Channel
function itemLinkedByReference(item: ParsedYouTubePlaylistItem): string {
  const title = item.title.trim();
  const url = item.details!.videoUrl;
  const channel = item.ownerChannel.title.trim();
  return `_[${title}](${url})_ by ${channel}`;
}

// _Title_ by Channel https://youtu.be/video_id
function itemByReference(item: ParsedYouTubePlaylistItem): string {
  const title = item.title.trim();
  const url = item.details!.videoShortUrl;
  const channel = item.ownerChannel.title.trim();
  return `_${title}_ by ${channel} ${url}`;
}


