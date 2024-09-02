// TODO: Remove the "obsidian" dependency.
import {
  Notice,
  moment,
} from "obsidian";



export type DateTimeFormat = {
  name: string,
  format: string,
  regex: RegExp,
};



// Sticking to the ISO 8601 standard.
export const DATE_FORMATS: Array<DateTimeFormat> = [
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



export function getMatchedDate(text: string, args?: {
  multiple?: boolean,
  verbose?: boolean,
}): DateTimeFormat | DateTimeFormat[] | undefined {
  if (!args) args = {multiple: false, verbose: false};
  if (!args.multiple) args.multiple = false;
  if (!args.verbose) args.verbose = false;

  if (!args.multiple) {
    // Return the first date found.
    for (const date of DATE_FORMATS) {
      if (date.regex.test(text)) return date;
    }
  } else {
    // Return all the dates found.
    const matchedDates = [];
    for (const date of DATE_FORMATS) {
      if (date.regex.test(text)) matchedDates.push(date);
    }
    if (matchedDates.length > 0) return matchedDates;
  }

  if (!args.verbose) return;

  // If no date was found, show a notice and return.
  const message = "None of the supported date formats were found.";
  console.log(moment().format("YYYY-MM-DD HH:mm:ss"), message);
  new Notice(message, 3500);
}

