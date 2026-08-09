import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  eduititHtml30ActivitySpecV2Schema,
  type EduititHtml30ActivitySpecV2
} from "@mathcanvas/contracts";
import {
  buildEduititHtml30ActivitySpecsV2,
  type EduititHtml30PromptHarnessInput
} from "./eduitit-html30-v2.js";

function harness(): EduititHtml30PromptHarnessInput {
  return JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        "research/mathcanvas/eduitit-html30-prompt-harness.json"
      ),
      "utf8"
    )
  ) as EduititHtml30PromptHarnessInput;
}

function entries(): readonly EduititHtml30ActivitySpecV2[] {
  return buildEduititHtml30ActivitySpecsV2(harness());
}

describe("Eduitit HTML30 native-first V2 activity specs", () => {
  it("실제 HTML30 source와 1:1인 한 문제 활동 30개를 만든다", () => {
    const result = entries();
    expect(result).toHaveLength(30);
    expect(result.map((entry) => entry.sequence)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1)
    );
    expect(new Set(result.map((entry) => entry.sourceBinding.slideHtmlSha256)).size).toBe(30);
    expect(
      result.every(
        (entry) =>
          entry.structure.oneProblem &&
          entry.structure.displayedHeading === "question-only" &&
          entry.layoutIntent.problemCount === 1
      )
    ).toBe(true);
  });

  it("100%·작업판 중심 구조이며 ①②③·예상·수정·필기 영역이 없다", () => {
    const forbidden = /(?:①|②|③|Shift|시프트|예상|처음 고른|답을 바꾸|수정하세요|까닭.*쓰|설명.*쓰|펜으로|적으세요)/;
    for (const entry of entries()) {
      expect(entry.layoutIntent).toMatchObject({
        viewportCssPx: { width: 1280, height: 800 },
        mathCanvasZoomPercent: 100,
        persistedCanvasScale: 3,
        semanticGapCssPx: 16,
        nativeReservePolicy: "measure-initial-selected-manipulated-before-layout",
        containmentPolicy: "visual-and-interaction-bounds-inside-workbench"
      });
      expect(entry.layoutIntent.workbenchBandRatio).toBeGreaterThanOrEqual(0.76);
      expect(entry.learnerTask.localDirections.length).toBeLessThanOrEqual(2);
      expect(forbidden.test(entry.learnerTask.question)).toBe(false);
      expect(entry.learnerTask.localDirections.some((line) => forbidden.test(line))).toBe(false);
      expect(entry.structure).toMatchObject({
        topDirectionBlock: false,
        predictionRegion: false,
        firstAnswerRegion: false,
        revisionRegion: false,
        writtenReasonRegion: false,
        penRequired: false,
        coreEvidence: "native-construction"
      });
    }
  });

  it("도구는 미리 배치되고 Shift 없이 core 1개와 supporting 최대 1개만 쓴다", () => {
    for (const entry of entries()) {
      expect(entry.nativePlan.placementMode).toBe("generator-preplaced");
      expect(entry.nativePlan.studentToolMenuRequired).toBe(false);
      expect(entry.nativePlan.keyboardModifiers).toEqual([]);
      expect(entry.nativePlan.core.primaryMathematicalStateChanges).toBe(true);
      expect(
        entry.sourceBinding.catalogAffordance.candidateToolKeys
      ).toContain(entry.nativePlan.core.toolKey);
      if (entry.nativePlan.supporting) {
        expect(entry.sourceBinding.catalogAffordance.candidateToolKeys).toContain(
          entry.nativePlan.supporting.toolKey
        );
        expect(entry.nativePlan.supporting.toolKey).not.toBe(
          entry.nativePlan.core.toolKey
        );
      }
    }
  });

  it("복합 이동물은 생성 시점의 canonical native group으로 고정한다", () => {
    const result = entries();
    const grouped = result.flatMap((entry) =>
      entry.nativePlan.movableUnits.filter(
        (unit) => unit.representation.kind === "canonical-native-group"
      )
    );
    expect(grouped.length).toBeGreaterThan(20);
    for (const unit of grouped) {
      if (unit.representation.kind !== "canonical-native-group") continue;
      expect(unit.representation.persistedBeforeStudentUse).toBe(true);
      expect(unit.representation.membersMoveAsOne).toBe(true);
      expect(unit.representation.memberIds.length).toBeGreaterThanOrEqual(2);
      expect(new Set(unit.representation.memberIds).size).toBe(
        unit.representation.memberIds.length
      );
    }
    expect(result[6]!.learnerTask.localDirections[0]).toBe(
      "7개 묶음을 옮겨 모두 35개가 되게 하세요."
    );
    expect(result[13]!.layoutIntent.regions.map((region) => region.studentLabel)).toEqual([
      "단위 카드",
      "지우개 · 복도"
    ]);
    expect(result[27]!.layoutIntent.regions.map((region) => region.studentLabel)).toEqual([
      "수 카드",
      "mL 식 만들기"
    ]);
  });

  it("부분 선택 활동은 정답에 쓰지 않는 대안을 실제 이동물 ID에 결속한다", () => {
    const subsetSequences = [4, 5, 7, 8, 9, 14, 15, 16, 17, 18, 19, 20, 28, 29];
    for (const entry of entries()) {
      const contract = entry.nativePlan.decisionContract;
      if (!subsetSequences.includes(entry.sequence)) {
        expect(contract.mode).toBe("native-state-space");
        continue;
      }
      expect(contract.mode).toBe("movable-subset");
      if (contract.mode !== "movable-subset") continue;
      const unitIds = entry.nativePlan.movableUnits.map((unit) => unit.unitId);
      expect(contract.suppliedMovableUnitCount).toBe(unitIds.length);
      expect(contract.rejectableUnitIds.length).toBeGreaterThan(0);
      expect(contract.rejectableUnitIds.every((unitId) => unitIds.includes(unitId))).toBe(true);
      expect(contract.solutionUsesFewerMovableUnitsThanSupplied).toBe(true);
    }
  });

  it("조작 결과가 답이면 답 상자를 만들지 않고 필요한 활동만 작은 답을 둔다", () => {
    for (const entry of entries()) {
      if (entry.learnerTask.constructionStateStatesAnswer) {
        expect(entry.learnerTask.answer.kind).toBe("none");
        expect(entry.layoutIntent.answerBandRatio).toBe(0);
      } else {
        expect(entry.learnerTask.answer.kind).not.toBe("none");
        expect(entry.layoutIntent.answerBandRatio).toBe(0.08);
      }
    }
    expect(entries().filter((entry) => entry.learnerTask.answer.kind !== "none").length).toBe(5);
  });

  it("60%·옛 단계·불완전 그룹·catalog 밖 도구를 self-consistent mutation으로도 거부한다", () => {
    const zoom = structuredClone(entries()[0]!);
    (zoom.layoutIntent.mathCanvasZoomPercent as number) = 60;
    (zoom.layoutIntent.persistedCanvasScale as number) = 5;
    expect(eduititHtml30ActivitySpecV2Schema.safeParse(zoom).success).toBe(false);

    const phase = structuredClone(entries()[1]!);
    (phase.structure.topDirectionBlock as boolean) = true;
    phase.learnerTask.localDirections = [
      "① 먼저 예상한 답을 적으세요."
    ];
    expect(eduititHtml30ActivitySpecV2Schema.safeParse(phase).success).toBe(false);

    const group = structuredClone(entries()[6]!);
    const firstGroup = group.nativePlan.movableUnits[0]!;
    if (firstGroup.representation.kind !== "canonical-native-group") {
      throw new Error("test fixture group missing");
    }
    (firstGroup.representation.persistedBeforeStudentUse as boolean) = false;
    expect(eduititHtml30ActivitySpecV2Schema.safeParse(group).success).toBe(false);

    const tool = structuredClone(entries()[0]!);
    tool.nativePlan.core.toolKey = "NO04NT";
    tool.nativePlan.core.variantIds = ["NO04NT-01"];
    expect(eduititHtml30ActivitySpecV2Schema.safeParse(tool).success).toBe(false);

    const obvious = structuredClone(entries()[3]!);
    obvious.nativePlan.decisionContract = {
      mode: "native-state-space",
      distinguishablePossibilityCount: 3,
      initiallyUnresolved: true,
      lockedAnswerExposed: false,
      plausibleWrongPath: "다른 상태",
      selfVerification: obvious.nativePlan.core.invariant
    };
    expect(eduititHtml30ActivitySpecV2Schema.safeParse(obvious).success).toBe(false);

    const missingAlternative = structuredClone(entries()[3]!);
    if (missingAlternative.nativePlan.decisionContract.mode !== "movable-subset") {
      throw new Error("test fixture subset decision missing");
    }
    missingAlternative.nativePlan.decisionContract.rejectableUnitIds = ["activity-4-ghost"];
    expect(eduititHtml30ActivitySpecV2Schema.safeParse(missingAlternative).success).toBe(false);
  });

  it("작업판 이름과 목적 또는 source/construction 구분이 빠지면 거부한다", () => {
    const single = structuredClone(entries()[0]!);
    single.layoutIntent.regions[0]!.studentLabel = "";
    expect(eduititHtml30ActivitySpecV2Schema.safeParse(single).success).toBe(false);

    const composition = structuredClone(entries()[5]!);
    composition.layoutIntent.regions = [composition.layoutIntent.regions[0]!];
    expect(eduititHtml30ActivitySpecV2Schema.safeParse(composition).success).toBe(false);
  });
});
