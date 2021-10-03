"use strict";

const analyze = require("../../");
const app = require("../../");
const path = require("path");
const { expect } = require("chai");

Feature("analyze", () => {
  Scenario("Analyze basic package", () => {
    let res;
    When("analyzing a basic package", async () => {
      res = await analyze(path.resolve("./test/data/package1"));
    });

    Then("we should be missing 3 dependencies", () => {
      expect(res.missingDependencies.length).to.eql(3);
    });

    And("we should be missing some non-specified deps", () => {
      expect(res.missingDependencies).to.include("non-existing-dep");
      expect(res.missingDependencies).to.include("non-existing-dep-2");
    });

    And(
      "we should be missing a depdendency only specified in devDependencies but used as dependency",
      () => {
        expect(res.missingDependencies).to.include("exists-in-dev-deps");
      }
    );

    And(
      "we should be able to determine where the existing dependencies are referenced from",
      () => {
        expect([...res.usedDependencies["existing-dep"]].length).to.eql(2);
        expect([...res.usedDependencies["existing-dep"]][0]).to.include(
          "foo.js"
        );
        expect([...res.usedDependencies["existing-dep"]][1]).to.include(
          "bar.js"
        );
      }
    );

    And(
      "we should be able to determine where the non-existing dependencies are referenced from",
      () => {
        expect([...res.usedDependencies["non-existing-dep"]].length).to.eql(2);
        expect([...res.usedDependencies["non-existing-dep"]][0]).to.include(
          "foo.js",
          "bar.js"
        );

        expect([...res.usedDependencies["exists-in-dev-deps"]].length).to.eql(
          1
        );
        expect([...res.usedDependencies["exists-in-dev-deps"]][0]).to.include(
          "bar.js"
        );

        expect([...res.usedDependencies["non-existing-dep-2"]].length).to.eql(
          1
        );
        expect([...res.usedDependencies["non-existing-dep-2"]][0]).to.include(
          "folder/index.js"
        );
      }
    );

    And(
      "we should be able to determine where existing namedspaced deps are referenced from",
      () => {
        expect([...res.usedDependencies["@ns/existing-dep"]].length).to.eql(1);
        expect([...res.usedDependencies["@ns/existing-dep"]][0]).to.include(
          "folder/index.js"
        );
      }
    );

    And("there should be one unused dependency", () => {
      expect(res.unusedDependencies.length).to.eql(1);
      expect(res.unusedDependencies).to.include("unused-dep");
    });
  });
});
