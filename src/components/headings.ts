import {
  App, TFile, fuzzySearch,
  Editor, MarkdownView, HeadingCache,
  Setting, Notice,
  ToggleComponent, DropdownComponent, TextComponent,
  SearchComponent,
} from "obsidian";

import BundlePlugin from "main";
import BundleComponent from "types";

import {
  getSetting,
  DynamicSetting,
} from "utils";

import {
  runQuickSuggest,
} from "components/sugggestUtils";




////////////////////////////////////////////////////////////////////////////////
// Heading Section Component
////////////////////////////////////////////////////////////////////////////////

type TargetFileSelection = "active" | "lastAccessed" | "manualSet";


export default class HeadingsComponent implements BundleComponent {

  parent: BundlePlugin;
  settings: {
    targetFileSelection: TargetFileSelection;
    manualSetFile: string;
  };
  targetFile: TFile | null;


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      targetFileSelection: "active",
      manualSetFile: "",
    };
  }


  setTargetFile(): void {
    const plugin = this.parent;

    switch (this.settings.targetFileSelection) {
      case "active":
        this.targetFile = plugin.app.workspace.getActiveFile();
        break;

      case "lastAccessed":
        const lastAccessedPath = plugin.app.workspace.getLastOpenFiles()[0];
        this.targetFile = plugin.app.vault.getAbstractFileByPath(lastAccessedPath) as TFile | null;
        break;

      case "manualSet":
        const manualSetPath = getSetting("manualSetFile");
        if (manualSetPath === "") this.targetFile = null;
        else this.targetFile = plugin.app.vault.getAbstractFileByPath(manualSetPath) as TFile | null;
        break;

      default:
        this.targetFile = null;
    }
  }


  onload(): void {
    this.addCommands();
    this.setTargetFile();
  }

  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;

    // Display Target File
    plugin.addCommand({
      id: "display-target-file",
      name: "Display Target File",
      icon: "target",
      callback: () => {
        new Notice(`Target file: ${this.targetFile ? this.targetFile.path : "No file set."}`, 3000);
      },
    });

    // Set Active File as Target
    plugin.addCommand({
      id: "set-active-file-as-target",
      name: "Set Active File as Target",
      icon: "target",
      callback: async () => {
        const mdView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!mdView) return;

        const activeFile = mdView.file;

        if (!activeFile) {
          new Notice("No active file.", 3000);

        } else {
          this.targetFile = activeFile;
          plugin.settings.targetFileSelection = "manualSet";
          plugin.settings.manualSetFile = activeFile.path;
          await plugin.saveSettings();

          new Notice(`Target file set to "${activeFile.path}"`, 3000);
        }
      },

    });

    // Set Target File from opened files
    plugin.addCommand({
      id: "set-target-file-from-opened-files",
      name: "Set Target File from Opened Files",
      icon: "crosshair",
      callback: async () => {
        const mdLeaves = plugin.app.workspace.getLeavesOfType("markdown");
        if (mdLeaves.length === 0) return;

        const mdViews = mdLeaves.map((leaf) => leaf.view as MarkdownView);
        const mdFiles = mdViews.map((view) => view.file);
        // const mdEditors = mdViews.map((view) => view.editor);

        const targetFile = await runQuickSuggest(plugin.app, mdFiles, (file: TFile) => file.basename);
        if (!targetFile) return;

        this.targetFile = targetFile;
        plugin.settings.targetFileSelection = "manualSet";
        plugin.settings.manualSetFile = targetFile.path;
        await plugin.saveSettings();

        new Notice(`Target file set to "${targetFile.path}"`, 3000);

      },

    });

    // Set Target File (from Vault files)
    //   - Sorted by last modified time.
    plugin.addCommand({
      id: "set-target-file-from-vault-files",
      name: "Set Target File from Vault Files",
      icon: "crosshair",
      callback: async () => {
        const vaultFiles = plugin.app.vault.getMarkdownFiles();
        if (vaultFiles.length === 0) return;

        vaultFiles.sort((a, b) => b.stat.mtime - a.stat.mtime);
        const targetFile = await runQuickSuggest(plugin.app, vaultFiles, (file: TFile) => file.basename);
        if (!targetFile) return;

        this.targetFile = targetFile;
        plugin.settings.targetFileSelection = "manualSet";
        plugin.settings.manualSetFile = targetFile.path;
        await plugin.saveSettings();

        new Notice(`Target file set to "${targetFile.path}"`, 3000);

      },
    });

  }


  addRibbonIcons(): void {}
  addStatusBarItems(): void {}
  addEventsAndIntervals(): void {}


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

    containerEl.createEl("h2", {text: "Heading Section"});

    const setManualSetFileSetting = () => new DynamicSetting(containerEl)
      .setName("Manual Set File")
      .setDesc("Set the file to move the heading section.")
      .addSearch((search: SearchComponent) => {
        search
          .setPlaceholder("Search for a file")
          .setValue(plugin.settings.manualSetFile)
          .onChange(async (value: string) => {
            // Check if the file exists.
            const file = plugin.app.vault.getAbstractFileByPath(value);
            if (!file || !(file instanceof TFile)) return;
            plugin.settings.manualSetFile = value;
            await plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Target File Selection")
      .setDesc("File selection method for moving the heading section.")
      .then((setting: Setting) => {
        const manualSetFileSetting = setManualSetFileSetting();
        const dynamicSwitch = () => {
          if (plugin.settings.targetFileSelection === "manualSet")
            manualSetFileSetting.show();
          else manualSetFileSetting.hide();
        };
        dynamicSwitch();

        setting.addDropdown((dropdown: DropdownComponent) => {
          dropdown
            .addOptions({
              active: "Active File",
              lastAccessed: "Last Accessed File",
              manualSet: "Manual Set File",
            })
            .setValue(plugin.settings.targetFileSelection)
            .onChange(async (value: TargetFileSelection) => {
              plugin.settings.targetFileSelection = value;
              dynamicSwitch();
              this.setTargetFile();
              plugin.settings.manualSetFile = this.targetFile ? this.targetFile.path : "";
              await plugin.saveSettings();
            });
        });
      });

  }

}


