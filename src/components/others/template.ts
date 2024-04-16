import {
  App,
  MarkdownView,
  Editor,
  Setting,
  Notice,
  TextComponent,
  ToggleComponent,
  DropdownComponent,
} from "obsidian";

import BundlePlugin from "main";
import { BundleComponent } from "main";

import {
  getSetting,
  getActiveFileCache,
  getHeadingIndex,
  scrollToCursor,
} from "utils/utilsCore";




export default class TemplateComponent implements BundleComponent {

  parent: BundlePlugin;
  settings: {
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
    };
  }

  onload(): void {
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
  }

}