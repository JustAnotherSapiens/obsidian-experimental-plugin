import {
  Editor,
} from "obsidian";

import {
  DateFormat,
  getMatchedDate,
} from "components/time/timeCore";

import { DataNode } from "utils/dataStructures/generics";



export function isCodeBlockEnd(line: string): boolean {
  return line.trimStart().startsWith('```');
}


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



export type FlatHeading = {
  raw: string;
  line: number;
  level: number;
  timestamp?: string;
  text: string;
  title: string;
}


export function getHeadingsArray(fileText: string): FlatHeading[] {
  const textLines = fileText.split("\n");
  let inCodeBlock = false;
  let headings: FlatHeading[] = [];

  for (let i = 0; i < textLines.length; i++) {
    const textLine = textLines[i];

    if (isCodeBlockEnd(textLine)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = textLine.match(/^#{1,6} /);
    if (!match) continue;

    const raw = textLine;
    const line = i;
    const level = match[0].length - 1;

    const dateFormat = getMatchedDate(textLine) as DateFormat;
    if (dateFormat) {
      const dateMatch = textLine.match(dateFormat.regex);
      if (dateMatch && dateMatch.index === match[0].length) {
        const timestamp = dateMatch[0];
        const text = textLine.slice(match[0].length).trim();
        const title = textLine.slice(match[0].length + timestamp.length).trim();
        // if (text === title || text === timestamp)
        //   console.log("Simple Display");
        // else console.log("Complex Display");
        headings.push({raw, line, level, timestamp, text, title});
        continue;
      }
    }

    const text = textLine.slice(match[0].length).trim();
    const title = text;
    headings.push({raw, line, level, text, title});
  }

  return headings;
}

