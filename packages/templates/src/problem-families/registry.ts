import {
  ACTIVITY_IDS,
  ACTIVITY_RELEASE_EVIDENCE,
  PROBLEM_FAMILY_SCHEMA_VERSION,
  getActivitySupportState,
  problemFamilyManifestSchema,
  problemParametersSchema,
  type ProblemFamilyManifest,
  type ProblemParameters,
  type TeacherIntent
} from "@mathcanvas/contracts";
import { listRegisteredBlueprints } from "../registry.js";
import { getVariationEnvelope } from "../variations/registry.js";
import {
  findAssessmentTarget,
  findAssessmentTargetSet
} from "@mathcanvas/curriculum";
import {
  DOMAIN_NATIVE_PROBLEM_FAMILY_MODULES,
  DOMAIN_PROBLEM_FAMILY_CAPABILITIES
} from "./domains/index.js";
import { LEGACY_MANIPULATION_BY_FAMILY } from "./legacy-manipulations.js";
import { getLegacyAssessmentTargetIds } from "./legacy-assessment-target-bindings.js";
import type {
  ProblemFamilyCapabilityExtension,
  ProblemFamilyRegistrySource
} from "./types.js";

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function gradeBandFor(standardCode: string): "1-2" | "3-4" | "5-6" {
  if (standardCode.startsWith("[2수")) return "1-2";
  if (standardCode.startsWith("[4수")) return "3-4";
  if (standardCode.startsWith("[6수")) return "5-6";
  throw new Error(`problem-family-standard-code-invalid:${standardCode}`);
}

function defaultCapability(source: ProblemFamilyRegistrySource) {
  const gradeRange = source.gradeBand === "1-2"
    ? ([1, 2] as const)
    : source.gradeBand === "3-4"
      ? ([3, 4] as const)
      : ([5, 6] as const);
  return {
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    supportedStandardCodes:
      source.supportedStandardCodes ?? [source.standardCode],
    gradeBand: source.gradeBand,
    recommendedGrade: gradeRange[0],
    gradeRange,
    availableProblemCounts: [...source.availableProblemCounts],
    defaultProblemCount: source.availableProblemCounts[0]!,
    supportedDifficulties: [...source.supportedDifficulties],
    parameterFields: [],
    promptGuards: [],
    unsupportedParameterPolicy: "unsupported" as const,
    title: source.learningGoal,
    scopeNote:
      "이 legacy family는 검증된 문제 수와 난이도 variation만 지원하며 추가 맞춤 조건은 아직 받지 않습니다."
  };
}

export interface ProblemFamilyRegistry {
  readonly manifests: readonly ProblemFamilyManifest[];
  readonly list: () => readonly ProblemFamilyManifest[];
  readonly get: (familyId: string) => ProblemFamilyManifest | undefined;
  readonly findByRoute: (input: {
    readonly standardCode: string;
    readonly manipulation?: string;
  }) => ProblemFamilyManifest | undefined;
  readonly findCapabilityByLegacyTeacherIntentKind: (
    kind: string
  ) => ProblemFamilyManifest | undefined;
  readonly validateParameters: (input: ProblemParameters) => ProblemParameters;
  readonly fromLegacyTeacherIntent: (
    intent: TeacherIntent
  ) => ProblemParameters | undefined;
  readonly toLegacyTeacherIntent: (
    input: ProblemParameters
  ) => TeacherIntent | undefined;
}

export function createProblemFamilyRegistry(
  sources: readonly ProblemFamilyRegistrySource[],
  capabilityExtensions: readonly ProblemFamilyCapabilityExtension[]
): ProblemFamilyRegistry {
  const sourceIds = sources.map((source) => source.familyId);
  if (new Set(sourceIds).size !== sourceIds.length) {
    throw new Error("problem-family-source-duplicate");
  }
  const extensionByFamilyId = new Map(
    capabilityExtensions.map((extension) => [extension.familyId, extension])
  );
  if (extensionByFamilyId.size !== capabilityExtensions.length) {
    throw new Error("problem-family-capability-extension-duplicate");
  }
  for (const extension of capabilityExtensions) {
    if (!sourceIds.includes(extension.familyId)) {
      throw new Error(
        `problem-family-capability-source-missing:${extension.familyId}`
      );
    }
  }

  const manifests = sources
    .map((source) => {
      const extension = extensionByFamilyId.get(source.familyId);
      const capability = extension
        ? {
            ...defaultCapability(source),
            recommendedGrade: extension.recommendedGrade,
            gradeRange: extension.gradeRange,
            defaultProblemCount: extension.defaultProblemCount,
            ...(extension.denominatorRelation
              ? { denominatorRelation: extension.denominatorRelation }
              : {}),
            parameterFields: extension.parameterFields,
            defaultParameters: extension.defaultParameters,
            promptGuards: extension.promptGuards,
            unsupportedParameterPolicy:
              extension.unsupportedParameterPolicy,
            title: extension.title,
            scopeNote: extension.scopeNote,
            ...(extension.legacyTeacherIntentKind
              ? {
                  legacyTeacherIntentKind:
                    extension.legacyTeacherIntentKind
                }
              : {})
          }
        : defaultCapability(source);
      return problemFamilyManifestSchema.parse({
        schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
        familyId: source.familyId,
        activityId: source.activityId,
        templateId: source.templateId,
        domain: source.domain,
        learningGoal: source.learningGoal,
        assessmentTargetIds: [...(source.assessmentTargetIds ?? [])],
        manipulation: source.manipulation,
        generator: source.generator,
        capability,
        renderRecipe:
          source.registrationKind === "legacy-blueprint-adapter"
            ? {
                kind: "legacy-blueprint-adapter",
                recipeId: source.familyId,
                recipeVersion: source.blueprint.version,
                blueprintId: source.familyId,
                layoutTokenSet: source.blueprint.layoutTokenSet
              }
            : {
                kind: "native-render-recipe",
                recipeId: source.familyId,
                recipeVersion: source.blueprint.version,
                rendererId: source.familyId,
                layoutTokenSet: source.blueprint.layoutTokenSet
              },
        releaseEvidence: {
          schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
          supportState: source.supportState,
          lifecycleStage:
            source.supportState === "released"
              ? "live-released"
              : "offline-validated",
          evidencePaths: [...source.evidencePaths],
          verificationMethod: "external-visual-audit",
          blueprintContentHash: source.blueprint.contentHash
        }
      });
    })
    .sort((left, right) => left.familyId.localeCompare(right.familyId));

  const byId = new Map(manifests.map((manifest) => [manifest.familyId, manifest]));
  const routeKeys = new Set<string>();
  for (const manifest of manifests) {
    for (const standardCode of manifest.capability.supportedStandardCodes) {
      const route = `${standardCode}:${manifest.manipulation}`;
      if (routeKeys.has(route)) {
        throw new Error(`problem-family-route-duplicate:${route}`);
      }
      routeKeys.add(route);
    }
  }

  return {
    manifests,
    list: () => manifests,
    get: (familyId) => byId.get(familyId),
    findByRoute: ({ standardCode, manipulation }) => {
      const candidates = manifests.filter(
        (manifest) =>
          manifest.capability.supportedStandardCodes.includes(standardCode) &&
          (manipulation === undefined || manifest.manipulation === manipulation)
      );
      return candidates.length === 1 ? candidates[0] : undefined;
    },
    findCapabilityByLegacyTeacherIntentKind: (kind) =>
      manifests.find(
        (manifest) =>
          manifest.capability.legacyTeacherIntentKind === kind
      ),
    validateParameters: (input) => {
      const envelope = problemParametersSchema.parse(input);
      const extension = extensionByFamilyId.get(envelope.familyId);
      if (!extension) {
        throw new Error(
          `problem-parameters-unsupported:${envelope.familyId}`
        );
      }
      return extension.parseParameters(envelope);
    },
    fromLegacyTeacherIntent: (intent) => {
      const extension = capabilityExtensions.find(
        (candidate) =>
          candidate.legacyTeacherIntentKind === intent.kind
      );
      return extension?.fromLegacyTeacherIntent?.(intent);
    },
    toLegacyTeacherIntent: (input) => {
      const envelope = problemParametersSchema.parse(input);
      return extensionByFamilyId
        .get(envelope.familyId)
        ?.toLegacyTeacherIntent?.(envelope);
    }
  };
}

function buildLegacySources(): ProblemFamilyRegistrySource[] {
  const knownActivityIds = new Set<string>(Object.values(ACTIVITY_IDS));
  const blueprints = listRegisteredBlueprints();
  const blueprintIds = new Set(blueprints.map((blueprint) => blueprint.id));
  const missingBlueprints = [...knownActivityIds].filter(
    (familyId) => !blueprintIds.has(familyId)
  );
  const nativeFamilyIds = new Set(
    DOMAIN_NATIVE_PROBLEM_FAMILY_MODULES.map(
      (module) => module.source.familyId
    )
  );
  const unknownBlueprints = [...blueprintIds].filter(
    (familyId) =>
      !knownActivityIds.has(familyId) && !nativeFamilyIds.has(familyId)
  );
  const missingNativeBlueprints = [...nativeFamilyIds].filter(
    (familyId) => !blueprintIds.has(familyId)
  );
  if (missingBlueprints.length > 0 || unknownBlueprints.length > 0) {
    throw new Error(
      `problem-family-legacy-coverage-mismatch:missing=${missingBlueprints.join(",")}:unknown=${unknownBlueprints.join(",")}`
    );
  }
  if (missingNativeBlueprints.length > 0) {
    throw new Error(
      `problem-family-native-runtime-missing:${missingNativeBlueprints.join(",")}`
    );
  }

  return blueprints
    .filter((blueprint) => knownActivityIds.has(blueprint.id))
    .map((blueprint) => {
    const familyId = blueprint.id as keyof typeof LEGACY_MANIPULATION_BY_FAMILY;
    const supportState = getActivitySupportState(blueprint.id);
    const manipulation = LEGACY_MANIPULATION_BY_FAMILY[familyId];
    if (!supportState || !manipulation) {
      throw new Error(`problem-family-legacy-binding-missing:${blueprint.id}`);
    }
    const variation = getVariationEnvelope(blueprint.id);
    const problemCountKnob = variation.knobs.find(
      (knob) => knob.key === "problemCount"
    );
    const difficultyKnob = variation.knobs.find(
      (knob) => knob.key === "difficulty"
    );
    const pinnedProblemCount = variation.pinned.problemCount;
    const pinnedDifficulty = variation.pinned.difficulty;
    const availableProblemCounts =
      problemCountKnob?.kind === "bounded-integer"
        ? Array.from(
            { length: problemCountKnob.max - problemCountKnob.min + 1 },
            (_, index) => problemCountKnob.min + index
          )
        : problemCountKnob?.kind === "enum"
          ? problemCountKnob.values.map(Number)
          : typeof pinnedProblemCount === "number"
            ? [pinnedProblemCount]
            : [];
    const supportedDifficulties = (
      difficultyKnob?.kind === "enum"
        ? difficultyKnob.values
        : typeof pinnedDifficulty === "string"
          ? [pinnedDifficulty]
          : []
    ).filter(
      (difficulty): difficulty is "easy" | "normal" | "hard" =>
        difficulty === "easy" ||
        difficulty === "normal" ||
        difficulty === "hard"
    );
    if (availableProblemCounts.length < 1 || supportedDifficulties.length < 1) {
      throw new Error(
        `problem-family-variation-capability-missing:${blueprint.id}`
      );
    }
    return {
      registrationKind: "legacy-blueprint-adapter",
      familyId: blueprint.id,
      templateId: blueprint.id,
      activityId: blueprint.id,
      standardCode: blueprint.curriculumBinding.standardCode,
      gradeBand: gradeBandFor(blueprint.curriculumBinding.standardCode),
      domain: blueprint.curriculumBinding.domain as ProblemFamilyRegistrySource["domain"],
      learningGoal: blueprint.learningObjective,
      assessmentTargetIds: getLegacyAssessmentTargetIds(blueprint.id),
      manipulation,
      generator: {
        id: blueprint.generator.id,
        version: blueprint.generator.version
      },
      blueprint: {
        contentHash: blueprint.contentHash,
        version: blueprint.version,
        layoutTokenSet: blueprint.layout.tokenSet
      },
      availableProblemCounts: unique(availableProblemCounts),
      supportedDifficulties: unique(supportedDifficulties),
      supportState,
      evidencePaths: ACTIVITY_RELEASE_EVIDENCE[familyId]
    };
    });
}

let canonicalRegistry: ProblemFamilyRegistry | undefined;

export function assertProblemFamilyAssessmentTargetBindings(
  value: ProblemFamilyRegistry,
  sources: readonly ProblemFamilyRegistrySource[] = [
    ...buildLegacySources(),
    ...DOMAIN_NATIVE_PROBLEM_FAMILY_MODULES.map((module) => module.source)
  ]
): void {
  for (const source of sources) {
    const manifest = value.get(source.familyId);
    if (!manifest) {
      throw new Error(
        `problem-family-assessment-target-manifest-missing:${source.familyId}`
      );
    }
    if (
      source.registrationKind === "native-problem-family-module" &&
      manifest.assessmentTargetIds.length < 1
    ) {
      throw new Error(
        `problem-family-native-assessment-target-missing:${source.familyId}`
      );
    }
    for (const targetId of manifest.assessmentTargetIds) {
      const target = findAssessmentTarget(targetId);
      if (!target || target.reviewStatus !== "reviewed") {
        throw new Error(
          `problem-family-assessment-target-unreviewed:${manifest.familyId}:${targetId}`
        );
      }
      const targetSet = findAssessmentTargetSet(target.standardCode);
      if (
        !targetSet?.targetIds.includes(targetId) ||
        !manifest.capability.supportedStandardCodes.includes(
          target.standardCode
        )
      ) {
        throw new Error(
          `problem-family-assessment-target-standard-mismatch:${manifest.familyId}:${targetId}`
        );
      }
    }
  }
}

function registry(): ProblemFamilyRegistry {
  const nativeCapabilityExtensions = DOMAIN_NATIVE_PROBLEM_FAMILY_MODULES
    .map((module) => module.capability)
    .filter(
      (capability): capability is ProblemFamilyCapabilityExtension =>
        capability !== undefined
    );
  if (!canonicalRegistry) {
    const sources = [
      ...buildLegacySources(),
      ...DOMAIN_NATIVE_PROBLEM_FAMILY_MODULES.map((module) => module.source)
    ];
    canonicalRegistry = createProblemFamilyRegistry(
      sources,
      [
        ...DOMAIN_PROBLEM_FAMILY_CAPABILITIES,
        ...nativeCapabilityExtensions
      ]
    );
    assertProblemFamilyAssessmentTargetBindings(canonicalRegistry, sources);
  }
  return canonicalRegistry;
}

export function listProblemFamilyManifests(): readonly ProblemFamilyManifest[] {
  return registry().list();
}

export function getProblemFamilyManifest(
  familyId: string
): ProblemFamilyManifest | undefined {
  return registry().get(familyId);
}

export function findProblemFamilyByRoute(input: {
  readonly standardCode: string;
  readonly manipulation?: string;
}): ProblemFamilyManifest | undefined {
  return registry().findByRoute(input);
}

export function findProblemFamilyByLegacyTeacherIntentKind(
  kind: string
): ProblemFamilyManifest | undefined {
  return registry().findCapabilityByLegacyTeacherIntentKind(kind);
}

export function validateProblemParameters(
  input: ProblemParameters
): ProblemParameters {
  return registry().validateParameters(input);
}

export function problemParametersFromTeacherIntent(
  intent: TeacherIntent
): ProblemParameters | undefined {
  return registry().fromLegacyTeacherIntent(intent);
}

export function teacherIntentFromProblemParameters(
  input: ProblemParameters
): TeacherIntent | undefined {
  return registry().toLegacyTeacherIntent(input);
}
