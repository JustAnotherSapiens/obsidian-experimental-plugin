import BundlePlugin, { BundlePluginComponent } from "main";

import {
  Setting,
  TextComponent,
  ToggleComponent,
  DropdownComponent,
  ButtonComponent,
  SliderComponent,
  App,
  Notice,
  MarkdownView,
  Editor,
} from "obsidian";

import {
  cutHeadingSection,
  sortSiblingHeadings,
} from "./utils";



export default class HeadingExtraToolsComponent implements BundlePluginComponent {

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

    // Cut Heading Section
    plugin.addCommand({
      id: "cut-heading-section",
      name: "Cut Heading Section",
      icon: "scissors",
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        cutHeadingSection(editor);
      }
    });

    // Sort Sibling Headings
    plugin.addCommand({
      id: "sort-sibling-headings",
      name: "Sort Sibling Headings",
      icon: "sort-asc",
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await sortSiblingHeadings(plugin.app, editor, view);
      }
    });

  }


  addRibbonIcons(): void {}
  addStatusBarItems(): void {}
  addEventsAndIntervals(): void {}


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
  }

}

