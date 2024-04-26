import { Plugin, PluginSettingTab, App } from "obsidian";

import HeadingComponent from "components/headings/headingComponent";
import FoldHeadingsComponent from "components/headings/foldHeadings";
import MoveToHeadingComponent from "components/headings/moveToHeading";

import SuggestComponent from "components/suggest/suggest";
import TimeComponent from "components/time/timeCore";

import ScriptRunnerComponent from "components/others/scriptRunner";
import MdEditingComponent from "components/others/mdEditing";
import MiscelaneousComponent from "components/others/miscelaneous";


export interface BundleComponent {
  settings: { [key: string]: any };
  parent: Plugin;
  onload(): void;
  onunload(): void;
  // addCommands(): void;
  // addRibbonIcons(): void;
  // addStatusBarItems(): void;
  // addEventsAndIntervals(): void;
  addSettings(containerEl: HTMLElement): void;
}



export default class BundlePlugin extends Plugin {
  settings: { [key: string]: any };
  components: BundleComponent[];


  async onload() {
    console.log("Loading Bundle Plugin");

    this.components = [
      new HeadingComponent(this),
      new FoldHeadingsComponent(this),
      new MoveToHeadingComponent(this),

      new SuggestComponent(this),
      new TimeComponent(this),

      new ScriptRunnerComponent(this),
      new MdEditingComponent(this),
      new MiscelaneousComponent(this),
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