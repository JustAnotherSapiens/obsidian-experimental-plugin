import {
  CachedMetadata,
  HeadingCache,
  TFile,
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

