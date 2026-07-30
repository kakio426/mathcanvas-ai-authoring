#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertNoSensitiveData,
  stableJson
} from "./lib/normalize.mjs";
import {
  normalizeCatalogSnapshot,
  validateCatalogSnapshot
} from "./lib/catalog.mjs";

try {
  const options = parseArguments(process.argv.slice(2), {
    input: { type: "string", required: true },
    "print-normalized": { type: "boolean" }
  });
  const raw = JSON.parse(readFileSync(options.input, "utf8"));
  const normalized = normalizeCatalogSnapshot(raw);
  assertNoSensitiveData(normalized);
  const issues = validateCatalogSnapshot(normalized, {
    maxSupportState: "captured"
  });
  if (issues.length > 0) {
    throw new Error(
      `catalog-invalid:\n${issues
        .map((value) => `- ${value.path}: ${value.message}`)
        .join("\n")}`
    );
  }
  if (options["print-normalized"]) {
    process.stdout.write(stableJson(normalized));
  } else {
    process.stdout.write(
      `PASS catalog ${normalized.snapshotId} ` +
        `${normalized.counts.categories} categories ` +
        `${normalized.counts.tools} tools ` +
        `${normalized.paletteFingerprint}\n`
    );
  }
} catch (error) {
  failCli(error);
}
