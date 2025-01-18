import {
  MarkdownView,
  EditorRange,
} from "obsidian";

import {
  HeadingTree,
} from "components/mdHeadings/headingExtractor/utils/dataStructures";

import {
  ScrollTriggerSpecs,
  scrollActiveLineByTriggerBounds,
} from "utils/obsidian/scroll";

import {
  Fold,
  getFolds,
  applyFolds,
} from "components/mdHeadings/foldHeadings/utils";




// NOTE: A nice override functionality for swapHeadingSection would be:
// - to shift heading sections if the cursor is at the heading header
// - to shift lines with their indent "children" if the cursor is at any other text line
// - do nothing if the cursor is at an empty line




function getRestoreFoldsAtRangesFunction(
  view: MarkdownView, ranges: EditorRange[]
): (args: {newRangeStartLines: number[], indexMap: number[]}) => void {

  const rangeCount = ranges.length;
  const rangeStart = ranges[0].from.line;
  const rangeEnd = ranges[rangeCount - 1].to.line;

  const folds = getFolds(view);

  const relFoldArrays: Fold[][] = Array.from({ length: rangeCount }, () => []);
  let rangeIndex = 0;
  let outOfRanges = false;
  let { from, to } = ranges[rangeIndex];

  for (const fold of folds) {
    if (fold.from < rangeStart) continue;
    if (fold.to > rangeEnd) break;

    while (fold.from >= to.line) {
      rangeIndex++;
      if (rangeIndex >= rangeCount) {
        outOfRanges = true;
        break;
      }
      ({ from, to } = ranges[rangeIndex]);
    }
    if (outOfRanges) break;

    if (fold.from >= from.line && fold.to <= to.line) {
      relFoldArrays[rangeIndex].push({
        from: fold.from - from.line,
        to: fold.to - from.line,
      });
    }

  }

  return (args: {newRangeStartLines: number[], indexMap: number[]}) => {
    const newFolds: Fold[] = getFolds(view);

    for (let i = 0; i < rangeCount; i++) {
      const fromLine = args.newRangeStartLines[i];
      for (const fold of relFoldArrays[args.indexMap[i]]) {
        newFolds.push({
          from: fromLine + fold.from,
          to: fromLine + fold.to,
        });
      }
    }

    applyFolds(view, newFolds);
  };
}




function scrollForSwapHeadingSection(view: MarkdownView, upwards: boolean): void {

  const gUpperBound = 0.25;
  const gMidTarget = 0.4;
  const gLowerBound = 0.6;

  let scrollTriggerSpecs: ScrollTriggerSpecs;

  if (upwards) {

    scrollTriggerSpecs = {
      bounds:  {top: gUpperBound, bottom: 1},
      targets: {top: gUpperBound, bottom: gMidTarget},
    };
  } else {

    scrollTriggerSpecs = {
      bounds:  {top: 0,          bottom: gLowerBound},
      targets: {top: gMidTarget, bottom: gLowerBound},
    };
  }

  scrollActiveLineByTriggerBounds(view, scrollTriggerSpecs);
}




export default function swapHeadingSection(view: MarkdownView, args: {upwards: boolean}): void {
  const editor = view.editor;

  const headingTree = new HeadingTree(editor.getValue());
  const cursorPos = editor.getCursor('head');

  const currentNode = headingTree.getNodeAtLine(cursorPos.line);
  if (!currentNode) return;

  const swapNode = args.upwards ? currentNode.prev : currentNode.next;
  if (!swapNode) return;
  if (swapNode.heading.level.bySyntax !== currentNode.heading.level.bySyntax) return;

  const nodes = [currentNode];
  if (args.upwards) nodes.unshift(swapNode);
  else         nodes.push(swapNode);

  const nodeRanges = nodes.map(node => node.getHeadingRange());
  const nodeContents = nodes.map(node => node.heading.getContents(editor));
  const nodeLineCounts = nodeRanges.map(range => range.to.line - range.from.line);

  // End-of-File Edge Case
  if (nodes[1].heading.hasLastLine) {
    nodeContents[1] += '\n';
    nodeContents[0] = nodeContents[0].substring(0, nodeContents[0].length - 1);
  }

  // This should work regardless of the end-of-file edge case;
  // that is due to how the ranges at the EOF are set in the HeadingTree.
  const endCursorLine = cursorPos.line + (args.upwards ? -nodeLineCounts[0] : nodeLineCounts[1]);

  const restoreFoldsAtRanges = getRestoreFoldsAtRangesFunction(view, nodeRanges);

  editor.transaction({
    changes: [{
      text: nodeContents[1] + nodeContents[0],
      from: nodeRanges[0].from,
      to: nodeRanges[1].to,
    }],
    selection: {
      from: {
        line: endCursorLine,
        ch: cursorPos.ch
      }
    }
  });

  const newHeadingStartLines = [
    nodeRanges[0].from.line,
    nodeRanges[0].from.line + nodeLineCounts[1],
  ];

  restoreFoldsAtRanges({
    newRangeStartLines: newHeadingStartLines,
    indexMap: [1, 0],
  });

  scrollForSwapHeadingSection(view, args.upwards);
}

