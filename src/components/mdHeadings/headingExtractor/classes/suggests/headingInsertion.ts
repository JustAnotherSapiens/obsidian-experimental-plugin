import {
  App,
  Notice,
  Editor,
  EditorPosition,
  EditorChange,
} from "obsidian";

import { breadcrumbsHTML } from "utils/display";

import { posToIdx } from "utils/obsidian/editor";
import registerKeybindings from "utils/obsidian/keybindings";

import BaseAbstractSuggest from "suggests/baseAbstractSuggest";
import QuickSuggest from "suggests/quickSuggest";

import HeadingTreeSuggest, { HeadingTreeArgs } from "./headingTree";
import {
  MarkdownLevel,
  HeadingNode,
} from "../../utils/dataStructures";




type HeadingInsertionArgs = HeadingTreeArgs & {
  startFlat?: boolean;
  skewUpwards?: boolean;
};

type Insertion = {
  pos: EditorPosition;
  ref?: {
    node: HeadingNode;
    atTop: boolean;
  };
};

export type Extraction = {
  text: string;
  pos: EditorPosition;
  changes: EditorChange[];
  editor: Editor;
  sameFile?: {
    cursorToInsertion: boolean;
  };
};



export default class HeadingInsertionSuggest extends HeadingTreeSuggest {
  private insertion: Insertion;

  private mdLevel: MarkdownLevel;
  private startFlat: boolean;
  private skewUpwards: boolean;

  private resultsFilter: (node: HeadingNode) => boolean;


  constructor(app: App, args: HeadingInsertionArgs) {
    super(app, args);
    this.mdLevel = args.mdLevelLimit ?? 6;
    this.startFlat = args.startFlat ?? false;
    this.skewUpwards = args.skewUpwards ?? false;
    this.resultsFilter = (node: HeadingNode) => node.heading.level.bySyntax <= this.mdLevel;
    this.instructions = [
      {command: "<A-j/k>", purpose: "Navigate"},
      {command: "<A-l>", purpose: "Step Into"},
      {command: "<A-h>", purpose: "Step Out"},
      {command: "<Enter>/<Click>", purpose: "Append, Insert After"},
      {command: "<S-Enter>/<R_Click>", purpose: "Prepend, Insert Before"},
      {command: "<Esc>", purpose: "Close"},
    ];
  }


  getSourceItems(): HeadingNode[] {
    if (this.startFlat && this.referenceNode === this.tree.root) {
      return this.tree.flatten(this.resultsFilter);
    }
    return super.getSourceItems(this.referenceNode, this.resultsFilter);
  }


  async stepInto(node: HeadingNode): Promise<boolean> {
    if (!this.areEnoughResults(node)) return false;
    return await super.stepInto(node);
  }


  areEnoughResults(node: HeadingNode): boolean {
    return super.getSourceItems(node, this.resultsFilter).length > 0;
  }


  async insertExtraction(extraction: Extraction): Promise<boolean> {
    await this.open();
    const enoughResults = this.areEnoughResults(this.tree.root);

    return new Promise(async (resolve) => {
      if (enoughResults) {
        this.onClose = this.resolveExtractionInsertion.bind(this, extraction, resolve);
      } else {
        this.close();

        const quickSuggest = new QuickSuggest(this.app,
          [true, false], (v: boolean) => v ? "Yes" : "No", "Insert at Top Level?"
        );
        quickSuggest.onOpen = async () => this.addTargetFileBanner(quickSuggest);
        const topLevelInsertion = await quickSuggest.waitForSelection();

        if (topLevelInsertion) {
          this.insertion = { pos: {line: this.tree.lineCount, ch: 0} };
          await this.resolveExtractionInsertion(extraction, resolve);
          new Notice("Top Level Insertion", 2000);
        } else resolve(false);
      }
    });

  }


  async resolveExtractionInsertion(extraction: Extraction, resolve: (value: boolean) => void) {
    try {
      if (!this.insertion || (!this.editor && !this.file)) {
        console.debug("Insertion or File/Editor missing at insertion resolution.");
        resolve(false);
        return; // Absolutely necessary; 'resolve' is not enough to stop this function.
      }

      let insertionText = extraction.text;

      if (this.editor) {
        console.debug("Editor Transaction Insertion");

        if (this.insertion.pos.line >= this.editor.lastLine()) {
          insertionText = "\n" + insertionText.slice(0, -1);
        }

        let changes: EditorChange[] = [];
        // I don't understand why if I assign 'this.insertion.pos' directly
        // to 'from', the value of 'line' is changed at the moment of the push,
        // but the 'line' value at 'this.insertion.pos' is not modified.
        // If 'from' is assigned to the destructured object, no problem occurs.
        // TLDR: The destructured assignmet is absolutely necessary.
        changes.push({text: insertionText, from: {...this.insertion.pos}});

        let endPos: EditorPosition = {...extraction.pos};

        if (extraction.sameFile) {
          console.debug("Same File Extraction");
          changes = changes.concat(extraction.changes);

          if (extraction.sameFile.cursorToInsertion) {
            endPos = {...this.insertion.pos};
            if (this.insertion.pos.line > extraction.pos.line) {
              endPos.line -= (extraction.text.split("\n").length - 1);
            }
          } else {
            // End at Extraction Pos by default
            if (this.insertion.pos.line < extraction.pos.line) {
              endPos.line += (insertionText.split("\n").length - 1);
            }
          }

        }
        this.editor.transaction({changes, selection: {from: endPos!}});
        resolve(true);
      }

      else { // If no editor modifies the file directly.
        console.debug("Vault Modify Insertion");
        const index = posToIdx(this.markdownText!, {...this.insertion.pos});
        if (index >= this.markdownText!.length - 1) {
          insertionText = "\n" + insertionText.slice(0, -1);
        }
        const newText = this.markdownText!.slice(0, index)
                      + insertionText
                      + this.markdownText!.slice(index);
        await this.app.vault.modify(this.file!, newText);
        resolve(true);
      }

    } catch (error) {
      console.error("Insertion Error Catched", error);
      resolve(false);
    }

  }


  async waitForSelection(): Promise<Insertion | undefined> {
    await this.open();
    return new Promise((resolve) => {
      this.onClose = () => resolve(this.insertion ?? undefined);
    });
  }


  addTargetFileBanner<T>(suggest: BaseAbstractSuggest<T>) {
    if (!this.file) return;
    const bannerEl = createDiv("target-file-container");

    createDiv({ cls: "target-file-display", parent: bannerEl }, (el) => {
      el.innerHTML = breadcrumbsHTML(this.file!.path.slice(0, -3));
    });

    suggest.promptEl.insertBefore(bannerEl, suggest.inputEl.parentElement!);
    // suggest.promptEl.insertBefore(bannerEl, suggest.resultsEl);
  }


  async onOpen(): Promise<void> {
    await super.onOpen();
    this.addTargetFileBanner(this);
    // NOTE: Enter and Click actions are defined separately by default.

    registerKeybindings(this.scope, [
      [["Shift"], "Enter", () => {
        if (this.renderedResults.length === 0) return;
        this.setInsertionAndClose(
          this.renderedResults[this.selectionIndex], !this.skewUpwards
        );
      }],
    ]);

    this.resultsEl.on("contextmenu", ".suggestion-item", (event, element) => {
      const clickedIndex = this.resultsEl.indexOf(element);
      this.setSelectedResultEl(clickedIndex);
      this.setInsertionAndClose(this.renderedResults[clickedIndex], !this.skewUpwards);
    }, {capture: true});
  }


  enterAction(result: HeadingNode, event: MouseEvent | KeyboardEvent): void | Promise<void> {
    this.setInsertionAndClose(result, this.skewUpwards);
  }


  clickAction(result: HeadingNode, event: MouseEvent | KeyboardEvent): void | Promise<void> {
    this.enterAction(result, event);
  }


  setInsertionAndClose(targetNode: HeadingNode, top: boolean) {
    console.debug("Result Heading:", [targetNode.heading.header.text]);
    let insertionPos: EditorPosition;

    if (targetNode.heading.level.bySyntax === this.mdLevel) {
      if (!top) {
        targetNode.calculateHeadingLineEnd(this.tree.lineCount);
        insertionPos = {line: targetNode.heading.range.to!.line, ch: 0};
      } else {
        insertionPos = {line: targetNode.heading.range.from.line, ch: 0};
      }
    }

    else {

      const stopNode = this.tree.find(
        (node: HeadingNode) => node.heading.level.bySyntax < this.mdLevel, targetNode
      );
      const matchFunc = !stopNode
        ? (node: HeadingNode) => node.heading.level.bySyntax === this.mdLevel
        : (node: HeadingNode) =>
          node.heading.range.from.line < stopNode.heading.range.from.line &&
          node.heading.level.bySyntax === this.mdLevel;

      const findNodeFunc = !top ? this.tree.findLast : this.tree.find;
      const siblingRefNode = findNodeFunc.bind(this.tree)(matchFunc, targetNode);

      if (!siblingRefNode) {
        if (!stopNode) {
          targetNode.calculateHeadingLineEnd(this.tree.lineCount);
          insertionPos = {line: targetNode.heading.range.to!.line, ch: 0};
        } else {
          insertionPos = {line: stopNode.heading.range.from.line, ch: 0};
        }
      }
      else {
        if (!top) {
          siblingRefNode.calculateHeadingLineEnd(this.tree.lineCount);
          insertionPos = {line: siblingRefNode.heading.range.to!.line, ch: 0};
        } else {
          insertionPos = {line: siblingRefNode.heading.range.from.line, ch: 0};
        }
      }

    }

    this.insertion = {
      pos: insertionPos,
      ref: { node: targetNode, atTop: top },
    };
    this.close();
  }

}

