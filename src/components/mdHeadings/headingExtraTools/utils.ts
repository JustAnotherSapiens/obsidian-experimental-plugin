import {
  App,
  Notice,
  MarkdownView,
  Editor,
} from "obsidian";

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
  const headingNode = headingTree.getNodeAtLine(editor.getCursor("head").line);
  if (!headingNode) return;
  const headingRange = headingNode.getHeadingRange();
  const headingText = editor.getRange(headingRange.from, headingRange.to);
  editor.replaceRange("", headingRange.from, headingRange.to);
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


async function getHeadingSortFunction(app: App): Promise<((a: HeadingNode, b: HeadingNode) => number) | undefined> {
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

  return selectedSort.func;
}


function getSiblingsSortedText(siblings: HeadingNode[], editor: Editor): string {
  // NOTE:
  // An empty line at the end of the file is actually a single "\n" character;
  // whereas an empty line between two headings is two "\n" characters.
  let sortedText = "";
  let atEndOfFile = false;
  for (const node of siblings) {
    if (!node.heading.hasLastLine) {
      sortedText += node.getHeadingContents(editor);
    } else {
      sortedText += node.getHeadingContents(editor) + "\n"; // Add newline to the heading at the end of the file.
      atEndOfFile = true;
    }
  }
  if (atEndOfFile) sortedText = sortedText.slice(0, -1); // Remove last newline character.
  return sortedText;
}


export async function sortSiblingHeadings(app: App, editor: Editor, view: MarkdownView) {

  const initialTree = new HeadingTree(editor.getValue());
  const cursorHead = editor.getCursor("head");

  const cursorNode = initialTree.getNodeAtLine(cursorHead.line);
  if (!cursorNode) {
    new Notice("Cursor is not at a heading.", 5000);
    return;
  }

  let siblings = cursorNode.getLevelSiblings();
  if (siblings.length < 2) {
    new Notice("Not enough sibling headings to sort.", 5000);
    return;
  }

  const cursorNodeIndex = siblings.indexOf(cursorNode);
  const cursorHeadingOffset = cursorHead.line - cursorNode.heading.range.from.line;

  const siblingsRange = {
    from: siblings[0].heading.range.from,
    to: siblings[siblings.length - 1].heading.range.to!,
  };


  const siblingSectionFolds = getFolds(view).filter(
    (fold) => fold.from >= siblingsRange.from.line && fold.to <= siblingsRange.to.line
  );

  const siblingFoldData: {[key: number]: {relativeFolds: any[], mapsTo?: number}} = {};

  for (let i = 0; i < siblings.length; i++) {
    const headingFrom = siblings[i].heading.range.from.line;
    const headingTo = siblings[i].heading.range.to!.line;

    const relativeFolds = siblingSectionFolds.filter(
      (fold) => fold.from >= headingFrom && fold.to <= headingTo
    ).map(
      (fold) => ({from: fold.from - headingFrom, to: fold.to - headingFrom})
    );

    siblingFoldData[i] = { relativeFolds };
  }


  // WARNING: Sorting means that some information about the siblings order will be lost.
  //          Make sure to preserve any important information before sorting.
  const presortedSiblings = [...siblings];
  const sortFunction = await getHeadingSortFunction(app);
  if (!sortFunction) return;
  siblings.sort(sortFunction);


  for (let i = 0; i < siblings.length; i++) {
    siblingFoldData[i].mapsTo = presortedSiblings.indexOf(siblings[i]);
  }


  const initialLineCount = editor.lineCount();

  const sortedText = getSiblingsSortedText(siblings, editor);
  // After modifying an editor range, the folds within the range are removed.
  editor.replaceRange(sortedText, siblingsRange.from, siblingsRange.to);

  const finalLineCount = editor.lineCount();

  if (initialLineCount !== finalLineCount) {
    const message = `ERROR(sortSiblingHeadings): Line count mismatch after sorting (Initial: ${initialLineCount}, Final: ${finalLineCount}).`;
    console.error(message);
    new Notice(message, 0);
  }

  const finalTree = new HeadingTree(editor.getValue());
  const newFirstNode = finalTree.getNodeAtLine(siblingsRange.from.line)!;
  const siblingsAfterSort = newFirstNode.getLevelSiblings();

  // Ensure oldSiblings and newSiblings have the same length.
  if (siblingsAfterSort.length !== siblings.length) {
    const message = "ERROR(sortSiblingHeadings): Sibling count mismatch after sorting.";
    console.error(message);
    new Notice(message, 0);
  }

  // Set the cursor to its relative position to the heading it was at originally.
  const newCursorNodeIndex = siblingFoldData[cursorNodeIndex].mapsTo!;
  const newCursorNode = siblingsAfterSort[newCursorNodeIndex];
  editor.setCursor({
    line: newCursorNode.heading.range.from.line + cursorHeadingOffset,
    ch: cursorHead.ch,
  });


  const newFolds = getFolds(view);

  // Recalculate the folds based on the new sibling order and add them back.
  for (const index in siblingFoldData) {
    const siblingRelativeFolds = siblingFoldData[index].relativeFolds;
    if (siblingRelativeFolds.length === 0) continue;
    const siblingNewIndex = siblingFoldData[index].mapsTo!;
    const newSiblingLine = siblingsAfterSort[siblingNewIndex].heading.range.from.line;
    for (const relativeFold of siblingRelativeFolds) {
      newFolds.push({
        from: relativeFold.from + newSiblingLine,
        to:   relativeFold.to   + newSiblingLine,
      })
    }
  }

  newFolds.sort((a, b) => a.from - b.from);
  applyFolds(view, newFolds);

  customActiveLineScroll(view, {
    viewportThreshold: 0.5,
    scrollFraction: 0.3,
    asymmetric: true,
  });
}

