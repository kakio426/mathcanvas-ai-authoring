#!/usr/bin/env node
import { createHash } from "node:crypto";
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
import { stableJson } from "./lib/normalize.mjs";
import {
  buildModuleVariantStaticContract,
  validateModuleVariantStaticContract
} from "./lib/module-variant-contract.mjs";

try {
  const options = parseArguments(process.argv.slice(2), {
    bundle: {
      type: "string",
      default: join(defaultRawRoot, "main-bundle.raw.js")
    },
    snapshot: {
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
        "module-variant-contract.static.json"
      )
    },
    "raw-root": { type: "string", default: defaultRawRoot },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
    }
  });
  const bundlePath = assertPathInside(
    options.bundle,
    options["raw-root"],
    "bundle input"
  );
  const snapshotPath = assertPathInside(
    options.snapshot,
    options["research-root"],
    "bundle snapshot"
  );
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "module variant contract"
  );
  const source = readFileSync(bundlePath, "utf8");
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  if (
    Buffer.byteLength(source) !== snapshot.bundle.bytes ||
    createHash("sha256").update(source).digest("hex") !==
      snapshot.bundle.sha256
  ) {
    throw new Error("module-variant-bundle-hash-mismatch");
  }
  const contract = buildModuleVariantStaticContract(snapshot);
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
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, stableJson(contract), "utf8");
  process.stdout.write(
    `PASS all-unit module variant contract ` +
      `${contract.counts.modules} modules ` +
      `${contract.counts.variants} variants ` +
      `${contract.counts.clusters} clusters\n`
  );
} catch (error) {
  failCli(error);
}
