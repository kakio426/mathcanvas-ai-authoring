#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultResearchRoot
} from "./lib/paths.mjs";
import {
  validateWave1RoundTripEvidence
} from "./lib/round-trip-evidence.mjs";

try {
  const options = parseArguments(process.argv.slice(2), {
    input: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave1-released-baseline.roundtrip.json"
      )
    },
    artifacts: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave1-released-baseline.artifacts.json"
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
    "round-trip evidence"
  );
  const artifactsPath = assertPathInside(
    options.artifacts,
    options["research-root"],
    "round-trip artifacts"
  );
  const evidence = JSON.parse(readFileSync(inputPath, "utf8"));
  const artifacts = JSON.parse(
    readFileSync(artifactsPath, "utf8")
  );
  const validation = validateWave1RoundTripEvidence(
    evidence,
    artifacts
  );
  if (!validation.ok) {
    throw new Error(JSON.stringify(validation.issues));
  }
  process.stdout.write(
    `PASS wave1 round-trip ${evidence.toolResults.length} tools ` +
      `${evidence.render.submittedObjectCount} objects\n`
  );
} catch (error) {
  failCli(error);
}
