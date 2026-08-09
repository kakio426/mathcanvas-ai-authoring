#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const baselinePath = join(
  root,
  "fixtures",
  "architecture",
  "p1-core-baseline.json"
);
const roots = [
  "packages/contracts/src/vocabulary",
  "packages/mathcanvas-compiler/src/core",
  "packages/mathcanvas-compiler/src/resolve",
  "packages/validator/src/layers"
];
const fixedFiles = [
  "packages/mathcanvas-compiler/src/index.ts",
  "packages/validator/src/index.ts",
  "packages/contracts/src/catalog/worksheet-v2.ts",
  "packages/contracts/src/catalog/native-affordance-v2.ts",
  "packages/contracts/src/catalog/native-affordance-rubric-v2.ts",
  "packages/contracts/src/catalog/text-box-availability-v2.ts",
  "packages/contracts/src/catalog/editor-geometry-v1.ts",
  "packages/contracts/src/catalog/one-screen-layout-registry.ts",
  "packages/planner/src/v2.ts",
  "packages/templates/src/worksheet-v2.ts",
  "packages/authoring-runtime/src/worksheet-v2.ts"
];
const forbidden = [
  {
    label: "activity-id",
    pattern: /fraction\.compare\.unlike-denominators\.visual-v1/
  },
  { label: "activity-title", pattern: /분수 띠로 크기 비교하기/ },
  { label: "domain-literal", pattern: /분수/ },
  { label: "standard-literal", pattern: /\[6수01-07\]/ },
  {
    label: "activity-role",
    pattern:
      /["'`](?:left-strip|right-strip|left-lane-surface|right-lane-surface|relation-slot-surface|start-line|mat|work-panel|left-card|right-card|left-target|right-target)["'`]/
  },
  {
    label: "p2-activity-id",
    pattern:
      /fraction\.equivalent\.same-whole\.visual-v1|number\.make-10\.cards-v1/
  },
  {
    label: "p2-activity-title",
    pattern: /같은 크기의 분수 찾기|수 카드로 10 만들기/
  },
  {
    label: "p2-standard-literal",
    pattern: /\[6수01-06\]|\[2수01-04\]/
  }
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function collect(directory) {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory()
        ? collect(path)
        : path.endsWith(".ts") && !path.endsWith(".test.ts")
          ? [path]
          : [];
    });
}

const paths = [
  ...roots.flatMap((directory) => collect(join(root, directory))),
  ...fixedFiles.map((file) => join(root, file))
]
  .map((path) => relative(root, path))
  .sort();
const files = paths.map((path) => ({
  path,
  sha256: sha256(readFileSync(join(root, path)))
}));
const violations = paths.flatMap((path) => {
  const source = readFileSync(join(root, path), "utf8");
  return forbidden.flatMap(({ label, pattern }) =>
    pattern.test(source) ? [`${label}:${path}`] : []
  );
});
if (violations.length > 0) {
  throw new Error(
    `core-forbidden-literal:${violations.join(",")}`
  );
}

const manifest = {
  schemaVersion: "1.0.0",
  globs: [
    ...roots.map((directory) => `${directory}/**`),
    ...fixedFiles
  ],
  files,
  manifestHash: sha256(JSON.stringify(files))
};
const mode = process.argv[2] ?? "verify";
if (mode === "baseline") {
  mkdirSync(join(root, "fixtures", "architecture"), {
    recursive: true
  });
  writeFileSync(
    baselinePath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
  process.stdout.write(
    `WROTE P1 core baseline ${files.length} files ${manifest.manifestHash}\n`
  );
} else if (mode === "verify") {
  if (!existsSync(baselinePath)) {
    throw new Error("p1-core-baseline-missing");
  }
  const expected = JSON.parse(readFileSync(baselinePath, "utf8"));
  if (JSON.stringify(expected) !== JSON.stringify(manifest)) {
    throw new Error("p1-core-baseline-drift");
  }
  process.stdout.write(
    `PASS P1 core baseline ${files.length} files ${manifest.manifestHash}\n`
  );
} else {
  throw new Error(`unknown-mode:${mode}`);
}
