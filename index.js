"use strict";
const path = require("path");
const micromatch = require("micromatch");

const { analyze } = require("./lib/analyze");

async function main(argv, output = console) {
  let retCode = 0;
  try {
    const root = argv._[0] || ".";
    const ignoreModules = argv.ignores ? argv.ignores.split(",") : [];
    const ignoreDirs = argv["ignore-dirs"]
      ? argv["ignore-dirs"].split(",")
      : [];

    let {
      dependencies,
      devDependencies,
      usedDependencies,
      usedDevDependencies,
      unusedDependencies,
      unusedDevDependencies,
      missingDependencies,
      missingDevDependencies,
    } = await analyze(root, ignoreDirs, output);

    unusedDependencies = unusedDependencies.filter(
      (dep) => !micromatch.isMatch(dep, ignoreModules)
    );

    if (unusedDependencies.length > 0) {
      // eslint-disable-next-line no-console
      output.log("Unused dependencies");
      for (const dep of unusedDependencies) {
        // eslint-disable-next-line no-console
        output.log(`* ${dep}`);
      }
      retCode = 1;
    }

    unusedDevDependencies = unusedDevDependencies.filter(
      (dep) => !micromatch.isMatch(dep, ignoreModules)
    );

    if (unusedDevDependencies.length > 0) {
      // eslint-disable-next-line no-console
      output.log("Unused devDependencies");
      for (const dep of unusedDevDependencies) {
        // eslint-disable-next-line no-console
        output.log(`* ${dep}`);
      }
      retCode = 1;
    }

    missingDependencies = missingDependencies.filter(
      (dep) => !ignoreModules.includes(dep)
    );

    if (missingDependencies.length > 0) {
      // eslint-disable-next-line no-console
      output.log("Missing dependencies");
      for (const dep of missingDependencies) {
        const referencedFrom = usedDependencies[dep];
        const x = [ ...referencedFrom ]
          .map((ref) => `"${path.relative(root, ref)}"`)
          .join(", ");
        if (devDependencies[dep]) {
          // eslint-disable-next-line no-console
          output.log(
            `* ${dep}: ${x} (exists in devDependencies but needed in dependencies!)`
          );
        } else {
          // eslint-disable-next-line no-console
          output.log(`* ${dep}: ${x}`);
        }
      }
      retCode = 1;
    }

    missingDevDependencies = missingDevDependencies.filter(
      (dep) => !ignoreModules.includes(dep)
    );

    if (missingDevDependencies.length > 0) {
      // eslint-disable-next-line no-console
      output.log("Missing devDependencies");
      for (const dep of missingDevDependencies) {
        const referencedFrom = usedDevDependencies[dep];
        const x = [ ...referencedFrom ]
          .map((ref) => `"${path.relative(root, ref)}"`)
          .join(", ");
        if (dependencies[dep]) {
          // eslint-disable-next-line no-console
          output.log(
            `* ${dep}: ${x} (exists in dependencies but is only used as dev, maybe move it to devDependencies?)`
          );
        } else {
          // eslint-disable-next-line no-console
          output.log(`* ${dep}: ${x}`);
        }
      }
      retCode = 1;
    }
  } catch (e) {
    output.error(e.message);
    retCode = 1;
  }

  return retCode;
}

module.exports = main;
