import {
  Setting, Notice,
  Editor, MarkdownView, HeadingCache,
  ToggleComponent, DropdownComponent, TextComponent,
} from "obsidian";

import BundlePlugin from "main";
import BundleComponent from "types";

import {
  getSetting,
  getActiveFileCache,
  getHeadingIndex,
  scrollToCursor,
} from "utils";




export default class TimeComponent implements BundleComponent {

  parent: BundlePlugin;
  settings: {
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
    };
  }

  onload(): void {
    this.addCommands();
    this.addRibbonIcons();
    // this.addStatusBarItems();
  }

  onunload(): void {}

  addCommands(): void {
    const plugin = this.parent;

		// Display Notice with current date and time
		plugin.addCommand({
			id: "show-current-date-and-time",
			name: "Show current date and time",
			icon: "calendar-clock",
			mobileOnly: false,
			repeatable: false,
			callback: () => showCurrentDateAndTime(),
		});

  }

  addRibbonIcons(): void {
    const plugin = this.parent;

		const ribbonIconEl = plugin.addRibbonIcon(
			"calendar-clock",
			"Timestamp Notice",
			() => showCurrentDateAndTime()
		);
		ribbonIconEl.addClass("experimental-plugin-ribbon-icon");
  }

  // Do not work on mobile apps.
  addStatusBarItems(): void {
    const plugin = this.parent;

    // E YYYY-MM-DD HH:mm:ss
		plugin.addStatusBarItem().setText(
      window.moment().format("d MMM Do (HH:mm:ss)")
    );
  }

  addEventsAndIntervals(): void {}

  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
  }

}



/* NOTICE FUNCTIONS */

function showCurrentDateAndTime() {
  newMultilinePluginNotice([
    window.moment().format("dddd ([UTC]Z)"),
    window.moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
    // window.moment().format("ddd YYYY-MM-DD HH:mm:ss Z"),
  ], "font-size: 1em; font-style: italic; text-align: center;", 0);
}


function newMultilinePluginNotice (
  texts: string[],
  style: string,
  duration?: number | undefined
): void {
  const fragment = document.createDocumentFragment();
  texts.forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    p.setAttribute("style", style);
    fragment.appendChild(p);
  });
  const pluginNotice = new Notice(fragment, duration);
  pluginNotice.noticeEl.addClass("experimental-plugin-notice");
}



//////////////////////////
// DATE FORMAT TRANSFORM
//////////////////////////


type DateFormat = {
  name: string,
  format: string,
  regex: RegExp,
};


// Sticking to the ISO 8601 standard.
const dateFormats: Array<DateFormat> = [
  {
    name: "1. Standard datetime",
    format: "YYYY-MM-DD[T]HH:mm:ss",
    regex: /(?<!\b[1-7] )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?![-+]\d{2}:?\d{2}|Z)/,
  },
  {
    name: "2. Standard date",
    format: "YYYY-MM-DD",
    regex: /(?<!\b[1-7] )\d{4}-\d{2}-\d{2}(?![ T]\d{2}:?\d{2}(?::?\d{2})?)/,
  },
  {
    name: "3. Weekday & datetime",
    format: "E YYYY-MM-DD HH:mm:ss",
    regex: /[1-7] \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/,
  },
  {
    name: "4. Weekday & date",
    format: "E YYYY-MM-DD",
    regex: /[1-7] \d{4}-\d{2}-\d{2}(?![ T]\d{2}:?\d{2}(?::?\d{2})?)/,
  },
  {
    name: "5. Standard datetime & timezone",
    format: "YYYY-MM-DD[T]HH:mm:ssZ",
    regex: /(?<!\b[1-7] )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([-+]\d{2}:?\d{2}|Z)/,
  },
];


export async function timeFormatTransform(tp: any, editor: Editor) {

  if (editor.somethingSelected()) {
    await dateTransformInSelection(tp, editor);
    return;
  }

  const cursorLine = editor.getCursor().line;
  const cursorLineStr = editor.getLine(cursorLine);

  // Get the date format of the current line.
  const matchedDate = getMatchedDate(cursorLineStr) as DateFormat;
  if (!matchedDate) return;

  // Prompt the user for the date format to transform to.
  const newFormat = await getTransformFormat(tp, matchedDate);
  if (!newFormat) return;

  // Get the changes to be made.
  let changes = await getHeadingsDateChanges(tp, editor, matchedDate, newFormat);
  if (changes.length === 0) {
    changes = getLineDateChanges(editor, cursorLine, matchedDate, newFormat);
  }

  // Apply the changes.
  editor.transaction({
    changes: changes,
    selection: {from: {line: cursorLine, ch: 0}}
  });

}

async function dateTransformInSelection(tp: any, editor: Editor) {
  const editRange = {from: editor.getCursor("from"), to: editor.getCursor("to")};
  const rangeText = editor.getRange(editRange.from, editRange.to);

  // Find all the matching date formats in the selection.
  const matchedDates = getMatchedDate(rangeText, {multiple: true}) as DateFormat[];
  if (!matchedDates) return;

  // Prompt the user for the date format to transform from if there are multiple.
  let fromDate = null;
  if (matchedDates.length > 1) {
    fromDate = await tp.system.suggester(
      matchedDates.map(date => `${date.name}\n${date.format}`),
      matchedDates, false, // Throw on cancel
      `Multiple date formats found in selection. Transform from...`
    );
    if (!fromDate) return;
  } else fromDate = matchedDates[0];

  // Prompt the user for the date format to transform to.
  const transformFormat = await getTransformFormat(tp, fromDate);
  if (!transformFormat) return;

  // Get the changes to be made.
  let changes = [];

  const offset = editor.posToOffset(editRange.from);
  for (const match of rangeText.matchAll(new RegExp(fromDate.regex, "g"))) {
    changes.push({
      from: editor.offsetToPos(offset + match.index!),
      to: editor.offsetToPos(offset + match.index! + match[0].length),
      text: this.moment(match[0], fromDate.format).format(transformFormat),
    });
  }

  // Apply the changes.
  editor.transaction({
    changes: changes,
    selection: {from: editRange.from}
  });

}


function getMatchedDate(text: string, args = {multiple: false}) {
  if (!args.multiple) {
    // Return the first date found.
    for (const date of dateFormats) {
      if (date.regex.test(text)) return date;
    }
  } else {
    // Return all the dates found.
    const matchedDates = [];
    for (const date of dateFormats) {
      if (date.regex.test(text)) matchedDates.push(date);
    }
    if (matchedDates.length > 0) return matchedDates;
  }

  // If no date was found, show a notice and return.
  const message = "None of the supported date formats were found.";
  console.log(this.moment().format("YYYY-MM-DD HH:mm:ss"), message);
  new Notice(message, 3000);
  return;
}


async function getTransformFormat(tp: any, fromDate: DateFormat) {
  // Get the date formats excluding the one to transform from.
  const dates = structuredClone(dateFormats);
  const fromDateIdx = dates.findIndex((date: DateFormat) => date.name === fromDate.name);
  if (fromDateIdx !== -1) dates.splice(fromDateIdx, 1);

  // Prompt the user for the new date format.
  return await tp.system.suggester(
    dates.map((date: DateFormat) => `${date.name}\n${date.format}`),
    dates.map((date: DateFormat) => date.format), false, // Throw on cancel
    `Transform from ${fromDate.format} to...`
  );
}


async function getHeadingsDateChanges(
  tp: any,
  editor: Editor,
  matchedDate: DateFormat,
  newFormat: string,
) {
  const cursorLine = editor.getCursor().line;

  // Check if the cursor is on a heading.
  let headingIdx = -1;
  const fileHeadings = await getActiveFileCache("headings") as HeadingCache[];
  if (fileHeadings) headingIdx = getHeadingIndex(fileHeadings, cursorLine);
  if (headingIdx === -1) return [];

  // Prompt to tranform the date of all the sibling headings as well.
  const transformAllSiblingHeadings = await tp.system.suggester(
    ["No", "Yes"], [false, true], false, "Transform all sibling headings?"
  );

  // Return changes for all the sibling headings if the user chose to.
  if (transformAllSiblingHeadings) {
    let changes = [];
    const siblingHeadings = getSiblingHeadings(fileHeadings, headingIdx);
    for (let i = 0; i < siblingHeadings.length; i++) {
      const siblingLine = siblingHeadings[i].position.start.line;
      const siblingLineStr = editor.getLine(siblingLine);
      const dateMatch = siblingLineStr.match(matchedDate.regex);
      if (!dateMatch) continue;
      changes.push({
        from: {line: siblingLine, ch: dateMatch.index!},
        to: {line: siblingLine, ch: dateMatch.index! + dateMatch[0].length},
        text: this.moment(dateMatch[0], matchedDate.format).format(newFormat),
      });
    }
    return changes;
  }

  // Return changes for the heading at the cursor line.
  const cursorLineStr = editor.getLine(cursorLine);
  const dateMatch = cursorLineStr.match(matchedDate.regex) as RegExpMatchArray;
  return [{
    from: {line: cursorLine, ch: dateMatch.index!},
    to: {line: cursorLine, ch: dateMatch.index! + dateMatch[0].length},
    text: this.moment(dateMatch[0], matchedDate.format).format(newFormat),
  }];
}


// async function getActiveFileCache(property: string) {
//   const startTime = this.moment().format("YYYY-MM-DD[T]HH:mm:ss.SSS");
//   // await new Promise(resolve => setTimeout(resolve, msDelay));

//   // Ensure that the file is saved before getting the cache.
//   this.app.commands.executeCommandById('editor:save-file');

//   try {
//     const currentFile = this.app.workspace.getActiveFile();
//     if (!currentFile) throw new Error("Couldn't get currentFile");

//     // Ensure that the file is indexed before getting the cache.
//     void await this.app.vault.adapter.read(currentFile.path);

//     const fileCache = this.app.metadataCache.getFileCache(currentFile);
//     if (!fileCache) throw new Error("Couldn't get fileCache");

//     if (!property) return fileCache;

//     const fileProperty = structuredClone(fileCache[property]);
//     if (!fileProperty) throw new Error(`Couldn't get file ${property} from cache`);

//     return fileProperty;

//   } catch (error) {
//     console.debug(startTime, "getActiveFileHeadings() failed:", error.message);
//   }
// }


// function getHeadingIndex(fileHeadings: HeadingCache[], cursorLine: number) {
//   let headingIndex = -1;
//   for (let i = fileHeadings.length - 1; i >= 0; i--) {
//     if (fileHeadings[i].position.start.line > cursorLine) continue;
//     if (fileHeadings[i].position.start.line === cursorLine) headingIndex = i;
//     break;
//   }
//   return headingIndex;
// }


function getSiblingHeadings(fileHeadings: HeadingCache[], refHeadingIndex: number) {
  const refHeadingLevel = fileHeadings[refHeadingIndex].level;
  const numberOfHeadings = fileHeadings.length;

  let upperBoundIdx = -1;
  let lowerBoundIdx = -1;
  for (let i = 0; i < numberOfHeadings; i++) {
    // Skip for equal or lower in hierarchy headings.
    if (fileHeadings[i].level >= refHeadingLevel) continue;
    // If we're past the reference heading, we've found the lower bound.
    if (i > refHeadingIndex) {
      lowerBoundIdx = i;
      break;
    // Otherwise, we've possibly found the upper bound.
    } else upperBoundIdx = i;
  }
  if (upperBoundIdx === -1) upperBoundIdx = 0;
  if (lowerBoundIdx === -1) lowerBoundIdx = numberOfHeadings;

  const siblingHeadings = [];
  for (let i = upperBoundIdx; i < lowerBoundIdx; i++) {
    if (fileHeadings[i].level === refHeadingLevel) {
      siblingHeadings.push(fileHeadings[i]);
    }
  }
  return siblingHeadings;
}


function getLineDateChanges(
  editor: Editor,
  line: number,
  matchedDate: {regex: RegExp, format: string},
  newFormat: string,
) {
  const match = editor.getLine(line).match(matchedDate.regex) as RegExpMatchArray;
  return [{
    from: {line, ch: match.index!},
    to: {line, ch: match.index! + match[0].length},
    text: this.moment(match[0], matchedDate.format).format(newFormat),
  }];
}




