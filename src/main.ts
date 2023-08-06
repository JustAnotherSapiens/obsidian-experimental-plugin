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
	smartStrikethrough,
} from "./actions";



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

		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: "open-sample-modal-complex",
		// 	name: "Open sample modal (complex)",
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}
		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

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



class SampleModal extends Modal {

	constructor(app: App) {
		super(app);
	}


	onOpen() {
		const {contentEl} = this;
		contentEl.setText("Woah!");
	}


	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}

}

