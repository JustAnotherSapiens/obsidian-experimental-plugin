import {
  App,
  MarkdownView,
  Editor,
  TFile,
  WorkspaceLeaf,
} from "obsidian";

import { DataNode } from "dataStructures/nodes";

import {
  getSetting,
  customActiveLineScroll,
} from "utils/utilsCore";

import {
  ViewAbstractSuggest,
  DataNodeSuggest,
  simpleHighlight,
  fuzzyHighlight,
} from "components/suggest/sugggestUtils";

import {
  Heading,
  FlatHeading,
  getHeadingsArray,
  getHeadingsTree,
} from "components/headings/headingUtils";



export class HeadingTreeSuggest extends DataNodeSuggest<Heading> {
  targetFile: TFile;

  constructor(app: App, nodeToString: (node: DataNode<Heading>) => string, targetFile: TFile) {
    super(app, nodeToString);
    this.targetFile = targetFile;

    const definerHTML = (headingLevel: number) =>
      `<b style="color: var(--h${headingLevel}-color); font-size: 1em;">${"#".repeat(headingLevel)}</b> `;

    const childCountHTML = (childCount: number) => {
      if (childCount === 0) return '';
      return `<span style="color: var(--text-muted); font-size: var(--font-smaller);"> (${childCount})</span>`;
    };


    this.defaultResultDisplay = (resultEl, node) => {
      resultEl.innerHTML = definerHTML(node.data.level.bySyntax)
                         + node.data.header.text
                         + childCountHTML(node.children.length);
    };

    this.simpleResultDisplay = (resultEl, object) => {
      resultEl.innerHTML = definerHTML(object.item.data.level.bySyntax)
                         + simpleHighlight(object.item.data.header.text, object.match)
                         + childCountHTML(object.item.children.length);
    };

    this.fuzzyResultDisplay = (resultEl, object) => {
      resultEl.innerHTML = definerHTML(object.item.data.level.bySyntax)
                         + fuzzyHighlight(object.item.data.header.text, object.fuzzyResult.matches)
                         + childCountHTML(object.item.children.length);
    };

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

}



export class MoveToHeadingSuggest extends ViewAbstractSuggest<FlatHeading> {

  constructor(app: App) {
    super(app, "move-to-heading-suggest", { fuzzy: true });
    this.itemToString = (item) => item.text;

    const definerHTML = (headingLevel: number) =>
      `<b style="color: var(--h${headingLevel}-color); font-size: 1em;">${"#".repeat(headingLevel)}</b> `;

    const timestampHTML = (timestamp: string) =>
      `<div><span style="color: var(--text-muted); font-size: var(--font-smaller);">${timestamp}</span></div>`;

    this.defaultResultDisplay = (resultEl, item) => {
      resultEl.innerHTML = definerHTML(item.level) + item.text;
    };

    this.simpleResultDisplay = (resultEl, object) => {
      const match = object.match;
      const heading = object.item;
      resultEl.innerHTML = definerHTML(heading.level);

      if (heading.text === heading.title || heading.text === heading.timestamp) {
        resultEl.innerHTML += simpleHighlight(heading.text, match);
      } else {
        const [timeMatch, titleMatch] = this.unambiguateHeaderMatch(match, heading.timestamp!.length);
        resultEl.innerHTML += titleMatch ? simpleHighlight(heading.title, titleMatch) : heading.title;
        resultEl.innerHTML += timeMatch ? timestampHTML(simpleHighlight(heading.timestamp!, timeMatch)) : '';
      }
    };

    this.fuzzyResultDisplay = (resultEl, object) => {
      const matches = object.fuzzyResult.matches;
      const heading = object.item;
      resultEl.innerHTML = definerHTML(heading.level);

      if (heading.text === heading.title || heading.text === heading.timestamp) {
        resultEl.innerHTML += fuzzyHighlight(heading.text, matches);
      } else {
        const [timeMatches, titleMatches] = this.unambiguateHeaderMatches(matches, heading.timestamp!.length);
        resultEl.innerHTML += titleMatches.length > 0 ? fuzzyHighlight(heading.title, titleMatches) : heading.title;
        resultEl.innerHTML += timeMatches.length > 0 ? timestampHTML(fuzzyHighlight(heading.timestamp!, timeMatches)) : '';
      }
    };

  }


  unambiguateHeaderMatch(
    match: [number, number],
    timestampLength: number,
  ) {
    let timeMatch: [number, number] | undefined;
    let titleMatch: [number, number] | undefined;
    const titleOffset = timestampLength + 1;
    let [matchStart, matchEnd] = match;

    if (matchStart < timestampLength) {
      if (matchEnd < titleOffset) // Clean time match.
        timeMatch = match;
      else { // Distribute the match between time and title.
        timeMatch = [matchStart, timestampLength];
        titleMatch = [0, matchEnd - titleOffset];
      }
    }
    else if (matchStart > timestampLength) // Clean title match.
      titleMatch = [matchStart - titleOffset, matchEnd - titleOffset];
    else // Skip the space between timestamp and title.
      titleMatch = [matchStart + 1 - titleOffset, matchEnd - titleOffset];

    return [timeMatch, titleMatch];
  }

  unambiguateHeaderMatches(
    matches: [number, number][],
    timestampLength: number,
  ) {
    let timeMatches: [number, number][] = [];
    let titleMatches: [number, number][] = [];
    const titleOffset = timestampLength + 1;

    for (let i = 0; i < matches.length; i++) {
      let [matchStart, matchEnd] = matches[i];

      if (matchStart < timestampLength) {
        if (matchEnd < titleOffset) // Clean time match.
          timeMatches.push(matches[i]);
        else { // Distribute the match between time and title.
          timeMatches.push([matchStart, timestampLength]);
          titleMatches.push([0, matchEnd - titleOffset]);
        }
      }
      else if (matchStart > timestampLength) // Clean title match.
        titleMatches.push([matchStart - titleOffset, matchEnd - titleOffset]);
      else // Skip the space between timestamp and title.
        titleMatches.push([matchStart + 1 - titleOffset, matchEnd - titleOffset]);
    }

    return [timeMatches, titleMatches];
  }


  getSourceItems(): FlatHeading[] {
    return this.editor ? getHeadingsArray(this.editor.getValue()) : [];
  }


  async enterAction(result: FlatHeading, evt: MouseEvent | KeyboardEvent): Promise<void> {
    if (this.editor) {
      this.editor.setCursor(result.line, 0);

      // const cm = (this.editor as any).cm.cm;
      // const oldCur = cm.getCursor('head');
      // const newCur = { line: result.line, ch: 0 };
      // cm.setCursor(newCur);
      // // console.log(oldCur, newCur);

      // // Add to Jump List (not working)
      // const vim = (window.CodeMirror as any).Vim;
      // const jumpList = vim.getVimGlobalState_().jumpList;
      // const cachedCursor = jumpList.cachedCursor;
      // if (cachedCursor) {
      //   jumpList.add(cm, cachedCursor, oldCur);
      //   delete jumpList.cachedCursor;
      // } else {
      //   jumpList.add(cm, oldCur, oldCur);
      // }

      if (!this.view?.contentEl) return;
      // scrollActiveLineToFraction(this.view!, 0.25);
      customActiveLineScroll(this.view!, {
        viewportThreshold: 1,
        scrollFraction: getSetting("headingSelectionViewportFraction"),
        asymmetric: true,
      });

    }
    await this.close();
  }

  async clickAction(result: FlatHeading, evt: MouseEvent | KeyboardEvent): Promise<void> {
    this.enterAction(result, evt);
  }
}

