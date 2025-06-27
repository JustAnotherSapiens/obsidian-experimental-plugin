import { App } from 'obsidian';

import { getSetting } from 'utils/obsidian/settings';

import { scrollActiveLineByTriggerBounds } from 'utils/obsidian/scroll';

import { DateTimeFormat, getMatchedDate } from 'utils/time';

import { createStyledEl } from 'utils/display';
import { simpleHighlight, fuzzyHighlight } from 'suggests/utils/display';
import { getHeadingColor } from './display';

import { isCodeBlockEnd } from './helpers';

import BaseAbstractSuggest from 'suggests/baseAbstractSuggest';
import ViewAbstractSuggest from 'suggests/viewAbstractSuggest';



export type FlatHeading = {
  raw: string;
  line: number;
  level: number;
  timestamp?: string;
  text: string;
  title: string;
}



function getHeadingsArray(fileText: string): FlatHeading[] {
  const textLines = fileText.split('\n');
  let inCodeBlock = false;
  const headings: FlatHeading[] = [];

  for (let i = 0; i < textLines.length; i++) {
    const textLine = textLines[i];

    if (isCodeBlockEnd(textLine)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = textLine.match(/^#{1,6} /);
    if (!match) continue;

    const raw = textLine;
    const line = i;
    const level = match[0].length - 1;

    const dateFormat = getMatchedDate(textLine) as DateTimeFormat;
    if (dateFormat) {
      const dateMatch = textLine.match(dateFormat.regex);
      if (dateMatch && dateMatch.index === match[0].length) {
        const timestamp = dateMatch[0];
        const text = textLine.slice(match[0].length).trim();
        const title = textLine.slice(match[0].length + timestamp.length).trim();
        // if (text === title || text === timestamp)
        //   console.log('Simple Display');
        // else console.log('Complex Display');
        headings.push({raw, line, level, timestamp, text, title});
        continue;
      }
    }

    const text = textLine.slice(match[0].length).trim();
    const title = text;
    headings.push({raw, line, level, text, title});
  }

  return headings;
}



export default class MoveToHeadingSuggest extends ViewAbstractSuggest<FlatHeading> {

  constructor(app: App) {
    super(app, 'move-to-heading-suggest');
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

      const viewportFraction = getSetting(this.app, 'headingSelectionViewportFraction');
      scrollActiveLineByTriggerBounds(this.view!, {
        bounds: {
          top: viewportFraction,
          bottom: viewportFraction,
        }
      }, true);

    }
    await this.close();
  }

}



// CODE GRAVEYARD

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




export function setDisplayFunctionsAsColoredHeading(this: BaseAbstractSuggest<FlatHeading>) {

  function coloredHeadingHTML(n: number, text: string): string {
    const definer = createStyledEl('b', '#'.repeat(n) + ' ', {'font-size': '1em'}).outerHTML;
    return createStyledEl('span', definer + text, {'color': getHeadingColor(n)}).outerHTML;
  }

  this.defaultResultDisplay = (resultEl, item) => {
    resultEl.innerHTML = coloredHeadingHTML(item.level, item.text);
  };
  this.simpleResultDisplay = (resultEl, object) => {
    resultEl.innerHTML = coloredHeadingHTML(object.item.level, simpleHighlight(object.match, object.item.text));
  };
  this.fuzzyResultDisplay = (resultEl, object) => {
    resultEl.innerHTML = coloredHeadingHTML(object.item.level, fuzzyHighlight(object.fuzzyResult.matches, object.item.text));
  };
}


export function setDisplayFunctionsAsFadedTimeHeading(this: BaseAbstractSuggest<FlatHeading>) {

  function fadedTimeHeadingHTML(
    n: number, text: string, title: string, timestamp: string,
    highlightFunction: (text: string) => string,
    resolveTitleAndTimeHTML: (title: string, time: string) => [string, string],
  ): string {
    const definerEl = createStyledEl('b', '#'.repeat(n) + ' ', {
      'color': getHeadingColor(n),
      'font-size': '1em',
    });
    let resultHTML = definerEl.outerHTML;

    if (text === title || text === timestamp) {
      resultHTML += highlightFunction(text);

    } else {
      const [titleHTML, timeHTML] = resolveTitleAndTimeHTML(title, timestamp);
      resultHTML += titleHTML;

      if (timestamp) {
        const ghostDefinerEl = definerEl.cloneNode(true) as HTMLElement;
        ghostDefinerEl.style.color = 'transparent';

        const fadedTimeEl = createStyledEl('span', '', {
          'color': 'var(--text-muted)',
          'font-size': 'var(--font-smaller)'
        });
        fadedTimeEl.innerHTML = timeHTML;

        const timestampEl = createDiv();
        timestampEl.appendChild(ghostDefinerEl);
        timestampEl.appendChild(fadedTimeEl);

        resultHTML += timestampEl.outerHTML;
      }

    }
    return resultHTML;
  }

  function unambiguateHeaderMatch(match: [number, number], timestampLength: number) {
    let timeMatch: [number, number] | undefined;
    let titleMatch: [number, number] | undefined;
    const titleOffset = timestampLength + 1;

    const [matchStart, matchEnd] = match;

    if (matchStart < timestampLength) {
      if (matchEnd < titleOffset) // Clean time match.
        timeMatch = match;
      else { // Distribute the match between time and title.
        timeMatch = [matchStart, timestampLength];
        titleMatch = [0, matchEnd - titleOffset];
      }
    }
    else if (matchStart > timestampLength) // Clean title match.
      titleMatch = [matchStart - titleOffset, matchEnd - titleOffset];
    else // Skip the space between timestamp and title.
      titleMatch = [matchStart + 1 - titleOffset, matchEnd - titleOffset];

    return [timeMatch, titleMatch];
  }

  function unambiguateHeaderMatches(matches: [number, number][], timestampLength: number) {
    const timeMatches: [number, number][] = [];
    const titleMatches: [number, number][] = [];
    const titleOffset = timestampLength + 1;

    for (let i = 0; i < matches.length; i++) {
      const [matchStart, matchEnd] = matches[i];

      if (matchStart < timestampLength) {
        if (matchEnd < titleOffset) // Clean time match.
          timeMatches.push(matches[i]);
        else { // Distribute the match between time and title.
          timeMatches.push([matchStart, timestampLength]);
          titleMatches.push([0, matchEnd - titleOffset]);
        }
      }
      else if (matchStart > timestampLength) // Clean title match.
        titleMatches.push([matchStart - titleOffset, matchEnd - titleOffset]);
      else // Skip the space between timestamp and title.
        titleMatches.push([matchStart + 1 - titleOffset, matchEnd - titleOffset]);
    }

    return [timeMatches, titleMatches];
  }

  this.defaultResultDisplay = (resultEl, item) => {
    resultEl.innerHTML = fadedTimeHeadingHTML(
      item.level, item.text, item.title, item.timestamp!,
      (text) => text, (title, time) => [title, time],
    );
  };

  this.simpleResultDisplay = (resultEl, object) => {
    resultEl.innerHTML = fadedTimeHeadingHTML(
      object.item.level, object.item.text, object.item.title, object.item.timestamp!,
      simpleHighlight.bind(null, object.match),
      (title, time) => {
        const [timeMatch, titleMatch] = unambiguateHeaderMatch(object.match, time.length);
        return [
          titleMatch ? simpleHighlight(titleMatch, title) : title,
          timeMatch ? simpleHighlight(timeMatch, time) : '',
        ];
      },
    );
  };

  this.fuzzyResultDisplay = (resultEl, object) => {
    resultEl.innerHTML = fadedTimeHeadingHTML(
      object.item.level, object.item.text, object.item.title, object.item.timestamp!,
      fuzzyHighlight.bind(null, object.fuzzyResult.matches),
      (title, time) => {
        const [timeMatches, titleMatches] = unambiguateHeaderMatches(object.fuzzyResult.matches, time.length);
        return [
          titleMatches.length > 0 ? fuzzyHighlight(titleMatches, title) : title,
          timeMatches.length > 0 ? fuzzyHighlight(timeMatches, time) : '',
        ];
      },
    );
  };

}

