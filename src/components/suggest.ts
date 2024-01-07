import {
  App, Vault, Setting, Notice, Scope,
  Editor, MarkdownView, HeadingCache,
  ToggleComponent, DropdownComponent, TextComponent,
  ISuggestOwner, Modal, FuzzyMatch,
  PopoverSuggest, AbstractInputSuggest,
  SuggestModal, FuzzySuggestModal,
  TFile, TFolder, TAbstractFile,
} from "obsidian";


import BundlePlugin from "main";
import BundleComponent from "types";

import {
  getSetting,
  getActiveFileCache,
  getHeadingIndex,
  scrollToCursor,
} from "utils";

import { TextInputSuggest } from "./_suggest";



export default class SuggestComponent implements BundleComponent {

  parent: BundlePlugin;
  settings: {
  };
  suggestModal: SuggestModal<TFile>;
  fuzzySuggestModal: FuzzySuggestModal<TFile>;


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

    // MySuggestModal
    plugin.addCommand({
      id: "my-suggest-modal",
      name: "My Suggest Modal (test)",
      callback: () => {
        new MySuggestModal(plugin.app, {ignoreCase: true}).open();
      }
    });

    // MyFuzzySuggestModal
    plugin.addCommand({
      id: "my-fuzzy-suggest-modal",
      name: "My Fuzzy Suggest Modal (test)",
      callback: () => {
        new MyFuzzySuggestModal(this).open();
      }
    });

    // FileSuggestModal
    plugin.addCommand({
      id: "file-suggest-modal",
      name: "File Suggest Modal (test)",
      callback: () => {
        new FileSuggestModal(this).open();
      }
    });

    // MyCustomSuggest
    plugin.addCommand({
      id: "my-custom-suggest",
      name: "My Custom Suggest (test)",
      callback: () => {
        new MyCustomSuggest(plugin.app).open();
      }
    });

  }

  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
  }


  processSuggestSelection(selection: string) {
    new Notice(`You selected ${selection}.`);
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



const wrapAround = (value: number, size: number): number => {
    return ((value % size) + size) % size;
};


class Suggest<T> {
    private owner: ISuggestOwner<T>;
    private values: T[];
    private suggestions: HTMLDivElement[];
    private selectedItem: number;
    private containerEl: HTMLElement;

    constructor(
        owner: ISuggestOwner<T>,
        containerEl: HTMLElement,
        scope: Scope
    ) {
        this.owner = owner;
        this.containerEl = containerEl;

        containerEl.on(
            "click",
            ".suggestion-item",
            this.onSuggestionClick.bind(this)
        );
        containerEl.on(
            "mousemove",
            ".suggestion-item",
            this.onSuggestionMouseover.bind(this)
        );

        scope.register([], "ArrowUp", (event) => {
            if (!event.isComposing) {
                this.setSelectedItem(this.selectedItem - 1, true);
                return false;
            }
        });

        scope.register([], "ArrowDown", (event) => {
            if (!event.isComposing) {
                this.setSelectedItem(this.selectedItem + 1, true);
                return false;
            }
        });

        scope.register([], "Enter", (event) => {
            if (!event.isComposing) {
                this.useSelectedItem(event);
                return false;
            }
        });
    }

    onSuggestionClick(event: MouseEvent, el: HTMLDivElement): void {
        event.preventDefault();

        const item = this.suggestions.indexOf(el);
        this.setSelectedItem(item, false);
        this.useSelectedItem(event);
    }

    onSuggestionMouseover(_event: MouseEvent, el: HTMLDivElement): void {
        const item = this.suggestions.indexOf(el);
        this.setSelectedItem(item, false);
    }

    setSuggestions(values: T[]) {
        this.containerEl.empty();
        const suggestionEls: HTMLDivElement[] = [];

        values.forEach((value) => {
            const suggestionEl = this.containerEl.createDiv("suggestion-item");
            this.owner.renderSuggestion(value, suggestionEl);
            suggestionEls.push(suggestionEl);
        });

        this.values = values;
        this.suggestions = suggestionEls;
        this.setSelectedItem(0, false);
    }

    useSelectedItem(event: MouseEvent | KeyboardEvent) {
        const currentValue = this.values[this.selectedItem];
        if (currentValue) {
            this.owner.selectSuggestion(currentValue, event);
        }
    }

    setSelectedItem(selectedIndex: number, scrollIntoView: boolean) {
        const normalizedIndex = wrapAround(
            selectedIndex,
            this.suggestions.length
        );
        const prevSelectedSuggestion = this.suggestions[this.selectedItem];
        const selectedSuggestion = this.suggestions[normalizedIndex];

        prevSelectedSuggestion?.removeClass("is-selected");
        selectedSuggestion?.addClass("is-selected");

        this.selectedItem = normalizedIndex;

        if (scrollIntoView) {
            selectedSuggestion.scrollIntoView(false);
        }
    }
}





abstract class RawSuggestModal<T> extends Modal implements ISuggestOwner<T> {
  private limit: number;
  private emptyStateText: string;
  private inputEl: HTMLInputElement;
  private resultContainerEl: HTMLElement;
  private suggestEl: HTMLElement;
  private suggest: Suggest<T>;
  private resolve: (value: T) => void;
  private reject: (reason?: any) => void;

  constructor(app: App) {
    super(app);
    this.app = app;

    this.inputEl = this.contentEl.createEl("input", {
      attr: { type: "text" },
    });

    this.suggestEl = createDiv("suggestion-container");
    const suggestion = this.suggestEl.createDiv("suggestion");
    this.suggest = new Suggest(this, suggestion, this.scope);
    this.contentEl.appendChild(this.suggestEl);

    this.scope.register([], "Escape", this.close.bind(this));

    this.inputEl.addEventListener("input", this.onInputChanged.bind(this));
    this.inputEl.addEventListener("focus", this.onInputChanged.bind(this));
    this.inputEl.addEventListener("blur", this.close.bind(this));
    this.suggestEl.on(
      "mousedown",
      ".suggestion-container",
      (event: MouseEvent) => {
        event.preventDefault();
      }
    );

  }


  onInputChanged(): void {
    const inputStr = this.inputEl.value;
    const suggestions = this.getSuggestions(inputStr);
    this.suggest.setSuggestions(suggestions);
  }


  // open(container: HTMLElement, inputEl: HTMLElement): void {
  //   this.app.keymap.pushScope(this.scope);
  //   container.appendChild(this.suggestEl);
  // }

  // close(): void {
  //     this.app.keymap.popScope(this.scope);
  //     this.suggest.setSuggestions([]);
  //     this.suggestEl.detach();
  // }

  abstract getSuggestions(inputStr: string): T[];
  abstract renderSuggestion(item: T, el: HTMLElement): void;
  abstract selectSuggestion(item: T): void;
}






class FileSuggestModal extends RawSuggestModal<TFile> {
  private plugin: BundlePlugin;
  private component: SuggestComponent;

  constructor(component: SuggestComponent) {
    super(component.parent.app);
    this.plugin = component.parent;
    this.component = component;
  }

  onOpen(): void {
    this.app.keymap.pushScope(this.scope);
    super.onOpen();
  }

  onClose(): void {
    this.app.keymap.popScope(this.scope);
    super.onClose();
  }

  getSuggestions(query: string): TFile[] {
    const folder = this.plugin.app.vault.getRoot().path;
    const files = getTFilesFromFolder(this.plugin.app, folder);
    if (!files) return [];
    return files;
  }

  renderSuggestion(value: TFile, el: HTMLElement) {
    el.setText(value.basename);
  }

  selectSuggestion(value: TFile): void {
    this.component.processSuggestSelection(value.basename);
  }

  // onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent): void {
  //   this.component.processSuggestSelection(item.basename);
  //   console.log(evt);
  // }
}



abstract class CustomModal<T> {
  app: App;
  id: string;
  scope: Scope;
  containerEl: HTMLElement;

  suggestEl: HTMLElement;
  inputEl: HTMLInputElement;
  resultsEl: HTMLElement;


  constructor(app: App, modalId: string) {
    this.app = app;
    this.id = modalId;
    // this.scope = modalScope;
    this.createContainerEl();
  }

  createContainerEl(): void {
    this.containerEl = createDiv("modal-container mod-dim");

    this.containerEl.appendChild(createEl("div", {
      cls: "modal-bg",
      attr: { style: "opacity: 0.85;" },
    }));

    const promptEl = createEl("div", {
      cls: "prompt",
      attr: { id: `${this.id}-suggest` },
    });

    const promptInputContainerEl = createEl("div", { cls: "prompt-input-container" });
    const promptInput = createEl("input", {
      cls: "prompt-input",
      attr: {
        id: `${this.id}-input`,
        enterkeyhint: "done",
        type: "text",
        placeholder: "Enter text here...",
      },
    });
    const promptInputCta = createEl("div", { cls: "prompt-input-cta" });
    promptInputContainerEl.appendChild(promptInput);
    promptInputContainerEl.appendChild(promptInputCta);

    const promptResultsEl = createEl("div", {
      cls: "prompt-results",
      attr: {
        id: `${this.id}-results`,
        style: "overflow-y: auto;",
      },
    });

    promptEl.appendChild(promptInputContainerEl);
    promptEl.appendChild(promptResultsEl);

    this.containerEl.appendChild(promptEl);
  }


  configureScope(): void {
    this.scope = new Scope();
    this.scope.register([], "Escape", this.close.bind(this));

    this.inputEl.addEventListener("input", this.onInputChanged.bind(this));
    this.inputEl.addEventListener("focus", this.onInputChanged.bind(this));
    this.inputEl.addEventListener("blur", this.close.bind(this));
    // this.suggestEl.on(
    //   "mousedown",
    //   ".suggestion-container",
    //   (event: MouseEvent) => {
    //     event.preventDefault();
    //   }
    // );
  }

  onInputChanged(): void {
    const inputStr = this.inputEl.value;
    const results = this.getResults(inputStr);
    this.setResults(results);
  }


  open() {
    document.body.appendChild(this.containerEl);
    this.suggestEl = document.getElementById(`${this.id}-suggest`) as HTMLElement;
    this.resultsEl = document.getElementById(`${this.id}-results`) as HTMLElement;
    this.inputEl = document.getElementById(`${this.id}-input`) as HTMLInputElement;
    this.inputEl.focus();

    const results = this.getResults();
    this.setResults(results);

    this.configureScope();
    this.app.keymap.pushScope(this.scope);
  }

  close() {
    this.app.keymap.popScope(this.scope);
    this.containerEl.remove();
  }

  setResults(results: T[]) {
    this.resultsEl.empty();
    results.forEach((result) => {
      const resultEl = this.renderResult(result);
      resultEl.addClass("suggestion-item");
      this.resultsEl.appendChild(resultEl);
    });
  }

  abstract getResults(query?: string): T[];
  abstract renderResult(result: T): HTMLElement;
}



class MyCustomSuggest extends CustomModal<TFile> {
  query?: string;

  constructor(app: App) {
    super(app, "my-custom-suggest");
  }

  getResults(query?: string): TFile[] {
    this.query = query;
    const folder = this.app.vault.getRoot().path;
    const files = getTFilesFromFolder(this.app, folder);
    if (!files) return [];
    if (!query) return files;
    return files.filter((file) => file.basename.toLocaleLowerCase().contains(query.toLocaleLowerCase()));
  }

  renderResult(result: TFile): HTMLElement {
    const resultEl = createEl("div");

    if (this.query) {
      const queryIndex = result.basename.toLocaleLowerCase().indexOf(this.query.toLocaleLowerCase());
      const endQueryIndex = queryIndex + this.query.length;

      const preQuery = result.basename.slice(0, queryIndex);
      const query = result.basename.slice(queryIndex, endQueryIndex);
      const postQuery = result.basename.slice(endQueryIndex);

      resultEl.innerHTML = `${preQuery}<b>${query}</b>${postQuery}`;
    } else {
      resultEl.innerText = result.basename;
    }

    return resultEl;
  }


}






 const sampleItems: Array<string> = [
    "one",
    "two",
    "three",
 ];



// Modal with test text content.
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



// Attempted suggest modal to accept alt key bindings for navigation.
export class MySuggestModal extends SuggestModal<string> {
  private suggestions: string[];
  private selectedSuggestion: string;
  private query: string;
  private ignoreCase: boolean;
  private suggestionFilter: (s: string) => boolean;
  private getQueryIndex: (t: string) => number;


  constructor(app: App, args: {ignoreCase: boolean} = {ignoreCase: false}) {
    super(app);
    this.setPlaceholder("Select a file...");

    this.resultContainerEl.addClass("MySuggestModal-results");
    // this.shouldRestoreSelection = true;

    this.suggestions = this.app.vault.getMarkdownFiles().map((file) => file.path);
    this.setIgnoreCase(args.ignoreCase);

    this.scope.register(["Alt"], "i", (event: KeyboardEvent) => {
      if (!event.isComposing) {
        console.log(`Ignore Case: ${!this.ignoreCase}`);
        this.setIgnoreCase(!this.ignoreCase);
        this.inputEl.setText("foo");
        return false;
      }
    });

    this.scope.register(["Alt"], "j", (event: KeyboardEvent) => {
      if (!event.isComposing) {
        const selectionClass = "is-selected";
        const selected = this.resultContainerEl.find(`.${selectionClass}`);
        selected.removeClass(selectionClass);
        const newSelected = (selected.nextSibling ?? this.resultContainerEl.firstChild) as HTMLElement;
        newSelected.addClass(selectionClass);
        return false;
      }
    });

    this.scope.register(["Alt"], "k", (event: KeyboardEvent) => {
      if (!event.isComposing) {
        const selectionClass = "is-selected";
        const selected = this.resultContainerEl.find(`.${selectionClass}`);
        selected.removeClass(selectionClass);
        const newSelected = (selected.previousSibling ?? this.resultContainerEl.lastChild) as HTMLElement;
        newSelected.addClass(selectionClass);
        return false;
      }
    });
    // this.scope.register(["Alt"], "j", (event: KeyboardEvent) => {
    // });

    console.log("MySuggestModal:", this);
    

  }

  private setIgnoreCase(ignoreCase: boolean) {
    this.ignoreCase = ignoreCase;
    if (ignoreCase) {
      this.suggestionFilter = (s: string) => 
        s.toLocaleLowerCase().contains(this.query.toLocaleLowerCase());
      this.getQueryIndex = (t: string) =>
        t.toLocaleLowerCase().indexOf(this.query.toLocaleLowerCase());
    } else {
      this.suggestionFilter = (s: string) => s.contains(this.query);
      this.getQueryIndex = (t: string) => t.indexOf(this.query);
    }
  }

  onOpen(): void {
    this.app.keymap.pushScope(this.scope);
    super.onOpen();
  }

  onClose(): void {
    this.app.keymap.popScope(this.scope);
    super.onClose();
  }

  getSuggestions(query: string): string[] | Promise<string[]> {
    this.query = query;
    return this.suggestions.filter(this.suggestionFilter);
  }

  renderSuggestion(value: string, el: HTMLElement) {
    if (this.query) {
      const queryIndex = this.getQueryIndex(value);
      const endQueryIndex = queryIndex + this.query.length;

      const preQuery = value.slice(0, queryIndex);
      const query = value.slice(queryIndex, endQueryIndex);
      const postQuery = value.slice(endQueryIndex);

      el.innerHTML = `${preQuery}<b>${query}</b>${postQuery}`;
    } else {
      el.innerText = value;
    }
  }

  selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
    this.selectedSuggestion = value;
    console.log("selectSuggestion:", value);
    
  }

  onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent): string {
    new Notice(`'${item}' selected.`, 5000);
    return item;
  }
}




// Fuzzy suggest for files at the root of the vault.
export class MyFuzzySuggestModal extends FuzzySuggestModal<TFile> {
  private plugin: BundlePlugin;
  private component: SuggestComponent;

  constructor(component: SuggestComponent) {
    super(component.parent.app);
    this.plugin = component.parent;
    this.component = component;
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

  getItems(): TFile[] {
    const folder = this.plugin.app.vault.getRoot().path;
    const files = getTFilesFromFolder(this.plugin.app, folder);
    if (!files) return [];
    return files;
  }

  getItemText(item: TFile): string {
    return item.basename;
  }

  onChooseItem(item: TFile, evt: MouseEvent | KeyboardEvent): void {
    this.component.processSuggestSelection(item.basename);
    console.log(evt);
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




// Unused.
class MyPopoverSuggest extends PopoverSuggest<string> {

  constructor(app: App) {
    super(app)
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    let parts = value.split("/");
    let head = parts.pop();
    let boldHead = el.createEl("b", head);
    el.appendText(parts.join("/") + "/");
    el.appendChild(boldHead);
    // el.textContent = value;
  }

  selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
    processTextSelection(value);
  }

}
































////////////////////////////////////////
// STRING PROCESSING FUNCTIONS
////////////////////////////////////////

function processTextSelection(text: string) {
  new Notice(`"${text}" was selected.`, 5000);
}



////////////////////////////////////////
// UTILITY FUNCTIONS
////////////////////////////////////////


function resolveTFile(app: App, fileStr: string): TFile {
  const file = app.vault.getAbstractFileByPath(fileStr);
  if (!file) {
    throw new Error(`File "${fileStr}" does not exist.`);
  }
  if (!(file instanceof TFile)) {
    throw new Error(`"${fileStr}" is a folder, not a file.`);
  }
  return file;
}


function resolveTFolder(app: App, folderStr: string): TFolder {
  const folder = app.vault.getAbstractFileByPath(folderStr);
  if (!folder) {
    throw new Error(`Folder "${folderStr}" does not exist.`);
  }
  if (!(folder instanceof TFolder)) {
    throw new Error(`"${folderStr}" is a file, not a folder.`);
  }
  return folder;
}


function getTFilesFromFolder(app: App, folderStr: string): Array<TFile> {
  const folder = resolveTFolder(app, folderStr);

  const files: Array<TFile> = [];
  Vault.recurseChildren(folder, (file: TAbstractFile) => {
    if (file instanceof TFile) {
      files.push(file);
    }
  });

  files.sort((a, b) => a.basename.localeCompare(b.basename));

  return files;
}

