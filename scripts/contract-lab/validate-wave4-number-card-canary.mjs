#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { failCli, parseArguments } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultResearchRoot
} from "./lib/paths.mjs";

const digitVariantIds = Array.from(
  { length: 10 },
  (_, index) => `NO04NT-${String(index + 1).padStart(2, "0")}`
);

function sha256(value) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(`wave4-number-card-invalid:${message}`);
}

try {
  const options = parseArguments(process.argv.slice(2), {
    input: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave4-number-card-canary.roundtrip.json"
      )
    },
    "digit-mapping": {
      type: "string",
      default: join(
        defaultResearchRoot,
        "wave4-number-card-digit-mapping.ui.json"
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
    "Wave 4 number-card canary"
  );
  const digitMappingPath = assertPathInside(
    options["digit-mapping"],
    options["research-root"],
    "Wave 4 number-card digit mapping"
  );
  const evidence = JSON.parse(readFileSync(inputPath, "utf8"));
  const digitMapping = JSON.parse(
    readFileSync(digitMappingPath, "utf8")
  );
  assert(evidence.schemaVersion === "1.0.0", "schemaVersion");
  assert(
    evidence.probeId === "wave4-number-card-canary-v1",
    "probeId"
  );
  assert(
    evidence.writeBoundary?.assertedOriginalCreateCount === 1 &&
      evidence.writeBoundary?.assertedOriginalSaveCount === 1 &&
      evidence.writeBoundary?.originalWriteCountMeasured === false &&
      evidence.writeBoundary?.existingTeacherProjectReadCount === 0,
    "writeBoundary"
  );
  assert(evidence.tool?.moduleKey === "NO04NT", "moduleKey");
  assert(
    JSON.stringify(evidence.tool?.variantIds) ===
      JSON.stringify(digitVariantIds),
    "digit variants"
  );
  assert(
    evidence.lifecycle?.createdObjectCount === 10 &&
      evidence.lifecycle?.renderedObjectCount === 10 &&
      evidence.lifecycle?.reopenedObjectCount === 10 &&
      evidence.lifecycle?.objectIdsPreserved === true &&
      evidence.lifecycle?.savedSvgIdsPreserved === true &&
      evidence.lifecycle?.fieldSetCount === 1 &&
      evidence.lifecycle?.varyingFieldsExcludingPlacementAndSvgId
        ?.length === 0,
    "lifecycle"
  );
  assert(
    evidence.savedWireExample?.svgId === "NO04NT-01" &&
      evidence.savedWireExample?.parent?.variation === 25 &&
      evidence.savedWireExample?.numberFrameSnap === true,
    "saved wire"
  );
  assert(
    ["verified", "released", "lifecycle"].every(
      (kind) =>
        typeof evidence.claims?.NO04NT?.[kind] === "string" &&
        evidence.claims.NO04NT[kind].length > 0
    ),
    "claims"
  );
  assert(
    digitMapping.schemaVersion === "1.0.0" &&
      digitMapping.source === "teacher-owned-connected-chrome" &&
      digitMapping.writePerformed === false &&
      Array.isArray(digitMapping.mapping) &&
      digitMapping.mapping.length === 10 &&
      digitMapping.mapping.every(
        (entry, index) =>
          entry.value === index &&
          entry.variantId === digitVariantIds[index] &&
          entry.row === Math.floor(index / 5) + 1 &&
          entry.column === (index % 5) + 1
      ),
    "digit mapping UI evidence"
  );
  const artifacts = {
    categoryIds: evidence.categoryIds,
    tool: evidence.tool,
    lifecycle: evidence.lifecycle,
    savedWireExample: evidence.savedWireExample
  };
  assert(
    evidence.provenance?.artifactsHash === sha256(artifacts),
    "artifactsHash"
  );
  assert(
    evidence.provenance?.submittedPayloadHash ===
      sha256(evidence.savedWireExample),
    "submittedPayloadHash"
  );
  process.stdout.write(
    "PASS wave4 number-card canary NO04NT-01..10\n"
  );
} catch (error) {
  failCli(error);
}
