import {
  Notice, TFile,
  Editor, MarkdownView,
  CachedMetadata, HeadingCache,
  EditorRange, EditorRangeOrCaret,
} from "obsidian";



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


export function getHeadingIndex(
  fileHeadings: HeadingCache[],
  cursorLine: number,
  snapParent: boolean = false
) {
  let headingIndex = -1;
  for (let i = fileHeadings.length - 1; i >= 0; i--) {
    if (fileHeadings[i].position.start.line > cursorLine) continue;
    if (fileHeadings[i].position.start.line === cursorLine) headingIndex = i;
    else if (snapParent) headingIndex = i;
    break;
  }
  return headingIndex;
}


export function cursorScrollOffset(editor: Editor, offset: number = 0) {
  const cursorPos = editor.getCursor();
  editor.scrollIntoView({
    from: {line: cursorPos.line - offset, ch: 0},
    to: {line: cursorPos.line + offset, ch: 0}
  }, false);
}


export function handleCursorMovement(
  editor: Editor,
  line: number | undefined,
) {
  if (line === undefined) return;

  if (!editor.somethingSelected()) {
    editor.setCursor({line, ch: 0});
    return;
  }

  let selection: EditorRange = {
    from: editor.getCursor("anchor"),
    to: {line, ch: 0},
  };

  if (this.app.vault.config.vimMode) {
    if (line >= selection.from.line) {
      selection.to.ch = 1;
    }
  }

  editor.transaction({selection});
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
