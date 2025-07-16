import {
  App,
  Editor,
  MarkdownView,
} from 'obsidian';

import BundlePlugin, { BundlePluginComponent } from 'main';

import {
  DEFAULT_SURROUND_PAIRS,
  smartSurround,
} from './func/smartSurround';

import {
  cleanAndNormalizeText,
  removeWikiLinks,
} from './func/clean';

import {
	sortLinesInSelection,
	regexSortLinesInSelection,
} from './func/sort';

import {
  toTitleCase,
  toSentenceCase,
} from './func/caseTransform';


import { replaceSelectionOrCursorLine } from 'utils/obsidian/editor';

import { runQuickPromptModal } from 'modals/promptModal';
import { runQuickSuggest } from 'suggests/quickSuggest';


export default class TextFormatComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: Record<string, unknown>;


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
    };
  }


  onload() {
    this.addCommands();
  }


  onunload(): void {
    // (this.parent.app.workspace as any).iterateCodeMirrors((cm: any) => {
    //   cm.removeKeyMap('smart-strikethrough');
    // });
  }


  addCommands(): void {
    const plugin = this.parent;

		/* TEXT EDITING */

		// Sort Lines in Selection
		plugin.addCommand({
			id: 'sort-lines-in-selection',
			name: 'Sort Lines in Selection',
			icon: 'arrow-down-a-z',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const ascending = await runQuickSuggest(plugin.app,
					[true, false],
					(item: boolean) => item ? 'Yes' : 'No',
					'Ascending? (0-9, A-Z, a-z)'
				);
				if (ascending === null) return;

				sortLinesInSelection(editor, {ascending});
			},
		});

		// Regex Sort Lines in Selection
		plugin.addCommand({
			id: 'regex-sort-lines-in-selection',
			name: 'Regex Sort Lines in Selection',
			icon: 'arrow-down-a-z',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const pattern = await runQuickPromptModal(plugin.app, {
					promptText: 'regex pattern (JS)'
				});
				if (!pattern) return;

				const ascending = await runQuickSuggest(plugin.app,
					[true, false],
					(item: boolean) => item ? 'Yes' : 'No',
					'Ascending? (0-9, A-Z, a-z)'
				);
				if (ascending === null) return;

				regexSortLinesInSelection(editor, {pattern, ascending});
			},
		});

    /* TEXT EDITING */

    // Clean & Normalize
    // WARNING: The `id` here is used in the `.obsidian.vimrc` files.
    plugin.addCommand({
      id: 'clean-normalize-selection',
      name: 'Clean and Normalize selected text',
      icon: 'square-equal',
      editorCallback: (editor: Editor) => {
        replaceSelectionOrCursorLine(editor, cleanAndNormalizeText);
      }
    });

    // Remove Wiki links
    plugin.addCommand({
      id: 'remove-wiki-links-in-selection',
      name: 'Remove WikiLinks in Selection',
      icon: 'link-2-off',
      editorCallback: (editor: Editor) => {
        replaceSelectionOrCursorLine(editor, removeWikiLinks);
      }
    });

    // Title Case
    plugin.addCommand({
      id: 'title-case-in-selection',
      name: 'Title Case in Selection',
      icon: 'case-sensitive',
      editorCallback: (editor: Editor) => {
        replaceSelectionOrCursorLine(editor, toTitleCase);
      }
    });

    // Sentence Case
    plugin.addCommand({
      id: 'sentence-case-in-selection',
      name: 'Sentence Case in Selection',
      icon: 'letter-text',
      editorCallback: (editor: Editor) => {
        replaceSelectionOrCursorLine(editor, toSentenceCase);
      }
    });


    /* MARKDOWN FORMATTING */

    DEFAULT_SURROUND_PAIRS.forEach(pair => {
      plugin.addCommand({
        id: `smart-${pair.name!.toLowerCase().replace(' ', '-')}`,
        name: `Smart ${pair.name!}`,
        icon: pair.icon,
        editorCallback: (editor) => smartSurround(editor, pair),
      });
    });

  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
  }

}

