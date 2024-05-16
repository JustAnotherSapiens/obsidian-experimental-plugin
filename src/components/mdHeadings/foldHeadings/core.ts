import BundlePlugin, { BundlePluginComponent } from "main";

import {
  Setting,
  ToggleComponent,
  MarkdownView,
  Editor,
} from "obsidian";

import {
  cleanToggleFold,
  cleanToggleFoldOnSiblingHeadings,
  cleanToggleFoldOnChildrenHeadings,
} from "./utils";



export default class FoldHeadingsComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: {
    alwaysUnfoldParent: boolean,
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      alwaysUnfoldParent: false,
    };
  }


  onload() {
    this.addCommands();
  }

  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;

    // Generic Toggle Fold
		plugin.addCommand({
			id: "toggle-fold",
			name: "Toggle fold",
			icon: "fold-vertical",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				cleanToggleFold(editor, view);
			}
		});

    // Toggle Fold on Sibling Headings
		plugin.addCommand({
			id: "toggle-fold-sibling-headings",
			name: "Toggle fold on sibling headings",
			icon: "fold-vertical",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await cleanToggleFoldOnSiblingHeadings(editor, view);
			}
		});

    // Toggle Fold on Children Headings
		plugin.addCommand({
			id: "toggle-fold-children-headings",
			name: "Toggle fold on children headings",
			icon: "fold-vertical",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await cleanToggleFoldOnChildrenHeadings(editor, view);
			}
		});

  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
		containerEl.createEl("h3", {text: "Fold Settings"});

		new Setting(containerEl)
		  .setName("Always unfold parent when folding/unfolding children")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(plugin.settings.alwaysUnfoldParent);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.alwaysUnfoldParent = value;
					await plugin.saveSettings();
				});
			});
  }

}

