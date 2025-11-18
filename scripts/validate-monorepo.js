#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${error.message}`);
  }
}

function formatList(values) {
  return values.map((item) => `  - ${item}`).join('\n');
}

function collectProjectFolders(baseDir) {
  if (!fs.existsSync(baseDir)) {
    return [];
  }

  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && dirent.name.startsWith('gas-'))
    .map((dirent) => path.join(baseDir, dirent.name))
    .sort();
}

function validateClaspJson(projectPath, errors) {
  const claspPath = path.join(projectPath, '.clasp.json');
  if (!fs.existsSync(claspPath)) {
    errors.push('Missing .clasp.json file.');
    return;
  }

  let data;
  try {
    data = readJson(claspPath);
  } catch (error) {
    errors.push(error.message);
    return;
  }

  const scriptId = typeof data.scriptId === 'string' ? data.scriptId.trim() : '';
  const placeholderValues = new Set([
    '',
    'SCRIPT_ID',
    'YOUR_SCRIPT_ID',
    '<SCRIPT_ID>',
    '<YOUR_SCRIPT_ID>',
    'REPLACE_ME',
    'PASTE_SCRIPT_ID_HERE',
    'TODO',
  ]);

  if (!scriptId) {
    errors.push('`.clasp.json` must include a non-empty scriptId.');
  } else if (placeholderValues.has(scriptId.toUpperCase())) {
    errors.push(`scriptId appears to be a placeholder value (${scriptId}).`);
  } else if (!/^[-A-Za-z0-9_]{20,}$/.test(scriptId)) {
    errors.push('scriptId must look like a valid Apps Script ID (alphanumeric with dashes/underscores, length >= 20).');
  }

  if (data.rootDir !== '.') {
    errors.push('`.clasp.json` must set "rootDir" to ".".');
  }
}

function validateManifest(projectPath, errors) {
  const manifestPath = path.join(projectPath, 'appsscript.json');
  if (!fs.existsSync(manifestPath)) {
    errors.push('Missing appsscript.json manifest.');
    return;
  }

  try {
    readJson(manifestPath);
  } catch (error) {
    errors.push(error.message);
  }
}

function findRootLevelScriptFiles(repoRoot) {
  return fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name)
    .filter((name) => /\.(gs|js)$/i.test(name));
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const appsScriptRoot = path.join(repoRoot, 'apps-script');
  const violations = [];

  const projectFolders = collectProjectFolders(appsScriptRoot);

  projectFolders.forEach((projectPath) => {
    const projectErrors = [];
    validateClaspJson(projectPath, projectErrors);
    validateManifest(projectPath, projectErrors);

    if (projectErrors.length > 0) {
      const relativePath = path.relative(repoRoot, projectPath) || '.';
      violations.push(`Project ${relativePath} violations:\n${formatList(projectErrors)}`);
    }
  });

  if (projectFolders.length === 0) {
    violations.push('No project folders were found under apps-script/. Expected directories named gas-<slug>.');
  }

  const strayRootFiles = findRootLevelScriptFiles(repoRoot);
  if (strayRootFiles.length > 0) {
    violations.push(
      `Repo root contains standalone .gs/.js files, which must live inside their project folder:\n${formatList(strayRootFiles)}`
    );
  }

  if (violations.length > 0) {
    console.error('Monorepo validation failed:\n');
    violations.forEach((msg) => {
      console.error(`- ${msg}\n`);
    });
    process.exit(1);
  }

  console.log('Monorepo validation passed.');
}

main();
