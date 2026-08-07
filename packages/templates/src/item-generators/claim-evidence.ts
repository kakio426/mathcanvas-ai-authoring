import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";
import {
  claimEvidenceActivityProfiles
} from "@mathcanvas/curriculum";
import { shuffled } from "./common-unit-pool.js";

export const CLAIM_EVIDENCE_GENERATOR_ID =
  "curriculum.claim-evidence-items" as const;
export const CLAIM_EVIDENCE_GENERATOR_VERSION = "1.0.0" as const;
export const CLAIM_EVIDENCE_DOT_GROUPING_GENERATOR_VERSION = "1.1.0" as const;
export const CLAIM_EVIDENCE_GENERATOR_V2_VERSION = "2.0.0" as const;

export function makeUnresolvedDotField(total: number): string {
  if (!Number.isInteger(total) || total < 3 || total > 99) {
    throw new RangeError("점 모형의 전체 수는 3 이상 99 이하의 자연수여야 합니다.");
  }
  const base = Math.floor(total / 3);
  const remainder = total % 3;
  const rowCounts = remainder === 0
    ? [base, base, base]
    : remainder === 1
      ? [base, base + 1, base]
      : [base + 1, base, base + 1];
  return rowCounts
    .map((count) => Array.from({ length: count }, () => "●").join(" "))
    .join("\n");
}

export function generateClaimEvidenceItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly profileId?: string;
  },
  seed: string
): ResolvedItem[] {
  if (!parameters.profileId) {
    throw new RangeError("주장-검증 활동 프로필이 필요합니다.");
  }
  const profile = claimEvidenceActivityProfiles.find(
    (candidate) => candidate.profileId === parameters.profileId
  );
  if (!profile) {
    throw new Error(`claim-evidence-profile-missing:${parameters.profileId}`);
  }
  const expectedProblemCount = profile.presentation?.problemCount ?? 2;
  if (
    parameters.difficulty !== "normal" ||
    parameters.problemCount !== expectedProblemCount
  ) {
    throw new RangeError(
      `주장-검증 활동은 ${profile.profileId} 프로필의 기본 난이도 ${expectedProblemCount}문항을 지원합니다.`
    );
  }
  const random = createSeededRandom(
    `${seed}:claim-evidence:${parameters.profileId}`
  );
  return shuffled([...profile.items], random)
    .slice(0, parameters.problemCount)
    .map((item, index) => {
      const candidates = shuffled([...item.candidates], random);
      return {
        id: `${parameters.profileId}-${index + 1}`,
        order: index + 1,
        kind: "claim-evidence-revision",
        values: {
          orderLabel: `${index + 1}번`,
          questionText: item.questionText,
          evidenceLabelText: item.evidenceLabelText,
          evidenceText:
            item.countableTotal === undefined
              ? item.evidenceText
              : makeUnresolvedDotField(item.countableTotal),
          correctValueText: item.correctValueText,
          answerExplanation: item.answerExplanation,
          ...(item.countableTotal !== undefined
            ? { countableTotal: item.countableTotal }
            : {}),
          ...(item.countableGroupSize !== undefined
            ? { countableGroupSize: item.countableGroupSize }
            : {}),
          ...(item.targetAngleDegrees !== undefined
            ? { targetAngleDegrees: item.targetAngleDegrees }
            : {}),
          ...(item.initialMeasureDegrees !== undefined
            ? { initialMeasureDegrees: item.initialMeasureDegrees }
            : {}),
          ...Object.fromEntries(
            candidates.flatMap((value, candidateIndex) => [
              [`candidate${candidateIndex + 1}`, value],
              [`candidate${candidateIndex + 1}Latex`, value]
            ])
          ),
          difficulty: parameters.difficulty
        },
        provenance: {
          generatorId: CLAIM_EVIDENCE_GENERATOR_ID,
          generatorVersion:
            profile.profileId === "division-remainder"
              ? CLAIM_EVIDENCE_DOT_GROUPING_GENERATOR_VERSION
              : profile.presentation
                ? CLAIM_EVIDENCE_GENERATOR_V2_VERSION
                : CLAIM_EVIDENCE_GENERATOR_VERSION,
          seed
        }
      };
    });
}
