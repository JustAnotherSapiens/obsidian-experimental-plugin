import { App } from "obsidian";

import registerKeybindings from "utils/obsidian/keybindings";
import DataNode from "dataStructures/dataNode";

import BaseAbstractSuggest from "suggests/baseAbstractSuggest";



/**
 * An abstract suggest class that builds a data tree and allows the user to navigate it.
 * @abstract
 * @extends BaseAbstractSuggest<DataNode<T>>
 */
export default abstract class DataNodeSuggest<T> extends BaseAbstractSuggest<DataNode<T>> {

  /**
   * Ideally, the data tree should be built upon nodes with multiple children.
   * @returns The root node of the data tree.
   * @abstract
   */
  abstract buildDataTree(): Promise<DataNode<T>>;

  protected referenceNode: DataNode<T>;
  private selectionIndexStack: number[] = [];
  private selectionQueryStack: string[] = [];

  constructor(app: App, nodeToString: (node: DataNode<T>) => string) {
    super(app, "data-node-suggest", {fuzzy: true});
    this.itemToString = nodeToString;
  }

  async onOpen(): Promise<void> {
    registerKeybindings(this.scope, [
      [["Alt"],  "l", async () => await this.stepInto(this.renderedResults[this.selectionIndex])],
      [["Alt"],  "h", async () => await this.stepOut()],
    ]);
    this.referenceNode = await this.buildDataTree();
  }

  async stepInto(result: DataNode<T>): Promise<boolean> {
    if (result.children.length === 0) return false;
    this.referenceNode = result;
    this.selectionIndexStack.push(this.selectionIndex);
    this.selectionQueryStack.push(this.query);
    await this.updateInputAndResults("");
    return true;
  }

  async stepOut(): Promise<boolean> {
    if (!this.referenceNode.parent) return false;
    this.referenceNode = this.referenceNode.parent;
    await this.updateInputAndResults(
      this.selectionQueryStack.pop()!,
      this.selectionIndexStack.pop()!
    );
    return true;
  }

  getSourceItems(): DataNode<T>[] {
    return this.referenceNode.children;
  }

  enterAction(result: DataNode<T>, event: MouseEvent | KeyboardEvent): void | Promise<void> {
    this.stepInto(result);
  }

  clickAction(result: DataNode<T>, event: MouseEvent | KeyboardEvent): void | Promise<void> {
    throw new Error("Method not implemented.");
  }

}

