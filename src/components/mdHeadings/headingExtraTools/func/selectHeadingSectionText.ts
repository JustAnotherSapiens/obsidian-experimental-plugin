import {
  Editor,
} from 'obsidian';

import {
  HeadingTree,
} from "components/mdHeadings/headingExtractor/utils/dataStructures";


// abstract setSelection(anchor: EditorPosition, head?: EditorPosition): void;

export default function selectHeadingSectionText(editor: Editor) {
  const headingTree = new HeadingTree(editor.getValue());
  const headingNode = headingTree.getNodeAtLine(editor.getCursor("head").line);
  if (!headingNode) return;

  const selectionRange = {
    from: { line: headingNode.getHeadingRange().from.line + 1, ch: 0 },
    to: { line: headingNode.getHeadingRange().to.line - 1, ch: Infinity },
  };

  if (selectionRange.from.line >= selectionRange.to.line) return;

  editor.setSelection(
    selectionRange.from,
    selectionRange.to
  );
}

