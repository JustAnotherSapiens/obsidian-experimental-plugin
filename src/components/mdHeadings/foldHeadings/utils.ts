import {
  App,
  Notice,
  MarkdownView,
  Editor,
} from "obsidian";

import {
  scrollToCursor,
  customActiveLineScroll,
} from "utils/obsidian/scroll";

import { getSetting } from "utils/obsidian/settings";

import { runQuickSuggest } from "suggests/quickSuggest";

import {
  HeadingNode,
  HeadingTree,
  MarkdownLevel,
} from "../headingExtractor/utils/dataStructures";



export type Fold = {from: number, to: number};



export function cleanToggleFold(editor: Editor, view: MarkdownView) {
  editor.exec("toggleFold");
  // In this particular case the built-in scrollIntoView does the job.
  scrollToCursor(editor);
}



export function getFolds(view: MarkdownView): Array<Fold> {
  const foldInfo = (view.currentMode as any).getFoldInfo();
  if (foldInfo) return foldInfo.folds;
  return [];
}



export function applyFolds(view: MarkdownView, folds: Array<Fold>): void {
  (view.currentMode as any).applyFoldInfo({
    folds, lines: view.editor.lineCount()
  });
  (view as any).onMarkdownFold();
}



export async function foldingHeadingsByLevel(app: App, view: MarkdownView, opts: {unfold: boolean}): Promise<void> {

  const foldText = opts.unfold ? "Unfold" : "Fold";

  const level = await runQuickSuggest(app,
    [1, 2, 3, 4, 5, 6],
    (level: number) => `${foldText} H${level}: ${'#'.repeat(level)}`,
    `${foldText} headings by level`
  );
  if (!level) return;

  if (level < 1 || level > 6) {
    const message = `ERROR(foldHeadingsByLevel): Invalid level: ${level}`;
    new Notice(message);
    console.log(message);
    return;
  }
  const mdLevel = level as MarkdownLevel;

  const editor = view.editor;

  const tree = new HeadingTree(editor.getValue(), mdLevel);
  let folds = getFolds(view);


  if (opts.unfold) {
    const linesOfFoldsToRemove = tree.levelTable[mdLevel].map(
      (node) => node.heading.range.from.line
    );
    folds = folds.filter((fold) => !linesOfFoldsToRemove.includes(fold.from));

  } else {
    for (const node of tree.levelTable[mdLevel]) {
      const fold = {
        from: node.heading.range.from.line,
        to: node.heading.range.to!.line - 1,
      };

      if (fold.to < 0) {
        const message = `ERROR(foldHeadingsByLevel): Invalid fold line end: ${fold.to}`;
        new Notice(message);
        console.log(message);
        continue;
      }
      if (folds.some((f) => f.from === fold.from && f.to === fold.to)) continue;

      folds.push(fold);
    }

    // Sort folds in ascending order.
    folds.sort((a, b) => a.from - b.from);

  }

  applyFolds(view, folds);

  customActiveLineScroll(view, {
    viewportThreshold: 0.5,
    scrollFraction: 0.3,
    asymmetric: true,
  });

}



function getHeadingNodeAtLine(editor: Editor, line: number): HeadingNode | undefined {
  const headingTree = new HeadingTree(editor.getValue());
  const targetNode = headingTree.getNodeAtLine(line);
  if (!targetNode) {
    const message = `Heading node not found at line: ${line}`;
    new Notice(message, 5000);
    console.log(message);
    return;
  }
// Does the rest of the tree still exist after returning only one of its nodes?
// If so, where is the rest of the tree stored?
// The HeadingTree is more than the network of nodes, but the network of nodes
// can be extracted from one of its nodes.
// You see, it's not only a plain node that is returned, but also an entry point
// to the entire node network.
  return targetNode;
}



export function toggleChildrenHeadingsFolds(editor: Editor, view: MarkdownView) {

  const cursorNode = getHeadingNodeAtLine(editor, editor.getCursor("head").line);
  if (!cursorNode) return;

  const targetNodes = cursorNode.children;

  const shouldUnfold = (folds: Fold[]) => {
    let foldCount = 0;
    for (const node of targetNodes) {
      if (folds.some((fold) => fold.from === node.heading.range.from.line)) {
        foldCount++;
      }
    }
    return (foldCount / targetNodes.length) > 0.5;
  };

  toggleHeadingNodesFolds(view, targetNodes, shouldUnfold);
}



export function toggleSiblingHeadingsFolds(editor: Editor, view: MarkdownView) {

  const cursorNode = getHeadingNodeAtLine(editor, editor.getCursor("head").line);
  if (!cursorNode) return;

  const targetNodes = cursorNode.getLevelSiblings();

  const shouldUnfold = (folds: Fold[]) => folds.some(
    (fold) => fold.from === cursorNode.heading.range.from.line
  );

  toggleHeadingNodesFolds(view, targetNodes, shouldUnfold);
}



export function toggleHeadingNodesFolds(view: MarkdownView, targetNodes: HeadingNode[], shouldUnfold: (folds: Fold[]) => boolean) {
  const targetNodesLines = targetNodes.map((node) => node.heading.range.from.line);

  let folds = getFolds(view);
  const removeFolds = shouldUnfold([...folds]);

  // Remove folds at the sibling headings.
  folds = folds.filter(
    (fold) => !targetNodesLines.includes(fold.from)
  );

  if (!removeFolds) {
    for (const node of targetNodes) {
      folds.push({
        from: node.heading.range.from.line,
        to: node.heading.range.to!.line - 1,
      });
    }
    folds.sort((a, b) => a.from - b.from);
  }

  applyFolds(view, folds);

  customActiveLineScroll(view, {
    viewportThreshold: 0.5,
    scrollFraction: 0.3,
    asymmetric: true,
  });
}

