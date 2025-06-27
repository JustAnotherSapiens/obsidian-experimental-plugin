import {
  App,
  Vault,
  DataWriteOptions,
  TFile,
  moment,
  normalizePath,
} from 'obsidian';



export async function createUniqueFile(app: App, args?: {
  folderPath?: string,
  extension?: string,
  contents?: string
}): Promise<TFile> {
  const vault = app.vault;

  const internalPlugins = (app as any).internalPlugins.plugins;
  const uniqueNotesPluginId = 'zk-prefixer';
  const uniqueNotesPlugin = internalPlugins[uniqueNotesPluginId];

  let folder, format, template;

  if (uniqueNotesPlugin.enabled) {
    ({folder, format, template} = uniqueNotesPlugin.instance.options);
  }

  format = format || 'YYYYMMDD[T]HHmmss';
  const timestamp = moment().format(format);
  const extension = '.' + (args?.extension || 'md').replace(/^\.+|\.+$/g, '');
  const fileName = timestamp + extension;

  const filePath = normalizePath((args?.folderPath || folder || '') + '/' + fileName);

  let fileContents = args?.contents;

  if (!fileContents && extension.endsWith('md') && !!template) {
    template = !template.endsWith('.md') ? `${template}.md` : template;
    const templatePath = normalizePath(template);
    const templateFile = vault.getFileByPath(templatePath);
    if (templateFile) {
      fileContents = await vault.cachedRead(templateFile);
    }
  }

  return await vault.create(filePath, (fileContents || ''));
}


export async function getLinkToNewUniqueFile(app: App, args: {
  sourcePath: string,
  extension?: string
}): Promise<string> {

  const newUniqueFile = await createUniqueFile(app, {
    extension: args.extension || '.md',
  });

  const link = app.fileManager.generateMarkdownLink(newUniqueFile, args.sourcePath);
  return link.replace(/^!+/, '');
}



// this.app.fileManager.generateMarkdownLink()
    // /**
    //  * Generate a markdown link based on the user's preferences.
    //  * @param file - the file to link to.
    //  * @param sourcePath - where the link is stored in, used to compute relative links.
    //  * @param subpath - A subpath, starting with `#`, used for linking to headings or blocks.
    //  * @param alias - The display text if it's to be different than the file name. Pass empty string to use file name.
    //  * @public
    //  */
    // generateMarkdownLink(file: TFile, sourcePath: string, subpath?: string, alias?: string): string;



// CODE GRAVEYARD


  // // If Canvas
  // if (!args.folderPath && args.extension && args.extension.endsWith('canvas')) {
  //   if (internalPlugins.canvas) {
  //     const canvasOptions = internalPlugins.canvas.instance.options;
  //     if (canvasOptions.newFileLocation) {
  //       switch (canvasOptions.newFileLocation) {
  //         case 'folder':
  //           break;
  //         case 'current':
  //           break;
  //         case 'root':
  //           break;
  //         default:
  //           break;
  //       }
  //     }
  //   }
  // }

