import {
  App,
  Vault,
  MarkdownView,
  TFile,
  Editor,
} from "obsidian";

import BaseAbstractSuggest from "suggests/baseAbstractSuggest";



/**
 * A BaseAbstractSuggest class that is tied to the active MarkdownView.
 *
 * Ease-of-access attributes:
 * - `vault`: The active Vault.
 * - `view`: The active MarkdownView.
 * - `file`: The active TFile.
 * - `editor`: The active Editor.
 *
 * @extends BaseAbstractSuggest<T>
 */
export default abstract class ViewAbstractSuggest<T> extends BaseAbstractSuggest<T> {
  protected vault: Vault;
  protected view?: MarkdownView;
  protected file?: TFile;
  protected editor?: Editor;

  constructor(app: App, modalId: string, options?: {fuzzy?: boolean}) {
    super(app, modalId, options);
    this.vault = this.app.vault;
    this.view = this.app.workspace.getActiveViewOfType(MarkdownView) ?? undefined;
    this.file = this.view?.file ?? undefined;
    this.editor = this.view?.editor ?? undefined;
  }
}

