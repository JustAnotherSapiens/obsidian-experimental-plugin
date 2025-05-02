import {
  Editor,
  EditorRange,
  IconName,
} from 'obsidian';



function removeNumberReferences(text: string): string {
  const regex = /\[\[\d+\]\]\([^ \n]*\)/gm;
  return text.replace(regex, '');
}

// Wikipedia: https://en.wikipedia.org/wiki/Non-breaking_space
// HTML: &nbsp; &NonBreakingSpace;
function removeNonBreakingSpace(text: string): string {
  const nbspChar = String.fromCharCode(0xa0); // 160 ' '
  const spaceChar = String.fromCharCode(0x20); // 32 ' '
  const allNbspRegex = new RegExp(nbspChar, 'gm');
  return text.replace(allNbspRegex, spaceChar);
}


// If nothing selected, then use the current line.
export function cleanAndNormalizeSelection(editor: Editor) {

  const hasSelection = editor.somethingSelected();
  const cursorLine = editor.getCursor().line;

  let text = hasSelection ? editor.getSelection() : editor.getLine(cursorLine);

  text = removeNumberReferences(text);
  text = removeNonBreakingSpace(text);

  hasSelection ? editor.replaceSelection(text) : editor.setLine(cursorLine, text);
}
