import { Plugin, PluginSettingTab, App } from "obsidian";

import BundleComponent from "types";

import FoldComponent from "components/fold";
import MoveComponent from "components/move";
import HelperComponent from "components/helper";
import ScriptComponent from "components/script";
import TimeComponent from "components/time";
import EditComponent from "components/edit";
import SuggestComponent from "components/suggest";



export default class BundlePlugin extends Plugin {
  settings: { [key: string]: any };
  components: BundleComponent[];


  async onload() {
    console.log("Loading Bundle Plugin");

    this.components = [
      new FoldComponent(this),
      new MoveComponent(this),
      new HelperComponent(this),
      new ScriptComponent(this),
      new TimeComponent(this),
      new EditComponent(this),
      new SuggestComponent(this),
    ]

    await this.loadSettings();

    this.components.forEach((component: BundleComponent) => {
      component.onload();
    });

    this.addSettingTab(new BundleSettingTab(this.app, this));
  }


  async onunload() {
    console.log("Unloading Bundle Plugin");

    this.components.forEach((component: BundleComponent) => {
      component.onunload();
    });
  }


  async loadSettings() {
    let bundleSettings = {};
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

    containerEl.createEl("h2", { text: "Bundle Settings" });

    this.plugin.components.forEach((component) => {
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


// Find icons on: https://lucide.dev/