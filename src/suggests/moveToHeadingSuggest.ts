import {
  App,
} from "obsidian";

import {
  getSetting,
  customActiveLineScroll,
} from "utils/utilsCore";

import ViewAbstractSuggest from "suggests/viewAbstractSuggest";

import {
  FlatHeading,
  getHeadingsArray,
} from "utils/headings/headingUtils";

import {
  setDisplayFunctionsAsFadedTimeHeading,
} from "utils/headings/headingDisplay";




export default class MoveToHeadingSuggest extends ViewAbstractSuggest<FlatHeading> {

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