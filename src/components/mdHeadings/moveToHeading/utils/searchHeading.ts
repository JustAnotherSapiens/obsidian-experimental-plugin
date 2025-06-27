import { CursorMoveArgs } from './moveCursor';

import {
  getHeadingLevel,
  isCodeBlockEnd,
} from 'components/mdHeadings/utils/helpers';



function getStartLineOffset(args: CursorMoveArgs): number {
  if (args.startLine === args.lines.length - 1 || args.startLine === 0) return 0;
  if (!args.backwards) return 1;
  if (isCodeBlockEnd(args.lines[args.startLine])) return 0;
  return -1;
}



////////////////////////////////////////
// CONTIGUOUS/HIGHER/HIGHEST HEADING
////////////////////////////////////////


export function searchContiguousHeading(args: CursorMoveArgs, wrapSearch: boolean = false): number {
  const {lines, backwards} = args;
  let inCodeBlock = args.inCodeBlock;
  const offset = getStartLineOffset(args);
  const step = backwards ? -1 : 1;
  let nextHeadingLine = -1;
  for (let i = args.startLine + offset; (backwards ? i >= 0 : i < lines.length); i += step) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (/^#{1,6} /.test(lines[i])) {
      nextHeadingLine = i; break;
    }
  }

  if (nextHeadingLine === -1 && args.wrapAround && !wrapSearch) {
    args.startLine = backwards ? lines.length - 1 : 0;
    return searchContiguousHeading(args, true);
  }

  return nextHeadingLine;
}



export function searchHigherHeading(args: CursorMoveArgs): number {
  const {lines, startLine, headingLevel, backwards} = args;
  let inCodeBlock = args.inCodeBlock;
  const regex = new RegExp(`^#{1,${headingLevel - 1}} `);
  const offset = getStartLineOffset(args);
  const step = backwards ? -1 : 1;
  const condition = backwards
                  ? (i:number) => i >= 0
                  : (i: number) => i < lines.length;

  for (let i = startLine + offset; condition(i); i += step) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;

    if (regex.test(lines[i])) return i;
  }
  return -1;
}



export function searchHighestHeading(args: CursorMoveArgs): number {
  const highestHeadings = getRelativeHighestHeadings(args);
  if (highestHeadings.level === args.headingLevel) return -1;
  if (highestHeadings.lines.length !== 0)
    return highestHeadings.lines[0];
  return -1;
}

// The returned lines array is sorted from the startLine outwards.
function getRelativeHighestHeadings(args: CursorMoveArgs): {lines: number[], level: number} {
  const {lines, startLine, headingLevel, backwards} = args;
  let inCodeBlock = args.inCodeBlock;
  const offset = getStartLineOffset(args);
  const step = backwards ? -1 : 1;
  const condition = backwards ?
    (i: number) => i >= 0 :
    (i: number) => i < lines.length;

  let highestLevel = headingLevel ? headingLevel : 6;
  let headingRegex = new RegExp(`^(#{1,${highestLevel}}) `);

  let headings: {lines: number[], level: number} = {lines: [], level: highestLevel};

  for (let i = startLine + offset; condition(i); i += step) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;

    const match = lines[i].match(headingRegex);
    if (!match) continue;

    if (match[1].length < highestLevel) {
      highestLevel = match[1].length;
      headingRegex = new RegExp(`^(#{1,${highestLevel}}) `);
      headings = {lines: [i], level: highestLevel};
    } else {
      headings.lines.push(i);
    }
  }
  return headings;
}



////////////////////////////////////////
// STRICT/LOOSE SIBLING HEADING
////////////////////////////////////////


export function searchLooseSiblingHeading(args: CursorMoveArgs, wrapSearch: boolean = false): number {
  const {lines, backwards} = args;
  let inCodeBlock = args.inCodeBlock;
  const siblingHeadingRegex = new RegExp(`^#{${args.headingLevel}} `);
  const offset = getStartLineOffset(args);
  const step = backwards ? -1 : 1;
  let siblingHeadingLine = -1;
  for (let i = args.startLine + offset; (backwards ? i >= 0 : i < lines.length); i += step) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (siblingHeadingRegex.test(lines[i])) {
      siblingHeadingLine = i; break;
    }
  }

  if (siblingHeadingLine === -1 && args.wrapAround && !wrapSearch) {
    args.startLine = backwards ? lines.length - 1 : 0;
    return searchLooseSiblingHeading(args, true);
  }

  return siblingHeadingLine;
}



// To be used when args.headingLevel > 1
export function searchStrictSiblingHeading(args: CursorMoveArgs, wrapSearch: boolean = false): number {
  const {lines, backwards} = args;
  let inCodeBlock = args.inCodeBlock;
  const equalOrHigherHeadingRegex = new RegExp(`^#{1,${args.headingLevel}} `);
  const headingString = '#'.repeat(args.headingLevel) + ' ';
  const offset = getStartLineOffset(args);
  const step = backwards ? -1 : 1;
  let siblingHeadingLine = -1;

  for (let i = args.startLine + offset; (backwards ? i >= 0 : i < lines.length); i += step) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (equalOrHigherHeadingRegex.test(lines[i])) {
      if (lines[i].startsWith(headingString)) {
        siblingHeadingLine = i; break;
      } else break;
    }
  }

  if (siblingHeadingLine === -1 && args.wrapAround && !wrapSearch) {
    const {start, end} = getSiblingHeadingSectionBounds(args);
    args.startLine = backwards ? end : start;
    console.log('start:', start, 'end:', end);

    return searchStrictSiblingHeading(args, true);
  }

  return siblingHeadingLine;
}



// To be used when args.headingLevel > 1
function getSiblingHeadingSectionBounds(args: CursorMoveArgs): {start: number, end: number} {
  const {lines, headingLevel} = args;
  let inCodeBlock = args.inCodeBlock;
  const superiorHeadingRegex = new RegExp(`^#{1,${headingLevel - 1}} `);

  let upperHeadingLine = -1;
  for (let i = args.startLine - 1; i >= 0; i--) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (superiorHeadingRegex.test(lines[i])) {
      upperHeadingLine = i;
      break;
    }
  }

  let lowerHeadingLine = -1;
  for (let i = args.startLine + 1; i < lines.length; i++) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (superiorHeadingRegex.test(lines[i])) {
      lowerHeadingLine = i;
      break;
    }
  }

  const start = upperHeadingLine === -1 ? 0 : upperHeadingLine;
  const end = lowerHeadingLine === -1 ? lines.length - 1 : lowerHeadingLine;
  return {start, end};
}



////////////////////////////////////////
// LAST CHILD HEADING
////////////////////////////////////////

export function searchLastChildHeading(args: CursorMoveArgs): number {
  const {lines, headingLevel} = args;
  let inCodeBlock = args.inCodeBlock;
  let lastChildHeadingLine = -1;
  let lowestChildLevel = 6;
  for (let i = args.startLine + 1; i < lines.length; i++) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (/^#{1,6} /.test(lines[i])) {
      // const foundHeadingLevel = lines[i].match(/^#+/)![0].length;
      const foundHeadingLevel = getHeadingLevel(lines[i]);
      if (foundHeadingLevel <= headingLevel) break;
      // // foundHeadingLevel will never be greater than 6 at this point.
      // if (foundHeadingLevel > lowestChildLevel) continue;
      if (foundHeadingLevel < lowestChildLevel) {
        lowestChildLevel = foundHeadingLevel;
      }
      lastChildHeadingLine = i;
    }
  }
  return lastChildHeadingLine;
}



// CODE GRAVEYARD


// function getHighestHeadings(args: MovementArgs) {
//   let {lines, inCodeBlock} = args;
//   let highestLevel = 6;
//   let headingRegex = /^(#{1,6}) /;
//   let headings: {lines: number[], level: number} = {lines: [], level: highestLevel};

//   for (let i = 0; i < lines.length - 1; i++) {
//     if (isCodeBlockEnd(lines[i])) {
//       inCodeBlock = !inCodeBlock; continue;
//     } else if (inCodeBlock) continue;

//     let match = lines[i].match(headingRegex);
//     if (!match) continue;

//     if (match[1].length < highestLevel) {
//       highestLevel = match[1].length;
//       headingRegex = new RegExp(`^(#{1,${highestLevel}}) `);
//       headings = {lines: [i], level: highestLevel};
//     } else {
//       headings.lines.push(i);
//     }
//   }
//   return headings;
// }



////////////////////////////////////////
// DEPRECATED
////////////////////////////////////////


// PARENT HEADING

// function parentHeading(args: MovementArgs) {
//   if (args.headingLevel === 1) return -1;
//   if (args.headingLevel === 0) {
//     args.backwards = true;
//     return searchContiguousHeading(args);
//   }
//   return searchParentHeading(args);
// }

// function searchParentHeading(args: MovementArgs): number {
//   let {lines, inCodeBlock, headingLevel} = args;
//   const offset = isCodeBlockEnd(lines[args.startLine]) ? 0 : -1;
//   let parentHeadingLine = -1;
//   for (let i = args.startLine + offset; i >= 0; i--) {
//     if (isCodeBlockEnd(lines[i])) {
//       inCodeBlock = !inCodeBlock; continue;
//     } else if (inCodeBlock) continue;
//     if (/^#{1,6} /.test(lines[i])) {
//       // const foundHeadingLevel = lines[i].match(/^#+/)![0].length;
//       if (headingLevel === 0 || getHeadingLevel(lines[i]) < headingLevel) {
//         parentHeadingLine = i; break;
//       }
//     }
//   }
//   return parentHeadingLine;
// }


