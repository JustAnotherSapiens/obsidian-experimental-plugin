import BundlePlugin, { BundlePluginComponent } from "main";

import {
  Setting,
  TextComponent,
  TFile,
  Editor,
  Modal,
  SuggestModal,
  FuzzySuggestModal,
} from "obsidian";

import { shrinkSettingInputField } from "utils/obsidian/settings";
import MoveToHeadingSuggest from "components/mdHeadings/utils/flatHeading";

import { runQuickPopoverSuggest } from "./classes/quickPopover";
import QuickTabOpenSuggest from "./classes/quickTabOpen";



export default class SuggestComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: {
    headingSelectionViewportFraction: number,
  };
  suggestModal: SuggestModal<TFile>;
  fuzzySuggestModal: FuzzySuggestModal<TFile>;


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      headingSelectionViewportFraction: 0.25,
    };
  }


  onload(): void {
    this.addCommands();
  }


  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;

    // QuickTabOpenSuggest
    plugin.addCommand({
      id: "quick-tab-open-suggest",
      name: "Quick Tab Open Suggest (test)",
      callback: () => {
        new QuickTabOpenSuggest(plugin.app).open();
      }
    });

    // MoveToHeadingSuggest
    plugin.addCommand({
      id: "move-to-heading-suggest",
      name: "Move To Heading Suggest (test)",
      callback: () => {
        new MoveToHeadingSuggest(plugin.app).open();
      }
    });

    // QuickPopoverSuggest (test)
    plugin.addCommand({
      id: "quick-popover-suggest",
      name: "Quick Popover Suggest (test)",
      editorCallback: async (editor: Editor) => {
        console.log("Running quick popover suggest");
        const result = await runQuickPopoverSuggest(plugin.app, [
          "apple",
          "banana",
          "cherry",
          "guanavana",
          "kiwi",
          "mango",
          "orange",
          "papaya",
          "pear",
          "pineapple",
          "strawberry"
        ], (item: string) => item);
        console.log("Popover result:", result);
      }
    });

  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

		containerEl.createEl("h3", {text: "Suggest Settings"});

		containerEl.createEl("h4", {text: "Move To Heading - Suggest"});

    // Heading Suggest Viewport Fraction
    new Setting(containerEl)
      .setName("Viewport Fraction on Heading Selection")
      .setDesc("The fraction of the viewport to scroll when a heading is selected.")
      .addText((textField: TextComponent) => {
        textField.inputEl.type = "number";
        textField.setPlaceholder("scroll_fraction");
        textField.setValue(String(plugin.settings.headingSelectionViewportFraction));
        textField.onChange(async (value: string) => {
          plugin.settings.headingSelectionViewportFraction = Number(value);
          await plugin.saveSettings();
        });
      })
      .then(shrinkSettingInputField);
  }


	getSampleModal() {
    const plugin = this.parent;

		const sampleModal = new Modal(plugin.app);
		(sampleModal as any).setTitle("Sample Modal");
		sampleModal.onOpen = () => {
			const {contentEl} = sampleModal;
			contentEl.setText("Hello, Obsidian Plugin community!");
		};
		sampleModal.onClose = () => {
			const {contentEl} = sampleModal;
			contentEl.empty();
		};
		return sampleModal;
	}

}

