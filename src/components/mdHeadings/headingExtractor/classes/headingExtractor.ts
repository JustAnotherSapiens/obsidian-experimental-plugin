import {
  App,
  Notice,
  WorkspaceLeaf,
  MarkdownView,
  MarkdownFileInfo,
  TFile,
  Editor,
  EditorRange,
  EditorChange,
  EditorPosition,
} from 'obsidian';

import { posToIdx } from 'utils/obsidian/editor';

import HeadingSelectorSuggest from './suggests/headingSelector';
import {
  HeadingInsertionDataSuggest,
} from './suggests/headingInsertionData';

import {
  HeadingNode,
  HeadingTree,
} from '../utils/dataStructures';

import {
  Fold,
  getFolds,
  applyFolds,
  loadFoldInfo,
  saveFoldInfo,
  FoldInfo,
} from '../../foldHeadings/utils';

import {
  restoreActiveLineScrollFunc,
} from 'utils/obsidian/scroll';



type ExtractorFlags = {
  extractAtCursor: boolean;
  endAtInsertion: boolean;
  // startFlat?: boolean;
  skewUpwards?: boolean;
  expandInsertionTree?: boolean;
  includeExtractionLevelHeadings?: boolean;
};


type FileContext = {
  file: TFile;
  text: string;
  view?: MarkdownView;
  editor?: Editor;
};


async function getMarkdownFileContext(app: App, targetFile: TFile): Promise<FileContext | undefined> {
  if (!targetFile) {
    console.debug('getMarkdownFileContext: Target File is undefined.');
    return;
  }

  const activeViews = app.workspace.getLeavesOfType('markdown').map(
    (leaf: WorkspaceLeaf) => (leaf.view as MarkdownView)
  );
  const activeFiles = activeViews.map((view: MarkdownView) => view.file as TFile);

  const targetFileIndex = activeFiles.indexOf(targetFile);

  if (targetFileIndex === -1) {
    return {
      file: targetFile,
      text: await app.vault.read(targetFile),
    };
  }

  const targetView = activeViews[targetFileIndex];
  return {
    file: targetFile,
    view: targetView,
    editor: targetView.editor,
    text: targetView.editor.getValue(),
  };
}



export default class HeadingExtractor {
  private app: App;
  private file: TFile;
  private view: MarkdownView;
  private editor: Editor;

  private tree: HeadingTree;
  private extractionNode?: HeadingNode;
  private insertionFile?: TFile;


  constructor(app: App, ctx: MarkdownView | MarkdownFileInfo) {
    this.app = app;
    this.editor = ctx.editor as Editor;
    this.file = ctx.file as TFile;
    this.view = ctx as MarkdownView;
    this.tree = new HeadingTree(this.editor.getValue());
  }


  async resolveExtractionNode(extractAtCursor: boolean): Promise<void> {
    if (this.extractionNode) return;
    let headingNode: HeadingNode | undefined;
    if (extractAtCursor) {
      headingNode = this.tree.getNodeAtLine(this.editor.getCursor('head').line);
    } else {
      const suggest = new HeadingSelectorSuggest(this.app, {sources: {editor: this.editor}});
      suggest.setTree(this.tree);
      headingNode = await suggest.waitForSelection();
    }
    this.extractionNode = headingNode;
  }


  async extractAndInsertHeading(targetFile: TFile, flags: ExtractorFlags): Promise<void> {
    console.debug('--- NEW EXTRACT AND INSERT HEADING ---');
    await this.resolveExtractionNode(flags.extractAtCursor);
    if (!this.extractionNode) return;

    const insertionSuggest = new HeadingInsertionDataSuggest(
      this.app, {
        sources: {file: targetFile},
        mdLevelLimit: this.extractionNode.heading.level.bySyntax,
        expand: flags.expandInsertionTree ?? true,
        sourceNode: this.extractionNode,
        skewUpwards: flags.skewUpwards,
        includeSiblingHeadings: flags.includeExtractionLevelHeadings ?? false,
      }
    );

    this.insertionFile = targetFile;

    const restoreActiveLineScroll = restoreActiveLineScrollFunc(this.view);

    if (targetFile === this.file) {
      await this.sameFileExtractAndInsertHeading(insertionSuggest, flags);
    } else {
      await this.foreignFileExtractAndInsertHeading(insertionSuggest, targetFile, flags);
    }

    if (restoreActiveLineScroll) restoreActiveLineScroll();
  }


  private async getInsertionPositionFromSuggest(insertionSuggest: HeadingInsertionDataSuggest, extractionNode: HeadingNode): Promise<EditorPosition | undefined> {
    const insertionData = await insertionSuggest.waitForSelection();
    if (!insertionData) return;
    const {referenceNode, upwards} = insertionData;
    const insertionPosition = this.getInsertionPosition(extractionNode, referenceNode, upwards);
    return insertionPosition;
  }


  private getInsertionPosition(
    extractionNode: HeadingNode,
    insertionReferenceNode: HeadingNode,
    insertionIsUpwards: boolean,
  ): EditorPosition | undefined {
    if (extractionNode === insertionReferenceNode) return;

    let insertionPosition: EditorPosition;

    // Insertion Under Higher Level Heading Section
    if (insertionReferenceNode.heading.level.bySyntax < extractionNode.heading.level.bySyntax) {
      console.debug('HeadingExtractor::Insertion Calculated Under Higher Level Heading Section');

      if (insertionIsUpwards) {
        const firstHigherEqualChildNode = insertionReferenceNode.children.find(
          (node) => node.heading.level.bySyntax <= extractionNode.heading.level.bySyntax
        );
        if (!firstHigherEqualChildNode) {
          insertionPosition = {...insertionReferenceNode.heading.range.to!};
        } else {
          insertionPosition = {...firstHigherEqualChildNode.heading.range.from};
        }
      } else {
        const firstHigherChildNode = insertionReferenceNode.children.find(
          (node) => node.heading.level.bySyntax < extractionNode.heading.level.bySyntax
        );
        if (!firstHigherChildNode) {
          insertionPosition = {...insertionReferenceNode.heading.range.to!};
        } else {
          insertionPosition = {...firstHigherChildNode.heading.range.from};
        }
      }

    // Insertion Next to Same Level Heading
    } else {
      console.debug('HeadingExtractor::Insertion Calculated Next to Same Level Heading');

      if (insertionIsUpwards) {
        insertionPosition = {...insertionReferenceNode.heading.range.from};
      } else {
        insertionPosition = {...insertionReferenceNode.heading.range.to!};
      }
    }

    // Was it actually working without this?
    return insertionPosition;
  }


  getSameFileInsertionFoldTypes(
    fileView: MarkdownView,
    extractionRange: EditorRange,
    insertionLine: number,
  ) {
    const editRange = {
      from: {line: Math.min(extractionRange.from.line, insertionLine), ch: 0},
      to:   {line: Math.max(extractionRange.to.line,   insertionLine), ch: 0},
    };

    const folds = getFolds(fileView);

    const foldTypes: {
      endAltered: Fold[],
      extracted: Fold[],
      shifted: Fold[],
      startAltered: Fold[],
      unaffected: Fold[],
    } = {
      endAltered: [],
      extracted: [],
      shifted: [],
      startAltered: [],
      unaffected: [],
    };

    const isLineInEditRange = (line: number) => line >= editRange.from.line && line < editRange.to.line;

    // Classify Folds
    for (const fold of folds) {
      let foldConsidered = false;

      // End Altered Folds
      if (fold.from < editRange.from.line && isLineInEditRange(fold.to)) {
        foldTypes.endAltered.push(fold);
        foldConsidered = true;
      }

      // EditRange Folds
      else if (fold.from >= editRange.from.line && fold.to < editRange.to.line) {
        // Extraction Folds
        if (fold.from >= extractionRange.from.line && fold.to < extractionRange.to.line) {
          foldTypes.extracted.push(fold);
        }
        // Shifted Folds
        else foldTypes.shifted.push(fold);

        foldConsidered = true;
      }

      // Start Altered Folds
      else if (isLineInEditRange(fold.from) && fold.to >= editRange.to.line) {
        foldTypes.startAltered.push(fold);
        foldConsidered = true
      }

      // Unaffected Folds
      if (!foldConsidered) {
        foldTypes.unaffected.push(fold);
      }
    }

    return foldTypes;
  }


  getSameFileInsertionUpdatedFolds(
    foldTypes: {
      endAltered: Fold[],
      extracted: Fold[],
      shifted: Fold[],
      startAltered: Fold[],
      unaffected: Fold[],
    },
    isNetMovementUpwards: boolean,
    insertionLineCount: number,
    extractionLine: number,
    insertionLine: number,
  ): Fold[] {
    let updatedFolds: Fold[] = [];

    // End Altered and Shifted Folds
    updatedFolds = updatedFolds.concat(
      this.fixCommonSideEffectFoldAlterations({
        folds: {...foldTypes},
        updatedMarkdown: this.editor.getValue(),
        offset: isNetMovementUpwards ? insertionLineCount : -insertionLineCount,
      })
    );

    // Start Altered Folds
    for (const fold of foldTypes.startAltered) {
      const offset = isNetMovementUpwards ? insertionLineCount : -insertionLineCount;
      if (fold.from + offset === fold.to) continue;
      updatedFolds.push({
        from: fold.from + offset,
        to: fold.to,
      });
    }

    // Extracted Folds
    for (const fold of foldTypes.extracted) {
      let offset = -extractionLine + insertionLine;
      if (!isNetMovementUpwards) offset -= insertionLineCount;
      updatedFolds.push({
        from: fold.from + offset,
        to: fold.to + offset,
      });
    }

    // Unaffected Folds
    updatedFolds = updatedFolds.concat(foldTypes.unaffected);

    return updatedFolds.sort((a, b) => a.from - b.from);
  }


  async getExtractionInsertionMainData(extractionNode: HeadingNode, insertionSuggest: HeadingInsertionDataSuggest) {
    const extractionRange = extractionNode.getHeadingRange();
    const extractionChanges: EditorChange[] = [
      {text: '', from: {...extractionRange.from}, to: {...extractionRange.to}},
    ];

    const extractionText = extractionNode.getHeadingContents(this.editor);
    let insertionText = extractionText;

    if (extractionNode.heading.hasLastLine) {
      insertionText += '\n';
      if (extractionRange.from.line > 0) {
        extractionChanges.push({
          text: '',
          from: {line: extractionRange.from.line - 1, ch: Infinity},
          to: {line: extractionRange.from.line, ch: 0},
        });
      }
    }

    const insertionPosition = await this.getInsertionPositionFromSuggest(insertionSuggest, extractionNode);
    if (!insertionPosition) return;

    if (insertionPosition.line === insertionSuggest.getTree().lineCount) {
      insertionText = '\n' + insertionText.slice(0, -1);
    }

    return {
      extractionRange,
      extractionChanges,
      extractionText,
      insertionText,
      insertionPosition,
    };
  }


  async sameFileExtractAndInsertHeading(insertionSuggest: HeadingInsertionDataSuggest, flags: ExtractorFlags): Promise<void> {
    if (!this.extractionNode) return;
    const extractionNode = this.extractionNode as HeadingNode;

    // Remove the extraction node from the insertion suggestions.
    extractionNode.decouple();
    insertionSuggest.setTree(this.tree);

    const mainData = await this.getExtractionInsertionMainData(extractionNode, insertionSuggest);
    if (!mainData) return;

    const {extractionRange, extractionChanges, insertionText, insertionPosition} = mainData;

    const insertionChanges: EditorChange[] = [
      {text: insertionText, from: {...insertionPosition}},
      ...extractionChanges,
    ];


    // CALCULATIONS PREVIOUS TO TRANSACTION


    // Calculate whether the net movement is upwards or downwards
    const isNetMovementUpwards = extractionRange.from.line > insertionPosition.line;

    // The final '\n' character produces an unwanted empty string in the split array.
    const insertionLineCount = insertionText.split('\n').length - 1;


    // Calculate the FINAL CURSOR POSITION
    const initialCursorPosition = this.editor.getCursor('head');
    let finalCursorPosition: EditorPosition;

    if (flags.endAtInsertion) {
      let resolvedInsertionLine = insertionPosition.line;
      if (!isNetMovementUpwards) resolvedInsertionLine -= insertionLineCount;
      const offset = -extractionRange.from.line + resolvedInsertionLine;
      finalCursorPosition = {
        line: insertionPosition.line + offset,
        ch: initialCursorPosition.ch,
      }
    } else {

      if (isNetMovementUpwards) {
        finalCursorPosition = {...extractionRange.to};
      } else {
        finalCursorPosition = {...extractionRange.from};
      }
    }


    // Get the FOLD TYPES
    const foldTypes = this.getSameFileInsertionFoldTypes(
      this.view, extractionRange, insertionPosition.line
    );


    // Execute TRANSACTION
    this.editor.transaction({
      changes: insertionChanges,
      selection: {from: finalCursorPosition},
    });


    // Calculate the UPDATED FOLDS
    const updatedFolds = this.getSameFileInsertionUpdatedFolds(
      foldTypes, isNetMovementUpwards, insertionLineCount,
      extractionRange.from.line, insertionPosition.line
    );


    applyFolds(this.view, updatedFolds);

  }


  getInsertionFileFoldTypes(
    insertionFile: TFile,
    insertionLine: number,
  ) {
    let insertionFileFoldInfo = loadFoldInfo(this.app, insertionFile);
    if (!insertionFileFoldInfo) {
      insertionFileFoldInfo = {folds: [], lines: 0} as FoldInfo;
    }

    const insertionFileFolds = insertionFileFoldInfo.folds;
    const insertionFileFoldTypes: {endAltered: Fold[], shifted: Fold[], unaffected: Fold[]} = {
      endAltered: [],
      shifted: [],
      unaffected: [],
    };

    for (const fold of insertionFileFolds) {
      let foldConsidered = false;

      // End Altered Folds
      if (fold.from < insertionLine && fold.to >= insertionLine) {
        insertionFileFoldTypes.endAltered.push(fold);
        foldConsidered = true;
      }

      // Shifted Folds
      else if (fold.from >= insertionLine) {
        insertionFileFoldTypes.shifted.push(fold);
        foldConsidered = true;
      }

      // Unaffected Folds
      if (!foldConsidered) {
        insertionFileFoldTypes.unaffected.push(fold);
      }
    }

    return insertionFileFoldTypes;
  }


  getInsertionFileUpdatedFolds(args: {
    foldTypes: {
      endAltered: Fold[],
      shifted: Fold[],
      unaffected: Fold[],
    },
    mainOffset: number,
    updatedFileText: string,
    extraction: {
      folds: Fold[],
      offset: number,
    }
  }) {
    const {foldTypes, mainOffset, updatedFileText, extraction} = args;

    const updatedFolds = this.fixCommonSideEffectFoldAlterations({
      folds: {...foldTypes},
      updatedMarkdown: updatedFileText,
      offset: mainOffset,
    }).concat(foldTypes.unaffected);

    for (const fold of extraction.folds) {
      updatedFolds.push({
        from: fold.from + extraction.offset,
        to: fold.to + extraction.offset,
      });
    }

    return updatedFolds.sort((a, b) => a.from - b.from);
  }


  getExtractionFileFoldTypes(
    extractionFileView: MarkdownView,
    extractionRange: EditorRange,
  ) {
    const folds = getFolds(extractionFileView);
    const foldTypes: {
      endAltered: Fold[],
      extracted: Fold[],
      shifted: Fold[],
      unaffected: Fold[],
    } = {
      endAltered: [],
      extracted: [],
      shifted: [],
      unaffected: [],
    };

    for (const fold of folds) {
      let foldConsidered = false;

      // End Altered Folds
      if (fold.from < extractionRange.from.line && fold.to >= extractionRange.from.line) {
        foldTypes.endAltered.push(fold);
        foldConsidered = true;
      }

      // Extracted Folds
      else if (fold.from >= extractionRange.from.line && fold.to < extractionRange.to.line) {
        foldTypes.extracted.push(fold);
        foldConsidered = true;
      }

      // Shifted Folds
      else if (fold.from >= extractionRange.to.line) {
        foldTypes.shifted.push(fold);
        foldConsidered = true;
      }

      // Unaffected Folds
      if (!foldConsidered) {
        foldTypes.unaffected.push(fold);
      }
    }

    return foldTypes;
  }


  getExtractionFileUpdatedFolds(args: {
    foldTypes: {
      endAltered: Fold[],
      shifted: Fold[],
      unaffected: Fold[],
    },
    mainOffset: number,
    updatedFileText: string,
  }) {
    const {foldTypes, mainOffset, updatedFileText} = args;

    return this.fixCommonSideEffectFoldAlterations({
      folds: {
        endAltered: foldTypes.endAltered,
        shifted: foldTypes.shifted,
      },
      updatedMarkdown: updatedFileText,
      offset: mainOffset,
    }).concat(foldTypes.unaffected).sort((a, b) => a.from - b.from);
  }


  async foreignFileExtractAndInsertHeading(insertionSuggest: HeadingInsertionDataSuggest, targetFile: TFile, flags: ExtractorFlags): Promise<void> {
    if (!this.extractionNode) return;
    const extractionNode = this.extractionNode as HeadingNode;

    const mainData = await this.getExtractionInsertionMainData(extractionNode, insertionSuggest);
    if (!mainData) return;

    const {extractionRange, extractionChanges, extractionText, insertionText, insertionPosition} = mainData;


    // Get Extraction File FOLD TYPES
    const extractionFileFoldTypes = this.getExtractionFileFoldTypes(this.view, extractionRange);

    // Get Insertion File FOLD TYPES
    const insertionFileFoldTypes = this.getInsertionFileFoldTypes(targetFile, insertionPosition.line);


    // UPDATE Extraction File
    this.editor.transaction({
      changes: extractionChanges,
    });


    // UPDATE Insertion File
    const insertionFileText = insertionSuggest.markdownText!;
    const insertionIndex = posToIdx(insertionFileText, {...insertionPosition});
    const embedAtText = (text: string, embedText: string, idx: number) => {
      return text.slice(0, idx) + embedText + text.slice(idx);
    };
    const newInsertionFileText = embedAtText(insertionFileText, insertionText, insertionIndex);
    await this.app.vault.modify(insertionSuggest.file!, newInsertionFileText);


    // Get Extraction File UPDATED FOLDS
    // The last split element is an empty string due to the final '\n' character.
    const extractionLineCount = extractionText.split('\n').length - 1;
    const extractionFileUpdatedFolds = this.getExtractionFileUpdatedFolds({
      foldTypes: extractionFileFoldTypes,
      mainOffset: -extractionLineCount,
      updatedFileText: this.editor.getValue(),
    });

    // Apply Extraction File Updated Folds
    applyFolds(this.view, extractionFileUpdatedFolds);


    // Get Insertion File UPDATED FOLDS
    // The last split element is an empty string due to the final '\n' character.
    const insertionLineCount = insertionText.split('\n').length - 1;
    const insertionFileUpdatedFolds = this.getInsertionFileUpdatedFolds({
      foldTypes: insertionFileFoldTypes,
      mainOffset: insertionLineCount,
      updatedFileText: newInsertionFileText,
      extraction: {
        folds: extractionFileFoldTypes.extracted,
        offset: -extractionRange.from.line + insertionPosition.line,
      }
    });


    // Apply Insertion File Updated Folds
    const insertionFileContext = await getMarkdownFileContext(this.app, insertionSuggest.file!);
    if (!insertionFileContext) return;

    if (!insertionFileContext.view) {
      saveFoldInfo(this.app, insertionFileContext.file, {
        folds: insertionFileUpdatedFolds,
        lines: newInsertionFileText.split('\n').length, // The last '\n' is the final line.
      });
    } else {
      applyFolds(insertionFileContext.view, insertionFileUpdatedFolds);
    }


  }


  fixCommonSideEffectFoldAlterations(args: {
    folds: {
      endAltered: Fold[],
      shifted: Fold[],
    },
    updatedMarkdown: string,
    offset: number,
  }): Fold[] {
    const newTree = new HeadingTree(args.updatedMarkdown);
    const newTreeNodes = newTree.flatten();

    const fixedFolds: Fold[] = [];
    const untrackedFolds: Fold[] = [];

    // Fix End Altered Folds by setting the `to` property to the last line of the heading.
    for (const fold of args.folds.endAltered) {
      const node = newTreeNodes.find((node) => node.heading.range.from.line === fold.from);
      if (!node) { untrackedFolds.push(fold); continue; }
      fixedFolds.push({
        from: node.heading.range.from.line,
        to: node.heading.range.to!.line - 1,
      });
    }

    // Fix Shifted Folds by applying the offset.
    for (const fold of args.folds.shifted) {
      fixedFolds.push({
        from: fold.from + args.offset,
        to: fold.to + args.offset,
      });
    }

    if (untrackedFolds.length > 0) {
      console.debug(`Untracked Folds (fixCommonSideEffectFoldAlterations): ${untrackedFolds.length}`);
      console.debug(untrackedFolds);
    }

    return fixedFolds;
  }


}

