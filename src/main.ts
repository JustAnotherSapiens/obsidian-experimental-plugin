import { Plugin, PluginSettingTab, App } from "obsidian";

import BundleComponent from "types";

import HelperComponent from "components/helper";
import SuggestComponent from "components/suggest";
import MoveComponent from "components/move";
import FoldComponent from "components/fold";
import TimeComponent from "components/time";
import EditComponent from "components/edit";
import ScriptComponent from "components/script";
import HeadingsComponent from "components/headings";



export default class BundlePlugin extends Plugin {
  settings: { [key: string]: any };
  components: BundleComponent[];


  async onload() {
    console.log("Loading Bundle Plugin");

    this.components = [
      new HeadingsComponent(this),
      new HelperComponent(this),
      new SuggestComponent(this),
      new MoveComponent(this),
      new FoldComponent(this),
      new TimeComponent(this),
      new EditComponent(this),
      new ScriptComponent(this),
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