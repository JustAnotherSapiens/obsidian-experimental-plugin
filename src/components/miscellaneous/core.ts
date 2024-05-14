import {
  App,
  MarkdownView,
  Editor,
} from "obsidian";

import BundlePlugin from "main";
import { BundlePluginComponent } from "main";



export default class MiscellaneousComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: {
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
    };
  }

  onload() {
    this.addCommands();
  }

  onunload(): void {}

  addCommands(): void {
    const plugin = this.parent;

		/* TOGGLE CONFIG OPTIONS */

		// Toggle Line Numbers
		plugin.addCommand({
			id: "toggle-line-numbers",
			name: "Toggle line numbers",
			icon: "list-ordered",
      editorCallback: (editor: Editor) => {
        const vault = plugin.app.vault as any;
        // Already accounts for the case where the config was never set
        vault.setConfig("showLineNumber", !vault.getConfig("showLineNumber"));
        editor.refresh();
      },
		});

		// Toggle Vim Mode (and Vim-related plugins)
		plugin.addCommand({
			id: "toggle-vim-mode",
			name: "Toggle Vim mode",
			icon: "code",
      // TODO: Make a togglePlugin function
			callback: () => {
				const vimPlugins = ["obsidian-vimrc-support"];
				const app = plugin.app as any;
				const vimMode = app.vault.getConfig("vimMode");
				if (vimMode) {
					vimPlugins.forEach((pluginId: string) => {
						if (app.plugins.enabledPlugins.has(pluginId))
							app.plugins.disablePluginAndSave(pluginId);
					});
				} else {
					vimPlugins.forEach((pluginId: string) => {
						if (app.plugins.manifests.hasOwnProperty(pluginId))
							app.plugins.enablePluginAndSave(pluginId);
					});
				}
				app.vault.setConfig("vimMode", !vimMode);
			}
		});

		/* MOVE CURRENT TAB */

		// Move current tab left
		plugin.addCommand({
			id: "move-current-tab-left",
			name: "Move current tab left",
			icon: "chevrons-left",
			callback: () => moveCurrentTab.call(plugin, "left"),
		});

		// Move current tab right
		plugin.addCommand({
			id: "move-current-tab-right",
			name: "Move current tab right",
			icon: "chevrons-right",
			callback: () => moveCurrentTab.call(plugin, "right"),
		});

  }

  addRibbonIcons(): void {}
  addStatusBarItems(): void {}
  addEventsAndIntervals(): void {}

  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
  }

}



/* UI FUNCTIONS */


export function moveCurrentTab(
  direction: "left" | "right"
) {
  const activeTabGroup = this.app.workspace.activeTabGroup;
  const tabsArray = activeTabGroup.children;
  const currentTabIdx = activeTabGroup.currentTab;

  const forward = direction === "right";
  const newCurrentTabIdx = moveArrayElement(tabsArray, currentTabIdx, forward);

  activeTabGroup.currentTab = newCurrentTabIdx;
  activeTabGroup.updateTabDisplay();
}


// NOTE: This function modifies the original array.
function moveArrayElement(
  arr: any[],
  index: number,
  forward: boolean
) {
  // Remove the element from the array
  var element = arr.splice(index, 1)[0];
  var newIndex;

  if (forward) {
    // If moving forward and at the end of the array, wrap around to the beginning
    if (index === arr.length) {
        arr.unshift(element);
        newIndex = 0;
    } else {
        arr.splice(index + 1, 0, element);
        newIndex = index + 1;
    }
  } else {
    // If moving backward and at the start of the array, wrap around to the end
    if (index === 0) {
      arr.push(element);
      newIndex = arr.length - 1;
    } else {
      arr.splice(index - 1, 0, element);
      newIndex = index - 1;
    }
  }

  return newIndex;
}


