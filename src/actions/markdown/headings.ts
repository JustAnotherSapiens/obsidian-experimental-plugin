import { Editor, EditorRange, EditorRangeOrCaret, HeadingCache, MarkdownView } from "obsidian";

import { getActiveFileCache } from "../generics";


export async function moveCursorToNextHeading(
  editor: Editor, direction: "up" | "down",
) {
  const fileHeadings = await getActiveFileCache("headings") as HeadingCache[];
  const cursorLine = editor.getCursor().line;
  let newCursorLine: number | undefined = undefined;

  if (direction === "up") {
    for (let i = fileHeadings.length - 1; i >= 0; i--) {
      if (fileHeadings[i].position.start.line < cursorLine) {
        newCursorLine = fileHeadings[i].position.start.line;
        break;
      }
    }
  } else if (direction === "down") {
    for (const heading of fileHeadings) {
      if (heading.position.start.line > cursorLine) {
        newCursorLine = heading.position.start.line;
        break;
      }
    }
  }
  if (newCursorLine === undefined) return;

  if (!editor.somethingSelected()) {
    editor.setCursor({line: newCursorLine, ch: 0});
    return;
  }

  let selection: EditorRange = {
    from: editor.getCursor("anchor"),
    to: {line: newCursorLine, ch: 0},
  };

  if (this.app.vault.config.vimMode) {
    if (newCursorLine >= selection.from.line) {
      selection.to.ch = 1;
    }
  }

  editor.transaction({selection});

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

