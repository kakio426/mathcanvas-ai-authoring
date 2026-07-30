#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultRawRoot
} from "./lib/paths.mjs";
import { stableJson } from "./lib/normalize.mjs";

const origin = "https://mathcanvas.vivasam.com";
const toolbarPath = "/api/canvas/toolbar";

function assertToolbarPayload(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("toolbar-contract-invalid: category 배열이 없습니다.");
  }
  const categoryIds = new Set();
  const moduleIds = new Set();
  for (const [categoryIndex, category] of value.entries()) {
    if (
      !category ||
      category.type !== "Unit" ||
      typeof category.itemId !== "string" ||
      typeof category.title !== "string" ||
      !Array.isArray(category.children)
    ) {
      throw new Error(
        `toolbar-contract-invalid: categories[${categoryIndex}]`
      );
    }
    if (categoryIds.has(category.itemId)) {
      throw new Error(
        `toolbar-contract-invalid: duplicate category ${category.itemId}`
      );
    }
    categoryIds.add(category.itemId);
    for (const [moduleIndex, module] of category.children.entries()) {
      if (
        !module ||
        module.type !== "Module" ||
        typeof module.itemId !== "string" ||
        typeof module.title !== "string" ||
        module.parentItemId !== category.itemId
      ) {
        throw new Error(
          `toolbar-contract-invalid: categories[${categoryIndex}].children[${moduleIndex}]`
        );
      }
      if (moduleIds.has(module.itemId)) {
        throw new Error(
          `toolbar-contract-invalid: duplicate module ${module.itemId}`
        );
      }
      moduleIds.add(module.itemId);
    }
  }
}

try {
  const options = parseArguments(process.argv.slice(2), {
    output: {
      type: "string",
      default: join(defaultRawRoot, "toolbar.raw.json")
    },
    "raw-root": { type: "string", default: defaultRawRoot }
  });
  const outputPath = assertPathInside(
    options.output,
    options["raw-root"],
    "raw output"
  );
  const response = await fetch(`${origin}${toolbarPath}`, {
    method: "GET",
    headers: { accept: "application/json" },
    redirect: "error"
  });
  if (!response.ok) {
    throw new Error(`toolbar-request-failed: HTTP ${response.status}`);
  }
  const payload = await response.json();
  assertToolbarPayload(payload);
  const capture = {
    captureVersion: "1.0.0",
    capturedAt: new Date().toISOString(),
    request: {
      method: "GET",
      origin,
      path: toolbarPath,
      status: response.status
    },
    categories: payload
  };
  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
  writeFileSync(outputPath, stableJson(capture), {
    encoding: "utf8",
    mode: 0o600
  });
  const moduleCount = payload.reduce(
    (sum, category) => sum + category.children.length,
    0
  );
  process.stdout.write(
    `PASS toolbar ${payload.length} categories ${moduleCount} modules ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
}
