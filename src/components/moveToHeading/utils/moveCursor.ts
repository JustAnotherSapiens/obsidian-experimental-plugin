
import {
  MarkdownView,
  Editor,
} from "obsidian";

import {
  getSetting,
  ScrollOptions,
  customActiveLineScroll,
} from "utils/utilsCore";

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
} from "./helpers";



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
  resolveScroll(view);

}


function resolveScroll(view: MarkdownView): void {

  const scrollExecution = getSetting("scrollExecution");
  if (scrollExecution === "never") return;

  let scrollOptions = {} as ScrollOptions;
  // if (getSetting("useScrollTimeout")) scrollOptions["timeout"] = 0;

  switch (scrollExecution) {
    case "always":
      scrollOptions["viewportThreshold"] = 0.5;
      break;
    case "onThreshold":
      scrollOptions["viewportThreshold"] = getSetting("scrollThreshold");
      break;
  }

  switch (getSetting("scrollMode")) {
    case "viewportFraction":
      scrollOptions!["scrollFraction"] = getSetting("scrollFraction");
      break;
    case "offsetLines":
      scrollOptions!["scrollOffsetLines"] = getSetting("scrollOffsetLines");
      break;
  }

  customActiveLineScroll(view, scrollOptions!);
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



////////////////////////////////////////
// DEPRECATED
////////////////////////////////////////


  // LEVEL ZERO BEHAVIOR

  // let mode = mode;
  // if (headingLevel === 0) {
  //   switch (getSetting("levelZeroBehavior")) {
  //     case "snap-contiguous":
  //       if (mainMode === "parent") args.backwards = true;
  //       mode = "contiguous";
  //       break;
  //     case "snap-parent":
  //       mode = "parent";
  //       break;
  //     case "on-parent-behavior":
  //       const parentLine = movementFunctions.parent(args);
  //       if (parentLine === -1) return;
  //       else args.startLine = parentLine;
  //     default:
  //       break;
  //   }
  // }

		// // Level Zero Behavior
		// new Setting(containerEl)
		//   .setName("Movement at no heading line")
		// 	.setDesc("How to behave on any heading movement action when the cursor is not on a heading line.")
		// 	.addDropdown((dropdown: DropdownComponent) => {
		// 		dropdown.addOptions({
		// 			"snap-contiguous":    "Snap to contiguous",
		// 			"snap-parent":        "Snap to parent",
		// 			"on-parent-behavior": "Behave as if parent",
		// 		});
		// 		dropdown.setValue(plugin.settings.levelZeroBehavior);
		// 		dropdown.onChange(async (value: LevelZeroBehavior) => {
		// 			plugin.settings.levelZeroBehavior = value;
		// 			await plugin.saveSettings();
		// 		});
		// 	});
