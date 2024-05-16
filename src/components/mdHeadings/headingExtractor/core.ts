import BundlePlugin, { BundlePluginComponent } from "main";

import {
  Setting,
  ButtonComponent,
  SearchComponent,
  ToggleComponent,
  DropdownComponent,
  Notice,
  MarkdownView,
  MarkdownFileInfo,
  TFile,
  Editor,
} from "obsidian";

import { hotkeyHTML } from "utils/display";

import {
  targetFileAssertion,
  resolveTargetFile,
  manuallySetTargetFile,
  setActiveFileAsTarget,
  setTargetFileFromOpenedFiles,
  setTargetFileFromVaultFiles,
} from "./utils/targetFile";

import HeadingExtractor from "./classes/headingExtractor";



type TargetFileMethod = "active" | "lastAccessed" | "manualSet";



export default class HeadingExtractorComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: {
    targetFileMethod: TargetFileMethod;
    targetFilePath: string;
    suggestStartFlat: boolean;
    insertionSkewedUpwards: boolean;
  };
  targetFile: TFile | null;
  targetFileComponent: SearchComponent;


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      targetFileMethod: "active",
      targetFilePath: "",
      suggestStartFlat: true,
      insertionSkewedUpwards: false,
    };
  }


  async onload(): Promise<void> {
    this.addCommands();
    await resolveTargetFile.bind(this)();
  }


  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;

    // Toggle Insertion Skew Direction
    plugin.addCommand({
      id: "toggle-insertion-skew-direction",
      name: "Toggle Insertion Skew Direction",
      callback: async () => {
        const newSkew = !plugin.settings.insertionSkewedUpwards;
        plugin.settings.insertionSkewedUpwards = newSkew;
        new Notice(`Insertion skewed ${newSkew ? "upwards" : "downwards"}`, 2000);
        await plugin.saveSettings();
      },
    });

    // Set Active File as Target
    plugin.addCommand({
      id: "set-active-file-as-target",
      name: "Set Active File as Target",
      icon: "target",
      callback: async () => {
        targetFileAssertion.bind(this)(await setActiveFileAsTarget.bind(this)());
      },
    });

    // Set Target File from opened files
    plugin.addCommand({
      id: "set-target-file-from-opened-files",
      name: "Set Target File from Opened Files",
      icon: "crosshair",
      callback: async () => {
        targetFileAssertion.bind(this)(await setTargetFileFromOpenedFiles.bind(this)());
      },
    });

    // Set Target File (from Vault files)
    //   - Sorted by last modified time.
    plugin.addCommand({
      id: "set-target-file-from-vault-files",
      name: "Set Target File from Vault Files",
      icon: "crosshair",
      callback: async () => {
        targetFileAssertion.bind(this)(await setTargetFileFromVaultFiles.bind(this)());
      },

    });

    // Extract Heading at Cursor Position
    plugin.addCommand({
      id: "extract-heading-at-cursor",
      name: "Extract Heading at Cursor",
      icon: "list",
      editorCallback: async (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
        await resolveTargetFile.bind(this)();
        if (!this.targetFile) {
          new Notice("No target file selected.");
          return;
        }

        const extractor = new HeadingExtractor(this.parent.app, ctx);
        await extractor.extractAndInsertHeading(this.targetFile, {
          extractAtCursor: true,
          endAtInsertion: false,
          startFlat: plugin.settings.suggestStartFlat,
          skewUpwards: plugin.settings.insertionSkewedUpwards,
        });

      },
    });

  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

    containerEl.createEl("h3", {text: "Heading Extractor"});

    new Setting(containerEl)
      .setName("Heading selector start flat")
      .then((setting: Setting) => {
        setting.setDesc(createFragment((el) => {
          el.createSpan({text:
            "When opening a heading selector, the immediate list of results will be all the headings at the Target File."
          });
          el.createEl("br");
          el.createSpan({text:
            "If this setting is off, the immediate list of results will be the top-level headings of the Target File."
          });
          el.createEl("br");
          el.createEl("br");
          el.createSpan("", (el) => {
            el.createEl("b", {text: "NOTE: "});
            const kb = (...keys: string[]) => hotkeyHTML(...keys);
            el.innerHTML = `Use ${kb("Alt", "l")} to step into a heading and ${kb("Alt", "h")} to step out of a heading.<br><br>${kb("Alt", "j")} and ${kb("Alt", "k")} can be used to navigate the results; just as ${kb("ArrowUp")} and ${kb("ArrowDown")}.`;
          });
        }));
      })
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(plugin.settings.suggestStartFlat);
        toggle.onChange(async (value: boolean) => {
          plugin.settings.suggestStartFlat = value;
          await plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Insertion skewed upwards")
      .then((setting: Setting) => {
        setting.setDesc(createFragment((el) => {
          el.createSpan({ text:
            "With respect to the extracted heading level, the insertion position will be determined as follows:"
          });
          el.createEl("ul", "", (ul) => { ul.innerHTML = `
            <li>If a higher-in-hierarchy heading is selected, the insertion will be at the upmost available position within this heading section.</li>
            <li>If a heading at the same level is selected, the insertion will be directly above it.</li>
            <li>It is not possible to select lower-in-hierarchy headings for insertion.</li>
          `;});
          el.createEl("br");
          el.createSpan({ text:
            "If this setting is off, the behavior is analogous, but downwards."
          });
        }));
      })
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(plugin.settings.insertionSkewedUpwards);
        toggle.onChange(async (value: boolean) => {
          plugin.settings.insertionSkewedUpwards = value;
          await plugin.saveSettings();
        });
      });

    const setTargetFileSetter = () => new Setting(containerEl)
      .setName("Set Target File from:")
      .then((setting: Setting) => {
        setting.controlEl.addClass("target-file-setter-setting-control");
      })
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText("Active File")
          .onClick(setActiveFileAsTarget.bind(this));
      })
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText("Opened Files")
          .onClick(setTargetFileFromOpenedFiles.bind(this));
      })
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText("Vault Files")
          .onClick(setTargetFileFromVaultFiles.bind(this));
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
            await resolveTargetFile.bind(this)();
          });
          if (plugin.settings.targetFileMethod === 'manualSet')
            targetFileSetter.settingEl.show();
          else targetFileSetter.settingEl.hide();
        });
      });

    new Setting(containerEl)
      .setName("Target File")
      .then((setting: Setting) => {
        setting.settingEl.addClass("target-file-setting");
        setting.setDesc(createFragment((el) => {
          el.createEl("b", {text: "NOTE: "});
          el.createSpan({text: "It updates every time before any plugin functionality."});
        }));
      })
      .addSearch((search: SearchComponent) => {
        this.targetFileComponent = search
          .setPlaceholder("Search for a file")
          .setValue(plugin.settings.targetFilePath ?? "")
          .onChange(async (value: string) => {
            const file = plugin.app.vault.getAbstractFileByPath(value);
            if (!file || !(file instanceof TFile)) return;
            await manuallySetTargetFile.bind(this)(file);
          });
      });

  }

}

