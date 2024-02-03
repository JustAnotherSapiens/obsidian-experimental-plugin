import {
  App, Vault, Setting, Notice,
  Editor, FileView, MarkdownView,
  TAbstractFile, TFolder, TFile,
  CachedMetadata, HeadingCache,
  EditorRange, EditorRangeOrCaret, TextComponent,
} from "obsidian";

import BundlePlugin from "main";

// This must match the ID at manifest.json
export const PLUGIN_ID = "experimental-plugin";


type SettingKey = string;

export function getSetting(setting: SettingKey): any {
  return this.app.plugins.plugins[PLUGIN_ID].settings[setting];
}

export function shrinkSettingInputField(setting: Setting, selector: string = "input"): void {
  setting.settingEl.style.display = "grid";
  setting.settingEl.style.gridTemplateColumns = "3fr 1fr";
  const inputEl = setting.controlEl.querySelector(selector) as HTMLInputElement;
  inputEl.style.width = "100%"; // 'display' and 'boxSizing' may also be useful
}


export function getActiveView(): MarkdownView {
  return this.app.workspace.getActiveViewOfType(MarkdownView);
}


export function getCodeMirrorEditor(view: MarkdownView): CodeMirror.Editor {
  return (view.editor as any).editMode?.editor?.cm?.cm;
}



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

// TODO: Find a reliable way to ensure that the file is properly indexed
//       up to the latest changes before reading the cache.
export async function getActiveFileCache(property?: MetadataProperty) {
  try {
    // Not sure if this has any effect on the cache, but I believe
    // it's a good practice to save the file before reading it.
    this.app.commands.executeCommandById('editor:save-file');

    const currentFile = this.app.workspace.getActiveFile() as TFile;
    if (!currentFile) throw new Error("Couldn't get currentFile");

    // The execution of this function is recommended on the API docs
    // whenever we are planning to modify the file contents.
    void await this.app.vault.adapter.read(currentFile.path);

    const fileCache = this.app.metadataCache.getFileCache(currentFile) as CachedMetadata;
    if (!fileCache) throw new Error("Couldn't get fileCache");

    if (!property) return fileCache;

    const fileProperty = structuredClone(fileCache[property]);
    if (!fileProperty) throw new Error(`Couldn't get file ${property} from cache`);

    return fileProperty;

  } catch (error) {
    const timestamp = this.moment().format("YYYY-MM-DD[T]HH:mm:ss.SSS");
    console.debug(timestamp, "getActiveFileCache() failed:", error.message);
  }
}



export function getHeadingIndex(
  fileHeadings: HeadingCache[],
  cursorLine: number,
  snapParent: boolean = false
): number {
  let headingIndex = -1;
  for (let i = fileHeadings.length - 1; i >= 0; i--) {
    if (fileHeadings[i].position.start.line > cursorLine) continue;
    if (fileHeadings[i].position.start.line === cursorLine) headingIndex = i;
    else if (snapParent) headingIndex = i;
    break;
  }
  return headingIndex;
}




export function handleCursorMovement(
  editor: Editor,
  line: number | undefined,
): void {
  if (line === undefined) return;

  if (!editor.somethingSelected()) {
    editor.setCursor({line, ch: 0});
    return;
  }

  let selection: EditorRange = {
    from: editor.getCursor("anchor"),
    to: {line, ch: 0},
  };

  if (this.app.vault.getConfig("vimMode")) {
    if (line >= selection.from.line) {
      selection.to.ch = 1;
    }
  }

  editor.transaction({selection});
}



////////////////////////////////////////
// SCROLLING FUNCTIONS
////////////////////////////////////////

export async function scrollToCursor(editor: Editor, offset: number = 0): Promise<void> {
  const cursorPos = editor.getCursor();
  await sleep(0); // This ensures that the scroll works properly.
  editor.scrollIntoView({
    from: {line: cursorPos.line - offset, ch: 0},
    to: {line: cursorPos.line + offset, ch: 0}
  }, false);
}


export type ScrollOptions = {
  viewportThreshold: number,
  scrollFraction?: number,
  scrollOffsetLines?: number,
  // top?: boolean,
  asymmetric?: boolean,
  // timeout?: number,
};

export function customActiveLineScroll(view: FileView, options: ScrollOptions): void {
  // console.debug("---");
  let {lineEl, outOfBounds, top} = getLineViewportData(view, options.viewportThreshold);
  if (!outOfBounds) return;

  try {
    getScrollFunction(view, options)(lineEl, top);
  } catch (error) {
    console.log(`${PLUGIN_ID} - Scroll Error:`, error.message);
  }
}


function getScrollFunction(view: FileView, options: ScrollOptions): (lineEl: HTMLElement, top: boolean) => void {

  if (options.scrollOffsetLines !== undefined) return (lineEl: HTMLElement, top: boolean) => {
    scrollIntoViewWithOffset(lineEl, options.scrollOffsetLines!, top);
    setTimeout(() => {
      const lineEl = view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
      if (!lineEl) {
        console.log(`${PLUGIN_ID} - No active line HTMLElement found after scroll. Please report this issue.`);
        return;
      }
      const limitEl = getOffsetLimitElement(lineEl, options.scrollOffsetLines!, top);
      const {outOfBounds} = getLineViewportData(view, 0, limitEl);
      if (outOfBounds) {
        console.debug(`${PLUGIN_ID} - Additional scroll triggered after offset lines scroll.`);
        // printActiveLineInfo(view, "Before Offset Lines Scroll", lineEl);
        scrollIntoViewWithOffset(lineEl, options.scrollOffsetLines!, top);
        // printActiveLineInfo(view, "After Offset Lines Scroll", lineEl);
      }
    });
  };

  else return (lineEl: HTMLElement, top: boolean) => {
    const scrollerEl = view.contentEl.querySelector(".cm-scroller") as HTMLElement;
    if (!scrollerEl) {
      console.log(`${PLUGIN_ID} - No scroller HTMLElement found. Please report this issue.`);
      return;
    }
    let scrollFraction = options.scrollFraction ?? options.viewportThreshold;
    // options.scrollFraction ??= options.viewportThreshold;
    if (options.asymmetric) top = true;
    else if (!top) scrollFraction = 1 - scrollFraction;
    scrollToFraction(lineEl, scrollerEl, scrollFraction, top);
    setTimeout(() => {
      const {lineEl, outOfBounds} = getLineViewportData(view, scrollFraction <= 0.5 ? scrollFraction : 1 - scrollFraction);
      if (outOfBounds) {
        console.debug(`${PLUGIN_ID} - Additional scroll triggered after fraction scroll.`);
        // printActiveLineInfo(view, "Before Fraction Scroll", lineEl);
        scrollToFraction(lineEl, scrollerEl, options.scrollFraction!, top);
        // printActiveLineInfo(view, "After Fraction Scroll", lineEl);
      }
    });
  };

}


function getLineViewportData(view: FileView, vieportFraction: number, lineEl?: HTMLElement): {
  lineEl: HTMLElement, outOfBounds: boolean, top: boolean,
} {
  lineEl ??= view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
  if (!lineEl) {
    console.log("No active line HTMLElement found. Please report this issue.");
    return {lineEl, outOfBounds: false, top: false};
  }
  const viewRect = view.contentEl.getBoundingClientRect()!;
  const upperBound = viewRect.top + (viewRect.height * vieportFraction);
  const lowerBound = viewRect.bottom - (viewRect.height * vieportFraction);
  const elemRect = lineEl.getBoundingClientRect();
  // console.log("Upper Bound:", upperBound, "Lower Bound:", lowerBound);

  if (elemRect.bottom < upperBound) return {lineEl, outOfBounds: true, top: true};
  if (elemRect.top > lowerBound) return {lineEl, outOfBounds: true, top: false};
  return {lineEl, outOfBounds: false, top: false};
}


export function printActiveLineInfo(view: FileView, label: string = "Active Line", lineEl?: HTMLElement): void {
  lineEl = lineEl ?? view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
  const lineRect = lineEl.getBoundingClientRect();
  console.debug(`${label} => Top:`, lineRect.top, "Bottom:", lineRect.bottom);
}


// function activeLineScroll(view: FileView, options: ScrollOptions): void {
//   const lineEl = view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
//   if (!lineEl) {
//     console.log("No active line HTMLElement found. Please report this issue.");
//     return;
//   }
//   let {inBounds, top} = elemInViewportFraction(lineEl, view, options.viewportThreshold);
//   if (!inBounds) return;

//   if (options.scrollOffsetLines === undefined) {
//     const scrollerEl = view.contentEl.querySelector(".cm-scroller") as HTMLElement;
//     if (!scrollerEl) {
//       console.log("No scroller HTMLElement found. Please report this issue.");
//       return;
//     }
//     let scrollFraction = (options.scrollFraction ?? options.viewportThreshold);
//     if (options.asymmetric) top = true;
//     else if (!top) scrollFraction = 1 - scrollFraction;
//     scrollToFraction(lineEl, scrollerEl, scrollFraction, top);

//   } else {
//     scrollIntoViewWithOffset(lineEl, options.scrollOffsetLines, top);
//   }
// }


function scrollToFraction(elem: HTMLElement, scrollableEl: HTMLElement, fraction: number, top: boolean): void {
  if (scrollableEl.scrollHeight <= scrollableEl.clientHeight) {
    console.log("Element is not scrollable:", scrollableEl);
    console.log("Scroll_Height:", scrollableEl.scrollHeight);
    console.log("Client_Height:", scrollableEl.clientHeight);
    return;
  }
  const elemRect = elem.getBoundingClientRect();
  const scrollRect = scrollableEl.getBoundingClientRect();
  const targetY = scrollRect.top + scrollRect.height * fraction;
  const scrollY = (elemRect.top + elemRect.bottom) / 2 - targetY;
  scrollableEl.scrollBy(0, scrollY);
}


// TO-CONTINUE: use the options object as argument instead of the individual parameters
function scrollIntoViewWithOffset(elem: HTMLElement, offset: number, top: boolean): void {
  // const nextSibling = top ? (el: HTMLElement) => el.previousElementSibling : (el: HTMLElement) => el.nextElementSibling;
  // let limitEl = elem;
  // for (let i = 0; i < offset; i++) {
  //   const nextEl = nextSibling(limitEl) as HTMLElement;
  //   if (nextEl === null) break;
  //   limitEl = nextEl;
  // }
  getOffsetLimitElement(elem, offset, top).scrollIntoView({
    block: top ? "start" : "end",
    inline: "nearest",
    behavior: "auto"
  });
}


function getOffsetLimitElement(elem: HTMLElement, offset: number, top: boolean): HTMLElement {
  const nextSibling = top ? (el: HTMLElement) => el.previousElementSibling : (el: HTMLElement) => el.nextElementSibling;
  let limitEl = elem;
  for (let i = 0; i < offset; i++) {
    const nextEl = nextSibling(limitEl) as HTMLElement;
    if (nextEl === null) break;
    limitEl = nextEl;
  }
  return limitEl;
}


function elemInViewportFraction(elem: HTMLElement, view: FileView, fraction: number): {inBounds: boolean, top: boolean} {
  const viewRect = view.contentEl.getBoundingClientRect()!;
  const upperBound = viewRect.top + (viewRect.height * fraction);
  const lowerBound = viewRect.bottom - (viewRect.height * fraction);
  const elemRect = elem.getBoundingClientRect();
  console.log("Upper Bound:", upperBound, "Lower Bound:", lowerBound);

  if (elemRect.bottom < upperBound) return {inBounds: true, top: true};
  if (elemRect.top > lowerBound) return {inBounds: true, top: false};
  return {inBounds: false, top: false};
}


// export async function scrollActiveLineIntoView(view: FileView, offset: number, top: boolean = true): Promise<void> {
//   await sleep(0);
//   const lineEl = view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
//   scrollIntoViewWithOffset(lineEl, offset, top);
// }


// export async function scrollActiveLineToFraction(view: FileView, fraction: number, top: boolean = true): Promise<void> {
//   await sleep(0);
//   const lineEl = view.contentEl.querySelector(".cm-content .cm-line.cm-active") as HTMLElement;
//   const scrollerEl = view.contentEl.querySelector(".cm-scroller") as HTMLElement;
//   scrollToFraction(lineEl, scrollerEl, fraction, top);
// }


// Useful DevTools Snippets for Debugging
// var viewRect = this.app.workspace.getActiveFileView().contentEl.getBoundingClientRect()
// var lineRect = this.app.workspace.getActiveFileView().contentEl.querySelector(".cm-content .cm-line.cm-active").getBoundingClientRect()



////////////////////////////////////////
// Setting Classes
////////////////////////////////////////

export class DynamicSetting extends Setting {
  show(): void { this.settingEl.show(); }
  hide(): void { this.settingEl.hide(); }
}


export class FloatInputSetting extends DynamicSetting {

  constructor(containerEl: HTMLElement, plugin: BundlePlugin, options: {
    settingId: string,
    placeholder: string,
    min: number,
    max: number,
    default?: number | string,
  }) {
    super(containerEl);

    if (!(options.settingId in plugin.settings)) {
      throw new Error(`Setting "${options.settingId}" not found in plugin settings.`);
    }

    this.addText((textField: TextComponent) => {
      textField.inputEl.type = "number";
      textField.inputEl.min = String(options.min);
      textField.inputEl.max = String(options.max);
      textField.inputEl.step = "any";
      textField.setPlaceholder(options.placeholder);
      textField.setValue(String(plugin.settings[options.settingId]));
      textField.onChange(async (value: string) => {
        const newValue = Number(value);
        if (newValue > options.max || newValue < options.min) {
          new Notice(`Value should be between ${options.min} and ${options.max}`);
          let defaultValue = options.default ?? plugin.settings[options.settingId];
          if (typeof options.default === "string") defaultValue = plugin.settings[options.default];
          textField.setValue(String(defaultValue));
        }
        plugin.settings[options.settingId] = Number(textField.getValue());
        await plugin.saveSettings();
      });
    });
    this.setTooltip(
      `Value should be between ${options.min} and ${options.max}`,
      {placement: "top", delay: 350},
    );
    this.then(shrinkSettingInputField);
  }

  get input(): number {
    const inputEl = this.controlEl.querySelector("input") as HTMLInputElement;
    return Number(inputEl.value);
  }

  set input(value: number) {
    const inputEl = this.controlEl.querySelector("input") as HTMLInputElement;
    inputEl.value = String(value);
  }

}



////////////////////////////////////////
// OTHER UTILITY FUNCTIONS
////////////////////////////////////////

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


export function wrapAround(value: number, size: number): number {
    return ((value % size) + size) % size;
}


export function resolveTFile(app: App, fileStr: string): TFile {
  const file = app.vault.getAbstractFileByPath(fileStr);
  if (!file) {
    throw new Error(`File "${fileStr}" does not exist.`);
  }
  if (!(file instanceof TFile)) {
    throw new Error(`"${fileStr}" is a folder, not a file.`);
  }
  return file;
}


export function resolveTFolder(app: App, folderStr: string): TFolder {
  const folder = app.vault.getAbstractFileByPath(folderStr);
  if (!folder) {
    throw new Error(`Folder "${folderStr}" does not exist.`);
  }
  if (!(folder instanceof TFolder)) {
    throw new Error(`"${folderStr}" is a file, not a folder.`);
  }
  return folder;
}


export function getTFilesFromFolder(app: App, folderStr: string): Array<TFile> {
  const folder = resolveTFolder(app, folderStr);

  const files: Array<TFile> = [];
  Vault.recurseChildren(folder, (file: TAbstractFile) => {
    if (file instanceof TFile) {
      files.push(file);
    }
  });

  files.sort((a, b) => a.basename.localeCompare(b.basename));

  return files;
}
