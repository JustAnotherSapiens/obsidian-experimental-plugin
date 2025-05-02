import {
  App,
  Notice,
  Editor,
  EditorRangeOrCaret,
} from 'obsidian';



export function sortLinesInSelection(editor: Editor, args: {ascending: boolean, keepSelection?: boolean}): void {
  const editRange = {
    from: {line: editor.getCursor('from').line, ch: 0},
    to: {line: editor.getCursor('to').line, ch: Infinity}, // ch: editor.getLine(editor.getCursor('to').line).length,
  };
  const lines = editor.getRange(editRange.from, editRange.to).split('\n');

  const sortedLines = args.ascending ?
    lines.sort((a, b) => a.localeCompare(b)) :
    lines.sort((a, b) => b.localeCompare(a));

  const endSelection: EditorRangeOrCaret = {from: {...editRange.from}};
  if (args.keepSelection) {
    endSelection.to = {...editRange.to};
  }

  editor.transaction({
    changes: [{...editRange, text: sortedLines.join('\n')}],
    selection: endSelection,
  });
}



// TODO: Regex sort

// The default behavior sorts first any non-matching line preserving its original relative order.
// Afterwards, the lines where the regex matches are sorted from the text after the match forwards.
// There's an alternative behavior where the sort is done based on the regex match itself.

export function regexSortLinesInSelection(editor: Editor, args: {pattern: string, ascending: boolean, keepSelection?: boolean}): void {
  const editRange = {
    from: {line: editor.getCursor('from').line, ch: 0},
    to: {line: editor.getCursor('to').line, ch: Infinity}, // ch: editor.getLine(editor.getCursor('to').line).length,
  };
  const lines = editor.getRange(editRange.from, editRange.to).split('\n');

  const regexStr = `${args.pattern}(?<effectiveSortString>.*)$`;

  let regex: RegExp;
  try {
    regex = new RegExp(regexStr);
  } catch (error) {
    const message = `Invalid regular expression: ${regexStr}`;
    new Notice(message, 5000);
    console.debug(message);
    return;
  }

  // Remember: (a, b) => a - b  sorts numbers in ascending order
  const sortedLines = args.ascending ?
    lines.sort((a, b) => {
      const aMatch = a.match(regex);
      const bMatch = b.match(regex);
      if (!bMatch) {
        return (!aMatch ? 0 : 1); // considered equal or else a should come after b
      } else if (!aMatch) return -1; // a should come before b
      return aMatch.groups!.effectiveSortString.localeCompare(bMatch.groups!.effectiveSortString);
    }) :
    lines.sort((a, b) => {
      const aMatch = a.match(regex);
      const bMatch = b.match(regex);
      if (!bMatch) {
        return (!aMatch ? 0 : -1); // considered equal or else a should come before b
      } else if (!aMatch) return 1; // a should come after b
      return bMatch.groups!.effectiveSortString.localeCompare(aMatch.groups!.effectiveSortString);
    });

  const endSelection: EditorRangeOrCaret = {from: {...editRange.from}};
  if (args.keepSelection) {
    endSelection.to = {...editRange.to};
  }

  editor.transaction({
    changes: [{...editRange, text: sortedLines.join('\n')}],
    selection: endSelection,
  });
}
