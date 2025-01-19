import {
  App,
  TFile,
  FileSystemAdapter,
  EditorPosition,
} from 'obsidian';

import {
  shellCommand,
} from './shellCommand'




function isTemplaterFile(app: App, fileVaultPath: string) {
  const pluginID = 'templater-obsidian'
  const folderSettingID = 'templates_folder'

  const plugins = (app as any).plugins.plugins;
  if (!plugins.hasOwnProperty(pluginID)) {
    console.debug(`'${pluginID}' not found. Unable to check if file is a template.`);
    return false;
  }

  const settings = plugins[pluginID].settings;
  if (!settings.hasOwnProperty(folderSettingID)) {
    console.debug(`Template folder not found in '${pluginID}' settings.`);
    return false;
  }

  const templateFolder = settings[folderSettingID];
  if (!templateFolder) return false;

  return fileVaultPath.startsWith(templateFolder);
}



export default function openFileInGvim(app: App, file: TFile, cursor?: EditorPosition) {
  if (!file) {
    console.error('No file detected.')
    return;
  }

  if (!(app.vault.adapter instanceof FileSystemAdapter)) {
    console.error('app.vault.adapter is not an instance of FileSystemAdapter');
    return;
  }

  const vaultPath = app.vault.adapter.getBasePath().replace(/\\/g, '/');
  const filePath = `${vaultPath}/${file.path}`;

  // Use --cmd for commands before loading any vimrc
  // Use -c for commands after loading the first file
  // Use '|' to concatenate vim commands
  // NOTE: Changing the order of the vim command parameters can yield different results.
  const gvimParams = []

  if (cursor !== undefined) {
    // Start at the appropriate line
    gvimParams.push(`+${cursor.line + 1}`);
  }

  if (isTemplaterFile(app, file.path)) {
    gvimParams.push('--cmd', '"let g:skip_usr_markdown_ftplugin = v:true"');
    gvimParams.push('-c', '"set filetype=javascript"');
  } else {
    // Custom command for focused markdown editing
    gvimParams.push('-c', '"silent FocusMD"');
    // Unfold 6 times at the cursor position
    gvimParams.push('-c', '"silent! normal! 6zo"');
  }

  if (cursor !== undefined) {
    // Move the cursor to the appropriate column, and
    // redraw with line at the center of the window.
    gvimParams.push('-c', `"normal! ${cursor.ch + 1}|zz"`);
  }

  // At last, add the file path to be open
  gvimParams.push('--', `"${filePath}"`);


  const cmdCommand = `gvim ${gvimParams.join(' ')}`;

  shellCommand(cmdCommand, {
    timeout: 1000 * 10,
    cwd: vaultPath,
  });

}

