import {
  App, Editor, MarkdownView,
  Vault, Scope, Notice,
  Setting, TextComponent,
  TFile, TFolder, TAbstractFile,
  Modal, SuggestModal, FuzzySuggestModal,
  PopoverSuggest,
} from "obsidian";

import BundlePlugin from "main";
import BundleComponent from "types";

import {
  getSetting,
  wrapAround,
  getTFilesFromFolder,
  customActiveLineScroll,
  shrinkSettingInputField,
} from "utils";

import {
  BaseAbstractSuggest,
} from "components/sugggestUtils";

import {
  MoveToHeadingSuggest,
} from "components/suggestHeadings";

import {
  getHeadings,
} from "components/headingsUtils";



export default class SuggestComponent implements BundleComponent {

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

    // getHeadings (test)
    plugin.addCommand({
      id: "get-headings",
      name: "Get Headings (test)",
      editorCallback: (editor, view) => {
        const headings = getHeadings(editor.getValue());
        console.log(headings);
      }
    });

    // QuickPopoverSuggest (test)
    plugin.addCommand({
      id: "quick-popover-suggest",
      name: "Quick Popover Suggest (test)",
      editorCallback: async (editor: Editor) => {
        const items = ["apple", "banana", "cherry", "guanavana", "kiwi", "mango", "orange", "papaya", "pear", "pineapple", "strawberry"];
        const stringifier = (item: string) => item;
        console.log("Running quick popover suggest");
        const result = await runQuickPopoverSuggest(plugin.app, items, stringifier);
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





class QuickTabOpenSuggest extends BaseAbstractSuggest<TFile> {

  files: TFile[];
  fileToString = (file: TFile) => {
    if (file.extension !== "md") return file.path;
    return file.path.slice(0, -3);
  };

  constructor(app: App) {
    super(app, "quick-tab-open-suggest", { fuzzy: true });
    this.addKeybindings();
    this.files = getTFilesFromFolder(app, app.vault.getRoot().path);
  }

  onOpen(): void {
    this.setInstructions([
      {command: "<A-f>", purpose: "fuzzy toggle"},
      {command: "<A-j/k>", purpose: "to navigate"},
      {command: "<A-l>", purpose: "choose without closing"},
      {command: "<CR>", purpose: "choose and close"},
    ]);
  }

  addKeybindings(): void {
    this.scope.register(["Alt"], "l", (event) => {
      if (!event.isComposing) {
        this.clickAction(this.queriedResults[this.selectionIndex], event);
        return false;
      }
    });
    this.scope.register(["Alt"], "h", async (event) => {
      if (!event.isComposing) {
        await this.customAction(this.queriedResults[this.selectionIndex], event);
        return false;
      }
    });
    this.scope.register(["Shift"], "Enter", (event) => {
      if (!event.isComposing) {
        this.clickAction(this.queriedResults[this.selectionIndex], event);
        return false;
      }
    });
  }


  getFilteredResults(query?: string): TFile[] {
    if (this.files.length === 0) return [];
    return this.resultsFilter(this.files, this.fileToString, query);
  }


  renderResultItem(result: TFile): HTMLElement {
    const resultEl = createEl("div");
    const text = this.fileToString(result);

    if (this.query) this.resultItemRenderer(text, resultEl);
    else resultEl.innerText = text;

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
    await this.updateInputAndResults("");
  }

  openFileInBackgroudTab(result: TFile): void {
    this.app.workspace.getLeaf(true).openFile(result, { active: false });
  }

}



export async function runQuickPopoverSuggest<T>(
  app: App, items: T[], stringifier: (item: T) => string,
): Promise<T | null> {
  const suggest = new QuickPopoverSuggest(app, items, stringifier);
  return await suggest.waitForSelection();
}


class QuickPopoverSuggest<T> {
  app: App;
  items: T[];
  stringifier: (item: T) => string;
  selectedItem: T | null = null;
  resultsEl: HTMLElement;
  selectionIndex: number;
  close: () => void;
  withinLimitsListener: (event: MouseEvent) => void;

  constructor(app: App, items: T[], stringifier: (item: T) => string) {
    this.app = app;
    this.items = items;
    this.stringifier = stringifier;
  }

  waitForSelection(): Promise<T | null> {
    this.open();
    return new Promise((resolve) => {
      this.close = () => {
        this.resultsEl.remove();
        this.app.workspace.getActiveViewOfType(MarkdownView)?.editor.focus();
        document.body.removeEventListener("click", this.withinLimitsListener, {capture: true});
        resolve(this.selectedItem);
      }
    });
  }

  open(): void {
    const resultsEl = createEl("div", {
      attr: {
        id: "quick-popover-suggest",
        style: "overflow-y: auto;"
      }
    });

    this.items.forEach((item: T) => {
      const itemEl = createEl("div", {
        cls: "suggestion-item",
        text: this.stringifier(item),
      });

      itemEl.onclick = (evt: MouseEvent) => {
        this.selectedItem = item;
        this.close();
      };

      resultsEl.appendChild(itemEl);
    });

    resultsEl.children[0].addClass("is-selected");

    document.body.appendChild(resultsEl);

    // Query selector for the active line in the editor
    const activeLine = document.querySelector(
      ".workspace-tabs.mod-active .workspace-leaf.mod-active .cm-line.cm-active"
    );
    const lineRect = activeLine?.getBoundingClientRect() as DOMRect;
    const xPos = lineRect.left + lineRect.width / 2;
    const yPos = lineRect.bottom;
    const width = lineRect.width / 3;

    this.resultsEl = document.getElementById("quick-popover-suggest") as HTMLElement;
    this.resultsEl.style.position = "absolute";
    this.resultsEl.style.top = `${yPos}px`;
    this.resultsEl.style.left = `${xPos}px`;
    this.resultsEl.style.width = `${width}px`;


    // On Result Hover
    this.resultsEl.on("mousemove", ".suggestion-item", (event, element) => {
      const hoveredIndex = this.resultsEl.indexOf(element);
      this.setSelectedResultEl(hoveredIndex);
    });

    this.withinLimitsListener = async (event: MouseEvent) => {
      if (!this.resultsEl.contains(event.target as Node)) {
        this.close();
      }
    }

    // Close on click outside of prompt.
    document.body.addEventListener("click", this.withinLimitsListener, {capture: true});


  }

  /**
   * Set the result element at the given index as selected and scroll it
   * into view if necessary.
   */
  setSelectedResultEl(index: number) {
    this.selectionIndex = wrapAround(index, this.items.length);

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


}


