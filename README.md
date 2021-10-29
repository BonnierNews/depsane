# depsane
[![Test application](https://github.com/BonnierNews/depsane/actions/workflows/run-tests.yml/badge.svg?branch=master)](https://github.com/BonnierNews/depsane/actions/workflows/run-tests.yml)

Checks for missing `dependencies` based on code reachable from the `main`
entrypoint specified in `package.json` (defaults: `index.js`). Furthermore:
if a `bin`-object is specified in `package.json` all code reachable from those
files will also be included.

`depsane` is focused on determining which dependencies that should be 
present specifically in `dependencies` and `devDependencies`. It classifies a
dependency found in `devDependencies` used in the main code path as missing,
and a dependency only used as a devDependency but that is specified in
`dependencies` is considered missing.

This solves the problem where an application works fine locally and during
testing but fails once deployed as the deployed version will only be installed
with its' `dependencies` but during testing and development both
`devDependencies` and `dependencies` are installed.

## Installation
```bash
npm install --only=dev depsane
```

## Usage
```bash
npx depsane [directory] [arguments]
```

Prints missing dependencies and unused dependencies.

Exits with code `0` if no missing or unused dependencies are found and `1` otherwise.

The directory defaults to the current directory.

All of the arguments are optional:

`--ignore-dirs`: comma-separated list of dirs to ignore.

`--ignores`: comma-separated list of dependencies to ignore, supports wildcards (i.e. "eslint*" will ignore all dependencies that starts with eslint).

## License
Released under the [MIT license](https://tldrlegal.com/license/mit-license).
