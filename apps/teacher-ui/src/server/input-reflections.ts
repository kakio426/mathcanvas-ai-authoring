import type { RecommendationSummary } from "@mathcanvas/authoring-runtime";
import {
  MULTIPLICATION_ARRAY_CONTEXT_LABELS,
  type MultiplicationArrayTeacherIntent
} from "@mathcanvas/contracts";
import type { InputReflection } from "../shared/contract.js";

export interface TeacherRecommendationInput {
  requestedGrade: number;
  unitTitle: string;
  standardCode: string;
  activityId: string;
  activityLabel: string;
  manipulation: NonNullable<RecommendationSummary["manipulation"]>;
  learningNeedLabel: string;
  contextNote: string;
  problemCount: number;
  teacherIntent?: MultiplicationArrayTeacherIntent;
  appliedTeacherIntent?: MultiplicationArrayTeacherIntent;
}

function memoSummary(value: string): string {
  const trimmed = value.trim();
  return trimmed.length <= 80 ? trimmed : `${trimmed.slice(0, 80)}…`;
}

function confirmationNote(
  requested: string | number,
  recommended: string | number | undefined
): string {
  return recommended === undefined
    ? "선택한 값을 추천 결과에서 확인할 수 없어 다시 살펴봐 주세요."
    : `선택한 값은 ${String(requested)}이지만 추천 결과는 ${String(recommended)}입니다. 다시 살펴봐 주세요.`;
}

export function buildInputReflections(
  input: TeacherRecommendationInput,
  recommendation: RecommendationSummary
): InputReflection[] {
  const gradeMatches = recommendation.recommendedGrade === input.requestedGrade;
  const standardMatches = recommendation.standardCode === input.standardCode;
  const activityMatches = recommendation.manipulation === input.manipulation;
  const problemCountMatches = recommendation.problemCount === input.problemCount;
  const reflections: InputReflection[] = [
    {
      inputLabel: "학년",
      value: `${input.requestedGrade}학년`,
      status: gradeMatches ? "applied" : "needs-review",
      note: gradeMatches
        ? "선택한 학년을 추천 활동에 반영했습니다."
        : confirmationNote(
            `${input.requestedGrade}학년`,
            recommendation.recommendedGrade === undefined
              ? undefined
              : `${recommendation.recommendedGrade}학년`
          )
    },
    {
      inputLabel: "단원",
      value: input.unitTitle,
      status: standardMatches ? "applied" : "needs-review",
      note: standardMatches
        ? "선택한 단원에 연결된 성취기준으로 추천했습니다."
        : "추천된 성취기준이 달라 단원 연결을 다시 살펴봐 주세요."
    },
    {
      inputLabel: "성취기준",
      value: input.standardCode,
      status: standardMatches ? "applied" : "needs-review",
      note: standardMatches
        ? "선택한 성취기준을 추천 활동에 반영했습니다."
        : confirmationNote(
            input.standardCode,
            recommendation.standardCode
          )
    },
    {
      inputLabel: "활동 유형",
      value: input.activityLabel,
      status: activityMatches ? "applied" : "needs-review",
      note: activityMatches
        ? "선택한 활동 유형으로 추천했습니다."
        : confirmationNote(input.manipulation, recommendation.manipulation)
    },
    {
      inputLabel: "문항 수",
      value: `${input.problemCount}문항`,
      status: problemCountMatches ? "applied" : "needs-review",
      note: problemCountMatches
        ? "선택한 문항 수를 추천 활동에 반영했습니다."
        : confirmationNote(
            `${input.problemCount}문항`,
            recommendation.problemCount === undefined
              ? undefined
              : `${recommendation.problemCount}문항`
          )
    },
    {
      inputLabel: "학생이 어려워하는 지점",
      value: input.learningNeedLabel,
      status: "reference-only",
      note: "활동 추천 카드에는 표시되지만, 문항의 수나 보기 조건으로는 아직 전달되지 않습니다."
    }
  ];

  if (input.contextNote.trim()) {
    reflections.push({
      inputLabel: "수업 메모",
      value: memoSummary(input.contextNote),
      status: "reference-only",
      note: "기록으로 남겨 두었습니다. 아직 문항 내용에는 반영되지 않습니다."
    });
  }

  if (input.teacherIntent) {
    const applied = input.appliedTeacherIntent;
    const recommendationIntent = recommendation.teacherIntent;
    const valuesMatch = (
      field: keyof Omit<MultiplicationArrayTeacherIntent, "kind">
    ) =>
      recommendationIntent?.[field] === input.teacherIntent?.[field] &&
      applied?.[field] === input.teacherIntent?.[field];
    const firstProblemNote =
      "요청한 값을 실제 첫 문항에 반영했습니다. 나머지 문항은 검증된 기본 구성입니다.";
    const intentRows: Array<{
      inputLabel: string;
      value: string;
      field: keyof Omit<MultiplicationArrayTeacherIntent, "kind">;
    }> = [
      {
        inputLabel: "한 묶음의 수",
        value: `${input.teacherIntent.itemsPerGroup}개씩`,
        field: "itemsPerGroup"
      },
      {
        inputLabel: "묶음 수",
        value: `${input.teacherIntent.groupCount}묶음`,
        field: "groupCount"
      },
      {
        inputLabel: "사물 맥락",
        value:
          MULTIPLICATION_ARRAY_CONTEXT_LABELS[
            input.teacherIntent.contextObjectId
          ],
        field: "contextObjectId"
      },
      {
        inputLabel: "확인할 오개념",
        value: "두 수의 뜻 바꾸기",
        field: "misconceptionId"
      }
    ];
    reflections.push(
      ...intentRows.map(({ inputLabel, value, field }) => ({
        inputLabel,
        value,
        status: valuesMatch(field) ? "applied" as const : "needs-review" as const,
        note: valuesMatch(field)
          ? firstProblemNote
          : "요청한 값과 추천 또는 실제 첫 문항이 달라 다시 확인해 주세요."
      }))
    );
  }

  for (const caveat of recommendation.caveats) {
    reflections.push({
      inputLabel: "확인할 내용",
      value: "추천 제한 사항",
      status: "needs-review",
      note: `${caveat} 내용을 확인해 주세요.`
    });
  }
  for (const unsupportedRequest of recommendation.unsupportedRequests ?? []) {
    reflections.push({
      inputLabel: "확인할 내용",
      value: "지원하지 않는 요청",
      status: "needs-review",
      note: `${unsupportedRequest} 요청은 반영되지 않았습니다. 확인해 주세요.`
    });
  }
  return reflections;
}
