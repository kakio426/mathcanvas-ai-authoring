#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  buildCommonDrawObservation,
  extractMathPaletteModuleKeys,
  validateCommonDrawObservation
} from "./lib/common-draw-contract.mjs";
import { stableJson } from "./lib/normalize.mjs";
import {
  assertPathInside,
  defaultResearchRoot,
  defaultSanitizedRoot,
  repositoryRoot
} from "./lib/paths.mjs";

const origin = "https://mathcanvas.vivasam.com";
const publicFixturePattern =
  /^\/api\/public-project\/P_[A-Za-z0-9_-]+$/;

try {
  const options = parseArguments(process.argv.slice(2), {
    output: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "common-draw-contract.observations.json"
      )
    },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
    },
    "observation-date": {
      type: "string",
      default: new Date().toISOString().slice(0, 10)
    },
    "candidate-output": {
      type: "string",
      default: join(
        defaultSanitizedRoot,
        "common-draw-contract.candidates.json"
      )
    },
    "candidate-root": {
      type: "string",
      default: defaultSanitizedRoot
    }
  });
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "common draw observation output"
  );
  const candidateOutputPath = assertPathInside(
    options["candidate-output"],
    options["candidate-root"],
    "common draw candidate output"
  );
  const metadata = JSON.parse(
    readFileSync(
      join(
        repositoryRoot,
        "fixtures",
        "mathcanvas",
        "contract-metadata.json"
      ),
      "utf8"
    )
  );
  const endpoints = metadata.preflightFixtureEndpoints;
  const catalog = JSON.parse(
    readFileSync(
      join(
        repositoryRoot,
        "research",
        "mathcanvas",
        "tool-catalog.snapshot.json"
      ),
      "utf8"
    )
  );
  const catalogModuleKeys =
    extractMathPaletteModuleKeys(catalog);
  if (
    !Array.isArray(endpoints) ||
    endpoints.length === 0 ||
    endpoints.some(
      (endpoint) =>
        typeof endpoint !== "string" ||
        !publicFixturePattern.test(endpoint)
    )
  ) {
    throw new Error("public-fixture-endpoints-invalid");
  }

  const responses = [];
  for (const endpoint of endpoints) {
    const response = await fetch(`${origin}${endpoint}`, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      headers: { accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error(
        `public-fixture-read-failed:${response.status}`
      );
    }
    responses.push({
      status: response.status,
      body: await response.json()
    });
  }

  const observation = buildCommonDrawObservation({
    observationDate: options["observation-date"],
    responses,
    catalogModuleKeys
  });
  const validation = validateCommonDrawObservation(observation, {
    catalogModuleKeys
  });
  if (!validation.ok) {
    const candidateOnly =
      observation.drawObservation.unresolvedCandidateShapes.length >
        0 &&
      validation.issues.every(
        (issue) =>
          issue.path ===
          "drawObservation.unresolvedCandidateShapes"
      );
    if (candidateOnly) {
      mkdirSync(dirname(candidateOutputPath), {
        recursive: true,
        mode: 0o700
      });
      writeFileSync(candidateOutputPath, stableJson(observation), {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600
      });
    }
    throw new Error(
      `common-draw-observation-invalid:${JSON.stringify(
        validation.issues
      )}${
        candidateOnly
          ? `:candidate-preserved:${candidateOutputPath}`
          : ""
      }`
    );
  }
  writeFileSync(outputPath, stableJson(observation), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  process.stdout.write(
    `PASS common draw read-only observation ${responses.length} GET 0 write\n`
  );
} catch (error) {
  failCli(error);
}
