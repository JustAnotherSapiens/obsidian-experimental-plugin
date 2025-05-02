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



export default class TemplateComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: Record<string, unknown>;


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      textSetting: '',
      toggleSetting: false,
      dropdownSetting: 'dropdownValue1',
      sliderSetting: 0.5,
    };
  }


  onload(): void {
    this.addCommands();
  }


  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;

    // Sample Command
    plugin.addCommand({
      id: 'cmd',
      name: 'Command',
      icon: 'command',
      callback: () => {
        new Notice('Sample Command callback executed!');
      },
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        new Notice('Sample Command editor callback executed!');
      }
    });

  }


  addRibbonIcons(): void {}
  addStatusBarItems(): void {}
  addEventsAndIntervals(): void {}


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

    containerEl.createEl('h3', {text: 'Template Settings'});


		// Text Setting
		new Setting(containerEl)
			.setName('Text Setting')
			.setDesc('Setting of a TextComponent')
			.addText((textField: TextComponent) => {
				textField.setPlaceholder('TextComponent placeholder example');
        // 'textSetting' MUST be defined in the component's constructor
				textField.setValue(plugin.settings.textSetting);
				textField.onChange(async (value: string) => {
					plugin.settings.textSetting = value;
					await plugin.saveSettings();
				});
			});


		// Toggle Setting
		new Setting(containerEl)
			.setName('Toggle Setting')
			.setDesc('Setting of a ToggleComponent')
			.addToggle((toggle: ToggleComponent) => {
				toggle.setTooltip('ToggleComponent tooltip example');
        // 'toggleSetting' MUST be defined in the component's constructor
				toggle.setValue(plugin.settings.toggleSetting);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.toggleSetting = value;
					await plugin.saveSettings();
				});
			});


		// Dropdown Setting
		new Setting(containerEl)
			.setName('Dropdown Setting')
			.setDesc('Setting of a DropdownComponent')
			.addDropdown((dropdown: DropdownComponent) => {
        dropdown.addOption('dropdownValue1', 'dropdownValueDisplay1');
        dropdown.addOption('dropdownValue2', 'dropdownValueDisplay2');

        // 'dropdownSetting' MUST be defined in the component's constructor
				// WARNING: Never call setValue before adding all dropdown options
				dropdown.setValue(plugin.settings.dropdownSetting);

        // ALWAYS add validation logic before setting 'dropdownSetting' globally
				dropdown.onChange(async (value: string) => {
					plugin.settings.dropdownSetting = value;
					await plugin.saveSettings();
				});
			});


    // Slider Setting
    new Setting(containerEl)
			.setName('Slider Setting')
			.setDesc('Setting of a SliderComponent')
      .addSlider((slider: SliderComponent) => {
        slider.setLimits(0, 1, 0.01); // Fuzzy logic value example
        slider.setDynamicTooltip();
        // 'sliderSetting' MUST be defined in the component's constructor
        slider.setValue(plugin.settings.sliderSetting);
        slider.onChange(async (value: number) => {
          plugin.settings.sliderSetting = value;
          await plugin.saveSettings();
        });
      });



    // Button Setting
    new Setting(containerEl)
			.setName('Button Setting')
			.setDesc('Setting of a ButtonComponent')
      .addButton((button: ButtonComponent) => {
        button.setButtonText('Button0');
        // button.onClick(myCustomFunction.bind(this));
      })
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText('Button1')
          .onClick(() => {});
      });


  }

}

