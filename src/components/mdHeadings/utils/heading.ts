import {
  App,
  WorkspaceLeaf,
  MarkdownView,
  TFile,
  Editor,
} from "obsidian";

import { DateFormat, getMatchedDate } from "utils/time";

import DataNode from "dataStructures/dataNode";

import DataNodeSuggest from "suggests/dataNodeSugggest";
import { simpleHighlight, fuzzyHighlight } from "suggests/utils/display";

import { mdHeadingHTML } from "./display";
import { isCodeBlockEnd } from "./helpers";



type HeadingLevel = {
  bySyntax: number;
  byDepth?: number;
}

type HeadingLinePos = {
    start: number;
    end?: number;
}

type HeadingHeader = {
    raw: string;
    definer: string;
    text: string;
    timestamp?: string;
    title: string;
}


export class Heading {

  level: HeadingLevel;
  linePos: HeadingLinePos;
  header: HeadingHeader;

  constructor(lineNumber: number, headerLine: string, headerDefiner: string) {
    if (lineNumber < 0) return;
    this.linePos = {start: lineNumber};
    this.level = {bySyntax: headerDefiner.length - 1};
    this.setHeader(headerLine, headerDefiner);
  }

  setHeader(headerLine: string, definer: string) {
    const text = headerLine.slice(definer.length).trim();

    const timeFormat = getMatchedDate(text) as DateFormat;
    if (timeFormat) {
      const timeMatch = text.match(timeFormat.regex)!;
      var timestamp = timeMatch[0];
      var title = text.slice(timestamp.length).trim() || timestamp;
    } else {
      var timestamp = '';
      var title = text;
    }

    this.header = {raw: headerLine, text, definer, timestamp, title};
  }

  getContents(editor: Editor) {
    return editor.getRange(
      {line: this.linePos.start, ch: 0},
      {line: this.linePos.end!, ch: editor.getLine(this.linePos.end!).length}
    );
  }

}



/**
 * @param text A valid markdown text.
 * @returns the root node of the headings tree.
 */
export function getHeadingsTree(text: string): DataNode<Heading> {

  const lines = text.split("\n");
  let inCodeBlock = false;

  const root = new DataNode(new Heading(-1, 'Root', ''));
  let lastNode = root; // Last significant node to add the next node

  let depthCount: number = 0;
  const mdLevelStack: number[] = [0];
  const getLastMdLevel = () => mdLevelStack[mdLevelStack.length - 1];

  for (let i = 0; i < lines.length; i++) {
    const textLine = lines[i];

    if (isCodeBlockEnd(textLine)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = textLine.match(/^#{1,6} /);
    if (!match) continue;

    const heading = new Heading(i, textLine, match[0]);
    const headingMdLevel = heading.level.bySyntax;
    const headingNode = new DataNode(heading);

    if (headingMdLevel < getLastMdLevel()) {
      while (headingMdLevel < getLastMdLevel()) {
        depthCount--;
        mdLevelStack.pop();
        lastNode = lastNode.parent!;
      }
    }
    if (headingMdLevel === getLastMdLevel()) {
      lastNode.addNext(headingNode);
      lastNode = headingNode;
    } else {
      depthCount++;
      mdLevelStack.push(headingMdLevel);
      lastNode.addChild(headingNode);
      lastNode = headingNode;
    }

    headingNode.data!.level.byDepth = depthCount;
  }

  return root;
}



export class HeadingTreeSuggest extends DataNodeSuggest<Heading> {

  targetFile: TFile;


  constructor(app: App, nodeToString: (node: DataNode<Heading>) => string, targetFile: TFile) {
    super(app, nodeToString);
    this.targetFile = targetFile;
    this.setDisplayFunctions();
  }


  async buildDataTree(): Promise<DataNode<Heading>> {
    const activeViews = this.app.workspace.getLeavesOfType("markdown").map(
      (leaf: WorkspaceLeaf) => (leaf.view as MarkdownView)
    );
    const activeFiles = activeViews.map((view: MarkdownView) => view.file as TFile);
    const targetFileIndex = activeFiles.indexOf(this.targetFile);

    if (targetFileIndex === -1) {
      console.debug("Target File is NOT on an active view");
      var text = await this.app.vault.read(this.targetFile);
    } else {
      console.debug("Target File is on an active view");
      var text = activeViews[targetFileIndex].editor.getValue();
    }

    return getHeadingsTree(text);
  }


  setDisplayFunctions() {
    this.defaultResultDisplay = (resultEl, node) => {
      resultEl.innerHTML = mdHeadingHTML(
        node.data.level.bySyntax,
        node.data.header.text,
        node.children.length,
      );
    };
    this.simpleResultDisplay = (resultEl, object) => {
      resultEl.innerHTML = mdHeadingHTML(
        object.item.data.level.bySyntax,
        simpleHighlight(object.match, object.item.data.header.text),
        object.item.children.length,
      );
    };
    this.fuzzyResultDisplay = (resultEl, object) => {
      resultEl.innerHTML = mdHeadingHTML(
        object.item.data.level.bySyntax,
        fuzzyHighlight(object.fuzzyResult.matches, object.item.data.header.text),
        object.item.children.length,
      );
    };
  }

}

