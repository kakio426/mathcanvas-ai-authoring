export interface MathCanvasHarnessGuardInput {
  readonly cwd?: string;
  readonly hook_event_name?: string;
  readonly tool_name?: string;
  readonly tool_input?: {
    readonly command?: string;
  };
}

export interface MathCanvasHarnessGuardDecision {
  readonly allowed: boolean;
  readonly code: string;
  readonly reason?: string;
}

export const repositoryRoot: string;

export function evaluateMathCanvasHarnessGuard(
  input: MathCanvasHarnessGuardInput,
  options?: { readonly repositoryRoot?: string }
): MathCanvasHarnessGuardDecision;

export function codexHookOutput(
  decision: MathCanvasHarnessGuardDecision
): Record<string, unknown>;

export function assertLegacyHtml30WriterDisabled(entrypoint: string): never;

export function main(): Promise<void>;
