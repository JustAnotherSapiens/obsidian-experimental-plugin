import { moment } from "obsidian";



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

  // {
  //   name: "5. Week datetime",
  //   format: "YYYY-[W]WW-E HH:mm:ss",
  //   regex: /(?<!\b[1-7] )\d{4}-W\d{2}-[1-7] \d{2}:\d{2}:\d{2}/,
  // },

  // {
  //   name: "6. Week date",
  //   format: "YYYY-[W]WW-E",
  //   regex: /(?<!\b[1-7] )\d{4}-W\d{2}-[1-7](?![ T]\d{2}:?\d{2}(?::?\d{2})?)/,
  // },

  {
    name: "7. Standard datetime & timezone",
    format: "YYYY-MM-DD[T]HH:mm:ssZ",
    regex: /(?<!\b[1-7] )\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([-+]\d{2}:?\d{2}|Z)/,
  },

  {
    name: "8. Weekday & datetime & timezone",
    format: "E YYYY-MM-DD HH:mm:ss Z",
    regex: /[1-7] \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} ([-+]\d{2}:?\d{2}|Z)/,
  },

  // {
  //   name: "9. Week datetime & timezone",
  //   format: "YYYY-[W]WW-E HH:mm:ss",
  //   regex: /(?<!\b[1-7] )\d{4}-W\d{2}-[1-7] \d{2}:\d{2}:\d{2} ([-+]\d{2}:?\d{2}|Z)/,
  // },

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

  console.debug(moment().format('YYYY-MM-DD HH:mm:ss Z'), `No supported date format found in:\n${text}`);

}



/* DURATION FORMAT CONVERSION */

export function iso8601DurationToReadableFormat(iso8601Duration: string) {
  const duration = moment.duration(iso8601Duration);
  const hours = duration.hours();
  const minutes = duration.minutes();
  const seconds = duration.seconds();
  let durationStr = '';
  if (hours) durationStr += (hours + 'h ');
  if (minutes) durationStr += (minutes + 'm ');
  if (seconds) durationStr += (seconds + 's');
  return durationStr.trim();
}


export function iso8601DurationToTimeFormat(iso8601Duration: string) {
  const zeroPad = (num: number) => {
    return num.toString().padStart(2, '0');
  };
  const duration = moment.duration(iso8601Duration);
  const hours = duration.hours();
  let durationStr =
    zeroPad(duration.minutes()) + ':' +
    zeroPad(duration.seconds());
  if (hours) durationStr = hours.toString() + ':' + durationStr;
  return durationStr;
}
