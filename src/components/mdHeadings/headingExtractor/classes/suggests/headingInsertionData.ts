import { App, TFile } from 'obsidian';

import { breadcrumbsHTML } from 'utils/display';

import registerKeybindings from 'utils/obsidian/keybindings';
import IconButton from 'utils/obsidian/classes/iconButton';

import BaseAbstractSuggest from 'suggests/baseAbstractSuggest';

import HeadingTreeSuggest, { HeadingTreeArgs } from './headingTree';
import { MarkdownLevel, HeadingNode } from '../../utils/dataStructures';




type HeadingInsertionArgs = HeadingTreeArgs & {
  sourceNode: HeadingNode;
  skewUpwards?: boolean;
  includeSiblingHeadings?: boolean;
};




/**
 * Add a banner to the `BaseAbstractSuggest` prompt indicating the target file.
 */
// TODO: Change the CSS class names to match the new naming convention.
function addFileBanner<T>(suggest: BaseAbstractSuggest<T>, file?: TFile) {
  if (!file) return;
  const bannerEl = createDiv('target-file-container');

  createDiv({ cls: 'target-file-display', parent: bannerEl }, (el) => {
    el.innerHTML = breadcrumbsHTML(file!.path.slice(0, -3));
  });

  suggest.promptEl.insertBefore(bannerEl, suggest.inputEl.parentElement!);
  // suggest.promptEl.insertBefore(bannerEl, suggest.resultsEl);
}


type InsertionData = {
  referenceNode: HeadingNode;
  upwards: boolean;
};


export class HeadingInsertionDataSuggest extends HeadingTreeSuggest {
  private insertionData: InsertionData;

  private mdLevel: MarkdownLevel;
  private skewUpwards: boolean;
  private sourceNode: HeadingNode;

  private resultsFilter: (node: HeadingNode) => boolean;


  constructor(app: App, args: HeadingInsertionArgs) {
    super(app, args);
    this.skewUpwards = args.skewUpwards ?? false;
    this.sourceNode = args.sourceNode;
    this.mdLevel = this.sourceNode.heading.level.bySyntax;

    // Add icon button to toggle inclusion of sibling headings.
    this.flags.includeSiblingHeadings = args.includeSiblingHeadings ?? false;

    this.iconButtons.set('includeSiblingHeadings', new IconButton({
      parentEl: this.iconContainerEl,
      iconId: 'list-tree',
      tooltip: 'Include Same Level Headings <Alt+I>',
      isActive: this.flags.includeSiblingHeadings,
      clickCallback: () => this.toggleIncludeSiblingHeadings(),
    }));

    this.resolveResultsFilter();

    this.instructions = [
      {command: '<A-j/k>', purpose: 'Navigate'},
      {command: '<A-l>', purpose: 'Step Into'},
      {command: '<A-h>', purpose: 'Step Out'},
      {command: '<Enter>/<Click>', purpose: 'Append, Insert After'},
      {command: '<S-Enter>/<R_Click>', purpose: 'Prepend, Insert Before'},
      {command: '<Esc>', purpose: 'Close'},
      {command: '<A-u>', purpose: 'Clear Input'},
      {command: '<A-d>', purpose: 'Toggle Expand'},
      {command: '<A-i>', purpose: 'Toggle Include Siblings'},
      {command: '<A-f>', purpose: 'Toggle Fuzzy Search'},
      {command: '<A-.>', purpose: 'Toggle Instructions'},
    ];
  }


  private toggleIncludeSiblingHeadings() {
    this.toggleIconButton('includeSiblingHeadings', () => {
      this.resolveResultsFilter();
    });
  }


  private resolveResultsFilter() {
    if (this.flags.includeSiblingHeadings) {
      this.resultsFilter = (node: HeadingNode) => node.heading.level.bySyntax <= this.mdLevel;
    } else {
      this.resultsFilter = (node: HeadingNode) => node.heading.level.bySyntax < this.mdLevel;
    }
  }


  getSourceItems(): HeadingNode[] {
    return super.getSourceItems(this.referenceNode, this.resultsFilter);
  }


  async stepInto(node: HeadingNode): Promise<boolean> {
    if (!this.areEnoughResults(node)) return false;
    return await super.stepInto(node);
  }


  private areEnoughResults(node: HeadingNode): boolean {
    return super.getSourceItems(node, this.resultsFilter).length > 0;
  }


  async waitForSelection(): Promise<InsertionData | undefined> {
    await this.open();
    return new Promise((resolve) => {
      this.onClose = () => resolve(this.insertionData ?? undefined);
    });
  }


  async onOpen(): Promise<void> {
    await super.onOpen();
    addFileBanner(this, this.file);

    this.addRightClickAndShiftEnterActions();
    registerKeybindings(this.scope, [
      [['Alt'], 'i', () => this.toggleIncludeSiblingHeadings()],
    ]);

  }


  private addRightClickAndShiftEnterActions() {
    // Right Click Action
    this.resultsEl.on('contextmenu', '.suggestion-item', (event, element) => {
      this.setSelectedResultEl(this.resultsEl.indexOf(element));
      this.resolveInsertionDataAndClose(this.renderedResults[this.selectionIndex], !this.skewUpwards);
    }, {capture: true});

    // Shift + Enter Action
    registerKeybindings(this.scope, [
      [['Shift'], 'Enter', () => {
        if (this.renderedResults.length === 0) return;
        this.resolveInsertionDataAndClose(this.renderedResults[this.selectionIndex], !this.skewUpwards);
      }],
    ]);
  }


  clickAction(result: HeadingNode, event: MouseEvent | KeyboardEvent): void | Promise<void> {
    this.enterAction(result, event);
  }


  enterAction(result: HeadingNode, event: MouseEvent | KeyboardEvent): void | Promise<void> {
    this.resolveInsertionDataAndClose(result, this.skewUpwards);
  }


  private resolveInsertionDataAndClose(referenceNode: HeadingNode, upwards: boolean) {
    this.insertionData = { referenceNode, upwards };
    this.close();
  }


}
