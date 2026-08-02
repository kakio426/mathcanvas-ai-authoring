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

export function generateClaimEvidenceItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly profileId?: string;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    parameters.problemCount !== 2 ||
    !parameters.profileId
  ) {
    throw new RangeError(
      "주장-검증 활동은 지정된 프로필의 기본 난이도 2문항을 지원합니다."
    );
  }
  const profile = claimEvidenceActivityProfiles.find(
    (candidate) => candidate.profileId === parameters.profileId
  );
  if (!profile) {
    throw new Error(`claim-evidence-profile-missing:${parameters.profileId}`);
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
          evidenceText: item.evidenceText,
          correctValueText: item.correctValueText,
          answerExplanation: item.answerExplanation,
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
          generatorVersion: CLAIM_EVIDENCE_GENERATOR_VERSION,
          seed
        }
      };
    });
}
