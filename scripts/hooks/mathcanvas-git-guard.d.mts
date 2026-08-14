export interface MathCanvasChangeClassification {
  files: string[];
  learnerFacing: string[];
  harness: string[];
  requiresStaticLearningHarness: boolean;
  requiresFullCheck: boolean;
  requiresLiveAttestation: boolean;
}

export function classifyMathCanvasChanges(files: string[]): MathCanvasChangeClassification;
export function commandsForMathCanvasHook(
  mode: "pre-commit" | "pre-push",
  classification: MathCanvasChangeClassification
): {
  focusedHarnessTests: boolean;
  staticLearningHarness: boolean;
  fullCheck: boolean;
  liveAttestation: boolean;
};
