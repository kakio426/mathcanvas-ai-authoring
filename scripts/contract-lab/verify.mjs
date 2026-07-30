#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { failCli } from "./lib/cli.mjs";
import { repositoryRoot } from "./lib/paths.mjs";

const commands = [
  ["validate-catalog.mjs", "--input", "research/mathcanvas/tool-catalog.snapshot.json"],
  ["validate-bundle-contract.mjs"],
  ["validate-module-variant-contract.mjs"],
  [
    "validate-wave4-number-card-canary.mjs",
    "--digit-mapping",
    "research/mathcanvas/wave4-number-card-digit-mapping.ui.json"
  ],
  ["validate-control-matrix.mjs"],
  ["validate-common-draw-contract.mjs"],
  ["validate-wave1-canary.mjs"],
  [
    "validate-wave1-canary.mjs",
    "--input",
    "research/mathcanvas/wave2-common-draw-canary.roundtrip.json",
    "--artifacts",
    "research/mathcanvas/wave2-common-draw-canary.artifacts.json",
    "--create-checkpoint",
    "research/mathcanvas/wave2-common-draw-canary.create-checkpoint.json"
  ],
  ["validate-p3-release-canary.mjs"]
];
const wave3CanaryPaths = [
  "wave3-pen-canary.roundtrip.json",
  "wave3-pen-canary.artifacts.json",
  "wave3-pen-canary.create-checkpoint.json",
  "wave3-pen-canary.save-checkpoint.json"
].map((file) =>
  join(repositoryRoot, "research", "mathcanvas", file)
);
if (wave3CanaryPaths.some((path) => existsSync(path))) {
  commands.push(["validate-wave3-pen-canary.mjs"]);
}

try {
  for (const arguments_ of commands) {
    const result = spawnSync(
      process.execPath,
      [join(repositoryRoot, "scripts", "contract-lab", arguments_[0]), ...arguments_.slice(1)],
      {
        cwd: repositoryRoot,
        encoding: "utf8"
      }
    );
    if (result.status !== 0) {
      throw new Error(
        result.stderr.trim() ||
          `${arguments_[0]} failed with exit ${result.status}`
      );
    }
    process.stdout.write(result.stdout);
  }
  process.stdout.write("PASS contract-lab committed evidence\n");
} catch (error) {
  failCli(error);
}
