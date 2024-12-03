import { FileView, Editor } from "obsidian";


////////////////////////////////////////////////////////////////////////////////
// CORE FUNCTIONS
////////////////////////////////////////////////////////////////////////////////


function roundViewportFraction(fraction: number): number {
  return Math.round(fraction * 1e4) / 1e4;
}


/**
 * Scroll the `scrollableEl` so that the `referenceEl` is at the specified `fraction` of the viewport.
 * @param referenceEl - Reference HTMLElement within the scrollable element
 * @param fraction - Value between 0 and 1
 * @returns 
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
 */
function scrollToViewportFraction(
  scrollableEl: HTMLElement,
  referenceEl: HTMLElement,
  fraction: number,
  adaptiveReferencePoint: boolean = true
): void {

  // Return if the scroll height fits within the client height
  if (scrollableEl.scrollHeight <= scrollableEl.clientHeight) return;

  // Get the DOMRect objects
  const referenceElRect = referenceEl.getBoundingClientRect();
  const scrollableElRect = scrollableEl.getBoundingClientRect();

  // Round the fraction for precision
  fraction = roundViewportFraction(fraction);

  // Get the key Y positions to calculate the scroll
  const targetY = scrollableElRect.top + (fraction * scrollableElRect.height);
  let referenceElY = referenceElRect.top;
  if (adaptiveReferencePoint) {
    // Set the reference point based on the viewport section (top, middle, bottom)
    // WARNING: Float point number comparisons are not entirely reliable.
    switch (true) {
      case fraction < 0.4:
        referenceElY = referenceElRect.top;
        break;
      case fraction > 0.6:
        referenceElY = referenceElRect.bottom;
        break;
      default:
        referenceElY = (referenceElRect.top + referenceElRect.bottom) / 2;
    }
  }

  // Execute the scroll
  const requiredScrollPixels = referenceElY - targetY;
  scrollableEl.scrollBy(0, requiredScrollPixels);
}



function getScrollerEl(view: FileView): HTMLElement | undefined {
  const selector = ".markdown-source-view .cm-editor .cm-scroller";
  const scrollerEl = view.contentEl.querySelector(selector) as HTMLElement;

  if (!scrollerEl) {
    console.error(`${getScrollerEl.name} - No scroller HTMLElement found.`);
    console.debug("View:", view);
    console.debug("Selector:", selector);
    console.debug("ScrollerEl:", scrollerEl);
    return;
  }
  return scrollerEl;
}


function getActiveLineEl(view: FileView): HTMLElement | undefined {
  const selector = ".cm-editor .cm-scroller .cm-content .cm-active.cm-line";
  const lineEl = view.contentEl.querySelector(selector) as HTMLElement;

  if (!lineEl) {
    console.error(`${getActiveLineEl.name} - No active line HTMLElement found.`);
    console.debug("View:", view);
    console.debug("Selector:", selector);
    console.debug("LineEl:", lineEl);
    return;
  }
  return lineEl;
}


/**
 * Get the viewport fraction of an HTMLElement's top within a reference viewport DOMRect.
 */
function getViewportFraction(elem: HTMLElement, viewportRect: DOMRect): number {
  const elemRect = elem.getBoundingClientRect();
  const elemRectRelativeY = elemRect.top - viewportRect.top;
  return elemRectRelativeY / viewportRect.height;
}



/**
 * Compare the target viewport fraction with the current viewport fraction from
 * the active line element. If they differ by at least 0.001, re-scroll.
 * 
 * __NOTE__: Calling this function within a setTimeout() is the best approach.
 * The only drawback is that it will take slightly longer, and it will make
 * the scroll transition visible to the user. _That's price to pay for the
 * reliability of the scroll._
 */
function rescrollActiveLineOnFailure(view: FileView, targetViewportFraction: number): void {
  const scrollerEl = getScrollerEl(view);
  if (!scrollerEl) return;

  const activeLineEl = getActiveLineEl(view);
  if (!activeLineEl) return;

  const resultingViewportFraction = getViewportFraction(activeLineEl, scrollerEl.getBoundingClientRect());

  const viewportFractionDifference = Math.abs(
    roundViewportFraction(resultingViewportFraction - targetViewportFraction)
  );

  // This is the failure criterion: the error in the viewport fraction is greater than 0.001
  // NOTE: It was tricky to get this right. Since comparing floating point numbers
  //       was not reliable (something like `viewportFractionDifference > 0.001`
  //       was yielding false negatives), the workaround was to make the comparison
  //       in the realm of integers.
  if (viewportFractionDifference * 1e4 >= 10) {
    scrollToViewportFraction(scrollerEl, activeLineEl, targetViewportFraction, false);
    console.debug(`SCROLL RE-TRIGGERED (${viewportFractionDifference})`);
  }
}




////////////////////////////////////////////////////////////////////////////////
// RESTORE ACTIVE LINE SCROLL
////////////////////////////////////////////////////////////////////////////////


/**
 * Restore the scroll position for the active line in a FileView.
 * @param view - A FileView object.
 * @param callback - A callback function to execute before restoring the scroll.
 * 
 * @todo Add support for async callbacks.
 */
export function restoreActiveLineScroll(view: FileView, callback: () => void): void {
  const scrollerEl = getScrollerEl(view);
  if (!scrollerEl) return;

  let activeLineEl = getActiveLineEl(view);
  if (!activeLineEl) return;

  const activeLineRect = activeLineEl.getBoundingClientRect();
  const scrollerRect = scrollerEl.getBoundingClientRect();

  // This sets the active line in the center of the viewport
  if (activeLineRect.bottom > scrollerRect.bottom || activeLineRect.top < scrollerRect.top) {
    console.debug("Active line is out of view (at least partially). Scrolling to active line.");
    activeLineEl.scrollIntoView({block: "center"});
  }

  const initialViewportFraction = getViewportFraction(activeLineEl, scrollerRect);

  callback();

  activeLineEl = getActiveLineEl(view);
  if (!activeLineEl) return;
  scrollToViewportFraction(scrollerEl, activeLineEl, initialViewportFraction, false);

  setTimeout(() => rescrollActiveLineOnFailure(view, initialViewportFraction));

}


/**
 * Call this function before modifying the DOM to get a function that restores the
 * scroll position for the active line.
 * @returns A function that restores the scroll position for the active line in a FileView.
 */
export function restoreActiveLineScrollFunc(view: FileView): (() => void) | undefined {
  const activeLineEl = getActiveLineEl(view);
  if (!activeLineEl) return;

  const scrollerEl = getScrollerEl(view);
  if (!scrollerEl) return;

  const activeLineRect = activeLineEl.getBoundingClientRect();
  const scrollerRect = scrollerEl.getBoundingClientRect();

  if (activeLineRect.bottom > scrollerRect.bottom || activeLineRect.top < scrollerRect.top) {
    console.debug("Active line is out of view (at least partially). Scrolling to active line.");
    activeLineEl.scrollIntoView({block: "center"});
  }

  const initialViewportFraction = getViewportFraction(activeLineEl, scrollerRect);

  // Return the Restore Function
  return () => {
    const activeLineEl = getActiveLineEl(view);
    if (!activeLineEl) return;

    scrollToViewportFraction(scrollerEl, activeLineEl, initialViewportFraction, false);

    setTimeout(() => rescrollActiveLineOnFailure(view, initialViewportFraction));
  };
}




////////////////////////////////////////////////////////////////////////////////
// SCROLL ACTIVE LINE BY TRIGGER BOUNDS
////////////////////////////////////////////////////////////////////////////////


type ViewportFractions = {
  top: number,
  bottom: number,
}

type ScrollTriggerStatus = {
  triggered: boolean,
  top: boolean,
}


/**
 * Resolve the scroll trigger for the `referenceEl` within the `scrollerEl` based on the `triggerBounds`.
 * @returns {ScrollTriggerStatus}
 */
function resolveScrollTrigger(triggerBounds: ViewportFractions, scrollerEl: HTMLElement, referenceEl: HTMLElement): ScrollTriggerStatus {

  // Get the DOMRect objects
  const scrollerRect = scrollerEl.getBoundingClientRect();
  const refElemRect = referenceEl.getBoundingClientRect();

  // Calculate the bound for the top trigger section
  const topTriggerBound = scrollerRect.top + (
    scrollerRect.height * triggerBounds.top
  );

  // Calculate the bound for the bottom trigger section
  const bottomTriggerBound = scrollerRect.top + ( // Here was the mistake
    scrollerRect.height * triggerBounds.bottom
  );


  // Within the top viewport trigger section
  if (refElemRect.bottom < topTriggerBound) {
    return {triggered: true, top: true};

  // Within the bottom viewport trigger section
  } else if (refElemRect.top > bottomTriggerBound) {
    return {triggered: true, top: false};

  // Not within the viewport trigger sections
  } else {
    return {triggered: false, top: false};
  }
}



type ScrollTriggerSpecs = {
  bounds: ViewportFractions,
  targets?: ViewportFractions,
}


/**
 * Scroll the active line if:
 * - above the top trigger bound, or
 * - below the bottom trigger bound.
 * @param {FileView} view - The FileView object.
 * @param {ScrollTriggerSpecs} triggerSpecs - The scroll trigger specifications.
 * @param {boolean} [timeoutCheck] - Set timeout to rescroll on failure.
 */
export function scrollActiveLineByTriggerBounds(
  view: FileView,
  triggerSpecs: ScrollTriggerSpecs,
  timeoutCheck?: boolean
): void {

  const lineEl = getActiveLineEl(view);
  if (!lineEl) return;

  const scrollerEl = getScrollerEl(view);
  if (!scrollerEl) return;

  const {triggered, top} = resolveScrollTrigger(triggerSpecs.bounds, scrollerEl, lineEl);
  if (!triggered) return;

  let scrollFraction = top ? triggerSpecs.bounds.top : triggerSpecs.bounds.bottom;
  if (triggerSpecs.targets) {
    scrollFraction = top ? triggerSpecs.targets.top : triggerSpecs.targets.bottom;
  }

  scrollToViewportFraction(scrollerEl, lineEl, scrollFraction);

  if (timeoutCheck) {
    setTimeout(() => rescrollActiveLineOnFailure(view, scrollFraction));
  }
}




////////////////////////////////////////
// OTHER SCROLLING FUNCTIONS
////////////////////////////////////////


/**
 * Scroll the cursor line into view.
 * @param {Editor} editor - The Editor object.
 * @param {number} [offset=0] - Number of lines to remain visible above and below the cursor.
 */
export async function scrollToCursor(editor: Editor, offset: number = 0): Promise<void> {
  const cursorPos = editor.getCursor();
  await sleep(0); // This ensures that the scroll works properly.
  editor.scrollIntoView({
    from: {line: cursorPos.line - offset, ch: 0},
    to: {line: cursorPos.line + offset, ch: 0}
  }, false);
}



