import {
  App,
  MarkdownView,
  TFile,
  Editor,
  fuzzySearch,
} from "obsidian";

import {
  getSetting,
  customActiveLineScroll,
} from "utils";

import {
  ViewAbstractSuggest,
} from "components/sugggestUtils";

import {
  Heading,
  getHeadings,
} from "components/headingsUtils";



export class MoveToHeadingSuggest extends ViewAbstractSuggest<Heading> {
  headings?: Heading[];
  headingRender: (heading: Heading, resultEl: HTMLElement) => void | HTMLElement;

  constructor(app: App) {
    super(app, "move-to-heading-suggest", { fuzzy: true });
    this.setHeadingRenderFunction();
    this.view = this.app.workspace.getActiveViewOfType(MarkdownView) ?? undefined;
    this.file = this.view?.file ?? undefined;
    this.editor = this.view?.editor ?? undefined;
  }

  // NOTES:
  // - If this function returned a value, then the modal opening could be canceled.
  async onOpen(): Promise<void> {
    if (!this.editor) return;
    this.headings = getHeadings(this.editor.getValue());
  }

  setHeadingRenderFunction(): void {

    function fuzzyHighlight(text: string, matches: Array<[number, number]>): string {
      // Sort in descending order to replace string sections from right to left at
      // the appropriate indices.
      // We also assume that the matches do not overlap.
      matches
        .sort((a, b) => b[0] - a[0])
        .forEach((match) => {
          const leadStr = text.slice(0, match[0]);
          const matchStr = text.slice(match[0], match[1]);
          const tailStr = text.slice(match[1]);
          text = `${leadStr}<b style="color: var(--text-accent);">${matchStr}</b>${tailStr}`;
          // console.log(text);

        });
      return text;
    }

    function fuzzyRender(heading: Heading, resultEl: HTMLElement): void {
      const fuzzyResult = fuzzySearch(this.preparedQuery!, heading.text)!;
      if (!fuzzyResult) return;
      let {matches} = fuzzyResult;

      const levelStr = "#".repeat(heading.level);
      const levelStyle = `style="color: var(--h${heading.level}-color); font-size: 1em;"`;

      if (heading.text === heading.title || heading.text === heading.timestamp) {
        resultEl.innerHTML = `<b ${levelStyle}>${levelStr}</b> ${fuzzyHighlight(heading.text, matches)}`;
        // resultEl.innerHTML = fuzzyHighlight(heading.text, matches);
      }

      else {
        let timeMatches: Array<[number, number]> = matches;
        let titleMatches: Array<[number, number]> = [];

        for (let i = 0; i < matches.length; i++) {

          if (matches[i][0] >= heading.timestamp!.length) {
            timeMatches = matches.slice(0, i);
            if (matches[i][0] > heading.timestamp!.length)
              titleMatches.push(
                [matches[i][0] - heading.timestamp!.length - 1, matches[i][1] - heading.timestamp!.length - 1]
              );
            titleMatches = titleMatches.concat(
              matches.slice(i + 1).map(
                (match) => [match[0] - heading.timestamp!.length - 1, match[1] - heading.timestamp!.length - 1]
              )
            );
            break;
          }

          if (matches[i][1] > heading.timestamp!.length + 1) {
            timeMatches = matches.slice(0, i);
            if (matches[i][0] < heading.timestamp!.length)
              timeMatches.push([matches[i][0], heading.timestamp!.length]);
            titleMatches.push([0, matches[i][1] - heading.timestamp!.length - 1]);
            titleMatches = titleMatches.concat(
              matches.slice(i + 1).map(
                (match) => [match[0] - heading.timestamp!.length - 1, match[1] - heading.timestamp!.length - 1]
              )
            );
            break;
          }
        }

        resultEl.innerHTML = `<b ${levelStyle}>${levelStr}</b> ${fuzzyHighlight(heading.title, titleMatches)}`;
        // resultEl.innerHTML = fuzzyHighlight(heading.title, titleMatches);

        const timeStyle = `style="color: var(--text-muted); font-size: var(--font-smaller);"`;
        resultEl.innerHTML += `<div><span ${timeStyle}>${fuzzyHighlight(heading.timestamp!, timeMatches)}</span></div>`;
      }

    }

    // TODO: Rewrite for similar functionality as fuzzyRender.
    function simpleRender(heading: Heading, resultEl: HTMLElement): void {
      let text = heading.text;
      const matchIdx = text.toLocaleLowerCase().indexOf(this.query.toLocaleLowerCase());
      const match = [matchIdx, matchIdx + this.query.length];

      const leadStr = text.slice(0, match[0]);
      const matchStr = text.slice(match[0], match[1]);
      const tailStr = text.slice(match[1]);

      resultEl.innerHTML = `${leadStr}<b style="color: var(--text-accent);">${matchStr}</b>${tailStr}`;
    }

    if (this.fuzzy) {
      this.headingRender = fuzzyRender;
    } else {
      this.headingRender = simpleRender;
    }
  }


  getQueriedResults(query?: string): Heading[] {
    if (!this.editor) return [];
    const results = this.resultsFilter(this.headings!, (heading) => heading.text, query);
    return results;
  }

  renderResultItem(result: Heading): HTMLElement {
    const resultEl = createEl("div");
    this.headingRender(result, resultEl);
    return resultEl;
  }

  async enterAction(result: Heading, evt: MouseEvent | KeyboardEvent): Promise<void> {
    if (this.editor) {
      this.editor.setCursor(result.line, 0);
      // this.editor.refresh();
      const viewEl = this.view?.contentEl as HTMLElement;
      if (!viewEl) return;

      // scrollActiveLineToFraction(this.view!, 0.25);
      customActiveLineScroll(this.view!, {
        viewportThreshold: 1,
        scrollFraction: getSetting("headingSelectionViewportFraction"),
        asymmetric: true,
      });

    }
    await this.close();
  }

  async clickAction(result: Heading, evt: MouseEvent | KeyboardEvent): Promise<void> {
    this.enterAction(result, evt);
  }
}






////////////////////////////////////////////////////////////////////////////////
// Move Heading Section Suggest
////////////////////////////////////////////////////////////////////////////////

export class MoveHeadingSectionSuggest extends ViewAbstractSuggest<Heading> {
  targetFile: TFile;
  headings?: Heading[];
  headingRender: (heading: Heading, resultEl: HTMLElement) => void | HTMLElement;

  constructor(app: App) {
    super(app, "move-heading-section-suggest", {fuzzy: true});
    this.setHeadingRenderFunction();
  }

  async onOpen(): Promise<void> {
    if (!this.editor) return;
    this.headings = getHeadings(this.editor.getValue());
  }

  setHeadingRenderFunction(): void {

    function fuzzyHighlight(text: string, matches: Array<[number, number]>): string {
      // Sort in descending order to replace string sections from right to left at
      // the appropriate indices.
      // We also assume that the matches do not overlap.
      matches
        .sort((a, b) => b[0] - a[0])
        .forEach((match) => {
          const leadStr = text.slice(0, match[0]);
          const matchStr = text.slice(match[0], match[1]);
          const tailStr = text.slice(match[1]);
          text = `${leadStr}<b style="color: var(--text-accent);">${matchStr}</b>${tailStr}`;
          // console.log(text);

        });
      return text;
    }

    function fuzzyRender(heading: Heading, resultEl: HTMLElement): void {
      const fuzzyResult = fuzzySearch(this.preparedQuery!, heading.text)!;
      if (!fuzzyResult) return;
      let {matches} = fuzzyResult;

      const levelStr = "#".repeat(heading.level);
      const levelStyle = `style="color: var(--h${heading.level}-color); font-size: 1em;"`;

      if (heading.text === heading.title || heading.text === heading.timestamp) {
        resultEl.innerHTML = `<b ${levelStyle}>${levelStr}</b> ${fuzzyHighlight(heading.text, matches)}`;
        // resultEl.innerHTML = fuzzyHighlight(heading.text, matches);
      }

      else {
        let timeMatches: Array<[number, number]> = matches;
        let titleMatches: Array<[number, number]> = [];

        for (let i = 0; i < matches.length; i++) {

          if (matches[i][0] >= heading.timestamp!.length) {
            timeMatches = matches.slice(0, i);
            if (matches[i][0] > heading.timestamp!.length)
              titleMatches.push(
                [matches[i][0] - heading.timestamp!.length - 1, matches[i][1] - heading.timestamp!.length - 1]
              );
            titleMatches = titleMatches.concat(
              matches.slice(i + 1).map(
                (match) => [match[0] - heading.timestamp!.length - 1, match[1] - heading.timestamp!.length - 1]
              )
            );
            break;
          }

          if (matches[i][1] > heading.timestamp!.length + 1) {
            timeMatches = matches.slice(0, i);
            if (matches[i][0] < heading.timestamp!.length)
              timeMatches.push([matches[i][0], heading.timestamp!.length]);
            titleMatches.push([0, matches[i][1] - heading.timestamp!.length - 1]);
            titleMatches = titleMatches.concat(
              matches.slice(i + 1).map(
                (match) => [match[0] - heading.timestamp!.length - 1, match[1] - heading.timestamp!.length - 1]
              )
            );
            break;
          }
        }

        resultEl.innerHTML = `<b ${levelStyle}>${levelStr}</b> ${fuzzyHighlight(heading.title, titleMatches)}`;
        // resultEl.innerHTML = fuzzyHighlight(heading.title, titleMatches);

        const timeStyle = `style="color: var(--text-muted); font-size: var(--font-smaller);"`;
        resultEl.innerHTML += `<div><span ${timeStyle}>${fuzzyHighlight(heading.timestamp!, timeMatches)}</span></div>`;
      }

    }

    // TODO: Rewrite for similar functionality as fuzzyRender.
    function simpleRender(heading: Heading, resultEl: HTMLElement): void {
      let text = heading.text;
      const matchIdx = text.toLocaleLowerCase().indexOf(this.query.toLocaleLowerCase());
      const match = [matchIdx, matchIdx + this.query.length];

      const leadStr = text.slice(0, match[0]);
      const matchStr = text.slice(match[0], match[1]);
      const tailStr = text.slice(match[1]);

      resultEl.innerHTML = `${leadStr}<b style="color: var(--text-accent);">${matchStr}</b>${tailStr}`;
    }

    if (this.fuzzy) {
      this.headingRender = fuzzyRender;
    } else {
      this.headingRender = simpleRender;
    }
  }


  getQueriedResults(query?: string): Heading[] {
    if (!this.editor) return [];
    const results = this.resultsFilter(this.headings!, (heading) => heading.text, query);
    return results;
  }

  renderResultItem(result: Heading): HTMLElement {
    const resultEl = createEl("div");
    this.headingRender(result, resultEl);
    return resultEl;
  }

  async enterAction(result: Heading, evt: MouseEvent | KeyboardEvent): Promise<void> {
    if (this.editor) {
      this.editor.setCursor(result.line, 0);
      // this.editor.refresh();
      const viewEl = this.view?.contentEl as HTMLElement;
      if (!viewEl) return;

      // scrollActiveLineToFraction(this.view!, 0.25);
      customActiveLineScroll(this.view!, {
        viewportThreshold: 1,
        scrollFraction: getSetting("headingSelectionViewportFraction"),
        asymmetric: true,
      });

    }
    await this.close();
  }

  async clickAction(result: Heading, evt: MouseEvent | KeyboardEvent): Promise<void> {
    this.enterAction(result, evt);
  }

}
