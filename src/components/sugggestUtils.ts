import {
  App,
  Scope,
  Vault,
  MarkdownView,
  TFile,
  Editor,
  fuzzySearch,
  prepareQuery,
  PreparedQuery,
  sortSearchResults,
} from "obsidian";

import {
  wrapAround
} from "utils";



/**
 * Base class for creating a suggest modal, i.e. a pop-up that provides a list of
 * suggestions based on a query string, and allows the user to select one of the
 * suggestions.
 */
export abstract class BaseAbstractSuggest<T> {

  public id: string;
  protected app: App;
  protected scope: Scope;

  protected containerEl: HTMLElement;
  protected promptEl: HTMLElement;
  protected inputEl: HTMLInputElement;
  protected resultsEl: HTMLElement;
  protected instructionsEl: HTMLElement;

  protected fuzzy: boolean;
  protected query: string;
  protected preparedQuery?: PreparedQuery | null;
  /**
   * Filter (and sort) the source items based on the query string.
   * @returns A filtered array of items.
   */
  protected resultsFilter: (source: T[], itemString: (item: T) => string, query?: string) => T[];
  /**
   * Render the text with the query string highlighted if it matches (fuzzy or simple).
   */
  protected resultItemRenderer: (text: string, resultEl: HTMLElement) => void;

  protected queriedResults: T[];
  protected selectionIndex: number;


  constructor(app: App, modalId: string, options?: {fuzzy?: boolean}) {
    this.app = app;
    this.id = modalId;
    this.fuzzy = options?.fuzzy ?? true;
    this.setResultsFilter(this.fuzzy);
    this.setResultItemRenderer(this.fuzzy);
    this.registerKeymapEvents();
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
    await this.renderResults("");
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


  private setResultsFilter(isFuzzy: boolean): void {

    /**
     * Filter and sort the source items based on the query string using
     * a fuzzy search algorithm.
     */
    function fuzzyFilter(source: T[], itemString: (item: T) => string, query: string): T[] {
      // this.query = query;
      this.preparedQuery = prepareQuery(query ?? "");

      if (!query) return source;

      return source
        .map((item) => ({
          item, score: fuzzySearch(this.preparedQuery!, itemString(item))?.score ?? 0,
        }))
        .filter((result) => result.score !== 0)
        .sort((a, b) => b.score - a.score)
        .map((result) => result.item);
    }

    /**
     * Filter the source items based on whether the item string contains
     * the query string (case-insensitive).
     */
    function simpleFilter(source: T[], itemString: (item: T) => string, query: string): T[] {
      // this.query = query;
      this.preparedQuery = prepareQuery(query ?? "");

      if (!query) return source;

      return source.filter((item) => itemString(item).toLocaleLowerCase().contains(query.toLocaleLowerCase()));
    }

    if (isFuzzy) {
      this.resultsFilter = fuzzyFilter;
    } else {
      this.resultsFilter = simpleFilter;
    }

  }


  private setResultItemRenderer(isFuzzy: boolean): void {

    /**
     * Render the text with the query string highlighted using a fuzzy search algorithm.
     */
    function fuzzyRenderer(text: string, resultEl: HTMLElement): void {
      const fuzzyResult = fuzzySearch(this.preparedQuery!, text)!;
      if (!fuzzyResult) return;

      let { score, matches } = fuzzyResult;
      // Sort in descending order to replace string sections from right to left at
      // the appropriate indices.
      matches.sort((a, b) => b[0] - a[0]);
      // We also assume that the matches do not overlap.
      matches.forEach((match) => {
        const leadStr = text.slice(0, match[0]);
        const matchStr = text.slice(match[0], match[1]);
        const tailStr = text.slice(match[1]);
        text = `${leadStr}<b style="color: var(--text-accent);">${matchStr}</b>${tailStr}`;
      });

      // Display the score of the fuzzy search.
      // resultEl.innerHTML = `<span style="color: var(--color-red);">${score.toFixed(4)}</span>  ${text}`;

      // TODO: Add reminder for distiction between innerHTML and textContent.
      resultEl.innerHTML = text;
    }

    /**
     * Render the text with the query string highlighted.
     */
    function simpleRenderer(text: string, resultEl: HTMLElement): void {
      const matchIdx = text.toLocaleLowerCase().indexOf(this.query.toLocaleLowerCase());
      const match = [matchIdx, matchIdx + this.query.length];

      const leadStr = text.slice(0, match[0]);
      const matchStr = text.slice(match[0], match[1]);
      const tailStr = text.slice(match[1]);

      resultEl.innerHTML = `${leadStr}<b style="color: var(--text-accent);">${matchStr}</b>${tailStr}`;
    }

    if (isFuzzy) {
      this.resultItemRenderer = fuzzyRenderer;
    } else {
      this.resultItemRenderer = simpleRenderer;
    }
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

    // On Result Click
    this.resultsEl.on("click", ".suggestion-item", (event, element) => {
      event.preventDefault(); // TODO: Check if this is necessary.
      const clickedIndex = this.resultsEl.indexOf(element);
      this.setSelectedResultEl(clickedIndex);
      this.clickAction(this.queriedResults[clickedIndex], event);
    });

    // On Result Hover
    this.resultsEl.on("mousemove", ".suggestion-item", (event, element) => {
      const hoveredIndex = this.resultsEl.indexOf(element);
      this.setSelectedResultEl(hoveredIndex);
    });

    // On Input Change
    this.inputEl.addEventListener("input", async () => {
      await this.renderResults(this.inputEl.value);
      // console.log("----------------");
    });

    // Close on click outside of prompt.
    this.containerEl.addEventListener("click", async (event) => {
      if (!this.promptEl.contains(event.target as Node)){
        await this.close();
      }
    }, {capture: true});

  }


  private registerKeymapEvents(): void {
    this.scope = new Scope();

    // DEFAULT KEYBINDINGS
    this.scope.register([], "Escape", async (event) => {
      if (!event.isComposing) {
        await this.close();
        return false;
      }
    });
    this.scope.register([], "Enter", async (event) => {
      if (!event.isComposing) {
        event.preventDefault(); // Prevent default behavior of inserting a newline on the editor.
        await this.enterAction(this.queriedResults[this.selectionIndex], event);
        return false;
      }
    });
    this.scope.register([], "ArrowDown", (event) => {
      if (!event.isComposing) {
        this.setSelectedResultEl(this.selectionIndex + 1);
        return false;
      }
    });
    this.scope.register([], "ArrowUp", (event) => {
      if (!event.isComposing) {
        this.setSelectedResultEl(this.selectionIndex - 1);
        return false;
      }
    });

    // CUSTOM KEYBINDINGS
    this.scope.register(["Alt"], "j", (event) => {
      if (!event.isComposing) {
        this.setSelectedResultEl(this.selectionIndex + 1);
        return false;
      }
    });
    this.scope.register(["Alt"], "k", (event) => {
      if (!event.isComposing) {
        this.setSelectedResultEl(this.selectionIndex - 1);
        return false;
      }
    });
    this.scope.register(["Alt"], "f", (event) => {
      if (!event.isComposing) {
        this.fuzzy = !this.fuzzy;
        this.setResultsFilter(this.fuzzy);
        this.setResultItemRenderer(this.fuzzy);
        this.inputEl.dispatchEvent(new Event("input"));
        return false;
      }
    });
    this.scope.register(["Ctrl"], "u", async (event) => {
      if (!event.isComposing) {
        await this.updateInputAndResults("");
        return false;
      }
    });
  }


  async updateInputAndResults(value: string): Promise<void> {
    this.inputEl.value = value;
    await this.renderResults(value);
  }


  /**
   * Render results to the `resultEl` based on the query string provided.
   */
  async renderResults(query: string, selectionIndex: number = 0) {
    this.query = query;
    this.queriedResults = await this.getFilteredResults(query);
    this.resultsEl.empty();
    this.queriedResults.forEach((result) => {
      const resultEl = this.renderResultItem(result);
      resultEl.addClass("suggestion-item");
      this.resultsEl.appendChild(resultEl);
    });
    this.setSelectedResultEl(selectionIndex);
  }

  /**
   * Set the result element at the given index as selected and scroll it
   * into view if necessary.
   */
  setSelectedResultEl(index: number) {
    this.selectionIndex = wrapAround(index, this.queriedResults.length);

    const newSelected = this.resultsEl.children[this.selectionIndex] as HTMLElement;
    const prevSelected = this.resultsEl.find(".is-selected");
    if (prevSelected) prevSelected.removeClass("is-selected");
    newSelected.addClass("is-selected");

    if (newSelected.getBoundingClientRect().bottom > this.resultsEl.getBoundingClientRect().bottom) {
      newSelected.scrollIntoView({block: "end", inline: "nearest"});
    } else if (newSelected.getBoundingClientRect().top < this.resultsEl.getBoundingClientRect().top) {
      newSelected.scrollIntoView({block: "start", inline: "nearest"});
    }
  }

  /**
   * @abstract
   */
  abstract getFilteredResults(query?: string): T[] | Promise<T[]>;
  /**
   * @abstract
   */
  abstract renderResultItem(result: T): HTMLElement;
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
  private items: T[];
  private itemToString: (item: T) => string;

  private selectedItem?: T;

  constructor(app: App, items: T[], itemToString: (item: T) => string) {
    super(app, "quick-suggest", {fuzzy: true});
    this.items = items;
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

  getFilteredResults(query?: string): T[] {
    return this.resultsFilter(this.items, this.itemToString, query);
  }

  renderResultItem(result: T): HTMLElement {
    const resultEl = createEl("div");
    const text = this.itemToString(result);

    if (this.query) this.resultItemRenderer(text, resultEl);
    else resultEl.innerText = text;

    return resultEl;
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


