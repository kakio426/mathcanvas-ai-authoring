import {
  nativeAffordanceCandidateRubricCatalogSchema,
  type NativeAffordanceCandidateRubric,
  type NativeAffordanceFamily
} from "@mathcanvas/contracts";
import { grade3PilotNativeAffordanceFamilyCatalog } from "./native-affordance-catalog-v2.js";

const R3_REVIEWED_AT = "2026-08-08T00:00:00.000Z";
const COUNTING_PROBE_OBSERVED_AT = "2026-08-08T01:27:58.586Z";

function makeCandidate(
  family: NativeAffordanceFamily,
  toolKey: string,
  decision: NativeAffordanceCandidateRubric["candidates"][number]["decision"]
) {
  const evidenceRefs = family.evidenceRefs.filter(
    (reference) => reference.toolKey === toolKey
  );
  return {
    toolKey,
    semanticOperation:
      toolKey === family.preferredToolKey
        ? family.requiredSemanticOperation
        : `${toolKey}의 ${family.affordanceFamilyId} semantic operation은 isolated probe로 비교해야 한다.`,
    primaryMathematicalState: [
      family.mathematicalDecision,
      `invariant: ${family.semanticStateProjection.invariantPaths.join(", ")}`
    ].join(" "),
    decision,
    evidenceRefs
  };
}

function buildRubric(family: NativeAffordanceFamily) {
  const isCounting = family.affordanceFamilyId === "native-counting-model-v1";
  if (
    family.supportState !== "captured" &&
    family.supportState !== "contracted"
  ) {
    throw new Error(
      `r3-rubric-support-too-advanced:${family.affordanceFamilyId}`
    );
  }
  if (family.decision === "baseline-released") {
    throw new Error(`r3-rubric-release-claim:${family.affordanceFamilyId}`);
  }
  const candidateDecision = isCounting
    ? "primary-candidate"
    : "pending-evidence";
  const rubric = {
    schemaVersion: "1.0.0" as const,
    rubricId: `r3-${family.affordanceFamilyId}-candidate-rubric-v1`,
    affordanceFamilyId: family.affordanceFamilyId,
    observedAt: isCounting ? COUNTING_PROBE_OBSERVED_AT : R3_REVIEWED_AT,
    probeMode: isCounting
      ? ("isolated-semantic-probe" as const)
      : ("static-evidence-triage" as const),
    mathematicalDecision: family.mathematicalDecision,
    preferredToolKey: family.preferredToolKey,
    requiredSemanticOperation: family.requiredSemanticOperation,
    supportState: family.supportState,
    decision: family.decision,
    candidates: family.candidateToolKeys.map((toolKey) =>
      makeCandidate(family, toolKey, candidateDecision)
    ),
    evidenceRefs: family.evidenceRefs,
    releaseBlockers: family.releaseBlockers
  } satisfies NativeAffordanceCandidateRubric;
  return rubric;
}

const rubrics = grade3PilotNativeAffordanceFamilyCatalog.families.map(
  buildRubric
);

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return value;
}

const canonicalNativeAffordanceCandidateRubricCatalog = deepFreeze(
  nativeAffordanceCandidateRubricCatalogSchema.parse({
    schemaVersion: "1.0.0",
    rubrics
  })
);

export const grade3PilotNativeAffordanceCandidateRubricCatalog =
  canonicalNativeAffordanceCandidateRubricCatalog;

export function findNativeAffordanceCandidateRubric(
  affordanceFamilyId: string
): NativeAffordanceCandidateRubric | undefined {
  const rubric = canonicalNativeAffordanceCandidateRubricCatalog.rubrics.find(
    (candidate) => candidate.affordanceFamilyId === affordanceFamilyId
  );
  return rubric ? structuredClone(rubric) : undefined;
}
