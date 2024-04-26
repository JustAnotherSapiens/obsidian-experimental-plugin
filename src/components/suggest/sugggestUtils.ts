import {
  App,
  Scope,
  Vault,
  MarkdownView,
  TFile,
  Editor,
  fuzzySearch,
  SearchMatches,
  SearchResult,
  PreparedQuery,
  prepareQuery,
  Modifier,
  KeymapContext,
} from "obsidian";

import { DataNode } from "dataStructures/generics";

import {
  wrapAround
} from "utils/utilsCore";



export function registerKeybinding(
  scope: Scope,
  modifiers: Modifier[],
  key: string | null,
  callback: (event: KeyboardEvent) => void | Promise<void>
): void {
  scope.register(modifiers, key,
    async (event: KeyboardEvent, context: KeymapContext) => {
      if (!event.isComposing) {
        event.preventDefault();
        await callback(event);
        return false;
      }
    }
  );
}


export function registerKeybindings(
  scope: Scope,
  bindings: [
    modifiers: Modifier[],
    key: string | null,
    callback: (event: KeyboardEvent) => void,
  ][]
): void {
  bindings.forEach(
    (binding) => registerKeybinding(scope, ...binding)
  );
}


export function simpleHighlight(text: string, match: [number, number]): string {
  const leadStr = text.slice(0, match[0]);
  const matchStr = text.slice(match[0], match[1]);
  const tailStr = text.slice(match[1]);
  return `${leadStr}<b style="color: var(--text-accent);">${matchStr}</b>${tailStr}`;
}


export function fuzzyHighlight(text: string, matches: [number, number][]): string {
  for (let i = matches.length - 1; i >= 0; i--)
    text = simpleHighlight(text, matches[i]);
  return text;
}


export function scoredText(score: number, text: string): string {
  return `<span style="color: var(--color-red);">${score.toFixed(4)}</span>  ${text}`;
}



type SuggestFlags = {
  fuzzy?: boolean,
  strictCase?: boolean,
  instructions?: boolean,
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


/**
 * Base class for creating a suggest modal, i.e. a pop-up that provides a list of
 * suggestions based on a query string, and allows the user to select one of the
 * suggestions.
 * @abstract
 */
export abstract class BaseAbstractSuggest<T> {

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

  public id: string;
  protected app: App;
  protected scope: Scope;

  protected containerEl: HTMLElement;
  protected promptEl: HTMLElement;
  protected inputEl: HTMLInputElement;
  protected resultsEl: HTMLElement;
  protected instructionsEl: HTMLElement;

  protected flags: SuggestFlags;

  protected sourceItems: T[];
  protected itemToString: (item: T) => string;

  protected query: string;
  private searchDisplay: (items: T[], query: string) => void;

  protected renderedResults: T[];
  protected selectionIndex: number;

  protected defaultResultDisplay: (resultEl: HTMLElement, item: T) => void;
  protected simpleResultDisplay: (resultEl: HTMLElement, object: SimpleSearchObject<T>) => void;
  protected fuzzyResultDisplay: (resultEl: HTMLElement, object: FuzzySearchObject<T>) => void;

  constructor(app: App, modalId: string, flags?: SuggestFlags) {
    this.app = app;
    this.id = modalId;
    this.flags = Object.assign({fuzzy: true, strictCase: false, instructions: true}, flags);

    this.registerKeymapEvents();
    this.setResultDisplayFunctions();
    this.setSearchDisplay();
  }


  private registerKeymapEvents(): void {
    this.scope = new Scope();

    registerKeybindings(this.scope, [
      // DEFAULT
      [[],  "Escape", async () => await this.close()],
      [[],   "Enter", async (event) => await this.enterAction(this.renderedResults[this.selectionIndex], event)],
      [[], "ArrowDown", () => this.setSelectedResultEl(this.selectionIndex + 1)],
      [[],   "ArrowUp", () => this.setSelectedResultEl(this.selectionIndex - 1)],
      // CUSTOM
      [["Alt"],  "j", () => this.setSelectedResultEl(this.selectionIndex + 1)],
      [["Alt"],  "k", () => this.setSelectedResultEl(this.selectionIndex - 1)],
      [["Alt"],  "f", () => this.toggleFuzzySearch()],
      [["Ctrl"], "u", async () => await this.updateInputAndResults("")],
      // TODO: <A-d> and <A-u> to scroll down and up by one page.
    ]);
  }


  private setResultDisplayFunctions(): void {
    this.defaultResultDisplay = (resultEl, item) => {
      resultEl.innerText = this.itemToString(item);
    };
    this.simpleResultDisplay = (resultEl, object) => {
      resultEl.innerHTML = simpleHighlight(object.string, object.match);
    };
    this.fuzzyResultDisplay = (resultEl, object) => {
      resultEl.innerHTML = fuzzyHighlight(object.string, object.fuzzyResult.matches);
    };
  }


  private setSearchDisplay(): void {
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


  async updateInputAndResults(value: string, selectionIndex = 0): Promise<void> {
    this.inputEl.value = value;
    await this.refreshResults(value, selectionIndex);
  }


  async refreshResults(query: string, selectionIndex = 0) {
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
  setSelectedResultEl(index: number) {
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


  toggleFuzzySearch(): void {
    this.flags.fuzzy = !this.flags.fuzzy;
    this.setSearchDisplay();
    this.inputEl.dispatchEvent(new Event("input"));
  }



  private createSuggestModalElements(): void {

    // Prompt Input Container
    const promptInputContainerEl = createEl("div", { cls: "prompt-input-container" });
    promptInputContainerEl.appendChild(createEl("input", {
      cls: "prompt-input",
      attr: { id: `${this.id}-input`, enterkeyhint: "done", type: "text" },
    }));
    promptInputContainerEl.appendChild(createEl("div", { cls: "prompt-input-cta" }));

    // Prompt Results Container
    const promptResultsEl = createEl("div", {
      cls: "prompt-results",
      attr: { id: `${this.id}-results`, style: "overflow-y: auto;" },
    });

    // Prompt Instructions Container
    const instructionsEl = createEl("div", {
      cls: "prompt-instructions",
      attr: { id: `${this.id}-instructions` }
    });

    // Prompt Container
    const promptEl = createEl("div", {
      cls: "prompt",
      attr: { id: `${this.id}-prompt` },
    });
    promptEl.appendChild(promptInputContainerEl);
    promptEl.appendChild(promptResultsEl);
    promptEl.appendChild(instructionsEl);

    // Modal Background
    const modalBgEl = createEl("div", {
      cls: "modal-bg",
      attr: { style: "opacity: 0.85;" },
    });

    // Modal Container
    const containerEl = createEl("div", {
      cls: "modal-container mod-dim",
      attr: { id: `${this.id}-container` },
    });
    containerEl.appendChild(modalBgEl);
    containerEl.appendChild(promptEl);

    // Append to body
    document.body.appendChild(containerEl);

    // Assign Elements
    this.containerEl = document.getElementById(`${this.id}-container`) as HTMLElement;
    this.promptEl = document.getElementById(`${this.id}-prompt`) as HTMLElement;
    this.inputEl = document.getElementById(`${this.id}-input`) as HTMLInputElement;
    this.resultsEl = document.getElementById(`${this.id}-results`) as HTMLElement;
    this.instructionsEl = document.getElementById(`${this.id}-instructions`) as HTMLElement;
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


  setPlaceholder(placeholder: string): void {
    this.inputEl.setAttribute("placeholder", placeholder);
  }


  setInstructions(instructions: Array<{command: string, purpose: string}>): void {
    this.instructionsEl.empty();
    instructions.forEach((instruction) => {
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
  async open() {
    this.createSuggestModalElements();
    this.addCoreInteractionEvents();

    this.setPlaceholder("Enter text here...");
    // TODO:
    // - Set toggleable default instructions.
    // - Function to append custom instructions.
    // - Method to remove some or all instructions.
    this.setInstructions([
      {command: "<A-f>", purpose: "fuzzy toggle"},
      {command: "<A-j/k>", purpose: "to navigate"},
      {command: "<CR>", purpose: "to choose"},
      {command: "<Esc>", purpose: "to dismiss"},
    ]);

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
  async close() {
    await this.onClose?.();
    this.containerEl.remove();
    this.app.keymap.popScope(this.scope);
    this.app.workspace.getActiveViewOfType(MarkdownView)?.editor.focus();
  }


}



/**
 * An abstract suggest class that builds a data tree and allows the user to navigate it.
 * @abstract
 * @extends BaseAbstractSuggest<DataNode<T>>
 */
export abstract class DataNodeSuggest<T> extends BaseAbstractSuggest<DataNode<T>> {

  /**
   * Ideally, the data tree should be built upon nodes with multiple children.
   * @returns The root node of the data tree.
   * @abstract
   */
  abstract buildDataTree(): Promise<DataNode<T>>;

  protected parentNode: DataNode<T>;
  private selectionIndexStack: number[] = [];
  private selectionQueryStack: string[] = [];

  constructor(app: App, nodeToString: (node: DataNode<T>) => string) {
    super(app, "data-node-suggest", {fuzzy: true});
    this.itemToString = nodeToString;
  }

  async onOpen(): Promise<void> {
    registerKeybindings(this.scope, [
      [["Alt"],  "l", async () => await this.stepInto(this.renderedResults[this.selectionIndex])],
      [["Alt"],  "h", async () => await this.stepOut()],
    ]);
    this.parentNode = await this.buildDataTree();
  }

  async stepInto(result: DataNode<T>): Promise<boolean> {
    if (result.children.length === 0) return false;
    this.parentNode = result;
    this.selectionIndexStack.push(this.selectionIndex);
    this.selectionQueryStack.push(this.query);
    await this.updateInputAndResults("");
    return true;
  }

  async stepOut(): Promise<boolean> {
    if (!this.parentNode.parent) return false;
    this.parentNode = this.parentNode.parent;
    await this.updateInputAndResults(
      this.selectionQueryStack.pop()!,
      this.selectionIndexStack.pop()!
    );
    return true;
  }

  getSourceItems(): DataNode<T>[] {
    return this.parentNode.children;
  }

  enterAction(result: DataNode<T>, event: MouseEvent | KeyboardEvent): void | Promise<void> {
    this.stepInto(result);
  }

  clickAction(result: DataNode<T>, event: MouseEvent | KeyboardEvent): void | Promise<void> {
    throw new Error("Method not implemented.");
  }

}



/**
 * A BaseAbstractSuggest class that is tied to the active MarkdownView.
 *
 * Ease-of-access attributes:
 * - `vault`: The active Vault.
 * - `view`: The active MarkdownView.
 * - `file`: The active TFile.
 * - `editor`: The active Editor.
 *
 * @extends BaseAbstractSuggest<T>
 */
export abstract class ViewAbstractSuggest<T> extends BaseAbstractSuggest<T> {
  protected vault: Vault;
  protected view?: MarkdownView;
  protected file?: TFile;
  protected editor?: Editor;

  constructor(app: App, modalId: string, options?: {fuzzy?: boolean}) {
    super(app, modalId, options);
    this.vault = this.app.vault;
    this.view = this.app.workspace.getActiveViewOfType(MarkdownView) ?? undefined;
    this.file = this.view?.file ?? undefined;
    this.editor = this.view?.editor ?? undefined;
  }
}



/**
 * A simple Suggest class to be used internally for the 'runQuickSuggest' function.
 */
class QuickSuggest<T> extends BaseAbstractSuggest<T> {
  private selectedItem?: T;

  constructor(app: App, items: T[], itemToString: (item: T) => string) {
    super(app, "quick-suggest", {fuzzy: true});
    this.sourceItems = items;
    this.itemToString = itemToString;
  }

  waitForSelection(): Promise<T | null> {
    if (this.selectedItem){
      return new Promise((resolve) => resolve(this.selectedItem!));
      // Since the 'async' keyword implies that the function will return
      // a Promise, the above line can be simplified to:
      // return this.selectedItem!;
    }
    // 'resolve' is a function that must be called to fulfill the promise, i.e.
    // the Promise will remain pending until 'resolve' is called.
    // Calling 'resolve' on the 'this.onClose' function will ensure that the
    // promise is fulfilled when the modal is closed.
    return new Promise((resolve) => {
      this.onClose = () => resolve(this.selectedItem ?? null);
    });
  }

  getSourceItems(): T[] {
    return this.sourceItems;
  }

  enterAction(result: T, evt: MouseEvent | KeyboardEvent): void {
    this.selectedItem = result;
    this.close();
  }

  clickAction(result: T, evt: MouseEvent | KeyboardEvent): void {
    this.enterAction(result, evt);
  }

}


/**
 * Quickly select an item from a list.
 * @returns the selected item.
 */
export async function runQuickSuggest<T>(
  app: App,
  items: T[],
  itemToText: (item: T) => string
): Promise<T | null> {
  const quickSuggest = new QuickSuggest(app, items, itemToText);
  await quickSuggest.open();
  return await quickSuggest.waitForSelection();
}



