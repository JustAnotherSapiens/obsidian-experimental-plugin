import {
  Setting,
  ToggleComponent,
	DropdownComponent,
	TextComponent,
	ButtonComponent,
} from "obsidian";

import BundlePlugin from "main";
import { BundleComponent } from "main";


const scriptComplexityLevels = [
  "Minimal",
  "Simple",
  "Intermediate",
  "Advanced",
  "Expert",
  "God",
] as const;
type ScriptComplexityLevel = typeof scriptComplexityLevels[number];



export default class DemoScriptComponent implements BundleComponent {

  parent: BundlePlugin;
  settings: {
    scriptsPath: string,
    vimModeScripts: boolean,
    scriptComplexity: ScriptComplexityLevel,
    emergencyBreak: boolean,
    breakTriggerTime: number,
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      scriptsPath: "",
      vimModeScripts: false,
      scriptComplexity: "Minimal",
      emergencyBreak: false,
      breakTriggerTime: 1000,
    };
  }

	onload() {
		this.addCommands();
	}

  onunload(): void {}

  addCommands(): void {
    const plugin = this.parent;
  }

  addRibbonIcons(): void {}
  addStatusBarItems(): void {}
  addEventsAndIntervals(): void {}

  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

    containerEl.createEl("h3", {text: "Script Runner Settings"});

		/* Basic Settings */

		// Scripts Path
		new Setting(containerEl)
			.setName("Scripts path")
			.setDesc("Path to the folder containing your scripts")
			.addText((textField: TextComponent) => {
				textField.setPlaceholder("scripts_path");
				textField.setValue(plugin.settings.scriptsPath);
				textField.onChange(async (value: string) => {
					plugin.settings.scriptsPath = value;
					await plugin.saveSettings();
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
				textField.setValue(String(plugin.settings.breakTriggerTime));
				textField.onChange(async (value: string) => {
					plugin.settings.breakTriggerTime = Number(value);
					await plugin.saveSettings();
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
							const newTime = plugin.settings.breakTriggerTime + Number(millisecs);
							if (newTime < 0) return;
							textField.setValue(String(newTime));
							plugin.settings.breakTriggerTime = newTime;
							await plugin.saveSettings();
						});
					});
				};
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
					toggle.setValue(plugin.settings.emergencyBreak);
					toggle.onChange(async (value: boolean) => {
						if (value) breakTriggerTime.settingEl.show();
						else breakTriggerTime.settingEl.hide();
						plugin.settings.emergencyBreak = value;
						await plugin.saveSettings();
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
				toggle.setValue(plugin.settings.vimModeScripts);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.vimModeScripts = value;
					await plugin.saveSettings();
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
				dropdown.setValue(plugin.settings.scriptComplexity);
				dropdown.onChange(async (value: ScriptComplexityLevel) => {
					plugin.settings.scriptComplexity = value;
					await plugin.saveSettings();
				});
			});

  }

}