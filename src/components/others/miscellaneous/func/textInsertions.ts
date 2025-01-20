import {
  Editor,
} from 'obsidian';



export default function insertTextAtCursor(editor: Editor, text: string) {
  const from = editor.getCursor('from');
  const to = editor.getCursor('to');

  editor.replaceRange(text, from, to);

  const newCursorOffset = editor.posToOffset(from) + text.length;
  const newCursorPos = editor.offsetToPos(newCursorOffset);
  editor.setCursor(newCursorPos);
}
