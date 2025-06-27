import BundlePlugin, { BundlePluginComponent } from 'main';

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
  moment,
} from 'obsidian';

import { getSetting } from 'utils/obsidian/settings';

import selectHeadingSectionText from './func/selectHeadingSectionText';
import cutHeadingSection from './func/cutHeadingSection';
import sortSiblingHeadings from './func/sortSiblingHeadings';
import { transformSiblingHeadingDates } from './func/transformDates';
import {
  insertSmartHeadingSuggest,
  insertTimestampedSmartHeadingSuggest,
} from './func/smartHeadingSuggest';
import { insertSmartHeadingUnderHeading } from './func/customSmartHeadings';
import swapHeadingSection from './func/swapHeadingSection';
import {
  shiftSiblingHeadingLevel,
  siblingHeadingLevelSuggest,
} from './func/changeSiblingHeadingLevel';




export default class HeadingExtraToolsComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: {
    excludeTimezoneOffsetFormats: boolean;
    smartHeadingSkewUpwards: boolean;
    shiftSiblingHeadingsWrapAround: boolean;
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      excludeTimezoneOffsetFormats: false,
      smartHeadingSkewUpwards: true,
      shiftSiblingHeadingsWrapAround: false,
    };
  }


  onload(): void {
    this.addCommands();
  }


  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;

    // Increase Sibling Heading Level
    plugin.addCommand({
      id: 'increase-sibling-heading-level',
      name: 'Increase Sibling Heading Level',
      icon: 'hash',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const wrapAround = getSetting(plugin.app, 'shiftSiblingHeadingsWrapAround');
        shiftSiblingHeadingLevel(view,{step: +1, wrapAround});
      }
    });

    // Decrease Sibling Heading Level
    plugin.addCommand({
      id: 'decrease-sibling-heading-level',
      name: 'Decrease Sibling Heading Level',
      icon: 'hash',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const wrapAround = getSetting(plugin.app, 'shiftSiblingHeadingsWrapAround');
        shiftSiblingHeadingLevel(view,{step: -1, wrapAround});
      }
    });

    // Sibling Heading Level Suggest
    plugin.addCommand({
      id: 'sibling-heading-level-suggest',
      name: 'Sibling Heading Level Suggest',
      icon: 'hash',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await siblingHeadingLevelSuggest(plugin.app, view);
      }
    });

    // Swap Heading Section Upwards
    plugin.addCommand({
      id: 'swap-heading-section-upwards',
      name: 'Swap Heading Section Upwards',
      icon: 'arrow-up-wide-narrow',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        swapHeadingSection(view, {upwards: true});
      }
    });

    // Swap Heading Section Downwards
    plugin.addCommand({
      id: 'swap-heading-section-downwards',
      name: 'Swap Heading Section Downwards',
      icon: 'arrow-down-narrow-wide',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        swapHeadingSection(view, {upwards: false});
      }
    });

    // Custom Smart Heading: Timestamped H5 under H1/H2 'Captures' with YAML
    plugin.addCommand({
      id: 'insert-smart-timestamped-h5-under-captures-with-yaml',
      name: 'Insert Smart Timestamped H5 under Captures with YAML',
      icon: 'watch',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        insertSmartHeadingUnderHeading(plugin.app, view, {
          insertionHeading: {
            level: 5,
            title: moment().format('YYYY-MM-DD[T]HH:mm:ss'),
            contents: '```yaml\n```\n\n',
          },
          referenceHeading: {
            validLevels: [1, 2],
            titlePattern: 'Captur[ea]s',
          },
          ignoreSelection: false,
          skewUpwards: plugin.settings.smartHeadingSkewUpwards,
        });
      }
    });

    // Custom Smart Heading: Timestamped H5 under H1/H2 'Captures'
    plugin.addCommand({
      id: 'insert-smart-timestamped-h5-under-captures',
      name: 'Insert Smart Timestamped H5 under Captures',
      icon: 'watch',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        insertSmartHeadingUnderHeading(plugin.app, view, {
          insertionHeading: {
            level: 5,
            title: moment().format('YYYY-MM-DD[T]HH:mm:ss'),
            contents: '\n',
          },
          referenceHeading: {
            validLevels: [1, 2],
            titlePattern: 'Captur[ea]s',
          },
          ignoreSelection: false,
          skewUpwards: plugin.settings.smartHeadingSkewUpwards,
        });
      }
    });

    // Custom Smart Heading: Timestamped H6 under H1/H2 'Tasks'
    plugin.addCommand({
      id: 'insert-smart-timestamped-h6-under-tasks',
      name: 'Insert Smart Timestamped H6 under Tasks',
      icon: 'watch',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        insertSmartHeadingUnderHeading(plugin.app, view, {
          insertionHeading: {
            level: 6,
            title: moment().format('YYYY-MM-DD[T]HH:mm:ss'),
            contents: '- [ ] ',
          },
          referenceHeading: {
            validLevels: [1, 2],
            titlePattern: 'Tasks|TO[- ]?DO|Tareas',
          },
          ignoreSelection: false,
          skewUpwards: plugin.settings.smartHeadingSkewUpwards,
        });
      }
    });

    // Insert Smart Heading
    plugin.addCommand({
      id: 'insert-smart-heading',
      name: 'Insert Smart Heading',
      icon: 'hash',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const skewUpwards = plugin.settings.smartHeadingSkewUpwards;
        insertSmartHeadingSuggest(plugin.app, view, skewUpwards);
      }
    });

    // Insert Timestamped Smart Heading
    plugin.addCommand({
      id: 'insert-timestamped-smart-heading',
      name: 'Insert Timestamped Smart Heading',
      icon: 'watch',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const skewUpwards = plugin.settings.smartHeadingSkewUpwards;
        insertTimestampedSmartHeadingSuggest(plugin.app, view, skewUpwards);
      }
    });

    // Select Heading Section Text
    plugin.addCommand({
      id: 'select-heading-section-text',
      name: 'Select Heading Section Text',
      icon: 'text-select',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        selectHeadingSectionText(editor);
      }
    });

    // Cut Heading Section
    plugin.addCommand({
      id: 'cut-heading-section',
      name: 'Cut Heading Section',
      icon: 'scissors',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        cutHeadingSection(editor);
      }
    });

    // Sort Sibling Headings
    plugin.addCommand({
      id: 'sort-sibling-headings',
      name: 'Sort Sibling Headings',
      icon: 'arrow-down-a-z',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await sortSiblingHeadings(plugin.app, editor, view);
      }
    });

    // Transform Sibling Headings Timestamps
    plugin.addCommand({
      id: 'transform-sibling-headings-timestamps',
      name: 'Transform Sibling Headings Timestamps',
      icon: 'calendar',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await transformSiblingHeadingDates(plugin.app, view, {
          excludeTimezoneOffsetFormats: plugin.settings.excludeTimezoneOffsetFormats,
        });
      }
    });

  }


  addRibbonIcons(): void {}
  addStatusBarItems(): void {}
  addEventsAndIntervals(): void {}


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

    containerEl.createEl('h3', {text: 'Heading Extra Tools Settings'});

    new Setting(containerEl)
      .setName('Wrap Around Sibling Headings Level Change')
      .setDesc('Wrap around when increasing/decreasing sibling headings level (H5 -> H6 -> H1 ...)')
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(plugin.settings.shiftSiblingHeadingsWrapAround);
        toggle.onChange(async (value: boolean) => {
          plugin.settings.shiftSiblingHeadingsWrapAround = value;
          await plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Smart Heading Skew Upwards')
      .setDesc('Skew the Smart Heading insertion upwards.')
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(plugin.settings.smartHeadingSkewUpwards);
        toggle.onChange(async (value: boolean) => {
          plugin.settings.smartHeadingSkewUpwards = value;
          await plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Exclude Timezone Offset Formats')
      .setDesc('Exclude timezone offset formats in the transformed timestamps.')
      .addToggle((toggle: ToggleComponent) => {
        toggle.setValue(plugin.settings.excludeTimezoneOffsetFormats);
        toggle.onChange(async (value: boolean) => {
          plugin.settings.excludeTimezoneOffsetFormats = value;
          await plugin.saveSettings();
        });
      });

  }

}

