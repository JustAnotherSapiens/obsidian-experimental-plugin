import {
  Editor,
  EditorRange,
  IconName,
} from 'obsidian';



type SurroundPair = {
  start: string;
  end: string;
  name?: string;
  icon?: IconName;
};


export const DEFAULT_SURROUND_PAIRS: SurroundPair[] = [
  {
    name: 'Bold',
    start: '**',
    end: '**',
    icon: 'bold',
  },
  {
    name: 'Italic',
    start: '*',
    end: '*',
    icon: 'italic',
  },
  {
    name: 'Highlight',
    start: '==',
    end: '==',
    icon: 'highlighter',
  },
  {
    name: 'Strikethrough',
    start: '~~',
    end: '~~',
    icon: 'strikethrough',
  },
  {
    name: 'Code',
    start: '`',
    end: '`',
    icon: 'code',
  },
  {
    name: 'Comment',
    start: '%%',
    end: '%%',
    icon: 'message-square-text',
  },
  {
    name: 'Inline Math',
    start: '$',
    end: '$',
    icon: 'square-sigma',
  },
  {
    name: 'Block Math',
    start: '$$',
    end: '$$',
    icon: 'sigma',
  },
  {
    name: 'Underline',
    start: '<u>',
    end: '</u>',
    icon: 'underline',
  },
];



function regexEscape(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}


export function smartSurround(
  editor: Editor, pair: SurroundPair, linewise: boolean = true
) {

  // Full lines by default
  const editRange: EditorRange = {
    from: {line: editor.getCursor('from').line, ch: 0},
    to: {line: editor.getCursor('to').line, ch: Infinity},
  };

  // Get text to edit
  const isSingleLine = editRange.from.line === editRange.to.line;
  const oneLineSelection = isSingleLine && editor.somethingSelected();
  const editText = oneLineSelection ?
                   editor.getSelection() :
                   editor.getRange(editRange.from, editRange.to);

  let changes = [];
  let endCursorPos = editRange.from;

  const getPairRegex = (flags: string = '') => {
    return new RegExp(`(?:${regexEscape(pair.start)}\|${regexEscape(pair.end)})`, flags);
  };


  // Unstrike
  // TODO: Add a stack-based algorithm to avoid removing only one of the pairs
  // 1. Calculate the ranges of valid "syntaxed" regions.
  // 2. If the cursor is in one of them, then remove only that region's syntax.
  // 3. Otherwise, remove each valid syntaxed region's syntax.
  if (editText.match(getPairRegex())) {
    changes.push({text: editText.replace(getPairRegex('g'), ''), ...editRange});
  }


  // Strike single line selection
  else if (oneLineSelection || !linewise) {
    changes.push({
      text: editText.replace(/^(\s*)(.*?)(\s*)$/, `$1${pair.start}$2${pair.end}$3`),
      from: editor.getCursor('from'),
      to: editor.getCursor('to'),
    });
    endCursorPos = editor.getCursor();
    endCursorPos.ch += (pair.start.length + pair.end.length);
  }

  // Smart strike
  else {
    let smartRegex = /^((?:\s*>{1,6} )?\s*(?:(?:[-*+]|\d{1,6}\.) )?\s*)(.*?)(\s*)$/;
    let lines = editText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      else {
        lines[i] = lines[i].replace(smartRegex, `$1${pair.start}$2${pair.end}$3`);
      }
    }
    changes.push({text: lines.join('\n'), ...editRange});
  }

  // Execute changes
  editor.transaction({changes, selection: {from: endCursorPos}});
}

