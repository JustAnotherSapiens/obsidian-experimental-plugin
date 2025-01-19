import { App } from 'obsidian';




// TODO: Make a togglePlugin function
export default async function toggleVimEnvironment(app: App) {

  const vault = app.vault as any;
  const plugins = (app as any).plugins;

  const vimPluginIds = [
    'obsidian-vimrc-support',
  ];
  const vimMode = vault.getConfig('vimMode');

  if (vimMode) {
    // Disable Vim Plugins
    for (const pluginId of vimPluginIds) {
      if (plugins.enabledPlugins.has(pluginId)) {
        await plugins.disablePluginAndSave(pluginId);
      }
    }
    // Disable Vim Mode
    vault.setConfig('vimMode', !vimMode);

  } else {
    // Enable Vim Mode
    vault.setConfig('vimMode', !vimMode);

    // Enable Vim Plugins
    for (const pluginId of vimPluginIds) {
      if (plugins.manifests.hasOwnProperty(pluginId)) {
        await plugins.enablePluginAndSave(pluginId);
      }
    }
  }

}

