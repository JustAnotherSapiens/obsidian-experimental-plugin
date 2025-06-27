import { App } from 'obsidian';

import { runQuickSuggest } from 'suggests/quickSuggest';

import {
  shellCommandFromVault,
  shellCommandPromiseFromVault
} from './shellCommand';



type CustomData = {display: string, path: string}[];


function getCustomData(fileName: string): CustomData | undefined {
  const customEnvVariable = 'ObsidianCustomData';

  const dataPath = process.env[customEnvVariable];
  if (!dataPath) {
    console.debug(`%${customEnvVariable}% not set.`);
    return;
  }

  const filePath = `${dataPath}\\.plugin\\${fileName}`;

  // Using CommonJS notation because...
  // Importing at top level could trigger errors on mobile?
  // Since 'fs' requires NodeJS
  const fs = require('fs');

  if (!fs.existsSync(filePath)) {
    console.debug(`File path not found: ${filePath}`);
    return;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}




export async function customExplorerDirectorySuggest(app: App) {
  const fileName = 'directoryPaths.json';

  const fileDataArray = getCustomData(fileName);
  if (!fileDataArray) {
    console.debug('Undefined Custom Data');
    return;
  }

  const selectedFileData = await runQuickSuggest(app,
    fileDataArray,
    fileData => fileData.display,
    'Select a directory path to open with explorer.exe'
  );
  if (!selectedFileData) return;

  try {
    // The Promise version allows its thrown errors to be catched.
    await shellCommandPromiseFromVault(app, `explorer "${selectedFileData.path}"`);

  } catch (error) {
    if (!(error instanceof Error)) {
      console.debug('Unexpected error type:', typeof error)
      return;
    }
    // The explorer opens at the path properly, but it throws an Error.
    if (/^Command failed: /.test(error.message)) return;

    console.debug(error);
  }

}



export async function customVSCodeProjectSuggest(app: App) {
  const fileName = 'projectPaths.json';

  const fileDataArray = getCustomData(fileName);
  if (!fileDataArray) {
    console.debug('Undefined Custom Data');
    return;
  }

  const selectedFileData = await runQuickSuggest(app,
    fileDataArray,
    fileData => fileData.display,
    'Select a project to open with VS Code'
  );
  if (!selectedFileData) return;

  shellCommandFromVault(app, `code "${selectedFileData.path}"`);
}


