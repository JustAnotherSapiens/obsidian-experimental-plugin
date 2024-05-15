
import {
  Notice,
  MarkdownView,
  TFile,
} from "obsidian";

import { runQuickSuggest } from "utils/suggest/suggestUtils";

import HeadingExtractorComponent from "../core";



export function targetFileAssertion(this: HeadingExtractorComponent, targetFileSet: boolean) {
  if (!targetFileSet) {
    console.debug("Unable to set Target File.");
  } else {
    if (!this.targetFile) {
      console.error("Critical Error: Target File not set after assertion.");
    } else {
      new Notice(`Target File: ${this.targetFile.path}`, 3500);
    }
  }
}

export function targetFileNotice(this: HeadingExtractorComponent): void {
  new Notice(`Target File: ${this.parent.settings.targetFilePath}`, 3000);
}


export async function resolveTargetFile(this: HeadingExtractorComponent): Promise<void> {
  const plugin = this.parent;
  const getFile = (path: string) =>
    plugin.app.vault.getAbstractFileByPath(path) as TFile | null;

  switch (plugin.settings.targetFileMethod) {
    case "manualSet":
      this.targetFile = getFile(plugin.settings.targetFilePath);
      break;
    case "lastAccessed":
      this.targetFile = getFile(plugin.app.workspace.getLastOpenFiles()[0]);
      break;
    case "active":
      this.targetFile = plugin.app.workspace.getActiveFile();
      break;
  }

  const filePath = this.targetFile?.path ?? "";

  this.targetFileComponent?.setValue(filePath);

  plugin.settings.targetFilePath = filePath;
  await plugin.saveSettings();
}


export async function manuallySetTargetFile(this: HeadingExtractorComponent, file: TFile): Promise<void> {
  this.targetFile = file;
  this.parent.settings.targetFileMethod = "manualSet";
  this.parent.settings.targetFilePath = file.path;
  this.targetFileComponent?.setValue(file.path);
  await this.parent.saveSettings();
}


export async function setActiveFileAsTarget(this: HeadingExtractorComponent): Promise<boolean> {
  const activeFile = this.parent.app.workspace.getActiveFile();
  if (!activeFile) return false;
  await manuallySetTargetFile.bind(this)(activeFile);
  return true;
}


export async function setTargetFileFromOpenedFiles(this: HeadingExtractorComponent): Promise<boolean> {
  const mdLeaves = this.parent.app.workspace.getLeavesOfType("markdown");
  if (mdLeaves.length === 0) return false;

  const mdFiles = mdLeaves.map((leaf) => (leaf.view as MarkdownView).file);
  const targetFile = await runQuickSuggest(this.parent.app, mdFiles,
    (file: TFile) => file.path.slice(0, -3)
  );
  if (!targetFile) return false;

  await manuallySetTargetFile.bind(this)(targetFile);
  return true;
}


export async function setTargetFileFromVaultFiles(this: HeadingExtractorComponent): Promise<boolean> {
  const vaultFiles = this.parent.app.vault.getMarkdownFiles();
  if (vaultFiles.length === 0) return false;

  vaultFiles.sort((a, b) => b.stat.mtime - a.stat.mtime);
  const targetFile = await runQuickSuggest(this.parent.app, vaultFiles,
    (file: TFile) => file.path.slice(0, -3)
  );
  if (!targetFile) return false;

  await manuallySetTargetFile.bind(this)(targetFile);
  return true;
}

