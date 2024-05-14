  
import {
  BaseAbstractSuggest,
  DataNodeSuggest,
} from "utils/suggest/suggestUtils";

import {
  createStyledEl,
} from "utils/display";

import {
  simpleHighlight,
  fuzzyHighlight,
} from "utils/suggest/suggestDisplay";

import {
  Heading,
  FlatHeading,
} from "utils/headings/headingUtils";

import {
  HeadingNode,
} from "utils/headings/mdHeadings";


const getHeadingColor = (n: number) => `var(--h${n}-color)`;


export function setDisplayFunctionsAsColoredHeading(this: BaseAbstractSuggest<FlatHeading>) {

  function coloredHeadingHTML(n: number, text: string): string {
    const definer = createStyledEl("b", "#".repeat(n) + " ", {"font-size": "1em"}).outerHTML;
    return createStyledEl("span", definer + text, {"color": getHeadingColor(n)}).outerHTML;
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
    const definerEl = createStyledEl("b", "#".repeat(n) + " ", {
      "color": getHeadingColor(n),
      "font-size": "1em",
    });
    let resultHTML = definerEl.outerHTML;

    if (text === title || text === timestamp) {
      resultHTML += highlightFunction(text);

    } else {
      const [titleHTML, timeHTML] = resolveTitleAndTimeHTML(title, timestamp);
      resultHTML += titleHTML;

      if (timestamp) {
        const ghostDefinerEl = definerEl.cloneNode(true) as HTMLElement;
        ghostDefinerEl.style.color = "transparent";

        const fadedTimeEl = createStyledEl("span", "", {
          "color": "var(--text-muted)",
          "font-size": "var(--font-smaller)"
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

    let [matchStart, matchEnd] = match;

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
    let timeMatches: [number, number][] = [];
    let titleMatches: [number, number][] = [];
    const titleOffset = timestampLength + 1;

    for (let i = 0; i < matches.length; i++) {
      let [matchStart, matchEnd] = matches[i];

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



function headingNodeHTML(n: number, text: string, childCount: number) {
  const definerHTML = createStyledEl("b", "#".repeat(n) + " ", {
    "color": getHeadingColor(n),
    "font-size": "1em",
  }).outerHTML;
  if (childCount === 0) return definerHTML + text;

  const childCountHTML = createStyledEl("span", ` (${childCount})`, {
    "color": "var(--text-muted)",
    "font-size": "var(--font-smaller)",
  }).outerHTML;
  return definerHTML + text + childCountHTML;
}


export function setDisplayFunctionAsHeadingNode(this: BaseAbstractSuggest<HeadingNode>) {
  this.defaultResultDisplay = (resultEl, node) => {
    resultEl.innerHTML = headingNodeHTML(
      node.heading.level.bySyntax,
      node.heading.header.text,
      node.children.length,
    );
  };
  this.simpleResultDisplay = (resultEl, object) => {
    resultEl.innerHTML = headingNodeHTML(
      object.item.heading.level.bySyntax,
      simpleHighlight(object.match, object.item.heading.header.text),
      object.item.children.length,
    );
  };
  this.fuzzyResultDisplay = (resultEl, object) => {
    resultEl.innerHTML = headingNodeHTML(
      object.item.heading.level.bySyntax,
      fuzzyHighlight(object.fuzzyResult.matches, object.item.heading.header.text),
      object.item.children.length,
    );
  };
}


export function setDisplayFunctionAsHeadingDataNode(this: DataNodeSuggest<Heading>) {
  this.defaultResultDisplay = (resultEl, node) => {
    resultEl.innerHTML = headingNodeHTML(
      node.data.level.bySyntax,
      node.data.header.text,
      node.children.length,
    );
  };
  this.simpleResultDisplay = (resultEl, object) => {
    resultEl.innerHTML = headingNodeHTML(
      object.item.data.level.bySyntax,
      simpleHighlight(object.match, object.item.data.header.text),
      object.item.children.length,
    );
  };
  this.fuzzyResultDisplay = (resultEl, object) => {
    resultEl.innerHTML = headingNodeHTML(
      object.item.data.level.bySyntax,
      fuzzyHighlight(object.fuzzyResult.matches, object.item.data.header.text),
      object.item.children.length,
    );
  };
}

