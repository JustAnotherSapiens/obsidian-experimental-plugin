import {
  App,
  Notice,
  MarkdownView,
  Editor,
} from "obsidian";

import {
  getActiveFileCache,
  getHeadingIndex,
} from "utils/obsidian/cache";

import { getSetting } from "utils/obsidian/settings";

import {
  scrollToCursor,
  customActiveLineScroll,
} from "utils/obsidian/scroll";

import { DateTimeFormat, getMatchedDate } from "utils/time";

import { isCodeBlockEnd } from "components/mdHeadings/utils/helpers";

import { HeadingTree, MarkdownLevel } from "components/mdHeadings/headingExtractor/utils/dataStructures";
import { runQuickSuggest } from "suggests/quickSuggest";