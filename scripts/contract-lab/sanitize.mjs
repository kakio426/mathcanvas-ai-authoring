#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultRawRoot,
  defaultSanitizedRoot
} from "./lib/paths.mjs";
import {
  assertNoSensitiveData,
  sanitizeUnknown,
  stableJson
} from "./lib/normalize.mjs";

try {
  const options = parseArguments(process.argv.slice(2), {
    input: { type: "string", required: true },
    output: { type: "string", required: true },
    "raw-root": { type: "string", default: defaultRawRoot },
    "output-root": {
      type: "string",
      default: defaultSanitizedRoot
    }
  });
  const inputPath = assertPathInside(
    options.input,
    options["raw-root"],
    "raw input"
  );
  const outputPath = assertPathInside(
    options.output,
    options["output-root"],
    "sanitized output"
  );
  const raw = JSON.parse(readFileSync(inputPath, "utf8"));
  const sanitized = sanitizeUnknown(raw);
  assertNoSensitiveData(sanitized);
  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
  writeFileSync(outputPath, stableJson(sanitized), {
    encoding: "utf8",
    mode: 0o600
  });
  process.stdout.write(`PASS sanitized ${outputPath}\n`);
} catch (error) {
  failCli(error);
}
