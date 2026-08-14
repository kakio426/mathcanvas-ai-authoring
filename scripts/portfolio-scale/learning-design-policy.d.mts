export interface PortfolioPolicyRow {
  rendererKind: string;
  engineClassIds?: string[];
  constraintKinds?: string[];
  interactionShellId?: string;
  manipulativeConstraintCount?: number;
  internalCodeHidden?: boolean;
  questionsElementary?: boolean;
  choicesElementary?: boolean;
  registeredEvidencePromptsVisible?: boolean;
  nativeElementsContained?: boolean;
  nativeElementsUsable?: boolean;
}

export const PORTFOLIO_LEARNING_DESIGN_POLICY: Readonly<{
  skillName: string;
  expectedStandardCount: number;
  expectedTargetOutlineCount: number;
  minimumRendererCount: number;
  expectedEngineClassCount: number;
  minimumInteractionShellCount: number;
  minimumActionProfileCount: number;
  minimumManipulativeStandardCount: number;
  maximumDominantRendererShare: number;
}>;

export function portfolioContentSha256(value: unknown): string;
export function buildPortfolioLearningDesignMetrics(rows: PortfolioPolicyRow[]): Record<string, unknown>;
export function evaluatePortfolioLearningDesignReadiness(input: {
  rows: PortfolioPolicyRow[];
  passedTargetOutlineCount: number;
  failedStandardCount: number;
  policy?: typeof PORTFOLIO_LEARNING_DESIGN_POLICY;
}): {
  skillName: string;
  ready: boolean;
  checks: Record<string, boolean>;
  failedChecks: string[];
  metrics: Record<string, unknown>;
  policy: typeof PORTFOLIO_LEARNING_DESIGN_POLICY;
};
export function validatePortfolioStaticAttestation(report: Record<string, unknown>): {
  contentSha256: string;
  reportId: string;
};
