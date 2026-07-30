#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultResearchRoot
} from "./lib/paths.mjs";
import {
  validateModuleVariantStaticContract
} from "./lib/module-variant-contract.mjs";

try {
  const options = parseArguments(process.argv.slice(2), {
    input: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "module-variant-contract.static.json"
      )
    },
    snapshot: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "bundle-contract.snapshot.json"
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
    "module variant contract"
  );
  const snapshotPath = assertPathInside(
    options.snapshot,
    options["research-root"],
    "bundle snapshot"
  );
  const contract = JSON.parse(readFileSync(inputPath, "utf8"));
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const validation = validateModuleVariantStaticContract(
    contract,
    snapshot
  );
  if (!validation.ok) {
    throw new Error(
      `module-variant-contract-invalid:${JSON.stringify(
        validation.issues
      )}`
    );
  }
  process.stdout.write(
    `PASS all-unit module variant contract ` +
      `${contract.counts.modules} modules ` +
      `${contract.counts.variants} variants ` +
      `${contract.counts.clusters} clusters\n`
  );
} catch (error) {
  failCli(error);
}
