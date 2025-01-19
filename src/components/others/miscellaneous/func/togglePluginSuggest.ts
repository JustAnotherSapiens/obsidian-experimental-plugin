import {
  App,
  Notice,
  moment,
} from 'obsidian';

import { runQuickSuggest } from 'suggests/quickSuggest';




type PluginData = {
  id: string,
  name: string,
  on: boolean,
};


// This list contains all your installed plugins:
// Object.keys(app.plugins.manifests)
function getAllPluginData(appPlugins: any): PluginData[] {
  const pluginIds = Object.keys(appPlugins.manifests);

  const headRe = /^(obsidian-)/;
  const tailRe = /(-(?:obsidian|plugin))$/;

  // TODO: Abstract the cleanName functionality.
  const cleanName = (name: string) => {
    let match;

    match = name.match(headRe);
    if (match) { name = name.slice(match[1].length) }

    match = name.match(tailRe);
    if (match) { name = name.slice(0, name.length - match[1].length) }

    return name;
  };
  const pluginData = pluginIds.map( id => ({
    id,
    name: cleanName(id),
    on: appPlugins.enabledPlugins.has(id),
  }));
  pluginData.sort( (a, b) => a.name.localeCompare(b.name) );  // Alphabetical sort
  pluginData.sort( (a, b) => a.name.length - b.name.length ); // Name lenght sort
  pluginData.sort( (a, b) => a.on - b.on ); // Status sort
  return pluginData;
}



// These functions return all Promise objects.
// App.plugins.enablePlugin()
// App.plugins.enablePluginAndSave()
// App.plugins.disablePlugin()
// App.plugins.disablePluginAndSave()

async function togglePlugin(appPlugins: any, pluginId: string) {
  let status: string;

  if (appPlugins.enabledPlugins.has(pluginId)) {
    await appPlugins.disablePluginAndSave(pluginId);
    status = 'OFF';
  }
  else if (appPlugins.manifests.hasOwnProperty(pluginId)) {
    await appPlugins.enablePluginAndSave(pluginId);
    status = 'ON';
  }
  else {
    console.error(`Invalid Plugin ID: ${pluginId}`);
    return;
  }

  new Notice(`${status}  ${pluginId}`, 3000);
}



export default async function togglePluginSuggest(app: App) {
  const appPlugins = (app as any).plugins;
  const allPluginData = getAllPluginData(appPlugins);

  const pluginData = await runQuickSuggest(app,
    allPluginData,
    (p) => `${p.on ? ' ON' : 'OFF'} ${p.name}`,
    'Select a plugin'
  );

  if (!pluginData) return;
  await togglePlugin(appPlugins, pluginData.id);
}




// TODO:
// This would be better as a custom Suggest.
// Highlighting the plugins that are currently on.
// Dimming those that are currently off.
// With the possibility of toggling them directly on the suggester without closing it.

