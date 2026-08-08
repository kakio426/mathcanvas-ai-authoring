import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { grade3PilotLedgerSchema } from "@mathcanvas/contracts";
import {
  grade3PilotLedger,
  getGrade3PilotCoverage,
  teacherTextbookUnits
} from "./index.js";

const fixturePath = resolve(
  process.cwd(),
  "fixtures/pedagogy/grade-3-pilot-learning-map.used.json"
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
  commit: string;
  sourceHashes: Record<string, string>;
  records: Array<{
    standardCode: string;
    topicId: string;
    prerequisiteTopicIds: string[];
    observableEvidence: string[];
    assessmentPrompt: string;
  }>;
};

describe("3학년 기본 연습 30개 pilot ledger", () => {
  it("정확히 30개 stable ID와 학기·영역 coverage를 고정한다", () => {
    const ids = grade3PilotLedger.entries.map((entry) => entry.sourceId);
    expect(ids).toEqual(
      Array.from({ length: 30 }, (_, index) => `ppt-${String(index + 1).padStart(2, "0")}`)
    );
    expect(getGrade3PilotCoverage()).toMatchObject({
      total: 30,
      bySemester: { 1: 15, 2: 15 },
      byDomain: {
        "수와 연산": 21,
        "변화와 관계": 0,
        "도형과 측정": 7,
        "자료와 가능성": 2
      }
    });
  });

  it("PPT locator·단원 authority·standard authority를 서로 섞지 않는다", () => {
    const { sourceManifest } = grade3PilotLedger;
    expect(sourceManifest.ppt.contentSha256).toBe(
      "6e2e7fd499daf5f87461786e51382eb6bcaf25779f49559a6b08001a806a38f2"
    );
    expect(sourceManifest.standardAuthority.url).toBe(
      "https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4"
    );
    expect(sourceManifest.standardAuthority.authority).toBe("standard");
    expect(sourceManifest.unitAuthorities.map((source) => source.authority)).toEqual([
      "unit",
      "unit"
    ]);
    expect(sourceManifest.crossBandUnitAuthorities).toHaveLength(1);
    expect(sourceManifest.crossBandUnitAuthorities[0]?.url).toBe(
      "https://book.visang.com/books/info/5416"
    );
    const authorityEvidence = sourceManifest.authorityEvidence;
    expect(
      createHash("sha256")
        .update(readFileSync(resolve(process.cwd(), authorityEvidence.file)))
        .digest("hex")
    ).toBe(authorityEvidence.sha256);

    for (const entry of grade3PilotLedger.entries) {
      expect(entry.standard.source.authority).toBe("standard");
      expect(entry.unit.source.authority).toBe("unit");
      expect(entry.pptLocator).toMatch(
        /^claude-all-30-ppt-content\.md#L\d+-L\d+$/
      );
      const catalogUnit = teacherTextbookUnits.find(
        (unit) => unit.id === entry.unit.unitId
      );
      expect(catalogUnit?.title).toBe(entry.unit.title);
      expect(catalogUnit?.sourceUrl).toBe(entry.unit.source.url);
      expect(catalogUnit?.standardCodes).toContain(entry.standard.code);
      expect(entry.pptUnit.semester).toBe(entry.semester);
      expect(entry.unitMappingNote).toContain("authority");
    }
  });

  it("공식 목표·학습지도 topic과 fixture provenance를 모두 결속한다", () => {
    const records = new Map(fixture.records.map((record) => [record.standardCode, record]));
    expect(fixture.commit).toBe("3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c");
    expect(fixture.sourceHashes).toEqual({
      "topics.json":
        "80aa059ed305ce4cbeb0df45436c0b204a42cd208204c1cc1e5332c70c4bf5f3",
      "dependencies.json":
        "e09a6137bb70edf2a0b0928c05a4bd3f102c80845846ff13b10767ef4ceafe2c",
      "curriculum-standards.json":
        "aaaebb939c17fcc11a808fef3ae8164823425f74bfe8092a4a66941cb8c33335"
    });

    for (const entry of grade3PilotLedger.entries) {
      const record = records.get(entry.standard.code);
      expect(record).toBeDefined();
      expect(entry.learningMap.topicId).toBe(record?.topicId);
      expect(entry.learningMap.prerequisiteTopicIds).toEqual(
        record?.prerequisiteTopicIds
      );
      expect(entry.learningMap.observableEvidence).toEqual(
        record?.observableEvidence
      );
      expect(entry.learningMap.assessmentPrompt).toBe(record?.assessmentPrompt);
      expect(entry.learningMap.sourceRecordKey).toContain(entry.standard.code);
      expect(entry.standard.officialGoal).not.toContain("원문 미대조");
      expect(entry.standard.source.verificationStatus).toBe(
        "official-text-verified"
      );
    }
  });

  it("cross-band review를 primary standard와 별도 선수 학습으로 표시한다", () => {
    for (const entry of grade3PilotLedger.entries) {
      if (!entry.crossBandReview) {
        expect(entry.prerequisiteStandardCodes).toEqual([]);
        continue;
      }
      expect(entry.prerequisiteStandardCodes).toContain(
        entry.crossBandReview.standardCode
      );
      expect(entry.crossBandReview.standardCode).not.toBe(entry.standard.code);
      expect(entry.crossBandReview.teacherLabel).toBe("선수 학습 복습");
      expect(entry.crossBandReview.unit.grade).toBe(2);
      expect(entry.crossBandReview.unit.source.authority).toBe("unit");
      expect(entry.crossBandReview.unit.source.url).toBe(
        "https://book.visang.com/books/info/5416"
      );
      expect(entry.standard.code).toMatch(/^\[4수/);
    }
  });

  it("학기와 cross-band relation이 어긋난 입력을 schema에서 닫는다", () => {
    const semesterMismatch = structuredClone(grade3PilotLedger);
    semesterMismatch.entries[0]!.semester = 1;
    expect(grade3PilotLedgerSchema.safeParse(semesterMismatch).success).toBe(
      false
    );

    const crossBandMismatch = structuredClone(grade3PilotLedger);
    const entry = crossBandMismatch.entries.find(
      (candidate) => candidate.crossBandReview !== undefined
    )!;
    entry.prerequisiteStandardCodes = [];
    expect(grade3PilotLedgerSchema.safeParse(crossBandMismatch).success).toBe(
      false
    );
  });

  it("네이티브·blueprint·layout family를 분리하고 candidate를 released로 위장하지 않는다", () => {
    const byBlueprint = new Map(
      grade3PilotLedger.entries.map((entry) => [
        entry.blueprintFamily.id,
        entry.nativeAffordance.affordanceFamilyId
      ])
    );
    expect(byBlueprint.size).toBeGreaterThan(1);
    expect(
      grade3PilotLedger.entries.find((entry) => entry.sourceId === "ppt-01")
        ?.variationPreset.id
    ).not.toBe(
      grade3PilotLedger.entries.find((entry) => entry.sourceId === "ppt-30")
        ?.variationPreset.id
    );
    expect(
      grade3PilotLedger.entries.find((entry) => entry.sourceId === "ppt-21")
        ?.variationPreset.id
    ).not.toBe(
      grade3PilotLedger.entries.find((entry) => entry.sourceId === "ppt-22")
        ?.variationPreset.id
    );
    for (const entry of grade3PilotLedger.entries) {
      expect(entry.blueprintFamily.id).not.toBe(
        entry.nativeAffordance.affordanceFamilyId
      );
      expect(entry.blueprintFamily.id).not.toBe(entry.layoutFamily.id);
      expect(entry.screenSequence).toEqual([
        "prediction",
        "mathematical-confirmation",
        "explanation",
        "revision"
      ]);
      expect(entry.retainedPptStages).toEqual([2, 5, 8, 9]);
      expect(entry.phaseSourceStages.revision).toEqual([2, 9]);
      expect(entry.excludedPptStages).toContain(10);
      for (const stage of entry.retainedPptStages) {
        expect(entry.excludedPptStages).not.toContain(stage);
      }
      if (entry.nativeAffordance.supportState === "captured") {
        expect(entry.nativeAffordance.evidenceIds.length).toBeGreaterThan(0);
      }
      expect(entry.nativeAffordance.evidenceIds).toEqual(
        entry.nativeAffordance.evidenceRefs.map((reference) => reference.id)
      );
      for (const reference of entry.nativeAffordance.evidenceRefs) {
        const hash = createHash("sha256")
          .update(readFileSync(resolve(process.cwd(), reference.file)))
          .digest("hex");
        expect(hash).toBe(reference.sha256);
      }
    }

    const releaseWithoutReleaseEvidence = structuredClone(grade3PilotLedger);
    const capturedEntry = releaseWithoutReleaseEvidence.entries.find(
      (entry) => entry.nativeAffordance.supportState === "captured"
    )!;
    capturedEntry.nativeAffordance.supportState = "released";
    expect(
      grade3PilotLedgerSchema.safeParse(releaseWithoutReleaseEvidence).success
    ).toBe(false);

    const unknownEvidence = structuredClone(grade3PilotLedger);
    unknownEvidence.entries[0]!.nativeAffordance.evidenceIds = [
      "research/mathcanvas/does-not-exist.json#claim=released:NO04NG"
    ];
    unknownEvidence.entries[0]!.nativeAffordance.evidenceRefs = [
      {
        id: "research/mathcanvas/does-not-exist.json#claim=released:NO04NG",
        file: "research/mathcanvas/does-not-exist.json",
        sha256:
          "549a6862f9aeebeae6b0665379e95bf3befdcdf9b03b5d9f0681bb80b6f833e7",
        toolKey: "NO04NG",
        claim: "released"
      }
    ];
    expect(grade3PilotLedgerSchema.safeParse(unknownEvidence).success).toBe(
      false
    );

    const unrelatedEvidence = structuredClone(grade3PilotLedger);
    const capturedForEvidence = unrelatedEvidence.entries.find(
      (entry) => entry.nativeAffordance.supportState === "captured"
    )!;
    const releasedOtherTool = grade3PilotLedger.entries.find(
      (entry) =>
        entry.nativeAffordance.supportState === "released" &&
        entry.nativeAffordance.evidenceRefs.some(
          (reference) => reference.toolKey === "NO01SC"
        )
    )!.nativeAffordance.evidenceRefs.find(
      (reference) => reference.toolKey === "NO01SC"
    )!;
    capturedForEvidence.nativeAffordance.evidenceIds.push(
      releasedOtherTool.id
    );
    capturedForEvidence.nativeAffordance.evidenceRefs.push(
      releasedOtherTool
    );
    capturedForEvidence.nativeAffordance.supportState = "released";
    expect(
      grade3PilotLedgerSchema.safeParse(unrelatedEvidence).success
    ).toBe(false);
  });

  it("primary·cross-band authority와 variation preset 충돌을 fail-closed한다", () => {
    const wrongPrimary = structuredClone(grade3PilotLedger);
    wrongPrimary.entries[0]!.standard.code = "[2수01-10]" as never;
    expect(grade3PilotLedgerSchema.safeParse(wrongPrimary).success).toBe(false);

    const wrongStandardSource = structuredClone(grade3PilotLedger);
    wrongStandardSource.entries[0]!.standard.source = {
      ...wrongStandardSource.entries[0]!.standard.source,
      sourceId: "untrusted-standard",
      url: "https://example.com/standard",
      contentSha256: "0".repeat(64)
    };
    expect(
      grade3PilotLedgerSchema.safeParse(wrongStandardSource).success
    ).toBe(false);

    const wrongUnitSource = structuredClone(grade3PilotLedger);
    wrongUnitSource.entries[0]!.unit.source = {
      ...wrongUnitSource.entries[0]!.unit.source,
      sourceId: "untrusted-unit",
      url: "https://example.com/unit",
      contentSha256: "0".repeat(64)
    };
    expect(grade3PilotLedgerSchema.safeParse(wrongUnitSource).success).toBe(
      false
    );

    const semesterSourceSwap = structuredClone(grade3PilotLedger);
    const firstSemesterEntry = semesterSourceSwap.entries.find(
      (entry) => entry.semester === 1
    )!;
    const secondSemesterEntry = semesterSourceSwap.entries.find(
      (entry) => entry.semester === 2
    )!;
    const firstSemesterSource = firstSemesterEntry.unit.source;
    firstSemesterEntry.unit.source = secondSemesterEntry.unit.source;
    secondSemesterEntry.unit.source = firstSemesterSource;
    expect(
      grade3PilotLedgerSchema.safeParse(semesterSourceSwap).success
    ).toBe(false);

    const wrongCrossBand = structuredClone(grade3PilotLedger);
    const crossBandEntry = wrongCrossBand.entries.find(
      (entry) => entry.crossBandReview !== undefined
    )!;
    crossBandEntry.crossBandReview!.standardCode = "[2수01-10]";
    crossBandEntry.crossBandReview!.unit = {
      ...crossBandEntry.crossBandReview!.unit,
      unitId: "2-1-6",
      grade: 2
    };
    crossBandEntry.prerequisiteStandardCodes = ["[2수01-10]"];
    crossBandEntry.crossBandReview!.unit.source = {
      ...crossBandEntry.crossBandReview!.unit.source,
      sourceId: "visang-grade-3-semester-1"
    };
    expect(grade3PilotLedgerSchema.safeParse(wrongCrossBand).success).toBe(
      false
    );

    const orphanPrerequisite = structuredClone(grade3PilotLedger);
    const noCrossBand = orphanPrerequisite.entries.find(
      (entry) => entry.crossBandReview === undefined
    )!;
    noCrossBand.prerequisiteStandardCodes = ["[2수01-10]"];
    expect(grade3PilotLedgerSchema.safeParse(orphanPrerequisite).success).toBe(
      false
    );

    const duplicateVariation = structuredClone(grade3PilotLedger);
    duplicateVariation.entries[1]!.variationPreset = {
      ...duplicateVariation.entries[0]!.variationPreset
    };
    expect(grade3PilotLedgerSchema.safeParse(duplicateVariation).success).toBe(
      false
    );
  });

  it("learning-map fixture의 canonical hash가 manifest와 일치한다", () => {
    const canonical = JSON.stringify(sortObject(fixture));
    const hash = createHash("sha256")
      .update(`${canonical}\n`)
      .digest("hex");
    expect(hash).toBe(grade3PilotLedger.sourceManifest.learningMap.fixtureSha256);
  });
});

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, sortObject(child)])
    );
  }
  return value;
}
