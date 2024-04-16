import {
  App,
  Editor,
} from "obsidian";

import BundlePlugin from "main";
import { BundleComponent } from "main";



export default class MdEditingComponent implements BundleComponent {

  parent: BundlePlugin;
  settings: {
  };


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
    };
  }

  onload() {
    this.addCommands();
  }

  onunload(): void {
    (this.parent.app.workspace as any).iterateCodeMirrors((cm: any) => {
      cm.removeKeyMap("smart-strikethrough");
    });
  }

  addCommands(): void {
    const plugin = this.parent;

		// Behavior-tailored strikethrough
		plugin.addCommand({
			id: "smart-strikethrough",
			name: "Smart strikethrough",
			icon: "strikethrough",
			mobileOnly: false,
			repeatable: false,
			editorCallback: (editor: Editor) => {
				smartStrikethrough(editor);
			}
		});

  }

  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
  }

}



export function smartStrikethrough(editor: Editor, linewise: boolean = true) {

  // Full-line selection range (if any), cursor line range otherwise
  const editRange = {
    from: {line: editor.getCursor("from").line, ch: 0},
    to: {
      line: editor.getCursor("to").line,
      ch: editor.getLine(editor.getCursor("to").line).length
    },
  }

  // Get text to edit
  const isSingleLine = editRange.from.line === editRange.to.line;
  const oneLineSelection = isSingleLine && editor.somethingSelected();
  const editText = oneLineSelection ?
                   editor.getSelection() :
                   editor.getRange(editRange.from, editRange.to);

  let changes = [];
  let endCursorPos = editRange.from;

  // Unstrike
  if (editText.match(/~~/)) {
    changes.push({text: editText.replace(/~~/g, ""), ...editRange});
  }

  // Strike single line selection
  else if (oneLineSelection || !linewise) {
    changes.push({
      text: editText.replace(/^(\s*)(.*?)(\s*)$/, "$1~~$2~~$3"),
      from: editor.getCursor("from"),
      to: editor.getCursor("to"),
    });
    endCursorPos = editor.getCursor();
    endCursorPos.ch += 4; // To account for the added tildes (~~~~)
  }

  // Smart strike
  else {
    let regex = /^((?:\s*>{1,6} )?\s*(?:(?:[-*+]|\d{1,6}\.) )?\s*)(.*?)(\s*)$/;
    let lines = editText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      else {
        lines[i] = lines[i].replace(regex, "$1~~$2~~$3");
      }
    }
    changes.push({text: lines.join('\n'), ...editRange});
  }

  // Execute changes
  editor.transaction({changes, selection: {from: endCursorPos}});

}

