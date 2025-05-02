import {
  Notice,
  Setting,
  TextComponent,
} from "obsidian";

import BundlePlugin from "main";

import { PLUGIN_ID } from "utils/data";



type SettingKey = string;



// WARNING: Must NOT be called at the top scope, only within functions (so that
// all the required objects are defined)
// TODO: Remove the 'this.app' reference
export function getSetting(setting: SettingKey): any {
  return this.app.plugins.plugins[PLUGIN_ID].settings[setting];
}


export function shrinkSettingInputField(setting: Setting): void {
  setting.settingEl.addClass("shrink-input-setting");
}



////////////////////////////////////////
// Setting Classes
////////////////////////////////////////

export class DynamicSetting extends Setting {
  show(): void { this.settingEl.show(); }
  hide(): void { this.settingEl.hide(); }
}


export class FloatInputSetting extends DynamicSetting {

  constructor(containerEl: HTMLElement, plugin: BundlePlugin, options: {
    settingId: string,
    placeholder: string,
    min: number,
    max: number,
    default?: number | string,
  }) {
    super(containerEl);

    if (!(options.settingId in plugin.settings)) {
      throw new Error(`Setting "${options.settingId}" not found in plugin settings.`);
    }

    this.addText((textField: TextComponent) => {
      textField.inputEl.type = "number";
      textField.inputEl.min = String(options.min);
      textField.inputEl.max = String(options.max);
      textField.inputEl.step = "any";
      textField.setPlaceholder(options.placeholder);
      textField.setValue(String(plugin.settings[options.settingId]));
      textField.onChange(async (value: string) => {
        const newValue = Number(value);
        if (newValue > options.max || newValue < options.min) {
          new Notice(`Value should be between ${options.min} and ${options.max}`);
          let defaultValue = options.default ?? plugin.settings[options.settingId];
          if (typeof options.default === "string") defaultValue = plugin.settings[options.default];
          textField.setValue(String(defaultValue));
        }
        plugin.settings[options.settingId] = Number(textField.getValue());
        await plugin.saveSettings();
      });
    });
    this.setTooltip(
      `Value should be between ${options.min} and ${options.max}`,
      {placement: "top", delay: 350},
    );
    this.then(shrinkSettingInputField);
  }

  get input(): number {
    const inputEl = this.controlEl.querySelector("input") as HTMLInputElement;
    return Number(inputEl.value);
  }

  set input(value: number) {
    const inputEl = this.controlEl.querySelector("input") as HTMLInputElement;
    inputEl.value = String(value);
  }

}

