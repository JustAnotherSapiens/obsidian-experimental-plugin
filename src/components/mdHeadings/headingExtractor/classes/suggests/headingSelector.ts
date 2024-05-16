import { App } from "obsidian";

import HeadingTreeSuggest, { HeadingTreeArgs } from "./headingTree";
import { HeadingNode } from "../../utils/dataStructures";



export default class HeadingSelectorSuggest extends HeadingTreeSuggest {

    private selectedNode: HeadingNode;

    constructor(app: App, args: HeadingTreeArgs) {
      super(app, args);
    }

    async waitForSelection(): Promise<HeadingNode | undefined> {
      await this.open();
      return new Promise((resolve) => {
        this.onClose = () => resolve(this.selectedNode ?? undefined);
      });
    }

    enterAction(result: HeadingNode, event: MouseEvent | KeyboardEvent): void | Promise<void> {
      this.selectedNode = result;
      this.close();
    }

    clickAction(result: HeadingNode, event: MouseEvent | KeyboardEvent): void | Promise<void> {
      this.enterAction(result, event);
    }

}

