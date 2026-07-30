#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  extractMathPaletteModuleKeys,
  validateCommonDrawObservation,
  validatePenStaticContract
} from "./lib/common-draw-contract.mjs";
import {
  assertPathInside,
  defaultResearchRoot,
  repositoryRoot
} from "./lib/paths.mjs";

try {
  const options = parseArguments(process.argv.slice(2), {
    input: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "common-draw-contract.observations.json"
      )
    },
    "pen-static": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "pen-contract.static.json"
      )
    },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
    }
  });
  const inputPath = assertPathInside(
    options.input,
    options["research-root"],
    "common draw observation"
  );
  const observation = JSON.parse(readFileSync(inputPath, "utf8"));
  const bundleSnapshot = JSON.parse(
    readFileSync(
      join(
        repositoryRoot,
        "research",
        "mathcanvas",
        "bundle-contract.snapshot.json"
      ),
      "utf8"
    )
  );
  const catalog = JSON.parse(
    readFileSync(
      join(
        repositoryRoot,
        "research",
        "mathcanvas",
        "tool-catalog.snapshot.json"
      ),
      "utf8"
    )
  );
  const catalogModuleKeys =
    extractMathPaletteModuleKeys(catalog);
  const validation = validateCommonDrawObservation(observation, {
    catalogModuleKeys
  });
  if (!validation.ok) {
    throw new Error(
      `common-draw-observation-invalid:${JSON.stringify(
        validation.issues
      )}`
    );
  }
  const penStaticPath = assertPathInside(
    options["pen-static"],
    options["research-root"],
    "pen static contract"
  );
  const penStaticContract = JSON.parse(
    readFileSync(penStaticPath, "utf8")
  );
  const penValidation = validatePenStaticContract(
    penStaticContract,
    { bundle: bundleSnapshot.bundle }
  );
  if (!penValidation.ok) {
    throw new Error(
      `pen-static-contract-invalid:${JSON.stringify(
        penValidation.issues
      )}`
    );
  }
  process.stdout.write(
    `PASS common draw observation ${observation.observationId}\n`
  );
  process.stdout.write(
    `PASS pen static contract ${penStaticContract.snapshotId}\n`
  );
} catch (error) {
  failCli(error);
}
