import BundlePlugin, { BundlePluginComponent } from "main";

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
} from "obsidian";

import {
  DynamicSetting,
  FloatInputSetting,
  shrinkSettingInputField,
} from "utils/utilsCore";

import moveCursorToHeading from "./utils/moveCursor";



type SiblingMode = "strictSibling" | "looseSibling";
type ScrollMode = "viewportFraction" | "offsetLines";
type ScrollExecution = "never" | "always" | "onThreshold";
// type LevelZeroBehavior = "snap-contiguous" | "snap-parent" | "on-parent-behavior";



export default class MoveToHeadingComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: {
    // levelZeroBehavior: LevelZeroBehavior,
    siblingMode: SiblingMode,

    scrollExecution: ScrollExecution,
    scrollMode: ScrollMode,
    scrollThreshold: number,
    scrollFraction: number,
    scrollOffsetLines: number,
    // useScrollTimeout: boolean,

    globalWrapAround: boolean,
    contiguousWrapAround: boolean,
    looseSiblingWrapAround: boolean,
    strictSiblingWrapAround: boolean,
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      // levelZeroBehavior: "snap-contiguous",
      siblingMode: "looseSibling",

      scrollExecution: "onThreshold",
      scrollMode: "viewportFraction",
      scrollThreshold: 0.25,
      scrollFraction: 0.25,
      scrollOffsetLines: 5,
      // useScrollTimeout: false,

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
			id: "toggle-global-wrap-around",
			name: "Toggle wrap around globally",
			icon: "arrow-right",
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
			id: "toggle-sibling-mode",
			name: "Toggle sibling mode (loose/strict)",
			icon: "arrow-right",
			callback: async () => {
				const siblingMode = plugin.settings.siblingMode;
				if (siblingMode === "strictSibling") {
					plugin.settings.siblingMode = "looseSibling";
				}
				else if (siblingMode === "looseSibling") {
					plugin.settings.siblingMode = "strictSibling";
				}
				new Notice(`Sibling Mode: ${plugin.settings.siblingMode}`, 3000);
				await plugin.saveSettings();
			}
		});

		/* MOVE CURSOR TO HEADING */

		// Move cursor to next sibling heading down
		plugin.addCommand({
			id: "sibling-heading-down",
			name: "Move cursor to next sibling heading down",
			icon: "arrow-down",
      repeatable: true,
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const siblingMode = plugin.settings.siblingMode;
        moveCursorToHeading(editor, view, siblingMode, {backwards: false});
			}
		});

		// Move cursor to next sibling heading up
		plugin.addCommand({
			id: "sibling-heading-up",
			name: "Move cursor to next sibling heading up",
			icon: "arrow-up",
      repeatable: true,
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const siblingMode = plugin.settings.siblingMode;
        moveCursorToHeading(editor, view, siblingMode, {backwards: true});
			}
		});

		// Move cursor to next contiguous heading down
		plugin.addCommand({
			id: "contiguous-heading-down",
			name: "Move cursor to contiguous heading down",
			icon: "arrow-down",
      repeatable: true,
			editorCallback: (editor: Editor, view: MarkdownView) => {
        moveCursorToHeading(editor, view, "contiguous", {backwards: false});
			}
		});

		// Move cursor to next contiguous heading up
		plugin.addCommand({
			id: "contiguous-heading-up",
			name: "Move cursor to contiguous heading up",
			icon: "arrow-up",
      repeatable: true,
			editorCallback: (editor: Editor, view: MarkdownView) => {
				moveCursorToHeading(editor, view, "contiguous", {backwards: true});
			}
		});

    // Move cursor to highest heading upwards
    plugin.addCommand({
      id: "highest-heading-up",
      name: "Move cursor to highest heading upwards",
      icon: "arrow-up",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        moveCursorToHeading(editor, view, "highest", {backwards: true});
      }
    });


    // Move cursor to highest heading downwards
    plugin.addCommand({
      id: "highest-heading-down",
      name: "Move cursor to highest heading downwards",
      icon: "arrow-down",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        moveCursorToHeading(editor, view, "highest", {backwards: false});
      }
    });

    // Move cursor to higher heading upwards
    plugin.addCommand({
      id: "higher-heading-up",
      name: "Move cursor to higher heading upwards (parent)",
      icon: "arrow-up",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        moveCursorToHeading(editor, view, "higher", {backwards: true});
      }
    });


    // Move cursor to higher heading downwards
    plugin.addCommand({
      id: "higher-heading-down",
      name: "Move cursor to higher heading downwards",
      icon: "arrow-down",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        moveCursorToHeading(editor, view, "higher", {backwards: false});
      }
    });

  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

		containerEl.createEl("h3", {text: "Heading Movement Settings"});

		/* Global Settings */

		// Sibling Mode
		new Setting(containerEl)
		  .setName("Sibling mode")
			.then((setting: Setting) => {
				const fragment = document.createDocumentFragment();
				fragment.append(
					fragment.createEl("b", {text: "Strict: "}),
					"Same heading level and parent required.",
					fragment.createEl("br"),
					fragment.createEl("b", {text: "Loose: "}),
					"Only same heading level required.",
				);
				setting.setDesc(fragment);
			})
			.addDropdown((dropdown: DropdownComponent) => {
				dropdown.addOptions({
					"strictSibling": "Strict",
					"looseSibling":  "Loose",
				});
				dropdown.setValue(plugin.settings.siblingMode);
				dropdown.onChange(async (value: SiblingMode) => {
					plugin.settings.siblingMode = value;
					await plugin.saveSettings();
				});
			});



    /* Scroll Settings */
    containerEl.createEl("h5", {text: "Scroll Settings"});


    class ScrollModeSetting extends DynamicSetting {
      fractionSetting: DynamicSetting;
      offsetLinesSetting: DynamicSetting;

      constructor(containerEl: HTMLElement) {
        super(containerEl);
        this.setName("Scroll mode");

        this.addDropdown((dropdown: DropdownComponent) => {
          dropdown.addOptions({
            "viewportFraction": "Viewport fraction",
            "offsetLines":      "Offset lines",
          });
          dropdown.setValue(plugin.settings.scrollMode);
          dropdown.onChange(async (value: ScrollMode) => {
            plugin.settings.scrollMode = value;
            this.switch(value);
            await plugin.saveSettings();
          });
        });

        this.fractionSetting = new DynamicSetting(containerEl)
          .setName("Viewport fraction")
          .setDesc("Fraction of the viewport that the target line will be placed at when scrolling.")
          .addSlider((slider: SliderComponent) => {
            slider.setLimits(0, 0.5, 0.01);
            slider.setDynamicTooltip();
            slider.setValue(plugin.settings.scrollFraction);
            slider.onChange(async (value: number) => {
              plugin.settings.scrollFraction = value;
              await plugin.saveSettings();
            });
          })
          .then((setting: Setting) => {
            setting.settingEl.addClass("scroll-fraction-setting");
          });


        this.offsetLinesSetting = new DynamicSetting(containerEl)
          .setName("Offset lines")
          .setDesc("Minimum number of lines visible above and below the target line.")
          .addText((textField: TextComponent) => {
            textField.inputEl.type = "number";
            textField.setPlaceholder("scroll_offset");
            textField.setValue(String(plugin.settings.scrollOffsetLines));
            textField.onChange(async (value: string) => {
              plugin.settings.scrollOffsetLines = Number(value);
              await plugin.saveSettings();
            });
          })
          .then(shrinkSettingInputField);
      }

      switch(mode: ScrollMode) {
        switch (mode) {
          case "viewportFraction":
            this.fractionSetting.show();
            this.offsetLinesSetting.hide();
            break;
          case "offsetLines":
            this.fractionSetting.hide();
            this.offsetLinesSetting.show();
            break;
        }
      }

      show() {
        this.settingEl.show();
        this.switch(plugin.settings.scrollMode);
      }

      hide() {
        this.settingEl.hide();
        this.fractionSetting.hide();
        this.offsetLinesSetting.hide();
      }

    }


    class ScrollTriggerSetting extends Setting {
      scrollThreshold: FloatInputSetting;
      scrollMode: ScrollModeSetting;
      dynamicSettings: DynamicSetting[];

      constructor(containerEl: HTMLElement) {
        super(containerEl);
        this.setName("Scroll trigger");
        this.setDesc("When to trigger the plugin's scroll.");

        this.addDropdown((dropdown: DropdownComponent) => {
          dropdown.addOptions({
            "onThreshold": "On threshold",
            "always":      "Always",
            "never":       "Never",
          });
          dropdown.setValue(plugin.settings.scrollExecution);
          dropdown.onChange(async (value: ScrollExecution) => {
            plugin.settings.scrollExecution = value;
            this.switch(value);
            await plugin.saveSettings();
          });
        });

        this.scrollThreshold = new FloatInputSetting(containerEl, plugin, {
          settingId: "scrollThreshold",
          placeholder: "scroll_fraction",
          min: 0, max: 0.5, default: 0.25,
        })
          .setName("Trigger threshold")
          .setDesc("Fraction of the viewport (both from the top downwards and from the bottom upwards) that the target line must be within to trigger scrolling.")
          .then((setting: Setting) => {
            setting.controlEl.addClass("scroll-threshold-setting-control");
          })
          .addButton((button: ButtonComponent) => {
            button.setButtonText("Equalize");
            button.onClick(async () => {
              const fractionSlider = this.scrollMode.fractionSetting.components[0] as SliderComponent;
              fractionSlider.setValue(plugin.settings.scrollThreshold);
              // this.scrollMode.fractionSetting.input = plugin.settings.scrollThreshold;
              plugin.settings.scrollFraction = plugin.settings.scrollThreshold;
              await plugin.saveSettings();
            });
          });

        this.scrollMode = new ScrollModeSetting(containerEl);

        this.dynamicSettings = [
          this.scrollThreshold,
          this.scrollMode,

          // // Use Scroll Timeout
          // new DynamicSetting(containerEl)
          //   .setName("Use Scroll timeout")
          //   .setDesc("This guarantees expected scroll behavior, but at the cost of some UI flicking.")
          //   .addToggle((toggle: ToggleComponent) => {
          //     toggle.setValue(plugin.settings.useScrollTimeout);
          //     toggle.onChange(async (value: boolean) => {
          //       plugin.settings.useScrollTimeout = value;
          //       await plugin.saveSettings();
          //     });
          //   }),

        ];

        this.switch((this.components[0] as DropdownComponent).getValue() as ScrollExecution);
      }

      showDynamicSettings() { this.dynamicSettings.forEach(setting => setting.show()); }
      hideDynamicSettings() { this.dynamicSettings.forEach(setting => setting.hide()); }

      switch(value: ScrollExecution) {
        switch (value) {
          case "onThreshold":
            this.showDynamicSettings();
            break;
          case "always":
            this.showDynamicSettings();
            this.scrollThreshold.hide();
            break;
          case "never":
            this.hideDynamicSettings();
            break;
        }
      }

    }


    new ScrollTriggerSetting(containerEl);



		/* Wrap Around Settings */
    containerEl.createEl("h5", {text: "Wrap around..."});

		new Setting(containerEl)
		  .setName("...for contiguous headings")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(plugin.settings.contiguousWrapAround);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.contiguousWrapAround = value;
					await plugin.saveSettings();
				});
			});

		new Setting(containerEl)
		  .setName("...for loose siblings")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(plugin.settings.looseSiblingWrapAround);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.looseSiblingWrapAround = value;
					await plugin.saveSettings();
				});
			});

		new Setting(containerEl)
		  .setName("...for strict siblings")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(plugin.settings.strictSiblingWrapAround);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.strictSiblingWrapAround = value;
					await plugin.saveSettings();
				});
			});

  }

}

