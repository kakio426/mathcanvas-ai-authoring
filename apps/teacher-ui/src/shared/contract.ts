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
  difficultyLabel: string;
  learningGoal: string;
  summary: string;
  studentInstructions: string[];
  teacherChecks: string[];
  flow: LearningFlowStep[];
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
