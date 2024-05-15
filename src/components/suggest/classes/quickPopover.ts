import {
  App,
  MarkdownView,
} from "obsidian";

import {
  wrapAround,
} from "utils/utilsCore";



export async function runQuickPopoverSuggest<T>(
  app: App, items: T[], stringifier: (item: T) => string,
): Promise<T | null> {
  const suggest = new QuickPopoverSuggest(app, items, stringifier);
  return await suggest.waitForSelection();
}


export default class QuickPopoverSuggest<T> {
  app: App;
  items: T[];
  stringifier: (item: T) => string;

  selectedItem: T | null = null;
  resultsEl: HTMLElement;
  selectionIndex: number;

  close: () => void;
  withinLimitsListener: (event: MouseEvent) => void;


  constructor(app: App, items: T[], stringifier: (item: T) => string) {
    this.app = app;
    this.items = items;
    this.stringifier = stringifier;
  }


  waitForSelection(): Promise<T | null> {
    this.open();
    return new Promise((resolve) => {
      this.close = () => {
        this.resultsEl.remove();
        this.app.workspace.getActiveViewOfType(MarkdownView)?.editor.focus();
        document.body.removeEventListener("click", this.withinLimitsListener, {capture: true});
        resolve(this.selectedItem);
      }
    });
  }


  open(): void {
    const resultsEl = createEl("div", {
      attr: {
        id: "quick-popover-suggest",
        style: "overflow-y: auto;"
      }
    });

    this.items.forEach((item: T) => {
      const itemEl = createEl("div", {
        cls: "suggestion-item",
        text: this.stringifier(item),
      });

      itemEl.onclick = (evt: MouseEvent) => {
        this.selectedItem = item;
        this.close();
      };

      resultsEl.appendChild(itemEl);
    });

    resultsEl.children[0].addClass("is-selected");

    document.body.appendChild(resultsEl);

    // Query selector for the active line in the editor
    const activeLine = document.querySelector(
      ".workspace-tabs.mod-active .workspace-leaf.mod-active .cm-line.cm-active"
    );
    const lineRect = activeLine?.getBoundingClientRect() as DOMRect;
    const xPos = lineRect.left + lineRect.width / 2;
    const yPos = lineRect.bottom;
    const width = lineRect.width / 3;

    // TODO: Popover positioning with CSS.
    this.resultsEl = document.getElementById("quick-popover-suggest") as HTMLElement;
    this.resultsEl.style.position = "absolute";
    this.resultsEl.style.top = `${yPos}px`;
    this.resultsEl.style.left = `${xPos}px`;
    this.resultsEl.style.width = `${width}px`;


    // On Result Hover
    this.resultsEl.on("mousemove", ".suggestion-item", (event, element) => {
      const hoveredIndex = this.resultsEl.indexOf(element);
      this.setSelectedResultEl(hoveredIndex);
    });

    this.withinLimitsListener = async (event: MouseEvent) => {
      if (!this.resultsEl.contains(event.target as Node)) {
        this.close();
      }
    }

    // Close on click outside of prompt.
    document.body.addEventListener("click", this.withinLimitsListener, {capture: true});
  }


  /**
   * Set the result element at the given index as selected and scroll it
   * into view if necessary.
   */
  setSelectedResultEl(index: number) {
    this.selectionIndex = wrapAround(index, this.items.length);

    const newSelected = this.resultsEl.children[this.selectionIndex] as HTMLElement;
    const prevSelected = this.resultsEl.find(".is-selected");
    if (prevSelected) prevSelected.removeClass("is-selected");
    newSelected.addClass("is-selected");

    if (newSelected.getBoundingClientRect().bottom > this.resultsEl.getBoundingClientRect().bottom) {
      newSelected.scrollIntoView({block: "end", inline: "nearest"});
    } else if (newSelected.getBoundingClientRect().top < this.resultsEl.getBoundingClientRect().top) {
      newSelected.scrollIntoView({block: "start", inline: "nearest"});
    }
  }

}

