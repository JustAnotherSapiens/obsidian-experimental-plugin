import {
  App,
  Notice,
  WorkspaceLeaf,
  MarkdownView,
  MarkdownFileInfo,
  TFile,
  Editor,
  EditorPosition,
  EditorRange,
  EditorRangeOrCaret,
  EditorChange,
} from 'obsidian';

import {
  posToIdx,
} from "utils/utilsCore";

import {
  breadcrumbsHTML,
} from "utils/display";

import {
  isCodeBlockEnd,
} from 'components/headings/headingUtils';

import {
  DateFormat,
  getMatchedDate,
} from "components/time/timeCore";

import {
  BaseAbstractSuggest,
  QuickSuggest,
  runQuickSuggest,
  registerKeybindings,
} from "components/suggest/suggestUtils";

import {
  setDisplayFunctionAsHeadingNode,
} from "components/headings/headingDisplay";



type MarkdownLevel = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingLevel = {
  bySyntax: MarkdownLevel;
  byDepth?: MarkdownLevel;
}

type HeadingRange = EditorRangeOrCaret;

type HeadingHeader = {
  raw: string;
  definer: string;
  text: string;
  timestamp?: string;
  title: string;
}


export class MdHeading {

  header: HeadingHeader;
  level: HeadingLevel;
  range: HeadingRange;

  constructor(lineNumber: number, headerLine: string, headerDefiner?: string) {
    if (lineNumber < 0 || !headerLine) {
      this.range = {from: {line: -1, ch: 0}};
      this.header = {raw: '', text: '', definer: '', timestamp: '', title: ''};
      this.level = {bySyntax: 0 as MarkdownLevel};
    } else {
      this.range = {from: {line: lineNumber, ch: 0}};
      this.setHeader(headerLine, headerDefiner ?? headerLine.match(/^#{1,6} /)![0]);
      this.level = {bySyntax: this.header.definer.length - 1 as MarkdownLevel};
    }
  }

  setHeader(headerLine: string, definer: string) {
    const text = headerLine.slice(definer.length).trim();

    const timeFormat = getMatchedDate(text) as DateFormat;
    if (timeFormat) {
      const timeMatch = text.match(timeFormat.regex)!;
      var timestamp = timeMatch[0];
      var title = text.slice(timestamp.length).trim() || timestamp;
    } else {
      var timestamp = '';
      var title = text;
    }

    this.header = {raw: headerLine, text, definer, timestamp, title};
  }

  getContents(editor: Editor) {
    return editor.getRange(this.range.from, this.range.to!);
  }

}



export class HeadingNode {
  prev?: HeadingNode;
  next?: HeadingNode;
  parent?: HeadingNode;
  children: HeadingNode[];
  heading: MdHeading;

  constructor(lineNumber: number, headerLine: string, headerDefiner?: string) {
    this.heading = new MdHeading(lineNumber, headerLine, headerDefiner);
    this.children = [];
  }

  addNext(node: HeadingNode) {
    this.next = node;
    node.prev = this;
    node.parent = this.parent;
    this.parent?.children.push(node);
  }

  addChild(node: HeadingNode) {
    if (this.children.length !== 0)
      this.children[this.children.length - 1].addNext(node);
    else {
      node.parent = this;
      this.children.push(node);
    }
  }

  decouple() {
    if (this.prev) this.prev.next = this.next;
    if (this.next) this.next.prev = this.prev;
    if (this.parent) this.parent!.children.remove(this);
  }

  getExtractionChange(lineCount: number): EditorChange {
    return { text: '', ...this.getHeadingRange(lineCount) };
  }

  getHeadingRange(lineCount: number): EditorRange {
    this.calculateHeadingLineEnd(lineCount);
    return this.heading.range as EditorRange;
  }

  calculateHeadingLineEnd(lineCount: number) {
    if (!this.parent) this.heading.range.to = {line: lineCount, ch: 0};
    else if (this.next) {
      this.heading.range.to = {line: this.next.heading.range.from.line, ch: 0};
    }
    else {
      let reference: HeadingNode = this;
      while (reference.next === undefined && reference.parent !== undefined) {
        reference = reference.parent;
      }
      const endLine = reference.next?.heading.range.from.line ?? lineCount;
      this.heading.range.to = {line: endLine, ch: 0};
    }
  }

}



type HeadingLevelTable = {
  [Level in MarkdownLevel]: HeadingNode[];
};


export class HeadingTree {

  public root: HeadingNode;
  public lineCount: number;
  private mdLevelLimit: MarkdownLevel;
  private levelTable: HeadingLevelTable;


  constructor(markdownText: string, mdLevelLimit?: MarkdownLevel) {
    this.root = new HeadingNode(-1, '');

    this.levelTable = {} as HeadingLevelTable;
    for (let i = 1; i <= 6; i++) this.levelTable[i as MarkdownLevel] = [];

    this.mdLevelLimit = mdLevelLimit ?? 6;

    this.parseMarkdownText(markdownText);
  }


  parseMarkdownText(text: string) {
    const lines = text.split("\n");
    this.lineCount = lines.length;

    const regex = new RegExp(`^#{1,${this.mdLevelLimit}} `);

    let inCodeBlock = false;
    let depthCount = 0;
    let refNode = this.root; // Last significant node to add the next node
    const refNodeLevel = () => refNode.heading.level.bySyntax;
    const refNodeParentLevel = () => refNode.parent?.heading.level.bySyntax ?? 0;

    for (let i = 0; i < lines.length; i++) {
      const textLine = lines[i];

      if (isCodeBlockEnd(textLine)) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      else if (inCodeBlock) continue;

      const match = textLine.match(regex);
      if (!match) continue;

      const currentNode = new HeadingNode(i, textLine, match[0]);
      const currentLevel = currentNode.heading.level.bySyntax;
      this.levelTable[currentLevel].push(currentNode);

      while (currentLevel < refNodeLevel()) {
        if (currentLevel > refNodeParentLevel()) break;
        refNode = refNode.parent!;
        depthCount--;
      }
      if (currentLevel > refNodeLevel()) {
        refNode.addChild(currentNode);
        refNode = currentNode;
        depthCount++;
      } else {
        refNode.addNext(currentNode);
        refNode = currentNode;
      }

      currentNode.heading.level.byDepth = depthCount as MarkdownLevel;
    }

  }


  traverse(callback: (node: HeadingNode) => void, topNode?: HeadingNode) {
    if (!topNode) topNode = this.root;
    if (topNode.children.length === 0) return;
    let current = topNode.children[0];
    while (current) {
      callback(current);
      if (current.children.length !== 0) {
        current = current.children[0];
      } else {
        while (current.next === undefined && current.parent !== undefined) {
          current = current.parent;
          if (current === topNode) return;
        }
        current = current.next as HeadingNode; // Can be undefined.
      }
    }
  }


  find(match: (node: HeadingNode) => boolean, topNode?: HeadingNode): HeadingNode | undefined {
    let found: HeadingNode | undefined;
    try {
      this.traverse(node => {
        if (!match(node)) return;
        found = node;
        throw 'BREAK';
      }, topNode);
    } catch (error) {
      if (error !== 'BREAK') throw error;
    }
    return found;
  }

  findLast(callback: (node: HeadingNode) => boolean, topNode?: HeadingNode): HeadingNode | undefined {
    let found: HeadingNode | undefined;
    this.traverse(node => {
      if (callback(node)) found = node;
    }, topNode);
    return found;
  }

  findLastContiguous(match: (node: HeadingNode) => boolean, topNode?: HeadingNode): HeadingNode | undefined {
    let foundNode: HeadingNode | undefined;
    try {
      this.traverse(node => {
        if (!match(node)) throw 'BREAK';
        foundNode = node;
      }, topNode);
    } catch (error) {
      if (error !== 'BREAK') throw error;
    }
    return foundNode;
  }

  /**
   * Search algorithm that takes advantage of the tree structure to find the last
   * contiguous node that matches the given condition.
   *
   * From benchmarks, it is from 5 to 30 times faster than its linear version.
   */
  searchLastContiguous(match: (node: HeadingNode) => boolean, topNode?: HeadingNode): HeadingNode | undefined {
    if (!topNode) topNode = this.root;
    if (topNode.children.length === 0) return;
    let refNode = topNode;
    let foundNode: HeadingNode | undefined;
    while (true) {
      for (const node of refNode.children) {
        if (!match(node)) break;
        foundNode = node;
      }
      if (!foundNode) break;
      if (foundNode === refNode) break;
      refNode = foundNode;
    }
    return foundNode;
  }


  flatten(filter?: (node: HeadingNode) => boolean): HeadingNode[] {
    let nodes: HeadingNode[] = [];
    if (!filter) {
      this.traverse(node => nodes.push(node));
    } else {
      this.traverse(node => {
        if (filter(node)) nodes.push(node);
      });
    }
    return nodes;
  }

}



type MdTextSources = {
  file?: TFile;
  editor?: Editor;
  markdownText?: string;
};

type HeadingTreeArgs = {
  sources: MdTextSources;
  mdLevelLimit?: MarkdownLevel;
};


/**
 * An abstract suggest class that builds a data tree and allows the user to navigate it.
 *
 * DEV-NOTE: Merge of `HeadingTreeSuggest` and `DataNodeSuggest<Heading>`
 */
export abstract class HeadingTreeSuggest extends BaseAbstractSuggest<HeadingNode> {

  public file?: TFile;
  public editor?: Editor;
  public markdownText?: string;

  protected tree: HeadingTree;
  protected referenceNode: HeadingNode;

  private mdLevelLimit: MarkdownLevel;
  private selectionIndexStack: number[] = [];
  private selectionQueryStack: string[] = [];
  private referenceNodeStack: HeadingNode[] = [];


  constructor(app: App, args: HeadingTreeArgs) {
    super(app, "heading-tree-suggest");
    this.setPlaceholder("Select a Heading...");
    this.file = args.sources.file;
    this.editor = args.sources.editor;
    this.markdownText = args.sources.markdownText;
    this.mdLevelLimit = args.mdLevelLimit ?? 6;
    this.itemToString = (node: HeadingNode) => node.heading.header.text;
    setDisplayFunctionAsHeadingNode.bind(this)();
  }


  setTree(tree: HeadingTree) {
    this.tree = tree;
    this.referenceNode = tree.root;
  }


  async onOpen(): Promise<void> {
    registerKeybindings(this.scope, [
      [["Alt"],  "l", async () => await this.stepInto(this.renderedResults[this.selectionIndex])],
      [["Alt"],  "h", async () => await this.stepOut()],
    ]);
  }


  async open(): Promise<void> {
    if (!this.tree) await this.buildTree();
    if (!this.tree) return;
    await super.open();
  }


  async setMarkdownText(): Promise<void> {
    if (this.markdownText) return;

    else if (this.editor)
      this.markdownText = this.editor.getValue();

    else if (this.file) {
      const activeViews = this.app.workspace.getLeavesOfType("markdown").map(
        (leaf: WorkspaceLeaf) => (leaf.view as MarkdownView)
      );
      const activeFiles = activeViews.map((view: MarkdownView) => view.file as TFile);
      const targetFileIndex = activeFiles.indexOf(this.file);
      if (targetFileIndex !== -1) {
        console.debug("File contents read from: WORKSPACE VIEW EDITOR");
        this.editor = activeViews[targetFileIndex].editor;
        this.markdownText = this.editor.getValue();
      } else {
        console.debug("File contents read from: DISK");
        this.markdownText = await this.app.vault.read(this.file);
      }
    }

    else {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) return;
      this.editor = view.editor;
      this.markdownText = this.editor.getValue();
    }
  }


  async buildTree(): Promise<void> {
    await this.setMarkdownText();
    if (!this.markdownText) return;
    this.tree = new HeadingTree(this.markdownText, this.mdLevelLimit);
    this.referenceNode = this.tree.root;
  }


  getSourceItems(source?: HeadingNode, filter?: (node: HeadingNode) => boolean): HeadingNode[] {
    if (!source) return this.referenceNode.children;
    else {
      if (!filter) return source.children;
      return source.children.filter(filter);
    }
  }


  async stepInto(result: HeadingNode): Promise<boolean> {
    if (result.children.length === 0) return false;
    this.referenceNodeStack.push(this.referenceNode);
    this.referenceNode = result;
    this.selectionIndexStack.push(this.selectionIndex);
    this.selectionQueryStack.push(this.query);
    await this.updateInputAndResults("");
    return true;
  }


  async stepOut(): Promise<boolean> {
    if (this.referenceNodeStack.length === 0) return false;
    this.referenceNode = this.referenceNodeStack.pop()!;
    await this.updateInputAndResults(
      this.selectionQueryStack.pop()!,
      this.selectionIndexStack.pop()!
    );
    return true;
  }

}



export class HeadingSelectorSuggest extends HeadingTreeSuggest {

    private selectedNode: HeadingNode;

    constructor(app: App, args: HeadingTreeArgs) {
      super(app, args);
    }

    async waitForSelection(): Promise<HeadingNode | undefined> {
      await this.open();
      return new Promise((resolve) => {
        this.onClose = () => resolve(this.selectedNode ?? undefined);
      });
    }

    enterAction(result: HeadingNode, event: MouseEvent | KeyboardEvent): void | Promise<void> {
      this.selectedNode = result;
      this.close();
    }

    clickAction(result: HeadingNode, event: MouseEvent | KeyboardEvent): void | Promise<void> {
      this.enterAction(result, event);
    }

}



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

type Extraction = {
  text: string;
  pos: EditorPosition;
  changes: EditorChange[];
  editor: Editor;
  sameFile?: {
    cursorToInsertion: boolean;
  };
};


export class HeadingInsertionSuggest extends HeadingTreeSuggest {
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



type ExtractorFlags = {
  extractAtCursor: boolean;
  endAtInsertion: boolean;
  startFlat?: boolean;
  skewUpwards?: boolean;
};


export class HeadingExtractor {
  private app: App;
  private file: TFile;
  private editor: Editor;

  private tree: HeadingTree;
  private extractionNode?: HeadingNode;


  constructor(app: App, ctx: MarkdownView | MarkdownFileInfo) {
    this.app = app;
    this.editor = ctx.editor as Editor;
    this.file = ctx.file as TFile;
    this.tree = new HeadingTree(this.editor.getValue());
  }


  async extractAndInsertHeading(file: TFile, flags: ExtractorFlags): Promise<void> {
    console.debug("--- EXTRACT AND INSERT HEADING ---");
    await this.setExtractionNode(flags);
    if (!this.extractionNode) return;

    let changes: EditorChange[] = [];
    let foreignFileInsertion: boolean = true;
    const extractionRange = this.extractionNode.getHeadingRange(this.tree.lineCount);

    const extraction: Extraction = {
      text: this.editor.getRange(extractionRange.from, extractionRange.to!),
      pos: {...extractionRange.from},
      editor: this.editor,
      changes: [],
    };

    if (extractionRange.to.line >= this.editor.lastLine()) {
      extraction.text += "\n";
      changes.push({
        text: '',
        from: {line: extractionRange.from.line - 1, ch: Infinity},
        to: {line: extractionRange.from.line, ch: 0},
      });
    }
    changes.push({text: '', ...extractionRange});

    const insertSuggest = new HeadingInsertionSuggest(
      this.app, {
        sources: {file},
        mdLevelLimit: this.extractionNode.heading.level.bySyntax,
        startFlat: flags.startFlat,
        skewUpwards: flags.skewUpwards,
      }
    );

    // Same File Extraction and Insertion
    if (file === this.file) {
      await insertSuggest.setMarkdownText(); // Also sets editor and file if available
      insertSuggest.setTree(this.tree);
      this.extractionNode.decouple();
      extraction.changes = extraction.changes.concat(changes);
      extraction.sameFile = {cursorToInsertion: flags.endAtInsertion};
      foreignFileInsertion = false;
    }

    const successfulInsert = await insertSuggest.insertExtraction(extraction);

    // Execute the extraction after a foreign file insertion to prevent data loss.
    if (successfulInsert) {
      if (foreignFileInsertion) {
        this.editor.transaction({changes});
      }
    } else {
      console.debug("- Insertion unsuccessful");
    }

    console.debug("--- EXTRACT AND INSERT HEADING END ---");
  }


  async setExtractionNode(flags: ExtractorFlags): Promise<void> {
    let headingNode: HeadingNode | undefined;
    if (flags.extractAtCursor) headingNode = this.getHeadingNodeAtCursor();
    else headingNode = await this.getHeadingNodeSuggest(this.app);
    this.extractionNode = headingNode;
  }


  getHeadingNodeAtCursor(): HeadingNode | undefined {
    const cursorLine = this.editor.getCursor("head").line;
    return this.tree.searchLastContiguous(node => node.heading.range.from.line <= cursorLine);
  }


  async getHeadingNodeSuggest(app: App): Promise<HeadingNode | undefined> {
    const suggest = new HeadingSelectorSuggest(app, { sources: {editor: this.editor} });
    suggest.setTree(this.tree);
    const selectedNode = await suggest.waitForSelection();
    return selectedNode;
  }


  /**
   * Performance test for the search algorithms.
   * ```typescript
   * // The tree search turned out to be 5 to 30 times faster than the linear search.
   * console.log("---BENCHMARK---");
   * this.performanceTest("Tree Search", 5000, this.tree.searchLastContiguous.bind(this.tree));
   * this.performanceTest("Linear Search", 5000, this.tree.findLastContiguous.bind(this.tree));
   * ```
   */
  private performanceTest(label: string, n: number, searchFunction: (match: (node: HeadingNode) => boolean) => HeadingNode | undefined) {
    const cursorLine = this.editor.getCursor("head").line;
    const startTime = performance.now();
    for (let i = 0; i < n; i++) {
      searchFunction(node => node.heading.range.from.line <= cursorLine);
    }
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    console.debug(`${label} Avg Performance (${n}): ${executionTime / n} ms`);
  }

}

