import {
  Setting, Notice,
  Editor, MarkdownView, HeadingCache,
  ToggleComponent, DropdownComponent, TextComponent,
} from "obsidian";

import BundlePlugin from "main";
import BundleComponent from "types";

import {
  getSetting,
  getHeadingIndex,
  scrollToCursor,
} from "utils";



// type LevelZeroBehavior = "snap-contiguous" | "snap-parent" | "on-parent-behavior";
type SiblingMode = "strictSibling" | "looseSibling";



export default class MoveComponent implements BundleComponent {

  parent: BundlePlugin;
  settings: {
    // levelZeroBehavior: LevelZeroBehavior,
    siblingMode: SiblingMode,
    scrollOffset: number,
    globalWrapAround: boolean,
    contiguousWrapAround: boolean,
    looseSiblingWrapAround: boolean,
    strictSiblingWrapAround: boolean,
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
      // levelZeroBehavior: "snap-contiguous",
      siblingMode: "looseSibling",
      scrollOffset: 0,
      globalWrapAround: false,
      contiguousWrapAround: false,
      looseSiblingWrapAround: false,
      strictSiblingWrapAround: false,
    };
  }

  onload() {
    this.addCommands();
  }

  onunload(): void {}

  addCommands(): void {
    const plugin = this.parent;

		/* TOGGLE SETTINGS */

		// Toggle Wrap Around
		plugin.addCommand({
			id: "toggle-global-wrap-around",
			name: "Toggle wrap around globally",
			icon: "arrow-right",
			callback: async () => {
				const wrapAround = plugin.settings.globalWrapAround;
				if (wrapAround) {
					plugin.settings.globalWrapAround = false;
					plugin.settings.contiguousWrapAround = false;
					plugin.settings.looseSiblingWrapAround = false;
					plugin.settings.strictSiblingWrapAround = false;
				} else {
					plugin.settings.globalWrapAround = true;
					plugin.settings.contiguousWrapAround = true;
					plugin.settings.looseSiblingWrapAround = true;
					plugin.settings.strictSiblingWrapAround = true;
				}
				new Notice(`Global Wrap Around: ${String(!wrapAround).toUpperCase()}`, 3000);
				await plugin.saveSettings();
			}
		});

		// Toggle Sibling Mode
		plugin.addCommand({
			id: "toggle-sibling-mode",
			name: "Toggle sibling mode (loose/strict)",
			icon: "arrow-right",
			callback: async () => {
				const siblingMode = plugin.settings.siblingMode;
				if (siblingMode === "strictSibling") {
					plugin.settings.siblingMode = "looseSibling";
				}
				else if (siblingMode === "looseSibling") {
					plugin.settings.siblingMode = "strictSibling";
				}
				new Notice(`Sibling Mode: ${plugin.settings.siblingMode}`, 3000);
				await plugin.saveSettings();
			}
		});

		/* MOVE CURSOR TO HEADING */

		// Move cursor to next sibling heading down
		plugin.addCommand({
			id: "sibling-heading-down",
			name: "Move cursor to next sibling heading down",
			icon: "arrow-down",
			editorCallback: (editor: Editor) => {
				const siblingMode = plugin.settings.siblingMode;
        moveCursorToHeading(editor, siblingMode, {backwards: false});
			}
		});

		// Move cursor to next sibling heading up
		plugin.addCommand({
			id: "sibling-heading-up",
			name: "Move cursor to next sibling heading up",
			icon: "arrow-up",
			editorCallback: (editor: Editor) => {
				const siblingMode = plugin.settings.siblingMode;
        moveCursorToHeading(editor, siblingMode, {backwards: true});
			}
		});

		// Move cursor to parent heading
		plugin.addCommand({
			id: "parent-heading",
			name: "Move cursor to parent heading",
			icon: "arrow-up",
			editorCallback: (editor: Editor) => {
        moveCursorToHeading(editor, "parent");
			}
		});

		// Move cursor to next contiguous heading down
		plugin.addCommand({
			id: "contiguous-heading-down",
			name: "Move cursor to contiguous heading down",
			icon: "arrow-down",
			editorCallback: (editor: Editor) => {
        moveCursorToHeading(editor, "contiguous", {backwards: false});
			}
		});

		// Move cursor to next contiguous heading up
		plugin.addCommand({
			id: "contiguous-heading-up",
			name: "Move cursor to contiguous heading up",
			icon: "arrow-up",
			editorCallback: (editor: Editor) => {
				moveCursorToHeading(editor, "contiguous", {backwards: true});
			}
		});

  }

  addRibbonIcons(): void {}
  addStatusBarItems(): void {}
  addEventsAndIntervals(): void {}

  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;

		containerEl.createEl("h3", {text: "Heading Movement Settings"});

		/* Global Settings */

		// Sibling Mode
		new Setting(containerEl)
		  .setName("Sibling mode")
			.then((setting: Setting) => {
				const fragment = document.createDocumentFragment();
				fragment.append(
					fragment.createEl("b", {text: "Strict: "}),
					"Same heading level and parent required.",
					fragment.createEl("br"),
					fragment.createEl("b", {text: "Loose: "}),
					"Only same heading level required.",
				);
				setting.setDesc(fragment);
			})
			.addDropdown((dropdown: DropdownComponent) => {
				dropdown.addOptions({
					"strictSibling": "Strict",
					"looseSibling":  "Loose",
				});
				dropdown.setValue(plugin.settings.siblingMode);
				dropdown.onChange(async (value: SiblingMode) => {
					plugin.settings.siblingMode = value;
					await plugin.saveSettings();
				});
			});

		// Scroll Offset
		new Setting(containerEl)
		  .setName("Scroll offset")
			.setDesc("Minimum number of offset lines visible from the cursor position when moving to a heading.")
			.addText((textField: TextComponent) => {
				textField.inputEl.type = "number";
				textField.setPlaceholder("scroll_offset");
				textField.setValue(String(plugin.settings.scrollOffset));
				textField.onChange(async (value: string) => {
					plugin.settings.scrollOffset = Number(value);
					await plugin.saveSettings();
				});
			});

		/* Wrap Around Settings */
    containerEl.createEl("h5", {text: "Wrap around..."});

		new Setting(containerEl)
		  .setName("...for contiguous headings")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(plugin.settings.contiguousWrapAround);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.contiguousWrapAround = value;
					await plugin.saveSettings();
				});
			});

		new Setting(containerEl)
		  .setName("...for loose siblings")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(plugin.settings.looseSiblingWrapAround);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.looseSiblingWrapAround = value;
					await plugin.saveSettings();
				});
			});

		new Setting(containerEl)
		  .setName("...for strict siblings")
			.addToggle((toggle: ToggleComponent) => {
				toggle.setValue(plugin.settings.strictSiblingWrapAround);
				toggle.onChange(async (value: boolean) => {
					plugin.settings.strictSiblingWrapAround = value;
					await plugin.saveSettings();
				});
			});

  }

}


////////////////////////////////////////////////////////////////////////////////
// TOP LEVEL FUNCTIONS
////////////////////////////////////////////////////////////////////////////////

const movementFunctions = {
  contiguous: contiguousHeading,
  parent: parentHeading,
  looseSibling: looseSiblingHeading,
  strictSibling: strictSiblingHeading,
  lastChild: lastChildHeading,
}
type MovementMode = keyof typeof movementFunctions;

const wrapableMovementModes = ["contiguous", "looseSibling", "strictSibling"];
// type WrapableMovementMode = Exclude<MovementMode, ["lastChild", "parent"]>;

type MovementFunction = (args: MovementArgs) => number;
type SearchFunction = (args: MovementArgs) => {found: boolean, line: number};

type MovementArgs = {
  lines: string[],
  startLine: number,
  inCodeBlock: boolean,
  headingLevel: number,
  backwards?: boolean,
  wrapAround?: boolean,
}


function moveCursorToHeading(
  editor: Editor,
  mode: MovementMode,
  opts?: {backwards: boolean}
) {
  const lines = editor.getValue().split('\n');
  const startLine = editor.getCursor().line;

  let inCodeBlock = false;
  for (let i = 0; i <= startLine; i++) {
    if (lines[i].trim().startsWith('```')) inCodeBlock = !inCodeBlock;
  }

  const headingLevel = !inCodeBlock ? getCurrentHeadingLevel(editor) : 0;
  let backwards = opts?.backwards;

  let wrapAround = wrapableMovementModes.includes(mode)
                   ? getSetting(`${mode}WrapAround`)
                   : false;

  const args: MovementArgs = {
    lines, startLine, inCodeBlock, headingLevel, backwards, wrapAround
  };

  const movementLine = movementFunctions[mode](args);
  console.log("movementLine:", movementLine);
  

  if(movementLine !== -1 && movementLine !== startLine) {
    editor.setCursor({line: movementLine, ch: 0});
    scrollToCursor(editor, getSetting("scrollOffset"))
    // const cursorPos = editor.getCursor();
    // editor.scrollIntoView({from: cursorPos, to: cursorPos}, true);
  }

}


function getCurrentHeadingLevel(editor: Editor) {
  const cursorLine = editor.getCursor().line;
  const match = editor.getLine(cursorLine).match(/^#{1,6} /);
  if (match) return match[0].length - 1;
  else return 0;
}



////////////////////////////////////////////////////////////////////////////////
// MOVE CURSOR FUNCTIONS
////////////////////////////////////////////////////////////////////////////////

function contiguousHeading(args: MovementArgs) {
  return searchContiguousHeading(args);
}

function looseSiblingHeading(args: MovementArgs) {
  if (args.headingLevel === 0) {
    const foundLine = searchContiguousHeading(
      Object.assign({}, args, {backwards: true, wrapAround: false})
    );
    if (foundLine < 0) return -1;
    if (args.backwards) return foundLine;
    args.startLine = foundLine;
    args.headingLevel = getHeadingLevel(args.lines[foundLine]);
  }

  return searchLooseSiblingHeading(args);
}


function strictSiblingHeading(args: MovementArgs) {
  if (args.headingLevel === 0) {
    const foundLine = searchContiguousHeading(
      Object.assign({}, args, {backwards: true, wrapAround: false})
    );
    if (foundLine < 0) return -1;
    if (args.backwards) return foundLine;
    args.startLine = foundLine;
    args.headingLevel = getHeadingLevel(args.lines[foundLine]);
  }

  if (args.headingLevel === 1)
    return searchLooseSiblingHeading(args);
  else
    return searchStrictSiblingHeading(args);
}


function parentHeading(args: MovementArgs) {
  if (args.headingLevel === 1) return -1;
  if (args.headingLevel === 0) {
    args.backwards = true;
    return searchContiguousHeading(args);
  }
  return searchParentHeading(args);
}

function lastChildHeading(args: MovementArgs) {
  if (args.headingLevel >= 6) return -1;
  if (args.headingLevel === 0) {
    args.backwards = false;
    return searchContiguousHeading(args);
  }
  return searchLastChildHeading(args);
}



////////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS
////////////////////////////////////////////////////////////////////////////////

function isCodeBlockEnd(line: string): boolean {
  return line.trim().startsWith('```');
}

function getOffset(args: MovementArgs): number {
  if (args.startLine === args.lines.length - 1 || args.startLine === 0) return 0;
  if (!args.backwards) return 1;
  if (isCodeBlockEnd(args.lines[args.startLine])) return 0;
  return -1;
}

function getHeadingLevel(line: string): number {
  return line.match(/^#+/)![0].length;
}


////////////////////////////////////////////////////////////////////////////////
// SEARCH FUNCTIONS
////////////////////////////////////////////////////////////////////////////////


function searchContiguousHeading(args: MovementArgs, wrapSearch: boolean = false): number {
  let {lines, inCodeBlock, backwards} = args;
  const offset = getOffset(args);
  const step = backwards ? -1 : 1;
  let nextHeadingLine = -1;
  for (let i = args.startLine + offset; (backwards ? i >= 0 : i < lines.length); i += step) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (/^#{1,6} /.test(lines[i])) {
      nextHeadingLine = i; break;
    }
  }

  if (nextHeadingLine === -1 && args.wrapAround && !wrapSearch) {
    args.startLine = backwards ? lines.length - 1 : 0;
    return searchContiguousHeading(args, true);
  }

  return nextHeadingLine;
}


function searchLooseSiblingHeading(args: MovementArgs, wrapSearch: boolean = false): number {
  let {lines, inCodeBlock, backwards} = args;
  const siblingHeadingRegex = new RegExp(`^#{${args.headingLevel}} `);
  const offset = getOffset(args);
  const step = backwards ? -1 : 1;
  let siblingHeadingLine = -1;
  for (let i = args.startLine + offset; (backwards ? i >= 0 : i < lines.length); i += step) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (siblingHeadingRegex.test(lines[i])) {
      siblingHeadingLine = i; break;
    }
  }

  if (siblingHeadingLine === -1 && args.wrapAround && !wrapSearch) {
    args.startLine = backwards ? lines.length - 1 : 0;
    return searchLooseSiblingHeading(args, true);
  }

  return siblingHeadingLine;
}


// To be used when args.headingLevel > 1
function searchStrictSiblingHeading(args: MovementArgs, wrapSearch: boolean = false): number {
  let {lines, inCodeBlock, backwards} = args;
  const equalOrHigherHeadingRegex = new RegExp(`^#{1,${args.headingLevel}} `);
  const headingString = '#'.repeat(args.headingLevel) + ' ';
  const offset = getOffset(args);
  const step = backwards ? -1 : 1;
  let siblingHeadingLine = -1;

  for (let i = args.startLine + offset; (backwards ? i >= 0 : i < lines.length); i += step) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (equalOrHigherHeadingRegex.test(lines[i])) {
      if (lines[i].startsWith(headingString)) {
        siblingHeadingLine = i; break;
      } else break;
    }
  }

  if (siblingHeadingLine === -1 && args.wrapAround && !wrapSearch) {
    const {start, end} = getSiblingHeadingSectionBounds(args);
    args.startLine = backwards ? end : start;
    console.log("start:", start, "end:", end);
    
    return searchStrictSiblingHeading(args, true);
  }

  return siblingHeadingLine;
}


// To be used when args.headingLevel > 1
function getSiblingHeadingSectionBounds(args: MovementArgs): {start: number, end: number} {
  let {lines, inCodeBlock, headingLevel} = args;
  const superiorHeadingRegex = new RegExp(`^#{1,${headingLevel - 1}} `);

  let upperHeadingLine = -1;
  for (let i = args.startLine - 1; i >= 0; i--) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (superiorHeadingRegex.test(lines[i])) {
      upperHeadingLine = i;
      break;
    }
  }

  let lowerHeadingLine = -1;
  for (let i = args.startLine + 1; i < lines.length; i++) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (superiorHeadingRegex.test(lines[i])) {
      lowerHeadingLine = i;
      break;
    }
  }

  const start = upperHeadingLine === -1 ? 0 : upperHeadingLine;
  const end = lowerHeadingLine === -1 ? lines.length - 1 : lowerHeadingLine;
  return {start, end};
}



function searchParentHeading(args: MovementArgs): number {
  let {lines, inCodeBlock, headingLevel} = args;
  const offset = isCodeBlockEnd(lines[args.startLine]) ? 0 : -1;
  let parentHeadingLine = -1;
  for (let i = args.startLine + offset; i >= 0; i--) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (/^#{1,6} /.test(lines[i])) {
      // const foundHeadingLevel = lines[i].match(/^#+/)![0].length;
      if (headingLevel === 0 || getHeadingLevel(lines[i]) < headingLevel) {
        parentHeadingLine = i; break;
      }
    }
  }
  return parentHeadingLine;
}


function searchLastChildHeading(args: MovementArgs): number {
  let {lines, inCodeBlock, headingLevel} = args;
  let lastChildHeadingLine = -1;
  let lowestChildLevel = 6;
  for (let i = args.startLine + 1; i < lines.length; i++) {
    if (isCodeBlockEnd(lines[i])) {
      inCodeBlock = !inCodeBlock; continue;
    } else if (inCodeBlock) continue;
    if (/^#{1,6} /.test(lines[i])) {
      // const foundHeadingLevel = lines[i].match(/^#+/)![0].length;
      const foundHeadingLevel = getHeadingLevel(lines[i]);
      if (foundHeadingLevel <= headingLevel) break;
      // // foundHeadingLevel will never be greater than 6 at this point.
      // if (foundHeadingLevel > lowestChildLevel) continue;
      if (foundHeadingLevel < lowestChildLevel) {
        lowestChildLevel = foundHeadingLevel;
      }
      lastChildHeadingLine = i;
    }
  }
  return lastChildHeadingLine;
}






  // TODO: Deprecate the "levelZeroBehavior" setting in favor of strong defaults.

  // let mode = mode;
  // if (headingLevel === 0) {
  //   switch (getSetting("levelZeroBehavior")) {
  //     case "snap-contiguous":
  //       if (mainMode === "parent") args.backwards = true;
  //       mode = "contiguous";
  //       break;
  //     case "snap-parent":
  //       mode = "parent";
  //       break;
  //     case "on-parent-behavior":
  //       const parentLine = movementFunctions.parent(args);
  //       if (parentLine === -1) return;
  //       else args.startLine = parentLine;
  //     default:
  //       break;
  //   }
  // }

		// // Level Zero Behavior
		// new Setting(containerEl)
		//   .setName("Movement at no heading line")
		// 	.setDesc("How to behave on any heading movement action when the cursor is not on a heading line.")
		// 	.addDropdown((dropdown: DropdownComponent) => {
		// 		dropdown.addOptions({
		// 			"snap-contiguous":    "Snap to contiguous",
		// 			"snap-parent":        "Snap to parent",
		// 			"on-parent-behavior": "Behave as if parent",
		// 		});
		// 		dropdown.setValue(plugin.settings.levelZeroBehavior);
		// 		dropdown.onChange(async (value: LevelZeroBehavior) => {
		// 			plugin.settings.levelZeroBehavior = value;
		// 			await plugin.saveSettings();
		// 		});
		// 	});

