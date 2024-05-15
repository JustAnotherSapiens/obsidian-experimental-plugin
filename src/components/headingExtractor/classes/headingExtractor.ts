import {
  App,
  MarkdownView,
  MarkdownFileInfo,
  TFile,
  Editor,
  EditorChange,
} from 'obsidian';

import {
  HeadingNode,
  HeadingTree,
} from "../utils/dataStructures";

import HeadingSelectorSuggest from './suggests/headingSelector';
import HeadingInsertionSuggest, { Extraction } from './suggests/headingInsertion';




type ExtractorFlags = {
  extractAtCursor: boolean;
  endAtInsertion: boolean;
  startFlat?: boolean;
  skewUpwards?: boolean;
};



export default class HeadingExtractor {
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

