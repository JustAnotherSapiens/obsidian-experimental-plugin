import { Editor, EditorRange, EditorRangeOrCaret, HeadingCache, MarkdownView } from "obsidian";

import { getActiveFileCache } from "../generics";


const movementFunctions = {
  next: nextHeading,
  parent: parentHeading,
  sibling: siblingHeading,
  // lastChild: lastChildHeading
}

type MovementMode = keyof typeof movementFunctions;

type MovementDirection = "up" | "down";

type HeadingMovementArgs = {
  fileHeadings: HeadingCache[],
  cursorLine: number,
  headingIndex: number,
  direction: MovementDirection | undefined,
}


function siblingHeading(args: HeadingMovementArgs) {
  // If cursor is not on a heading, move to next heading
  if (args.headingIndex === -1) {
    return nextHeading(args);
  }

  // STRICT SIBLING: Move to next heading with same level and parent
  // TODO...

  // LOOSE SIBLING: Move to next heading with same level

  const currentHeadingLevel = args.fileHeadings[args.headingIndex].level;

  switch (args.direction) {
    case "up":
      for (let i = args.headingIndex - 1; i >= 0; i--) {
        if (args.fileHeadings[i].level === currentHeadingLevel) {
          return args.fileHeadings[i].position.start.line;
        }
      }
      break;
    case "down":
      for (let i = args.headingIndex + 1; i < args.fileHeadings.length; i++) {
        if (args.fileHeadings[i].level === currentHeadingLevel) {
          return args.fileHeadings[i].position.start.line;
        }
      }
      break;
    default:
      return undefined;
  }
}

function parentHeading(args: HeadingMovementArgs) {
  if (args.headingIndex === -1) {
    args.direction = "up";
    return nextHeading(args);
  }
  const currentHeadingLevel = args.fileHeadings[args.headingIndex].level;
  for (let i = args.headingIndex; i >= 0; i--) {
    if (args.fileHeadings[i].level < currentHeadingLevel) {
      return args.fileHeadings[i].position.start.line;
    }
  }
  return undefined;
}

function nextHeading(args: HeadingMovementArgs) {
  switch (args.direction) {
    case "up":
      for (let i = args.fileHeadings.length - 1; i >= 0; i--) {
        if (args.fileHeadings[i].position.start.line < args.cursorLine) {
          return args.fileHeadings[i].position.start.line;
        }
      }
      break;
    case "down":
      for (const heading of args.fileHeadings) {
        if (heading.position.start.line > args.cursorLine) {
          return heading.position.start.line;
        }
      }
      break;
    default:
      return undefined;
  }
}

export async function moveCursorToHeading(
  editor: Editor,
  mode: MovementMode,
  direction?: MovementDirection
) {

  const fileHeadings = await getActiveFileCache("headings") as HeadingCache[];
  const cursorLine = editor.getCursor().line;

  // TODO: Make this a setting
  // Whether to move in relation to the heading the cursor is under
  const validateCursorUnderHeading = false;

  let headingIndex = -1;
  for (let i = fileHeadings.length - 1; i >= 0; i--) {
    if (fileHeadings[i].position.start.line > cursorLine) continue;
    if (fileHeadings[i].position.start.line === cursorLine) headingIndex = i;
    else if (validateCursorUnderHeading) headingIndex = i;
    break;
  }

  // for (let i = 0; i < fileHeadings.length; i++) {
  //   if (fileHeadings[i].position.start.line !== cursorLine) continue;
  //   headingIndex = i;
  // }

  const foundHeadingLine = movementFunctions[mode]({
    fileHeadings,
    cursorLine,
    headingIndex,
    direction,
  });

  if (foundHeadingLine === undefined) return;
  else console.log(`Found ${mode} heading at line:`, foundHeadingLine);

  if (!editor.somethingSelected()) {
    editor.setCursor({line: foundHeadingLine, ch: 0});
    return;
  }

  let selection: EditorRange = {
    from: editor.getCursor("anchor"),
    to: {line: foundHeadingLine, ch: 0},
  };

  if (this.app.vault.config.vimMode) {
    if (foundHeadingLine >= selection.from.line) {
      selection.to.ch = 1;
    }
  }

  editor.transaction({selection});

  // const cursorPos = editor.getCursor();
  // editor.scrollIntoView({from: cursorPos, to: cursorPos}, true);

}



export function getCurrentFileHeadingIndex(
  fileHeadings: HeadingCache[],
  cursorLine: number
) {
  for (let i = fileHeadings.length - 1; i >= 0; i--) {
    if (fileHeadings[i].position.start.line <= cursorLine) return i;
  }
  return -1;
}


export function getHeadingSection(
  editor: Editor,
  fileHeadings: HeadingCache[],
  headingIndex: number
) {
  const numberOfHeadings = fileHeadings.length;
  const currentHeading = fileHeadings[headingIndex];
  const headingLevel = currentHeading.level;

  const sectionStart = {line: currentHeading.position.start.line, ch: 0};
  let sectionEnd = {line: editor.lastLine() + 1, ch: 0}; // Default to EOF

  for (let i = headingIndex + 1; i < numberOfHeadings; i++) {
    if (fileHeadings[i].level <= headingLevel) {
      sectionEnd.line = fileHeadings[i].position.start.line;
      break;
    }
  }

  return {
    range: {from: sectionStart, to: sectionEnd},
    title: currentHeading.heading,
    text: editor.getRange(sectionStart, sectionEnd),
    numberOfLines: sectionEnd.line - sectionStart.line,
    hasLastLine: sectionEnd.line > editor.lastLine()
  };
}

