import { App, PluginSettingTab, Setting } from 'obsidian';
import ExperimentalPlugin from './main';

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

    containerEl.createEl('h1', {text: 'Script Runner Settings'});

    containerEl.createEl('h3', {text: 'Basic settings'});

		new Setting(containerEl)
			.setName('Scripts path')
			.setDesc('Path to the folder containing your scripts')
			.addText((text) => text
				.setPlaceholder('scripts_path')
				.setValue(this.plugin.settings.scriptsPath)
				.onChange(async (value) => {
					this.plugin.settings.scriptsPath = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Emergency break')
			.setDesc('Break scripts if they take too long to run')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.emergencyBreak)
				.onChange(async (value) => {
					this.plugin.settings.emergencyBreak = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Break trigger time')
			.setDesc('Time in milliseconds before a script is stopped')
      .setClass('script-runner-break-trigger-time')
      .addButton(async (button) => {
        button.setButtonText('-500 ms')
          .onClick(async () => {
            const newBreakTriggerTime = this.plugin.settings.breakTriggerTime - 500;
            // Update the UI text field
            this.containerEl.querySelector<HTMLInputElement>(
              '.script-runner-break-trigger-time input'
            )!.value = String(newBreakTriggerTime);
            // Set the new value of the setting
            this.plugin.settings.breakTriggerTime = newBreakTriggerTime;
            await this.plugin.saveSettings();
          });
      })
      .addButton(async (button) => {
        button.setButtonText('+500 ms')
          .onClick(async () => {
            const newBreakTriggerTime = this.plugin.settings.breakTriggerTime + 500;
            // Update the UI text field
            this.containerEl.querySelector<HTMLInputElement>(
              '.script-runner-break-trigger-time input'
            )!.value = String(newBreakTriggerTime);
            // Set the new value of the setting
            this.plugin.settings.breakTriggerTime = newBreakTriggerTime;
            await this.plugin.saveSettings();
          });
      })
			.addText((textField) => {
				textField.setPlaceholder('time_in_milliseconds');
				textField.inputEl.type = 'number';
				textField.setValue(String(this.plugin.settings.breakTriggerTime));
				textField.onChange(async (value) => {
					this.plugin.settings.breakTriggerTime = Number(value);
					await this.plugin.saveSettings();
				});
			}
			);

		new Setting(containerEl)
			.setName('Vim mode scripts')
			.setDesc('Enable scripts for vim mode')
			.addToggle((toggle) => toggle
				.setTooltip('Only activate this if you have vim mode enabled')
				.setValue(this.plugin.settings.vimModeScripts)
				.onChange(async (value) => {
					this.plugin.settings.vimModeScripts = value;
					await this.plugin.saveSettings();
				})
			);

    containerEl.createEl('h3', {text: 'Advanced settings'});

		new Setting(containerEl)
			.setName('Script complexity')
			.setDesc('Filter the scripts you want to run based on their complexity')
      .setClass('script-runner-script-complexity')
			.addDropdown((dropdown) => {
        scriptComplexityLevels.forEach((compexityLevel) => {
          dropdown.addOption(compexityLevel, compexityLevel);
        });
				// Always call setValue after adding options to dropdown
				dropdown.setValue(this.plugin.settings.scriptComplexity);
				dropdown.onChange(async (value: scriptComplexityLevel) => {
					this.plugin.settings.scriptComplexity = value;
					await this.plugin.saveSettings();
				});
			});

	}
}