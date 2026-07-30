#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultRawRoot,
  defaultResearchRoot
} from "./lib/paths.mjs";
import {
  assertNoSensitiveData,
  stableJson
} from "./lib/normalize.mjs";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right)
  );
}

function extractVariants(source, moduleId) {
  const expression = new RegExp(
    `["'\`](${escapeRegExp(moduleId)}-[A-Za-z0-9_-]+)["'\`]`,
    "g"
  );
  return uniqueSorted(
    [...source.matchAll(expression)].map((match) => match[1])
  );
}

function extractSubToolbarOptions(source, moduleId) {
  const expression = new RegExp(
    `view\\.SubToolbar\\.${escapeRegExp(moduleId)}\\.([A-Za-z0-9_]+)["'\`]\\)\\|\\|["'\`]([^"'\`]+)["'\`]`,
    "g"
  );
  return [...source.matchAll(expression)]
    .map((match) => ({
      optionKey: match[1],
      observedLabel: match[2]
    }))
    .filter(
      (option, index, array) =>
        array.findIndex(
          (candidate) =>
            candidate.optionKey === option.optionKey &&
            candidate.observedLabel === option.observedLabel
        ) === index
    )
    .sort((left, right) =>
      `${left.optionKey}:${left.observedLabel}`.localeCompare(
        `${right.optionKey}:${right.observedLabel}`
      )
    );
}

function extractComponentRegistryKeys(source) {
  const marker = "R$t={";
  const start = source.indexOf(marker);
  const end =
    start < 0 ? -1 : source.indexOf("},Z$t=", start + marker.length);
  if (start < 0 || end < 0) return [];
  return uniqueSorted(
    [...source.slice(start + marker.length, end).matchAll(
      /(?:^|,)([A-Z][A-Z0-9]+):/g
    )].map((match) => match[1])
  );
}

function splitTopLevelObjects(value) {
  const objects = [];
  let start = -1;
  let braceDepth = 0;
  let bracketDepth = 0;
  let quote = "";
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "[") bracketDepth += 1;
    if (character === "]") bracketDepth -= 1;
    if (character === "{") {
      if (braceDepth === 0 && bracketDepth === 0) start = index;
      braceDepth += 1;
    }
    if (character === "}") {
      braceDepth -= 1;
      if (braceDepth === 0 && bracketDepth === 0 && start >= 0) {
        objects.push(value.slice(start, index + 1));
        start = -1;
      }
    }
  }
  return objects;
}

function extractFactoryRegistry(source) {
  const marker = "P6t=[";
  const start = source.indexOf(marker);
  const end =
    start < 0
      ? -1
      : source.indexOf("],l1=s=>", start + marker.length);
  if (start < 0 || end < 0) {
    throw new Error("bundle-factory-registry-unavailable");
  }
  const table = source.slice(start + marker.length, end);
  return splitTopLevelObjects(table)
    .map((entry) => {
      const id = entry.match(/^\{id:"([^"]+)"/)?.[1];
      const elementToken = entry.match(
        /,element:([A-Za-z0-9_$]+)/
      )?.[1];
      const parentElementToken = entry.match(
        /,parentElement:([A-Za-z0-9_$]+)/
      )?.[1];
      const paramsMatch = entry.match(
        /,params:(.+)\}$/
      )?.[1];
      if (!id || !elementToken) return null;
      return {
        id,
        elementToken,
        parentElementToken: parentElementToken ?? null,
        paramsExpression: paramsMatch ?? null,
        constructorFamily:
          `element:${elementToken}|parent:${parentElementToken ?? "none"}`
      };
    })
    .filter(Boolean);
}

function findBalancedBody(source, openingBrace) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = openingBrace; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openingBrace + 1, index);
    }
  }
  return null;
}

function extractClassShape(source, token) {
  const starts = [
    source.indexOf(`class ${token} extends `),
    source.indexOf(`${token}=class extends `),
    source.indexOf(`${token}=class ${token} extends `)
  ].filter((index) => index >= 0);
  if (starts.length === 0) {
    return {
      elementToken: token,
      constructorFound: false,
      declaredFields: [],
      assignedFields: [],
      fieldSignature: []
    };
  }
  const classStart = Math.min(...starts);
  const constructorStart = source.indexOf(
    "constructor(",
    classStart
  );
  if (
    constructorStart < 0 ||
    constructorStart - classStart > 5000
  ) {
    return {
      elementToken: token,
      constructorFound: false,
      declaredFields: [],
      assignedFields: [],
      fieldSignature: []
    };
  }
  const openingBrace = source.indexOf("{", constructorStart);
  const body = findBalancedBody(source, openingBrace);
  if (body === null) {
    return {
      elementToken: token,
      constructorFound: false,
      declaredFields: [],
      assignedFields: [],
      fieldSignature: []
    };
  }
  const declaredFields = uniqueSorted(
    [...body.matchAll(/I\(this,"([^"]+)"/g)].map(
      (match) => match[1]
    )
  );
  const assignedFields = uniqueSorted(
    [...body.matchAll(/this\.([A-Za-z0-9_$]+)\s*=/g)].map(
      (match) => match[1]
    )
  );
  const fieldSignature = uniqueSorted([
    ...declaredFields,
    ...assignedFields
  ]);
  return {
    elementToken: token,
    constructorFound: true,
    declaredFields,
    assignedFields,
    fieldSignature
  };
}

try {
  const options = parseArguments(process.argv.slice(2), {
    bundle: {
      type: "string",
      default: join(defaultRawRoot, "main-bundle.raw.js")
    },
    metadata: {
      type: "string",
      default: join(defaultRawRoot, "main-bundle.raw.metadata.json")
    },
    catalog: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "tool-catalog.snapshot.json"
      )
    },
    output: {
      type: "string",
      default: join(
        defaultResearchRoot,
        "bundle-contract.snapshot.json"
      )
    },
    "raw-root": { type: "string", default: defaultRawRoot },
    "research-root": {
      type: "string",
      default: defaultResearchRoot
    }
  });
  const bundlePath = assertPathInside(
    options.bundle,
    options["raw-root"],
    "bundle raw input"
  );
  const metadataPath = assertPathInside(
    options.metadata,
    options["raw-root"],
    "bundle metadata input"
  );
  const catalogPath = assertPathInside(
    options.catalog,
    options["research-root"],
    "catalog input"
  );
  const outputPath = assertPathInside(
    options.output,
    options["research-root"],
    "research output"
  );
  const source = readFileSync(bundlePath, "utf8");
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const actualHash = createHash("sha256").update(source).digest("hex");
  if (metadata.sha256 !== actualHash) {
    throw new Error("bundle-hash-mismatch");
  }
  const registryKeys = new Set(extractComponentRegistryKeys(source));
  const factoryRegistry = extractFactoryRegistry(source);
  const classShapes = uniqueSorted(
    factoryRegistry.map((entry) => entry.elementToken)
  ).map((token) => extractClassShape(source, token));
  const classShapeByToken = new Map(
    classShapes.map((shape) => [shape.elementToken, shape])
  );
  for (const shape of classShapes) {
    shape.shapeFamily =
      "shape:" +
      createHash("sha256")
        .update(
          JSON.stringify({
            constructorFound: shape.constructorFound,
            fieldSignature: shape.fieldSignature
          })
        )
        .digest("hex")
        .slice(0, 16);
  }
  const factoryById = new Map(
    factoryRegistry.map((entry) => [
      entry.id,
      {
        ...entry,
        shapeFamily:
          classShapeByToken.get(entry.elementToken)?.shapeFamily ??
          "shape:unavailable"
      }
    ])
  );
  const tools = catalog.tools
    .filter((tool) => tool.surfaceKind === "math-palette")
    .map((tool) => {
      const variants = extractVariants(source, tool.moduleKey);
      const subToolbarOptions = extractSubToolbarOptions(
        source,
        tool.moduleKey
      );
      const factoryVariants = variants
        .map((variant) => factoryById.get(variant))
        .filter(Boolean);
      return {
        stableKey: tool.stableKey,
        observedName: tool.observedName,
        categoryId: tool.categoryId,
        moduleKey: tool.moduleKey,
        componentRegistryKeyPresent: registryKeys.has(tool.moduleKey),
        variants,
        factoryVariants,
        factoryCoverage: {
          discoveredVariants: variants.length,
          factoryEntries: factoryVariants.length,
          missingFactoryEntries: variants.filter(
            (variant) => !factoryById.has(variant)
          )
        },
        subToolbarOptions,
        evidence: [
          {
            type: "bundle",
            locator: `${metadata.request.path}#module:${tool.moduleKey}`
          }
        ],
        contractStatus: "captured",
        limitation:
          "정적 bundle 증거이며 native 저장·재열기 lifecycle 검증 전입니다."
      };
    });
  const paletteModuleKeys = new Set(
    tools.map((tool) => tool.moduleKey)
  );
  const nonPaletteModules = [...registryKeys]
    .filter((moduleKey) => !paletteModuleKeys.has(moduleKey))
    .map((moduleKey) => {
      const variants = extractVariants(source, moduleKey);
      return {
        moduleKey,
        classification: "bundle-only-not-palette-visible",
        reason:
          "main bundle component registry에는 있으나 공식 toolbar API와 인증된 도구 설정 화면에는 노출되지 않습니다.",
        variants,
        factoryVariants: variants
          .map((variant) => factoryById.get(variant))
          .filter(Boolean),
        subToolbarOptions: extractSubToolbarOptions(
          source,
          moduleKey
        ),
        evidence: [
          {
            type: "bundle",
            locator: `${metadata.request.path}#component-registry:${moduleKey}`
          },
          {
            type: "network",
            locator: "/api/canvas/toolbar#absent"
          },
          {
            type: "dom",
            locator: "tool-settings-modal#absent"
          }
        ]
      };
    })
    .sort((left, right) =>
      left.moduleKey.localeCompare(right.moduleKey)
    );
  const requestedCommonFactoryIds = [
    "angleElem",
    "circleElem",
    "drawElem",
    "input-text",
    "math-latex",
    "pointElem",
    "straightElem"
  ];
  const commonNativeFactories = requestedCommonFactoryIds.map((id) => {
    const factory = factoryById.get(id);
    return factory
      ? { id, found: true, factory }
      : {
          id,
          found: false,
          unknownReason:
            "독립 factory ID가 P6t registry에 없습니다. drawElem 공유 여부는 deep-probe에서 확인해야 합니다."
        };
  });
  const snapshot = {
    schemaVersion: "1.0.0",
    snapshotId: `mathcanvas-bundle-contract-${catalog.observation.observationDate}`,
    observation: catalog.observation,
    catalogFingerprint: catalog.paletteFingerprint,
    bundle: {
      path: metadata.request.path,
      sha256: metadata.sha256,
      bytes: metadata.bytes
    },
    componentRegistryKeys: [...registryKeys].sort(),
    nonPaletteModules,
    commonNativeFactories,
    classShapes,
    tools,
    counts: {
      tools: tools.length,
      componentRegistryKeys: registryKeys.size,
      nonPaletteModules: nonPaletteModules.length,
      nonPaletteVariants: nonPaletteModules.reduce(
        (sum, module) => sum + module.variants.length,
        0
      ),
      nonPaletteSubToolbarOptions: nonPaletteModules.reduce(
        (sum, module) => sum + module.subToolbarOptions.length,
        0
      ),
      commonNativeFactoryCandidates:
        commonNativeFactories.length,
      commonNativeFactoriesFound: commonNativeFactories.filter(
        (factory) => factory.found
      ).length,
      commonNativeFactoriesMissing: commonNativeFactories.filter(
        (factory) => !factory.found
      ).length,
      factoryRegistryEntries: factoryRegistry.length,
      constructorFamilies: new Set(
        factoryRegistry.map((entry) => entry.constructorFamily)
      ).size,
      classShapes: classShapes.length,
      classShapesFound: classShapes.filter(
        (shape) => shape.constructorFound
      ).length,
      shapeFamilies: new Set(
        classShapes.map((shape) => shape.shapeFamily)
      ).size,
      moduleFactoryEntries: tools.reduce(
        (sum, tool) => sum + tool.factoryVariants.length,
        0
      ),
      moduleVariantsMissingFactory: tools.reduce(
        (sum, tool) =>
          sum + tool.factoryCoverage.missingFactoryEntries.length,
        0
      ),
      toolsWithComponentRegistryKey: tools.filter(
        (tool) => tool.componentRegistryKeyPresent
      ).length,
      toolsWithVariants: tools.filter(
        (tool) => tool.variants.length > 0
      ).length,
      variants: tools.reduce(
        (sum, tool) => sum + tool.variants.length,
        0
      ),
      toolsWithSubToolbarOptions: tools.filter(
        (tool) => tool.subToolbarOptions.length > 0
      ).length,
      subToolbarOptions: tools.reduce(
        (sum, tool) => sum + tool.subToolbarOptions.length,
        0
      )
    }
  };
  assertNoSensitiveData(snapshot);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, stableJson(snapshot), "utf8");
  process.stdout.write(
    `PASS bundle contract ${snapshot.counts.tools} tools ` +
      `${snapshot.counts.variants} variants ` +
      `${snapshot.counts.subToolbarOptions} options ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
}
