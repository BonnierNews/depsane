#!/usr/bin/env node
"use strict";

const minimist = require("minimist");
const main = require("../");

const output = {
  log: (str) => process.stdout.write(`${str}\n`),
  error: (str) => process.stderr.write(`${str}\n`),
};

(async () => {
  process.exitCode = await main(minimist(process.argv.slice(2)), output);
})();
