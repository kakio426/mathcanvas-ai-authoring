#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultRawRoot,
  defaultResearchRoot
} from "./lib/paths.mjs";
import {
  buildPenStaticContract,
  validatePenStaticContract
} from "./lib/common-draw-contract.mjs";
import { stableJson } from "./lib/normalize.mjs";

try {
  const options = parseArguments(process.argv.slice(2), {
    bundle: {
      type: "string",
      default: join(defaultRawRoot, "main-bundle.raw.js")
    },
    "bundle-snapshot": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "bundle-contract.snapshot.json"
      )
    },
    output: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "pen-contract.static.json"
      )
    },
    "raw-root": {
      type: "string",
      default: defaultRawRoot
    },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
    }
  });
  const bundlePath = assertPathInside(
    options.bundle,
    options["raw-root"],
    "pen bundle input"
  );
  const bundleSnapshotPath = assertPathInside(
    options["bundle-snapshot"],
    options["research-root"],
    "bundle snapshot"
  );
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "pen static contract"
  );
  const source = readFileSync(bundlePath, "utf8");
  const bundleSnapshot = JSON.parse(
    readFileSync(bundleSnapshotPath, "utf8")
  );
  const contract = buildPenStaticContract({
    source,
    bundle: bundleSnapshot.bundle
  });
  const validation = validatePenStaticContract(contract, {
    bundle: bundleSnapshot.bundle
  });
  if (!validation.ok) {
    throw new Error(
      `pen-static-contract-invalid:${JSON.stringify(
        validation.issues
      )}`
    );
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, stableJson(contract), "utf8");
  process.stdout.write(
    `PASS pen static contract ${contract.snapshotId} ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
}
