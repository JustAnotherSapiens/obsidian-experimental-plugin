import { App, CachedMetadata, MarkdownView, Notice, TFile } from "obsidian";


const metadataProperties = [
  "links",
  "embeds",
  "tags",
  "headings",
  "sections",
  "listItems",
  "frontmatter",
  "frontmatterPosition",
  "frontmatterLinks",
  "blocks",
] as const;
type MetadataProperty = typeof metadataProperties[number];


export function getActiveView(): MarkdownView {
  return this.app.workspace.getActiveViewOfType(MarkdownView);
}

export function getCodeMirrorEditor(view: MarkdownView): CodeMirror.Editor {
  return (view.editor as any).editMode?.editor?.cm?.cm;
}


export async function getActiveFileCache(
  property?: MetadataProperty,
  // msDelay: number = 0
) {
  const startTime = window.moment().format("YYYY-MM-DD[T]HH:mm:ss.SSS");

  this.app.commands.executeCommandById('editor:save-file');
  // await new Promise(resolve => setTimeout(resolve, msDelay));

  try {
    const currentFile = this.app.workspace.getActiveFile() as TFile;
    if (!currentFile) throw new Error("Couldn't get currentFile");

    const fileCache = this.app.metadataCache.getFileCache(currentFile) as CachedMetadata;
    if (!fileCache) throw new Error("Couldn't get fileCache");

    if (!property) return fileCache;

    const fileProperty = structuredClone(fileCache[property]);
    if (!fileProperty) throw new Error(`Couldn't get file ${property}`);

    return fileProperty;

  } catch (error) {
    console.warn(startTime, "getActiveFileHeadings() failed");
    console.error(window.moment().format("HH:mm:ss.SSS"), error);
  }
}


/* NOTICE FUNCTIONS */

export function newMultilinePluginNotice (
  texts: string[],
  style: string,
  duration?: number | undefined
) {
  const fragment = document.createDocumentFragment();
  texts.forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    p.setAttribute("style", style);
    fragment.appendChild(p);
  });
  const pluginNotice = new Notice(fragment, duration);
  pluginNotice.noticeEl.addClass("experimental-plugin-notice");
}
