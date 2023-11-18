import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Plugin,
	Notice,
} from "obsidian";

import {
	DEFAULT_SETTINGS,
	ExperimentalSettings,
	ExperimentalSettingTab,
} from "./settings";

import {
	cleanToggleFoldOnSiblingHeadings,
	cleanToggleFoldOnChildrenHeadings,
} from "./actions/folds";

import {
	showCurrentDateAndTime,
	moveCurrentTab,
} from "./actions/display";

import {
	ExperimentalModal,
	ExperimentalSuggestModal,
} from "./actions/suggest";

import {
	smartStrikethrough,
} from "./actions/markdown/syntax";

import {
	moveCursorToHeading,
} from "./actions/markdown/headings";



export default class ExperimentalPlugin extends Plugin {
	settings: ExperimentalSettings;


	async onload() {
		console.log("Loading Experimental Plugin");
		await this.loadSettings();
		this.addPluginCommands();
		this.addPluginRibbonIcons();
		// this.addPluginStatusBarItems();
		this.addSettingTab(new ExperimentalSettingTab(this.app, this));
		// this.addPluginEventsAndIntervals();
	}


	onunload() {
		console.log("Unloading Experimental Plugin");
	}


	addHeadingMovementCommands() {

		/* TOGGLE SETTINGS */

		// Toggle Wrap Around
		this.addCommand({
			id: "toggle-global-wrap-around",
			name: "Toggle wrap around globally",
			icon: "arrow-right",
			mobileOnly: false,
			repeatable: false,
			callback: async () => {
				const wrapAround = this.settings.globalWrapAround;
				if (wrapAround) {
					this.settings.globalWrapAround = false;
					this.settings.contiguousWrapAround = false;
					this.settings.looseSiblingWrapAround = false;
					this.settings.strictSiblingWrapAround = false;
				} else {
					this.settings.globalWrapAround = true;
					this.settings.contiguousWrapAround = true;
					this.settings.looseSiblingWrapAround = true;
					this.settings.strictSiblingWrapAround = true;
				}
				new Notice(`Global Wrap Around: ${String(!wrapAround).toUpperCase()}`, 3000);
				await this.saveSettings();
			}
		});

		// Toggle Sibling Mode
		this.addCommand({
			id: "toggle-sibling-mode",
			name: "Toggle sibling mode (loose/strict)",
			icon: "arrow-right",
			mobileOnly: false,
			repeatable: false,
			callback: async () => {
				const siblingMode = this.settings.siblingMode;
				if (siblingMode === "strictSibling") {
					this.settings.siblingMode = "looseSibling";
				}
				else if (siblingMode === "looseSibling") {
					this.settings.siblingMode = "strictSibling";
				}
				new Notice(`Sibling Mode: ${this.settings.siblingMode}`, 3000);
				await this.saveSettings();
			}
		});

		/* MOVE CURSOR TO HEADING */

		// Move cursor to next sibling heading down
		this.addCommand({
			id: "sibling-heading-down",
			name: "Move cursor to next sibling heading down",
			icon: "arrow-down",
			mobileOnly: false,
			repeatable: true,
			editorCallback: async (editor: Editor) => {
				const siblingMode = this.settings.siblingMode;
				await moveCursorToHeading(editor, siblingMode, "down");
			}
		});

		// Move cursor to next sibling heading up
		this.addCommand({
			id: "sibling-heading-up",
			name: "Move cursor to next sibling heading up",
			icon: "arrow-up",
			mobileOnly: false,
			repeatable: true,
			editorCallback: async (editor: Editor) => {
				const siblingMode = this.settings.siblingMode;
				await moveCursorToHeading(editor, siblingMode, "up");
			}
		});

		// Move cursor to parent heading
		this.addCommand({
			id: "parent-heading",
			name: "Move cursor to parent heading",
			icon: "arrow-up",
			mobileOnly: false,
			repeatable: true,
			editorCallback: async (editor: Editor) => {
				await moveCursorToHeading(editor, "parent");
			}
		});

		// Move cursor to next contiguous heading down
		this.addCommand({
			id: "contiguous-heading-down",
			name: "Move cursor to contiguous heading down",
			icon: "arrow-down",
			mobileOnly: false,
			repeatable: true,
			editorCallback: async (editor: Editor) => {
				await moveCursorToHeading(editor, "contiguous", "down");
			}
		});

		// Move cursor to next contiguous heading up
		this.addCommand({
			id: "contiguous-heading-up",
			name: "Move cursor to contiguous heading up",
			icon: "arrow-up",
			mobileOnly: false,
			repeatable: true,
			editorCallback: async (editor: Editor) => {
				await moveCursorToHeading(editor, "contiguous", "up");
			}
		});

	}


	addSmallFeatureCommands() {

		/* TOGGLE CONFIG OPTIONS */

		// Toggle Line Numbers
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
			}
		});

		// Toggle Vim Mode
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
			}
		});

		/* MOVE CURRENT TAB */

		// Move current tab left
		this.addCommand({
			id: "move-current-tab-left",
			name: "Move current tab left",
			icon: "arrow-left",
			mobileOnly: false,
			repeatable: false,
			callback: () => moveCurrentTab.call(this, "left"),
		});

		// Move current tab right
		this.addCommand({
			id: "move-current-tab-right",
			name: "Move current tab right",
			icon: "arrow-right",
			mobileOnly: false,
			repeatable: false,
			callback: () => moveCurrentTab.call(this, "right"),
		});

	}


	addFoldCommands() {

		/* HEADING FOLDS */

		this.addCommand({
			id: "toggle-fold-sibling-headings",
			name: "Toggle fold on sibling headings",
			icon: "arrow-down",
			mobileOnly: false,
			repeatable: false,
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await cleanToggleFoldOnSiblingHeadings(editor, view);
			}
		});

		this.addCommand({
			id: "toggle-fold-children-headings",
			name: "Toggle fold on children headings",
			icon: "arrow-down",
			mobileOnly: false,
			repeatable: false,
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await cleanToggleFoldOnChildrenHeadings(editor, view);
			}
		});

		// this.addCommand({
		// 	id: "toggle-fold",
		// 	name: "Toggle fold",
		// 	icon: "arrow-down",
		// 	mobileOnly: false,
		// 	repeatable: false,
		// 	editorCallback: (editor: Editor) => {
		// 		editor.exec("toggleFold");
		// 	}
		// });

	}


	addTestingCommands() {

		// Test ExperimentalModal
		this.addCommand({
			id: "test-modal",
			name: "Test Modal",
			icon: "arrow-down",
			mobileOnly: false,
			repeatable: false,
			callback: () => {
				new Notice("Testing ExperimentalModal");
				new ExperimentalModal(this.app).open();
			}
		});

		// Display Notice with current date and time
		this.addCommand({
			id: "show-current-date-and-time",
			name: "Show current date and time",
			icon: "calendar-clock",
			mobileOnly: false,
			repeatable: false,
			callback: () => showCurrentDateAndTime(),
		});

		// Behavior-tailored strikethrough
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

	}


	addPluginCommands() {
		this.addHeadingMovementCommands();
		this.addFoldCommands();
		this.addSmallFeatureCommands();
		this.addTestingCommands();
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
		// E YYYY-MM-DD HH:mm:ss
		statusBarItemEl.setText(window.moment().format("d MMM Do (HH:mm:ss)"));

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
