import BundlePlugin, { BundlePluginComponent } from "main";

import { showCurrentDateAndTime } from "./utils/notice";



export default class TimeComponent implements BundlePluginComponent {

  parent: BundlePlugin;
  settings: Record<string, unknown>;


  constructor(plugin: BundlePlugin) {
    this.parent = plugin;
    this.settings = {
    };
  }


  onload(): void {
    this.addCommands();
    this.addRibbonIcons();
    // this.addStatusBarItems();
  }


  onunload(): void {}


  addCommands(): void {
    const plugin = this.parent;

		// Display Notice with current date and time
		plugin.addCommand({
			id: "show-current-date-and-time",
			name: "Show current date and time",
			icon: "calendar-clock",
			mobileOnly: false,
			repeatable: false,
			callback: () => showCurrentDateAndTime(),
		});

  }


  addRibbonIcons(): void {
    const plugin = this.parent;

		const ribbonIconEl = plugin.addRibbonIcon(
			"calendar-clock",
			"Timestamp Notice",
			() => showCurrentDateAndTime()
		);
		ribbonIconEl.addClass("experimental-plugin-ribbon-icon");
  }


  // Not working on the mobile version.
  addStatusBarItems(): void {
    const plugin = this.parent;

    // Other Formats:
    //   E YYYY-MM-DD HH:mm:ss
		plugin.addStatusBarItem().setText(
      window.moment().format("d MMM Do (HH:mm:ss)")
    );
  }


  addSettings(containerEl: HTMLElement): void {
    const plugin = this.parent;
  }

}

