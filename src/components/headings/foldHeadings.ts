import {
  App,
  MarkdownView,
  Editor,
  Setting,
  ToggleComponent,
  HeadingCache,
} from "obsidian";

import BundlePlugin from "main";
import { BundleComponent } from "main";

import {
  getSetting,
  getActiveFileCache,
  getHeadingIndex,
  scrollToCursor,
  customActiveLineScroll,
} from "utils/utilsCore";



export type Fold = {from: number, to: number};



export default class FoldHeadingsComponent implements BundleComponent {

  parent: BundlePlugin;
  settings: {
    alwaysUnfoldParent: boolean,
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      alwaysUnfoldParent: false,
    };
  }


  onload() {
    this.addCommands();
  }

  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;

		plugin.addCommand({
			id: "toggle-fold-sibling-headings",
			name: "Toggle fold on sibling headings",
			icon: "fold-vertical",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await cleanToggleFoldOnSiblingHeadings(editor, view);
			}
		});

		plugin.addCommand({
			id: "toggle-fold-children-headings",
			name: "Toggle fold on children headings",
			icon: "fold-vertical",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await cleanToggleFoldOnChildrenHeadings(editor, view);
			}
		});

		plugin.addCommand({
			id: "toggle-fold",
			name: "Toggle fold",
			icon: "fold-vertical",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				cleanToggleFold(editor, view);
			}
		});

  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
		containerEl.createEl("h3", {text: "Fold Settings"});

		new Setting(containerEl)
		  .setName("Always unfold parent when folding/unfolding children")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(plugin.settings.alwaysUnfoldParent);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.alwaysUnfoldParent = value;
					await plugin.saveSettings();
				});
			});

  }

}



function getFolds(view: MarkdownView): Array<Fold> {
  const foldInfo = (view.currentMode as any).getFoldInfo();
  if (foldInfo) return foldInfo.folds;
  return [];
}

function applyFolds(view: MarkdownView, folds: Array<Fold>): void {
  (view.currentMode as any).applyFoldInfo({
    folds, lines: view.editor.lineCount()
  });
  (view as any).onMarkdownFold();
}



// TODO: Rewrite without FileCache dependency.
async function cleanToggleFoldOnChildrenHeadings(
  editor: Editor,
  view: MarkdownView,
) {

  const fileHeadings = await getActiveFileCache("headings") as HeadingCache[];
  if (!fileHeadings) return;

  const cursorPos = editor.getCursor();
  const parentHeadingIdx = getHeadingIndex(fileHeadings, cursorPos.line, true);
  if (parentHeadingIdx === -1) return;
  if (parentHeadingIdx === fileHeadings.length - 1) return;

  // Ensure that the parent heading section has children.
  let nextSectionHeadingIdx = -1;
  let highestChildLevel = 6;
  for (let i = parentHeadingIdx + 1; i < fileHeadings.length; i++) {
    if (fileHeadings[i].level <= fileHeadings[parentHeadingIdx].level) {
      nextSectionHeadingIdx = i;
      break;
    }
    if (fileHeadings[i].level < highestChildLevel) {
      highestChildLevel = fileHeadings[i].level;
    }
  }
  if (nextSectionHeadingIdx === parentHeadingIdx + 1) return;
  if (nextSectionHeadingIdx === -1) nextSectionHeadingIdx = fileHeadings.length;

  // Get the first refChildHeadingIdx.
  let refChildHeadingIdx = -1;
  for (let i = parentHeadingIdx + 1; i < nextSectionHeadingIdx; i++) {
    if (fileHeadings[i].level === highestChildLevel) {
      refChildHeadingIdx = i;
      break;
    }
  }

  let {folds, unfold} = getToggledSiblingHeadingFolds(view, fileHeadings, refChildHeadingIdx);

  if (getSetting("alwaysUnfoldParent")) {
    const parentLine = fileHeadings[parentHeadingIdx].position.start.line;
    const parentFoldIdx = folds.findIndex((fold) => fold.from === parentLine);
    if (parentFoldIdx !== -1) {
      folds.splice(parentFoldIdx, 1);
    }
  }

  applyFolds(view, folds);

  customActiveLineScroll(view, {
    viewportThreshold: 0.5,
    scrollFraction: 0.3,
    asymmetric: true,
  });
}


// TODO: Rewrite without FileCache dependency.
async function cleanToggleFoldOnSiblingHeadings(
  editor: Editor,
  view: MarkdownView,
) {

  const fileHeadings = await getActiveFileCache("headings") as HeadingCache[];
  if (!fileHeadings) return;

  const cursorPos = editor.getCursor();
  const refHeadingIndex = getHeadingIndex(fileHeadings, cursorPos.line, true);
  if (refHeadingIndex === -1) return;

  const {folds} = getToggledSiblingHeadingFolds(view, fileHeadings, refHeadingIndex);

  applyFolds(view, folds);

  customActiveLineScroll(view, {
    viewportThreshold: 0.5,
    scrollFraction: 0.3,
    asymmetric: true,
  });
}


function getToggledSiblingHeadingFolds(
  view: MarkdownView,
  fileHeadings: HeadingCache[],
  refHeadingIndex: number,
): {folds: Array<Fold>, unfold: boolean} {

  let folds = getFolds(view);
  const unfold = folds.some(
    (fold: Fold) => fold.from === fileHeadings[refHeadingIndex].position.start.line
  );

  // Get sibling section info.
  const {headings, rangeEnd} = getSiblingsInfo(view.editor, fileHeadings, refHeadingIndex);

  if (unfold) {
    const headingLines = new Set(headings.map(heading => heading.position.start.line));
    folds = folds.filter((fold) => !headingLines.has(fold.from));
  } else {
    const siblingFoldRanges = headings.map((heading, idx) => ({
      from: heading.position.start.line,
      to: idx + 1 < headings.length ? headings[idx + 1].position.start.line - 1 : rangeEnd,
    }));
    siblingFoldRanges.forEach(range => folds.push(range));
    folds = [...new Set(folds)]; // Remove duplicates.
  }

  return {folds, unfold};
}


function getSiblingsInfo(
  editor: Editor,
  fileHeadings: HeadingCache[],
  refHeadingIndex: number,
) {

  const refHeadingLevel = fileHeadings[refHeadingIndex].level;
  const numberOfHeadings = fileHeadings.length;

  let upperBoundIdx = -1;
  let lowerBoundIdx = -1;
  for (let i = 0; i < numberOfHeadings; i++) {
    // Skip for equal or lower in hierarchy headings.
    if (fileHeadings[i].level >= refHeadingLevel) continue;
    // If we're past the reference heading, we've found the lower bound.
    if (i > refHeadingIndex) {
      lowerBoundIdx = i;
      break;
    // Otherwise, we've possibly found the upper bound.
    } else upperBoundIdx = i;
  }
  if (upperBoundIdx === -1) upperBoundIdx = 0;
  if (lowerBoundIdx === -1) lowerBoundIdx = numberOfHeadings;

  const siblingHeadings: HeadingCache[] = [];
  for (let i = upperBoundIdx; i < lowerBoundIdx; i++) {
    if (fileHeadings[i].level === refHeadingLevel) {
      siblingHeadings.push(fileHeadings[i]);
    }
  }

  const siblingRangeEnd = lowerBoundIdx !== numberOfHeadings ?
                          fileHeadings[lowerBoundIdx].position.start.line - 1 :
                          editor.lastLine();

  return {
    headings: siblingHeadings,
    rangeEnd: siblingRangeEnd,
  };
}


function cleanToggleFold(editor: Editor, view: MarkdownView) {
  editor.exec("toggleFold");
  // In this particular case the built-in scrollIntoView does the job.
  scrollToCursor(editor);
}

