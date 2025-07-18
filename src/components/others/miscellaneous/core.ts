import BundlePlugin, { BundlePluginComponent } from 'main';

import {
	Platform,
	Editor,
	MarkdownView,
	moment,
} from 'obsidian';

import moveCurrentTab from './func/moveCurrentTab';
import toggleVimEnvironment from './func/toggleVimEnvironment';
import togglePluginSuggest from './func/togglePluginSuggest';
import openFileInGvim from './func/openFileInGvim';
import openObsidianVimrcFile from './func/openVimrc';
import insertTextAtCursor from './func/textInsertions';
import {
	customExplorerDirectorySuggest,
	customVSCodeProjectSuggest,
} from './func/customDataSuggests';
import { getLinkToNewUniqueFile } from './func/uniqueFileCreation';




export default class MiscellaneousComponent implements BundlePluginComponent {

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


  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;

		/* TEXT INSERTIONS */

		// Insert New Unique File Link (.md)
		plugin.addCommand({
			id: 'insert-new-markdown-file-link',
			name: 'Insert New File Link (Markdown)',
			icon: 'file-plus',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!view.file) return;
				const fileLink = await getLinkToNewUniqueFile(this.parent.app, {
					sourcePath: view.file.path,
					extension: '.md'
				});
				insertTextAtCursor(editor, fileLink);
			},
		});

		// Insert New Unique File Link (.canvas)
		plugin.addCommand({
			id: 'insert-new-canvas-file-link',
			name: 'Insert New File Link (Canvas)',
			icon: 'map-plus',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!view.file) return;
				const fileLink = await getLinkToNewUniqueFile(this.parent.app, {
					sourcePath: view.file.path,
					extension: '.canvas'
				});
				insertTextAtCursor(editor, fileLink);
			},
		});

		// Insert ISO 8601 Timestamp
		plugin.addCommand({
			id: 'insert-iso-timestamp',
			name: 'Insert ISO 8601 Timestamp',
			icon: 'watch',
			editorCallback: (editor: Editor) => {
				insertTextAtCursor(editor, moment().format('YYYY-MM-DD[T]HH:mm:ss'));
			},
		});

		// Insert ISO 8601 Timestamp (Short)
		plugin.addCommand({
			id: 'insert-iso-timestamp-short',
			name: 'Insert ISO 8601 Timestamp Short',
			icon: 'watch',
			editorCallback: (editor: Editor) => {
				insertTextAtCursor(editor, moment().format('YYYYMMDD[T]HHmmss'));
			},
		});

		/* INTERACTION WITH THIRD-PARTY APPS */

		// Commands that rely on the Node.js API won't work on mobile devices.
		if (!Platform.isMobile) {

			// Custom VS Code Project Suggest
			plugin.addCommand({
				id: 'custom-vs-code-project-suggest',
				name: 'Custom VS Code Project Suggest',
				icon: 'folder-code',
				callback: async () => await customVSCodeProjectSuggest(plugin.app),
			});

			// Custom Explorer Directory Suggest
			plugin.addCommand({
				id: 'custom-explorer-directory-suggest',
				name: 'Custom Explorer Directory Suggest',
				icon: 'folder-output',
				callback: async () => await customExplorerDirectorySuggest(plugin.app),
			});

			// Open Active File in GVim
			plugin.addCommand({
				id: 'open-active-file-in-gvim',
				name: 'Open Active File in GVim',
				icon: 'file-output',
				editorCallback: (editor: Editor, view: MarkdownView) => {
					openFileInGvim(plugin.app, view.file!, editor.getCursor('head'));
				},
			});

			// Open Obsidian Vimrc file in GVim
			plugin.addCommand({
				id: 'open-obsidian-vimrc-file-in-gvim',
				name: 'Open Obsidian Vimrc File in GVim',
				icon: 'file-output',
				callback: async () => await openObsidianVimrcFile(plugin.app),
			});

		}

		/* TOGGLE CONFIG OPTIONS */

		// Toggle Readable Line Length
		plugin.addCommand({
			id: 'toggle-readable-line-length',
			name: 'Toggle readable line length',
			icon: 'glasses',
      editorCallback: (editor: Editor) => {
        const vault = plugin.app.vault as any;
        // Already accounts for the case where the config was never set
        vault.setConfig('readableLineLength', !vault.getConfig('readableLineLength'));
        editor.refresh();
      },
		});

		// Toggle Line Numbers
		plugin.addCommand({
			id: 'toggle-line-numbers',
			name: 'Toggle line numbers',
			icon: 'list-ordered',
      editorCallback: (editor: Editor) => {
        const vault = plugin.app.vault as any;
        // Already accounts for the case where the config was never set
        vault.setConfig('showLineNumber', !vault.getConfig('showLineNumber'));
        editor.refresh();
      },
		});

		// Toggle Plugin (Suggest)
		plugin.addCommand({
			id: 'toggle-plugin-suggest',
			name: 'Toggle Plugin (Suggest)',
			icon: 'code',
			callback: async () => await togglePluginSuggest(plugin.app),
		});

		// Toggle Vim Mode (and Vim-related plugins)
		plugin.addCommand({
			id: 'toggle-vim-mode',
			name: 'Toggle Vim mode',
			icon: 'code',
			callback: async () => await toggleVimEnvironment(plugin.app),
		});

		/* MOVE CURRENT TAB */

		// Move current tab right
		plugin.addCommand({
			id: 'move-current-tab-right',
			name: 'Move current tab right',
			icon: 'chevrons-right',
			callback: () => moveCurrentTab(plugin.app, {forwards: true}),
		});

		// Move current tab left
		plugin.addCommand({
			id: 'move-current-tab-left',
			name: 'Move current tab left',
			icon: 'chevrons-left',
			callback: () => moveCurrentTab(plugin.app, {forwards: false}),
		});

  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
  }

}

