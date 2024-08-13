
// USAGE:
//
// - Update any of the following fields in "package.json":
//   - name
//   - version
//   - description
//   - devDependencies.obsidian
//
// - Run `npm run bump` to update the following files:
//   - manifest.json
//   - versions.json


import { readFileSync, writeFileSync } from "fs";


const npmPackage = JSON.parse(readFileSync(process.env.npm_package_json, "utf8"));


(function logPackageInfo(npm_package_json) {
  const { esbuild, obsidian } = npm_package_json.devDependencies;
  console.log("esbuild:", esbuild);
  console.log("obsidian:", obsidian);
  const { name, version, description } = npm_package_json;
  console.log(`\n${name} ${version} - ${description}\n`);
})(npmPackage);


(function updateManifest(npm_package_json) {
  const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
  manifest.id = npm_package_json.name;
  manifest.version = npm_package_json.version;
  manifest.description = npm_package_json.description;
  manifest.minAppVersion = npm_package_json.devDependencies.obsidian;
  writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));
})(npmPackage);


(function updateObsidianVersionRequirement(package_version, obsidian_version) {
  const versions = JSON.parse(readFileSync("versions.json", "utf8"));
  versions[package_version] = obsidian_version;
  writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
})(npmPackage.version, npmPackage.devDependencies.obsidian);

