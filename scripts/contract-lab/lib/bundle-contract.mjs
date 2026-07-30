function issue(issues, path, message) {
  issues.push({ path, message });
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateBundleContractSnapshot(snapshot, catalog) {
  const issues = [];
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return [{ path: "", message: "snapshot은 객체여야 합니다." }];
  }
  if (snapshot.schemaVersion !== "1.0.0") {
    issue(issues, "schemaVersion", "1.0.0이어야 합니다.");
  }
  if (snapshot.catalogFingerprint !== catalog?.paletteFingerprint) {
    issue(
      issues,
      "catalogFingerprint",
      "catalog fingerprint와 일치해야 합니다."
    );
  }
  if (
    !/^\/assets\/index-[A-Za-z0-9_-]+\.js$/.test(
      snapshot.bundle?.path ?? ""
    ) ||
    !/^[a-f0-9]{64}$/.test(snapshot.bundle?.sha256 ?? "") ||
    !Number.isInteger(snapshot.bundle?.bytes) ||
    snapshot.bundle.bytes < 100_000
  ) {
    issue(issues, "bundle", "관찰한 main bundle metadata가 필요합니다.");
  }
  const expectedTools = new Map(
    (catalog?.tools ?? [])
      .filter((tool) => tool.surfaceKind === "math-palette")
      .map((tool) => [tool.stableKey, tool])
  );
  const expectedCommonFactoryIds = [
    "angleElem",
    "circleElem",
    "drawElem",
    "input-text",
    "math-latex",
    "pointElem",
    "straightElem"
  ];
  const componentRegistryKeys = new Set(
    snapshot.componentRegistryKeys ?? []
  );
  if (
    !Array.isArray(snapshot.componentRegistryKeys) ||
    componentRegistryKeys.size !==
      snapshot.componentRegistryKeys.length
  ) {
    issue(
      issues,
      "componentRegistryKeys",
      "중복 없는 component registry key 배열이 필요합니다."
    );
  }
  const seenTools = new Set();
  const seenToolModuleKeys = new Set();
  const seenVariants = new Set();
  if (!Array.isArray(snapshot.tools)) {
    issue(issues, "tools", "배열이어야 합니다.");
  } else {
    snapshot.tools.forEach((tool, index) => {
      const path = `tools[${index}]`;
      const expected = expectedTools.get(tool?.stableKey);
      if (!expected) {
        issue(issues, `${path}.stableKey`, "catalog 수학 도구여야 합니다.");
      } else if (
        tool.observedName !== expected.observedName ||
        tool.moduleKey !== expected.moduleKey
      ) {
        issue(
          issues,
          path,
          "catalog 이름과 module key가 일치해야 합니다."
        );
      }
      if (seenTools.has(tool?.stableKey)) {
        issue(issues, `${path}.stableKey`, "도구가 중복됩니다.");
      }
      seenTools.add(tool?.stableKey);
      seenToolModuleKeys.add(tool?.moduleKey);
      if (tool?.componentRegistryKeyPresent !== true) {
        issue(
          issues,
          `${path}.componentRegistryKeyPresent`,
          "bundle component registry 근거가 필요합니다."
        );
      }
      if (!Array.isArray(tool?.variants) || tool.variants.length === 0) {
        issue(issues, `${path}.variants`, "variant가 필요합니다.");
      } else {
        for (const variant of tool.variants) {
          if (!isNonEmptyString(variant)) {
            issue(issues, `${path}.variants`, "빈 variant가 있습니다.");
          }
          if (seenVariants.has(variant)) {
            issue(
              issues,
              `${path}.variants`,
              `variant ${variant}가 중복됩니다.`
            );
          }
          seenVariants.add(variant);
        }
      }
      if (
        tool?.factoryCoverage?.factoryEntries !==
          tool?.variants?.length ||
        tool?.factoryCoverage?.missingFactoryEntries?.length !== 0 ||
        tool?.factoryVariants?.length !== tool?.variants?.length
      ) {
        issue(
          issues,
          `${path}.factoryCoverage`,
          "모든 variant의 factory entry가 필요합니다."
        );
      }
      const optionKeys = new Set();
      for (const option of tool?.subToolbarOptions ?? []) {
        if (
          !isNonEmptyString(option?.optionKey) ||
          !isNonEmptyString(option?.observedLabel)
        ) {
          issue(
            issues,
            `${path}.subToolbarOptions`,
            "option key와 관찰 label이 필요합니다."
          );
        }
        const key = `${option?.optionKey}:${option?.observedLabel}`;
        if (optionKeys.has(key)) {
          issue(
            issues,
            `${path}.subToolbarOptions`,
            "option이 중복됩니다."
          );
        }
        optionKeys.add(key);
      }
    });
  }
  for (const key of expectedTools.keys()) {
    if (!seenTools.has(key)) {
      issue(issues, "tools", `${key}의 bundle 분석이 없습니다.`);
    }
  }
  const seenNonPaletteModules = new Set();
  if (!Array.isArray(snapshot.nonPaletteModules)) {
    issue(issues, "nonPaletteModules", "배열이어야 합니다.");
  } else {
    snapshot.nonPaletteModules.forEach((module, index) => {
      const path = `nonPaletteModules[${index}]`;
      if (
        !isNonEmptyString(module?.moduleKey) ||
        module.classification !==
          "bundle-only-not-palette-visible" ||
        !isNonEmptyString(module.reason) ||
        !Array.isArray(module.evidence) ||
        module.evidence.length < 2
      ) {
        issue(
          issues,
          path,
          "bundle-only module의 key, 분류, 사유, 교차 근거가 필요합니다."
        );
      }
      if (seenToolModuleKeys.has(module?.moduleKey)) {
        issue(
          issues,
          `${path}.moduleKey`,
          "palette module과 중복될 수 없습니다."
        );
      }
      if (seenNonPaletteModules.has(module?.moduleKey)) {
        issue(
          issues,
          `${path}.moduleKey`,
          "bundle-only module이 중복됩니다."
        );
      }
      seenNonPaletteModules.add(module?.moduleKey);
      if (
        !Array.isArray(module?.variants) ||
        module.variants.length === 0 ||
        module.factoryVariants?.length !== module.variants.length
      ) {
        issue(
          issues,
          `${path}.variants`,
          "bundle-only module variant와 factory 근거가 필요합니다."
        );
      }
    });
  }
  const reconciledRegistryKeys = new Set([
    ...seenToolModuleKeys,
    ...seenNonPaletteModules
  ]);
  if (
    JSON.stringify([...componentRegistryKeys].sort()) !==
    JSON.stringify([...reconciledRegistryKeys].sort())
  ) {
    issue(
      issues,
      "componentRegistryKeys",
      "palette와 bundle-only module이 registry key 전체를 설명해야 합니다."
    );
  }
  const commonFactoryIds = new Set();
  if (!Array.isArray(snapshot.commonNativeFactories)) {
    issue(issues, "commonNativeFactories", "배열이어야 합니다.");
  } else {
    snapshot.commonNativeFactories.forEach((candidate, index) => {
      const path = `commonNativeFactories[${index}]`;
      if (
        !expectedCommonFactoryIds.includes(candidate?.id) ||
        commonFactoryIds.has(candidate?.id)
      ) {
        issue(
          issues,
          `${path}.id`,
          "요청된 중복 없는 공통 factory ID여야 합니다."
        );
      }
      commonFactoryIds.add(candidate?.id);
      if (candidate?.found === true) {
        if (
          candidate.factory?.id !== candidate.id ||
          !isNonEmptyString(candidate.factory?.shapeFamily)
        ) {
          issue(
            issues,
            `${path}.factory`,
            "발견된 factory 계약이 필요합니다."
          );
        }
      } else if (
        candidate?.found !== false ||
        !isNonEmptyString(candidate?.unknownReason)
      ) {
        issue(
          issues,
          path,
          "미발견 factory에는 구조화된 unknownReason이 필요합니다."
        );
      }
    });
  }
  if (
    JSON.stringify([...commonFactoryIds].sort()) !==
    JSON.stringify([...expectedCommonFactoryIds].sort())
  ) {
    issue(
      issues,
      "commonNativeFactories",
      "공통 factory 후보 7개를 모두 기록해야 합니다."
    );
  }
  const expectedCounts = {
    tools: snapshot.tools?.length ?? 0,
    componentRegistryKeys:
      snapshot.componentRegistryKeys?.length ?? 0,
    nonPaletteModules: snapshot.nonPaletteModules?.length ?? 0,
    nonPaletteVariants: (snapshot.nonPaletteModules ?? []).reduce(
      (sum, module) => sum + (module.variants?.length ?? 0),
      0
    ),
    nonPaletteSubToolbarOptions: (
      snapshot.nonPaletteModules ?? []
    ).reduce(
      (sum, module) =>
        sum + (module.subToolbarOptions?.length ?? 0),
      0
    ),
    commonNativeFactoryCandidates:
      snapshot.commonNativeFactories?.length ?? 0,
    commonNativeFactoriesFound: (
      snapshot.commonNativeFactories ?? []
    ).filter((candidate) => candidate.found === true).length,
    commonNativeFactoriesMissing: (
      snapshot.commonNativeFactories ?? []
    ).filter((candidate) => candidate.found === false).length,
    variants: (snapshot.tools ?? []).reduce(
      (sum, tool) => sum + (tool.variants?.length ?? 0),
      0
    ),
    moduleFactoryEntries: (snapshot.tools ?? []).reduce(
      (sum, tool) => sum + (tool.factoryVariants?.length ?? 0),
      0
    ),
    subToolbarOptions: (snapshot.tools ?? []).reduce(
      (sum, tool) => sum + (tool.subToolbarOptions?.length ?? 0),
      0
    )
  };
  for (const [field, value] of Object.entries(expectedCounts)) {
    if (snapshot.counts?.[field] !== value) {
      issue(issues, `counts.${field}`, `실제 합계 ${value}와 다릅니다.`);
    }
  }
  if (
    snapshot.counts?.classShapes !==
      snapshot.classShapes?.length ||
    snapshot.counts?.classShapesFound !==
      snapshot.classShapes?.filter(
        (shape) => shape.constructorFound === true
      ).length
  ) {
    issue(issues, "counts.classShapes", "class shape 합계와 다릅니다.");
  }
  return issues;
}
