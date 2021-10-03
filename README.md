# depsane
Checks for missing `dependencies` based on code reachable from the `main` entrypoint specified in `package.json`
(defaults: `index.js`).

(Unlike similar tools) `depsane` is focused on determining which dependedencies that should be present in
`dependencies` and classifies a dependency found in `devDependencies` used in the main code path as missing.

This solves the problem where an application works fine locally and during testing but fails once deployed
as the deployed version will only be installed with its' `dependencies` but during testing and development
both `devDependencies` and `dependencies` are installed.

## Limitations
* Only considers `dependencies`, no analysis of `devDependencies`
* Only considers code that can be determined to be reached from main by static analysis via `require()`-calls.

## Installation
```bash
npm install --only=dev depsane
```

## Usage
```bash
npx depsane .
```

Prints missing dependencies and unused dependencies.

Exits with code `0` is no missing dependencies are found and `1` otherwise. Unused dependencies are only printed for information, they have no impact on the exist code.

## License
Released under the [MIT license](https://tldrlegal.com/license/mit-license).