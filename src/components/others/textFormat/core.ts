import BundlePlugin, { BundlePluginComponent } from "main";

import {
  DEFAULT_SURROUND_PAIRS,
  smartSurround,
} from "./utils";



export default class TextFormatComponent implements BundlePluginComponent {

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
    // (this.parent.app.workspace as any).iterateCodeMirrors((cm: any) => {
    //   cm.removeKeyMap("smart-strikethrough");
    // });
  }


  addCommands(): void {
    const plugin = this.parent;

    DEFAULT_SURROUND_PAIRS.forEach(pair => {
      plugin.addCommand({
        id: `smart-${pair.name!.toLowerCase().replace(" ", "-")}`,
        name: `Smart ${pair.name!}`,
        icon: pair.icon,
        editorCallback: (editor) => smartSurround(editor, pair),
      });
    });

  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
  }

}

