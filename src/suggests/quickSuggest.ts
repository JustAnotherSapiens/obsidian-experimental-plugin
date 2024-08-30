import { App } from "obsidian";

import BaseAbstractSuggest from "suggests/baseAbstractSuggest";



/**
 * A simple Suggest class to be used internally for the 'runQuickSuggest' function.
 */
export default class QuickSuggest<T> extends BaseAbstractSuggest<T> {
  private selectedItem?: T;

  constructor(app: App, items: T[], itemToString: (item: T) => string, placeholder?: string) {
    super(app, "quick-suggest");
    this.sourceItems = items;
    this.itemToString = itemToString;
    if (placeholder) this.placeholder = placeholder;
  }

  async waitForSelection(): Promise<T | null> {
    await this.open();
    if (this.selectedItem){
      return new Promise((resolve) => resolve(this.selectedItem!));
      // Since the 'async' keyword implies that the function will return
      // a Promise, the above line can be simplified to:
      // return this.selectedItem!;
    }
    // 'resolve' is a function that must be called to fulfill the promise, i.e.
    // the Promise will remain pending until 'resolve' is called.
    // Calling 'resolve' on the 'this.onClose' function will ensure that the
    // promise is fulfilled when the modal is closed.
    return new Promise((resolve) => {
      this.onClose = () => resolve(this.selectedItem ?? null);
    });
  }

  getSourceItems(): T[] {
    return this.sourceItems;
  }

  enterAction(result: T, evt: MouseEvent | KeyboardEvent): void {
    this.selectedItem = result;
    this.close();
  }

  clickAction(result: T, evt: MouseEvent | KeyboardEvent): void {
    this.enterAction(result, evt);
  }

}


/**
 * Quickly select an item from a list.
 * @returns the selected item.
 */
export async function runQuickSuggest<T>(
  app: App,
  items: T[],
  itemToText: (item: T) => string,
  placeholder?: string
): Promise<T | null> {
  const quickSuggest = new QuickSuggest(app, items, itemToText, placeholder);
  return await quickSuggest.waitForSelection();
}
