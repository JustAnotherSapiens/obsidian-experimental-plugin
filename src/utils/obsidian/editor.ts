import { EditorPosition } from "obsidian";



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

