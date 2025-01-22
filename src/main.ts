
// REFERENCES
// - Project Page: https://github.com/JustAnotherSapiens/obsidian-experimental-plugin
// - Sample Plugin: https://github.com/obsidianmd/obsidian-sample-plugin
// - Obsidian Docs: https://docs.obsidian.md/Home
// - Lucide Icons: https://lucide.dev/



import {
  Plugin,
  PluginSettingTab,
  Setting,
  ToggleComponent,
  App,
} from "obsidian";

import HeadingExtractorComponent from "components/mdHeadings/headingExtractor/core";
import MoveToHeadingComponent from "components/mdHeadings/moveToHeading/core";
import FoldHeadingsComponent from "components/mdHeadings/foldHeadings/core";
import HeadingExtraToolsComponent from "components/mdHeadings/headingExtraTools/core";

import TextFormatComponent from "components/others/textFormat/core";
import MiscellaneousComponent from "components/others/miscellaneous/core";

import TimeComponent from "components/experimental/time/core";
import SuggestComponent from "components/experimental/suggest/core";
import ScriptRunnerComponent from "components/experimental/scriptRunner/core";



export interface BundlePluginComponent {
  settings: { [key: string]: any };
  parent: Plugin;
  onload(): void | Promise<void>;
  onunload(): void | Promise<void>;
  addSettings(containerEl: HTMLElement): void;
}



export default class BundlePlugin extends Plugin {
  settings: { [key: string]: any };
  components: BundlePluginComponent[];


  async onload() {
    console.log("Loading Bundle Plugin");

    this.components = [
      new HeadingExtractorComponent(this),
      new MoveToHeadingComponent(this),
      new FoldHeadingsComponent(this),
      new HeadingExtraToolsComponent(this),

      new TextFormatComponent(this),
      new MiscellaneousComponent(this),

      new TimeComponent(this),
      new SuggestComponent(this),
      new ScriptRunnerComponent(this),
    ];

    await this.loadSettings();

    this.components.forEach(async (component: BundlePluginComponent) => {
      await component.onload();
    });

    this.addSettingTab(new BundleSettingTab(this.app, this));
  }


  async onunload() {
    console.log("Unloading Bundle Plugin");

    this.components.forEach(async (component: BundlePluginComponent) => {
      await component.onunload();
    });
  }


  async loadSettings() {

    // Any GLOBAL settings can be declared here.
    let bundleSettings: {[key: string]: any} = {
      showSuggestInstructions: true,
    };

    this.components.forEach((component: BundlePluginComponent) => {
      bundleSettings = { ...bundleSettings, ...component.settings };
    });

    this.settings = Object.assign({}, bundleSettings, await this.loadData());
  }


  async saveSettings() {
    await this.saveData(this.settings);
  }

}



class BundleSettingTab extends PluginSettingTab {
  plugin: BundlePlugin;


  constructor(app: App, plugin: BundlePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }


  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h1", { text: "Bundle Settings" });
		containerEl.createEl("br");

    this.plugin.components.forEach((component: BundlePluginComponent) => {
      component.addSettings(containerEl);
      containerEl.createEl("br");
    });

		containerEl.createEl("br");

    // Global Settings
    containerEl.createEl("h3", { text: "Global Settings" });

    // Suggest Prompt Instructions visible by default
    new Setting(containerEl)
      .setName("Suggest Prompt Instructions visible by default")
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(this.plugin.settings.showSuggestInstructions);
        toggle.onChange(async (value: boolean) => {
          this.plugin.settings.showSuggestInstructions = value;
          await this.plugin.saveSettings();
        });
      });

		containerEl.createEl("br");

		containerEl.createDiv("warning-banner", (banner: HTMLDivElement) => {
			banner.createEl("h4", {
				text: "⚠ WARNING ⚠"
			});
			banner.createEl("p", {
				cls: "warning-banner-text",
				text: "The functionality in this plugin is experimental. Use it at your own risk!"
			});
		});
	
  }

}

