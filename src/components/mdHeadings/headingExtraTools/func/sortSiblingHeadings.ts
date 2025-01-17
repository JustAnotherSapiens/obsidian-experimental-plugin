import {
  App,
  Notice,
  MarkdownView,
  Editor,
  moment,
} from "obsidian";

import {
  scrollActiveLineByTriggerBounds,
} from "utils/obsidian/scroll";

import {
  HeadingNode,
  HeadingTree,
} from "components/mdHeadings/headingExtractor/utils/dataStructures";

import { runQuickSuggest } from "suggests/quickSuggest";

import {
  Fold,
  getFolds,
  applyFolds,
} from "components/mdHeadings/foldHeadings/utils";




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
        if (!aTimestamp || !bTimestamp) {
          return aTimestamp.localeCompare(bTimestamp);
        } else {
          const aMoment = moment(a.heading.header.timestamp!, a.heading.header.timeFormat!.format);
          const bMoment = moment(b.heading.header.timestamp!, b.heading.header.timeFormat!.format);
          return aMoment.isBefore(bMoment) ? -1 : 1;
        }
      },
    },
    {
      label: descLabel("By Timestamp"),
      func: (a: HeadingNode, b: HeadingNode) => {
        const aTimestamp = a.heading.header.timestamp || "";
        const bTimestamp = b.heading.header.timestamp || "";
        if (!aTimestamp || !bTimestamp) {
          return bTimestamp.localeCompare(aTimestamp);
        } else {
          const aMoment = moment(a.heading.header.timestamp!, a.heading.header.timeFormat!.format);
          const bMoment = moment(b.heading.header.timestamp!, b.heading.header.timeFormat!.format);
          return bMoment.isBefore(aMoment) ? -1 : 1;
        }
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



function restoreSiblingSectionFoldsFunction(view: MarkdownView, siblings: HeadingNode[], sortedSiblings: HeadingNode[]): (recalculatedSiblings: HeadingNode[]) => void {

  const siblingSectionStart = siblings[0].heading.range.from.line;
  const siblingSectionEnd = siblings[siblings.length - 1].heading.range.to!.line;

  // Get the folds within the sibling section.
  const siblingSectionFolds = getFolds(view).filter(
    (fold) => fold.from >= siblingSectionStart && fold.to <= siblingSectionEnd
  );

  // Get the fold data for each sibling.
  const siblingFoldData: {[key: number]: {relativeFolds: Fold[], mappedIndex: number}} = {};

  for (let i = 0; i < siblings.length; i++) {

    const headingFrom = siblings[i].heading.range.from.line;
    const headingTo = siblings[i].heading.range.to!.line;

    const relativeFolds = siblingSectionFolds.filter(
      (fold) => fold.from >= headingFrom && fold.to <= headingTo
    ).map(
      (fold) => ({from: fold.from - headingFrom, to: fold.to - headingFrom})
    );

    siblingFoldData[i] = {
      relativeFolds: relativeFolds,
      mappedIndex: siblings.indexOf(sortedSiblings[i]),
    };
  }

  // NOTE: This function should be called after the editor has been modified.
  return (recalculatedSiblings: HeadingNode[]) => {

    // Add the remaining folds at the view.
    const newFolds: Fold[] = getFolds(view);

    for (const indexKey in siblingFoldData) {

      const {relativeFolds, mappedIndex} = siblingFoldData[indexKey];
      if (relativeFolds.length === 0) continue;

      // Add the recalculated folds for the new sibling position.
      const newSiblingLine = recalculatedSiblings[mappedIndex].heading.range.from.line;
      for (const relativeFold of relativeFolds) {
        newFolds.push({
          from: newSiblingLine + relativeFold.from,
          to: newSiblingLine + relativeFold.to,
        })
      }
    }

    // Sort the folds by 'from' position (by convention).
    newFolds.sort((a, b) => a.from - b.from);

    // Update the folds at the view.
    applyFolds(view, newFolds);
  };

}



export default async function sortSiblingHeadings(app: App, editor: Editor, view: MarkdownView): Promise<void> {

  const sortFunction = await getHeadingSortFunction(app);
  if (!sortFunction) return;

  const cursorHead = editor.getCursor('head');

  // Get the node at the cursor position.
  const initialTree = new HeadingTree(editor.getValue());
  const cursorNode = initialTree.getNodeAtLine(cursorHead.line);
  if (!cursorNode) {
    new Notice('Cursor is not at a heading.', 5000);
    return;
  }

  // Get the cursor node's siblings.
  let siblings = cursorNode.getLevelSiblings();
  if (siblings.length < 2) {
    new Notice('Not enough sibling headings to sort.', 5000);
    return;
  }

  // Sort the siblings in-place.
  // WARNING: Sorting means that some information about the siblings order will be lost.
  //          Make sure to preserve any important information before sorting.
  const presortedSiblings = [...siblings];
  const siblingsRange = {
    from: siblings[0].heading.range.from,
    to: siblings[siblings.length - 1].heading.range.to!,
  };
  siblings.sort(sortFunction);


  // Get the restore-folds function before modifying the editor.
  const restoreSiblingSectionFolds = restoreSiblingSectionFoldsFunction(view, presortedSiblings, siblings);


  // After modifying an editor range, the folds within the range are removed.
  const initialLineCount = editor.lineCount();

  const sortedText = getSiblingsSortedText(siblings, editor);
  editor.replaceRange(sortedText, siblingsRange.from, siblingsRange.to);

  const finalLineCount = editor.lineCount();
  if (initialLineCount !== finalLineCount) {
    const message = `ERROR(sortSiblingHeadings): Line count mismatch after sorting (Initial: ${initialLineCount}, Final: ${finalLineCount}).`;
    console.error(message);
    new Notice(message, 0);
  }


  // Recreate the tree to get the siblings with updated ranges.
  const finalTree = new HeadingTree(editor.getValue());
  const finalFirstSiblingNode = finalTree.getNodeAtLine(siblingsRange.from.line)!;
  const finalSiblings = finalFirstSiblingNode.getLevelSiblings();

  // Check if the sibling count is the same after modifying the editor.
  if (finalSiblings.length !== siblings.length) {
    const message = `ERROR(sortSiblingHeadings): Sibling count mismatch after sorting (Initial: ${siblings.length}, Final: ${finalSiblings.length}).`;
    console.error(message);
    new Notice(message, 0);
  }

  // Restore the cursor position.
  // NOTE: Indices must be the same for 'finalSiblings' and 'siblings' (sorted).
  const finalCursorNode = finalSiblings[siblings.indexOf(cursorNode)];
  const cursorHeadingOffset = cursorHead.line - cursorNode.heading.range.from.line;
  editor.setCursor({
    line: finalCursorNode.heading.range.from.line + cursorHeadingOffset,
    ch: cursorHead.ch,
  });

  // Restore the folds.
  restoreSiblingSectionFolds(finalSiblings);


  // Custom scroll.
  scrollActiveLineByTriggerBounds(view, {
    bounds: {top: 0.2, bottom: 0.7},
  });

}
