import { z } from "zod";
import { canonicalJson } from "../hash.js";
import { stableIdSchema } from "../vocabulary/ids.js";
import {
  nativeAffordanceEvidenceRefSchema,
  nativeAffordanceFamilySchema,
  type NativeAffordanceFamily
} from "./native-affordance-v2.js";

export const NATIVE_AFFORDANCE_RUBRIC_V2_SCHEMA_VERSION = "1.0.0" as const;

const supportRank = {
  captured: 0,
  contracted: 1,
  verified: 2,
  released: 3
} as const;

export const nativeAffordanceCandidateDecisionSchema = z.enum([
  "primary-candidate",
  "secondary-candidate",
  "pending-evidence",
  "rejected-semantic-mismatch"
]);

export const nativeAffordanceRubricProbeModeSchema = z.enum([
  "static-evidence-triage",
  "isolated-semantic-probe"
]);

export const nativeAffordanceCandidateSchema = z
  .object({
    toolKey: stableIdSchema,
    semanticOperation: z.string().min(1).max(500),
    primaryMathematicalState: z.string().min(1).max(500),
    decision: nativeAffordanceCandidateDecisionSchema,
    evidenceRefs: z.array(nativeAffordanceEvidenceRefSchema).max(8)
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.decision === "primary-candidate" &&
      value.evidenceRefs.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceRefs"],
        message: "primary candidate에는 직접 evidence가 필요합니다."
      });
    }
    if (
      value.evidenceRefs.some(
        (reference) => reference.toolKey !== value.toolKey
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceRefs"],
        message: "candidate evidence는 해당 candidate tool을 직접 가리켜야 합니다."
      });
    }
  });

export const nativeAffordanceCandidateRubricSchema = z
  .object({
    schemaVersion: z.literal(NATIVE_AFFORDANCE_RUBRIC_V2_SCHEMA_VERSION),
    rubricId: stableIdSchema,
    affordanceFamilyId: stableIdSchema,
    observedAt: z.string().datetime(),
    probeMode: nativeAffordanceRubricProbeModeSchema,
    mathematicalDecision: z.string().min(1).max(500),
    preferredToolKey: stableIdSchema,
    requiredSemanticOperation: z.string().min(1).max(500),
    supportState: z.enum(["captured", "contracted"]),
    decision: z.enum(["pending", "conditional-go", "no-go"]),
    candidates: z.array(nativeAffordanceCandidateSchema).min(1).max(8),
    evidenceRefs: z.array(nativeAffordanceEvidenceRefSchema).min(1).max(12),
    releaseBlockers: z.array(z.string().min(1).max(500)).max(8)
  })
  .strict()
  .superRefine((value, context) => {
    const candidateToolKeys = value.candidates.map(
      (candidate) => candidate.toolKey
    );
    if (
      new Set(candidateToolKeys).size !== candidateToolKeys.length ||
      !candidateToolKeys.includes(value.preferredToolKey)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["candidates"],
        message: "rubric candidates는 unique해야 하고 preferred tool을 포함해야 합니다."
      });
    }
    const evidenceIds = value.evidenceRefs.map((reference) => reference.id);
    if (new Set(evidenceIds).size !== evidenceIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceRefs"],
        message: "rubric evidence reference가 중복됩니다."
      });
    }
    if (
      value.evidenceRefs.some(
        (reference) => !candidateToolKeys.includes(reference.toolKey)
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidenceRefs"],
        message: "rubric evidence는 rubric candidate tool을 직접 가리켜야 합니다."
      });
    }
    const preferredCandidate = value.candidates.find(
      (candidate) => candidate.toolKey === value.preferredToolKey
    );
    const primaryCandidates = value.candidates.filter(
      (candidate) => candidate.decision === "primary-candidate"
    );
    if (
      value.decision === "conditional-go" &&
      (value.supportState !== "contracted" ||
        primaryCandidates.length !== 1 ||
        primaryCandidates[0]?.toolKey !== value.preferredToolKey ||
        value.releaseBlockers.length === 0 ||
        value.probeMode !== "isolated-semantic-probe")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decision"],
        message:
          "conditional-go rubric은 contracted·isolated probe·preferred primary·blocker를 모두 가져야 합니다."
      });
    }
    if (
      value.decision === "pending" &&
      value.candidates.some(
        (candidate) => candidate.decision !== "pending-evidence"
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["candidates"],
        message: "pending rubric의 후보는 모두 pending-evidence여야 합니다."
      });
    }
    if (value.decision === "no-go" && primaryCandidates.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["candidates"],
        message: "NO-GO rubric은 primary candidate를 가질 수 없습니다."
      });
    }
    if (
      value.decision === "no-go" &&
      (value.probeMode !== "isolated-semantic-probe" ||
        value.releaseBlockers.length === 0 ||
        value.candidates.some(
          (candidate) =>
            candidate.decision !== "rejected-semantic-mismatch" ||
            candidate.evidenceRefs.length === 0
        ))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decision"],
        message:
          "NO-GO rubric은 isolated semantic rejection, direct evidence, blocker를 모두 가져야 합니다."
      });
    }
    if (!preferredCandidate) return;
    const preferredEvidenceLevel = preferredCandidate.evidenceRefs.length
      ? Math.max(
          ...preferredCandidate.evidenceRefs.map(
            (reference) => supportRank[reference.claim]
          )
        )
      : -1;
    if (preferredEvidenceLevel < supportRank[value.supportState]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["candidates"],
        message: "preferred candidate evidence가 rubric supportState보다 낮습니다."
      });
    }
  });

export const nativeAffordanceCandidateRubricCatalogSchema = z
  .object({
    schemaVersion: z.literal(NATIVE_AFFORDANCE_RUBRIC_V2_SCHEMA_VERSION),
    rubrics: z.array(nativeAffordanceCandidateRubricSchema).min(1).max(32)
  })
  .strict()
  .superRefine((value, context) => {
    const familyIds = value.rubrics.map((rubric) => rubric.affordanceFamilyId);
    if (new Set(familyIds).size !== familyIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rubrics"],
        message: "affordanceFamily당 rubric은 하나여야 합니다."
      });
    }
  });

export type NativeAffordanceCandidate = z.infer<
  typeof nativeAffordanceCandidateSchema
>;
export type NativeAffordanceCandidateRubric = z.infer<
  typeof nativeAffordanceCandidateRubricSchema
>;
export type NativeAffordanceCandidateRubricCatalog = z.infer<
  typeof nativeAffordanceCandidateRubricCatalogSchema
>;

export function assertNativeAffordanceRubricBinding(
  rubricInput: NativeAffordanceCandidateRubric,
  familyInput: NativeAffordanceFamily
): void {
  const rubric = nativeAffordanceCandidateRubricSchema.parse(rubricInput);
  const family = nativeAffordanceFamilySchema.parse(familyInput);
  if (
    rubric.affordanceFamilyId !== family.affordanceFamilyId ||
    rubric.preferredToolKey !== family.preferredToolKey ||
    rubric.mathematicalDecision !== family.mathematicalDecision ||
    rubric.requiredSemanticOperation !== family.requiredSemanticOperation ||
    rubric.supportState !== family.supportState ||
    rubric.decision !== family.decision ||
    canonicalJson(rubric.releaseBlockers) !==
      canonicalJson(family.releaseBlockers) ||
    canonicalJson(rubric.candidates.map((candidate) => candidate.toolKey)) !==
      canonicalJson(family.candidateToolKeys) ||
    canonicalJson(rubric.evidenceRefs) !== canonicalJson(family.evidenceRefs) ||
    rubric.candidates.some(
      (candidate) =>
        canonicalJson(candidate.evidenceRefs) !==
          canonicalJson(
            family.evidenceRefs.filter(
              (reference) => reference.toolKey === candidate.toolKey
            )
          ) ||
        candidate.primaryMathematicalState !==
          [
            family.mathematicalDecision,
            `invariant: ${family.semanticStateProjection.invariantPaths.join(", ")}`
          ].join(" ") ||
        candidate.semanticOperation !==
          (candidate.toolKey === family.preferredToolKey
            ? family.requiredSemanticOperation
            : `${candidate.toolKey}의 ${family.affordanceFamilyId} semantic operation은 isolated probe로 비교해야 한다.`)
    )
  ) {
    throw new Error(
      `native-affordance-rubric-binding-mismatch:${family.affordanceFamilyId}`
    );
  }
}
