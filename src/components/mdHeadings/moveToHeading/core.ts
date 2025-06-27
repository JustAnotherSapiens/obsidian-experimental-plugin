import BundlePlugin, { BundlePluginComponent } from 'main';

import {
  Setting,
  ToggleComponent,
  DropdownComponent,
  ButtonComponent,
  TextComponent,
  SliderComponent,
  Notice,
  MarkdownView,
  Editor,
} from 'obsidian';

import moveCursorToHeading from './utils/moveCursor';

import { getSetting } from 'utils/obsidian/settings';



type SiblingMode = 'strictSibling' | 'looseSibling';



export default class MoveToHeadingComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: {
    siblingMode: SiblingMode,

    moveToHeading_scrollTriggerBounds: [number, number],

    globalWrapAround: boolean,
    contiguousWrapAround: boolean,
    looseSiblingWrapAround: boolean,
    strictSiblingWrapAround: boolean,
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      // levelZeroBehavior: 'snap-contiguous',
      siblingMode: 'looseSibling',

      moveToHeading_scrollTriggerBounds: [0.0, 0.7],

      globalWrapAround: false,
      contiguousWrapAround: false,
      looseSiblingWrapAround: false,
      strictSiblingWrapAround: false,
    };
  }


  onload() {
    this.addCommands();
  }


  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;

		/* TOGGLE SETTINGS */

		// Toggle Wrap Around
		plugin.addCommand({
			id: 'toggle-global-wrap-around',
			name: 'Toggle wrap around globally',
			icon: 'arrow-right',
			callback: async () => {
				const wrapAround = plugin.settings.globalWrapAround;
				if (wrapAround) {
					plugin.settings.globalWrapAround = false;
					plugin.settings.contiguousWrapAround = false;
					plugin.settings.looseSiblingWrapAround = false;
					plugin.settings.strictSiblingWrapAround = false;
				} else {
					plugin.settings.globalWrapAround = true;
					plugin.settings.contiguousWrapAround = true;
					plugin.settings.looseSiblingWrapAround = true;
					plugin.settings.strictSiblingWrapAround = true;
				}
				new Notice(`Global Wrap Around: ${String(!wrapAround).toUpperCase()}`, 3000);
				await plugin.saveSettings();
			}
		});

		// Toggle Sibling Mode
		plugin.addCommand({
			id: 'toggle-sibling-mode',
			name: 'Toggle sibling mode (loose/strict)',
			icon: 'arrow-right',
			callback: async () => {
				const siblingMode = plugin.settings.siblingMode;
				if (siblingMode === 'strictSibling') {
					plugin.settings.siblingMode = 'looseSibling';
				}
				else if (siblingMode === 'looseSibling') {
					plugin.settings.siblingMode = 'strictSibling';
				}
				new Notice(`Sibling Mode: ${plugin.settings.siblingMode}`, 3000);
				await plugin.saveSettings();
			}
		});

		/* MOVE CURSOR TO HEADING */

		// Move cursor to next sibling heading down
		plugin.addCommand({
			id: 'sibling-heading-down',
			name: 'Move cursor to next sibling heading down',
			icon: 'arrow-down',
      repeatable: true,
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const mode = plugin.settings.siblingMode;
				moveCursorToHeading(view, {
					mode: mode,
					backwards: false,
					wrapAround: getSetting(plugin.app, `${mode}WrapAround`),
					scrollBounds: getSetting(plugin.app, 'moveToHeading_scrollTriggerBounds')
				});
			}
		});

		// Move cursor to next sibling heading up
		plugin.addCommand({
			id: 'sibling-heading-up',
			name: 'Move cursor to next sibling heading up',
			icon: 'arrow-up',
      repeatable: true,
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const mode = plugin.settings.siblingMode;
				moveCursorToHeading(view, {
					mode: mode,
					backwards: true,
					wrapAround: getSetting(plugin.app, `${mode}WrapAround`),
					scrollBounds: getSetting(plugin.app, 'moveToHeading_scrollTriggerBounds')
				});
			}
		});

		// Move cursor to next contiguous heading down
		plugin.addCommand({
			id: 'contiguous-heading-down',
			name: 'Move cursor to contiguous heading down',
			icon: 'arrow-down',
      repeatable: true,
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const mode = 'contiguous';
				moveCursorToHeading(view, {
					mode: mode,
					backwards: false,
					wrapAround: getSetting(plugin.app, `${mode}WrapAround`),
					scrollBounds: getSetting(plugin.app, 'moveToHeading_scrollTriggerBounds')
				});
			}
		});

		// Move cursor to next contiguous heading up
		plugin.addCommand({
			id: 'contiguous-heading-up',
			name: 'Move cursor to contiguous heading up',
			icon: 'arrow-up',
      repeatable: true,
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const mode = 'contiguous';
				moveCursorToHeading(view, {
					mode: mode,
					backwards: true,
					wrapAround: getSetting(plugin.app, `${mode}WrapAround`),
					scrollBounds: getSetting(plugin.app, 'moveToHeading_scrollTriggerBounds')
				});
			}
		});

    // Move cursor to highest heading upwards
    plugin.addCommand({
      id: 'highest-heading-up',
      name: 'Move cursor to highest heading upwards',
      icon: 'arrow-up',
      editorCallback: (editor: Editor, view: MarkdownView) => {
				const mode = 'highest';
				moveCursorToHeading(view, {
					mode: mode,
					backwards: true,
					scrollBounds: getSetting(plugin.app, 'moveToHeading_scrollTriggerBounds')
				});
      }
    });


    // Move cursor to highest heading downwards
    plugin.addCommand({
      id: 'highest-heading-down',
      name: 'Move cursor to highest heading downwards',
      icon: 'arrow-down',
      editorCallback: (editor: Editor, view: MarkdownView) => {
				const mode = 'highest';
				moveCursorToHeading(view, {
					mode: mode,
					backwards: false,
					scrollBounds: getSetting(plugin.app, 'moveToHeading_scrollTriggerBounds')
				});
      }
    });

    // Move cursor to higher heading upwards
    plugin.addCommand({
      id: 'higher-heading-up',
      name: 'Move cursor to higher heading upwards (parent)',
      icon: 'arrow-up',
      editorCallback: (editor: Editor, view: MarkdownView) => {
				const mode = 'higher';
				moveCursorToHeading(view, {
					mode: mode,
					backwards: true,
					scrollBounds: getSetting(plugin.app, 'moveToHeading_scrollTriggerBounds')
				});
      }
    });


    // Move cursor to higher heading downwards
    plugin.addCommand({
      id: 'higher-heading-down',
      name: 'Move cursor to higher heading downwards',
      icon: 'arrow-down',
      editorCallback: (editor: Editor, view: MarkdownView) => {
				const mode = 'higher';
				moveCursorToHeading(view, {
					mode: mode,
					backwards: false,
					scrollBounds: getSetting(plugin.app, 'moveToHeading_scrollTriggerBounds')
				});
      }
    });

  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

		containerEl.createEl('h3', {text: 'Heading Movement Settings'});

		/* Global Settings */

		// Sibling Mode
		new Setting(containerEl)
      .setName('Sibling mode')
			.then((setting: Setting) => {
				const fragment = document.createDocumentFragment();
				fragment.append(
					fragment.createEl('b', {text: 'Strict: '}),
					'Same heading level and parent required.',
					fragment.createEl('br'),
					fragment.createEl('b', {text: 'Loose: '}),
					'Only same heading level required.',
				);
				setting.setDesc(fragment);
			})
			.addDropdown((dropdown: DropdownComponent) => {
				dropdown.addOptions({
					'strictSibling': 'Strict',
					'looseSibling':  'Loose',
				});
				dropdown.setValue(plugin.settings.siblingMode);
				dropdown.onChange(async (value: SiblingMode) => {
					plugin.settings.siblingMode = value;
					await plugin.saveSettings();
				});
			});


    // SCROLL TRIGGER BOUNDS
		containerEl.createEl('h4', {text: 'Scroll Trigger Bounds'});

    // Top Bound
    new Setting(containerEl)
      .setName('Top Bound')
      .setDesc('Top fraction bound of the viewport.')
      .addSlider((slider: SliderComponent) => {
        slider.setLimits(0, 1, 0.01);
        slider.setDynamicTooltip();
        slider.setValue(plugin.settings.moveToHeading_scrollTriggerBounds[0]);
        slider.onChange(async (value: number) => {
          plugin.settings.moveToHeading_scrollTriggerBounds[0] = value;
          await plugin.saveSettings();
        });
      });

    // Bottom Bound
    new Setting(containerEl)
      .setName('Bottom Bound')
      .setDesc('Bottom fraction bound of the viewport (should be greater than the top bound).')
      .addSlider((slider: SliderComponent) => {
        slider.setLimits(0, 1, 0.01);
        slider.setDynamicTooltip();
        slider.setValue(plugin.settings.moveToHeading_scrollTriggerBounds[1]);
        slider.onChange(async (value: number) => {
          plugin.settings.moveToHeading_scrollTriggerBounds[1] = value;
          await plugin.saveSettings();
        });
      });


		/* Wrap Around Settings */
    containerEl.createEl('h5', {text: 'Wrap around...'});

		new Setting(containerEl)
      .setName('...for contiguous headings')
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(plugin.settings.contiguousWrapAround);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.contiguousWrapAround = value;
					await plugin.saveSettings();
				});
			});

		new Setting(containerEl)
      .setName('...for loose siblings')
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(plugin.settings.looseSiblingWrapAround);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.looseSiblingWrapAround = value;
					await plugin.saveSettings();
				});
			});

		new Setting(containerEl)
      .setName('...for strict siblings')
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(plugin.settings.strictSiblingWrapAround);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.strictSiblingWrapAround = value;
					await plugin.saveSettings();
				});
			});

  }

}

