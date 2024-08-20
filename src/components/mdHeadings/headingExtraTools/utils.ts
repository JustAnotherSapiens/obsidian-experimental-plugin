import {
  App,
  Notice,
  MarkdownView,
  Editor,
} from "obsidian";

import {
  getActiveFileCache,
  getHeadingIndex,
} from "utils/obsidian/cache";

import { getSetting } from "utils/obsidian/settings";

import {
  scrollToCursor,
  customActiveLineScroll,
} from "utils/obsidian/scroll";

import { DateFormat, getMatchedDate } from "utils/time";

import { isCodeBlockEnd } from "components/mdHeadings/utils/helpers";

import {
  MdHeading,
  HeadingNode,
  HeadingTree,
  MarkdownLevel,
} from "components/mdHeadings/headingExtractor/utils/dataStructures";

import { runQuickSuggest } from "suggests/quickSuggest";

import {
  Fold,
  getFolds,
  applyFolds,
} from "components/mdHeadings/foldHeadings/utils";


function getHeadingNodeAtCursor(editor: Editor, headingTree: HeadingTree): HeadingNode | undefined {
  const cursorLine = editor.getCursor("head").line;
  return headingTree.searchLastContiguous(node => node.heading.range.from.line <= cursorLine);
}

function copyToClipboard(text: string) {
  if (typeof require === 'undefined') return;
  if (process.platform === 'win32') {
    require('child_process').spawn('clip').stdin.end(text, 'utf16le');
  } else if (process.platform === 'linux' || process.platform === 'darwin') {
    require('child_process').spawn('pbcopy').stdin.end(text);
  } else if (process.platform === 'android') {
    require('obsidian').clipboard.writeText(text);
  }
}


export function cutHeadingSection(editor: Editor) {
  const headingTree = new HeadingTree(editor.getValue());
  const headingNode = getHeadingNodeAtCursor(editor, headingTree);
  if (!headingNode) return;
  const headingRange = headingNode.getHeadingRange(headingTree.lineCount);
  const headingText = editor.getRange(headingRange.from, headingRange.to!);
  editor.replaceRange("", headingRange.from, headingRange.to!);
  copyToClipboard(headingText);
}


export function moveHeadingUpwards(editor: Editor) {
  const headingTree = new HeadingTree(editor.getValue());
}


export function moveHeadingDownwards(editor: Editor) {
  const headingTree = new HeadingTree(editor.getValue());
}


export function formatHeadingInterspacing(editor: Editor) {
}


function getHeadingNodeAtLine(lineNumber: number, headingTree: HeadingTree): HeadingNode | undefined {
  return headingTree.searchLastContiguous(node => node.heading.range.from.line <= lineNumber);
}


function getHeadingNodeSiblings(editor: Editor, ref: {siblingLine?: number, parentLine?: number, mdLevel?: number}): HeadingNode[] {
  if (ref.siblingLine === undefined && ref.parentLine === undefined) return [];

  const headingTree = new HeadingTree(editor.getValue());
  let siblingNodes: HeadingNode[];

  if (ref.siblingLine !== undefined) {
    const refNode = headingTree.getNodeAtLine(ref.siblingLine);
    if (!refNode) return [];
    const refLevel = refNode.heading.level.bySyntax;
    siblingNodes = refNode.parent!.children
      .filter(
        (node) => node.heading.level.bySyntax === refLevel
      ).sort(
        (a, b) => a.heading.range.from.line - b.heading.range.from.line
      );
  }
  else if (ref.parentLine !== undefined) {
    const refNode = headingTree.getNodeAtLine(ref.parentLine);
    if (!refNode) return [];
    // Use the level of the first child if 'ref.mdLevel' is not provided.
    const refLevel = ref.mdLevel ?? refNode.children[0].heading.level.bySyntax;
    siblingNodes = refNode.children
      .filter(
        (node) => node.heading.level.bySyntax === refLevel
      ).sort(
        (a, b) => a.heading.range.from.line - b.heading.range.from.line
      );
  }
  else return [];

  siblingNodes.forEach(
    (node) => node.calculateHeadingLineEnd(editor.lineCount())
  );

  return siblingNodes;
}


export async function sortSiblingHeadings(app: App, editor: Editor, view: MarkdownView) {

  let siblings = getHeadingNodeSiblings(editor, {siblingLine: editor.getCursor("head").line});

  if (siblings.length < 2) {
    new Notice("Not enough sibling headings to sort.");
    return;
  }

  const parentLine = siblings[0].parent!.heading.range.from.line;
  const mdLevel = siblings[0].heading.level.bySyntax;


  const ascLabel  = (text: string) => `ASC  :: ${text} :: ASC`;
  const descLabel = (text: string) => `DESC :: ${text} :: DESC`;


  const sortings = [
    {
      label: ascLabel("By Header"),
      func: (a: HeadingNode, b: HeadingNode) => {
        return a.heading.header.text.localeCompare(b.heading.header.text);
      },
    },
    {
      label: descLabel("By Header"),
      func: (a: HeadingNode, b: HeadingNode) => {
        return b.heading.header.text.localeCompare(a.heading.header.text);
      },
    },

    {
      label: ascLabel("By Title"),
      func: (a: HeadingNode, b: HeadingNode) => {
        return a.heading.header.title.localeCompare(b.heading.header.title);
      },
    },
    {
      label: descLabel("By Title"),
      func: (a: HeadingNode, b: HeadingNode) => {
        return b.heading.header.title.localeCompare(a.heading.header.title);
      },
    },

    {
      label: ascLabel("By Timestamp"),
      func: (a: HeadingNode, b: HeadingNode) => {
        const aTimestamp = a.heading.header.timestamp || "";
        const bTimestamp = b.heading.header.timestamp || "";
        return aTimestamp.localeCompare(bTimestamp);
      },
    },
    {
      label: descLabel("By Timestamp"),
      func: (a: HeadingNode, b: HeadingNode) => {
        const aTimestamp = a.heading.header.timestamp || "";
        const bTimestamp = b.heading.header.timestamp || "";
        return bTimestamp.localeCompare(aTimestamp);
      },
    },

  ];


  const selectedSort = await runQuickSuggest(app,
    sortings, (sort) => sort.label, "Sort sibling headings"
  );
  if (!selectedSort) return;


  const lastSiblingBeforeSort = siblings[siblings.length - 1];

  // This range must be calculated before sorting.
  const siblingsRange = {
    from: siblings[0].heading.range.from,
    to: siblings[siblings.length - 1].heading.range.to!,
  };


  const presortedSiblings = [...siblings];
  const getSiblingFolds = () => getFolds(view).filter(
    (fold) => fold.from >= siblingsRange.from.line && fold.from <= siblingsRange.to.line
  );

  let foldedHeadingIndices: number[] = [];
  const folds = getSiblingFolds();
  console.log("Folds before sort replacement:", folds);

  if (folds.length > 0) {
    for (const fold of folds) {
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i].heading.range.from.line === fold.from) {
          foldedHeadingIndices.push(i);
          break;
        }
      }
    }
  }
  console.log("Folded heading indices:", foldedHeadingIndices);
  

  // WARNING: Sorting means that some information about the siblings order will be lost.
  //          Make sure to preserve any important information before sorting.
  siblings.sort(selectedSort.func);

  const siblingSortMapping = new Map<number, number>();
  for (let i = 0; i < siblings.length; i++) {
    siblingSortMapping.set(i, presortedSiblings.indexOf(siblings[i]));
  }
  console.log(siblingSortMapping);


  let sortedText = "";

  // NOTE:
  // An empty line at the end of the file is actually a single "\n" character;
  // whereas an empty line between two headings is two "\n" characters.
  // Therefore, in order to maintain visual consistency,
  // we need to account for this unevenness.
  if (lastSiblingBeforeSort.heading.range.to!.line === editor.lineCount()) {
    for (const node of siblings) {
      if (node === lastSiblingBeforeSort) {
        sortedText += node.heading.getContents(editor) + "\n"; // Add newline to last sibling before sorting.
      } else {
        sortedText += node.heading.getContents(editor);
      }
    }
    sortedText = sortedText.slice(0, -1); // Remove last newline.
  }
  else {
    for (const node of siblings) {
      sortedText += node.heading.getContents(editor);
    }
  }

  const initialLineCount = editor.lineCount();
  editor.replaceRange(sortedText, siblingsRange.from, siblingsRange.to);
  const finalLineCount = editor.lineCount();

  if (initialLineCount !== finalLineCount) {
    const message = "ERROR(sortSiblingHeadings): Line count mismatch after sorting.";
    console.error(message);
    new Notice(message, 0);
  }

  // TODO: Preserve also internal folds.

  const newFolds = getSiblingFolds();
  console.log("Folds after sort replacement:", newFolds);

  const siblingsAfterSort = getHeadingNodeSiblings(editor, {parentLine, mdLevel});

  // Ensure oldSiblings and newSiblings have the same length.
  if (siblingsAfterSort.length !== siblings.length) {
    const message = "ERROR(sortSiblingHeadings): Sibling count mismatch after sorting.";
    console.error(message);
    new Notice(message, 0);
  }

  for (const headingOldIndex of foldedHeadingIndices) {
    const headingNewIndex = siblingSortMapping.get(headingOldIndex)!;
    const headingRange = siblingsAfterSort[headingNewIndex].heading.range;
    newFolds.push({
      from: headingRange.from.line,
      to: headingRange.to!.line - 1,
    });
  }

  newFolds.sort((a, b) => a.from - b.from);
  applyFolds(view, newFolds);

  customActiveLineScroll(view, {
    viewportThreshold: 0.5,
    scrollFraction: 0.3,
    asymmetric: true,
  });
}