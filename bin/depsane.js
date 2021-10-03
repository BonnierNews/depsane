#!/usr/bin/env node
"use strict";

const path = require("path");
const analyze = require("../");

async function main(root) {
  const {
    dependencies,
    devDependencies,
    usedDependencies,
    unusedDependencies,
    missingDependencies,
  } = await analyze(root);

  if (unusedDependencies.length > 0) {
    // eslint-disable-next-line no-console
    console.log("Unused dependencies");
    for (const dep of unusedDependencies) {
      // eslint-disable-next-line no-console
      console.log(`* ${dep}`);
    }
  }

  if (missingDependencies.length === 0) {
    return 0;
  }

  // eslint-disable-next-line no-console
  console.log("Missing dependencies");
  for (const dep of missingDependencies) {
    const referencedFrom = usedDependencies[dep];
    const x = [...referencedFrom]
      .map((ref) => `"${path.relative(root, ref)}"`)
      .join(", ");
    if (devDependencies[dep]) {
      // eslint-disable-next-line no-console
      console.log(
        `* ${dep}: ${x} (exists in devDependencies but needed in production!)`
      );
    } else {
      // eslint-disable-next-line no-console
      console.log(`* ${dep}: ${x}`);
    }
  }
  return 1;
}

(async () => {
  // eslint-disable-next-line no-process-exit
  process.exit(await main(process.argv[2] || "."));
})();
