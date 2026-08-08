import { describe, expect, it } from "vitest";
import {
  assertNativeAffordanceRubricBinding,
  nativeAffordanceCandidateRubricSchema
} from "@mathcanvas/contracts";
import {
  findNativeAffordanceFamily,
  grade3PilotNativeAffordanceFamilyCatalog
} from "./native-affordance-catalog-v2.js";
import {
  findNativeAffordanceCandidateRubric,
  grade3PilotNativeAffordanceCandidateRubricCatalog
} from "./native-affordance-rubric-v2.js";

describe("R3 native affordance candidate rubrics", () => {
  it("7개 family 모두 후보·근거·현재 판정과 정확히 결속한다", () => {
    expect(
      grade3PilotNativeAffordanceCandidateRubricCatalog.rubrics
    ).toHaveLength(grade3PilotNativeAffordanceFamilyCatalog.families.length);
    for (const family of grade3PilotNativeAffordanceFamilyCatalog.families) {
      const rubric = findNativeAffordanceCandidateRubric(
        family.affordanceFamilyId
      )!;
      expect(() => assertNativeAffordanceRubricBinding(rubric, family)).not.toThrow();
      expect(rubric.candidates.map((candidate) => candidate.toolKey)).toEqual(
        family.candidateToolKeys
      );
      expect(rubric.evidenceRefs).toEqual(family.evidenceRefs);
    }
  });

  it("NO01SC만 isolated semantic conditional-go이고 나머지는 static triage pending이다", () => {
    const counting = findNativeAffordanceCandidateRubric(
      "native-counting-model-v1"
    )!;
    expect(counting.probeMode).toBe("isolated-semantic-probe");
    expect(counting.supportState).toBe("contracted");
    expect(counting.decision).toBe("conditional-go");
    expect(
      counting.candidates.find((candidate) => candidate.toolKey === "NO01SC")
        ?.decision
    ).toBe("primary-candidate");

    for (const family of grade3PilotNativeAffordanceFamilyCatalog.families) {
      if (family.affordanceFamilyId === "native-counting-model-v1") continue;
      const rubric = findNativeAffordanceCandidateRubric(
        family.affordanceFamilyId
      )!;
      expect(rubric.probeMode).toBe("static-evidence-triage");
      expect(rubric.decision).toBe("pending");
      expect(
        rubric.candidates.every(
          (candidate) => candidate.decision === "pending-evidence"
        )
      ).toBe(true);
    }
  });

  it("primary·probe mode·candidate key·evidence 변조는 fail-closed한다", () => {
    const counting = findNativeAffordanceCandidateRubric(
      "native-counting-model-v1"
    )!;
    const wrongPending = structuredClone(counting);
    wrongPending.decision = "pending";
    expect(nativeAffordanceCandidateRubricSchema.safeParse(wrongPending).success).toBe(
      false
    );

    const wrongMode = structuredClone(counting);
    wrongMode.probeMode = "static-evidence-triage";
    expect(nativeAffordanceCandidateRubricSchema.safeParse(wrongMode).success).toBe(
      false
    );

    const wrongCandidate = structuredClone(counting);
    wrongCandidate.candidates.push({
      toolKey: "NO04NG",
      semanticOperation: "drifted candidate operation",
      primaryMathematicalState: "drifted candidate state",
      decision: "secondary-candidate",
      evidenceRefs: []
    });
    expect(() =>
      assertNativeAffordanceRubricBinding(
        wrongCandidate,
        findNativeAffordanceFamily("native-counting-model-v1")!
      )
    ).toThrow(/rubric-binding-mismatch/);

    const wrongEvidence = structuredClone(counting);
    wrongEvidence.evidenceRefs[0]!.sha256 = "0".repeat(64);
    expect(() =>
      assertNativeAffordanceRubricBinding(
        wrongEvidence,
        findNativeAffordanceFamily("native-counting-model-v1")!
      )
    ).toThrow(/rubric-binding-mismatch/);

    const wrongCandidateEvidence = structuredClone(counting);
    wrongCandidateEvidence.candidates[0]!.evidenceRefs[0]!.sha256 = "0".repeat(
      64
    );
    expect(() =>
      assertNativeAffordanceRubricBinding(
        wrongCandidateEvidence,
        findNativeAffordanceFamily("native-counting-model-v1")!
      )
    ).toThrow(/rubric-binding-mismatch/);

    const wrongMathematicalDecision = structuredClone(counting);
    wrongMathematicalDecision.mathematicalDecision = "drifted decision";
    expect(() =>
      assertNativeAffordanceRubricBinding(
        wrongMathematicalDecision,
        findNativeAffordanceFamily("native-counting-model-v1")!
      )
    ).toThrow(/rubric-binding-mismatch/);

    const wrongPreferredOperation = structuredClone(counting);
    wrongPreferredOperation.candidates[0]!.semanticOperation =
      "drifted preferred operation";
    expect(() =>
      assertNativeAffordanceRubricBinding(
        wrongPreferredOperation,
        findNativeAffordanceFamily("native-counting-model-v1")!
      )
    ).toThrow(/rubric-binding-mismatch/);

    const wrongPrimaryState = structuredClone(counting);
    wrongPrimaryState.candidates[0]!.primaryMathematicalState =
      "coordinates only";
    expect(() =>
      assertNativeAffordanceRubricBinding(
        wrongPrimaryState,
        findNativeAffordanceFamily("native-counting-model-v1")!
      )
    ).toThrow(/rubric-binding-mismatch/);

    const wrongBlockers = structuredClone(counting);
    wrongBlockers.releaseBlockers = ["unrelated blocker"];
    expect(() =>
      assertNativeAffordanceRubricBinding(
        wrongBlockers,
        findNativeAffordanceFamily("native-counting-model-v1")!
      )
    ).toThrow(/rubric-binding-mismatch/);

    const wrongNoGo = findNativeAffordanceCandidateRubric(
      "native-array-model-v1"
    )!;
    wrongNoGo.decision = "no-go";
    wrongNoGo.candidates = wrongNoGo.candidates.map((candidate) => ({
      ...candidate,
      decision: "rejected-semantic-mismatch" as const
    }));
    expect(nativeAffordanceCandidateRubricSchema.safeParse(wrongNoGo).success).toBe(
      false
    );

    const wrongPendingDisposition = findNativeAffordanceCandidateRubric(
      "native-array-model-v1"
    )!;
    wrongPendingDisposition.candidates[0]!.decision = "secondary-candidate";
    expect(
      nativeAffordanceCandidateRubricSchema.safeParse(wrongPendingDisposition)
        .success
    ).toBe(false);

    const wrongNonPreferredOperation = findNativeAffordanceCandidateRubric(
      "native-unit-conversion-v1"
    )!;
    wrongNonPreferredOperation.candidates[1]!.semanticOperation =
      "generic coordinate drag accepted";
    expect(() =>
      assertNativeAffordanceRubricBinding(
        wrongNonPreferredOperation,
        findNativeAffordanceFamily("native-unit-conversion-v1")!
      )
    ).toThrow(/rubric-binding-mismatch/);
  });

  it("rubric authority는 freeze되고 finder clone 변조가 canonical을 오염시키지 않는다", () => {
    expect(Object.isFrozen(grade3PilotNativeAffordanceCandidateRubricCatalog)).toBe(
      true
    );
    const returned = findNativeAffordanceCandidateRubric(
      "native-counting-model-v1"
    )!;
    returned.decision = "pending";
    returned.releaseBlockers = [];
    const reread = findNativeAffordanceCandidateRubric(
      "native-counting-model-v1"
    )!;
    expect(reread.decision).toBe("conditional-go");
    expect(reread.releaseBlockers).toHaveLength(2);
  });
});
