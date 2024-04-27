import {
  App,
  MarkdownView,
  Editor,
  TFile,
  WorkspaceLeaf,
} from "obsidian";

import { DataNode } from "dataStructures/generics";

import {
  getSetting,
  customActiveLineScroll,
} from "utils/utilsCore";

import {
  ViewAbstractSuggest,
  DataNodeSuggest,
} from "components/suggest/suggestUtils";

import {
  Heading,
  FlatHeading,
  getHeadingsArray,
  getHeadingsTree,
} from "components/headings/headingUtils";

import {
  setDisplayFunctionsAsFadedTimeHeading,
  setDisplayFunctionAsHeadingDataNode,
} from "components/headings/headingDisplay";



export class HeadingTreeSuggest extends DataNodeSuggest<Heading> {
  targetFile: TFile;

  constructor(app: App, nodeToString: (node: DataNode<Heading>) => string, targetFile: TFile) {
    super(app, nodeToString);
    this.targetFile = targetFile;
    setDisplayFunctionAsHeadingDataNode.bind(this)();
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
    super(app, "move-to-heading-suggest");
    this.itemToString = (item) => item.text;
    setDisplayFunctionsAsFadedTimeHeading.bind(this)();
  }

  getSourceItems(): FlatHeading[] {
    return this.editor ? getHeadingsArray(this.editor.getValue()) : [];
  }

  async clickAction(result: FlatHeading, evt: MouseEvent | KeyboardEvent): Promise<void> {
    this.enterAction(result, evt);
  }

  async enterAction(result: FlatHeading, evt: MouseEvent | KeyboardEvent): Promise<void> {
    if (this.editor) {
      this.editor.setCursor(result.line, 0);

      if (!this.view?.contentEl) return;
      customActiveLineScroll(this.view!, {
        viewportThreshold: 1,
        scrollFraction: getSetting("headingSelectionViewportFraction"),
        asymmetric: true,
      });
    }
    await this.close();
  }

}



// CODE CEMENTERY

// MoveToHeadingSuggest > enterAction :: Failed Attempt to add to Jump List

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