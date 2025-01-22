import {
  App,
  MarkdownView,
} from "obsidian";

import {
  MarkdownLevel,
  HeadingTree,
  HeadingNode,
} from "components/mdHeadings/headingExtractor/utils/dataStructures";

import {
  getFolds,
  applyFolds,
} from 'components/mdHeadings/foldHeadings/utils';

import { runQuickSuggest } from "suggests/quickSuggest";





function changeSiblingHeadingsLevel(
  view: MarkdownView,
  args: {
    siblingNodes: HeadingNode[],
    headingLevel: MarkdownLevel,
    endCursorLine: number,
  }
) {

  const changes = [];

  for (const sibling of args.siblingNodes) {
    const siblingLine = sibling.heading.range.from.line;
    const lineStr = sibling.heading.header.raw;

    const headingMatch = lineStr.match(/^#{1,6} /);
    if (!headingMatch) continue;

    changes.push({
      from: {line: siblingLine, ch: headingMatch.index!},
      to: {line: siblingLine, ch: headingMatch.index! + headingMatch[0].length},
      text: '#'.repeat(args.headingLevel) + ' ',
    });

  }

  const folds = getFolds(view);

  view.editor.transaction({
    changes: changes,
    selection: {from: {
      line: args.endCursorLine,
      ch: 0,
    }},
  });

  applyFolds(view, folds);

}



export function shiftSiblingHeadingLevel(view: MarkdownView, args: {step: number, wrapAround: boolean}) {

  const editor = view.editor;
  const tree = new HeadingTree(editor.getValue());
  const cursorLine = editor.getCursor('head').line;

  const cursorNode = tree.getNodeAtLine(cursorLine);
  if (!cursorNode) {
    const message = 'Cursor is not within a heading section.';
    console.debug(message);
    return;
  }

  const currentLevel = cursorNode.heading.level.bySyntax;

  // Only level from 1 to 6
  const targetLevel = (((currentLevel - 1) + args.step + (6 * 42)) % 6) + 1;

  if (!args.wrapAround) {
    if (args.step > 0 && targetLevel < currentLevel) { return; }
    if (args.step < 0 && targetLevel > currentLevel) { return; }
  }

  changeSiblingHeadingsLevel(view, {
    siblingNodes: cursorNode.getLevelSiblings(),
    headingLevel: targetLevel as MarkdownLevel,
    endCursorLine: cursorLine,
  });
}



export async function siblingHeadingLevelSuggest(app: App, view: MarkdownView): Promise<void> {

  const markdownLevel = await runQuickSuggest(app,
    [1, 2, 3, 4, 5, 6] as MarkdownLevel[], // Items
    (level: MarkdownLevel) => `Heading ${level} ${'#'.repeat(level)}`, // Item to Text
    'Select level for the sibling headings' // Placeholder
  );
  if (!markdownLevel) return;


  const editor = view.editor;
  const tree = new HeadingTree(editor.getValue());
  const cursorLine = editor.getCursor('head').line;

  const cursorNode = tree.getNodeAtLine(cursorLine);
  if (!cursorNode) {
    const message = 'Cursor is not within a heading section.';
    console.debug(message);
    return;
  }
  if (cursorNode.heading.level.bySyntax === markdownLevel) {
    return;
  }

  changeSiblingHeadingsLevel(view, {
    siblingNodes: cursorNode.getLevelSiblings(),
    headingLevel: markdownLevel,
    endCursorLine: cursorLine,
  });
}
