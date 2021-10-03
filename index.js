"use strict";
const fsPromises = require("fs").promises;
const path = require("path");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const resolve = require("path").resolve;
const isCoreModule = require("is-core-module");

async function analyze(root) {
  const alreadyAnalyzed = new Set();
  const packageContent = await fsPromises.readFile(
    path.join(root, "package.json")
  );
  const packageInfo = JSON.parse(packageContent);
  const entryPoint = packageInfo.main || "index.js";
  const usedDependencies = {};
  const follows = [];
  follows.push(resolve(path.join(root, entryPoint)));
  while (follows.length > 0) {
    const filename = follows.pop();
    const { deps, locals } = await analyzeFile(filename, alreadyAnalyzed);
    for (const dep of deps) {
      const globalDep = usedDependencies[dep.mod] || new Set();
      globalDep.add(dep.file);
      usedDependencies[dep.mod] = globalDep;
    }
    follows.push(...locals);
  }

  const specifiedDeps = packageInfo.dependencies;
  const specifiedDevDeps = packageInfo.devDependencies || {};

  const missingDependencies = [];
  for (const dep of Object.keys(usedDependencies)) {
    if (!specifiedDeps[dep]) {
      missingDependencies.push(dep);
    }
  }

  const dependencies = packageInfo.dependencies || {};
  const devDependencies = packageInfo.devDependencies || {};

  const unusedDependencies = [];
  for (const dep of Object.keys(dependencies)) {
    if (!usedDependencies[dep]) {
      unusedDependencies.push(dep);
    }
  }

  return {
    dependencies,
    devDependencies,
    usedDependencies,
    unusedDependencies,
    missingDependencies,
  };
}

async function fileExists(p) {
  return await fsPromises
    .stat(p)
    .then(() => true)
    .catch(() => false);
}

async function analyzeFile(maybeFilename, alreadyAnalyzed) {
  let filename;
  if (maybeFilename.endsWith(".json")) {
    return { locals: [], deps: [] };
  }
  if (maybeFilename.endsWith(".js")) {
    filename = maybeFilename;
  } else {
    let f = path.join(`${maybeFilename}.js`);
    if (await fileExists(f)) {
      filename = f;
    } else {
      f = path.join(`${maybeFilename}/index.js`);
      if (await fileExists(f)) {
        filename = f;
      }
    }
  }
  if (!filename) {
    // eslint-disable-next-line no-console
    console.error(`${maybeFilename} does not exist`);
    return { locals: [], deps: [] };
  }

  if (alreadyAnalyzed.has(filename)) {
    return { locals: [], deps: [] };
  }

  alreadyAnalyzed.add(filename);

  const fileRoot = path.dirname(filename);
  const content = await fsPromises.readFile(filename, "utf-8");
  const ast = parse(content.toString());
  const deps = [];
  const locals = [];
  traverse(ast, {
    enter(p) {
      const node = p.container;
      if (
        node.type === "CallExpression" &&
        node.callee &&
        node.callee.type === "Identifier" &&
        node.callee.name === "require" &&
        node.arguments.length === 1
      ) {
        if (
          node.arguments[0].type === "Literal" ||
          node.arguments[0].type === "StringLiteral"
        ) {
          const required = node.arguments[0].value;
          if (!required.startsWith(".")) {
            if (!isCoreModule(required)) {
              const modSplit = required.split("/");
              let actualMod;
              if (modSplit.length <= 1) {
                actualMod = required;
              } else {
                if (modSplit[0].startsWith("@")) {
                  actualMod = `${modSplit[0]}/${modSplit[1]}`;
                } else {
                  actualMod = modSplit[0];
                }
              }
              deps.push({ mod: actualMod, file: filename });
            }
          } else {
            locals.push(path.resolve(path.join(fileRoot, required)));
          }
        }
      }
    },
  });
  return { deps, locals };
}

module.exports = analyze;
