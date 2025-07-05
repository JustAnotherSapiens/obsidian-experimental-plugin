import {
  App,
  FileSystemAdapter,
  normalizePath,
} from 'obsidian';

import {
  shellCommand,
} from './shellCommand'



export default async function openObsidianVimrcFile(app: App) {
  if (!(app.vault.adapter instanceof FileSystemAdapter)) {
    console.error('app.vault.adapter is not an instance of FileSystemAdapter');
    return;
  }

  const plugins = (app as any).plugins;
  const vimrcPluginId = 'obsidian-vimrc-support';

  if (!plugins.enabledPlugins.has(vimrcPluginId)) {
    console.warn(`'${vimrcPluginId}' must be enabled to access Obsidian Vimrc file`);
    return;
  }

  const vimrcFileName = plugins.plugins[vimrcPluginId].settings.vimrcFileName;
  if (!vimrcFileName) {
    console.warn(`Unable to resolve vimrcFileName: ${vimrcFileName}`);
    return;
  }

  if (!await app.vault.adapter.exists(normalizePath(vimrcFileName))) {
    console.warn(`Path not found in vault: "${vimrcFileName}"`);
    return;
  }

  const vaultPath = app.vault.adapter.getBasePath().replace(/\\/g, '/');
  const vimrcPath = `${vaultPath}/${vimrcFileName}`;

  const cmdCommand = `gvim "${vimrcPath}"`;

  shellCommand(cmdCommand, {
    timeout: 1000 * 10,
    cwd: vaultPath,
  });

}

