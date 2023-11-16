import {
  Editor,
  MarkdownView,
  WorkspaceLeaf,
  HeadingCache,
  Pos,
  Loc,
} from "obsidian";

import {
  newMultilinePluginNotice,
  getActiveFileCache,
  getActiveView,
} from "./generics";

import {
  getHeadingIndex
} from "./markdown/headings";


export function showCurrentDateAndTime() {
  newMultilinePluginNotice([
    window.moment().format("dddd ([UTC]Z)"),
    window.moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
    // window.moment().format("ddd YYYY-MM-DD HH:mm:ss Z"),
  ], "font-size: 1em; font-style: italic; text-align: center;", 0);
}


/* UI FUNCTIONS */


export function moveCurrentTab(
  direction: "left" | "right"
) {
  const activeTabGroup = this.app.workspace.activeTabGroup;
  const tabsArray = activeTabGroup.children;
  const currentTabIdx = activeTabGroup.currentTab;

  const forward = direction === "right";
  const newCurrentTabIdx = moveArrayElement(tabsArray, currentTabIdx, forward);
  // console.log("New Index:", newCurrentTabIdx);

  activeTabGroup.currentTab = newCurrentTabIdx;
  activeTabGroup.updateTabDisplay();
}


// NOTE: This function modifies the original array.
function moveArrayElement(
  arr: any[],
  index: number,
  forward: boolean
) {
  // Remove the element from the array
  var element = arr.splice(index, 1)[0];
  var newIndex;

  if (forward) {
    // If moving forward and at the end of the array, wrap around to the beginning
    if (index === arr.length) {
        arr.unshift(element);
        newIndex = 0;
    } else {
        arr.splice(index + 1, 0, element);
        newIndex = index + 1;
    }
  } else {
    // If moving backward and at the start of the array, wrap around to the end
    if (index === 0) {
      arr.push(element);
      newIndex = arr.length - 1;
    } else {
      arr.splice(index - 1, 0, element);
      newIndex = index - 1;
    }
  }

  return newIndex;
}


/* FOLD FUNCTIONS */

async function foldChildrenHeadings(editor: Editor, view: MarkdownView) {
  // const view = this.app.workspace.activeLeaf.view as MarkdownView;
  const foldInfo = (view.currentMode as any).getFoldInfo();

  const folds = new Set(foldInfo.folds);
  const lines = editor.lineCount();

  const fileHeadings = await getActiveFileCache("headings") as HeadingCache[];
  const cursorLine = editor.getCursor().line;

  let parentHeadingIndex = -1;
  for (let i = fileHeadings.length - 1; i >= 0; i--) {
    if (fileHeadings[i].position.start.line <= cursorLine) {
      parentHeadingIndex = i;
      break;
    }
  }

}


export async function toggleSiblingSectionsFold(
  editor: Editor,
  view: MarkdownView,
) {

  const fileHeadings = await getActiveFileCache("headings") as HeadingCache[];
  if (!fileHeadings) return;

  const cursorPos = editor.getCursor();
  const refHeadingIndex = getHeadingIndex(fileHeadings, cursorPos.line, true);
  if (refHeadingIndex === -1) return;

  let folds = [];
  let unfold = false;
  const foldInfo = (view.currentMode as any).getFoldInfo();
  if (foldInfo) {
    folds = foldInfo.folds;
    unfold = folds.some(
      (fold: any) => fold.from === fileHeadings[refHeadingIndex].position.start.line
    );
  }

  // Get sibling section info.
  const {headings, rangeEnd} = getSiblingsInfo(editor, fileHeadings, refHeadingIndex);

  if (unfold) {
    const headingLines = new Set(headings.map(heading => heading.position.start.line));
    folds = folds.filter((fold: any) => !headingLines.has(fold.from));
  } else {
    const siblingFoldRanges = headings.map((heading, idx) => ({
      from: heading.position.start.line,
      to: idx + 1 < headings.length ? headings[idx + 1].position.start.line - 1 : rangeEnd,
    }));
    siblingFoldRanges.forEach(range => folds.push(range));
    folds = [...new Set(folds)]; // Remove duplicates.
  }

  // Fold the sibling fold ranges.
  (view.currentMode as any).applyFoldInfo({folds, lines: editor.lineCount()});
  (view as any).onMarkdownFold();

  // Center the cursor.
  editor.scrollIntoView({from: cursorPos, to: cursorPos}, true);

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


    // const siblingRange = {
    //   from: {line: heading.position.start.line, ch: 0},
    //   to: {line: endLine, ch: editor.getLine(endLine).length},
    // };
    // return {
    //   range: siblingRange,
    //   display: heading.heading,
    //   // text: editor.getRange(siblingRange.from, siblingRange.to),
    // };
