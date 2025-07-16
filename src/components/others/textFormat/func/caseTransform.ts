// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape
// https://unicode.org/reports/tr18/#General_Category_Property

export function toTitleCase(text: string) {
  if (typeof text !== 'string') throw new Error('Not a string');

  // Do not uppercase words like '234abc'
  return text.replace(/\p{Letter}*/gu, (word: string): string => {
    // return text.replace(/\w\S*/g, (word: string): string => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}


/**
 * Sentences are taken to be separated by any of the following characters:
 * `\n`, `\t`, `.`, `!`, `?`
 */
export function toSentenceCase(text: string) {
  if (typeof text !== 'string') throw new Error('Not a string');

  // Regex: matches everything up to and including sentence separators, or until the end of the string
  const sentenceRegex = /.*?[.!?\n\t]+(?:['")\]]*)|.+$/gu;

  const sentences: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = sentenceRegex.exec(text)) !== null) {
    let sentence = match[0];
    if (!sentence) continue;
    // Lowercase all, then capitalize first Unicode letter
    sentence = sentence.toLocaleLowerCase();
    sentence = sentence.replace(
      /^(\P{Letter}*)(\p{Letter})/u,
      (_, p1, p2) => p1 + p2.toLocaleUpperCase()
    );
    sentences.push(sentence);
  }

  return sentences.join('');
}

