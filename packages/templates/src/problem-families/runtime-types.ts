import type {
  ActivityBlueprint,
  ProblemParameters,
  Recommendation,
  ResolvedActivity,
  ResolvedItem,
  TeacherIntent
} from "@mathcanvas/contracts";

export interface GenerateActivitySpecOptions {
  readonly seed: string;
  readonly generatedAt: string;
  readonly activityId?: string;
}

export interface RegisteredActivityPlan {
  readonly blueprint: ActivityBlueprint;
  readonly items: readonly ResolvedItem[];
  readonly recommendation: Recommendation;
  readonly options: {
    readonly seed: string;
    readonly generatedAt: string;
    readonly activityId: string;
    readonly templateVersion: string;
    readonly variation: Readonly<Record<string, unknown>>;
  };
}

export interface RegisteredTeacherAnswer {
  readonly problemNumber: number;
  readonly answer: string;
  readonly explanation: string;
}

export interface RegisteredProblemPreview {
  readonly problemNumber: number;
  readonly statements: readonly string[];
}

/**
 * 문제군 하나의 실제 실행 경계다. 신규 문제군은 generator/variation/template 중앙
 * switch에 항목을 더하지 않고 자기 영역 모듈 안에서 이 binding을 함께 내보낸다.
 */
export type ProblemFamilyRuntimeBinding = Readonly<{
  familyId: string;
  blueprint: ActivityBlueprint;
  prepare: (
    recommendation: Recommendation,
    options: GenerateActivitySpecOptions
  ) => RegisteredActivityPlan;
  supportState: "verified" | "released";
  /**
   * 전체 variation/cognitive 감사가 native family의 문항 생성기를 중앙 switch 없이
   * 호출하는 경계다. legacy binding은 기존 item-generator registry를 사용한다.
   */
  generateItemsForVariation?: (
    variation: Readonly<Record<string, unknown>>,
    seed: string
  ) => ResolvedItem[];
  answerKey: (resolved: ResolvedActivity) => RegisteredTeacherAnswer[];
  problemPreviews?: (
    resolved: ResolvedActivity
  ) => RegisteredProblemPreview[];
  appliedTeacherIntent?: (
    resolved: ResolvedActivity
  ) => TeacherIntent | undefined;
  appliedProblemParameters?: (
    resolved: ResolvedActivity
  ) => ProblemParameters | undefined;
}>;
