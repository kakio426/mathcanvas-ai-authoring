import { describe, expect, it } from "vitest";
import { ACTIVITY_IDS, getActivitySupportState } from "@mathcanvas/contracts";
import {
  OFFICIAL_ELEMENTARY_STANDARD_COUNT,
  officialElementaryStandards,
  officialElementaryStandardsFixture,
  resolveCurriculum,
  teacherCurriculumCatalog,
  teacherTextbookUnits
} from "./index.js";

describe("2022 개정 초등 수학 공식 성취기준 권위", () => {
  it("HWP와 PDF로 확인한 121개 분모와 학년군 수를 고정한다", () => {
    expect(OFFICIAL_ELEMENTARY_STANDARD_COUNT).toBe(121);
    expect(officialElementaryStandards).toHaveLength(121);
    expect(new Set(officialElementaryStandards.map((standard) => standard.code)).size).toBe(
      121
    );
    expect(
      Object.fromEntries(
        ["1-2", "3-4", "5-6"].map((gradeBand) => [
          gradeBand,
          officialElementaryStandards.filter(
            (standard) => standard.gradeBand === gradeBand
          ).length
        ])
      )
    ).toEqual({ "1-2": 29, "3-4": 47, "5-6": 45 });
  });

  it("공식 원본과 추출물의 해시를 고정한다", () => {
    expect(officialElementaryStandardsFixture.source).toMatchObject({
      hwpArchiveSha256:
        "b37a372a90d6d00bb3985888bbb41caae7a35f28877dc243a6f4b28861c53146",
      hwpDocumentSha256:
        "aab8eed59ecf244223d04afad75f4cf5ac5085fadcfc3cf52c2f6d54ddfc7856",
      pdfSha256:
        "ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840",
      sourceTextIncluded: false
    });
  });

  it("HWP 추출에서 빠졌던 나눗셈 기호를 PDF 원문대로 보존한다", () => {
    for (const code of ["[6수01-10]", "[6수01-14]"]) {
      const standard = officialElementaryStandards.find(
        (candidate) => candidate.code === code
      );
      expect(standard?.officialGoal).toContain("÷");
    }
  });

  it("교사용 카탈로그와 해석기가 121개 공식 목표를 그대로 사용한다", () => {
    expect(teacherCurriculumCatalog).toHaveLength(121);
    for (const official of officialElementaryStandards) {
      const catalog = teacherCurriculumCatalog.find(
        (standard) => standard.standardCode === official.code
      );
      expect(catalog?.standardSummary).toBe(official.officialGoal);
      expect(catalog?.summaryKind).toBe("official-goal");
      expect(resolveCurriculum(official.code).record.officialGoal).toBe(
        official.officialGoal
      );
    }
  });

  it("71개 교과서 단원에는 공식 코드만 있고 121개 모두 한 단원 이상에 연결된다", () => {
    const officialCodes = new Set(
      officialElementaryStandards.map((standard) => standard.code)
    );
    const mappedCodes = new Set(
      teacherTextbookUnits.flatMap((unit) => unit.standardCodes)
    );
    expect(teacherTextbookUnits).toHaveLength(71);
    expect([...mappedCodes].filter((code) => !officialCodes.has(code))).toEqual([]);
    expect([...officialCodes].filter((code) => !mappedCodes.has(code))).toEqual([]);
  });

  it("legacy 교사용 활동의 상태를 canonical activity support에서 파생한다", () => {
    const pairs = [
      ["place-value-exchange", ACTIVITY_IDS.placeValueTenExchange],
      ["make-ten", ACTIVITY_IDS.makeTenNumberCards],
      ["multiplication-array", ACTIVITY_IDS.multiplicationArrayMeaning],
      ["repeating-pattern-unit", ACTIVITY_IDS.repeatingPatternUnit],
      ["clock-hour-boundary", ACTIVITY_IDS.clockHourHandBoundary],
      ["elapsed-time", ACTIVITY_IDS.elapsedTimeClockPair],
      ["broken-ruler-length", ACTIVITY_IDS.brokenRulerLength],
      ["same-denominator-sum", ACTIVITY_IDS.sameDenominatorFractionSum],
      ["same-denominator-over-one", ACTIVITY_IDS.sameDenominatorImproperSum],
      ["balanced-equation", ACTIVITY_IDS.balancedEquationCards],
      ["balance-scale-sum", ACTIVITY_IDS.balanceScaleSum],
      ["bar-graph-scale", ACTIVITY_IDS.barGraphScaleUnit],
      ["equivalent-fraction", ACTIVITY_IDS.equivalentFraction],
      ["unlike-denominator-comparison", ACTIVITY_IDS.fractionComparison],
      ["unlike-denominator-sum", ACTIVITY_IDS.unlikeDenominatorCommonUnitSum],
      [
        "unlike-denominator-difference",
        ACTIVITY_IDS.unlikeDenominatorCommonUnitDifference
      ],
      ["probability-comparison", ACTIVITY_IDS.probabilityBagComparison]
    ] as const;

    for (const [teacherActivityId, canonicalActivityId] of pairs) {
      const option = teacherCurriculumCatalog
        .flatMap((standard) => standard.activities)
        .find((activity) => activity.id === teacherActivityId);
      expect(option?.availability).toBe(
        getActivitySupportState(canonicalActivityId)
      );
    }
  });
});
