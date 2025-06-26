import { Editor, EditorPosition } from "obsidian";



export function idxToPos(str: string, idx: number): EditorPosition {
  let line = 0, ch = 0;
  for (let i = 0; i < idx; i++) {
    if (str[i] === '\n') { line++; ch = 0; }
    else ch++;
  }
  return {line, ch};
}


export function posToIdx(str: string, pos: EditorPosition): number {
  let {line, ch} = pos;
  for (let idx = 0; idx < str.length; idx++) {
    if (line !== 0) {
      if (str[idx] === '\n') line--;
      continue;
    }
    if (ch !== 0) { ch--; continue; }
    return idx;
  }
  return str.length;
}



export type TextHandler = (text: string) => string;
export type LineHandler = (lines: string[]) => string[];


export function replaceSelection(editor: Editor, textHandler: TextHandler): void {
  if (!editor.somethingSelected()) return;
  editor.replaceSelection(
    textHandler(editor.getSelection())
  );
}

export function replaceCursorLine(editor: Editor, textHandler: TextHandler): void {
  const cursorLine = editor.getCursor().line;
  const newText = textHandler(editor.getLine(cursorLine));
  editor.setLine(cursorLine, newText);
}

export function replaceSelectionOrCursorLine(editor: Editor, textHandler: TextHandler): void {
  if (editor.somethingSelected()) {
    replaceSelection(editor, textHandler);
  } else {
    replaceCursorLine(editor, textHandler);
  }
}


export function replaceLinesInSelection(editor: Editor, lineHandler: LineHandler): void {
  if (!editor.somethingSelected()) return;
  editor.replaceSelection(
    lineHandler(
      editor.getSelection().split('\n')
    ).join('\n')
  );
}

