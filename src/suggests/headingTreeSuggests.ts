import {
  App,
  WorkspaceLeaf,
  MarkdownView,
  TFile,
} from "obsidian";

import { DataNode } from "utils/dataStructures/generics";

import DataNodeSuggest from "suggests/dataNodeSugggest";

import {
  Heading,
  getHeadingsTree,
} from "utils/headings/headingUtils";

import {
  setDisplayFunctionAsHeadingDataNode,
} from "utils/headings/headingDisplay";



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

