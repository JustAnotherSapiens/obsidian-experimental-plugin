import { App, FileSystemAdapter } from 'obsidian';


// Inspired by the Templater UserSystemFunctions.ts
// https://github.com/SilentVoid13/Templater/blob/master/src/core/functions/user_functions/UserSystemFunctions.ts


// Node.js child_process docs:
// https://nodejs.org/api/child_process.html




export function shellCommand(command: string, options: any = {}) {
  const child_process = require('child_process') as typeof import('child_process');

  let outputStream, errorStream;
  child_process.exec(command, options, (error, stdout, stderr) => {
    if (error) { throw error; }
    outputStream = stdout;
    errorStream = stderr;
  });

  return outputStream;
}



export function shellCommandFromVault(app: App, command: string) {

  if (!(app.vault.adapter instanceof FileSystemAdapter)) {
    console.error('app.vault.adapter is not an instance of FileSystemAdapter');
    return;
  }
  const vaultPath = app.vault.adapter.getBasePath().replace(/\\/g, '/');

  shellCommand(command, {
    timeout: 1000 * 10,
    cwd: vaultPath,
  });

}


export async function shellCommandPromiseFromVault(app: App, command: string) {

  if (!(app.vault.adapter instanceof FileSystemAdapter)) {
    console.error('app.vault.adapter is not an instance of FileSystemAdapter');
    return;
  }
  const vaultPath = app.vault.adapter.getBasePath().replace(/\\/g, '/');

  await shellCommandPromise(command, {
    timeout: 1000 * 10,
    cwd: vaultPath,
  });

}



export async function shellCommandPromise(command: string, options: any = {}) {
  const util = require('util') as typeof import('util');
  const child_process = require('child_process') as typeof import('child_process');

  const exec = util.promisify(child_process.exec);
  const { stdout, stderr } = await exec(command, options);

  return stdout;
}




export function shellCommandSpawn(command: string, args: string[], options: any = {}) {
  const child_process = require('child_process') as typeof import('child_process');

  let outputStream, errorStream;
  const process = child_process.spawn(command, args, options);

  process.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
    outputStream = data;
  });

  process.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
    errorStream = data;
  });

  process.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });

  process.on('error', (error) => {
    throw error;
  });

  return outputStream;
}

