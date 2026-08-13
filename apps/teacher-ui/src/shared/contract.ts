export type ConnectionState =
  | "ready"
  | "login_required"
  | "login_pending"
  | "busy"
  | "disconnected";

export interface SessionResponse {
  connection: ConnectionState;
  message: string;
}

export interface LearningFlowStep {
  number: number;
  label: string;
  description: string;
}

export interface ProblemPreview {
  problemNumber: number;
  /** 학생에게 보이는 문항 내용. 도출 불가 시 정답 해설 기반 요약으로 대체 */
  statements: string[];
  statementSource: "learner-instructions" | "answer-explanation";
}

export interface TeacherAnswerPreview {
  problemNumber: number;
  answer: string;
  explanation: string;
}

export type InputReflectionStatus =
  | "applied"
  | "reference-only"
  | "needs-review";

export interface InputReflection {
  inputLabel: string;
  value: string;
  status: InputReflectionStatus;
  note: string;
}

export interface PublicActivity {
  cardId: string;
  title: string;
  gradeLabel: string;
  problemCount: number;
  unitTitle: string;
  standardCode: string;
  activityLabel: string;
  learningNeedLabel: string;
  learningGoal: string;
  summary: string;
  studentInstructions: string[];
  teacherChecks: string[];
  flow: LearningFlowStep[];
  problemPreviews: ProblemPreview[];
  teacherAnswerKey: TeacherAnswerPreview[];
  inputReflections: InputReflection[];
}

export interface CurriculumLearningNeedOption {
  id: string;
  label: string;
  description: string;
}

export interface CurriculumActivityOption {
  id: string;
  familyId: string;
  label: string;
  description: string;
  manipulation: string;
  defaultProblemCount: number;
  availableProblemCounts: number[];
  learningNeeds: CurriculumLearningNeedOption[];
  availability: "verified" | "released" | "portfolio-pilot";
  problemParameterCapability?: {
    familyId: string;
    title: string;
    scopeNote: string;
    defaultParameters: import("@mathcanvas/contracts/problem-family").ProblemParameters;
    fields: import("@mathcanvas/contracts/problem-family").ProblemParameterField[];
  };
  /** @deprecated 기존 저장 화면 호환용 */
  teacherIntentCapability?: import("@mathcanvas/contracts/teacher-intent").TeacherIntentKind;
}

export interface CurriculumStandardOption {
  standardCode: string;
  gradeBand: "1-2" | "3-4" | "5-6";
  domain: "수와 연산" | "변화와 관계" | "도형과 측정" | "자료와 가능성";
  focusLabel: string;
  standardSummary: string;
  summaryKind: "official-goal" | "activity-profile-goal" | "source-position";
  activities: CurriculumActivityOption[];
}

export interface CurriculumUnitOption {
  id: string;
  curriculumVersion: "2022 개정";
  publisher: "비상교육";
  grade: 1 | 2 | 3 | 4 | 5 | 6;
  semester: 1 | 2;
  unitNumber: number;
  title: string;
  sourceUrl: string;
  standardCodes: string[];
  activityIds: string[];
}

export interface CurriculumCatalogResponse {
  units: CurriculumUnitOption[];
  standards: CurriculumStandardOption[];
}

export interface PreviewResponse {
  activity: PublicActivity;
  approvalToken: string;
}

export interface CreationStatus {
  creationId: string;
  status: "running" | "succeeded" | "failed";
  message: string;
  editorUrl?: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  hints?: string[];
}
export {
  TEACHER_INTENT_CAPABILITIES,
  createDefaultTeacherIntent,
  formatTeacherIntentFieldValue,
  getTeacherIntentCapability,
  teacherIntentSchema,
  type TeacherIntent,
  type TeacherIntentFieldDefinition,
  type TeacherIntentKind
} from "@mathcanvas/contracts/teacher-intent";
export {
  problemParametersSchema,
  type ProblemParameterField,
  type ProblemParameters
} from "@mathcanvas/contracts/problem-family";
