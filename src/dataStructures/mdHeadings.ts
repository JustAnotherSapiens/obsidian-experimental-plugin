import {
  App,
  WorkspaceLeaf,
  MarkdownView,
  TFile,
  Editor,
  EditorPosition,
  EditorRange,
  EditorRangeOrCaret,
  EditorChange,
  EditorTransaction,
} from 'obsidian';

import {
  isCodeBlockEnd,
  getHeadingsTree,
} from 'components/headings/headingUtils';

import {
  DateFormat,
  getMatchedDate,
} from "components/time/timeCore";

import {
  BaseAbstractSuggest,
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

type HeadingHeader = {
  raw: string;
  definer: string;
  text: string;
  timestamp?: string;
  title: string;
  // getLevelBySyntax(): number;
  // getDisplayTitle(): string;
}

type HeadingRange = EditorRangeOrCaret;



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

  // getChildHeadings(): Heading[];
  // getChildNodes(): HeadingNode[];
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

  getExtractionChange(lineCount: number): EditorChange {
    return { text: '', ...this.getHeadingRange(lineCount) };
  }

  getHeadingRange(lineCount: number): EditorRangeOrCaret {
    this.calculateHeadingLineEnd(lineCount);
    return this.heading.range;
  }

  calculateHeadingLineEnd(lineCount: number) {
    if (this.next) {
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



type HeadingLevelIndex = {
  [level in MarkdownLevel]: HeadingNode[];
};


export class HeadingTree {

  public root: HeadingNode;
  public lineCount: number;
  private thresholdMdLevel: MarkdownLevel;
  private levelIndex: HeadingLevelIndex;


  constructor(markdownText: string, thresholdMdLevel?: MarkdownLevel) {
    this.root = new HeadingNode(-1, '');

    this.levelIndex = {} as HeadingLevelIndex;
    for (let i = 1; i <= 6; i++) this.levelIndex[i as MarkdownLevel] = [];

    this.thresholdMdLevel = thresholdMdLevel ?? 6;

    this.parseMarkdownText(markdownText);
  }


  parseMarkdownText(text: string) {
    const lines = text.split("\n");
    this.lineCount = lines.length;

    const regex = new RegExp(`^#{1,${this.thresholdMdLevel}} `);

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
      this.levelIndex[currentLevel].push(currentNode);

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


  traverse(callback: (node: HeadingNode) => void) {
    if (this.root.children.length === 0) return;
    let current = this.root.children[0];
    while (current) {
      callback(current);
      if (current.children.length !== 0) {
        current = current.children[0];
      } else {
        while (current.next === undefined && current.parent !== undefined) {
          current = current.parent;
        }
        current = current.next as HeadingNode; // Can be undefined.
      }
    }
  }


  find(match: (node: HeadingNode) => boolean): HeadingNode | undefined {
    let found: HeadingNode | undefined;
    try {
      this.traverse(node => {
        if (!match(node)) return;
        found = node;
        throw 'BREAK';
      });
    } catch (error) {
      if (error !== 'BREAK') throw error;
    }
    return found;
  }

  findLast(callback: (node: HeadingNode) => boolean): HeadingNode | undefined {
    let found: HeadingNode | undefined;
    this.traverse(node => {
      if (callback(node)) found = node;
    });
    return found;
  }

  findLastContiguous(match: (node: HeadingNode) => boolean): HeadingNode | undefined {
    let foundNode: HeadingNode | undefined;
    try {
      this.traverse(node => {
        if (!match(node)) throw 'BREAK';
        foundNode = node;
      });
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
  searchLastContiguous(match: (node: HeadingNode) => boolean): HeadingNode | undefined {
    if (this.root.children.length === 0) return;
    let refNode = this.root;
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


  flatten(): HeadingNode[] {
    let nodes: HeadingNode[] = [];
    this.traverse(node => nodes.push(node));
    return nodes;
  }

}



export class HeadingExtractor {
  private editor: Editor;
  private tree: HeadingTree;

  constructor(editor: Editor) {
    this.editor = editor;
    this.tree = new HeadingTree(editor.getValue());
  }

  extractHeadingAtCursor(): string {
    const cursorLine = this.editor.getCursor("head").line;
    const headingNode = this.tree.searchLastContiguous(node => node.heading.range.from.line <= cursorLine);
    return this.executeExtractionTransaction(headingNode);
  }

  async extractHeadingSuggest(app: App): Promise<string> {
    const suggest = new HeadingSelectorSuggest(app, {editor: this.editor});
    const headingNode = await suggest.waitForSelection();
    return this.executeExtractionTransaction(headingNode);
  }

  private executeExtractionTransaction(headingNode?: HeadingNode) {
    if (!headingNode) return '';
    const headingRange = headingNode.getHeadingRange(this.tree.lineCount);
    const headingText = this.editor.getRange(headingRange.from, headingRange.to!);
    this.editor.transaction({ changes: [ { text: '', ...headingRange } ] });
    return headingText;
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



/**
 * An abstract suggest class that builds a data tree and allows the user to navigate it.
 *
 * DEV-NOTE: Merge of `HeadingTreeSuggest` and `DataNodeSuggest<Heading>`
 */
export abstract class HeadingTreeSuggest extends BaseAbstractSuggest<HeadingNode> {

  protected tree: HeadingTree;
  protected file?: TFile;
  protected editor?: Editor;
  protected markdownText?: string;

  private referenceNode: HeadingNode;
  private selectionIndexStack: number[] = [];
  private selectionQueryStack: string[] = [];


  constructor(app: App, sources: { file?: TFile, editor?: Editor, markdownText?: string }) {
    super(app, "heading-tree-suggest");
    this.file = sources.file;
    this.editor = sources.editor;
    this.markdownText = sources.markdownText;
    this.itemToString = (node: HeadingNode) => node.heading.header.text;
    setDisplayFunctionAsHeadingNode.bind(this)();
  }


  async onOpen(): Promise<void> {
    registerKeybindings(this.scope, [
      [["Alt"],  "l", async () => await this.stepInto(this.renderedResults[this.selectionIndex])],
      [["Alt"],  "h", async () => await this.stepOut()],
    ]);
  }


  async open(): Promise<void> {
    await this.buildTree();
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
    this.tree = new HeadingTree(this.markdownText);
    this.referenceNode = this.tree.root;
  }


  getSourceItems(): HeadingNode[] {
    return this.referenceNode.children;
  }


  async stepInto(result: HeadingNode): Promise<boolean> {
    if (result.children.length === 0) return false;
    this.referenceNode = result;
    this.selectionIndexStack.push(this.selectionIndex);
    this.selectionQueryStack.push(this.query);
    await this.updateInputAndResults("");
    return true;
  }


  async stepOut(): Promise<boolean> {
    if (!this.referenceNode.parent) return false;
    this.referenceNode = this.referenceNode.parent;
    await this.updateInputAndResults(
      this.selectionQueryStack.pop()!,
      this.selectionIndexStack.pop()!
    );
    return true;
  }

}



export class HeadingSelectorSuggest extends HeadingTreeSuggest {

    private selectedNode: HeadingNode;

    constructor(app: App, sources: { file?: TFile, editor?: Editor, markdownText?: string }) {
      super(app, sources);
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

