import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildEduititHtml30ActivitySpecsV2,
  type EduititHtml30PromptHarnessInput
} from "@mathcanvas/templates";
import {
  auditEduititHtml30InitialTextLeakageV2,
  compileEduititHtml30CandidateV2
} from "./compile-eduitit-html30-v2.js";
import { buildEduititHtml30ReserveCandidatesV2 } from "./resolve/eduitit-html30-reserve-candidates-v2.js";
import { resolveEduititHtml30LayoutCandidateV2 } from "./resolve/eduitit-html30-layout-v2.js";

function harness(): EduititHtml30PromptHarnessInput {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), "research/mathcanvas/eduitit-html30-prompt-harness.json"),
      "utf8"
    )
  ) as EduititHtml30PromptHarnessInput;
}

function compiled() {
  const source = harness();
  const activities = buildEduititHtml30ActivitySpecsV2(source);
  const reserves = buildEduititHtml30ReserveCandidatesV2(activities);
  const domainBySequence = new Map(
    source.entries.map((entry) => [
      entry.sequence,
      entry.catalogBinding.domain as Parameters<typeof compileEduititHtml30CandidateV2>[2]
    ])
  );
  return activities.map((activity, index) => ({
    activity,
    candidate: compileEduititHtml30CandidateV2(
      activity,
      resolveEduititHtml30LayoutCandidateV2(activity, reserves[index]!),
      domainBySequence.get(activity.sequence)!
    )
  }));
}

function objects(candidate: ReturnType<typeof compileEduititHtml30CandidateV2>) {
  return candidate.payload.contentsJson as readonly Record<string, unknown>[];
}

describe("Eduitit HTML30 V2 canonical payload compiler", () => {
  it("fails closed when a computed answer or intermediate value returns to the initial workbench", () => {
    const all = compiled();
    const current = all[3]!.candidate;
    expect(current.initialTextLeakageAudit.passed).toBe(true);
    expect(
      auditEduititHtml30InitialTextLeakageV2(4, [
        ...objects(current),
        { id: "mc30v2-4-leaked-label", text: "60" }
      ])
    ).toMatchObject({
      passed: false,
      violations: ["mc30v2-4-leaked-label:60"]
    });
    const directionLeak = objects(all[0]!.candidate).map((object) =>
      object.id === "eduitit-html30-v2-01-direction-2"
        ? { ...object, text: "그림을 5개로 만드세요." }
        : object
    );
    expect(auditEduititHtml30InitialTextLeakageV2(1, directionLeak)).toMatchObject({
      passed: false,
      violations: ["eduitit-html30-v2-01-direction-2:5개"]
    });
    const fractionDirectionLeak = objects(all[9]!.candidate).map((object) =>
      object.id === "eduitit-html30-v2-10-direction-2"
        ? { ...object, text: "1/5이 되게 끄세요." }
        : object
    );
    expect(auditEduititHtml30InitialTextLeakageV2(10, fractionDirectionLeak)).toMatchObject({
      passed: false,
      violations: ["eduitit-html30-v2-10-direction-2:1/5"]
    });
    expect(
      auditEduititHtml30InitialTextLeakageV2(4, [
        ...objects(current),
        { id: "eduitit-html30-v2-04-answer-label", text: "60" }
      ])
    ).toMatchObject({
      passed: false,
      violations: ["eduitit-html30-v2-04-answer-label:60"]
    });
  });

  it("renders every compact bundle as a countable canonical native group", () => {
    const all = compiled();
    const expectedGroupSizes = new Map([
      [7, 7],
      [8, 8],
      [9, 6],
      [20, 7],
      [22, 6]
    ]);
    for (const [sequence, groupSize] of expectedGroupSizes) {
      const content = objects(all[sequence - 1]!.candidate);
      const firstGroupPrefix = `mc30v2-${sequence}-${
        sequence === 8 ? "eight-set" : sequence === 9 || sequence === 22 ? "six-set" : "seven-set"
      }-1-group-member-`;
      const nativeTokens = content.filter(
        (object) =>
          typeof object.id === "string" &&
          object.id.startsWith(firstGroupPrefix) &&
          object.svgId === "NO01SC-01"
      );
      expect(nativeTokens).toHaveLength(groupSize);
    }
  });

  it("does not print the partial-product answers on the movable model cards", () => {
    const all = compiled();
    for (const sequence of [4, 5, 17, 18, 19]) {
      const current = all[sequence - 1]!.candidate;
      const labels = objects(current)
        .filter(
          (object) =>
            typeof object.id === "string" &&
            /partial-\d+-group-member-2$/.test(object.id)
        )
        .map((object) => object.text);
      expect(labels.length).toBeGreaterThanOrEqual(3);
      expect(labels.every((text) => /^모형 [A-Z]$/.test(String(text)))).toBe(true);
    }
  });

  it("keeps fraction targets unresolved in both directions and native labels", () => {
    const all = compiled();
    for (const sequence of [10, 12, 13, 25]) {
      const { activity, candidate } = all[sequence - 1]!;
      const directions = activity.learnerTask.localDirections.join(" ");
      expect(directions).not.toMatch(/1\/(?:5|7|8|10)|(?:3|4|6)개로/);
      const nativeTexts = objects(candidate)
        .filter(
          (object) =>
            typeof object.id === "string" && object.id.startsWith(`mc30v2-${sequence}-`)
        )
        .map((object) => object.text)
        .filter((text): text is string => typeof text === "string" && text.length > 0);
      expect(nativeTexts).toEqual([]);
    }
  });

  it("gives 38 a non-overlapping choice set of seven groups and four loose objects", () => {
    const current = compiled()[21]!.candidate;
    const ids = objects(current).flatMap((object) =>
      typeof object.id === "string" ? [object.id] : []
    );
    expect(ids.filter((id) => /^mc30v2-22-six-set-\d-group$/.test(id))).toHaveLength(7);
    expect(ids.filter((id) => /^mc30v2-22-single-unit-\d{2}$/.test(id))).toHaveLength(4);
    expect(
      objects(current).find(
        (object) => object.id === "eduitit-html30-v2-22-construction-hint"
      )?.text
    ).toBe("묶음과 낱개로 38을 확인하세요.");
  });

  it("uses the declared radius object for 23 and a measured diameter construction for 24", () => {
    const radiusEntry = compiled()[22]!;
    const radius = radiusEntry.candidate;
    const radiusObject = objects(radius).find((object) => object.id === "mc30v2-23-native");
    expect(radiusObject?.svgId).toBe("SM07CS-01");
    expect(radiusEntry.activity.nativePlan.core.configuredInitialState.visibleRadiusSegments).toBe(0);
    expect(radiusEntry.activity.nativePlan.core.targetState.visibleRadiusSegments).toBe(1);

    const diameter = compiled()[23]!.candidate;
    const diameterObjects = objects(diameter);
    const referenceId = "eduitit-html30-v2-24-circle-reference";
    expect(diameterObjects.some((object) => object.id === referenceId)).toBe(true);
    expect(
      diameterObjects.find((object) => object.id === "mc30v2-24-native")?.svgId
    ).toBe("SM07CS-02");
    expect(
      diameterObjects.find(
        (object) => object.id === "eduitit-html30-v2-24-radius-scale-label"
      )?.text
    ).toBe("반지름 한 개 = 7cm");
    const lockedIds = diameter.payload.canvasOption.lockIds.flat();
    expect(lockedIds).toContain(referenceId);
    expect(lockedIds).not.toContain("mc30v2-24-native");
  });

  it("emits every declared native-stage single object under its exact contract id", () => {
    for (const { activity, candidate } of compiled()) {
      const payloadIds = new Set(
        objects(candidate).flatMap((object) =>
          typeof object.id === "string" ? [object.id] : []
        )
      );
      for (const unit of activity.nativePlan.movableUnits) {
        if (
          unit.startsIn === "native-stage" &&
          unit.representation.kind === "single-native-object"
        ) {
          expect(payloadIds.has(unit.representation.objectId)).toBe(true);
        }
      }
    }
  });

  it("keeps each measurement unit as one canonical draggable card", () => {
    const expectations = new Map([
      [14, ["mm", "cm", "km", "m"]],
      [15, ["cm", "mm", "m", "km"]]
    ]);
    for (const [sequence, units] of expectations) {
      const current = compiled()[sequence - 1]!.candidate;
      const content = objects(current);
      for (const unit of units) {
        expect(content.some((object) => object.text === unit)).toBe(true);
      }
      expect(
        content.filter(
          (object) =>
            typeof object.id === "string" &&
            object.id.startsWith(`mc30v2-${sequence}-`) &&
            object.id.endsWith("-group")
        )
      ).toHaveLength(4);
    }
  });
});
