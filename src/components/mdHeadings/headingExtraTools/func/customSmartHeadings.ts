import {
  App,
  MarkdownView,
  Editor,
} from "obsidian";

import {
  HeadingNode,
  HeadingTree,
  MarkdownLevel,
} from "components/mdHeadings/headingExtractor/utils/dataStructures";

import insertSmartHeading, { HeadingData } from "./insertSmartHeading";




type ReferenceHeadingForSmartHeading = {
  validLevels: MarkdownLevel[],
  titlePattern: string,
}


type SmartHeadingUnderHeadingArgs = {
  insertionHeading: HeadingData,
  referenceHeading: ReferenceHeadingForSmartHeading,
  ignoreSelection: boolean,
  skewUpwards: boolean,
}


function getReferenceHeadingLine(editor: Editor, referenceHeading: ReferenceHeadingForSmartHeading): number | undefined {
  if (referenceHeading.validLevels.length === 0) {
    // throw new Error('No valid levels provided for reference heading');
    console.error('No valid levels provided for reference heading');
    return;
  }

  const mdLevelLimit = Math.max(...referenceHeading.validLevels) as MarkdownLevel;
  const headingTree = new HeadingTree(editor.getValue(), mdLevelLimit);

  let foundHeadingNode: HeadingNode | undefined;

  try {
    headingTree.breadthFirstTraversal(node => {
      const rightLevel = referenceHeading.validLevels.includes(node.heading.level.bySyntax);
      if (!rightLevel) return;

      const regex = new RegExp(referenceHeading.titlePattern, "i"); // Ignore case
      const rightTitle = regex.test(node.heading.header.title);
      if (!rightTitle) return;

      foundHeadingNode = node;
      throw 'BREAK';
    });

  } catch (error) {
    if (error !== 'BREAK') throw error;
  }

  if (!foundHeadingNode) {
    console.warn('No reference heading found');
    return;
  }

  return foundHeadingNode.getHeadingRange().from.line;
}



export function insertSmartHeadingUnderHeading(app: App, view: MarkdownView, args: SmartHeadingUnderHeadingArgs) {

  const referenceLine = getReferenceHeadingLine(view.editor, args.referenceHeading);
  if (!referenceLine) return;

  insertSmartHeading(view, {
    ...args.insertionHeading,
    ignoreSelection: args.ignoreSelection,
    skewUpwards: args.skewUpwards,
    vimMode: (app as any).vault.getConfig('vimMode'),
    referenceLine,
  });

}


