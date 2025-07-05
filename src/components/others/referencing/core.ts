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

import { getSetting } from 'utils/obsidian/settings';

import getYouTubeVideoReference from './youtubeReference/videoRef';
import getYouTubeChannelReference from './youtubeReference/channelRef';
import getYouTubePlaylistReference from './youtubeReference/playlistRef';
import getYouTubePlaylistItemsReference from './youtubeReference/playlistItemRef';



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
    const getImplicitTextSource = async (editor: Editor): Promise<string> => {
      if (editor.somethingSelected())
        return editor.getSelection();
      else return await navigator.clipboard.readText();
    };

    // Append text to the current cursor line
    const appendToCursorLine = (editor: Editor, text: string) => {
      const cursorLine = editor.getCursor('to').line;
      editor.setLine(cursorLine, editor.getLine(cursorLine) + text);
    };

    const getIndentSpaceAtCursor = (editor: Editor): string => {
      const cursorLine = editor.getCursor('head').line;
      const lineText = editor.getLine(cursorLine);
      const match = lineText.match(/^\s*/);
      if (!match) return '';
      else return match[0];
    };


    // YouTube Video Reference
    plugin.addCommand({
      id: 'reference-youtube-video',
      name: 'Reference YouTube Video',
      icon: 'youtube',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const apiKey = getSetting(plugin.app, 'googleApiKey');
        const idSource = await getImplicitTextSource(editor);
        const references = await getYouTubeVideoReference(plugin.app, { apiKey, idSource });
        if (!references) return;
        appendToCursorLine(editor, references.join('\n'));
      }
    });

    // YouTube Channel Reference
    plugin.addCommand({
      id: 'reference-youtube-channel',
      name: 'Reference YouTube Channel',
      icon: 'tv-minimal-play',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const apiKey = getSetting(plugin.app, 'googleApiKey');
        const idSource = await getImplicitTextSource(editor);
        const references = await getYouTubeChannelReference(plugin.app, { apiKey, idSource });
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
        const apiKey = getSetting(plugin.app, 'googleApiKey');
        const idSource = await getImplicitTextSource(editor);
        const references = await getYouTubePlaylistReference(plugin.app, { apiKey, idSource });
        if (!references) return;
        appendToCursorLine(editor, references.join('\n'));
      }
    });

    // YouTube Playlist Items Reference
    plugin.addCommand({
      id: 'reference-youtube-playlist-items',
      name: 'Reference YouTube Playlist Items',
      icon: 'list-video',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const apiKey = getSetting(plugin.app, 'googleApiKey')
        const idSource = await getImplicitTextSource(editor);
        const references = await getYouTubePlaylistItemsReference(plugin.app, { apiKey, idSource });
        if (!references) return;
        const indentSpace = getIndentSpaceAtCursor(editor);
        const indentedRefs = references.map(ref => indentSpace + ref);
        appendToCursorLine(editor, '\n' + indentedRefs.join('\n'));
      }
    });

    // TODO: Get Unlisted and Private items references

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

