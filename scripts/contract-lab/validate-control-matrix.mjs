#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultResearchRoot
} from "./lib/paths.mjs";
import { assertNoSensitiveData } from "./lib/normalize.mjs";
import {
  validateControlContractMatrix
} from "./lib/control-contract.mjs";

try {
  const options = parseArguments(process.argv.slice(2), {
    catalog: {
      type: "string",
      default: `${defaultResearchRoot}/tool-catalog.snapshot.json`
    },
    matrix: {
      type: "string",
      default: `${defaultResearchRoot}/control-contract.matrix.json`
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
  const matrixPath = assertPathInside(
    options.matrix,
    options["research-root"],
    "matrix input"
  );
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
  assertNoSensitiveData(matrix);
  const issues = validateControlContractMatrix(matrix, catalog);
  if (issues.length > 0) {
    throw new Error(
      `control-matrix-invalid:\n${issues
        .map((issue) => `- ${issue.path}: ${issue.message}`)
        .join("\n")}`
    );
  }
  process.stdout.write(
    `PASS control matrix ${matrix.counts.toolMappings} tool mappings ` +
      `${matrix.counts.editorControls} editor controls\n`
  );
} catch (error) {
  failCli(error);
}
