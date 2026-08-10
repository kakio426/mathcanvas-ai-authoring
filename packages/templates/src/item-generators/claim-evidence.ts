import {
  createSeededRandom,
  type DivisionGroupingContextObjectId,
  type DivisionGroupingTeacherIntent,
  type Difficulty,
  type ResolvedItem,
  type TeacherIntent
} from "@mathcanvas/contracts";
import {
  claimEvidenceActivityProfiles,
  type ClaimEvidenceItemSeed
} from "@mathcanvas/curriculum";
import { shuffled } from "./common-unit-pool.js";

export const CLAIM_EVIDENCE_GENERATOR_ID =
  "curriculum.claim-evidence-items" as const;
export const CLAIM_EVIDENCE_GENERATOR_VERSION = "1.0.0" as const;
export const CLAIM_EVIDENCE_DOT_GROUPING_GENERATOR_VERSION = "1.1.0" as const;
export const CLAIM_EVIDENCE_NATIVE_GROUPING_GENERATOR_VERSION = "1.6.0" as const;
export const CLAIM_EVIDENCE_TEACHER_INTENT_GENERATOR_VERSION = "1.7.0" as const;
export const CLAIM_EVIDENCE_GENERATOR_V2_VERSION = "2.0.0" as const;

const divisionContextCopy: Readonly<
  Record<
    DivisionGroupingContextObjectId,
    { readonly objectName: string; readonly counter: string }
  >
> = {
  candy: { objectName: "사탕", counter: "개" },
  pencil: { objectName: "연필", counter: "자루" },
  marble: { objectName: "구슬", counter: "개" },
  "colored-paper": { objectName: "색종이", counter: "장" }
};

function hasFinalConsonant(value: string): boolean {
  const last = value.at(-1);
  if (!last) return false;
  const offset = last.charCodeAt(0) - 0xac00;
  return offset >= 0 && offset <= 0xd7a3 - 0xac00 && offset % 28 !== 0;
}

function withObjectParticle(value: string): string {
  return `${value}${hasFinalConsonant(value) ? "을" : "를"}`;
}

function withAndParticle(value: string): string {
  return `${value}${hasFinalConsonant(value) ? "과" : "와"}`;
}

function withSubjectParticle(value: string): string {
  return `${value}${hasFinalConsonant(value) ? "이" : "가"}`;
}

export function buildDivisionClassroomLanguage(input: {
  readonly countableGroupSize: number;
  readonly countableObjectName: string;
  readonly countableCounter: string;
  readonly countableGroupName: string;
  readonly countableGroupLaneLabelText: string;
}) {
  const quantity = `${input.countableGroupSize}${input.countableCounter}`;
  return {
    predictInstructionText:
      "① 묶기 전에 답 카드 하나를 ‘처음 고른 답’ 칸에 놓으세요.",
    verifyInstructionText:
      `② ${withObjectParticle(input.countableObjectName)} ${quantity}씩 가운데로 옮기세요. Shift 키로 골라 ‘그룹’을 누르세요. ${quantity}보다 적으면 오른쪽에 놓으세요.`,
    explainInstructionText:
      `③ 만든 ${withAndParticle(input.countableGroupName)} 남은 ${withObjectParticle(input.countableObjectName)} 보고 식과 까닭을 쓰세요. 처음 고른 답과 다르면 카드를 바꾸세요.`,
    sourceLaneLabelText: `아직 묶지 않은 ${input.countableObjectName}`,
    groupLaneLabelText: input.countableGroupLaneLabelText,
    remainderLaneLabelText: `남은 ${input.countableObjectName}`
  } as const;
}

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

function divisionCandidateValues(input: {
  readonly quotient: number;
  readonly remainder: number;
  readonly groupSize: number;
  readonly counter: string;
}): readonly [string, string, string, string, string] {
  const candidate = (groups: number, remainder: number) =>
    `${groups}묶음, ${remainder}${input.counter}`;
  const values = [
    candidate(input.quotient, input.remainder),
    candidate(input.quotient - 1, input.remainder + input.groupSize),
    candidate(input.quotient, input.groupSize),
    candidate(input.groupSize, input.remainder),
    candidate(input.remainder, input.quotient),
    candidate(input.quotient + 1, input.remainder),
    candidate(input.quotient - 1, input.remainder)
  ].filter((value, index, all) => all.indexOf(value) === index);
  if (values.length < 5) {
    throw new Error("division-teacher-intent-candidate-capacity");
  }
  return [values[0]!, values[1]!, values[2]!, values[3]!, values[4]!];
}

function buildDivisionTeacherIntentItem(
  intent: DivisionGroupingTeacherIntent
): ClaimEvidenceItemSeed {
  const context = divisionContextCopy[intent.contextObjectId];
  const quotient = Math.floor(intent.totalCount / intent.groupSize);
  const remainder = intent.totalCount % intent.groupSize;
  const totalQuantity = `${intent.totalCount}${context.counter}`;
  const groupQuantity = `${intent.groupSize}${context.counter}`;
  return {
    questionText:
      `${context.objectName} ${withObjectParticle(totalQuantity)} ` +
      `${groupQuantity}씩 묶으면 몇 묶음이고 ` +
      `${withSubjectParticle(`몇 ${context.counter}`)} 남을까요?`,
    evidenceLabelText:
      `${context.objectName} ${totalQuantity}로 ${groupQuantity}짜리 묶음 만들기`,
    evidenceText:
      `${withObjectParticle(context.objectName)} ${groupQuantity}씩 묶고 남은 ` +
      `${withObjectParticle(context.objectName)} 세어 보세요.`,
    correctValueText: `${quotient}묶음, ${remainder}${context.counter}`,
    candidates: divisionCandidateValues({
      quotient,
      remainder,
      groupSize: intent.groupSize,
      counter: context.counter
    }),
    answerExplanation:
      `${groupQuantity}씩 ${quotient}묶음은 ` +
      `${intent.groupSize * quotient}${context.counter}이고 ` +
      `${remainder}${context.counter}가 남습니다.`,
    countableTotal: intent.totalCount,
    countableGroupSize: intent.groupSize,
    countableObjectName: context.objectName,
    countableCounter: context.counter,
    countableGroupName: "묶음",
    countableGroupLaneLabelText: `${groupQuantity}씩 만든 묶음`
  };
}

export function generateClaimEvidenceItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
    readonly profileId?: string;
    readonly teacherIntent?: TeacherIntent;
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
  const teacherIntent = parameters.teacherIntent;
  if (
    teacherIntent &&
    (teacherIntent.kind !== "division-grouping-v1" ||
      profile.profileId !== "division-remainder")
  ) {
    throw new Error(
      `claim-evidence-teacher-intent-mismatch:${profile.profileId}:${teacherIntent.kind}`
    );
  }
  const sourceItems = teacherIntent
    ? [buildDivisionTeacherIntentItem(teacherIntent)]
    : shuffled([...profile.items], random).slice(0, parameters.problemCount);
  return sourceItems
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
            profile.profileId === "division-remainder"
              ? item.evidenceText
              : item.countableTotal === undefined
                ? item.evidenceText
                : makeUnresolvedDotField(item.countableTotal),
          correctValueText: item.correctValueText,
          answerExplanation: item.answerExplanation,
          ...(item.countableTotal !== undefined
            ? { countableTotal: item.countableTotal }
            : {}),
          ...(item.countableGroupSize !== undefined
            ? (() => {
                const objectName = item.countableObjectName;
                const counter = item.countableCounter;
                const groupName = item.countableGroupName;
                const groupLaneLabelText =
                  item.countableGroupLaneLabelText;
                if (
                  !objectName ||
                  !counter ||
                  !groupName ||
                  !groupLaneLabelText
                ) {
                  throw new Error(
                    "claim-evidence-countable-classroom-language-missing"
                  );
                }
                const classroomLanguage = buildDivisionClassroomLanguage({
                  countableGroupSize: item.countableGroupSize,
                  countableObjectName: objectName,
                  countableCounter: counter,
                  countableGroupName: groupName,
                  countableGroupLaneLabelText: groupLaneLabelText
                });
                return {
                  countableGroupSize: item.countableGroupSize,
                  countableObjectName: objectName,
                  countableCounter: counter,
                  countableGroupName: groupName,
                  ...classroomLanguage
                };
              })()
            : {}),
          ...(teacherIntent && index === 0
            ? {
                contextObjectId: teacherIntent.contextObjectId,
                misconceptionId: teacherIntent.misconceptionId
              }
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
            teacherIntent
              ? CLAIM_EVIDENCE_TEACHER_INTENT_GENERATOR_VERSION
              : profile.profileId === "division-remainder"
              ? CLAIM_EVIDENCE_NATIVE_GROUPING_GENERATOR_VERSION
              : profile.presentation
                ? CLAIM_EVIDENCE_GENERATOR_V2_VERSION
                : CLAIM_EVIDENCE_GENERATOR_VERSION,
          seed
        }
      };
    });
}
