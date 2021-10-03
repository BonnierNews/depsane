#!/usr/bin/env node
"use strict";

const minimist = require("minimist");
const main = require("../");

(async () => {
  const retCode = await main(minimist(process.argv.slice(2)));
  // eslint-disable-next-line no-process-exit
  process.exit(retCode);
})();
