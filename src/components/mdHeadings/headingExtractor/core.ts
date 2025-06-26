import BundlePlugin, { BundlePluginComponent } from 'main';

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
} from 'obsidian';

import { hotkeyHTML } from 'utils/display';

import {
  targetFileAssertion,
  resolveTargetFile,
  manuallySetTargetFile,
  setActiveFileAsTarget,
  setTargetFileFromOpenedFiles,
  setTargetFileFromVaultFiles,
} from './utils/targetFile';

import HeadingExtractor from './classes/headingExtractor';



type TargetFileMethod = 'active' | 'lastAccessed' | 'manualSet';



export default class HeadingExtractorComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: {
    targetFileMethod: TargetFileMethod;
    targetFilePath: string;
    expandInsertionTree: boolean;
    includeExtractionLevelHeadings: boolean;
    insertionSkewedUpwards: boolean;
  };
  targetFile: TFile | null;
  targetFileComponent: SearchComponent;


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      targetFileMethod: 'active',
      targetFilePath: '',
      expandInsertionTree: true,
      includeExtractionLevelHeadings: false,
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
      id: 'toggle-insertion-skew-direction',
      name: 'Toggle Insertion Skew Direction',
      callback: async () => {
        const newSkew = !plugin.settings.insertionSkewedUpwards;
        plugin.settings.insertionSkewedUpwards = newSkew;
        new Notice(`Insertion skewed ${newSkew ? 'upwards' : 'downwards'}`, 2000);
        await plugin.saveSettings();
      },
    });

    // Set Active File as Target
    plugin.addCommand({
      id: 'set-active-file-as-target',
      name: 'Set Active File as Target',
      icon: 'target',
      callback: async () => {
        targetFileAssertion.bind(this)(await setActiveFileAsTarget.bind(this)());
      },
    });

    // Set Target File from opened files
    plugin.addCommand({
      id: 'set-target-file-from-opened-files',
      name: 'Set Target File from Opened Files',
      icon: 'crosshair',
      callback: async () => {
        targetFileAssertion.bind(this)(await setTargetFileFromOpenedFiles.bind(this)());
      },
    });

    // Set Target File (from Vault files)
    //   - Sorted by last modified time.
    plugin.addCommand({
      id: 'set-target-file-from-vault-files',
      name: 'Set Target File from Vault Files',
      icon: 'crosshair',
      callback: async () => {
        targetFileAssertion.bind(this)(await setTargetFileFromVaultFiles.bind(this)());
      },

    });

    // Extract Heading Section at Cursor Position
    plugin.addCommand({
      id: 'extract-heading-section-at-cursor',
      name: 'Extract Heading Section at Cursor',
      icon: 'list',
      editorCallback: async (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
        await resolveTargetFile.bind(this)();
        if (!this.targetFile) {
          new Notice('No target file selected.');
          return;
        }

        const extractor = new HeadingExtractor(this.parent.app, ctx);
        await extractor.extractAndInsertHeading(this.targetFile, {
          extractAtCursor: true,
          endAtInsertion: false,
          expandInsertionTree: plugin.settings.expandInsertionTree,
          skewUpwards: plugin.settings.insertionSkewedUpwards,
          includeExtractionLevelHeadings: plugin.settings.includeExtractionLevelHeadings,
        });

      },
    });

  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;


    type Keybinding = {
      keys: string;
      description: string;
    };

    const abstractSuggestKeybindings: Keybinding[] = [
      { keys: 'Alt + J/K', description: 'Navigate Down / Navigate Up' },
      { keys: 'Alt + F', description: 'Toggle Fuzzy Search' },
      { keys: 'Alt + S', description: 'Toggle Strict Case' },
      { keys: 'Alt + .', description: 'Toggle Instructions' },
      { keys: 'Alt + U', description: 'Clear Input' },
      { keys: 'Esc', description: 'Close' },
    ];

    const headingTreeKeybindings: Keybinding[] = [
      { keys: 'Alt + L/H', description: 'Step Into / Step Out' },
      { keys: 'Alt + D', description: 'Toggle Expand Heading Tree' },
    ];

    const headingInsertionDataKeybindings: Keybinding[] = [
      { keys: 'Enter / Click', description: 'Append, Insert After' },
      { keys: 'Shift + Enter / Right Click', description: 'Prepend, Insert Before' },
      { keys: 'Alt + I', description: 'Toggle Include Extraction Level Headings' },
    ];

    // TODO: Give better styling to the keybindings table.
    function createKeybindingsTable(bindings: Keybinding[]): HTMLTableElement {
      const table = document.createElement('table');
      table.style.borderCollapse = 'collapse';

      const header = table.insertRow();
      ['Keys', 'Description'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.border = '1px solid black';
        th.style.padding = '4px';
        header.appendChild(th);
      });

      bindings.forEach(binding => {
        const row = table.insertRow();
        [binding.keys, binding.description].forEach(text => {
          const cell = row.insertCell();
          cell.textContent = text;
          cell.style.border = '1px solid black';
          cell.style.padding = '4px';
        });
      });

      return table;
    }

    containerEl.createEl('h3', {text: 'Heading Extractor'});

    // containerEl.createEl('h4', {text: 'Keybindings'});
    containerEl.createEl('br');

    containerEl.createEl('h5', {text: 'General Suggest Keybindings'});
    const abstractSuggestTable = createKeybindingsTable(abstractSuggestKeybindings);
    containerEl.appendChild(abstractSuggestTable);
    containerEl.createEl('br');

    containerEl.createEl('h5', {text: 'Heading Tree Keybindings'});
    const headingTreeTable = createKeybindingsTable(headingTreeKeybindings);
    containerEl.appendChild(headingTreeTable);
    containerEl.createEl('br');

    containerEl.createEl('h5', {text: 'Heading Extractor Keybindings'});
    const headingInsertionDataTable = createKeybindingsTable(headingInsertionDataKeybindings);
    containerEl.appendChild(headingInsertionDataTable);
    containerEl.createEl('br');

    // const keybindingsTable = createKeybindingsTable(keybindings);
    // containerEl.appendChild(keybindingsTable);

    // containerEl.createSpan('', (el) => {
    //   el.createEl('b', {text: 'NOTE: '});
    //   const kb = (...keys: string[]) => hotkeyHTML(...keys);
    //   el.innerHTML = `Use ${kb('Alt', 'l')} to step into a heading and ${kb('Alt', 'h')} to step out of a heading.<br><br>${kb('Alt', 'j')} and ${kb('Alt', 'k')} can be used to navigate the results; just as ${kb('ArrowUp')} and ${kb('ArrowDown')}.`;
    // });

    containerEl.createEl('h4', {text: 'On Suggest Open'});

    new Setting(containerEl)
      .setName('Expand Heading Tree on Open')
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(plugin.settings.expandInsertionTree ?? false);
        toggle.onChange(async (value: boolean) => {
          plugin.settings.expandInsertionTree = value;
          await plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Include Extraction Level Headings on Open')
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(plugin.settings.includeExtractionLevelHeadings ?? true);
        toggle.onChange(async (value: boolean) => {
          plugin.settings.includeExtractionLevelHeadings = value;
          await plugin.saveSettings();
        });
      })


    containerEl.createEl('h4', {text: 'Insertion Adjustments'});

    new Setting(containerEl)
      .setName('Insertion skewed upwards')
      .then((setting: Setting) => {
        setting.setDesc(createFragment((el) => {
          el.createSpan({ text:
            'Insert at upmost available position under a parent heading, or above a sibling heading.'
          });
          el.createEl('br');
          el.createSpan({ text:
            'If this setting is off, the insertion will be at the lowest available position under a parent heading, or below a sibling heading.'
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

    containerEl.createEl('h4', {text: 'Target File'});

    const setTargetFileSetter = () => new Setting(containerEl)
      .setName('Set Target File from:')
      .then((setting: Setting) => {
        setting.controlEl.addClass('target-file-setter-setting-control');
      })
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText('Active File')
          .onClick(setActiveFileAsTarget.bind(this));
      })
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText('Opened Files')
          .onClick(setTargetFileFromOpenedFiles.bind(this));
      })
      .addButton((button: ButtonComponent) => {
        button
          .setButtonText('Vault Files')
          .onClick(setTargetFileFromVaultFiles.bind(this));
      });

    new Setting(containerEl)
      .setName('Target File Method')
      .then((setting: Setting) => {
        const targetFileSetter = setTargetFileSetter();
        setting.addDropdown((dropdown: DropdownComponent) => {
          dropdown.addOptions({
            active: 'Active File',
            lastAccessed: 'Last Accessed File',
            manualSet: 'Manually Set File',
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
      .setName('Target File')
      .then((setting: Setting) => {
        setting.settingEl.addClass('target-file-setting');
        setting.setDesc(createFragment((el) => {
          el.createEl('b', {text: 'NOTE: '});
          el.createSpan({text: 'It updates every time before any plugin functionality.'});
        }));
      })
      .addSearch((search: SearchComponent) => {
        this.targetFileComponent = search
          .setPlaceholder('Search for a file')
          .setValue(plugin.settings.targetFilePath ?? '')
          .onChange(async (value: string) => {
            const file = plugin.app.vault.getAbstractFileByPath(value);
            if (!file || !(file instanceof TFile)) return;
            await manuallySetTargetFile.bind(this)(file);
          });
      });

  }

}

