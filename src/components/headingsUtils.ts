import {
  DateFormat,
  getMatchedDate,
} from "components/time";


export type Heading = {
  raw: string;
  line: number;
  level: number;
  timestamp?: string;
  text: string;
  title: string;
}



function isCodeBlockEnd(line: string): boolean {
  return line.trimStart().startsWith('```');
}

export function getHeadings(fileText: string): Heading[] {
  const textLines = fileText.split("\n");
  let inCodeBlock = false;
  let headings: Heading[] = [];

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

    const dateFormat = getMatchedDate(textLine) as DateFormat;
    if (dateFormat) {
      const dateMatch = textLine.match(dateFormat.regex);
      if (dateMatch && dateMatch.index === match[0].length) {
        const timestamp = dateMatch[0];
        const text = textLine.slice(match[0].length).trim();
        const title = textLine.slice(match[0].length + timestamp.length).trim();
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
