#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { grade3PilotWorksheetCatalog } from "../../packages/curriculum/dist/index.js";
import {
  assertPromptHarnessMatches,
  buildEduititHtml30PromptHarness,
  defaultEduititRoot,
  defaultOutputPaths,
  promptHarnessJson,
  renderPromptPack
} from "./eduitit-html30.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const mathcanvasRoot = resolve(scriptDirectory, "..", "..");
const argumentsSet = new Set(process.argv.slice(2));
const write = argumentsSet.has("--write");
const eduititRootArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--eduitit-root="));
const eduititRoot = eduititRootArgument
  ? resolve(eduititRootArgument.slice("--eduitit-root=".length))
  : defaultEduititRoot(mathcanvasRoot);
const outputPaths = defaultOutputPaths(mathcanvasRoot);
const harness = buildEduititHtml30PromptHarness({
  eduititRoot,
  catalog: grade3PilotWorksheetCatalog
});
const expectedJson = promptHarnessJson(harness);
const expectedMarkdown = renderPromptPack(harness);

if (write) {
  writeFileSync(outputPaths.json, expectedJson);
  writeFileSync(outputPaths.markdown, expectedMarkdown);
  process.stdout.write(
    `UPDATED Eduitit HTML30 prompt harness ${harness.entries.length}/30 ${harness.contentSha256}\n`
  );
  process.exit(0);
}

for (const path of Object.values(outputPaths)) {
  if (!existsSync(path)) {
    throw new Error(`eduitit-html30-prompt-harness:artifact-missing:${path}`);
  }
}
const storedHarness = JSON.parse(readFileSync(outputPaths.json, "utf8"));
assertPromptHarnessMatches(harness, storedHarness);
if (readFileSync(outputPaths.json, "utf8") !== expectedJson) {
  throw new Error("eduitit-html30-prompt-harness:json-byte-drift");
}
if (readFileSync(outputPaths.markdown, "utf8") !== expectedMarkdown) {
  throw new Error("eduitit-html30-prompt-harness:markdown-byte-drift");
}
const exact = harness.entries.filter(
  (entry) => entry.catalogBinding.alignmentStatus === "exact"
).length;
const needsReview = harness.entries.length - exact;
process.stdout.write(
  `PASS Eduitit HTML30 prompt harness ${harness.entries.length}/30 exact=${exact} needsReview=${needsReview} ${harness.contentSha256}\n`
);
