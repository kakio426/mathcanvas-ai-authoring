#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultResearchRoot
} from "./lib/paths.mjs";
import { assertNoSensitiveData } from "./lib/normalize.mjs";
import {
  validateBundleContractSnapshot
} from "./lib/bundle-contract.mjs";

try {
  const options = parseArguments(process.argv.slice(2), {
    catalog: {
      type: "string",
      default: `${defaultResearchRoot}/tool-catalog.snapshot.json`
    },
    snapshot: {
      type: "string",
      default: `${defaultResearchRoot}/bundle-contract.snapshot.json`
    },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
    }
  });
  const catalogPath = assertPathInside(
    options.catalog,
    options["research-root"],
    "catalog input"
  );
  const snapshotPath = assertPathInside(
    options.snapshot,
    options["research-root"],
    "bundle contract input"
  );
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  assertNoSensitiveData(snapshot);
  const issues = validateBundleContractSnapshot(snapshot, catalog);
  if (issues.length > 0) {
    throw new Error(
      `bundle-contract-invalid:\n${issues
        .map((issue) => `- ${issue.path}: ${issue.message}`)
        .join("\n")}`
    );
  }
  process.stdout.write(
    `PASS bundle contract ${snapshot.counts.tools} tools ` +
      `${snapshot.counts.variants} variants ` +
      `${snapshot.counts.subToolbarOptions} options\n`
  );
} catch (error) {
  failCli(error);
}
