// UNUSED

import { App, MarkdownView } from 'obsidian';



export function getOpenMarkdownViews(app: App): MarkdownView[] {
  return app.workspace
    .getLeavesOfType('markdown')
    .map((leaf) => leaf.view as MarkdownView);
}


export function getActiveView(app: App): MarkdownView | null {
  return app.workspace.getActiveViewOfType(MarkdownView);
}


export function getCodeMirrorEditor(view: MarkdownView): CodeMirror.Editor {
  return (view.editor as any).editMode?.editor?.cm?.cm;
}

