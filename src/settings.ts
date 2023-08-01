import { App, ButtonComponent, PluginSettingTab, Setting } from "obsidian";
import ExperimentalPlugin from "./main";

const readyForProduction = false;

const scriptComplexityLevels = [
  "Minimal",
  "Simple",
  "Intermediate",
  "Advanced",
  "Expert",
  "God",
] as const;
type scriptComplexityLevel = typeof scriptComplexityLevels[number];

export interface Settings {
	scriptsPath: string;
	vimModeScripts: boolean;
	scriptComplexity: scriptComplexityLevel;
	emergencyBreak: boolean;
	breakTriggerTime: number;
}

export const DEFAULT_SETTINGS: Settings = {
	scriptsPath: '',
	vimModeScripts: false,
	scriptComplexity: "Minimal",
	emergencyBreak: true,
	breakTriggerTime: 3000,
}


export class SettingTab extends PluginSettingTab {
	plugin: ExperimentalPlugin;

	constructor(app: App, plugin: ExperimentalPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		if (!readyForProduction) {
			containerEl.createDiv("warning-banner", (banner) => {
				banner.createEl("h4", {
					text: "⚠ WARNING ⚠"
				});
				banner.createEl("p", {
					cls: "warning-banner-text",
					text: "This plugin is still in development. Use it at your own risk!"
				});
			});
		}

    containerEl.createEl("h1", {text: "Script Runner Settings"});
    containerEl.createEl("h3", {text: "Basic settings"});

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

		new Setting(containerEl)
			.setName("Emergency break")
			.setDesc("Break scripts if they take too long to run")
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.emergencyBreak)
				.onChange(async (value) => {
					if (value === false) {
						this.containerEl.querySelector<HTMLInputElement>(
							".break-trigger-time"
						)!.style.display = "none";
					} else {
						this.containerEl.querySelector<HTMLInputElement>(
							".break-trigger-time"
						)!.style.display = "flex";
					}
					this.plugin.settings.emergencyBreak = value;
					await this.plugin.saveSettings();
				})
			);

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

		if (!this.plugin.settings.emergencyBreak) {
			containerEl.querySelector<HTMLInputElement>(
				".break-trigger-time"
			)!.style.display = "none";
		}


    containerEl.createEl("h3", {text: "Advanced settings"});

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
				dropdown.onChange(async (value: scriptComplexityLevel) => {
					this.plugin.settings.scriptComplexity = value;
					await this.plugin.saveSettings();
				});
			});

	}
}