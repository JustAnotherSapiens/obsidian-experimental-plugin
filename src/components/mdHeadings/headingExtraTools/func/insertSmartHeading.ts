import {
  MarkdownView,
  Editor,
  EditorChange,
  EditorPosition,
} from "obsidian";

import {
  scrollActiveLineByTriggerBounds,
} from "utils/obsidian/scroll";

import {
  HeadingNode,
  HeadingTree,
  MarkdownLevel,
} from "components/mdHeadings/headingExtractor/utils/dataStructures";




export type HeadingData = {
  level: MarkdownLevel,
  title?: string,
  contents?: string,
}


// NOTE: When referencing Markdown heading levels:
// - 1 is the highest level (H1)
// - 6 is the lowest level (H6)

function getSmartHeadingInsertionPosition(editor: Editor, insertionLevel: MarkdownLevel, skewUpwards: boolean, referenceLine?: number): EditorPosition {

  referenceLine = referenceLine ?? editor.getCursor("from").line;

  const headingTree = new HeadingTree(editor.getValue());
  const currentNode = headingTree.getNodeAtLine(referenceLine) ?? headingTree.root;
  const currentNodeLevel = currentNode.heading.level.bySyntax;

  let insertionPos: EditorPosition;

  switch (true) {

    // Lower-level heading insertion (H6 > H1)
    case insertionLevel > currentNodeLevel:

      if (currentNode.children.length > 0) {

        // Find the first equal-level child of the current node
        const firstEqualLevelChild = currentNode.children.find(node => node.heading.level.bySyntax === insertionLevel);

        if (skewUpwards && firstEqualLevelChild !== undefined) {
          // Insert as a child of the current node, before the first equal-level child.
          insertionPos = firstEqualLevelChild.getHeadingRange().from;

        } else {
          // Find the first higher-level child of the current node
          const firstHigherLevelChild = currentNode.children.find(node => node.heading.level.bySyntax < insertionLevel);

          if (firstHigherLevelChild !== undefined) {
            // Insert as a child of the current node, before the first higher-level child.
            insertionPos = firstHigherLevelChild.getHeadingRange().from;
          } else {
            // Insert as a child of the current node, after its last child.
            insertionPos = currentNode.children[currentNode.children.length - 1].getHeadingRange().to;
          }
        }

      } else {
        // Insert as a child of the current node.
        insertionPos = currentNode.getHeadingRange().to;
      }

      break;


    // Same-level heading insertion
    case insertionLevel === currentNodeLevel:

      // TODO: Add a setting to insert either:
      // - Above or below the current heading, or
      // - At the start or end of the current sibling section

      if (skewUpwards) {
        // Insert as sibling above the current node
        insertionPos = currentNode.getHeadingRange().from;
      } else {
        // Insert as sibling below the current node
        insertionPos = currentNode.getHeadingRange().to;
      }

      break;


    // Higher-level heading insertion (H1 < H6)
    case insertionLevel < currentNodeLevel:

      // Get the first equal or higher parent node (ascending from the current node)
      let firstEqualOrHigherParent = currentNode;
      while (firstEqualOrHigherParent.heading.level.bySyntax > insertionLevel) {
        firstEqualOrHigherParent = firstEqualOrHigherParent.parent as HeadingNode;
      }

      if (firstEqualOrHigherParent === headingTree.root) {

        // Find the first equal or higher heading in the document
        const firstEqualOrHigherHeading = headingTree.find(node => {
          return node.heading.level.bySyntax <= insertionLevel;
        });

        if (firstEqualOrHigherHeading !== undefined) {
          // Insert above the first equal or higher heading in the document
          insertionPos = firstEqualOrHigherHeading.getHeadingRange().from;
        } else {
          // Insert at the end of the document
          insertionPos = headingTree.root.getHeadingRange().to;
        }

      } else {

        if (firstEqualOrHigherParent.heading.level.bySyntax === insertionLevel) {

          if (skewUpwards) {
            // Insert above the first equal or higher parent
            insertionPos = firstEqualOrHigherParent.getHeadingRange().from;
          } else {
            // Insert below the first equal or higher parent
            insertionPos = firstEqualOrHigherParent.getHeadingRange().to;
          }

        } else {
          
          // Find the first equal-level child of the higher parent
          const firstEqualLevelChild = firstEqualOrHigherParent.children.find(node => node.heading.level.bySyntax <= insertionLevel);

          if (skewUpwards && firstEqualLevelChild !== undefined) {
            // Insert as a child of the higher parent, before the first equal or higher child.
            insertionPos = firstEqualLevelChild.getHeadingRange().from;

          } else {
            // Find the first higher-level child of the higher parent
            const firstHigherLevelChild = firstEqualOrHigherParent.children.find(node => node.heading.level.bySyntax < insertionLevel);

            if (firstHigherLevelChild !== undefined) {
              // Insert as a child of the higher parent, before the first higher-level child.
              insertionPos = firstHigherLevelChild.getHeadingRange().from;
            } else {
              // Insert as a child of the higher parent, after its last child.
              insertionPos = firstEqualOrHigherParent.children[firstEqualOrHigherParent.children.length - 1].getHeadingRange().to;
            }

          }

        }

      }

      break;

    default:
      console.error("ERROR(insertSmartHeading): Invalid heading level. Inserting at the end of the document.");
      console.error("This code should never be reached.");
      insertionPos = headingTree.root.getHeadingRange().to;
  }

  return insertionPos;
}



export type SmartHeadingArgs = {
  level: MarkdownLevel,
  title?: string,
  contents?: string,
  ignoreSelection: boolean,
  skewUpwards: boolean,
  vimMode: boolean,
  referenceLine?: number,
}


// NOTE: The offset displacement problem arises when removing lines above the line where we want to insert the heading.
export default function insertSmartHeading(view: MarkdownView, args: SmartHeadingArgs): void {
  if (!args.level) return;

  const editor = view.editor;
  const changes: EditorChange[] = [];


  const properLineSpacing = (lineStr: string) => {
    if (lineStr === '') return '';
    if (lineStr.endsWith('\n')) return lineStr;
    return lineStr + '\n';
  };


  let headingContentsString = '';

  // If the contents are provided the selected text will be ignored.
  if (args.contents !== undefined) {
    headingContentsString += properLineSpacing(args.contents);
    // console.debug('ARGS.CONTENTS PROVIDED');
    // console.debug(`headingContentsString: '${headingContentsString}'`);
  }



  // Insertion position calculated from the current cursor position
  const insertionPos = getSmartHeadingInsertionPosition(editor, args.level, args.skewUpwards, args.referenceLine);


  let endCursorLineOffset = 0;
  let vimVisualLineSelection = false;


  // TODO: Handle the following edge cases:
  // - When in vim visual line mode an empty line is selected
  // - When in vim visual line mode the last line is selected
  if (!args.ignoreSelection && editor.somethingSelected()) {

    const selectionFrom = editor.getCursor("from");
    let selectionTo = editor.getCursor("to");

    if (args.vimMode) {
      const cm = (editor as any).cm.cm;

      if (cm.state.vim.visualLine) {
        vimVisualLineSelection = true;
        // Fix the ending range position to remove the newline character
        selectionTo = {
          line: selectionTo.line + 1,
          ch: 0,
        }
      }
    }

    const selectionString = editor.getRange(selectionFrom, selectionTo);

    if (headingContentsString.trimEnd() !== '') {
      // Append the selected text to the heading contents
      headingContentsString += properLineSpacing(selectionString);
      // console.debug('APPENDING SELECTED TEXT');
      // console.debug(`headingContentsString: '${headingContentsString}'`);
    } else {
      // Replace blank heading contents with the selected text
      headingContentsString = properLineSpacing(selectionString);
      // console.debug('REPLACING BLANK CONTENTS');
      // console.debug(`headingContentsString: '${headingContentsString}'`);
    }

    // Remove the selected text.
    // NOTE: When we remove lines above the insertion position, the cursor will be displaced by the number of lines removed.
    changes.push({
      text: '',
      from: selectionFrom,
      to: selectionTo,
    });

    // Calculate the offset displacement
    if (selectionFrom.line < insertionPos.line) {
      endCursorLineOffset = selectionFrom.line - selectionTo.line; // Negative offset
    }

  }


  // Heading header with a new line at the end
  const headingHeaderString = '#'.repeat(args.level) + ' ' + (args.title ?? '') + '\n';


  // Craft the heading section
  let headingSectionString = (
    headingHeaderString +
    headingContentsString +
    '\n' // Extra separation line
  );



  // End-of-file correction
  if (insertionPos.line === editor.lineCount()) {
    headingSectionString = '\n' + headingSectionString.substring(0, headingSectionString.length - 1);
  }



  // Insert the crafted heading at the calculated position
  changes.push({
    text: headingSectionString,
    from: insertionPos,
  });


  // End cursor line after the heading contents (if any)
  const endCursorLine = insertionPos.line + headingContentsString.split('\n').length - 1 + endCursorLineOffset;

  // Apply the changes to the editor
  editor.transaction({
    changes,
    selection: {
      from: {
        line: endCursorLine,
        ch: Infinity,
      }
    }
  });


  // Scroll the final cursor position into view
  scrollActiveLineByTriggerBounds(view, {
    bounds: {top: 0.15, bottom: 0.45},
  });


  // Get into insert mode if vim mode is enabled
  if (args.vimMode) {
    const cm = (editor as any).cm.cm;
    // if (!args.ignoreSelection && editor.somethingSelected() && cm.state.vim.visualLine)
    if (!cm.state.vim.insertMode && !vimVisualLineSelection) {
      const vim = (window.CodeMirror as any).Vim;
      vim.handleKey(cm, 'a');
    }
  }

}



// FLEXIBLE CODE FOR LOGIC DEPURATION

        // if (skewUpwards) {

        //   // Find the first equal-level child
        //   const firstEqualLevelChild = currentNode.children.find(node => node.heading.level.bySyntax === insertionLevel);

        //   if (firstEqualLevelChild !== undefined) {
        //     // Insert as a child of the current node, before the first equal-level child.
        //     insertionPos = firstEqualLevelChild.getHeadingRange().from;

        //   } else {

        //     // Find the first higher-level child
        //     const firstHigherLevelChild = currentNode.children.find(node => node.heading.level.bySyntax < insertionLevel);

        //     if (firstHigherLevelChild !== undefined) {
        //       // Insert as a child of the current node, before the first higher-level child.
        //       insertionPos = firstHigherLevelChild.getHeadingRange().from;
        //     } else {
        //       // Insert as a child of the current node, after its last child.
        //       insertionPos = currentNode.children[currentNode.children.length - 1].getHeadingRange().to;
        //     }

        //   }

        // } else {

        //   // Find the first higher-level child
        //   const firstHigherLevelChild = currentNode.children.find(node => node.heading.level.bySyntax < insertionLevel);

        //   if (firstHigherLevelChild !== undefined) {
        //     // Insert as a child of the current node, before the first higher-level child.
        //     insertionPos = firstHigherLevelChild.getHeadingRange().from;
        //   } else {
        //     // Insert as a child of the current node, after its last child.
        //     insertionPos = currentNode.children[currentNode.children.length - 1].getHeadingRange().to;
        //   }
        // }







    // // Lower-level heading insertion (H6 > H1)
    // case insertionLevel > currentNodeLevel:

    //   if (currentNode.children.length > 0) {

    //     let referenceNode: HeadingNode | undefined;

    //     if (skewUpwards) { // Find the first equal-level child
    //       referenceNode = currentNode.children.find(node => node.heading.level.bySyntax === insertionLevel);
    //     } else { // Find the first higher-level child
    //       referenceNode = currentNode.children.find(node => node.heading.level.bySyntax < insertionLevel);
    //     }

    //     if (referenceNode !== undefined) {
    //       // Insert as a child of the current node, before the reference node.
    //       insertionPos = referenceNode.getHeadingRange().from;
    //     } else {
    //       // Insert as a child of the current node, after its last child.
    //       insertionPos = currentNode.children[currentNode.children.length - 1].getHeadingRange().to;
    //     }

    //   } else {
    //     // Insert as a child of the current node.
    //     insertionPos = currentNode.getHeadingRange().to;
    //   }

    //   break;

