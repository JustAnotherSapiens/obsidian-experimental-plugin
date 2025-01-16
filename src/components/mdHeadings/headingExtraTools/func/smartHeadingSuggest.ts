import {
  App,
  MarkdownView,
  Editor,
  moment,
} from "obsidian";

import {
  MarkdownLevel,
} from "components/mdHeadings/headingExtractor/utils/dataStructures";

import { runQuickSuggest } from "suggests/quickSuggest";

import insertSmartHeading from "./insertSmartHeading";




export async function insertSmartHeadingSuggest(app: App, view: MarkdownView, skewUpwards: boolean): Promise<void> {
    const smartHeadingLevel = await runQuickSuggest(app,
      [1, 2, 3, 4, 5, 6] as MarkdownLevel[], // Items
      (level: MarkdownLevel) => `Heading ${level} ${'#'.repeat(level)}`, // Item to Text
      'Select level of Smart Heading to insert' // Placeholder
    );

    if (!smartHeadingLevel) return;

    insertSmartHeading(view, {
      level: smartHeadingLevel,
      ignoreSelection: false,
      skewUpwards,
      vimMode: (app as any).vault.getConfig('vimMode'),
    });
}



export async function insertTimestampedSmartHeadingSuggest(app: App, view: MarkdownView, skewUpwards: boolean): Promise<void> {
    const smartHeadingLevel = await runQuickSuggest(app,
      [1, 2, 3, 4, 5, 6] as MarkdownLevel[], // Items
      (level: MarkdownLevel) => `Heading ${level} ${'#'.repeat(level)}`, // Item to Text
      'Select level of Timestamped Smart Heading to insert' // Placeholder
    );

    if (!smartHeadingLevel) return;

    insertSmartHeading(view, {
      level: smartHeadingLevel,
      title: moment().format('YYYY-MM-DD[T]HH:mm:ss'),
      contents: '\n',
      ignoreSelection: false,
      skewUpwards,
      vimMode: (app as any).vault.getConfig('vimMode'),
    });
}

