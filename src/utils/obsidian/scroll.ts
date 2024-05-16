import { FileView, Editor, EditorRange } from "obsidian";

import { PLUGIN_ID } from "utils/data";



export function handleCursorMovement(
  editor: Editor,
  line: number | undefined,
): void {
  if (line === undefined) return;

  if (!editor.somethingSelected()) {
    editor.setCursor({line, ch: 0});
    return;
  }

  let selection: EditorRange = {
    from: editor.getCursor("anchor"),
    to: {line, ch: 0},
  };

  if (this.app.vault.getConfig("vimMode")) {
    if (line >= selection.from.line) {
      selection.to.ch = 1;
    }
  }

  editor.transaction({selection});
}



////////////////////////////////////////
// SCROLLING FUNCTIONS
////////////////////////////////////////

export async function scrollToCursor(editor: Editor, offset: number = 0): Promise<void> {
  const cursorPos = editor.getCursor();
  await sleep(0); // This ensures that the scroll works properly.
  editor.scrollIntoView({
    from: {line: cursorPos.line - offset, ch: 0},
    to: {line: cursorPos.line + offset, ch: 0}
  }, false);
}


export type ScrollOptions = {
  viewportThreshold: number,
  scrollFraction?: number,
  scrollOffsetLines?: number,
  // top?: boolean,
  asymmetric?: boolean,
  // timeout?: number,
};

export function customActiveLineScroll(view: FileView, options: ScrollOptions): void {
  // console.debug("---");
  let {lineEl, outOfBounds, top} = getLineViewportData(view, options.viewportThreshold);
  if (!outOfBounds) return;

  try {
    getScrollFunction(view, options)(lineEl, top);
  } catch (error) {
    console.log(`${PLUGIN_ID} - Scroll Error:`, error.message);
  }
}


function getScrollFunction(view: FileView, options: ScrollOptions): (lineEl: HTMLElement, top: boolean) => void {

  if (options.scrollOffsetLines !== undefined) return (lineEl: HTMLElement, top: boolean) => {
    scrollIntoViewWithOffset(lineEl, options.scrollOffsetLines!, top);
    setTimeout(() => {
      const lineEl = view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
      if (!lineEl) {
        console.log(`${PLUGIN_ID} - No active line HTMLElement found after scroll. Please report this issue.`);
        return;
      }
      const limitEl = getOffsetLimitElement(lineEl, options.scrollOffsetLines!, top);
      const {outOfBounds} = getLineViewportData(view, 0, limitEl);
      if (outOfBounds) {
        console.debug(`${PLUGIN_ID} - Additional scroll triggered after offset lines scroll.`);
        // printActiveLineInfo(view, "Before Offset Lines Scroll", lineEl);
        scrollIntoViewWithOffset(lineEl, options.scrollOffsetLines!, top);
        // printActiveLineInfo(view, "After Offset Lines Scroll", lineEl);
      }
    });
  };

  else return (lineEl: HTMLElement, top: boolean) => {
    const scrollerEl = view.contentEl.querySelector(".cm-scroller") as HTMLElement;
    if (!scrollerEl) {
      console.log(`${PLUGIN_ID} - No scroller HTMLElement found. Please report this issue.`);
      return;
    }
    let scrollFraction = options.scrollFraction ?? options.viewportThreshold;
    // options.scrollFraction ??= options.viewportThreshold;
    if (options.asymmetric) top = true;
    else if (!top) scrollFraction = 1 - scrollFraction;
    scrollToFraction(lineEl, scrollerEl, scrollFraction, top);
    setTimeout(() => {
      const {lineEl, outOfBounds} = getLineViewportData(view, scrollFraction <= 0.5 ? scrollFraction : 1 - scrollFraction);
      if (outOfBounds) {
        console.debug(`${PLUGIN_ID} - Additional scroll triggered after fraction scroll.`);
        // printActiveLineInfo(view, "Before Fraction Scroll", lineEl);
        scrollToFraction(lineEl, scrollerEl, options.scrollFraction!, top);
        // printActiveLineInfo(view, "After Fraction Scroll", lineEl);
      }
    });
  };

}


function getLineViewportData(view: FileView, vieportFraction: number, lineEl?: HTMLElement): {
  lineEl: HTMLElement, outOfBounds: boolean, top: boolean,
} {
  lineEl ??= view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
  if (!lineEl) {
    console.log("No active line HTMLElement found. Please report this issue.");
    return {lineEl, outOfBounds: false, top: false};
  }
  const viewRect = view.contentEl.getBoundingClientRect()!;
  const upperBound = viewRect.top + (viewRect.height * vieportFraction);
  const lowerBound = viewRect.bottom - (viewRect.height * vieportFraction);
  const elemRect = lineEl.getBoundingClientRect();
  // console.log("Upper Bound:", upperBound, "Lower Bound:", lowerBound);

  if (elemRect.bottom < upperBound) return {lineEl, outOfBounds: true, top: true};
  if (elemRect.top > lowerBound) return {lineEl, outOfBounds: true, top: false};
  return {lineEl, outOfBounds: false, top: false};
}


export function printActiveLineInfo(view: FileView, label: string = "Active Line", lineEl?: HTMLElement): void {
  lineEl = lineEl ?? view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
  const lineRect = lineEl.getBoundingClientRect();
  console.debug(`${label} => Top:`, lineRect.top, "Bottom:", lineRect.bottom);
}


// function activeLineScroll(view: FileView, options: ScrollOptions): void {
//   const lineEl = view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
//   if (!lineEl) {
//     console.log("No active line HTMLElement found. Please report this issue.");
//     return;
//   }
//   let {inBounds, top} = elemInViewportFraction(lineEl, view, options.viewportThreshold);
//   if (!inBounds) return;

//   if (options.scrollOffsetLines === undefined) {
//     const scrollerEl = view.contentEl.querySelector(".cm-scroller") as HTMLElement;
//     if (!scrollerEl) {
//       console.log("No scroller HTMLElement found. Please report this issue.");
//       return;
//     }
//     let scrollFraction = (options.scrollFraction ?? options.viewportThreshold);
//     if (options.asymmetric) top = true;
//     else if (!top) scrollFraction = 1 - scrollFraction;
//     scrollToFraction(lineEl, scrollerEl, scrollFraction, top);

//   } else {
//     scrollIntoViewWithOffset(lineEl, options.scrollOffsetLines, top);
//   }
// }


function scrollToFraction(elem: HTMLElement, scrollableEl: HTMLElement, fraction: number, top: boolean): void {
  if (scrollableEl.scrollHeight <= scrollableEl.clientHeight) {
    console.log("Element is not scrollable:", scrollableEl);
    console.log("Scroll_Height:", scrollableEl.scrollHeight);
    console.log("Client_Height:", scrollableEl.clientHeight);
    return;
  }
  const elemRect = elem.getBoundingClientRect();
  const scrollRect = scrollableEl.getBoundingClientRect();
  const targetY = scrollRect.top + scrollRect.height * fraction;
  const scrollY = (elemRect.top + elemRect.bottom) / 2 - targetY;
  scrollableEl.scrollBy(0, scrollY);
}


// TO-CONTINUE: use the options object as argument instead of the individual parameters
function scrollIntoViewWithOffset(elem: HTMLElement, offset: number, top: boolean): void {
  // const nextSibling = top ? (el: HTMLElement) => el.previousElementSibling : (el: HTMLElement) => el.nextElementSibling;
  // let limitEl = elem;
  // for (let i = 0; i < offset; i++) {
  //   const nextEl = nextSibling(limitEl) as HTMLElement;
  //   if (nextEl === null) break;
  //   limitEl = nextEl;
  // }
  getOffsetLimitElement(elem, offset, top).scrollIntoView({
    block: top ? "start" : "end",
    inline: "nearest",
    behavior: "auto"
  });
}


function getOffsetLimitElement(elem: HTMLElement, offset: number, top: boolean): HTMLElement {
  const nextSibling = top ? (el: HTMLElement) => el.previousElementSibling : (el: HTMLElement) => el.nextElementSibling;
  let limitEl = elem;
  for (let i = 0; i < offset; i++) {
    const nextEl = nextSibling(limitEl) as HTMLElement;
    if (nextEl === null) break;
    limitEl = nextEl;
  }
  return limitEl;
}


function elemInViewportFraction(elem: HTMLElement, view: FileView, fraction: number): {inBounds: boolean, top: boolean} {
  const viewRect = view.contentEl.getBoundingClientRect()!;
  const upperBound = viewRect.top + (viewRect.height * fraction);
  const lowerBound = viewRect.bottom - (viewRect.height * fraction);
  const elemRect = elem.getBoundingClientRect();
  console.log("Upper Bound:", upperBound, "Lower Bound:", lowerBound);

  if (elemRect.bottom < upperBound) return {inBounds: true, top: true};
  if (elemRect.top > lowerBound) return {inBounds: true, top: false};
  return {inBounds: false, top: false};
}


// export async function scrollActiveLineIntoView(view: FileView, offset: number, top: boolean = true): Promise<void> {
//   await sleep(0);
//   const lineEl = view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
//   scrollIntoViewWithOffset(lineEl, offset, top);
// }


// export async function scrollActiveLineToFraction(view: FileView, fraction: number, top: boolean = true): Promise<void> {
//   await sleep(0);
//   const lineEl = view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
//   const scrollerEl = view.contentEl.querySelector(".cm-scroller") as HTMLElement;
//   scrollToFraction(lineEl, scrollerEl, fraction, top);
// }


// Useful DevTools Snippets for Debugging
// var viewRect = this.app.workspace.getActiveFileView().contentEl.getBoundingClientRect()
// var lineRect = this.app.workspace.getActiveFileView().contentEl.querySelector(".cm-content .cm-line.cm-active").getBoundingClientRect()

