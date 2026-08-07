import { z } from "zod";
import { stableIdSchema } from "../vocabulary/ids.js";

export const NATIVE_SPATIAL_GATE_IDS = [
  "affordance.native-candidates-reviewed",
  "affordance.semantic-native-preferred",
  "affordance.primary-math-state-change",
  "affordance.fallback-bounded",
  "visual.native-reserve-box-fit",
  "visual.native-min-interaction-size",
  "visual.native-flow-fit",
  "visual.native-label-clearance",
  "canary.native-state-change-and-roundtrip"
] as const;

export const nativeSpatialGateIdSchema = z.enum(NATIVE_SPATIAL_GATE_IDS);
export type NativeSpatialGateId = z.infer<typeof nativeSpatialGateIdSchema>;

export const nativeSpatialIssueSchema = z
  .object({
    activityId: stableIdSchema,
    gateId: nativeSpatialGateIdSchema,
    fingerprint: z.string().min(1).max(240),
    detail: z.string().min(1).max(1000)
  })
  .strict();

export type NativeSpatialIssue = z.infer<typeof nativeSpatialIssueSchema>;

export const nativeSpatialWaiverSchema = z
  .object({
    activityId: stableIdSchema,
    gateId: nativeSpatialGateIdSchema,
    owner: stableIdSchema,
    reason: z.string().min(1).max(500),
    expiresAt: z.string().datetime()
  })
  .strict();

export type NativeSpatialWaiver = z.infer<typeof nativeSpatialWaiverSchema>;

export const nativeSpatialGateStateSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    mode: z.enum(["report-only", "ratchet", "hard"]),
    hardGateIds: z.array(nativeSpatialGateIdSchema),
    baselineIssues: z.array(nativeSpatialIssueSchema),
    waivers: z.array(nativeSpatialWaiverSchema),
    stableGreenRuns: z.number().int().min(0),
    falsePositiveSamples: z.number().int().min(0)
  })
  .strict()
  .superRefine((state, context) => {
    if (state.mode === "hard" && state.hardGateIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hardGateIds"],
        message: "hard native spatial mode에는 hard gate가 하나 이상 필요합니다."
      });
    }
    const seen = new Set<string>();
    for (const waiver of state.waivers) {
      const key = `${waiver.activityId}:${waiver.gateId}`;
      if (seen.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["waivers"],
          message: `waiver 중복: ${key}`
        });
      }
      seen.add(key);
    }
  });

export type NativeSpatialGateState = z.infer<
  typeof nativeSpatialGateStateSchema
>;

export interface NativeSpatialRatchetResult {
  readonly blockingIssues: readonly NativeSpatialIssue[];
  readonly baselineIssues: readonly NativeSpatialIssue[];
  readonly waivedIssues: readonly NativeSpatialIssue[];
}

function issueKey(issue: NativeSpatialIssue): string {
  return `${issue.activityId}:${issue.gateId}:${issue.fingerprint}`;
}

function gateKey(
  issue: Pick<NativeSpatialIssue, "activityId" | "gateId">
): string {
  return `${issue.activityId}:${issue.gateId}`;
}

export function evaluateNativeSpatialRatchet(
  input: {
    readonly state: NativeSpatialGateState;
    readonly issues: readonly NativeSpatialIssue[];
    readonly changedActivityIds?: readonly string[];
    readonly now?: string;
  }
): NativeSpatialRatchetResult {
  const state = nativeSpatialGateStateSchema.parse(input.state);
  const issues = input.issues.map((issue) => nativeSpatialIssueSchema.parse(issue));
  const changed = new Set(input.changedActivityIds ?? []);
  const now = new Date(input.now ?? new Date().toISOString()).getTime();
  const baseline = new Set(state.baselineIssues.map(issueKey));
  const waivers = new Map(
    state.waivers.map((waiver) => [gateKey(waiver), waiver])
  );
  const result: NativeSpatialIssue[] = [];
  const baselineIssues: NativeSpatialIssue[] = [];
  const waivedIssues: NativeSpatialIssue[] = [];

  for (const issue of issues) {
    const waiver = waivers.get(gateKey(issue));
    if (waiver && new Date(waiver.expiresAt).getTime() > now) {
      waivedIssues.push(issue);
      continue;
    }
    if (
      state.mode === "hard" &&
      state.hardGateIds.includes(issue.gateId)
    ) {
      result.push(issue);
      continue;
    }
    if (changed.has(issue.activityId) && !baseline.has(issueKey(issue))) {
      result.push(issue);
      continue;
    }
    baselineIssues.push(issue);
  }

  return {
    blockingIssues: result,
    baselineIssues,
    waivedIssues
  };
}

export function canPromoteNativeSpatialGate(
  state: NativeSpatialGateState,
  input: {
    readonly releasedActivityCount: number;
    readonly executedActivityCount: number;
    readonly unwaivedIssueCount: number;
    readonly stableGreenRuns: number;
    readonly falsePositiveSamples: number;
  }
): boolean {
  nativeSpatialGateStateSchema.parse(state);
  return (
    input.releasedActivityCount > 0 &&
    input.executedActivityCount >= input.releasedActivityCount &&
    input.unwaivedIssueCount === 0 &&
    input.stableGreenRuns >= 3 &&
    input.falsePositiveSamples === 0
  );
}
