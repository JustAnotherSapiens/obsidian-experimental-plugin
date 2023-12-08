import { Plugin } from "obsidian";

export default interface BundleComponent {
  settings: { [key: string]: any };
  parent: Plugin;
  onload(): void;
  onunload(): void;
  // addCommands(): void;
  // addRibbonIcons(): void;
  // addStatusBarItems(): void;
  // addEventsAndIntervals(): void;
  addSettings(containerEl: HTMLElement): void;
}
