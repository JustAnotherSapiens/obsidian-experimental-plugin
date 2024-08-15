
// TODO: Remove FileCache dependency.

import {
  HeadingCache,
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



type Fold = {from: number, to: number};



export function cleanToggleFold(editor: Editor, view: MarkdownView) {
  editor.exec("toggleFold");
  // In this particular case the built-in scrollIntoView does the job.
  scrollToCursor(editor);
}



function getFolds(view: MarkdownView): Array<Fold> {
  const foldInfo = (view.currentMode as any).getFoldInfo();
  if (foldInfo) return foldInfo.folds;
  return [];
}

function applyFolds(view: MarkdownView, folds: Array<Fold>): void {
  (view.currentMode as any).applyFoldInfo({
    folds, lines: view.editor.lineCount()
  });
  (view as any).onMarkdownFold();
}



import { App, Notice } from "obsidian";
import { HeadingTree, MarkdownLevel } from "../headingExtractor/utils/dataStructures";
import { runQuickSuggest } from "suggests/quickSuggest";


export function getHeadingTree(editor: Editor, mdLevelLimit?: MarkdownLevel): HeadingTree {
  return new HeadingTree(editor.getValue(), mdLevelLimit);
}


export async function foldingHeadingsByLevel(app: App, view: MarkdownView, opts: {unfold: boolean}): Promise<void> {

  const foldText = opts.unfold ? "Unfold" : "Fold";

  const level = await runQuickSuggest(app,
    [1, 2, 3, 4, 5, 6],
    (level: number) => `${foldText} H${level}: ${'#'.repeat(level)}`,
    `${foldText} headings by level`
  );
  if (!level) return;

  if (level < 1 || level > 6) {
    const message = `ERROR(foldHeadingsByLevel): Invalid level: ${level}`;
    new Notice(message);
    console.log(message);
    return;
  }
  const mdLevel = level as MarkdownLevel;

  const editor = view.editor;
  const lineCount = editor.lineCount();

  const tree = getHeadingTree(editor, mdLevel);
  let folds = getFolds(view);


  if (opts.unfold) {
    const linesOfFoldsToRemove = tree.levelTable[mdLevel].map(
      (node) => node.heading.range.from.line
    );
    folds = folds.filter((fold) => !linesOfFoldsToRemove.includes(fold.from));

  } else {
    for (const node of tree.levelTable[mdLevel]) {
      node.calculateHeadingLineEnd(lineCount);
      const fold = {
        from: node.heading.range.from.line,
        to: node.heading.range.to!.line - 1,
      };

      if (fold.to < 0) {
        const message = `ERROR(foldHeadingsByLevel): Invalid fold line end: ${fold.to}`;
        new Notice(message);
        console.log(message);
        continue;
      }
      if (folds.some((f) => f.from === fold.from && f.to === fold.to)) continue;

      folds.push(fold);
    }

    // Sort folds in ascending order.
    folds.sort((a, b) => a.from - b.from);

  }

  applyFolds(view, folds);

  // customActiveLineScroll(view, {
  //   viewportThreshold: 0.5,
  //   scrollFraction: 0.3,
  //   asymmetric: true,
  // });

}




// TODO: Rewrite without FileCache dependency.
export async function cleanToggleFoldOnChildrenHeadings(
  editor: Editor,
  view: MarkdownView,
) {

  const fileHeadings = await getActiveFileCache("headings") as HeadingCache[];
  if (!fileHeadings) return;

  const cursorPos = editor.getCursor();
  const parentHeadingIdx = getHeadingIndex(fileHeadings, cursorPos.line, true);
  if (parentHeadingIdx === -1) return;
  if (parentHeadingIdx === fileHeadings.length - 1) return;

  // Ensure that the parent heading section has children.
  let nextSectionHeadingIdx = -1;
  let highestChildLevel = 6;
  for (let i = parentHeadingIdx + 1; i < fileHeadings.length; i++) {
    if (fileHeadings[i].level <= fileHeadings[parentHeadingIdx].level) {
      nextSectionHeadingIdx = i;
      break;
    }
    if (fileHeadings[i].level < highestChildLevel) {
      highestChildLevel = fileHeadings[i].level;
    }
  }
  if (nextSectionHeadingIdx === parentHeadingIdx + 1) return;
  if (nextSectionHeadingIdx === -1) nextSectionHeadingIdx = fileHeadings.length;

  // Get the first refChildHeadingIdx.
  let refChildHeadingIdx = -1;
  for (let i = parentHeadingIdx + 1; i < nextSectionHeadingIdx; i++) {
    if (fileHeadings[i].level === highestChildLevel) {
      refChildHeadingIdx = i;
      break;
    }
  }

  let {folds, unfold} = getToggledSiblingHeadingFolds(view, fileHeadings, refChildHeadingIdx);

  if (getSetting("alwaysUnfoldParent")) {
    const parentLine = fileHeadings[parentHeadingIdx].position.start.line;
    const parentFoldIdx = folds.findIndex((fold) => fold.from === parentLine);
    if (parentFoldIdx !== -1) {
      folds.splice(parentFoldIdx, 1);
    }
  }

  applyFolds(view, folds);

  customActiveLineScroll(view, {
    viewportThreshold: 0.5,
    scrollFraction: 0.3,
    asymmetric: true,
  });
}



// TODO: Rewrite without FileCache dependency.
export async function cleanToggleFoldOnSiblingHeadings(
  editor: Editor,
  view: MarkdownView,
) {

  const fileHeadings = await getActiveFileCache("headings") as HeadingCache[];
  if (!fileHeadings) return;

  const cursorPos = editor.getCursor();
  const refHeadingIndex = getHeadingIndex(fileHeadings, cursorPos.line, true);
  if (refHeadingIndex === -1) return;

  const {folds} = getToggledSiblingHeadingFolds(view, fileHeadings, refHeadingIndex);

  applyFolds(view, folds);

  customActiveLineScroll(view, {
    viewportThreshold: 0.5,
    scrollFraction: 0.3,
    asymmetric: true,
  });
}



function getToggledSiblingHeadingFolds(
  view: MarkdownView,
  fileHeadings: HeadingCache[],
  refHeadingIndex: number,
): {folds: Array<Fold>, unfold: boolean} {

  let folds = getFolds(view);
  const unfold = folds.some(
    (fold: Fold) => fold.from === fileHeadings[refHeadingIndex].position.start.line
  );

  // Get sibling section info.
  const {headings, rangeEnd} = getSiblingsInfo(view.editor, fileHeadings, refHeadingIndex);

  if (unfold) {
    const headingLines = new Set(headings.map(heading => heading.position.start.line));
    folds = folds.filter((fold) => !headingLines.has(fold.from));
  } else {
    const siblingFoldRanges = headings.map((heading, idx) => ({
      from: heading.position.start.line,
      to: idx + 1 < headings.length ? headings[idx + 1].position.start.line - 1 : rangeEnd,
    }));
    siblingFoldRanges.forEach(range => folds.push(range));
    folds = [...new Set(folds)]; // Remove duplicates.
  }

  return {folds, unfold};
}



function getSiblingsInfo(
  editor: Editor,
  fileHeadings: HeadingCache[],
  refHeadingIndex: number,
) {

  const refHeadingLevel = fileHeadings[refHeadingIndex].level;
  const numberOfHeadings = fileHeadings.length;

  let upperBoundIdx = -1;
  let lowerBoundIdx = -1;
  for (let i = 0; i < numberOfHeadings; i++) {
    // Skip for equal or lower in hierarchy headings.
    if (fileHeadings[i].level >= refHeadingLevel) continue;
    // If we're past the reference heading, we've found the lower bound.
    if (i > refHeadingIndex) {
      lowerBoundIdx = i;
      break;
    // Otherwise, we've possibly found the upper bound.
    } else upperBoundIdx = i;
  }
  if (upperBoundIdx === -1) upperBoundIdx = 0;
  if (lowerBoundIdx === -1) lowerBoundIdx = numberOfHeadings;

  const siblingHeadings: HeadingCache[] = [];
  for (let i = upperBoundIdx; i < lowerBoundIdx; i++) {
    if (fileHeadings[i].level === refHeadingLevel) {
      siblingHeadings.push(fileHeadings[i]);
    }
  }

  const siblingRangeEnd = lowerBoundIdx !== numberOfHeadings ?
                          fileHeadings[lowerBoundIdx].position.start.line - 1 :
                          editor.lastLine();

  return {
    headings: siblingHeadings,
    rangeEnd: siblingRangeEnd,
  };
}

