import BundlePlugin, { BundlePluginComponent } from 'main';

import {
  Setting,
  TextComponent,
  ToggleComponent,
  App,
  Notice,
  MarkdownView,
  Editor,
} from 'obsidian';

import { getYouTubeParsedItems } from './youtubeAPI/getYouTubeItems';
import getYouTubeVideoReference from './func/getYouTubeVideoReference';
import getYouTubePlaylistReference from './func/getYouTubePlaylistReference';
import getYouTubePlaylistItemsReference from './func/getYouTubePlaylistItemsReference';

import { getSetting } from 'utils/obsidian/settings';



export default class ReferencingComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: {
    googleApiKey: string;
    appendDurationToApaMla: boolean;
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      googleApiKey: '',
      appendDurationToApaMla: false,
    };
  }


  onload(): void {
    this.addCommands();
  }


  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;


    // Implicit text source => selection or clipboard
    const getImplicitTextSource = async (editor: Editor) => {
      if (editor.somethingSelected())
        return editor.getSelection();
      else return await navigator.clipboard.readText();
    };

    // Append text to the current cursor line
    const appendToCursorLine = (editor: Editor, text: string) => {
      const cursorLine = editor.getCursor('to').line;
      editor.setLine(cursorLine, editor.getLine(cursorLine) + text);
    };


    // YouTube Video Reference
    plugin.addCommand({
      id: 'reference-youtube-video',
      name: 'Reference YouTube Video',
      icon: 'youtube',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const text = await getImplicitTextSource(editor);
        const apiKey = getSetting(plugin.app, 'googleApiKey')
        const references = await getYouTubeVideoReference(plugin.app, apiKey, text);
        if (!references) return;
        appendToCursorLine(editor, references.join('\n'));
      }
    });

    // YouTube Playlist Reference
    plugin.addCommand({
      id: 'reference-youtube-playlist',
      name: 'Reference YouTube Playlist',
      icon: 'list-video',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const text = await getImplicitTextSource(editor);
        const apiKey = getSetting(plugin.app, 'googleApiKey')
        const references = await getYouTubePlaylistReference(plugin.app, apiKey, text);
        if (!references) return;
        appendToCursorLine(editor, references.join('\n'));
      }
    });

    // TODO: It is more convenient to do this together with the playlist reference itself
    // YouTube Playlist Items Reference
    plugin.addCommand({
      id: 'reference-youtube-playlist-items',
      name: 'Reference YouTube Playlist Items',
      icon: 'list-video',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const text = await getImplicitTextSource(editor);
        const apiKey = getSetting(plugin.app, 'googleApiKey')

        const playlists = await getYouTubeParsedItems(apiKey, text, 'playlists');
        if (!playlists) return;

        let references: any[] = [];
        for (const playlist of playlists) {
          const playlistItemsRefs = await getYouTubePlaylistItemsReference(plugin.app, apiKey, playlist.id);
          if (!playlistItemsRefs) continue;
          references = references.concat(playlistItemsRefs);
        }
        if (references.length === 0) return;

        appendToCursorLine(editor, references.join('\n'));
      }
    });

    // Toggle append duration to APA/MLA references
    plugin.addCommand({
      id: 'toggle-append-duration-to-apa-mla',
      name: 'Toggle Append Duration to APA/MLA References',
      icon: 'clock',
      callback: async () => {
        plugin.settings.appendDurationToApaMla = !plugin.settings.appendDurationToApaMla;
        await plugin.saveSettings();
        new Notice(`Append duration to APA/MLA references ${plugin.settings.appendDurationToApaMla ? 'ENABLED' : 'DISABLED'}.`);
      }
    });

  }


  addRibbonIcons(): void {}
  addStatusBarItems(): void {}
  addEventsAndIntervals(): void {}


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

    containerEl.createEl('h3', {text: 'Referencing'});

		// Google API Key
		new Setting(containerEl)
			.setName('Google API key')
			.setDesc('Necessary to access data from Google services like YouTube, Google Books, etc.')
			.addText((textField: TextComponent) => {
				textField.setPlaceholder('API key');
				textField.setValue(plugin.settings.googleApiKey);
				textField.onChange(async (value: string) => {
					plugin.settings.googleApiKey = value;
					await plugin.saveSettings();
				});
			});

    // Append duration to APA/MLA references
    new Setting(containerEl)
      .setName('Append duration to APA/MLA references')
      .setDesc('If enabled, the duration of YouTube videos will be appended to APA and MLA references.')
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(plugin.settings.appendDurationToApaMla);
        toggle.onChange(async (value: boolean) => {
          plugin.settings.appendDurationToApaMla = value;
          await plugin.saveSettings();
        });
      });


  }

}

