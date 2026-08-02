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
}

export interface CurriculumLearningNeedOption {
  id: string;
  label: string;
  description: string;
}

export interface CurriculumActivityOption {
  id: string;
  label: string;
  description: string;
  defaultProblemCount: 1 | 2 | 4;
  availableProblemCounts: Array<1 | 2 | 4 | 6>;
  learningNeeds: CurriculumLearningNeedOption[];
  availability: "verified" | "released";
}

export interface CurriculumStandardOption {
  standardCode: string;
  gradeBand: "1-2" | "3-4" | "5-6";
  domain: "수와 연산" | "변화와 관계" | "도형과 측정" | "자료와 가능성";
  focusLabel: string;
  standardSummary: string;
  summaryKind: "official-goal" | "source-position";
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
