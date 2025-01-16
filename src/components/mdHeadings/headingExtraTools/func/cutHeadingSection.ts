import {
  Editor,
} from "obsidian";

import {
  HeadingTree,
} from "components/mdHeadings/headingExtractor/utils/dataStructures";

import { copyToClipboard } from "utils/obsidian/clipboard";



export default function cutHeadingSection(editor: Editor) {
  const headingTree = new HeadingTree(editor.getValue());
  const headingNode = headingTree.getNodeAtLine(editor.getCursor("head").line);
  if (!headingNode) return;
  const headingRange = headingNode.getHeadingRange();
  const headingText = editor.getRange(headingRange.from, headingRange.to);
  editor.replaceRange("", headingRange.from, headingRange.to);
  copyToClipboard(headingText);
}
