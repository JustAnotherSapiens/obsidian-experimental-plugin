import {
  MarkdownView,
  Editor,
} from "obsidian";

import { getSetting } from "utils/obsidian/settings";

import {
  scrollActiveLineByTriggerBounds,
} from "utils/obsidian/scroll";

import {
  searchContiguousHeading,
  searchHigherHeading,
  searchHighestHeading,
  searchLooseSiblingHeading,
  searchStrictSiblingHeading,
  searchLastChildHeading,
} from "./searchHeading";

import {
  getHeadingLevel,
  isCodeBlockEnd,
} from "components/mdHeadings/utils/helpers";



export type CursorMoveArgs = {
  lines: string[],
  startLine: number,
  inCodeBlock: boolean,
  headingLevel: number,
  backwards?: boolean,
  wrapAround?: boolean,
}


const wrapableMovementModes = ["contiguous", "looseSibling", "strictSibling"];

const movementFunctions = {
  contiguous: contiguousHeading,
  higher: higherHeading,
  highest: highestHeading,
  looseSibling: looseSiblingHeading,
  strictSibling: strictSiblingHeading,
  // TODO: Deprecate lastChild
  lastChild: lastChildHeading,
}
type MovementMode = keyof typeof movementFunctions;



export default function moveCursorToHeading(
  editor: Editor,
  view: MarkdownView,
  mode: MovementMode,
  opts?: {backwards: boolean}
) {
  const lines = editor.getValue().split('\n');
  const startLine = editor.getCursor().line;

  let inCodeBlock = false;
  for (let i = 0; i <= startLine; i++) {
    if (isCodeBlockEnd(lines[i])) inCodeBlock = !inCodeBlock;
  }

  const headingLevel = !inCodeBlock ? getHeadingLevel(lines[startLine]) : 0;
  let backwards = opts?.backwards;

  let wrapAround = wrapableMovementModes.includes(mode)
                   ? getSetting(`${mode}WrapAround`)
                   : false;

  const args: CursorMoveArgs = {
    lines, startLine, inCodeBlock, headingLevel, backwards, wrapAround
  };

  const movementLine = movementFunctions[mode](args);
  if (movementLine === -1 || movementLine === startLine) return;

  editor.setCursor({line: movementLine, ch: 0});
  scrollActiveLineByTriggerBounds(view, {
    bounds: {
      top: getSetting("moveToHeading_scrollTriggerBounds")[0],
      bottom: getSetting("moveToHeading_scrollTriggerBounds")[1],
    },
  });

}




////////////////////////////////////////////////////////////////////////////////
// MOVE CURSOR FUNCTIONS
////////////////////////////////////////////////////////////////////////////////

function contiguousHeading(args: CursorMoveArgs) {
  return searchContiguousHeading(args);
}

function higherHeading(args: CursorMoveArgs) {
  if (args.headingLevel === 1) return -1;
  if (args.headingLevel === 0) return searchContiguousHeading(args);
  return searchHigherHeading(args);
}

function highestHeading(args: CursorMoveArgs) {
  if (args.headingLevel === 1) return -1;
  return searchHighestHeading(args);
}

function looseSiblingHeading(args: CursorMoveArgs) {
  if (args.headingLevel === 0) {
    const foundLine = searchContiguousHeading(
      Object.assign({}, args, {backwards: true, wrapAround: false})
    );
    if (foundLine < 0) return -1;
    if (args.backwards) return foundLine;
    args.startLine = foundLine;
    args.headingLevel = getHeadingLevel(args.lines[foundLine]);
  }

  return searchLooseSiblingHeading(args);
}


function strictSiblingHeading(args: CursorMoveArgs) {
  if (args.headingLevel === 0) {
    const foundLine = searchContiguousHeading(
      Object.assign({}, args, {backwards: true, wrapAround: false})
    );
    if (foundLine < 0) return -1;
    if (args.backwards) return foundLine;
    args.startLine = foundLine;
    args.headingLevel = getHeadingLevel(args.lines[foundLine]);
  }

  if (args.headingLevel === 1)
    return searchLooseSiblingHeading(args);
  else
    return searchStrictSiblingHeading(args);
}


function lastChildHeading(args: CursorMoveArgs) {
  if (args.headingLevel >= 6) return -1;
  if (args.headingLevel === 0) {
    args.backwards = false;
    return searchContiguousHeading(args);
  }
  return searchLastChildHeading(args);
}


