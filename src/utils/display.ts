
export const ACCENT_COLOR = "var(--text-accent)";
export const FADE_COLOR = "var(--text-muted)";
export const DEBUG_COLOR = "var(--color-red)";

export const MODAL_MARGIN = "var(--size-4-3)";

export const SMALL_FONT_SIZE = "var(--font-smaller)";


type StyleProperties = {
  [key: string]: string | number;
}

function getInlineStyleString(args: StyleProperties): string {
  return Object.entries(args).map(([key, value]) => `${key}: ${value};`).join(" ");
}

export function createStyledEl(tag: keyof HTMLElementTagNameMap, text: string, style?: StyleProperties) {
  const el = createEl(tag, {text,
    attr: {
      class: "suggestion-text",
      style: style ? getInlineStyleString(style) : "",
    },
  });
  return el;
}


export function breadcrumHTML(filePath: string): string {
  const parts = filePath.split("/");
  const pathDivider = `<span style="color: ${FADE_COLOR}; font-weight: bold;"> / </span>`;
  const pathPart = (part: string) => `<span style="color: ${FADE_COLOR};">${part}</span>`;
  return `<span style="font-size: ${SMALL_FONT_SIZE};">${parts.map(pathPart).join(pathDivider)}</span>`;
}
