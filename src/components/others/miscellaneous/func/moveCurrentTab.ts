import { App } from 'obsidian';




// NOTE: This function modifies the original array.
// TODO: Generalize to work with any numerical offset, not just 1.
function moveArrayElement(arr: any[], index: number, forwards: boolean) {
  // Remove the element from the array
  var element = arr.splice(index, 1)[0];
  var newIndex;

  if (forwards) {
    // If moving forward and at the end of the array, wrap around to the beginning
    if (index === arr.length) {
        arr.unshift(element);
        newIndex = 0;
    } else {
        arr.splice(index + 1, 0, element);
        newIndex = index + 1;
    }
  } else {
    // If moving backward and at the start of the array, wrap around to the end
    if (index === 0) {
      arr.push(element);
      newIndex = arr.length - 1;
    } else {
      arr.splice(index - 1, 0, element);
      newIndex = index - 1;
    }
  }

  return newIndex;
}




export default function moveCurrentTab(app: App, args: {forwards: boolean}) {
  const activeTabGroup = (app.workspace as any).activeTabGroup;

  activeTabGroup.currentTab = moveArrayElement(
    activeTabGroup.children, activeTabGroup.currentTab, args.forwards
  );

  activeTabGroup.updateTabDisplay();
}

