import BundlePlugin, { BundlePluginComponent } from 'main';

import {
  Setting,
  TextComponent,
  ToggleComponent,
  DropdownComponent,
  ButtonComponent,
  SliderComponent,
  App,
  Notice,
  MarkdownView,
  Editor,
} from 'obsidian';

import { getYouTubeParsedItems } from './youtubeAPI/getYouTubeItems';
import getYouTubeVideoReference from './func/getYouTubeVideoReference';
import getYouTubePlaylistReference from './func/getYouTubePlaylistReference';
import getYouTubePlaylistItemsReference from './func/getYouTubePlaylistItemsReference';



export default class ReferencingComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: {
    googleApiKey: string;
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      googleApiKey: '',

      // textSetting: '',
      // toggleSetting: false,
      // dropdownSetting: 'dropdownValue1',
      // sliderSetting: 0.5,
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

    const appendToCursor = (editor: Editor, text: string) => {
      const cursorLine = editor.getCursor('to').line;
      editor.setLine(cursorLine, editor.getLine(cursorLine) + '\n' + text);
    };

    const prependToCursor = (editor: Editor, text: string) => {
      const cursorLine = editor.getCursor('from').line;
      editor.setLine(cursorLine, text + '\n' + editor.getLine(cursorLine));
    };


    // YouTube Video Reference
    plugin.addCommand({
      id: 'reference-youtube-video',
      name: 'Reference YouTube Video',
      icon: 'youtube',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const text = await getImplicitTextSource(editor);
        const references = await getYouTubeVideoReference(plugin.app, text);
        if (!references) return;
        appendToCursor(editor, references.join('\n'));
      }
    });

    // YouTube Playlist Reference
    plugin.addCommand({
      id: 'reference-youtube-playlist',
      name: 'Reference YouTube Playlist',
      icon: 'list-video',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const text = await getImplicitTextSource(editor);
        const references = await getYouTubePlaylistReference(plugin.app, text);
        if (!references) return;
        appendToCursor(editor, references.join('\n'));
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
        const playlists = await getYouTubeParsedItems(text, 'playlists');
        if (!playlists) return;

        let references: any[] = [];
        for (const playlist of playlists) {
          const playlistItemsRefs = await getYouTubePlaylistItemsReference(plugin.app, playlist.id);
          if (!playlistItemsRefs) continue;
          references = references.concat(playlistItemsRefs);
        }
        if (references.length === 0) return;

        appendToCursor(editor, references.join('\n'));
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



		// // Text Setting
		// new Setting(containerEl)
		// 	.setName('Text Setting')
		// 	.setDesc('Setting of a TextComponent')
		// 	.addText((textField: TextComponent) => {
		// 		textField.setPlaceholder('TextComponent placeholder example');
    //     // 'textSetting' MUST be defined in the component's constructor
		// 		textField.setValue(plugin.settings.textSetting);
		// 		textField.onChange(async (value: string) => {
		// 			plugin.settings.textSetting = value;
		// 			await plugin.saveSettings();
		// 		});
		// 	});


		// // Toggle Setting
		// new Setting(containerEl)
		// 	.setName('Toggle Setting')
		// 	.setDesc('Setting of a ToggleComponent')
		// 	.addToggle((toggle: ToggleComponent) => {
		// 		toggle.setTooltip('ToggleComponent tooltip example');
    //     // 'toggleSetting' MUST be defined in the component's constructor
		// 		toggle.setValue(plugin.settings.toggleSetting);
		// 		toggle.onChange(async (value: boolean) => {
		// 			plugin.settings.toggleSetting = value;
		// 			await plugin.saveSettings();
		// 		});
		// 	});


		// // Dropdown Setting
		// new Setting(containerEl)
		// 	.setName('Dropdown Setting')
		// 	.setDesc('Setting of a DropdownComponent')
		// 	.addDropdown((dropdown: DropdownComponent) => {
    //     dropdown.addOption('dropdownValue1', 'dropdownValueDisplay1');
    //     dropdown.addOption('dropdownValue2', 'dropdownValueDisplay2');

    //     // 'dropdownSetting' MUST be defined in the component's constructor
		// 		// WARNING: Never call setValue before adding all dropdown options
		// 		dropdown.setValue(plugin.settings.dropdownSetting);

    //     // ALWAYS add validation logic before setting 'dropdownSetting' globally
		// 		dropdown.onChange(async (value: string) => {
		// 			plugin.settings.dropdownSetting = value;
		// 			await plugin.saveSettings();
		// 		});
		// 	});


    // // Slider Setting
    // new Setting(containerEl)
		// 	.setName('Slider Setting')
		// 	.setDesc('Setting of a SliderComponent')
    //   .addSlider((slider: SliderComponent) => {
    //     slider.setLimits(0, 1, 0.01); // Fuzzy logic value example
    //     slider.setDynamicTooltip();
    //     // 'sliderSetting' MUST be defined in the component's constructor
    //     slider.setValue(plugin.settings.sliderSetting);
    //     slider.onChange(async (value: number) => {
    //       plugin.settings.sliderSetting = value;
    //       await plugin.saveSettings();
    //     });
    //   });



    // Button Setting
    // new Setting(containerEl)
		// 	.setName('Button Setting')
		// 	.setDesc('Setting of a ButtonComponent')
    //   .addButton((button: ButtonComponent) => {
    //     button.setButtonText('Button0');
    //     // button.onClick(myCustomFunction.bind(this));
    //   })
    //   .addButton((button: ButtonComponent) => {
    //     button
    //       .setButtonText('Button1')
    //       .onClick(() => {});
    //   });



  }

}

