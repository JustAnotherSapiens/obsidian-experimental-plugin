import { newMultilinePluginNotice } from "./generics";


export function showCurrentDateAndTime() {
  newMultilinePluginNotice([
    window.moment().format("dddd ([UTC]Z)"),
    window.moment().format("YYYY-MM-DD HH:mm:ss.SSS"),
    // window.moment().format("ddd YYYY-MM-DD HH:mm:ss Z"),
  ], "font-size: 1em; font-style: italic; text-align: center;", 0);
}

