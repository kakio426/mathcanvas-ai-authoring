import type {
  CapabilityManifest,
  CognitiveDemandManifest,
  ProblemParameters,
  TeacherIntent,
  VariationEnvelopeDeclaration
} from "@mathcanvas/contracts";
import type { ProblemFamilyRuntimeBinding } from "./runtime-types.js";

export type ProblemFamilyCapabilityExtension = Readonly<{
  familyId: string;
  recommendedGrade: number;
  gradeRange: readonly [number, number];
  defaultProblemCount: number;
  denominatorRelation?: "mixed" | "coprime" | "multiple";
  parameterFields: CapabilityManifest["parameterFields"];
  defaultParameters: ProblemParameters;
  promptGuards: CapabilityManifest["promptGuards"];
  unsupportedParameterPolicy: CapabilityManifest["unsupportedParameterPolicy"];
  title: string;
  scopeNote: string;
  legacyTeacherIntentKind?: string;
  parseParameters: (input: ProblemParameters) => ProblemParameters;
  fromLegacyTeacherIntent?: (intent: TeacherIntent) => ProblemParameters | undefined;
  toLegacyTeacherIntent?: (parameters: ProblemParameters) => TeacherIntent;
}>;

export interface ProblemFamilyRegistrySource {
  readonly registrationKind:
    | "legacy-blueprint-adapter"
    | "native-problem-family-module";
  readonly familyId: string;
  readonly templateId: string;
  readonly activityId: string;
  readonly standardCode: string;
  readonly supportedStandardCodes?: readonly string[];
  readonly gradeBand: "1-2" | "3-4" | "5-6";
  readonly domain:
    | "수와 연산"
    | "변화와 관계"
    | "도형과 측정"
    | "자료와 가능성";
  readonly learningGoal: string;
  readonly assessmentTargetIds?: readonly string[];
  readonly manipulation: string;
  readonly generator: {
    readonly id: string;
    readonly version: string;
  };
  readonly blueprint: {
    readonly contentHash: string;
    readonly version: string;
    readonly layoutTokenSet: string;
  };
  readonly availableProblemCounts: readonly number[];
  readonly supportedDifficulties: readonly ("easy" | "normal" | "hard")[];
  readonly supportState: "verified" | "released";
  readonly evidencePaths: readonly string[];
}

/**
 * 신규 문제군의 단일 등록 단위다. source/capability/runtime이 같은 영역 모듈에
 * 함께 있어 중앙 planner·MCP·UI·template/generator registry를 수정하지 않는다.
 */
export type ProblemFamilyNativeModule = Readonly<{
  source: ProblemFamilyRegistrySource;
  capability?: ProblemFamilyCapabilityExtension;
  runtime: ProblemFamilyRuntimeBinding &
    Required<
      Pick<ProblemFamilyRuntimeBinding, "generateItemsForVariation">
    >;
  cognitiveManifest: CognitiveDemandManifest;
  variationEnvelope: VariationEnvelopeDeclaration;
}>;
