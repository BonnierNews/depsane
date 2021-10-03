"use strict";

const fsPromises = require("fs").promises;
const path = require("path");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const resolve = require("path").resolve;
const isCoreModule = require("is-core-module");
const readdirp = require("readdirp");

async function analyze(root, ignoreDirs = [], output) {
  const alreadyAnalyzed = new Set();
  let packageContent, packageInfo;

  try {
    packageContent = await fsPromises.readFile(path.join(root, "package.json"));
    packageInfo = JSON.parse(packageContent);
  } catch (e) {
    if (e.code === "ENOENT") {
      throw new Error("No package.json found");
    }
    output.log(e);
    throw e;
  }
  const entryPoints = [];
  entryPoints.push(packageInfo.main || "index.js");
  const bin = packageInfo.bin || {};
  entryPoints.push(...Object.values(bin));

  const dependencies = packageInfo.dependencies || {};
  const devDependencies = packageInfo.devDependencies || {};
  const specifiedDevDeps = packageInfo.devDependencies || {};

  // Check files along the main path, i.e. deps!
  const { missingDependencies, unusedDependencies, usedDependencies } =
    await analyzeMain(root, entryPoints, dependencies, alreadyAnalyzed);

  // Check other files
  const { missingDevDependencies, unusedDevDependencies, usedDevDependencies } =
    await analyzeOther(
      root,
      devDependencies,
      dependencies,
      alreadyAnalyzed,
      ignoreDirs
    );

  const finalMissingDevDependencies = missingDevDependencies.filter(
    (dep) => !(dependencies[dep] && usedDependencies[dep])
  );

  return {
    dependencies,
    devDependencies,
    usedDependencies,
    usedDevDependencies,
    unusedDependencies,
    unusedDevDependencies,
    missingDependencies,
    missingDevDependencies: finalMissingDevDependencies,
  };
}

async function analyzeMain(root, entryPoints, dependencies, alreadyAnalyzed) {
  const follows = [];
  const usedDependencies = {};
  follows.push(
    ...entryPoints.map((entryPoint) => resolve(path.join(root, entryPoint)))
  );
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

  const missingDependencies = [];
  for (const dep of Object.keys(usedDependencies)) {
    if (!dependencies[dep]) {
      missingDependencies.push(dep);
    }
  }

  const unusedDependencies = [];
  for (const dep of Object.keys(dependencies)) {
    if (!usedDependencies[dep]) {
      unusedDependencies.push(dep);
    }
  }

  return { missingDependencies, unusedDependencies, usedDependencies };
}

async function analyzeOther(
  root,
  devDependencies,
  dependencies,
  alreadyAnalyzed,
  ignoreDirs
) {
  const usedDevDependencies = {};
  const entryInfos = await readdirp.promise(root, {
    fileFilter: ["*.js"],
    directoryFilter: ["!.git", "!node_modules"],
  });

  ignoreDirs = ignoreDirs.map((x) => resolve(x));

  for (const entryInfo of entryInfos) {
    const filePath = resolve(path.join(root, entryInfo.path));
    if (ignoreDirs.some((d) => path.dirname(filePath).startsWith(d))) {
      continue;
    }
    const { deps } = await analyzeFile(filePath, alreadyAnalyzed);
    for (const dep of deps) {
      const globalDep = usedDevDependencies[dep.mod] || new Set();
      globalDep.add(dep.file);
      usedDevDependencies[dep.mod] = globalDep;
    }
  }

  const missingDevDependencies = [];
  for (const dep of Object.keys(usedDevDependencies)) {
    if (!devDependencies[dep]) {
      missingDevDependencies.push(dep);
    }
  }

  const unusedDevDependencies = [];
  for (const dep of Object.keys(devDependencies)) {
    if (!usedDevDependencies[dep]) {
      unusedDevDependencies.push(dep);
    }
  }

  return { missingDevDependencies, unusedDevDependencies, usedDevDependencies };
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
  const deps = [];
  const locals = [];

  try {
    const ast = parse(content.toString(), {
      errorRecovery: true,
      sourceType: "unambiguous",
    });

    traverse(ast, {
      enter(p) {
        const node = p.container;
        const required = requireCall(node) || importFromCall(node);
        if (required) {
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
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`got error ${err.message} when parsing ${maybeFilename}`);
  }
  return { deps, locals };
}

function requireCall(node) {
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
      return node.arguments[0].value;
    }
  }
  return null;
}

function importFromCall(node) {
  if (
    node.type === "ImportDeclaration" &&
    node.source &&
    node.source.type === "StringLiteral"
  ) {
    return node.source.value;
  }
  return null;
}

module.exports = { analyze };
