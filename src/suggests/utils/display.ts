import {
  ACCENT_COLOR,
  DEBUG_COLOR,
} from 'utils/display';



export function simpleHighlight(match: [number, number], text: string): string {
  const leadStr = text.slice(0, match[0]);
  const matchStr = text.slice(match[0], match[1]);
  const tailStr = text.slice(match[1]);
  return `${leadStr}<b style="color: ${ACCENT_COLOR};">${matchStr}</b>${tailStr}`;
}


export function fuzzyHighlight(matches: [number, number][], text: string): string {
  for (let i = matches.length - 1; i >= 0; i--)
    text = simpleHighlight(matches[i], text);
  return text;
}


export function scoredText(score: number, text: string): string {
  return `<span style="color: ${DEBUG_COLOR};">${score.toFixed(4)}</span>  ${text}`;
}



// CODE GRAVEYARD

// type DashedString<T extends string> =
//   T extends `${infer F}${infer R}`
//     ? `${Lowercase<F>}${R extends Capitalize<R> ? "-" : ""}${DashedString<R>}`
//     : T;
// type RemoveLastDash<S extends string> = S extends `${infer R}-` ? R : S;
// type CamelToDashedCase<T extends string> = RemoveLastDash<DashedString<T>>;

// type Test = CamelToDashedCase<'FooBarBaz'>; // 'foo-bar-baz'
// type Test0 = CamelToDashedCase<'FontWeight'>; // 'font-weight'
// type Test1 = CamelToDashedCase<'paddingRight'>; // 'padding-right'
// type Test2 = CamelToDashedCase<'color'>; // 'color'
// type Test3 = CamelToDashedCase<'Margin'>; // 'margin'

