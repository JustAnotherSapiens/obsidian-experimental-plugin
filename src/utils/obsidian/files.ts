import { App, Vault, TAbstractFile, TFolder, TFile } from "obsidian";



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

