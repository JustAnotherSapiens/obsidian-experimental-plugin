import {
  App,
  MarkdownView,
  Editor,
  TFile,
  Setting,
  Notice,
  SearchComponent,
  DropdownComponent,
  ButtonComponent,
  MarkdownFileInfo,
  ToggleComponent,
} from "obsidian";

import BundlePlugin from "main";
import { BundleComponent } from "main";
import { DataNode } from "dataStructures/generics";
import { runQuickSuggest } from "components/suggest/suggestUtils";
import { Heading } from "components/headings/headingUtils"
import { HeadingTreeSuggest } from "components/headings/headingSuggests";

import {
  HeadingExtractor,
} from "dataStructures/mdHeadings";



////////////////////////////////////////////////////////////////////////////////
// Heading Section Component
////////////////////////////////////////////////////////////////////////////////

type TargetFileMethod = "active" | "lastAccessed" | "manualSet";


export default class HeadingComponent implements BundleComponent {

  parent: BundlePlugin;
  settings: {
    targetFileMethod: TargetFileMethod;
    targetFilePath: string;
    suggestStartFlat: boolean;
  };
  targetFile: TFile | null;
  targetFileComponent: SearchComponent;


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      targetFileMethod: "active",
      targetFilePath: "",
      suggestStartFlat: true,
    };
  }

  async onload(): Promise<void> {
    this.addCommands();
    await this.resolveTargetFile();
  }

  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;

    // Set Active File as Target
    plugin.addCommand({
      id: "set-active-file-as-target",
      name: "Set Active File as Target",
      icon: "target",
      callback: this.setActiveFileAsTarget.bind(this),
    });

    // Set Target File from opened files
    plugin.addCommand({
      id: "set-target-file-from-opened-files",
      name: "Set Target File from Opened Files",
      icon: "crosshair",
      callback: this.setTargetFileFromOpenedFiles.bind(this),
    });

    // Set Target File (from Vault files)
    //   - Sorted by last modified time.
    plugin.addCommand({
      id: "set-target-file-from-vault-files",
      name: "Set Target File from Vault Files",
      icon: "crosshair",
      callback: this.setTargetFileFromVaultFiles.bind(this),

    });

    // DataNodeSuggest for HeadingsTree of Target File
    plugin.addCommand({
      id: "suggest-headings-tree",
      name: "Suggest Headings Tree",
      icon: "list",
      callback: async () => {
        await this.resolveTargetFile();
        if (!this.targetFile) {
          new Notice("No target file selected.");
          return;
        }

        const headingTreeSuggest = new HeadingTreeSuggest(
          plugin.app,
          (node: DataNode<Heading>) => (node.data as Heading).header.text,
          this.targetFile
        );

        await headingTreeSuggest.open();
      },
    });

    // Extract Heading at Cursor Position
    plugin.addCommand({
      id: "extract-heading-at-cursor",
      name: "Extract Heading at Cursor",
      icon: "list",
      editorCallback: async (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
        await this.resolveTargetFile();
        if (!this.targetFile) {
          new Notice("No target file selected.");
          return;
        }

        const extractor = new HeadingExtractor(this.parent.app, ctx);
        await extractor.extractAndInsertHeading(this.targetFile, {
          extractAtCursor: true,
          endAtInsertion: false,
          startFlat: plugin.settings.suggestStartFlat,
        });

      },
    });

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
  }


  async manuallySetTargetFile(file: TFile): Promise<void> {
    this.targetFile = file;
    this.parent.settings.targetFileMethod = "manualSet";
    this.parent.settings.targetFilePath = file.path;
    this.targetFileComponent?.setValue(file.path);
    await this.parent.saveSettings();
  }


  async setActiveFileAsTarget(): Promise<void> {
    const activeFile = this.parent.app.workspace.getActiveFile();
    if (!activeFile) return;
    await this.manuallySetTargetFile(activeFile);
  }


  async setTargetFileFromOpenedFiles(): Promise<void> {
    const mdLeaves = this.parent.app.workspace.getLeavesOfType("markdown");
    if (mdLeaves.length === 0) return;

    const mdFiles = mdLeaves.map((leaf) => (leaf.view as MarkdownView).file);
    const targetFile = await runQuickSuggest(this.parent.app, mdFiles,
      (file: TFile) => file.path.slice(0, -3)
    );
    if (!targetFile) return;

    await this.manuallySetTargetFile(targetFile);
  }


  async setTargetFileFromVaultFiles(): Promise<void> {
    const vaultFiles = this.parent.app.vault.getMarkdownFiles();
    if (vaultFiles.length === 0) return;

    vaultFiles.sort((a, b) => b.stat.mtime - a.stat.mtime);
    const targetFile = await runQuickSuggest(this.parent.app, vaultFiles,
      (file: TFile) => file.path.slice(0, -3)
    );
    if (!targetFile) return;

    await this.manuallySetTargetFile(targetFile);
  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

    containerEl.createEl("h2", {text: "Headings"});

    new Setting(containerEl)
      .setName("Suggest Start Flat")
      .then((setting: Setting) => {
        const fragment = document.createDocumentFragment();
        fragment.createEl("span", {
          text: "When opening a Heading Tree Suggest it will start with a flat list of headings."
        });
        fragment.createEl("br");
        fragment.createEl("span", {
          text: "If this is disabled, it will start with a tree structure."
        });
        fragment.createEl("br");
        fragment.createEl("br");
        const noteSpan = fragment.createEl("span");
        const noteHTML = `<b>NOTE:</b> Use the navigation hotkeys <kbd>Alt + h/l</kbd> to step in and out of a heading (similar to the standard Vim navigation keys h/j/k/l but while pressing the Alt key).`;
        noteSpan.innerHTML = noteHTML;
        setting.setDesc(fragment);
      })
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(plugin.settings.suggestStartFlat);
        toggle.onChange(async (value: boolean) => {
          plugin.settings.suggestStartFlat = value;
          await plugin.saveSettings();
        });
      });

    const setTargetFileSetter = () => new Setting(containerEl)
      .setName("Set Target File from:")
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText("Active File")
          .onClick(this.setActiveFileAsTarget.bind(this));
      })
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText("Opened Files")
          .onClick(this.setTargetFileFromOpenedFiles.bind(this));
      })
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText("Vault Files")
          .onClick(this.setTargetFileFromVaultFiles.bind(this));
      })
      .then((setting: Setting) => {
        setting.controlEl.style.display = "flex";
        setting.controlEl.style.flexDirection = "row";
        setting.controlEl.style.flexWrap = "wrap";
        for (let i = 0; i < setting.controlEl.children.length; i++) {
          const button = setting.controlEl.children[i] as HTMLElement;
          button.style.flex = "1";
        }
      });

    new Setting(containerEl)
      .setName("Target File Method")
      .then((setting: Setting) => {
        const targetFileSetter = setTargetFileSetter();
        setting.addDropdown((dropdown: DropdownComponent) => {
          dropdown.addOptions({
            active: "Active File",
            lastAccessed: "Last Accessed File",
            manualSet: "Manually Set File",
          });
          dropdown.setValue(plugin.settings.targetFileMethod);
          dropdown.onChange(async (value: TargetFileMethod) => {
            if (value === 'manualSet')
              targetFileSetter.settingEl.show();
            else targetFileSetter.settingEl.hide();
            plugin.settings.targetFileMethod = value;
            await this.resolveTargetFile();
          });
          if (plugin.settings.targetFileMethod === 'manualSet')
            targetFileSetter.settingEl.show();
          else targetFileSetter.settingEl.hide();
        });
      });

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
      })
      .then((setting: Setting) => {
        setting.settingEl.style.display = "flex";
        setting.settingEl.style.flexDirection = "column";
        setting.settingEl.style.alignItems = "start";
        setting.settingEl.style.gap = "10px";

        setting.infoEl.style.marginRight = "0px";

        setting.controlEl.style.width = "100%";
        (setting.controlEl.children[0] as HTMLElement).style.width = "100%";
      });

  }

}

