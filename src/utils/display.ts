
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


export function breadcrumbsHTML(filePath: string): string {
  const parts = filePath.split("/");
  const pathDivider = `<span class="breadcrumbs-divider"> / </span>`;
  const pathPart = (part: string) => `<span class="breadcrumbs-part">${part}</span>`;
  return `<span class="breadcrumbs">${parts.map(pathPart).join(pathDivider)}</span>`;
}

export function hotkeyHTML(...keys: string[]): string {
  return `<span class="hotkey">${keys.map((key) => `<kbd>${key}</kbd>`).join(" + ")}</span>`;
}
