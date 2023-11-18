import {
  App, Notice,
  Editor, MarkdownView,
  ISuggestOwner, Modal,
  SuggestModal, FuzzySuggestModal,
  FuzzyMatch,
 } from "obsidian";


 const sampleItems: Array<string> = [
    "one",
    "two",
    "three",
 ];


 export class ExperimentalModal extends Modal {

    constructor(app: App) {
      super(app);
    }

    onOpen() {
      let {contentEl} = this;
      contentEl.setText("Hello world!");
    }

    onClose() {
      let {contentEl} = this;
      contentEl.empty();
    }
 }


 export class ExperimentalSuggestModal extends FuzzySuggestModal<string> {

  getItems(): string[] {
    return sampleItems;
  }

  getItemText(item: string): string {
    return item.toUpperCase();
  }

  onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
    this.close();
    new Notice(`You selected ${item}.`);
    console.log(`You selected ${item}.`, evt);
  }

  // renderSuggestion(item: FuzzyMatch<string>, el: HTMLElement): void {
  //   el.setText(item.item);
  // }

  // selectSuggestion(value: FuzzyMatch<string>, evt: MouseEvent | KeyboardEvent): void {
  //   this.close();
  // }

  // onChooseSuggestion(item: FuzzyMatch<string>, evt: MouseEvent | KeyboardEvent): void {
  //   this.close();
  // }

 }

