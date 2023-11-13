import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Plugin,
} from "obsidian";

import {
	DEFAULT_SETTINGS,
	Settings,
	SettingTab,
} from "./settings";

import {
	showCurrentDateAndTime,
	moveCurrentTab,
} from "./actions/display";

import {
	smartStrikethrough,
} from "./actions/markdown/syntax";

import {
	moveCursorToHeading,
	// moveCursorToNextHeading,
} from "./actions/markdown/headings";



export default class ExperimentalPlugin extends Plugin {
	settings: Settings;


	async onload() {
		console.log("Loading Experimental Plugin");
		await this.loadSettings();
		this.addPluginCommands();
		this.addPluginRibbonIcons();
		this.addPluginStatusBarItems();
		this.addSettingTab(new SettingTab(this.app, this));
		this.addPluginEventsAndIntervals();
	}


	onunload() {
		console.log("Unloading Experimental Plugin");
	}


	addPluginCommands() {

		this.addCommand({
			id: "show-current-date-and-time",
			name: "Show current date and time",
			icon: "calendar-clock",
			mobileOnly: false,
			repeatable: false,
			callback: () => showCurrentDateAndTime(),
		});

		this.addCommand({
			id: "smart-strikethrough",
			name: "Smart strikethrough",
			icon: "strikethrough",
			mobileOnly: false,
			repeatable: false,
			editorCallback: (editor: Editor) => {
				smartStrikethrough(editor);
			}
		});

		/* TAB MOVEMENT */

		this.addCommand({
			id: "move-current-tab-left",
			name: "Move current tab left",
			icon: "arrow-left",
			mobileOnly: false,
			repeatable: false,
			callback: () => moveCurrentTab.call(this, "left"),
		});

		this.addCommand({
			id: "move-current-tab-right",
			name: "Move current tab right",
			icon: "arrow-right",
			mobileOnly: false,
			repeatable: false,
			callback: () => moveCurrentTab.call(this, "right"),
		});


		/* TOGGLE COMMANDS */

		this.addCommand({
			id: "toggle-line-numbers",
			name: "Toggle line numbers",
			icon: "numbered-list",
			mobileOnly: false,
			repeatable: false,
			callback: () => {
				const vault = this.app.vault as any;
				const showLineNumber = vault.getConfig("showLineNumber");
				vault.setConfig("showLineNumber", !showLineNumber);
				console.log("Line numbers:", !showLineNumber);
			}
		});

		this.addCommand({
			id: "toggle-vim-mode",
			name: "Toggle Vim mode",
			icon: "vim",
			mobileOnly: false,
			repeatable: false,
			callback: () => {
				const vault = this.app.vault as any;
				const vimMode = vault.getConfig("vimMode");
				vault.setConfig("vimMode", !vimMode);
				console.log("Vim mode:", !vimMode);
			}
		});


		/* CURSOR TO HEADING MOVEMENT */

		this.addCommand({
			id: "move-cursor-to-next-heading-down",
			name: "Move cursor to next heading down",
			icon: "arrow-down",
			mobileOnly: false,
			repeatable: true,
			editorCallback: async (editor: Editor) => {
				await moveCursorToHeading(editor, "next", "down");
			}
		});

		this.addCommand({
			id: "move-cursor-to-next-heading-up",
			name: "Move cursor to next heading up",
			icon: "arrow-up",
			mobileOnly: false,
			repeatable: true,
			editorCallback: async (editor: Editor) => {
				await moveCursorToHeading(editor, "next", "up");
			}
		});

		this.addCommand({
			id: "move-cursor-to-next-sibling-heading-down",
			name: "Move cursor to next sibling heading down",
			icon: "arrow-down",
			mobileOnly: false,
			repeatable: true,
			editorCallback: async (editor: Editor) => {
				await moveCursorToHeading(editor, "sibling", "down");
			}
		});

		this.addCommand({
			id: "move-cursor-to-next-sibling-heading-up",
			name: "Move cursor to next sibling heading up",
			icon: "arrow-up",
			mobileOnly: false,
			repeatable: true,
			editorCallback: async (editor: Editor) => {
				await moveCursorToHeading(editor, "sibling", "up");
			}
		});

		this.addCommand({
			id: "move-cursor-to-parent-heading",
			name: "Move cursor to parent heading",
			icon: "arrow-up",
			mobileOnly: false,
			repeatable: true,
			editorCallback: async (editor: Editor) => {
				await moveCursorToHeading(editor, "parent");
			}
		})

	}


  // Find icons on: https://lucide.dev/
	addPluginRibbonIcons() {

		const ribbonIconEl = this.addRibbonIcon(
			"calendar-clock",
			"Timestamp Notice",
			() => showCurrentDateAndTime()
		);
		ribbonIconEl.addClass("experimental-plugin-ribbon-icon");

	}


	addPluginStatusBarItems() {

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText(window.moment().format("ddd, MMM Do (HH:mm:ss)"));

	}


	addPluginEventsAndIntervals() {

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000));

	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}


	async saveSettings() {
		await this.saveData(this.settings);
	}

}
