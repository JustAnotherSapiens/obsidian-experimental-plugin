import {
  App, Vault, Notice, Scope,
  TFile, TFolder, TAbstractFile,
  Modal, SuggestModal, FuzzySuggestModal,
  PreparedQuery, prepareQuery, fuzzySearch,
} from "obsidian";

import BundlePlugin from "main";
import BundleComponent from "types";



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
        new QuickTabOpenSuggest(plugin.app, {fuzzy: true}).open();
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

  protected containerEl: HTMLElement;
  protected promptEl: HTMLElement;
  protected inputEl: HTMLInputElement;
  protected resultsEl: HTMLElement;
  protected instructionsEl: HTMLElement;

  protected results: T[];
  protected selectionIndex: number;
  private selectionClass = "is-selected";


  constructor(app: App, modalId: string) {
    this.app = app;
    this.id = modalId;
    this.createContainerEl();
    this.setPlaceholder("Enter text here...");
    this.setInstructions([
      {command: "<A-j/k>", purpose: "to navigate"},
      {command: "<CR>", purpose: "to choose"},
      {command: "<Esc>", purpose: "to dismiss"},
    ]);
    this.setDefaultScope();
    this.setDefaultEvents();
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
    this.scope.register([], "Escape", (event) => {
      if (!event.isComposing) {
        this.close();
        return false;
      }
    });
    this.scope.register([], "Enter", (event) => {
      if (!event.isComposing) {
        this.enterAction(this.results[this.selectionIndex], event);
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

    // ALTERNATE KEYBINDINGS
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
    this.inputEl.addEventListener("input", () => {
      this.setResults(this.inputEl.value);
    })

    // Close on click outside of prompt.
    this.containerEl.addEventListener("click", (event) => {
      if (!this.promptEl.contains(event.target as Node)){
        this.close();
      }
    }, {capture: true});

  }


  open() {
    this.inputEl.focus();
    this.setResults();
    this.app.keymap.pushScope(this.scope);
  }

  close() {
    this.app.keymap.popScope(this.scope);
    this.containerEl.remove();
  }

  setResults(query?: string) {
    this.results = this.getResults(query);
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

  abstract getResults(query?: string): T[];
  abstract renderResult(result: T): HTMLElement;
  abstract enterAction(result: T, event: MouseEvent | KeyboardEvent): void;
  abstract clickAction(result: T, event: MouseEvent | KeyboardEvent): void;
}




class QuickTabOpenSuggest extends CustomSuggest<TFile> {
  private renderFunction: (text: string, resultEl: HTMLElement) => void;
  private fuzzy: boolean;
  private query?: string;
  private preparedQuery?: PreparedQuery | null;

  constructor(app: App, options?: {fuzzy?: boolean}) {
    super(app, "my-custom-suggest");
    this.fuzzy = options?.fuzzy ?? true;
    this.setRenderFunction(this.fuzzy);

    this.setInstructions([
      {command: "<A-f>", purpose: "fuzzy toggle"},
      {command: "<A-j/k>", purpose: "to navigate"},
      {command: "<A-l>", purpose: "choose without closing"},
      {command: "<CR>", purpose: "choose and close"},
    ]);

    this.scope.register(["Alt"], "f", (event) => {
      if (!event.isComposing) {
        this.fuzzy = !this.fuzzy;
        this.setRenderFunction(this.fuzzy);
        this.setResults(this.query);
        return false;
      }
    });

    this.scope.register(["Alt"], "l", (event) => {
      if (!event.isComposing) {
        this.customAction1(this.results[this.selectionIndex], event);
        return false;
      }
    });
    this.scope.register(["Alt"], "h", (event) => {
      if (!event.isComposing) {
        this.customAction2(this.results[this.selectionIndex], event);
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
    this.query = query;
    this.preparedQuery = prepareQuery(query ?? "");

    const folder = this.app.vault.getRoot().path;
    const files = getTFilesFromFolder(this.app, folder);
    if (!files) return [];
    if (!query) return files;

    if (!this.fuzzy) {
      return files.filter((file) => file.basename.toLocaleLowerCase().contains(query.toLocaleLowerCase()));
    }

    const matchedFiles = files.filter((file) => {
      const result = fuzzySearch(this.preparedQuery!, file.basename);
      if (!result) return false;
      (file as any).fuzzyScore = result.score;
      return true;
    });

    // Sort in descending order of fuzzy score.
    matchedFiles.sort((a, b) => (b as any).fuzzyScore - (a as any).fuzzyScore);
    // Remove the fuzzy score from the file objects.
    matchedFiles.forEach((file) => delete (file as any).fuzzyScore);

    return matchedFiles;
  }


  setRenderFunction(isFuzzy: boolean): void {

    function fuzzyRender(text: string, resultEl: HTMLElement): void {
      const fuzzyResult = fuzzySearch(this.preparedQuery!, text)!;
      // if (!fuzzyResult) return resultEl;

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

  renderResult(result: TFile): HTMLElement {
    let text = result.basename;
    const resultEl = createEl("div");

    if (this.query) {
      this.renderFunction(text, resultEl);
      // const fuzzyResult = fuzzySearch(this.preparedQuery!, text);
      // if (!fuzzyResult) return resultEl;

      // let { score, matches } = fuzzyResult;
      // // Sort in descending order to replace string sections from right to left at 
      // // the appropriate indices.
      // matches.sort((a, b) => b[0] - a[0]);
      // // We also assume that the matches do not overlap.
      // matches.forEach((match) => {
      //   const leadStr = text.slice(0, match[0]);
      //   const matchStr = text.slice(match[0], match[1]);
      //   const tailStr = text.slice(match[1]);
      //   text = `${leadStr}<b style="color: var(--text-accent);">${matchStr}</b>${tailStr}`;
      // });

      // resultEl.innerHTML = `<span style="color: var(--color-red);">${score.toFixed(4)}</span>  ${text}`;
      // // resultEl.innerHTML = text;
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
    this.customAction1(result, evt);
  }

  customAction1(result: TFile, event: MouseEvent | KeyboardEvent): void {
    this.openFileInBackgroudTab(result);
    this.inputEl.focus();
  }

  customAction2(result: TFile, event: MouseEvent | KeyboardEvent): void {
    this.openFileInBackgroudTab(result);
    this.inputEl.value = "";
    this.setResults();
  }

  openFileInBackgroudTab(result: TFile): void {
    this.app.workspace.getLeaf(true).openFile(result, { active: false });
  }

}







////////////////////////////////////////
// UTILITY FUNCTIONS
////////////////////////////////////////

const wrapAround = (value: number, size: number): number => {
    return ((value % size) + size) % size;
};


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

