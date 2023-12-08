import {
  App, Setting, Notice,
  Editor, MarkdownView, HeadingCache,
  ToggleComponent, DropdownComponent, TextComponent,
  ISuggestOwner, Modal, FuzzyMatch,
  PopoverSuggest, AbstractInputSuggest,
  SuggestModal, FuzzySuggestModal,
} from "obsidian";


import BundlePlugin from "main";
import BundleComponent from "types";

import {
  getSetting,
  getActiveFileCache,
  getHeadingIndex,
  scrollToCursor,
} from "utils";




export default class SuggestComponent implements BundleComponent {

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

		// // Test SuggestModal
		// plugin.addCommand({
		// 	id: "test-suggest-modal",
		// 	name: "Test SuggestModal",
		// 	icon: "arrow-down",
		// 	mobileOnly: false,
		// 	repeatable: false,
		// 	callback: () => {
		// 		new Notice("Testing ExperimentalSuggestModal");
		// 		new MySuggestModal(plugin.app).open();
		// 	}
		// });

		// Test ExperimentalModal
		plugin.addCommand({
			id: "test-modal",
			name: "Test Modal",
			icon: "arrow-down",
			mobileOnly: false,
			repeatable: false,
			callback: () => {
				new Notice("Testing ExperimentalModal");
				new MyModal(plugin.app, (result: string) => {
					new Notice(`Result: ${result}`);
				}).open();
			}
		});
  }

  addRibbonIcons(): void {}
  addStatusBarItems(): void {}
  addEventsAndIntervals(): void {}

  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
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


 const sampleItems: Array<string> = [
    "one",
    "two",
    "three",
 ];



class MyModal extends Modal {
  result: string;
  onSubmit: (result: string) => void;
  setTitle: (title: string) => this; // Undocumented method.

  constructor(app: App, onSubmit: (result: string) => void) {
    super(app);
    this.setTitle("Set Title");
    this.onSubmit = onSubmit;
  }

  onOpen() {
    let {contentEl} = this;
    contentEl.createEl("h1", {text: 'contentEl.createEl("h1", ...)'});
    contentEl.createEl("h2", {text: 'contentEl.createEl("h2", ...)'});
    this.titleEl.appendText(" -- appendText()");
    this.titleEl.append(" -- append()");
    this.titleEl.createSpan({text: " -- createSpan()"});
    // contentEl.createEl("h1", {text: 'contentEl.createEl("h1", ...)'});

    // setText() replaces all previous content.
    // contentEl.setText("This text was set with the  contentEl.setText() method.");
  }

  onClose() {
    let {contentEl} = this;
    contentEl.empty();
  }
}


// export class ExperimentalSuggestModal extends SuggestModal<string> {
// }


export class MyFuzzySuggestModal extends FuzzySuggestModal<string> {

  constructor(app: App) {
    super(app);
    this.setPlaceholder("Generic placeholder");
    this.setInstructions([
      {command: "↑↓", purpose: "to navigate"},
      {command: "↵", purpose: "to choose"},
      {command: "esc", purpose: "to dismiss"},
    ]);

  }

  onOpen() {
    super.onOpen();
    // Add "Alt+J" and "Alt+K" as alternative keys for navigation.
    document.addEventListener("keydown", (evt) => {
      if (evt.altKey && evt.key === "j") {
        console.debug("TODO: Implement Alt+J to navigate down.");
      } else if (evt.altKey && evt.key === "k") {
        console.debug("TODO: Implement Alt+K to navigate up.");
      }
    })
  }

  tryCommand(title: string, command: () => void) {
    try {
      command();
    } catch (error) {
      new Notice(`Error running command: ${title}`);
      console.error(`Error running command: ${title}`, error);
    }
  }

  getItems(): string[] {
    return sampleItems;
  }

  getItemText(item: string): string {
    return item.toUpperCase();
  }

  onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
    this.close();
    new Notice(`You selected ${item}.`);
    console.log(`You selected ${item}.`, evt);
  }

  // renderSuggestion(item: FuzzyMatch<string>, el: HTMLElement): void {
  //   el.setText(item.item);
  // }

  // selectSuggestion(value: FuzzyMatch<string>, evt: MouseEvent | KeyboardEvent): void {
  //   this.close();
  // }

  // onChooseSuggestion(item: FuzzyMatch<string>, evt: MouseEvent | KeyboardEvent): void {
  //   this.close();
  // }

}
