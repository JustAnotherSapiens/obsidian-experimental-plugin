import {
  App, TFile, fuzzySearch,
  Editor, MarkdownView, HeadingCache,
  Setting, Notice,
  ToggleComponent, DropdownComponent, TextComponent,
  SearchComponent,
  BaseComponent,
} from "obsidian";

import BundlePlugin from "main";
import BundleComponent from "types";

import {
  runQuickSuggest,
} from "components/sugggestUtils";




////////////////////////////////////////////////////////////////////////////////
// Heading Section Component
////////////////////////////////////////////////////////////////////////////////

type TargetFileMethod = "active" | "lastAccessed" | "manualSet";


export default class HeadingsComponent implements BundleComponent {

  parent: BundlePlugin;
  settings: {
    targetFileMethod: TargetFileMethod;
    targetFilePath: string;
  };
  targetFile: TFile | null;
  targetFileComponent: SearchComponent;


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      targetFileMethod: "active",
      targetFilePath: "",
    };
  }



  onload(): void {
    this.addCommands();
    this.resolveTargetFile();
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
        new Notice(`Target File: "${plugin.settings.targetFilePath}"`, 3000);
      },
    });

    // Set Active File as Target
    plugin.addCommand({
      id: "set-active-file-as-target",
      name: "Set Active File as Target",
      icon: "target",
      callback: async () => {
        const activeFile = plugin.app.workspace.getActiveFile();
        if (!activeFile) return;

        await this.manuallySetTargetFile(activeFile);
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

        await this.manuallySetTargetFile(targetFile);
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

        await this.manuallySetTargetFile(targetFile);
      },

    });

  }


  async manuallySetTargetFile(file: TFile): Promise<void> {
    this.targetFile = file;
    this.parent.settings.targetFileMethod = "manualSet";
    this.parent.settings.targetFilePath = file.path;
    await this.parent.saveSettings();
    new Notice(`Target File set to: "${file.path}"`, 3000);
  }


  async resolveTargetFile(): Promise<void> {
    const plugin = this.parent;
    const getFile = (path: string) => plugin.app.vault.getAbstractFileByPath(path) as TFile | null;

    switch (plugin.settings.targetFileMethod) {
      case "manualSet":
        this.targetFile = getFile(plugin.settings.targetFilePath);
        break;
      case "lastAccessed":
        this.targetFile = getFile(plugin.app.workspace.getLastOpenFiles()[0]);
        break;
      case "active":
        this.targetFile = plugin.app.workspace.getActiveFile();
        break;
    }

    const filePath = this.targetFile?.path ?? "";

    this.targetFileComponent?.setValue(filePath);

    plugin.settings.targetFilePath = filePath;
    await plugin.saveSettings();

    const message = `Target File resolved to: "${filePath}"`;
    console.log(message);
    new Notice(message, 3000);
  }



  addRibbonIcons(): void {}
  addStatusBarItems(): void {}
  addEventsAndIntervals(): void {}


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

    containerEl.createEl("h2", {text: "Headings"});

    new Setting(containerEl)
      .setName("Target File Method")
      .addDropdown((dropdown: DropdownComponent) => {
        dropdown
          .addOptions({
            active: "Active File",
            lastAccessed: "Last Accessed File",
            manualSet: "Manually Set File",
          })
          .setValue(plugin.settings.targetFileMethod)
          .onChange(async (value: TargetFileMethod) => {
            plugin.settings.targetFileMethod = value;
            await this.resolveTargetFile();
          });
      })

    new Setting(containerEl)
      .setName("Target File")
      .then((setting: Setting) => {
        const fragment = document.createDocumentFragment();
        fragment.createEl("b", { text: "NOTE: "});
        fragment.createEl("span", { text: "It updates every time before any plugin functionality." });
        setting.setDesc(fragment);
      })
      .addSearch((search: SearchComponent) => {
        this.targetFileComponent = search
          .setPlaceholder("Search for a file")
          .setValue(plugin.settings.targetFilePath ?? "")
          .onChange(async (value: string) => {
            const file = plugin.app.vault.getAbstractFileByPath(value);
            if (!file || !(file instanceof TFile)) return;
            await this.manuallySetTargetFile(file);
          });
        // search.inputEl.style.width = "100%";
      })
      .then((setting: Setting) => {
        setting.settingEl.style.display = "flex";
        setting.settingEl.style.flexDirection = "column";
        setting.settingEl.style.gap = "5px";
        // setting.settingEl.style.gridTemplateColumns = "2fr 3fr";
      })

  }



}


