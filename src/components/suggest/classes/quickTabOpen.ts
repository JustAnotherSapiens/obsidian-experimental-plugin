
import {
  App,
  TFile,
} from "obsidian";

import {
  getTFilesFromFolder,
} from "utils/utilsCore";

import {
  BaseAbstractSuggest,
  registerKeybindings,
} from "utils/suggest/suggestUtils";



export default class QuickTabOpenSuggest extends BaseAbstractSuggest<TFile> {

  constructor(app: App) {
    super(app, "quick-tab-open-suggest", { fuzzy: true });

    this.itemToString = (file: TFile) => {
      if (file.extension !== "md") return file.path;
      return file.path.slice(0, -3);
    };

    registerKeybindings(this.scope, [
      [["Shift"], "Enter", (event) => this.clickAction(this.renderedResults[this.selectionIndex], event)],
      [["Alt"], "l",       (event) => this.clickAction(this.renderedResults[this.selectionIndex], event)],
      [["Alt"], "h", async (event) => await this.customAction(this.renderedResults[this.selectionIndex], event)],
    ]);

    this.instructions = [
      {command: "Action:", purpose: "Open File in Background Tab"},
      {command: "<A-l>", purpose: "Action"},
      {command: "<A-h>", purpose: "Action & Clear Input"},
      {command: "<CR>", purpose: "Action & Close Prompt"},
      {command: "<A-f>", purpose: "Toggle Fuzzy Search"},
      {command: "<A-j/k>", purpose: "Navigate Down/Up"},
      {command: "<Esc>", purpose: "Close Prompt"},
    ];
  }

  getSourceItems(): TFile[] {
    return getTFilesFromFolder(this.app, this.app.vault.getRoot().path);
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

