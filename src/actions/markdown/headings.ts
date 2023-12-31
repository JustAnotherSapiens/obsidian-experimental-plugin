import {
  Editor, MarkdownView, HeadingCache,
} from "obsidian";

import {
  getSetting,
  getActiveFileCache,
  getHeadingIndex,
  handleCursorMovement,
  scrollToCursor,
} from "../generics";



type MovementDirection = "up" | "down";

type HeadingMovementArgs = {
  fileHeadings: HeadingCache[],
  cursorLine: number,
  headingIndex: number,
  direction: MovementDirection | undefined,
}

const movementFunctions = {
  strictSibling: strictSiblingHeading,
  looseSibling: looseSiblingHeading,
  parent: parentHeading,
  contiguous: contiguousHeading,
  // lastChild: lastChildHeading
}
type MovementMode = keyof typeof movementFunctions;


// STRICT SIBLING: Move to next heading with same level and parent
function strictSiblingHeading(args: HeadingMovementArgs) {
  const currentHeadingLevel = args.fileHeadings[args.headingIndex].level;
  switch (args.direction) {
    case "up":
      for (let i = args.headingIndex - 1; i >= 0; i--) {
        if (args.fileHeadings[i].level < currentHeadingLevel) break;
        if (args.fileHeadings[i].level === currentHeadingLevel) {
          return args.fileHeadings[i].position.start.line;
        }
      }
      if (getSetting("strictSiblingWrapAround")) {
        let lastSiblingIdx = args.headingIndex;
        for (let i = args.headingIndex + 1; i < args.fileHeadings.length; i++) {
          if (args.fileHeadings[i].level < currentHeadingLevel) break;
          if (args.fileHeadings[i].level === currentHeadingLevel) {
            lastSiblingIdx = i;
          }
        }
        if (lastSiblingIdx !== args.headingIndex) {
          return args.fileHeadings[lastSiblingIdx].position.start.line;
        }
      }
      break;
    case "down":
      for (let i = args.headingIndex + 1; i < args.fileHeadings.length; i++) {
        if (args.fileHeadings[i].level < currentHeadingLevel) break;
        if (args.fileHeadings[i].level === currentHeadingLevel) {
          return args.fileHeadings[i].position.start.line;
        }
      }
      if (getSetting("strictSiblingWrapAround")) {
        let firstSiblingIdx = args.headingIndex;
        for (let i = args.headingIndex - 1; i >= 0; i--) {
          if (args.fileHeadings[i].level < currentHeadingLevel) break;
          if (args.fileHeadings[i].level === currentHeadingLevel) {
            firstSiblingIdx = i;
          }
        }
        if (firstSiblingIdx !== args.headingIndex) {
          return args.fileHeadings[firstSiblingIdx].position.start.line;
        }
      }
      break;
    default:
      console.log("Unhandled direction:", args.direction);
      return undefined;
  }
}


// LOOSE SIBLING: Move to next heading with same level
function looseSiblingHeading(args: HeadingMovementArgs) {
  const currentHeadingLevel = args.fileHeadings[args.headingIndex].level;
  switch (args.direction) {
    case "up":
      for (let i = args.headingIndex - 1; i >= 0; i--) {
        if (args.fileHeadings[i].level === currentHeadingLevel) {
          return args.fileHeadings[i].position.start.line;
        }
      }
      if (getSetting("looseSiblingWrapAround")) {
        for (let i = args.fileHeadings.length - 1; i > args.headingIndex; i--) {
          if (args.fileHeadings[i].level === currentHeadingLevel) {
            return args.fileHeadings[i].position.start.line;
          }
        }
      }
      break;
    case "down":
      for (let i = args.headingIndex + 1; i < args.fileHeadings.length; i++) {
        if (args.fileHeadings[i].level === currentHeadingLevel) {
          return args.fileHeadings[i].position.start.line;
        }
      }
      if (getSetting("looseSiblingWrapAround")) {
        for (let i = 0; i < args.headingIndex; i++) {
          if (args.fileHeadings[i].level === currentHeadingLevel) {
            return args.fileHeadings[i].position.start.line;
          }
        }
      }
      break;
    default:
      console.log("Unhandled direction:", args.direction);
      return undefined;
  }
}


function parentHeading(args: HeadingMovementArgs) {
  // if (args.headingIndex === -1) {
  //   args.direction = "up";
  //   return contiguousHeading(args);
  // }
  const currentHeadingLevel = args.fileHeadings[args.headingIndex].level;
  for (let i = args.headingIndex; i >= 0; i--) {
    if (args.fileHeadings[i].level < currentHeadingLevel) {
      return args.fileHeadings[i].position.start.line;
    }
  }
  return undefined;
}


function contiguousHeading(args: HeadingMovementArgs) {
  switch (args.direction) {
    case "up":
      for (let i = args.fileHeadings.length - 1; i >= 0; i--) {
        if (args.fileHeadings[i].position.start.line < args.cursorLine) {
          return args.fileHeadings[i].position.start.line;
        }
      }
      if (getSetting("contiguousWrapAround")) {
        return args.fileHeadings[args.fileHeadings.length - 1].position.start.line;
      }
      break;
    case "down":
      for (const heading of args.fileHeadings) {
        if (heading.position.start.line > args.cursorLine) {
          return heading.position.start.line;
        }
      }
      if (getSetting("contiguousWrapAround")) {
        return args.fileHeadings[0].position.start.line;
      }
      break;
    default:
      console.log("Unhandled direction:", args.direction);
      return undefined;
  }
}


export async function moveCursorToHeading(
  editor: Editor,
  mode: MovementMode,
  direction?: MovementDirection
) {

  const fileHeadings = await getActiveFileCache("headings") as HeadingCache[];
  if (!fileHeadings) return;

  let cursorLine = editor.getCursor().line;
  let headingIndex = getHeadingIndex(fileHeadings, cursorLine);

  // If cursor is not on a heading consider levelZeroBehavior
  if (headingIndex === -1) {
    switch (getSetting("levelZeroBehavior")) {
      case "snap-contiguous":
        if (mode === "parent") direction = "up";
        mode = "contiguous";
        break;
      case "snap-parent":
        mode = "parent";
        break;
      case "on-parent-behavior":
        headingIndex = getHeadingIndex(fileHeadings, cursorLine, true);
        if (headingIndex === -1) return;
        cursorLine = fileHeadings[headingIndex].position.start.line;
        break;
      default:
        console.log("Unhandled levelZeroBehavior:", getSetting("levelZeroBehavior"));
        return;
    }
  }

  const foundHeadingLine = movementFunctions[mode]({
    fileHeadings,
    cursorLine,
    headingIndex,
    direction,
  });
  handleCursorMovement(editor, foundHeadingLine);

  scrollToCursor(editor, getSetting("scrollOffset"));
}


// export function getHeadingSection(
//   editor: Editor,
//   fileHeadings: HeadingCache[],
//   headingIndex: number
// ) {
//   const numberOfHeadings = fileHeadings.length;
//   const currentHeading = fileHeadings[headingIndex];
//   const headingLevel = currentHeading.level;

//   const sectionStart = {line: currentHeading.position.start.line, ch: 0};
//   let sectionEnd = {line: editor.lastLine() + 1, ch: 0}; // Default to EOF

//   for (let i = headingIndex + 1; i < numberOfHeadings; i++) {
//     if (fileHeadings[i].level <= headingLevel) {
//       sectionEnd.line = fileHeadings[i].position.start.line;
//       break;
//     }
//   }

//   return {
//     range: {from: sectionStart, to: sectionEnd},
//     title: currentHeading.heading,
//     text: editor.getRange(sectionStart, sectionEnd),
//     numberOfLines: sectionEnd.line - sectionStart.line,
//     hasLastLine: sectionEnd.line > editor.lastLine()
//   };
// }

