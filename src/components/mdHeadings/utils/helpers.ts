
/* GENERIC MARKDOWN HEADING HELPER FUNCTIONS */

export function getHeadingLevel(line: string): number {
  const match = line.match(/^#{1,6} /);
  return match ? match[0].length - 1 : 0;
}

export function isCodeBlockEnd(line: string): boolean {
  return line.trimStart().startsWith('```');
}
