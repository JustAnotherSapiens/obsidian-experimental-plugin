import {
  App,
  MarkdownView,
  Scope,
  SearchResult,
  fuzzySearch,
  prepareQuery,
} from 'obsidian';

import { wrapAround } from 'utils/generic';
import { getSetting } from 'utils/obsidian/settings';
import registerKeybindings from 'utils/obsidian/keybindings';
import IconButton from 'utils/obsidian/classes/iconButton';

import { simpleHighlight, fuzzyHighlight } from './utils/display';


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
  public iconContainerEl: HTMLElement;

  protected app: App;
  protected scope: Scope;

  protected placeholder: string;
  protected instructions: {command: string, purpose: string}[];

  protected flags: {[key: string]: boolean};
  protected iconButtons: Map<string, IconButton>;

  protected sourceItems: T[];
  protected renderedResults: T[];

  protected query: string;
  protected selectionIndex: number;


  constructor(app: App, modalId: string, flags?: {[key: string]: boolean}) {
    this.app = app;
    this.id = modalId;

    this.flags = Object.assign({
      fuzzySearch: true,
      strictCase: false,
      instructions: getSetting('showSuggestInstructions'),
    }, flags);

    // NOTE: This element MUST exist before any IconButton gets created (either here or in a subclass).
    this.iconContainerEl = createEl('div', { cls: 'suggest-icon-container' });
    this.iconButtons = new Map();
    this.addDefaultIconButtons();

    this.placeholder = 'Enter text here...';
    this.instructions = [
      {command: '<A-f>', purpose: 'fuzzy toggle'},
      {command: '<A-j/k>', purpose: 'to navigate'},
      {command: '<CR>', purpose: 'to choose'},
      {command: '<Esc>', purpose: 'to dismiss'},
    ];

    this.registerKeymapEvents();

    this.setDisplayFunctions();
    this.resolveSearchDisplay();
  }


  private addDefaultIconButtons(): void {

    this.iconButtons.set('fuzzySearch', new IconButton({
      parentEl: this.iconContainerEl,
      iconId: 'search-code',
      tooltip: 'Toggle Fuzzy Search <Alt+F>',
      isActive: this.flags.fuzzySearch,
      clickCallback: () => this.toggleFuzzySearch(),
    }));

    // (only works for simple search, i.e. not for fuzzy search)
    this.iconButtons.set('strictCase', new IconButton({
      parentEl: this.iconContainerEl,
      iconId: 'case-sensitive',
      tooltip: 'Toggle Case Sensitivity <Alt+S>',
      isActive: this.flags.strictCase,
      clickCallback: () => this.toggleIconButton('strictCase'),
    }));

    // // TODO: Implement regex search.
    // this.newIconButtons.set('regex', new IconButton({
    //   parentEl: this.iconContainerEl,
    //   iconId: 'regex',
    //   tooltip: 'Toggle Regular Expression',
    //   isActive: this.flags.regex,
    //   clickCallback: () => this.toggleIconButton('regex'),
    // }));

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
    this.inputEl.addClass('suggest-input');

    const inputContainer = this.inputEl.parentElement as HTMLElement;
    inputContainer.addClass('suggest-input-container');

    // Since the icon container is right-aligned, and the icons get added from
    // the most generic to the most specific, it is visually more appealing to
    // have the most specific icons on the left (closer to the input text), or,
    // conversely, to have the most generic icons at a fixed position (at the
    // right corner).
    const reversedIcons = Array.from(this.iconContainerEl.children).reverse();
    for (const iconEl of reversedIcons) {
      this.iconContainerEl.appendChild(iconEl);
    }

    // Append the Icon Container to the Input Container.
    inputContainer.appendChild(this.iconContainerEl);

    // Set the CSS variable for the number of icons.
    const iconCount = this.iconButtons.size;
    this.iconContainerEl.style.setProperty('--suggest-icon-count', iconCount.toString());
  }


  private registerKeymapEvents(): void {
    this.scope = new Scope();

    registerKeybindings(this.scope, [

      // Close
      [[], 'Escape', async () => await this.close()],

      // Clear text input
      [['Ctrl'], 'u', async () => await this.updateInputAndResults('')],
      [['Alt'],  'u', async () => await this.updateInputAndResults('')],

      // Select item
      [[], 'Enter', async (event) => {
        if (this.renderedResults.length === 0) return;
        await this.enterAction(this.renderedResults[this.selectionIndex], event);
      }],

      // Move selection up/down
      [[], 'ArrowDown', () => this.setSelectedResultEl(this.selectionIndex + 1)],
      [[],   'ArrowUp', () => this.setSelectedResultEl(this.selectionIndex - 1)],
      [['Alt'], 'j', () => this.setSelectedResultEl(this.selectionIndex + 1)],
      [['Alt'], 'k', () => this.setSelectedResultEl(this.selectionIndex - 1)],

      // Toggle custom functionality
      [['Alt'], 'f', () => this.toggleFuzzySearch()],
      [['Alt'], 's', () => this.toggleStrictCase()],
      [['Alt'], '.', () => this.toggleInstructionsVisibility()],

      // TODO: Add default hotkeys to scroll down and up by one result page.
    ]);
  }


  private resolveSearchDisplay(): void {
    this.searchDisplay = this.flags.fuzzySearch ? this.fuzzySearchDisplay : this.simpleSearchDisplay;
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
      const resultEl = createEl('div');

      displayFunction(resultEl, item);

      resultEl.addClass('suggestion-item');
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

    this.resultsEl.find('.is-selected')?.removeClass('is-selected');
    resultEl.addClass('is-selected');

    if (resultEl.getBoundingClientRect().bottom > this.resultsEl.getBoundingClientRect().bottom) {
      resultEl.scrollIntoView({block: 'end', inline: 'nearest'});
    } else if (resultEl.getBoundingClientRect().top < this.resultsEl.getBoundingClientRect().top) {
      resultEl.scrollIntoView({block: 'start', inline: 'nearest'});
    }
  }


  /**
   * Toggle the `this.flags[iconId]` value and update the icon button accordingly.
   * 
   * After the `callback` dispatch an 'input' Event to the `this.inputEl` and bring it to focus.
   * @param iconId 
   * @param callback An additional specific action that the icon button is supposed to perform.
   */
  protected toggleIconButton(iconId: string, callback?: () => void): void {
    this.flags[iconId] = !this.flags[iconId];
    this.iconButtons.get(iconId)?.toggle(this.flags[iconId]);
    callback?.();
    // The 'input' event listener on the `this.inputEl` triggers the
    // `this.refreshResults()` asynchronous method.
    this.inputEl.dispatchEvent(new Event('input'));
    this.inputEl.focus();
  }


  private createSuggestModalElements(): void {

    // Prompt Input Element
    this.inputEl = createEl('input', {
      cls: 'prompt-input suggest-prompt-input',
      attr: { id: `${this.id}-input`, enterkeyhint: 'done', type: 'text' },
    });

    // Prompt Input Container
    const inputContainer = createEl('div', { cls: 'prompt-input-container' });
    inputContainer.appendChild(this.inputEl);

    // Prompt Results Container
    this.resultsEl = createEl('div', {
      cls: 'prompt-results',
      attr: { id: `${this.id}-results`, style: 'overflow-y: auto;' },
    });

    // Prompt Instructions Container
    this.instructionsEl = createEl('div', {
      cls: 'prompt-instructions',
      attr: { id: `${this.id}-instructions` }
    });
    this.addInstructions();

    // Prompt Container
    this.promptEl = createEl('div', {
      cls: 'prompt',
      attr: { id: `${this.id}-prompt` },
    });
    this.promptEl.appendChild(inputContainer);
    this.promptEl.appendChild(this.resultsEl);
    this.promptEl.appendChild(this.instructionsEl);

    // Modal Background
    const modalBgEl = createEl('div', {
      cls: 'modal-bg',
      attr: { style: 'opacity: 0.85;' },
    });

    // Modal Container
    this.containerEl = createEl('div', {
      cls: 'modal-container mod-dim',
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
    this.resultsEl.on('click', '.suggestion-item', (event, element) => {
      const clickedIndex = this.resultsEl.indexOf(element);
      this.setSelectedResultEl(clickedIndex);
      this.clickAction(this.renderedResults[clickedIndex], event);
    }, {capture: true});

    // On Result Hover: Set Selected
    this.resultsEl.on('mousemove', '.suggestion-item', (event, element) => {
      const hoveredIndex = this.resultsEl.indexOf(element);
      this.setSelectedResultEl(hoveredIndex);
    }, {capture: true});

    // On Input Change: Render Results
    this.inputEl.addEventListener('input', async (event) => {
      await this.refreshResults(this.inputEl.value);
    });

    // On Click Outside of Prompt: Close
    this.containerEl.addEventListener('click', async (event) => {
      if (!this.promptEl.contains(event.target as Node)){
        await this.close();
      }
    }, {capture: true});

  }


  private addInstructions(): void {
    // Ensure that the instructions container is empty.
    this.instructionsEl.empty();

    // Append Instructions
    this.instructions.forEach((instruction) => {
      const instructionEl = createEl('div', { cls: 'prompt-instruction' });

      instructionEl.createEl('span', {
        cls: 'prompt-instruction-command',
        text: instruction.command,
      });
      instructionEl.createEl('span', {
        cls: 'prompt-instruction-purpose',
        text: instruction.purpose,
      });

      this.instructionsEl.appendChild(instructionEl);
    });

    if (!this.flags.instructions){
      this.instructionsEl.toggle(false);
    }
  }


  protected toggleInstructionsVisibility(): void {
    this.flags.instructions = !this.flags.instructions;
    this.instructionsEl.toggle(this.flags.instructions);
  }


  private toggleFuzzySearch(): void {
    this.toggleIconButton('fuzzySearch', () => {
      this.resolveSearchDisplay();
    });
  }


  private toggleStrictCase(): void {
    this.toggleIconButton('strictCase');
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
    this.addSearchToggleIcons();

    this.inputEl.setAttribute('placeholder', this.placeholder);
    // TODO:
    // - Set toggleable default instructions.
    // - Function to append custom instructions.
    // - Method to remove some or all instructions.
    this.addInstructions();

    await this.onOpen?.();
    // `onOpen` could potentially modify the behavior of the following lines.
    await this.refreshResults('');
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

