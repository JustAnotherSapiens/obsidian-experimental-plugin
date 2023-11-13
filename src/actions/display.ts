import { newMultilinePluginNotice } from "./generics";


export function showCurrentDateAndTime() {
  newMultilinePluginNotice([
    window.moment().format("dddd ([UTC]Z)"),
    window.moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
    // window.moment().format("ddd YYYY-MM-DD HH:mm:ss Z"),
  ], "font-size: 1em; font-style: italic; text-align: center;", 0);
}


/* UI FUNCTIONS */


export function moveCurrentTab(
  direction: "left" | "right"
) {
  const activeTabGroup = this.app.workspace.activeTabGroup;
  const tabsArray = activeTabGroup.children;
  const currentTabIdx = activeTabGroup.currentTab;

  const forward = direction === "right";
  const newCurrentTabIdx = moveArrayElement(tabsArray, currentTabIdx, forward);
  // console.log("New Index:", newCurrentTabIdx);

  activeTabGroup.currentTab = newCurrentTabIdx;
  activeTabGroup.updateTabDisplay();
}


// NOTE: This function modifies the original array.
function moveArrayElement(
  arr: any[],
  index: number,
  forward: boolean
) {
  // Remove the element from the array
  var element = arr.splice(index, 1)[0];
  var newIndex;

  if (forward) {
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
