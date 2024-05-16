import {
  App,
  MarkdownView,
  Scope,
  SearchResult,
  fuzzySearch,
  prepareQuery,
} from "obsidian";

import { wrapAround } from "utils/generic";
import registerKeybindings from "utils/obsidian/keybindings";
import IconButton from "utils/obsidian/classes/iconButton";

import { simpleHighlight, fuzzyHighlight } from "./utils/display";



type SuggestFlags = {
  fuzzy: boolean,
  regex: boolean,
  strictCase: boolean,
  instructions: boolean,
};

type SimpleSearchObject<T> = {
  item: T,
  string: string,
  match: [number, number],
};

type FuzzySearchObject<T> = {
  item: T,
  string: string,
  fuzzyResult: SearchResult,
};


interface SuggestModal {
  containerEl: HTMLElement;
  promptEl: HTMLElement;
  inputEl: HTMLInputElement;
  resultsEl: HTMLElement;
  instructionsEl: HTMLElement;
  open(): void;
  close(): void;
}



/**
 * Base class for creating a suggest modal, i.e. a pop-up that provides a list of
 * suggestions based on a query string, and allows the user to select one of the
 * suggestions.
 * @abstract
 */
export default abstract class BaseAbstractSuggest<T> implements SuggestModal {

  abstract getSourceItems(): T[] | Promise<T[]>;
  /**
   * Action to be taken when the Enter key is pressed on a result.
   * @abstract
   */
  abstract enterAction(result: T, event: MouseEvent | KeyboardEvent): void | Promise<void>;
  /**
   * Action to be taken when a result is clicked.
   * @abstract
   */
  abstract clickAction(result: T, event: MouseEvent | KeyboardEvent): void | Promise<void>;

  /**
   * Optional custom function to be executed when the modal is opened.
   */
  onOpen?(): void | Promise<void>;
  /**
   * Optional custom function to be executed when the modal is closed.
   */
  onClose?(): void | Promise<void>;


  protected itemToString: (item: T) => string;

  protected defaultResultDisplay: (resultEl: HTMLElement, item: T) => void;
  protected simpleResultDisplay: (resultEl: HTMLElement, object: SimpleSearchObject<T>) => void;
  protected fuzzyResultDisplay: (resultEl: HTMLElement, object: FuzzySearchObject<T>) => void;

  private searchDisplay: (items: T[], query: string) => void;


  public readonly id: string;

  public containerEl: HTMLElement;
  public promptEl: HTMLElement;
  public inputEl: HTMLInputElement;
  public resultsEl: HTMLElement;
  public instructionsEl: HTMLElement;

  protected app: App;
  protected scope: Scope;

  protected placeholder: string;
  protected instructions: {command: string, purpose: string}[];

  protected flags: SuggestFlags;
  protected iconButtons: {[Key in keyof SuggestFlags]?: IconButton};

  protected sourceItems: T[];
  protected renderedResults: T[];

  protected query: string;
  protected selectionIndex: number;


  constructor(app: App, modalId: string, flags?: {[Key in keyof SuggestFlags]?: boolean}) {
    this.app = app;
    this.id = modalId;

    this.flags = Object.assign({
      fuzzy: true,
      regex: false,
      strictCase: false,
      instructions: true
    }, flags);

    this.placeholder = "Enter text here...";
    this.instructions = [
      {command: "<A-f>", purpose: "fuzzy toggle"},
      {command: "<A-j/k>", purpose: "to navigate"},
      {command: "<CR>", purpose: "to choose"},
      {command: "<Esc>", purpose: "to dismiss"},
    ];

    this.registerKeymapEvents();

    this.setDisplayFunctions();
    this.resolveSearchDisplay();
  }


  protected setDisplayFunctions() {
    this.defaultResultDisplay = (resultEl, item) => {
      resultEl.innerHTML = this.itemToString(item);
    };
    this.simpleResultDisplay = (resultEl, object) => {
      resultEl.innerHTML = simpleHighlight(object.match, object.string);
    };
    this.fuzzyResultDisplay = (resultEl, object) => {
      resultEl.innerHTML = fuzzyHighlight(object.fuzzyResult.matches, object.string);
    };
  }


  private addSearchToggleIcons(): void {
    const inputContainer = this.inputEl.parentElement as HTMLElement;
    inputContainer.addClass("suggest-input-container");

    const iconContainer = createEl("div", { cls: "suggest-icon-container" });
    this.inputEl.addClass("suggest-input");
    inputContainer.appendChild(iconContainer);

    // TODO: Implement regex search.
    this.iconButtons = {
      // "regex": new IconButton({
      //   parentEl: iconContainer,
      //   iconId: "regex",
      //   tooltip: "Toggle Regular Expression",
      //   isActive: this.flags.regex,
      //   clickCallback: () => this.toggleRegexSearch(),
      // }),
      "fuzzy": new IconButton({
        parentEl: iconContainer,
        iconId: "search-code",
        tooltip: "Toggle Fuzzy Search",
        isActive: this.flags.fuzzy,
        clickCallback: () => this.toggleFuzzySearch(),
      }),
      "strictCase": new IconButton({
        parentEl: iconContainer,
        iconId: "case-sensitive",
        tooltip: "Toggle Case Sensitivity",
        isActive: this.flags.strictCase,
        clickCallback: () => this.toggleStrictCase(),
      }),
    };

  }


  private registerKeymapEvents(): void {
    this.scope = new Scope();

    registerKeybindings(this.scope, [
      // DEFAULT
      [[], "Escape", async () => {
        if (this.inputEl.value === "") await this.close();
        else await this.updateInputAndResults("");
      }],
      [[], "Enter", async (event) => {
        if (this.renderedResults.length === 0) return;
        await this.enterAction(this.renderedResults[this.selectionIndex], event);
      }],
      [[], "ArrowDown", () => this.setSelectedResultEl(this.selectionIndex + 1)],
      [[],   "ArrowUp", () => this.setSelectedResultEl(this.selectionIndex - 1)],
      // CUSTOM
      [["Alt"], "j", () => this.setSelectedResultEl(this.selectionIndex + 1)],
      [["Alt"], "k", () => this.setSelectedResultEl(this.selectionIndex - 1)],
      [["Alt"], "f", () => this.toggleFuzzySearch()],
      // TODO: <A-d> and <A-u> to scroll down and up by one page.
    ]);
  }


  private resolveSearchDisplay(): void {
    this.searchDisplay = this.flags.fuzzy ? this.fuzzySearchDisplay : this.simpleSearchDisplay;
  }


  private fuzzySearchDisplay(items: T[], query: string): void {
    const resultObjects: FuzzySearchObject<T>[] = [];

    for (const item of items) {
      const string = this.itemToString(item);
      const fuzzyResult = fuzzySearch(prepareQuery(query), string);
      if (!fuzzyResult) continue;
      resultObjects.push({item, string, fuzzyResult});
    }
    resultObjects.sort((a, b) => b.fuzzyResult.score - a.fuzzyResult.score);

    this.displayResults(resultObjects, this.fuzzyResultDisplay);
    this.renderedResults = resultObjects.map((object) => object.item);
  }


  private simpleSearchDisplay(items: T[], query: string): void {
    const resultObjects: SimpleSearchObject<T>[] = [];

    for (const item of items) {
      const string = this.itemToString(item);
      const matchIdx = this.flags.strictCase ? string.indexOf(query) : string.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
      if (matchIdx === -1) continue;
      const match = [matchIdx, matchIdx + query.length] as [number, number];
      resultObjects.push({item, string, match});
    }
    resultObjects.sort((a, b) => a.match[0] - b.match[0]);

    this.displayResults(resultObjects, this.simpleResultDisplay);
    this.renderedResults = resultObjects.map((object) => object.item);
  }


  private noSearchDisplay(items: T[]): void {
    this.displayResults(items, this.defaultResultDisplay);
    this.renderedResults = items;
  }


  private displayResults<U>(
    resultsArray: U[],
    displayFunction: (resultEl: HTMLElement, result: U) => void
  ): void {
    this.resultsEl.empty();

    for (const item of resultsArray) {
      const resultEl = createEl("div");

      displayFunction(resultEl, item);

      resultEl.addClass("suggestion-item");
      this.resultsEl.appendChild(resultEl);
    }
  }


  protected async updateInputAndResults(value: string, selectionIndex = 0): Promise<void> {
    this.inputEl.value = value;
    await this.refreshResults(value, selectionIndex);
  }


  protected async refreshResults(query: string, selectionIndex = 0) {
    this.sourceItems = await this.getSourceItems();
    this.query = query;

    // These fuctions call 'this.displayResults<U>()' and set 'this.renderedResults'.
    if (!query) this.noSearchDisplay(this.sourceItems);
    else        this.searchDisplay(this.sourceItems, query);

    this.setSelectedResultEl(selectionIndex);
  }


  /**
   * Set the result element at the given index as selected and scroll it into view if necessary.
   */
  protected setSelectedResultEl(index: number) {
    if (this.renderedResults.length === 0) return;
    this.selectionIndex = wrapAround(index, this.renderedResults.length);
    const resultEl = this.resultsEl.children[this.selectionIndex] as HTMLElement;

    this.resultsEl.find(".is-selected")?.removeClass("is-selected");
    resultEl.addClass("is-selected");

    if (resultEl.getBoundingClientRect().bottom > this.resultsEl.getBoundingClientRect().bottom) {
      resultEl.scrollIntoView({block: "end", inline: "nearest"});
    } else if (resultEl.getBoundingClientRect().top < this.resultsEl.getBoundingClientRect().top) {
      resultEl.scrollIntoView({block: "start", inline: "nearest"});
    }
  }


  protected toggleFuzzySearch(): void {
    this.flags.fuzzy = !this.flags.fuzzy;
    this.iconButtons.fuzzy?.toggle(this.flags.fuzzy);
    this.resolveSearchDisplay();
    this.inputEl.dispatchEvent(new Event("input"));
    this.inputEl.focus();
  }


  /**
   * TODO: Implement this functionality.
   */
  protected toggleRegexSearch(): void {
    this.flags.regex = !this.flags.regex;
    this.iconButtons.regex?.toggle(this.flags.regex);
    this.inputEl.dispatchEvent(new Event("input"));
    this.inputEl.focus();
  }


  protected toggleStrictCase(): void {
    this.flags.strictCase = !this.flags.strictCase;
    this.iconButtons.strictCase?.toggle(this.flags.strictCase);
    this.inputEl.dispatchEvent(new Event("input"));
    this.inputEl.focus();
  }


  private createSuggestModalElements(): void {

    // Input Container
    const inputContainer = createEl("div", { cls: "prompt-input-container" });
    this.inputEl = createEl("input", {
      cls: "prompt-input suggest-prompt-input",
      attr: { id: `${this.id}-input`, enterkeyhint: "done", type: "text" },
    });
    inputContainer.appendChild(this.inputEl);
    this.addSearchToggleIcons();

    // Prompt Results Container
    this.resultsEl = createEl("div", {
      cls: "prompt-results",
      attr: { id: `${this.id}-results`, style: "overflow-y: auto;" },
    });

    // Prompt Instructions Container
    this.instructionsEl = createEl("div", {
      cls: "prompt-instructions",
      attr: { id: `${this.id}-instructions` }
    });

    // Prompt Container
    this.promptEl = createEl("div", {
      cls: "prompt",
      attr: { id: `${this.id}-prompt` },
    });
    this.promptEl.appendChild(inputContainer);
    this.promptEl.appendChild(this.resultsEl);
    this.promptEl.appendChild(this.instructionsEl);

    // Modal Background
    const modalBgEl = createEl("div", {
      cls: "modal-bg",
      attr: { style: "opacity: 0.85;" },
    });

    // Modal Container
    this.containerEl = createEl("div", {
      cls: "modal-container mod-dim",
      attr: { id: `${this.id}-container` },
    });
    this.containerEl.appendChild(modalBgEl);
    this.containerEl.appendChild(this.promptEl);

    // Append to body
    document.body.appendChild(this.containerEl);
  }


  private addCoreInteractionEvents(): void {
    // NOTE: 'preventDefault' might be useful for some events.
    //        Only use it if completely necessary.

    // On Result Click: Select and Perform Action
    this.resultsEl.on("click", ".suggestion-item", (event, element) => {
      const clickedIndex = this.resultsEl.indexOf(element);
      this.setSelectedResultEl(clickedIndex);
      this.clickAction(this.renderedResults[clickedIndex], event);
    }, {capture: true});

    // On Result Hover: Set Selected
    this.resultsEl.on("mousemove", ".suggestion-item", (event, element) => {
      const hoveredIndex = this.resultsEl.indexOf(element);
      this.setSelectedResultEl(hoveredIndex);
    }, {capture: true});

    // On Input Change: Render Results
    this.inputEl.addEventListener("input", async (event) => {
      await this.refreshResults(this.inputEl.value);
    });

    // On Click Outside of Prompt: Close
    this.containerEl.addEventListener("click", async (event) => {
      if (!this.promptEl.contains(event.target as Node)){
        await this.close();
      }
    }, {capture: true});

  }


  protected setInstructions(): void {
    this.instructionsEl.empty();
    if (!this.flags.instructions) return;

    this.instructions.forEach((instruction) => {
      const instructionEl = createEl("div", { cls: "prompt-instruction" });

      instructionEl.createEl("span", {
        cls: "prompt-instruction-command",
        text: instruction.command,
      });
      instructionEl.createEl("span", {
        cls: "prompt-instruction-purpose",
        text: instruction.purpose,
      });

      this.instructionsEl.appendChild(instructionEl);
    });
  }


  public setPlaceholder(placeholder: string): void {
    this.placeholder = placeholder;
  }


  /**
   * This function runs the following setup tasks:
   * - Creates the modal elements.
   * - Adds core interaction events.
   * - Sets the placeholder text for the input element.
   * - Sets the instructions for the prompt.
   * - Calls the `onOpen` function (if defined).
   * - Focuses the input element.
   * - Renders the results based on the query string.
   * - Pushes the modal scope to the keymap.
   */
  public async open() {
    this.createSuggestModalElements();
    this.addCoreInteractionEvents();

    this.inputEl.setAttribute("placeholder", this.placeholder);
    // TODO:
    // - Set toggleable default instructions.
    // - Function to append custom instructions.
    // - Method to remove some or all instructions.
    this.setInstructions();

    await this.onOpen?.();
    // `onOpen` could potentially modify the behavior of the following lines.
    await this.refreshResults("");
    this.inputEl.focus();
    this.app.keymap.pushScope(this.scope);
  }


  /**
   * This function runs the following cleanup tasks:
   * - Calls the `onClose` function (if defined).
   * - Removes the modal elements from the DOM.
   * - Pops the modal scope from the keymap.
   * - Focuses the editor of the active MarkdownView.
   */
  public async close() {
    await this.onClose?.();
    this.containerEl.remove();
    this.app.keymap.popScope(this.scope);
    this.app.workspace.getActiveViewOfType(MarkdownView)?.editor.focus();
  }

}

