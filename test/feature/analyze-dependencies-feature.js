"use strict";

const depsane = require("../../");
const path = require("path");
const { expect } = require("chai");

Feature("analyze dependencies", () => {
  Scenario("analyze package with epic dependencies", () => {
    let retCode;
    const log = [];
    const warn = [];
    const err = [];
    const output = {
      log: (args) => log.push(args),
      warn: (args) => warn.push(args),
      error: (args) => err.push(args),
    };

    When("analyzing then package", async () => {
      retCode = await depsane(
        { _: [path.resolve("./test/data/package3")] },
        output
      );
    });

    Then("the return code should be 0 because everything is fine", () => {
      expect(retCode).to.eql(0);
    });

    And("we should see no output", () => {
      expect(log.length).to.eql(0);
      expect(err.length).to.eql(0);
    });
  });

  Scenario(
    "analyze package with 3 unused devDependencies, but ignore them",
    () => {
      let retCode;
      const log = [];
      const warn = [];
      const err = [];
      const output = {
        log: (args) => log.push(args),
        warn: (args) => warn.push(args),
        error: (args) => err.push(args),
      };

      When(
        "analyzing then package ignoring the unused devDependencies",
        async () => {
          retCode = await depsane(
            {
              _: [path.resolve("./test/data/package4")],
              ignores: "eslint*,epic-fixer",
            },
            output
          );
        }
      );

      Then("the return code should be 0 because everything is fine", () => {
        expect(retCode).to.eql(0);
      });

      And("we should see no output", () => {
        expect(log.length).to.eql(0);
        expect(err.length).to.eql(0);
      });
    }
  );

  Scenario(
    "analyze package with missing devDependencies, but ignore the folder where it is required",
    () => {
      let retCode;
      const log = [];
      const warn = [];
      const err = [];
      const output = {
        log: (args) => log.push(args),
        warn: (args) => warn.push(args),
        error: (args) => err.push(args),
      };

      When(
        "analyzing then package, ignoring the folder which uses a missing dev dependency ",
        async () => {
          retCode = await depsane(
            {
              _: [path.resolve("./test/data/package5")],
              "ignore-dirs": path.resolve("./test/data/package5/molder"),
            },
            output
          );
        }
      );

      Then("the return code should be 0 because everything is fine", () => {
        expect(retCode).to.eql(0);
      });

      And("we should see no output", () => {
        expect(log.length).to.eql(0);
        expect(err.length).to.eql(0);
      });
    }
  );

  Scenario("analyze package with troublesome dependencies", () => {
    let retCode;
    const log = [];
    const warn = [];
    const err = [];
    const output = {
      log: (args) => log.push(args),
      warn: (args) => warn.push(args),
      error: (args) => err.push(args),
    };

    When("analyzing then package", async () => {
      retCode = await depsane(
        { _: [path.resolve("./test/data/package1")] },
        output
      );
    });

    Then(
      "the return code should be 1 because there are dependencies mising",
      () => {
        expect(retCode).to.eql(1);
      }
    );

    And("we should see that we have 2 unused depedencies", () => {
      const unusedDeps = findSegment("Unused dependencies", log);
      expect(unusedDeps.length).to.eql(2);
      expect(unusedDeps).to.include("* unused-dep");
      expect(unusedDeps).to.include("* only-used-in-dev-deps");
    });

    And("we should have 1 unused dev dependency", () => {
      const unusedDevDeps = findSegment("Unused devDependencies", log);
      expect(unusedDevDeps.length).to.eql(1);
      expect(unusedDevDeps).to.include("* unused-dev-dep");
    });

    And(
      "we should have 5 missing dependencies, including 1 that exists in devDependencies",
      () => {
        const missingDeps = findSegment("Missing dependencies", log);
        expect(missingDeps.length).to.eql(5);
        expect(missingDeps).to.include('* missing-bin-dep: "bin/cli.js"');
        expect(missingDeps).to.include(
          '* non-existing-dep: "foo.js", "bar.js"'
        );
        expect(missingDeps).to.include('* missing-by-import-from: "baz.js"');
        expect(missingDeps).to.include(
          '* exists-in-dev-deps: "bar.js" (exists in devDependencies but needed in dependencies!)'
        );
        expect(missingDeps).to.include(
          '* non-existing-dep-2: "folder/index.js"'
        );
      }
    );

    And(
      "we should have 2 missing devDependencies, including 1 that exists in dependencies but is only used in dev",
      () => {
        const missingDevDeps = findSegment("Missing devDependencies", log);
        expect(missingDevDeps.length).to.eql(2);
        expect(missingDevDeps).to.include('* missing-dev-dep: "test/lol.js"');
        expect(missingDevDeps).to.include(
          '* only-used-in-dev-deps: "test/lol.js" (exists in dependencies but is only used as dev, maybe move it to devDependencies?)'
        );
      }
    );
  });

  Scenario("analyze package without a package.json", () => {
    let retCode;
    const log = [];
    const warn = [];
    const err = [];
    const output = {
      log: (args) => log.push(args),
      warn: (args) => warn.push(args),
      error: (args) => err.push(args),
    };

    When("analyzing then package", async () => {
      retCode = await depsane({ _: [path.resolve("./test/data")] }, output);
    });

    Then("the return code should be 1 because there is no package.json", () => {
      expect(retCode).to.eql(1);
    });

    And("we should have a user-friendly error message", () => {
      expect(err).to.include("No package.json found");
    });
  });

  Scenario("analyze package with a broken package.json", () => {
    let retCode;
    const log = [];
    const warn = [];
    const err = [];
    const output = {
      log: (args) => log.push(args),
      warn: (args) => warn.push(args),
      error: (args) => err.push(args),
    };

    When("analyzing then package", async () => {
      retCode = await depsane(
        { _: [path.resolve("./test/data/package2")] },
        output
      );
    });

    Then("the return code should be 1 because package.json is broken", () => {
      expect(retCode).to.eql(1);
    });

    And("we should have a user-friendly error message", () => {
      expect(err).to.include("Unexpected token o in JSON at position 1");
    });
  });
});

function findSegment(startString, arr) {
  const index = arr.findIndex((x) => x === startString);
  if (index === -1) return [];

  let toArr = arr.slice(index + 1);
  let lastIndex = toArr.findIndex((x) => !x.startsWith("*"));
  if (lastIndex === -1) lastIndex = arr.length - 1;
  toArr = toArr.slice(0, lastIndex);
  return toArr;
}
