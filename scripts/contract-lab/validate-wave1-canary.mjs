#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultResearchRoot,
  repositoryRoot
} from "./lib/paths.mjs";
import {
  WAVE1_CANARY_ARTIFACT_ID,
  WAVE1_CANARY_PROBE_ID,
  WAVE1_CANARY_RECOVERY_ARTIFACT_ID,
  WAVE1_CANARY_RECOVERY_PROBE_ID,
  WAVE2_CANARY_ARTIFACT_ID,
  WAVE2_CANARY_PROBE_ID,
  validateWave1CanaryEvidence,
  validateWave1CanaryRecoveryEvidence,
  validateWave2CanaryEvidence
} from "./lib/canary-evidence.mjs";

try {
  const options = parseArguments(process.argv.slice(2), {
    input: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave1-current-golden-canary.roundtrip.json"
      )
    },
    artifacts: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave1-current-golden-canary.artifacts.json"
      )
    },
    "create-checkpoint": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave2-common-draw-canary.create-checkpoint.json"
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
    "canary evidence"
  );
  const artifactsPath = assertPathInside(
    options.artifacts,
    options["research-root"],
    "canary artifacts"
  );
  const goldenFixture = JSON.parse(
    readFileSync(
      join(
        repositoryRoot,
        "fixtures",
        "golden",
        "fraction-comparison.p0-v1.json"
      ),
      "utf8"
    )
  );
  const evidence = JSON.parse(readFileSync(inputPath, "utf8"));
  const artifacts = JSON.parse(
    readFileSync(artifactsPath, "utf8")
  );
  const recoveryPair =
    evidence?.probeId === WAVE1_CANARY_RECOVERY_PROBE_ID &&
    artifacts?.artifactId === WAVE1_CANARY_RECOVERY_ARTIFACT_ID;
  const livePair =
    evidence?.probeId === WAVE1_CANARY_PROBE_ID &&
    artifacts?.artifactId === WAVE1_CANARY_ARTIFACT_ID;
  const wave2Pair =
    evidence?.probeId === WAVE2_CANARY_PROBE_ID &&
    artifacts?.artifactId === WAVE2_CANARY_ARTIFACT_ID;
  const createCheckpoint = wave2Pair
    ? JSON.parse(
        readFileSync(
          assertPathInside(
            options["create-checkpoint"],
            options["research-root"],
            "Wave 2 create checkpoint"
          ),
          "utf8"
        )
      )
    : undefined;
  const validation = recoveryPair
    ? validateWave1CanaryRecoveryEvidence({
        evidence,
        artifacts,
        goldenFixture
      })
    : livePair
      ? validateWave1CanaryEvidence({
          evidence,
          artifacts,
          goldenFixture
        })
      : wave2Pair
        ? validateWave2CanaryEvidence({
            evidence,
            artifacts,
            createCheckpoint,
            goldenFixture
          })
      : {
          ok: false,
          issues: [
            {
              path: "identity",
              message:
                "canary probeId와 artifactId 조합이 일치해야 합니다."
            }
          ]
        };
  if (!validation.ok) {
    throw new Error(
      `canary-evidence-invalid:${JSON.stringify(
        validation.issues
      )}`
    );
  }
  process.stdout.write(
    `PASS ${
      wave2Pair
        ? "wave2 common draw"
        : "wave1 current-golden"
    } canary ${evidence.provenance.runId}\n`
  );
} catch (error) {
  failCli(error);
}
