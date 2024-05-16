import { createStyledEl } from "utils/display";



export const getHeadingColor = (n: number) => `var(--h${n}-color)`;



export function mdHeadingHTML(n: number, text: string, childCount: number) {

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

