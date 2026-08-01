#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { failCli, parseArguments } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultResearchRoot
} from "./lib/paths.mjs";

const expectedVariants = Array.from(
  { length: 9 },
  (_, index) => `NO04PD-${String(index + 1).padStart(2, "0")}`
);
const expectedValues = [10000, 1000, 100, 10, 1, 0.1, 0.01, 0.001];

try {
  const options = parseArguments(process.argv.slice(2), {
    input: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave14-place-value-model-canary.roundtrip.json"
      )
    },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
    }
  });
  const input = assertPathInside(
    options.input,
    options["research-root"],
    "wave14 place value model evidence"
  );
  const evidence = JSON.parse(readFileSync(input, "utf8"));
  const examples = evidence?.savedWireExamples;
  const values = Array.isArray(examples)
    ? examples.slice(0, 8).map((object) => object?.n)
    : [];
  const frame = Array.isArray(examples)
    ? examples.find((object) => object?.svgId === "NO04PD-09")
    : undefined;
  if (
    evidence?.schemaVersion !== "1.0.0" ||
    evidence?.evidenceId !==
      "wave14-place-value-model-canary-roundtrip" ||
    evidence?.status !== "pass" ||
    evidence?.scope?.category !== "수와 연산" ||
    evidence?.scope?.moduleKey !== "NO04PD" ||
    evidence?.lifecycle?.createdProjectCount !== 1 ||
    evidence?.lifecycle?.existingProjectWriteCount !== 0 ||
    evidence?.lifecycle?.saveCount !== 1 ||
    evidence?.lifecycle?.paletteVariantCount !== 9 ||
    evidence?.lifecycle?.savedObjectCount !== 9 ||
    evidence?.lifecycle?.reopenedObjectCount !== 9 ||
    evidence?.lifecycle?.identityPreserved !== true ||
    evidence?.interaction?.action !==
      "drag-place-value-ten-piece" ||
    evidence?.interaction?.variantId !== "NO04PD-04" ||
    evidence?.interaction?.distance < 30 ||
    evidence?.interaction?.verticalResidual > 5 ||
    JSON.stringify(evidence?.variants) !==
      JSON.stringify(expectedVariants) ||
    JSON.stringify(values) !== JSON.stringify(expectedValues) ||
    !frame ||
    frame.column !== 5 ||
    frame.row !== 1 ||
    frame.width !== 600 ||
    frame.height !== 120 ||
    !Array.isArray(evidence?.blockedWrites) ||
    evidence.blockedWrites.some((write) =>
      /\/api\/project\/(?!<redacted-project>)/.test(
        String(write?.path ?? "")
      )
    ) ||
    evidence?.previewPath !==
      ".mathcanvas-contract-lab/previews/wave14/place-value-model-contract.png"
  ) {
    throw new Error("wave14-place-value-model-evidence-invalid");
  }
  process.stdout.write(
    "PASS wave14 NO04PD 9 variants saved, moved, and reopened\n"
  );
} catch (error) {
  failCli(error);
}
