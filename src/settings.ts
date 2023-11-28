import {
	App, Setting, PluginSettingTab,
	BaseComponent, ButtonComponent, ToggleComponent, TextComponent, DropdownComponent,
} from "obsidian";

import ExperimentalPlugin from "./main";


const scriptComplexityLevels = [
  "Minimal",
  "Simple",
  "Intermediate",
  "Advanced",
  "Expert",
  "God",
] as const;
type ScriptComplexityLevel = typeof scriptComplexityLevels[number];

type LevelZeroBehavior = "snap-contiguous" | "snap-parent" | "on-parent-behavior";
type SiblingMode = "strictSibling" | "looseSibling";

export interface ExperimentalSettings {
	// Heading Movements
	levelZeroBehavior: LevelZeroBehavior;
	siblingMode: SiblingMode;
	scrollOffset: number;
	globalWrapAround: boolean;
	contiguousWrapAround: boolean;
	looseSiblingWrapAround: boolean;
	strictSiblingWrapAround: boolean;
	// Fold Settings
	alwaysUnfoldParent: boolean;
	// Script Runner
	scriptsPath: string;
	vimModeScripts: boolean;
	scriptComplexity: ScriptComplexityLevel;
	emergencyBreak: boolean;
	breakTriggerTime: number;
}

export const DEFAULT_SETTINGS: ExperimentalSettings = {
	// Heading Movements
	levelZeroBehavior: "snap-contiguous",
	siblingMode: "looseSibling",
	scrollOffset: 0,
	globalWrapAround: false,
	contiguousWrapAround: false,
	looseSiblingWrapAround: false,
	strictSiblingWrapAround: true,
	// Fold Settings
	alwaysUnfoldParent: false,
	// Script Runner
	scriptsPath: '',
	vimModeScripts: false,
	scriptComplexity: "Minimal",
	emergencyBreak: true,
	breakTriggerTime: 3000,
}


export class ExperimentalSettingTab extends PluginSettingTab {
	plugin: ExperimentalPlugin;

	constructor(app: App, plugin: ExperimentalPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}


	addFoldSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h3", {text: "Fold Settings"});

		new Setting(containerEl)
		  .setName("Always unfold parent when folding/unfolding children")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(this.plugin.settings.alwaysUnfoldParent);
				toggle.onChange(async (value: boolean) => {
					this.plugin.settings.alwaysUnfoldParent = value;
					await this.plugin.saveSettings();
				});
			});
	}


	addHeadingMovementSettings(containerEl: HTMLElement): void {
		containerEl.createEl("h3", {text: "Heading Movement Settings"});

		/* Global Settings */

		// Level Zero Behavior
		new Setting(containerEl)
		  .setName("Movement at no heading line")
			.setDesc("How to behave on any heading movement action when the cursor is not on a heading line.")
			.addDropdown((dropdown: DropdownComponent) => {
				dropdown.addOptions({
					"snap-contiguous":    "Snap to contiguous",
					"snap-parent":        "Snap to parent",
					"on-parent-behavior": "Behave as if parent",
				});
				dropdown.setValue(this.plugin.settings.levelZeroBehavior);
				dropdown.onChange(async (value: LevelZeroBehavior) => {
					this.plugin.settings.levelZeroBehavior = value;
					await this.plugin.saveSettings();
				});
			});

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
				dropdown.setValue(this.plugin.settings.siblingMode);
				dropdown.onChange(async (value: SiblingMode) => {
					this.plugin.settings.siblingMode = value;
					await this.plugin.saveSettings();
				});
			});

		// Scroll Offset
		new Setting(containerEl)
		  .setName("Scroll offset")
			.setDesc("Minimum number of offset lines visible from the cursor position when moving to a heading.")
			.addText((textField: TextComponent) => {
				textField.inputEl.type = "number";
				textField.setPlaceholder("scroll_offset");
				textField.setValue(String(this.plugin.settings.scrollOffset));
				textField.onChange(async (value: string) => {
					this.plugin.settings.scrollOffset = Number(value);
					await this.plugin.saveSettings();
				});
			});

		/* Wrap Around Settings */
    containerEl.createEl("h5", {text: "Wrap around..."});

		new Setting(containerEl)
		  .setName("...for contiguous headings")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(this.plugin.settings.contiguousWrapAround);
				toggle.onChange(async (value: boolean) => {
					this.plugin.settings.contiguousWrapAround = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
		  .setName("...for loose siblings")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(this.plugin.settings.looseSiblingWrapAround);
				toggle.onChange(async (value: boolean) => {
					this.plugin.settings.looseSiblingWrapAround = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
		  .setName("...for strict siblings")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(this.plugin.settings.strictSiblingWrapAround);
				toggle.onChange(async (value: boolean) => {
					this.plugin.settings.strictSiblingWrapAround = value;
					await this.plugin.saveSettings();
				});
			});

	}


	addScriptRunnerSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h3", {text: "Script Runner Settings"});

		/* Basic Settings */

		// Scripts Path
		new Setting(containerEl)
			.setName("Scripts path")
			.setDesc("Path to the folder containing your scripts")
			.addText((textField: TextComponent) => {
				textField.setPlaceholder("scripts_path");
				textField.setValue(this.plugin.settings.scriptsPath);
				textField.onChange(async (value: string) => {
					this.plugin.settings.scriptsPath = value;
					await this.plugin.saveSettings();
				});
			});

		// Break Trigger Time

		// This setting is returned in a function because it needs
		// to be referenced by the Emergency Break toggle.
		const setBreakTriggerTime = () => new Setting(containerEl)
			.setName("Break trigger time")
			.setDesc("Time in milliseconds before a script is stopped")
			.addText((textField: TextComponent) => {
				textField.inputEl.type = "number";
				textField.setPlaceholder("time_in_milliseconds");
				textField.setValue(String(this.plugin.settings.breakTriggerTime));
				textField.onChange(async (value: string) => {
					this.plugin.settings.breakTriggerTime = Number(value);
					await this.plugin.saveSettings();
				});
			})
			.then((setting: Setting) => {
				// Add class for CSS styling on the setting components
				setting.controlEl.addClass("break-trigger-time-item-control");
				// The textField is the first and only component of the setting at this point
				const textField = setting.components[0] as TextComponent;
				// Button generator function
				const addTimeOffsetButton = (millisecs: string) => {
					setting.addButton((button: ButtonComponent) => {
						button.setButtonText(`${millisecs} ms`);
						button.onClick(async () => {
							const newTime = this.plugin.settings.breakTriggerTime + Number(millisecs);
							if (newTime < 0) return;
							textField.setValue(String(newTime));
							this.plugin.settings.breakTriggerTime = newTime;
							await this.plugin.saveSettings();
						});
					});
				}
				addTimeOffsetButton("-100");
				addTimeOffsetButton("+100");
				addTimeOffsetButton("-250");
				addTimeOffsetButton("+250");
				addTimeOffsetButton("-700");
				addTimeOffsetButton("+700");
			});

		// Emergency Break
		new Setting(containerEl)
			.setName("Emergency break")
			.setDesc("Break scripts if they take too long to run")
			.then((setting: Setting) => {
				// Get the breakTriggerTime setting by creating it
				const breakTriggerTime = setBreakTriggerTime();
				// Add the toggle with hide/show functionality for the breakTriggerTime setting
				setting.addToggle((toggle: ToggleComponent) => {
					toggle.setValue(this.plugin.settings.emergencyBreak);
					toggle.onChange(async (value: boolean) => {
						if (value) breakTriggerTime.settingEl.show();
						else breakTriggerTime.settingEl.hide();
						this.plugin.settings.emergencyBreak = value;
						await this.plugin.saveSettings();
					});
					if (!toggle.getValue()) breakTriggerTime.settingEl.hide();
				});
			});


		/* Advanced Settings */
    containerEl.createEl("h5", {text: "Advanced settings"});

		// Vim Mode Scripts
		new Setting(containerEl)
			.setName("Vim mode scripts")
			.setDesc("Enable scripts for vim mode")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setTooltip("Only activate this if you have vim mode enabled");
				toggle.setValue(this.plugin.settings.vimModeScripts);
				toggle.onChange(async (value: boolean) => {
					this.plugin.settings.vimModeScripts = value;
					await this.plugin.saveSettings();
				});
			});

		// Script Complexity
		new Setting(containerEl)
			.setName("Script complexity")
			.setDesc("Filter the scripts you want to run based on their complexity")
      .setClass("script-complexity")
			.addDropdown((dropdown: DropdownComponent) => {
        scriptComplexityLevels.forEach((compexityLevel) => {
          dropdown.addOption(compexityLevel, compexityLevel);
        });
				// Never call setValue before adding all dropdown options
				dropdown.setValue(this.plugin.settings.scriptComplexity);
				dropdown.onChange(async (value: ScriptComplexityLevel) => {
					this.plugin.settings.scriptComplexity = value;
					await this.plugin.saveSettings();
				});
			});

	}


	addWarningBanner(containerEl: HTMLElement): void {
		containerEl.createDiv("warning-banner", (banner: HTMLDivElement) => {
			banner.createEl("h4", {
				text: "⚠ WARNING ⚠"
			});
			banner.createEl("p", {
				cls: "warning-banner-text",
				text: "This plugin is still in development. Use it at your own risk!"
			});
		});
	
	}


	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		this.addFoldSettings(containerEl);
		containerEl.createEl("br");
		this.addHeadingMovementSettings(containerEl);
		containerEl.createEl("br");
		this.addScriptRunnerSettings(containerEl);
		containerEl.createEl("br");
		containerEl.createEl("br");
		this.addWarningBanner(containerEl);

	}
}