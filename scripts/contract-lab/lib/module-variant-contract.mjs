import { assertNoSensitiveData } from "./normalize.mjs";
import { exactRoundTripHash } from "./round-trip-evidence.mjs";

export const MATHCANVAS_CATEGORY_COUNTS = {
  Unit01: { modules: 16, variants: 168, options: 28 },
  Unit02: { modules: 6, variants: 38, options: 8 },
  Unit03: { modules: 12, variants: 75, options: 11 },
  Unit04: { modules: 12, variants: 23, options: 19 }
};

const nestedFields = new Set([
  "arr",
  "connectedBoardId",
  "connectedElementsId",
  "elements",
  "head",
  "items",
  "keys",
  "numbers",
  "snaps"
]);

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right)
  );
}

function withoutIntegrity(contract) {
  const { integrity: _integrity, ...hashInput } = contract;
  return hashInput;
}

export function moduleVariantStaticContractHash(contract) {
  return exactRoundTripHash(withoutIntegrity(contract));
}

export function buildModuleVariantStaticContract(bundleSnapshot) {
  const bundle = bundleSnapshot?.bundle;
  const categoryIds = Object.keys(MATHCANVAS_CATEGORY_COUNTS);
  const tools = (bundleSnapshot?.tools ?? [])
    .filter((tool) => categoryIds.includes(tool.categoryId))
    .sort((left, right) =>
      left.moduleKey.localeCompare(right.moduleKey)
    );
  const invalidCategory = categoryIds.some((categoryId) => {
    const categoryTools = tools.filter(
      (tool) => tool.categoryId === categoryId
    );
    const expected = MATHCANVAS_CATEGORY_COUNTS[categoryId];
    return (
      categoryTools.length !== expected.modules ||
      categoryTools.reduce(
        (sum, tool) => sum + tool.factoryVariants.length,
        0
      ) !== expected.variants ||
      categoryTools.reduce(
        (sum, tool) => sum + tool.subToolbarOptions.length,
        0
      ) !== expected.options
    );
  });
  if (
    !/^[a-f0-9]{64}$/.test(bundle?.sha256 ?? "") ||
    invalidCategory ||
    new Set(tools.map((tool) => tool.moduleKey)).size !== tools.length ||
    tools.some(
      (tool) =>
        tool.factoryVariants?.length !== tool.variants?.length ||
        tool.factoryCoverage?.missingFactoryEntries?.length !== 0
    )
  ) {
    throw new Error("module-variant-bundle-snapshot-invalid");
  }

  const shapeByFamily = new Map(
    (bundleSnapshot.classShapes ?? []).map((shape) => [
      shape.shapeFamily,
      shape
    ])
  );
  const clusters = new Map();
  const modules = tools.map((tool) => {
    const variants = [...tool.factoryVariants]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((variant) => {
        const shape = shapeByFamily.get(variant.shapeFamily);
        if (!shape?.constructorFound) {
          throw new Error(
            `module-variant-shape-unavailable:${variant.id}`
          );
        }
        const cluster = {
          constructorFamily: variant.constructorFamily,
          elementToken: variant.elementToken,
          parentElementToken: variant.parentElementToken,
          shapeFamily: variant.shapeFamily,
          fieldSignature: [...shape.fieldSignature].sort()
        };
        const clusterId =
          `cluster:${exactRoundTripHash(cluster).slice(0, 16)}`;
        const previous = clusters.get(clusterId);
        if (
          previous &&
          exactRoundTripHash(previous) !==
            exactRoundTripHash({ clusterId, ...cluster })
        ) {
          throw new Error(`module-variant-cluster-collision:${clusterId}`);
        }
        clusters.set(clusterId, { clusterId, ...cluster });
        return {
          variantId: variant.id,
          clusterId,
          paramsExpression: variant.paramsExpression
        };
      });
    const moduleClusters = variants.map((variant) =>
      clusters.get(variant.clusterId)
    );
    const unknown = [
      {
        field: "savedSvgId",
        reason:
          tool.moduleKey === "NO03FM"
            ? "기존 released 근거는 직사각형 분수 모형 일부에 한정되며 전체 variant 저장 ID는 확인하지 않았습니다."
            : "factory variant ID와 실제 저장 svgId의 동일성을 lifecycle에서 확인하지 않았습니다."
      },
      {
        field: "serverNormalization",
        reason:
          "생성·저장·재열기에서 서버가 native field를 보존·정규화·거절하는지 확인하지 않았습니다."
      },
      {
        field: "wireFieldTypes",
        reason:
          "constructor field 이름은 확인했지만 실제 저장 JSON의 값 타입은 확인하지 않았습니다."
      },
      ...(variants.some(
        (variant) =>
          typeof variant.paramsExpression === "string" &&
          !variant.paramsExpression.trim().startsWith("[")
      )
        ? [{
            field: "factoryParameterSemantics",
            reason:
              "bundle helper 호출형 params의 인자 의미를 lifecycle에서 확인하지 않았습니다."
          }]
        : []),
      ...(moduleClusters.some((cluster) =>
        cluster.fieldSignature.some((field) =>
          nestedFields.has(field)
        )
      )
        ? [{
            field: "nestedObjectLifecycle",
            reason:
              "container·board 계열 자식 객체의 생성·저장·재열기 계약을 확인하지 않았습니다."
          }]
        : []),
      ...(variants.some((variant) => {
        const referencedId =
          typeof variant.paramsExpression === "string"
            ? variant.paramsExpression.match(
                /"([A-Z][A-Z0-9]+-\d+)"/
              )?.[1]
            : undefined;
        return (
          referencedId !== undefined &&
          !referencedId.startsWith(`${tool.moduleKey}-`)
        );
      })
        ? [{
            field: "factoryVariantIdMismatch",
            reason:
              "factory ID와 params 내부 variant ID의 module prefix가 달라 실제 savedSvgId를 별도로 확인해야 합니다."
          }]
        : [])
    ].sort((left, right) =>
      left.field.localeCompare(right.field)
    );
    return {
      moduleKey: tool.moduleKey,
      categoryId: tool.categoryId,
      observedName: tool.observedName,
      staticEvidenceState: "captured",
      optionKeys: sortedUnique(
        tool.subToolbarOptions.map((option) => option.optionKey)
      ),
      variants,
      unknown,
      lifecycleEvidenceIds:
        tool.moduleKey === "NO03FM"
          ? [
              "research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=verified:NO03FM"
            ]
          : []
    };
  });
  const contract = {
    schemaVersion: "1.0.0",
    snapshotId:
      `mathcanvas-all-module-variant-static-${bundleSnapshot.observation.observationDate}`,
    scope: {
      categoryIds,
      moduleKeys: tools.map((tool) => tool.moduleKey)
    },
    bundle: {
      path: bundle.path,
      bytes: bundle.bytes,
      sha256: bundle.sha256
    },
    clusters: [...clusters.values()].sort((left, right) =>
      left.clusterId.localeCompare(right.clusterId)
    ),
    modules,
    counts: {
      modules: modules.length,
      variants: modules.reduce(
        (sum, module) => sum + module.variants.length,
        0
      ),
      clusters: clusters.size,
      shapeFamilies: new Set(
        [...clusters.values()].map((cluster) => cluster.shapeFamily)
      ).size,
      options: modules.reduce(
        (sum, module) => sum + module.optionKeys.length,
        0
      )
    },
    sourcePolicy: {
      analysis: "local-bundle-snapshot-derived",
      networkRequestCount: 0,
      productWriteCount: 0,
      rawSourceCommitted: false
    }
  };
  assertNoSensitiveData(contract);
  return {
    ...contract,
    integrity: {
      algorithm: "sha256-canonical-json",
      payloadSha256: exactRoundTripHash(contract)
    }
  };
}

export function validateModuleVariantStaticContract(
  contract,
  bundleSnapshot
) {
  const issues = [];
  const add = (path, message) => issues.push({ path, message });
  let expected;
  try {
    assertNoSensitiveData(contract);
    expected = buildModuleVariantStaticContract(bundleSnapshot);
  } catch (error) {
    add("input", String(error));
    return { ok: false, issues };
  }
  if (
    moduleVariantStaticContractHash(contract) !==
      moduleVariantStaticContractHash(expected)
  ) {
    add(
      "contract",
      "전체 module descriptor가 검증된 bundle snapshot의 결정론적 파생값과 다릅니다."
    );
  }
  if (
    contract?.integrity?.algorithm !==
      "sha256-canonical-json" ||
    contract?.integrity?.payloadSha256 !==
      moduleVariantStaticContractHash(contract)
  ) {
    add("integrity", "module variant contract hash가 다릅니다.");
  }
  if (
    contract?.modules?.some(
      (module) =>
        module.staticEvidenceState !== "captured" ||
        !Array.isArray(module.unknown) ||
        module.unknown.length === 0 ||
        module.unknown.some(
          (entry) =>
            typeof entry?.reason !== "string" ||
            entry.reason.trim().length === 0
        )
    )
  ) {
    add(
      "modules",
      "정적 근거는 captured로 유지하고 module별 unknown 사유를 보존해야 합니다."
    );
  }
  const serialized = JSON.stringify(contract);
  if (
    /function\s|sourceExcerpt|rawCode|authorization|cookie/i.test(
      serialized
    )
  ) {
    add("sourcePolicy", "원본 코드나 민감 근거를 포함할 수 없습니다.");
  }
  return { ok: issues.length === 0, issues };
}
