
// USAGE:
// - Update name, version, and description in package.json
// - Update minAppVersion in manifest.json
// - Run `npm run version`
// - Commit changes

// EFFECTS:
// - manifest.json fields updated: name, version, description
// - versions.json gets updated with new version and minAppVersion


import { readFileSync, writeFileSync } from "fs";


// Display package name and version from the process environment
const packageName = process.env.npm_package_name;
const packageVersion = process.env.npm_package_version;
console.log(`Bumping version of "${packageName}" to ${packageVersion}`);

// Display package name and version from package.json
const packageJson = JSON.parse(readFileSync(process.env.npm_package_json, "utf8"));
const { name, version, description } = packageJson;
console.log(`${name} v${version} - ${description}`);


// Update manifest.json with package.json values
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.id = packageJson.name;
manifest.version = packageJson.version;
manifest.description = packageJson.description;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// Update versions.json with new version and minAppVersion
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[packageJson.version] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
