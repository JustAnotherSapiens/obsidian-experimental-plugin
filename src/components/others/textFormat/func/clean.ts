
// Remove patterns like "[1]", "[2]", "[3](https://example.com)", etc.
export function removeNumberReferences(text: string): string {
  return text.replace(/(?:\[\d+\]|\[\[\d+\]\])(?:\([^)]*\))?/g, '');
}


// Wikipedia: https://en.wikipedia.org/wiki/Non-breaking_space
// HTML: &nbsp; &NonBreakingSpace;
// Non-breaking Space: 0xa0 160 ' '
// Space: 0x20 32 ' '
export function removeNonBreakingSpaces(text: string): string {
  return text.replace(new RegExp(String.fromCharCode(0xa0), 'g'), ' ');
}


// OPINIONATED
// Useful for cleaning up copied text from Wikipedia mainly.
export function cleanAndNormalizeText(text: string): string {
  text = removeNumberReferences(text);
  text = removeNonBreakingSpaces(text);
  return text;
}


// NOTE: Named capturing groups are only available when targeting 'ES2018' or later
// Remove links like "[text](url)" leaving just the text part.
export function removeWikiLinks(text: string): string {
  return text.replace(/\[(?<text>[^\]]*)\]\([^)]*\)/g, '$<text>');
}
