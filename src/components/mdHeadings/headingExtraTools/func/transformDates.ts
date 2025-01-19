import {
  App,
  Notice,
  MarkdownView,
  Editor,
  moment,
} from 'obsidian';

import {
  DATE_FORMATS,
  DateTimeFormat,
  getMatchedDate,
} from 'utils/time';

import {
  HeadingTree,
} from 'components/mdHeadings/headingExtractor/utils/dataStructures';

import { runQuickSuggest } from 'suggests/quickSuggest';

import {
  getFolds,
  applyFolds,
} from 'components/mdHeadings/foldHeadings/utils';




export async function promptForDateFormat(app: App, args: {
  placeholder: string,
  excludeDate?: DateTimeFormat,
  filterRegexStr?: string,
  excludeTimezoneOffsetFormats?: boolean,
}): Promise<DateTimeFormat | undefined> {

  let dateFormats = structuredClone(DATE_FORMATS);

  if (args.excludeTimezoneOffsetFormats) {
    dateFormats = dateFormats.filter(
      (format: DateTimeFormat) => !format.name.toLocaleLowerCase().includes('timezone')
    );
  }

  if (args.filterRegexStr) {
    dateFormats = dateFormats.filter(
      (format: DateTimeFormat) => format.name.match(new RegExp(args.filterRegexStr!))
    );
  }

  if (args.excludeDate) {
    dateFormats = dateFormats.filter(
      (format: DateTimeFormat) => format.name !== args.excludeDate!.name
    );
  }

  if (dateFormats.length === 0) {
    new Notice('No date formats available for selection.', 3500);
    return;
  } else if (dateFormats.length === 1) {
    return dateFormats[0];
  }

  const dateFormatToString = (dateFmt: DateTimeFormat) => {
    return dateFmt.name + "\n" + dateFmt.format;
  }

  const selectedFormat = await runQuickSuggest(app, dateFormats, dateFormatToString, args.placeholder);
  if (!selectedFormat) return;

  return selectedFormat;
}



// TODO: Implement this function.
export async function transformListDates(app: App, editor: Editor, view: MarkdownView) {
  const cursorHead = editor.getCursor('head');
  const cursorLine = editor.getLine(cursorHead.line);

  const timeFormat = getMatchedDate(cursorLine);
  if (!timeFormat) {
    new Notice('No valid date format found.', 5000);
    return;
  }

  const lineRegex = /^(\s*)([-+*])(\s*)/;
}



export async function transformSiblingHeadingDates(app: App, view: MarkdownView, flags: {excludeTimezoneOffsetFormats: boolean}) {
  const editor = view.editor;
  const tree = new HeadingTree(editor.getValue());
  const cursorHead = editor.getCursor('head');

  const cursorNode = tree.getNodeAtLine(cursorHead.line);
  if (!cursorNode) {
    new Notice('Cursor is not at a heading.', 5000);
    return;
  }

  const refTimeFormat = cursorNode.heading.header.timeFormat;
  if (!refTimeFormat) {
    new Notice('Cursor heading has no valid time format.', 5000);
    return;
  }

  let filterRegexStr = '';
  if (refTimeFormat.name.match(/\bdate\b/)) {
    filterRegexStr = '\\bdate\\b';
  } else {
    filterRegexStr = '\\bdatetime\\b';
  }

  const transformTimeFormat = await promptForDateFormat(app, {
    placeholder: `Transform from ${refTimeFormat.format} to...`,
    excludeDate: refTimeFormat,
    filterRegexStr,
    excludeTimezoneOffsetFormats: flags.excludeTimezoneOffsetFormats,
  }
  );
  if (!transformTimeFormat) return;

  const siblings = cursorNode.getLevelSiblings();
  const sameTimeFormatSiblings = siblings.filter((node) => {
    const timeFormat = node.heading.header.timeFormat;
    if (!timeFormat) return false;
    return timeFormat.format === refTimeFormat.format;
  });

  const changes = [];

  for (const sibling of sameTimeFormatSiblings) {
    const siblingLine = sibling.heading.range.from.line;
    const lineStr = editor.getLine(siblingLine);
    const timeMatch = lineStr.match(refTimeFormat.regex);
    if (!timeMatch) continue;
    changes.push({
      from: {line: siblingLine, ch: timeMatch.index!},
      to: {line: siblingLine, ch: timeMatch.index! + timeMatch[0].length},
      text: moment(timeMatch[0], refTimeFormat.format).format(transformTimeFormat.format),
    });
  }

  const folds = getFolds(view);

  editor.transaction({
    changes: changes,
    selection: {from: {
      line: cursorHead.line,
      ch: 0,
    }},
  });

  applyFolds(view, folds);

}
