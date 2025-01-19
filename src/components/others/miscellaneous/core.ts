import BundlePlugin, { BundlePluginComponent } from 'main';

import {
	Editor,
} from 'obsidian';

import  moveCurrentTab  from './func/moveCurrentTab';
import toggleVimEnvironment from './func/toggleVimEnvironment';
import togglePluginSuggest from './func/togglePluginSuggest';



export default class MiscellaneousComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: {
  };


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

		/* TOGGLE CONFIG OPTIONS */

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

		// Toggle Plugin Suggest
		plugin.addCommand({
			id: 'toggle-plugin-suggest',
			name: 'Toggle Plugin Suggest',
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

