import { Editor, EditorRange } from "obsidian";



export function handleCursorMovement(
  editor: Editor,
  line: number | undefined,
): void {
  if (line === undefined) return;

  if (!editor.somethingSelected()) {
    editor.setCursor({line, ch: 0});
    return;
  }

  let selection: EditorRange = {
    from: editor.getCursor("anchor"),
    to: {line, ch: 0},
  };

  if (this.app.vault.getConfig("vimMode")) {
    if (line >= selection.from.line) {
      selection.to.ch = 1;
    }
  }

  editor.transaction({selection});
}
