import {
	PluginSettingTab, Setting,
	App, ButtonComponent,
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
	levelZeroBehavior: LevelZeroBehavior;
	siblingMode: SiblingMode;
	scrollOffset: number;
	globalWrapAround: boolean;
	contiguousWrapAround: boolean;
	looseSiblingWrapAround: boolean;
	strictSiblingWrapAround: boolean;
	scriptsPath: string;
	vimModeScripts: boolean;
	scriptComplexity: ScriptComplexityLevel;
	emergencyBreak: boolean;
	breakTriggerTime: number;
}
type SettingKey = keyof ExperimentalSettings;

export function getSetting(setting: SettingKey) {
  return this.app.plugins.plugins["experimental-plugin"].settings[setting];
}

export const DEFAULT_SETTINGS: ExperimentalSettings = {
	levelZeroBehavior: "snap-contiguous",
	siblingMode: "looseSibling",
	scrollOffset: 0,
	globalWrapAround: false,
	contiguousWrapAround: false,
	looseSiblingWrapAround: false,
	strictSiblingWrapAround: true,
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


	addHeadingMovementOptions(containerEl: HTMLElement): void {
		containerEl.createEl("h1", {text: "Heading Movement Settings"});

		/* Global Settings */
		containerEl.createEl("h3", {text: "Global settings"});

		// Level Zero Behavior
		const levelZeroBehaviorDesc = document.createDocumentFragment();
		levelZeroBehaviorDesc.append(
			"There are three options for how to behave at any heading movement action when the cursor is not on a heading:",
			levelZeroBehaviorDesc.createEl("br"),
			levelZeroBehaviorDesc.createEl("br"),
			"1. Snap to the contiguous heading in the direction of movement.",
			levelZeroBehaviorDesc.createEl("br"),
			levelZeroBehaviorDesc.createEl("br"),
			"2. Always snap to the parent heading regardless the direction of movement.",
			levelZeroBehaviorDesc.createEl("br"),
			levelZeroBehaviorDesc.createEl("br"),
			"3. Behave as if the cursor is on its parent heading (can take a bit to get used to).",
		);
		new Setting(containerEl)
		  .setName("Level zero behavior")
			.setDesc(levelZeroBehaviorDesc)
			.addDropdown((dropdown) => {
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
		const siblingModeDesc = document.createDocumentFragment();
		siblingModeDesc.append(
			"NOTE: They both work the same way when on top level headings.",
			siblingModeDesc.createEl("br"),
			siblingModeDesc.createEl("br"),
			siblingModeDesc.createEl("b", {text: "Strict: "}),
			"Only move to headings with the same level and parent.",
			siblingModeDesc.createEl("br"),
			siblingModeDesc.createEl("br"),
			siblingModeDesc.createEl("b", {text: "Loose: "}),
			"Move to any heading with the same level.",
		);
		new Setting(containerEl)
		  .setName("Sibling mode")
			.setDesc(siblingModeDesc)
			.addDropdown((dropdown) => {
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
			.setDesc("Number of offset lines visible from the cursor position when moving to a heading")
			.addText((text) => {
				text.setPlaceholder("scroll_offset");
				text.inputEl.type = "number";
				text.setValue(String(this.plugin.settings.scrollOffset));
				text.onChange(async (value) => {
					this.plugin.settings.scrollOffset = Number(value);
					await this.plugin.saveSettings();
				});
			});

		/* Wrap Around Settings */
    containerEl.createEl("h3", {text: "Wrap around..."});

		new Setting(containerEl)
		  .setName("...for contiguous headings")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.contiguousWrapAround)
				.onChange(async (value) => {
					this.plugin.settings.contiguousWrapAround = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
		  .setName("...for loose siblings")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.looseSiblingWrapAround)
				.onChange(async (value) => {
					this.plugin.settings.looseSiblingWrapAround = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
		  .setName("...for strict siblings")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.strictSiblingWrapAround)
				.onChange(async (value) => {
					this.plugin.settings.strictSiblingWrapAround = value;
					await this.plugin.saveSettings();
				})
			);

	}


	addScriptRunnerOptions(containerEl: HTMLElement): void {
    containerEl.createEl("h1", {text: "Script Runner Settings"});

		/* Basic Settings */
    containerEl.createEl("h3", {text: "Basic settings"});

		// Scripts Path
		new Setting(containerEl)
			.setName("Scripts path")
			.setDesc("Path to the folder containing your scripts")
			.addText((text) => text
				.setPlaceholder("scripts_path")
				.setValue(this.plugin.settings.scriptsPath)
				.onChange(async (value) => {
					this.plugin.settings.scriptsPath = value;
					await this.plugin.saveSettings();
				})
			);

		// Emergency Break
		new Setting(containerEl)
			.setName("Emergency break")
			.setDesc("Break scripts if they take too long to run")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.emergencyBreak)
				.onChange(async (value) => {
					if (value === false) {
						this.containerEl.querySelector<HTMLInputElement>(
							".break-trigger-time"
						)!.hide();
					} else {
						this.containerEl.querySelector<HTMLInputElement>(
							".break-trigger-time"
						)!.show();
					}
					this.plugin.settings.emergencyBreak = value;
					await this.plugin.saveSettings();
				})
			);


		/* Break Trigger Time (Special Behavior) */

		// Helper function to set the text of the break trigger time button
		const setBreakTriggerTimeButton = (button: ButtonComponent, millisecs: string) => {
			button.setButtonText(`${millisecs} ms`);
			button.onClick(async () => {
				const newBreakTriggerTime = this.plugin.settings.breakTriggerTime + Number(millisecs);
				if (newBreakTriggerTime < 0) return;
				// Update the UI text field
				this.containerEl.querySelector<HTMLInputElement>(
					".break-trigger-time input"
				)!.value = String(newBreakTriggerTime);
				// Set the new value of the setting
				this.plugin.settings.breakTriggerTime = newBreakTriggerTime;
				await this.plugin.saveSettings();
			});
		};

		// Break Trigger Time
		new Setting(containerEl)
			.setName("Break trigger time")
			.setDesc("Time in milliseconds before a script is stopped")
      .setClass("break-trigger-time")
			.addText((textField) => {
				textField.setPlaceholder("time_in_milliseconds");
				textField.inputEl.type = "number";
				textField.setValue(String(this.plugin.settings.breakTriggerTime));
				textField.onChange(async (value) => {
					this.plugin.settings.breakTriggerTime = Number(value);
					await this.plugin.saveSettings();
				});
			})
      .addButton(async (button) => {
				button.buttonEl.addClass("break-trigger-time-decrease-button");
				setBreakTriggerTimeButton(button, "-200");
      })
      .addButton(async (button) => {
				button.buttonEl.addClass("break-trigger-time-increase-button");
				setBreakTriggerTimeButton(button, "+200");
      });

		// Add a container for the buttons
		containerEl.querySelector<HTMLInputElement>(
			".break-trigger-time .setting-item-control"
		)!.addClass("break-trigger-time-item-control");

		containerEl.querySelector<HTMLInputElement>(".break-trigger-time-item-control")!
			.createDiv("break-trigger-time-button-container", (div) => {
				div.appendChild(containerEl.querySelector<HTMLButtonElement>(
					".break-trigger-time-decrease-button"
				)!);
				div.appendChild(containerEl.querySelector<HTMLButtonElement>(
					".break-trigger-time-increase-button"
				)!);
			});

		// Hide the break trigger time setting if emergency break is disabled
		if (!this.plugin.settings.emergencyBreak) {
			containerEl.querySelector<HTMLInputElement>(
				".break-trigger-time"
			)!.hide();
		}

		/* Advanced Settings */
    containerEl.createEl("h3", {text: "Advanced settings"});

		// Vim Mode Scripts
		new Setting(containerEl)
			.setName("Vim mode scripts")
			.setDesc("Enable scripts for vim mode")
			.addToggle((toggle) => toggle
				.setTooltip("Only activate this if you have vim mode enabled")
				.setValue(this.plugin.settings.vimModeScripts)
				.onChange(async (value) => {
					this.plugin.settings.vimModeScripts = value;
					await this.plugin.saveSettings();
				})
			);

		// Script Complexity
		new Setting(containerEl)
			.setName("Script complexity")
			.setDesc("Filter the scripts you want to run based on their complexity")
      .setClass("script-complexity")
			.addDropdown((dropdown) => {
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

		// this.addWarningBanner(containerEl);
		this.addHeadingMovementOptions(containerEl);
		// this.addScriptRunnerOptions(containerEl);

	}
}