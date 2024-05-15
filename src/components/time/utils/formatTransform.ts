
//////////////////////////
// DATE FORMAT TRANSFORM (Not ready for use)
// TODO: Remove the `tp` object dependency (from Templater).
//////////////////////////


import {
  Editor,
  HeadingCache,
} from "obsidian";

import {
  getActiveFileCache,
  getHeadingIndex,
} from "utils/utilsCore";

import {
  DateFormat,
  DATE_FORMATS,
  getMatchedDate,
} from "components/time/utils/date";



// TODO: Export this function once it's ready for use.
async function timeFormatTransform(tp: any, editor: Editor) {

  if (editor.somethingSelected()) {
    await dateTransformInSelection(tp, editor);
    return;
  }

  const cursorLine = editor.getCursor().line;
  const cursorLineStr = editor.getLine(cursorLine);

  // Get the date format of the current line.
  const matchedDate = getMatchedDate(cursorLineStr, {verbose: true}) as DateFormat;
  if (!matchedDate) return;

  // Prompt the user for the date format to transform to.
  const newFormat = await getTransformFormat(tp, matchedDate);
  if (!newFormat) return;

  // Get the changes to be made.
  let changes = await getHeadingsDateChanges(tp, editor, matchedDate, newFormat);
  if (changes.length === 0) {
    changes = getLineDateChanges(editor, cursorLine, matchedDate, newFormat);
  }

  // Apply the changes.
  editor.transaction({
    changes: changes,
    selection: {from: {line: cursorLine, ch: 0}}
  });

}

async function dateTransformInSelection(tp: any, editor: Editor) {
  const editRange = {from: editor.getCursor("from"), to: editor.getCursor("to")};
  const rangeText = editor.getRange(editRange.from, editRange.to);

  // Find all the matching date formats in the selection.
  const matchedDates = getMatchedDate(rangeText, {multiple: true, verbose: true}) as DateFormat[];
  if (!matchedDates) return;

  // Prompt the user for the date format to transform from if there are multiple.
  let fromDate = null;
  if (matchedDates.length > 1) {
    fromDate = await tp.system.suggester(
      matchedDates.map(date => `${date.name}\n${date.format}`),
      matchedDates, false, // Throw on cancel
      `Multiple date formats found in selection. Transform from...`
    );
    if (!fromDate) return;
  } else fromDate = matchedDates[0];

  // Prompt the user for the date format to transform to.
  const transformFormat = await getTransformFormat(tp, fromDate);
  if (!transformFormat) return;

  // Get the changes to be made.
  let changes = [];

  const offset = editor.posToOffset(editRange.from);
  for (const match of rangeText.matchAll(new RegExp(fromDate.regex, "g"))) {
    changes.push({
      from: editor.offsetToPos(offset + match.index!),
      to: editor.offsetToPos(offset + match.index! + match[0].length),
      text: this.moment(match[0], fromDate.format).format(transformFormat),
    });
  }

  // Apply the changes.
  editor.transaction({
    changes: changes,
    selection: {from: editRange.from}
  });

}


async function getTransformFormat(tp: any, fromDate: DateFormat) {
  // Get the date formats excluding the one to transform from.
  const dates = structuredClone(DATE_FORMATS);
  const fromDateIdx = dates.findIndex((date: DateFormat) => date.name === fromDate.name);
  if (fromDateIdx !== -1) dates.splice(fromDateIdx, 1);

  // Prompt the user for the new date format.
  return await tp.system.suggester(
    dates.map((date: DateFormat) => `${date.name}\n${date.format}`),
    dates.map((date: DateFormat) => date.format), false, // Throw on cancel
    `Transform from ${fromDate.format} to...`
  );
}


async function getHeadingsDateChanges(
  tp: any,
  editor: Editor,
  matchedDate: DateFormat,
  newFormat: string,
) {
  const cursorLine = editor.getCursor().line;

  // Check if the cursor is on a heading.
  let headingIdx = -1;
  const fileHeadings = await getActiveFileCache("headings") as HeadingCache[];
  if (fileHeadings) headingIdx = getHeadingIndex(fileHeadings, cursorLine);
  if (headingIdx === -1) return [];

  // Prompt to tranform the date of all the sibling headings as well.
  const transformAllSiblingHeadings = await tp.system.suggester(
    ["No", "Yes"], [false, true], false, "Transform all sibling headings?"
  );

  // Return changes for all the sibling headings if the user chose to.
  if (transformAllSiblingHeadings) {
    let changes = [];
    const siblingHeadings = getSiblingHeadings(fileHeadings, headingIdx);
    for (let i = 0; i < siblingHeadings.length; i++) {
      const siblingLine = siblingHeadings[i].position.start.line;
      const siblingLineStr = editor.getLine(siblingLine);
      const dateMatch = siblingLineStr.match(matchedDate.regex);
      if (!dateMatch) continue;
      changes.push({
        from: {line: siblingLine, ch: dateMatch.index!},
        to: {line: siblingLine, ch: dateMatch.index! + dateMatch[0].length},
        text: this.moment(dateMatch[0], matchedDate.format).format(newFormat),
      });
    }
    return changes;
  }

  // Return changes for the heading at the cursor line.
  const cursorLineStr = editor.getLine(cursorLine);
  const dateMatch = cursorLineStr.match(matchedDate.regex) as RegExpMatchArray;
  return [{
    from: {line: cursorLine, ch: dateMatch.index!},
    to: {line: cursorLine, ch: dateMatch.index! + dateMatch[0].length},
    text: this.moment(dateMatch[0], matchedDate.format).format(newFormat),
  }];
}


function getLineDateChanges(
  editor: Editor,
  line: number,
  matchedDate: {regex: RegExp, format: string},
  newFormat: string,
) {
  const match = editor.getLine(line).match(matchedDate.regex) as RegExpMatchArray;
  return [{
    from: {line, ch: match.index!},
    to: {line, ch: match.index! + match[0].length},
    text: this.moment(match[0], matchedDate.format).format(newFormat),
  }];
}



/* HEADING HELPER FUNCTIONS */

function getSiblingHeadings(fileHeadings: HeadingCache[], refHeadingIndex: number) {
  const refHeadingLevel = fileHeadings[refHeadingIndex].level;
  const numberOfHeadings = fileHeadings.length;

  let upperBoundIdx = -1;
  let lowerBoundIdx = -1;
  for (let i = 0; i < numberOfHeadings; i++) {
    // Skip for equal or lower in hierarchy headings.
    if (fileHeadings[i].level >= refHeadingLevel) continue;
    // If we're past the reference heading, we've found the lower bound.
    if (i > refHeadingIndex) {
      lowerBoundIdx = i;
      break;
    // Otherwise, we've possibly found the upper bound.
    } else upperBoundIdx = i;
  }
  if (upperBoundIdx === -1) upperBoundIdx = 0;
  if (lowerBoundIdx === -1) lowerBoundIdx = numberOfHeadings;

  const siblingHeadings = [];
  for (let i = upperBoundIdx; i < lowerBoundIdx; i++) {
    if (fileHeadings[i].level === refHeadingLevel) {
      siblingHeadings.push(fileHeadings[i]);
    }
  }
  return siblingHeadings;
}


