import {
  PROBLEM_FAMILY_SCHEMA_VERSION,
  getTeacherIntentCapability,
  problemParametersSchema,
  teacherIntentSchema,
  type ProblemParameters,
  type TeacherIntent,
  type TeacherIntentKind
} from "@mathcanvas/contracts";
import type { ProblemFamilyCapabilityExtension } from "./types.js";

export function legacyTeacherIntentCapability(
  kind: TeacherIntentKind
): ProblemFamilyCapabilityExtension {
  const legacy = getTeacherIntentCapability(kind);
  const defaultValues = Object.fromEntries(
    Object.entries(legacy.defaultIntent).filter(([key]) => key !== "kind")
  );
  const defaultParameters = problemParametersSchema.parse({
    schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
    familyId: legacy.templateId,
    values: defaultValues
  });

  const parseParameters = (input: ProblemParameters): ProblemParameters => {
    const envelope = problemParametersSchema.parse(input);
    if (envelope.familyId !== legacy.templateId) {
      throw new Error(
        `problem-parameters-family-mismatch:${legacy.templateId}:${envelope.familyId}`
      );
    }
    const intent = teacherIntentSchema.parse({
      kind,
      ...envelope.values
    });
    if (intent.kind !== kind) {
      throw new Error(`problem-parameters-kind-mismatch:${kind}`);
    }
    return problemParametersSchema.parse({
      ...envelope,
      values: Object.fromEntries(
        Object.entries(intent).filter(([key]) => key !== "kind")
      )
    });
  };

  return {
    familyId: legacy.templateId,
    recommendedGrade: legacy.recommendedGrade,
    gradeRange: legacy.gradeRange,
    defaultProblemCount: legacy.defaultProblemCount,
    ...(legacy.denominatorRelation
      ? { denominatorRelation: legacy.denominatorRelation }
      : {}),
    parameterFields: legacy.fields.map((field) => {
      const { options, ...definition } = field;
      return {
        ...definition,
        ...(options
          ? { options: options.map((option) => ({ ...option })) }
          : {})
      };
    }),
    defaultParameters,
    promptGuards: (legacy.promptGuards ?? []).map((guard) => ({ ...guard })),
    unsupportedParameterPolicy: "clarification-required",
    title: legacy.title,
    scopeNote: legacy.scopeNote,
    legacyTeacherIntentKind: kind,
    parseParameters,
    fromLegacyTeacherIntent: (intent: TeacherIntent) =>
      intent.kind === kind
        ? parseParameters({
            schemaVersion: PROBLEM_FAMILY_SCHEMA_VERSION,
            familyId: legacy.templateId,
            values: Object.fromEntries(
              Object.entries(intent).filter(([key]) => key !== "kind")
            )
          })
        : undefined,
    toLegacyTeacherIntent: (parameters: ProblemParameters) =>
      teacherIntentSchema.parse({
        kind,
        ...parseParameters(parameters).values
      })
  };
}
