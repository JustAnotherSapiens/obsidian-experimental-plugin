import {
  Editor,
  EditorRange,
  EditorRangeOrCaret,
} from 'obsidian';

import { DateFormat, getMatchedDate } from "utils/time";

import { isCodeBlockEnd } from "components/mdHeadings/utils/helpers";



export type MarkdownLevel = 1 | 2 | 3 | 4 | 5 | 6;


type HeadingLevel = {
  bySyntax: MarkdownLevel;
  byDepth?: MarkdownLevel;
}

type HeadingRange = EditorRangeOrCaret;

type HeadingHeader = {
  raw: string;
  definer: string;
  text: string;
  timestamp?: string;
  title: string;
}



export class MdHeading {

  header: HeadingHeader;
  level: HeadingLevel;
  range: HeadingRange;
  hasLastLine: boolean = false;


  constructor(lineNumber: number, headerLine: string, headerDefiner?: string) {
    if (lineNumber < 0 || !headerLine) {
      this.range = {from: {line: -1, ch: 0}};
      this.header = {raw: '', text: '', definer: '', timestamp: '', title: ''};
      this.level = {bySyntax: 0 as MarkdownLevel};
    } else {
      this.range = {from: {line: lineNumber, ch: 0}};
      this.setHeader(headerLine, headerDefiner ?? headerLine.match(/^#{1,6} /)![0]);
      this.level = {bySyntax: this.header.definer.length - 1 as MarkdownLevel};
    }
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
    return editor.getRange(this.range.from, this.range.to!);
  }

}



export class HeadingNode {

  prev?: HeadingNode;
  next?: HeadingNode;
  parent?: HeadingNode;
  children: HeadingNode[];
  heading: MdHeading;


  constructor(lineNumber: number, headerLine: string, headerDefiner?: string) {
    this.heading = new MdHeading(lineNumber, headerLine, headerDefiner);
    this.children = [];
  }


  addNext(node: HeadingNode) {
    this.next = node;
    node.prev = this;
    node.parent = this.parent;
    this.parent?.children.push(node);
  }


  addChild(node: HeadingNode) {
    if (this.children.length !== 0)
      this.children[this.children.length - 1].addNext(node);
    else {
      node.parent = this;
      this.children.push(node);
    }
  }


  decouple() {
    if (this.prev) this.prev.next = this.next;
    if (this.next) this.next.prev = this.prev;
    if (this.parent) this.parent!.children.remove(this);
  }


  getHeadingRange(): EditorRange {
    return this.heading.range as EditorRange;
  }


  getHeadingContents(editor: Editor) {
    const range = this.getHeadingRange();
    return editor.getRange(range.from, range.to);
  }


  getRawSiblings(): HeadingNode[] {
    let siblings = [this as HeadingNode];
    let refNode = this as HeadingNode;
    while (refNode.prev) {
      siblings.unshift(refNode.prev);
      refNode = refNode.prev;
    }
    refNode = this as HeadingNode;
    while (refNode.next) {
      siblings.push(refNode.next);
      refNode = refNode.next;
    }
    return siblings;
  }


  getLevelSiblings(): HeadingNode[] {
    const rawSiblings = this.getRawSiblings();
    const refLevel = this.heading.level.bySyntax;
    return rawSiblings.filter(
      node => node.heading.level.bySyntax === refLevel
    );
  }

}



type HeadingLevelTable = {
  [Level in MarkdownLevel]: HeadingNode[];
};



export class HeadingTree {

  public root: HeadingNode;
  public lineCount: number;
  public levelTable: HeadingLevelTable;
  private mdLevelLimit: MarkdownLevel;


  constructor(markdownText: string, mdLevelLimit?: MarkdownLevel) {
    this.root = new HeadingNode(-1, '');

    this.levelTable = {} as HeadingLevelTable;
    for (let i = 1; i <= 6; i++) this.levelTable[i as MarkdownLevel] = [];

    this.mdLevelLimit = mdLevelLimit ?? 6;

    this.parseMarkdownText(markdownText);
  }


  private parseMarkdownText(text: string) {
    const lines = text.split("\n");
    this.lineCount = lines.length;

    const regex = new RegExp(`^#{1,${this.mdLevelLimit}} `);

    let inCodeBlock = false;
    let depthCount = 0;
    let refNode = this.root; // Last significant node to add the next node
    const refNodeLevel = () => refNode.heading.level.bySyntax;
    const refNodeParentLevel = () => refNode.parent?.heading.level.bySyntax ?? 0;

    for (let i = 0; i < lines.length; i++) {
      const textLine = lines[i];

      if (isCodeBlockEnd(textLine)) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      else if (inCodeBlock) continue;

      const match = textLine.match(regex);
      if (!match) continue;

      const currentNode = new HeadingNode(i, textLine, match[0]);
      const currentLevel = currentNode.heading.level.bySyntax;
      this.levelTable[currentLevel].push(currentNode);

      while (currentLevel < refNodeLevel()) {
        if (currentLevel > refNodeParentLevel()) break;
        refNode = refNode.parent!;
        depthCount--;
      }
      if (currentLevel > refNodeLevel()) {
        refNode.addChild(currentNode);
        refNode = currentNode;
        depthCount++;
      } else {
        refNode.addNext(currentNode);
        refNode = currentNode;
      }

      currentNode.heading.level.byDepth = depthCount as MarkdownLevel;
    }

    this.resolveHeadingRanges();
  }


  private resolveHeadingRanges() {
    this.root.heading.range = {
      from: {line: 0, ch: 0},
      to: {line: this.lineCount, ch: 0}
    };
    this.root.heading.hasLastLine = true;

    let refNode = this.root;
    while (refNode.children.length !== 0) {
      refNode = refNode.children[refNode.children.length - 1];
      refNode.heading.hasLastLine = true;
    }

    this.breadthFirstTraversal((node: HeadingNode) => {
      if (node.next !== undefined) {
        node.heading.range.to = {...node.next.heading.range.from};
      } else {
        node.heading.range.to = {...node.parent!.heading.range.to!};
      }
    });
  }


  breadthFirstTraversal(callback: (node: HeadingNode) => void, topNode?: HeadingNode) {
    if (!topNode) topNode = this.root;
    let queue: HeadingNode[] = [...topNode.children];
    while (queue.length !== 0) {
      const node = queue.shift()!;
      callback(node);
      if (node.children.length !== 0)
        queue.push(...node.children);
    }
  }


  traverse(callback: (node: HeadingNode) => void, topNode?: HeadingNode) {
    if (!topNode) topNode = this.root;
    if (topNode.children.length === 0) return;
    let current = topNode.children[0];
    while (current) {
      callback(current);
      if (current.children.length !== 0) {
        current = current.children[0];
      } else {
        while (current.next === undefined && current.parent !== undefined) {
          current = current.parent;
          if (current === topNode) return;
        }
        current = current.next as HeadingNode; // Becomes undefined if it is the last node
      }
    }
  }


  find(match: (node: HeadingNode) => boolean, topNode?: HeadingNode): HeadingNode | undefined {
    let found: HeadingNode | undefined;
    try {
      this.traverse(node => {
        if (!match(node)) return;
        found = node;
        throw 'BREAK';
      }, topNode);
    } catch (error) {
      if (error !== 'BREAK') throw error;
    }
    return found;
  }


  findLast(callback: (node: HeadingNode) => boolean, topNode?: HeadingNode): HeadingNode | undefined {
    let found: HeadingNode | undefined;
    this.traverse(node => {
      if (callback(node)) found = node;
    }, topNode);
    return found;
  }


  findLastContiguous(match: (node: HeadingNode) => boolean, topNode?: HeadingNode): HeadingNode | undefined {
    let foundNode: HeadingNode | undefined;
    try {
      this.traverse(node => {
        if (!match(node)) throw 'BREAK';
        foundNode = node;
      }, topNode);
    } catch (error) {
      if (error !== 'BREAK') throw error;
    }
    return foundNode;
  }


  /**
   * Search algorithm that takes advantage of the tree structure to find the last
   * contiguous node that matches the given node-order-related condition.
   *
   * From benchmarks, it is from 5 to 30 times faster than its linear version.
   * 
   * DESCRIPTION:
   * It first searches through the highest level until a match is not met;
   * then it searches through the children of the last matched node, and so on.
   * 
   * WARNING:
   * It must be noted that this search is only meant to be used for match conditions
   * that are related to the order of the nodes (e.g., line number), since for any
   * other type of match getting the right node is only fully ensured by a linear search.
   */
  searchLastContiguous(match: (node: HeadingNode) => boolean, topNode?: HeadingNode): HeadingNode | undefined {
    if (!topNode) topNode = this.root;
    if (topNode.children.length === 0) return;
    let refNode = topNode;
    let foundNode: HeadingNode | undefined;
    while (true) {
      for (const node of refNode.children) {
        if (!match(node)) break;
        foundNode = node;
      }
      if (!foundNode) break;
      if (foundNode === refNode) break;
      refNode = foundNode;
    }
    return foundNode;
  }


  getNodeAtLine(line: number): HeadingNode | undefined {
    return this.searchLastContiguous(node => node.heading.range.from.line <= line);
  }


  flatten(filter?: (node: HeadingNode) => boolean, topNode?: HeadingNode): HeadingNode[] {
    let nodes: HeadingNode[] = [];
    if (!filter) {
      this.traverse(node => nodes.push(node), topNode);
    } else {
      this.traverse(node => {
        if (filter(node)) nodes.push(node);
      }, topNode);
    }
    return nodes;
  }

}

