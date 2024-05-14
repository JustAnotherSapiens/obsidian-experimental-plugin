
// REFERENCES
// - Project Page: https://github.com/JustAnotherSapiens/obsidian-experimental-plugin
// - Sample Plugin: https://github.com/obsidianmd/obsidian-sample-plugin
// - Obsidian Docs: https://docs.obsidian.md/Home
// - Lucide Icons: https://lucide.dev/



import { Plugin, PluginSettingTab, App } from "obsidian";

import HeadingExtractorComponent from "components/headingExtractor/headingComponent";
import FoldHeadingsComponent from "components/foldHeadings/foldHeadings";
import MoveToHeadingComponent from "components/moveToHeading/moveToHeading";

import SuggestComponent from "components/suggest/suggest";
import TimeComponent from "components/time/timeCore";

import ScriptRunnerComponent from "components/scriptRunner/scriptRunner";
import MdEditingComponent from "components/mdEditing/mdEditing";
import MiscelaneousComponent from "components/miscellaneous/miscelaneous";



export interface BundleComponent {
  settings: { [key: string]: any };
  parent: Plugin;
  onload(): void | Promise<void>;
  onunload(): void | Promise<void>;
  addSettings(containerEl: HTMLElement): void;
}



export default class BundlePlugin extends Plugin {
  settings: { [key: string]: any };
  components: BundleComponent[];


  async onload() {
    console.log("Loading Bundle Plugin");

    this.components = [
      new HeadingExtractorComponent(this),
      new FoldHeadingsComponent(this),
      new MoveToHeadingComponent(this),

      new SuggestComponent(this),
      new TimeComponent(this),

      new ScriptRunnerComponent(this),
      new MdEditingComponent(this),
      new MiscelaneousComponent(this),
    ];

    await this.loadSettings();

    this.components.forEach(async (component: BundleComponent) => {
      await component.onload();
    });

    this.addSettingTab(new BundleSettingTab(this.app, this));
  }


  async onunload() {
    console.log("Unloading Bundle Plugin");

    this.components.forEach(async (component: BundleComponent) => {
      await component.onunload();
    });
  }


  async loadSettings() {
    let bundleSettings: {[key: string]: any} = {};
    this.components.forEach((component: BundleComponent) => {
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

    this.plugin.components.forEach((component: BundleComponent) => {
      component.addSettings(containerEl);
      containerEl.createEl("br");
    });

		containerEl.createEl("br");

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

}

