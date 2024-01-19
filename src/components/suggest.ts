import {
  App, Vault, Notice, Scope, Editor,
  FileView, TextFileView, MarkdownView,
  TFile, TFolder, TAbstractFile,
  Modal, SuggestModal, FuzzySuggestModal,
  PreparedQuery, prepareQuery, fuzzySearch,
} from "obsidian";

import BundlePlugin from "main";
import BundleComponent from "types";

import {
  wrapAround,
  getTFilesFromFolder
} from "utils";

import {
  DateFormat,
  getMatchedDate,
} from "components/time";


export default class SuggestComponent implements BundleComponent {

  parent: BundlePlugin;
  settings: {};
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

    // getHeadings (test)
    plugin.addCommand({
      id: "get-headings",
      name: "Get Headings (test)",
      editorCallback: (editor, view) => {
        const headings = getHeadings(editor.getValue());
        console.log(headings);
      }
    });

  }

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



abstract class CustomSuggest<T> {

  public id: string;
  protected app: App;
  protected scope: Scope;
  protected view: MarkdownView | null;
  protected file?: TFile;
  protected editor?: Editor;

  protected containerEl: HTMLElement;
  protected promptEl: HTMLElement;
  protected inputEl: HTMLInputElement;
  protected resultsEl: HTMLElement;
  protected instructionsEl: HTMLElement;

  protected results: T[];
  protected selectionIndex: number;
  private selectionClass = "is-selected";

  protected fuzzy: boolean;
  protected query?: string;
  protected preparedQuery?: PreparedQuery | null;
  protected resultsFilter: (source: T[], itemString: (item: T) => string, query?: string) => T[];
  protected renderFunction: (text: string, resultEl: HTMLElement) => void | number;


  constructor(app: App, modalId: string, options?: {fuzzy?: boolean}) {
    this.app = app;
    this.id = modalId;
    this.view = this.app.workspace.getActiveViewOfType(MarkdownView);
    this.file = this.view?.file ?? undefined;
    this.editor = this.view?.editor ?? undefined;
    // this.file = this.app.workspace.activeLeaf?.view?.file;
    // this.editor = (this.app.workspace as any).getActiveFileView()?.editor as Editor;
    this.createContainerEl();
    this.setPlaceholder("Enter text here...");
    this.setInstructions([
      {command: "<A-f>", purpose: "fuzzy toggle"},
      {command: "<A-j/k>", purpose: "to navigate"},
      {command: "<CR>", purpose: "to choose"},
      {command: "<Esc>", purpose: "to dismiss"},
    ]);
    this.setDefaultScope();
    this.setDefaultEvents();
    this.fuzzy = options?.fuzzy ?? true;
    this.setRenderFunction(this.fuzzy);
    this.setResultFilter(this.fuzzy);
  }

  createContainerEl(): void {
    const containerEl = createEl("div", {
      cls: "modal-container mod-dim",
      attr: {
        id: `${this.id}-container`,
        // visibility: "hidden",
        // display: "none",
      },
    })

    containerEl.appendChild(createEl("div", {
      cls: "modal-bg",
      attr: { style: "opacity: 0.85;" },
    }));

    const promptEl = createEl("div", {
      cls: "prompt",
      attr: { id: `${this.id}-prompt` },
    });

    const promptInputContainerEl = createEl("div", { cls: "prompt-input-container" });
    const promptInput = createEl("input", {
      cls: "prompt-input",
      attr: {
        id: `${this.id}-input`,
        enterkeyhint: "done",
        type: "text",
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

    const instructionsEl = createEl("div", {
      cls: "prompt-instructions",
      attr: {
        id: `${this.id}-instructions`,
      }
    });

    promptEl.appendChild(promptInputContainerEl);
    promptEl.appendChild(promptResultsEl);
    promptEl.appendChild(instructionsEl);

    containerEl.appendChild(promptEl);
    document.body.appendChild(containerEl);

    this.containerEl = document.getElementById(`${this.id}-container`) as HTMLElement;
    this.promptEl = document.getElementById(`${this.id}-prompt`) as HTMLElement;
    this.inputEl = document.getElementById(`${this.id}-input`) as HTMLInputElement;
    this.resultsEl = document.getElementById(`${this.id}-results`) as HTMLElement;
    this.instructionsEl = document.getElementById(`${this.id}-instructions`) as HTMLElement;
  }


  setPlaceholder(placeholder: string): void {
    this.inputEl.setAttribute("placeholder", placeholder);
  }


  setInstructions(instructions: Array<{command: string, purpose: string}>): void {
    this.instructionsEl.empty();
    instructions.forEach((instruction) => {
      const instructionEl = createEl("div", {
        cls: "prompt-instruction",
      });
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


  setDefaultScope(): void {
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
        await this.enterAction(this.results[this.selectionIndex], event);
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
    this.scope.register(["Alt"], "f", async (event) => {
      if (!event.isComposing) {
        this.fuzzy = !this.fuzzy;
        this.setRenderFunction(this.fuzzy);
        this.setResultFilter(this.fuzzy);
        await this.setResults(this.query);
        return false;
      }
    });
    this.scope.register(["Ctrl"], "u", (event) => {
      if (!event.isComposing) {
        this.inputEl.value = "";
        this.setResults();
        return false;
      }
    });
  }


  setDefaultEvents(): void {

    // On Result Click
    this.resultsEl.on("click", ".suggestion-item", (event, element) => {
      event.preventDefault();
      const clickedIndex = this.resultsEl.indexOf(element);
      this.setSelectedResultEl(clickedIndex);
      this.clickAction(this.results[clickedIndex], event);
    })

    // On Result Hover
    this.resultsEl.on("mousemove", ".suggestion-item", (event, element) => {
      const hoveredIndex = this.resultsEl.indexOf(element);
      this.setSelectedResultEl(hoveredIndex);
    })

    // On Input Change
    this.inputEl.addEventListener("input", async () => {
      await this.setResults(this.inputEl.value);
      // console.log("----------------");
      
    })

    // Close on click outside of prompt.
    this.containerEl.addEventListener("click", async (event) => {
      if (!this.promptEl.contains(event.target as Node)){
        await this.close();
      }
    }, {capture: true});

  }


  setRenderFunction(isFuzzy: boolean): void {

    function fuzzyRender(text: string, resultEl: HTMLElement): void | number {
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

      // resultEl.innerHTML = `<span style="color: var(--color-red);">${score.toFixed(4)}</span>  ${text}`;
      resultEl.innerHTML = text;

      // const matchedLength = matches.reduce((acc, match) => acc + match[1] - match[0], 0);
      // return matchedLength;
    }

    function simpleRender(text: string, resultEl: HTMLElement): void {
      const matchIdx = text.toLocaleLowerCase().indexOf(this.query.toLocaleLowerCase());
      const match = [matchIdx, matchIdx + this.query.length];

      const leadStr = text.slice(0, match[0]);
      const matchStr = text.slice(match[0], match[1]);
      const tailStr = text.slice(match[1]);

      resultEl.innerHTML = `${leadStr}<b style="color: var(--text-accent);">${matchStr}</b>${tailStr}`;
    }

    if (isFuzzy) {
      this.renderFunction = fuzzyRender;
    } else {
      this.renderFunction = simpleRender;
    }
  }


  setResultFilter(isFuzzy: boolean): void {

    function fuzzyFilter(source: T[], itemString: (item: T) => string, query?: string): T[] {
      this.query = query;
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

    function simpleFilter(source: T[], itemString: (item: T) => string, query?: string): T[] {
      this.query = query;
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


  async open() {
    await this.onOpen?.();
    this.inputEl.focus();
    await this.setResults();
    this.app.keymap.pushScope(this.scope);
  }

  async close() {
    await this.onClose?.();
    this.app.keymap.popScope(this.scope);
    this.containerEl.remove();
    this.editor?.focus();
  }

  async setResults(query?: string) {
    this.results = await this.getResults(query);
    this.resultsEl.empty();
    this.results.forEach((result) => {
      const resultEl = this.renderResult(result);
      resultEl.addClass("suggestion-item");
      this.resultsEl.appendChild(resultEl);
      this.setSelectedResultEl(0);
    });
  }

  setSelectedResultEl(index: number) {
    this.selectionIndex = wrapAround(index, this.results.length);

    const newSelected = this.resultsEl.children[this.selectionIndex] as HTMLElement;
    const prevSelected = this.resultsEl.find(`.${this.selectionClass}`);
    if (prevSelected) prevSelected.removeClass(this.selectionClass);
    newSelected.addClass(this.selectionClass);

    if (newSelected.getBoundingClientRect().bottom > this.resultsEl.getBoundingClientRect().bottom) {
      newSelected.scrollIntoView({block: "end", inline: "nearest", behavior: "instant"})
      // newSelected.scrollIntoView(false);
    } else if (newSelected.getBoundingClientRect().top < this.resultsEl.getBoundingClientRect().top) {
      newSelected.scrollIntoView({block: "start", inline: "nearest", behavior: "instant"})
      // newSelected.scrollIntoView(true);
    }
  }

  abstract getResults(query?: string): T[] | Promise<T[]>;
  abstract renderResult(result: T): HTMLElement;
  abstract enterAction(result: T, event: MouseEvent | KeyboardEvent): void | Promise<void>;
  abstract clickAction(result: T, event: MouseEvent | KeyboardEvent): void | Promise<void>;

  onOpen?(): void | Promise<void>;
  onClose?(): void | Promise<void>;
}




class QuickTabOpenSuggest extends CustomSuggest<TFile> {

  constructor(app: App) {
    super(app, "my-custom-suggest", {fuzzy: true});
    this.setInstructions([
      {command: "<A-f>", purpose: "fuzzy toggle"},
      {command: "<A-j/k>", purpose: "to navigate"},
      {command: "<A-l>", purpose: "choose without closing"},
      {command: "<CR>", purpose: "choose and close"},
    ]);
    this.addKeybindings();
  }


  addKeybindings(): void {
    this.scope.register(["Alt"], "l", (event) => {
      if (!event.isComposing) {
        this.clickAction(this.results[this.selectionIndex], event);
        return false;
      }
    });
    this.scope.register(["Alt"], "h", async (event) => {
      if (!event.isComposing) {
        await this.customAction(this.results[this.selectionIndex], event);
        return false;
      }
    });
    this.scope.register(["Shift"], "Enter", (event) => {
      if (!event.isComposing) {
        this.clickAction(this.results[this.selectionIndex], event);
        return false;
      }
    });
  }


  getResults(query?: string): TFile[] {
    const folder = this.app.vault.getRoot().path;
    const files = getTFilesFromFolder(this.app, folder);
    if (!files) return [];
    return this.resultsFilter(files, (file) => file.basename, query);
  }


  renderResult(result: TFile): HTMLElement {
    let text = result.basename;
    const resultEl = createEl("div");

    if (this.query) {
      this.renderFunction(text, resultEl);
    } else {
      resultEl.innerText = text;
    }

    return resultEl;
  }


  enterAction(result: TFile, evt: MouseEvent | KeyboardEvent): void {
    this.openFileInBackgroudTab(result);
    this.close();
  }

  clickAction(result: TFile, evt: MouseEvent | KeyboardEvent): void {
    this.openFileInBackgroudTab(result);
    this.inputEl.focus();
  }

  async customAction(result: TFile, event: MouseEvent | KeyboardEvent): Promise<void> {
    this.openFileInBackgroudTab(result);
    this.inputEl.value = "";
    await this.setResults();
  }

  openFileInBackgroudTab(result: TFile): void {
    this.app.workspace.getLeaf(true).openFile(result, { active: false });
  }

}





type Heading = {
  raw: string;
  line: number;
  level: number;
  timestamp?: string;
  text: string;
  title: string;
}


class MoveToHeadingSuggest extends CustomSuggest<Heading> {
  headings?: Heading[];
  headingRender: (heading: Heading, resultEl: HTMLElement) => void | HTMLElement;

  constructor(app: App) {
    super(app, "move-to-heading-suggest", {fuzzy: true});
    this.setHeadingRenderFunction();
  }

  async onOpen(): Promise<void> {
    if (!this.editor) return;
    this.headings = getHeadings(this.editor.getValue());
  }

  setHeadingRenderFunction(): void {

    function fuzzyHighlight(text: string, matches: Array<[number, number]>): string {
      // Sort in descending order to replace string sections from right to left at 
      // the appropriate indices.
      // We also assume that the matches do not overlap.
      matches
        .sort((a, b) => b[0] - a[0])
        .forEach((match) => {
          const leadStr = text.slice(0, match[0]);
          const matchStr = text.slice(match[0], match[1]);
          const tailStr = text.slice(match[1]);
          text = `${leadStr}<b style="color: var(--text-accent);">${matchStr}</b>${tailStr}`;
          // console.log(text);
          
        });
      return text;
    }

    function fuzzyRender(heading: Heading, resultEl: HTMLElement): void {
      const fuzzyResult = fuzzySearch(this.preparedQuery!, heading.text)!;
      if (!fuzzyResult) return;
      let {matches} = fuzzyResult;

      const levelStr = "#".repeat(heading.level);
      const levelStyle = `style="color: var(--h${heading.level}-color); font-size: 1em;"`;

      if (heading.text === heading.title || heading.text === heading.timestamp) {
        resultEl.innerHTML = `<b ${levelStyle}>${levelStr}</b> ${fuzzyHighlight(heading.text, matches)}`;
        // resultEl.innerHTML = fuzzyHighlight(heading.text, matches);
      }

      else {
        let timeMatches: Array<[number, number]> = matches;
        let titleMatches: Array<[number, number]> = [];

        for (let i = 0; i < matches.length; i++) {

          if (matches[i][0] >= heading.timestamp!.length) {
            timeMatches = matches.slice(0, i);
            if (matches[i][0] > heading.timestamp!.length)
              titleMatches.push(
                [matches[i][0] - heading.timestamp!.length - 1, matches[i][1] - heading.timestamp!.length - 1]
              );
            titleMatches = titleMatches.concat(
              matches.slice(i + 1).map(
                (match) => [match[0] - heading.timestamp!.length - 1, match[1] - heading.timestamp!.length - 1]
              )
            );
            break;
          }

          if (matches[i][1] > heading.timestamp!.length + 1) {
            timeMatches = matches.slice(0, i);
            if (matches[i][0] < heading.timestamp!.length)
              timeMatches.push([matches[i][0], heading.timestamp!.length]);
            titleMatches.push([0, matches[i][1] - heading.timestamp!.length - 1]);
            titleMatches = titleMatches.concat(
              matches.slice(i + 1).map(
                (match) => [match[0] - heading.timestamp!.length - 1, match[1] - heading.timestamp!.length - 1]
              )
            );
            break;
          }
        }

        resultEl.innerHTML = `<b ${levelStyle}>${levelStr}</b> ${fuzzyHighlight(heading.title, titleMatches)}`;
        // resultEl.innerHTML = fuzzyHighlight(heading.title, titleMatches);

        const timeStyle = `style="color: var(--text-muted); font-size: var(--font-smaller);"`;
        resultEl.innerHTML += `<div><span ${timeStyle}>${fuzzyHighlight(heading.timestamp!, timeMatches)}</span></div>`;
      }

    }

    // TODO: Rewrite for similar functionality as fuzzyRender.
    function simpleRender(heading: Heading, resultEl: HTMLElement): void {
      let text = heading.text;
      const matchIdx = text.toLocaleLowerCase().indexOf(this.query.toLocaleLowerCase());
      const match = [matchIdx, matchIdx + this.query.length];

      const leadStr = text.slice(0, match[0]);
      const matchStr = text.slice(match[0], match[1]);
      const tailStr = text.slice(match[1]);

      resultEl.innerHTML = `${leadStr}<b style="color: var(--text-accent);">${matchStr}</b>${tailStr}`;
    }

    if (this.fuzzy) {
      this.headingRender = fuzzyRender;
    } else {
      this.headingRender = simpleRender;
    }
  }


  getResults(query?: string): Heading[] {
    if (!this.editor) return [];
    const results = this.resultsFilter(this.headings!, (heading) => heading.text, query);
    return results;
  }

  renderResult(result: Heading): HTMLElement {
    const resultEl = createEl("div");
    this.headingRender(result, resultEl);
    return resultEl;
  }

  async enterAction(result: Heading, evt: MouseEvent | KeyboardEvent): Promise<void> {
    if (this.editor) {
      this.editor.setCursor(result.line, 0);
    }
    await this.close();
  }

  async clickAction(result: Heading, evt: MouseEvent | KeyboardEvent): Promise<void> {
    this.enterAction(result, evt);
  }
}




function isCodeBlockEnd(line: string): boolean {
  return line.trimStart().startsWith('```');
}

function getHeadings(fileText: string): Heading[] {
  const textLines = fileText.split("\n");
  let inCodeBlock = false;
  let headings: Heading[] = [];

  for (let i = 0; i < textLines.length; i++) {
    const textLine = textLines[i];

    if (isCodeBlockEnd(textLine)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = textLine.match(/^#{1,6} /);
    if (!match) continue;

    const raw = textLine;
    const line = i;
    const level = match[0].length - 1;

    const dateFormat = getMatchedDate(textLine) as DateFormat;
    if (dateFormat) {
      const dateMatch = textLine.match(dateFormat.regex);
      if (dateMatch && dateMatch.index === match[0].length) {
        const timestamp = dateMatch[0];
        const text = textLine.slice(match[0].length).trim();
        const title = textLine.slice(match[0].length + timestamp.length).trim();
        headings.push({raw, line, level, timestamp, text, title});
        continue;
      }
    }

    const text = textLine.slice(match[0].length).trim();
    const title = text;
    headings.push({raw, line, level, text, title});
  }

  return headings;
}


