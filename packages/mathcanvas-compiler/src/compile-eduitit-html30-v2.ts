import {
  MATHCANVAS_MODULE_MANIFEST,
  MATHCANVAS_PROJECT_CATEGORIES,
  MATHCANVAS_UNIT_IDS,
  mathCanvasPayloadSchema,
  sha256Hex,
  type EduititHtml30ActivitySpecV2,
  type EduititHtml30ResolvedLayoutV2,
  type MathCanvasUnitId,
  type SpatialBounds
} from "@mathcanvas/contracts";
import { compileNativeTool, type CompiledNativeToolFragment } from "./adapters/registry.js";
import { makeCanonicalNativeGroupV2 } from "./adapters/canonical-native-group-v2.js";
import {
  makeCircleDiameterCandidateObjectV2,
  makeCircleRadiusCandidateObjectV2,
  makeCountingTokenCandidateObjectV2,
  makeMultiplicationArrayCandidateObjectV2,
  makePictureGraphCandidateObjectV2
} from "./adapters/eduitit-html30-candidate-native-v2.js";

const CSS_TO_CANVAS = 1.2;
const SCREEN_OFFSET_CSS_X = 112;
const SCREEN_OFFSET_CSS_Y = 28;
const CANVAS_VIEW_BOX = [0, 0, 1536, 960] as const;

type Domain = keyof typeof MATHCANVAS_PROJECT_CATEGORIES;
type Activity = EduititHtml30ActivitySpecV2;
type Layout = EduititHtml30ResolvedLayoutV2;
type MovableUnit = Activity["nativePlan"]["movableUnits"][number];

export interface EduititHtml30CompiledCandidateV2 {
  readonly schemaVersion: "1.0.0";
  readonly candidateId: string;
  readonly activityId: string;
  readonly sequence: number;
  readonly sourceActivityVersion: string;
  readonly sourceLayoutContentSha256: string;
  readonly payloadHash: string;
  readonly payload: ReturnType<typeof mathCanvasPayloadSchema.parse>;
  readonly initialTextLeakageAudit: {
    readonly policyVersion: "html30-v2-initial-answer-leakage-v2";
    readonly forbiddenTexts: readonly string[];
    readonly checkedTextIds: readonly string[];
    readonly violations: readonly string[];
    readonly passed: true;
  };
  readonly lifecycle: {
    readonly externalWriteAllowed: false;
    readonly releaseQualified: false;
    readonly blockers: readonly [
      "live 100-percent geometry confirmation is pending",
      "actual save-reopen and visual review are pending"
    ];
  };
}

const forbiddenInitialTextBySequence: Readonly<Record<number, readonly string[]>> = {
  1: ["5개"],
  2: ["20"],
  3: ["42"],
  4: ["60", "8", "68"],
  5: ["90", "3", "93"],
  6: ["3개"],
  7: ["5묶음"],
  8: ["4묶음"],
  9: ["7묶음"],
  10: ["1/5"],
  11: ["안 돼요"],
  12: ["3/7"],
  13: ["4/10", "2/5"],
  14: [],
  15: [],
  16: ["300cm"],
  17: ["600", "120", "3", "723"],
  18: ["600", "30", "9", "639"],
  19: ["320", "128", "448"],
  20: ["4묶음"],
  21: ["3…2"],
  22: [],
  23: ["반지름"],
  24: ["14cm"],
  25: ["6/10", "3/5"],
  26: ["2 3/4"],
  27: [],
  28: ["2250", "2250mL"],
  29: ["3040", "3040g"],
  30: ["12명"]
};

function compactText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, "").trim();
}

export function auditEduititHtml30InitialTextLeakageV2(
  sequence: number,
  contentsJson: readonly Record<string, unknown>[]
): {
  readonly policyVersion: "html30-v2-initial-answer-leakage-v2";
  readonly forbiddenTexts: readonly string[];
  readonly checkedTextIds: readonly string[];
  readonly violations: readonly string[];
  readonly passed: boolean;
} {
  const forbiddenTexts = forbiddenInitialTextBySequence[sequence];
  if (!forbiddenTexts || Object.keys(forbiddenInitialTextBySequence).length !== 30) {
    throw new Error(`html30-v2:answer-leakage-policy-missing:${sequence}`);
  }
  const textEntries = contentsJson.flatMap((object) => {
    const id = typeof object.id === "string" ? object.id : "";
    const text = typeof object.text === "string" ? object.text.trim() : "";
    if (
      !id ||
      !text ||
      /-question$|-answer-choice-\d+-group-text$/.test(id)
    ) {
      return [];
    }
    return [{ id, text: compactText(text) }];
  });
  const violations = textEntries.flatMap((entry) =>
    forbiddenTexts.flatMap((forbidden) => {
      const token = compactText(forbidden);
      const exposed =
        entry.text === token ||
        (token.length >= 2 && entry.text.includes(token));
      return exposed ? [`${entry.id}:${forbidden}`] : [];
    })
  );
  return {
    policyVersion: "html30-v2-initial-answer-leakage-v2",
    forbiddenTexts: [...forbiddenTexts],
    checkedTextIds: textEntries.map((entry) => entry.id),
    violations,
    passed: violations.length === 0
  };
}

function canvasBounds(bounds: SpatialBounds): SpatialBounds {
  return {
    x: (bounds.x - SCREEN_OFFSET_CSS_X) * CSS_TO_CANVAS,
    y: (bounds.y - SCREEN_OFFSET_CSS_Y) * CSS_TO_CANVAS,
    width: bounds.width * CSS_TO_CANVAS,
    height: bounds.height * CSS_TO_CANVAS
  };
}

function center(bounds: SpatialBounds): { readonly x: number; readonly y: number } {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };
}

function fragmentObjects(fragment: CompiledNativeToolFragment): readonly Record<string, unknown>[] {
  return fragment.kind === "single" ? [fragment.object] : fragment.objects;
}

class ObjectCollector {
  readonly wrappers: Record<string, unknown>[] = [];
  readonly objects: Record<string, unknown>[] = [];
  readonly lockedIds = new Set<string>();
  readonly moduleKeys = new Set<string>();

  add(object: Record<string, unknown>, options: { readonly locked?: boolean } = {}): void {
    if (typeof object.id !== "string" || object.id.length === 0) {
      throw new Error("html30-v2:object-id-missing");
    }
    this.objects.push(object);
    if (options.locked) this.lockedIds.add(object.id);
  }

  addFragment(
    fragment: CompiledNativeToolFragment,
    options: { readonly locked?: boolean } = {}
  ): readonly Record<string, unknown>[] {
    fragment.requiredModuleKeys.forEach((key) => this.moduleKeys.add(key));
    const objects = fragmentObjects(fragment);
    objects.forEach((object) => this.add(object, options));
    return objects;
  }

  addGroup(groupId: string, members: readonly Record<string, unknown>[]): void {
    const group = makeCanonicalNativeGroupV2(groupId, members);
    this.wrappers.push(group.wrapper);
    group.members.forEach((member) => this.add(member));
  }

  result(): {
    readonly contentsJson: readonly Record<string, unknown>[];
    readonly lockIds: readonly string[][];
  } {
    const contentsJson = [...this.wrappers, ...this.objects];
    const ids = contentsJson.map((object) => object.id);
    if (
      ids.some((id) => typeof id !== "string" || id.length === 0) ||
      new Set(ids).size !== ids.length
    ) {
      throw new Error("html30-v2:object-id-duplicate");
    }
    return {
      contentsJson,
      lockIds: [...this.lockedIds].map((id) => [id])
    };
  }
}

function textObject(
  id: string,
  text: string,
  bounds: SpatialBounds,
  fontSize: number,
  centered = true
): Record<string, unknown> {
  return fragmentObjects(
    compileNativeTool(
      {
        kind: "text",
        toolKey: "common.text",
        text,
        fontSize,
        centerInPlacement: centered
      },
      { id, ...bounds }
    )
  )[0]!;
}

function rectangleObject(
  id: string,
  bounds: SpatialBounds,
  options: {
    readonly fill?: string;
    readonly stroke?: string;
    readonly strokeDashArray?: string;
  } = {}
): Record<string, unknown> {
  return fragmentObjects(
    compileNativeTool(
      {
        kind: "draw-rectangle",
        toolKey: "common.rectangle",
        fill: options.fill ?? "#FFFFFF",
        stroke: options.stroke ?? "#8DA1B8",
        strokeDashArray: options.strokeDashArray ?? "none"
      },
      { id, ...bounds }
    )
  )[0]!;
}

function numberCardObject(
  id: string,
  value: number,
  x: number,
  y: number
): Record<string, unknown> {
  return fragmentObjects(
    compileNativeTool(
      { kind: "number-card", toolKey: "NO04NT", value },
      { id, x, y, width: 80, height: 80 }
    )
  )[0]!;
}

function addLockedText(
  collector: ObjectCollector,
  id: string,
  text: string,
  bounds: SpatialBounds,
  fontSize: number,
  centered = true
): void {
  collector.add(textObject(id, text, bounds, fontSize, centered), { locked: true });
}

function addLockedRectangle(
  collector: ObjectCollector,
  id: string,
  bounds: SpatialBounds,
  options: Parameters<typeof rectangleObject>[2] = {}
): void {
  collector.add(rectangleObject(id, bounds, options), { locked: true });
}

function rolePlacement(
  layout: Layout,
  role: "native-stage" | "source-tray" | "construction-area"
): SpatialBounds {
  const placement = layout.placements.find((candidate) => candidate.role === role);
  if (!placement) throw new Error(`html30-v2:layout-role-missing:${role}`);
  return canvasBounds(placement.reserveUnionAfterTranslationCss);
}

function roleContentPlacement(
  layout: Layout,
  role: "native-stage" | "source-tray" | "construction-area"
): SpatialBounds {
  const placement = layout.placements.find((candidate) => candidate.role === role);
  if (!placement) throw new Error(`html30-v2:layout-role-missing:${role}`);
  return canvasBounds(placement.contentRectCss);
}

function stageSingleObjectIds(activity: Activity): readonly string[] {
  const ids = activity.nativePlan.movableUnits.flatMap((unit) =>
    unit.startsIn === "native-stage" && unit.representation.kind === "single-native-object"
      ? [unit.representation.objectId]
      : []
  );
  if (ids.length === 0 || new Set(ids).size !== ids.length) {
    throw new Error(`html30-v2:stage-single-object-binding:${activity.sequence}`);
  }
  return ids;
}

function addScaffold(
  collector: ObjectCollector,
  activity: Activity,
  layout: Layout
): void {
  const prefix = activity.activityId;
  addLockedText(
    collector,
    `${prefix}-question`,
    activity.learnerTask.question,
    canvasBounds(layout.questionRectCss),
    layout.typographyCssPx.question * CSS_TO_CANVAS
  );
  addLockedRectangle(
    collector,
    `${prefix}-workbench`,
    canvasBounds(layout.workbenchRectCss),
    { fill: "#F3FAFE", stroke: "#78BCE8" }
  );
  const instructionBounds = canvasBounds(layout.instructionRectCss);
  const lineHeight = instructionBounds.height / activity.learnerTask.localDirections.length;
  activity.learnerTask.localDirections.forEach((direction, index) => {
    addLockedText(
      collector,
      `${prefix}-direction-${index + 1}`,
      direction,
      {
        x: instructionBounds.x,
        y: instructionBounds.y + lineHeight * index,
        width: instructionBounds.width,
        height: lineHeight
      },
      layout.typographyCssPx.instruction * CSS_TO_CANVAS,
      false
    );
  });
  for (const placement of layout.placements) {
    const region = activity.layoutIntent.regions.find(
      (candidate) => candidate.role === placement.role
    );
    if (!region) throw new Error(`html30-v2:region-label-missing:${placement.role}`);
    addLockedRectangle(
      collector,
      `${prefix}-${placement.role}-panel`,
      canvasBounds(placement.regionRectCss),
      {
        fill: placement.role === "source-tray" ? "#FFF9EC" : "#FFFFFF",
        stroke: placement.role === "source-tray" ? "#E6B95D" : "#78BCE8"
      }
    );
    if (placement.labelMode === "external" && placement.labelRectCss) {
      addLockedText(
        collector,
        `${prefix}-${placement.role}-label`,
        region.studentLabel,
        canvasBounds(placement.labelRectCss),
        layout.typographyCssPx.regionLabel * CSS_TO_CANVAS
      );
    }
  }
}

function addAnswer(
  collector: ObjectCollector,
  activity: Activity,
  layout: Layout
): void {
  const answer = activity.learnerTask.answer;
  if (answer.kind === "none") return;
  if (!layout.answerRectCss) throw new Error("html30-v2:answer-layout-missing");
  const bounds = canvasBounds(layout.answerRectCss);
  const inner = {
    x: bounds.x + 8,
    y: bounds.y + 4,
    width: bounds.width - 16,
    height: bounds.height - 8
  };
  addLockedText(
    collector,
    `${activity.activityId}-answer-label`,
    answer.label,
    { x: inner.x, y: inner.y, width: 72, height: inner.height },
    layout.typographyCssPx.answer * CSS_TO_CANVAS
  );
  if (answer.kind === "compact-expression") {
    const inputBounds = {
      x: inner.x + 90,
      y: inner.y,
      width: 260,
      height: inner.height
    };
    addLockedRectangle(
      collector,
      `${activity.activityId}-answer-input-border`,
      inputBounds,
      { fill: "#FFFFFF", stroke: "#8DA1B8" }
    );
    collector.add(
      fragmentObjects(
        compileNativeTool(
          {
            kind: "latex",
            toolKey: "common.formula",
            text: "",
            fontSize: 34,
            centerInPlacement: true
          },
          { id: `${activity.activityId}-answer-input`, ...inputBounds }
        )
      )[0]!
    );
    return;
  }
  const dropWidth = 210;
  const dropBounds = {
    x: inner.x + inner.width - dropWidth,
    y: inner.y,
    width: dropWidth,
    height: inner.height
  };
  addLockedRectangle(
    collector,
    `${activity.activityId}-answer-drop`,
    dropBounds,
    { fill: "#FFFFFF", stroke: "#78BCE8", strokeDashArray: "8 6" }
  );
  addLockedText(
    collector,
    `${activity.activityId}-answer-drop-label`,
    "여기에 놓기",
    dropBounds,
    24
  );
  const choicesWidth = dropBounds.x - (inner.x + 90) - 12;
  const gap = 20;
  const cardWidth =
    (choicesWidth - gap * (answer.choices.length - 1)) / answer.choices.length;
  answer.choices.forEach((choice, index) => {
    const cardBounds = {
      x: inner.x + 90 + index * (cardWidth + gap),
      y: inner.y,
      width: cardWidth,
      height: inner.height
    };
    const groupId = `${activity.activityId}-answer-${choice.choiceId}-group`;
    collector.addGroup(groupId, [
      rectangleObject(`${groupId}-card`, cardBounds, {
        fill: "#F8FAFC",
        stroke: "#8DA1B8"
      }),
      textObject(`${groupId}-text`, choice.text, cardBounds, 28)
    ]);
  });
}

function addPictureGraph(collector: ObjectCollector, activity: Activity, layout: Layout): void {
  const stage = rolePlacement(layout, "native-stage");
  const isDifference = activity.sequence === 30;
  const variantId = activity.nativePlan.core.variantIds[0] as
    | "DP03PG-01"
    | "DP03PG-02";
  collector.moduleKeys.add("DP03PG");
  collector.add(
    makePictureGraphCandidateObjectV2({
      id: stageSingleObjectIds(activity)[0]!,
      // Center the full native footprint (graph plus its right-side unit control),
      // not only the graph grid.
      x: stage.x + stage.width * 0.065,
      y: stage.y + stage.height * 0.1,
      variantId,
      labels: isDifference ? ["A반", "B반", ""] : ["책", "", ""],
      graphValue: isDifference
        ? [[0, 0, 5], [0, 0, 2], [0, 0, 0]]
        : [[0, 0, 3], [0, 0, 0], [0, 0, 0]]
    })
  );
  addLockedText(
    collector,
    `${activity.activityId}-legend`,
    isDifference ? "노란 그림 1개 = 4명" : "노란 그림 1개 = 책 5권",
    {
      x: stage.x + stage.width - 365,
      y: stage.y + 18,
      width: 330,
      height: 52
    },
    26
  );
}

function addMultiplicationArray(
  collector: ObjectCollector,
  activity: Activity,
  layout: Layout
): void {
  const stage = rolePlacement(layout, "native-stage");
  const initial = activity.nativePlan.core.configuredInitialState;
  const visibleRows = Number(initial.rows);
  const visibleColumns = Number(initial.columns);
  const width = (visibleColumns + 1) * 80;
  const height = (visibleRows + 1) * 80;
  collector.moduleKeys.add("NO04NG");
  collector.add(
    makeMultiplicationArrayCandidateObjectV2({
      id: stageSingleObjectIds(activity)[0]!,
      x: center(stage).x - width / 2,
      y: center(stage).y - height / 2,
      visibleRows,
      visibleColumns
    })
  );
}

function placeValueMembers(value: number): readonly (100 | 10 | 1)[] {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  return [
    ...Array.from({ length: hundreds }, () => 100 as const),
    ...Array.from({ length: tens }, () => 10 as const),
    ...Array.from({ length: ones }, () => 1 as const)
  ];
}

function addPlaceValuePartials(
  collector: ObjectCollector,
  activity: Activity,
  layout: Layout
): void {
  const stage = roleContentPlacement(layout, "native-stage");
  const regionLabelFontSize = layout.typographyCssPx.regionLabel * CSS_TO_CANVAS;
  const groups = activity.nativePlan.movableUnits.map((unit) => {
    const representation = unit.representation;
    if (representation.kind !== "canonical-native-group") {
      throw new Error("html30-v2:place-value-group-required");
    }
    const match = /partial-(\d+)/.exec(representation.groupId);
    if (!match) throw new Error("html30-v2:place-value-number-missing");
    const value = Number(match[1]);
    const values = placeValueMembers(value);
    if (values.length + 2 !== representation.memberIds.length) {
      throw new Error(`html30-v2:place-value-member-drift:${activity.sequence}:${value}`);
    }
    const columns = Math.ceil(values.length / 3);
    return { representation, value, values, columns, width: columns * 120 };
  });
  // cardBounds adds 8 canvas units on both sides. A 36-unit anchor gap
  // therefore preserves a visible 20-unit (16.67 CSS px) semantic gap.
  const gap = 36;
  const totalWidth =
    groups.reduce((sum, group) => sum + group.width, 0) + gap * (groups.length - 1);
  let x = center(stage).x - totalWidth / 2;
  const targetHeight = 104;
  const targetBounds = {
    x: stage.x,
    y: stage.y + stage.height - targetHeight,
    width: stage.width,
    height: targetHeight
  };
  addLockedRectangle(
    collector,
    `${activity.activityId}-place-value-target`,
    targetBounds,
    { fill: "#FFFFFF", stroke: "#78BCE8", strokeDashArray: "10 8" }
  );
  addLockedText(
    collector,
    `${activity.activityId}-place-value-target-label`,
    "이 칸에서 같은 자리끼리 모으세요.",
    targetBounds,
    regionLabelFontSize
  );
  for (const [groupIndex, group] of groups.entries()) {
    const cardBounds = {
      x: x - 8,
      y: stage.y,
      width: group.width + 16,
      height: targetBounds.y - stage.y - 20
    };
    const tokenTop = stage.y + 44;
    const members: Record<string, unknown>[] = [
      rectangleObject(group.representation.memberIds[0]!, cardBounds, {
        fill: "#F8FAFC",
        stroke: "#4A90E2"
      }),
      textObject(
        group.representation.memberIds[1]!,
        `모형 ${String.fromCharCode(65 + groupIndex)}`,
        { x, y: stage.y + 4, width: group.width, height: 36 },
        regionLabelFontSize
      ),
      ...group.values.map((value, index) => {
      const column = Math.floor(index / 3);
      const row = index % 3;
      return fragmentObjects(
        compileNativeTool(
          { kind: "place-value-model", toolKey: "NO04PD", value },
          {
            id: group.representation.memberIds[index + 2]!,
            x: x + column * 120,
            y: tokenTop + row * 120,
            width: 120,
            height: 120
          }
        )
      )[0]!;
      })
    ];
    collector.moduleKeys.add("NO04PD");
    collector.addGroup(group.representation.groupId, members);
    x += group.width + gap;
  }
}

function addDistributionLanes(
  collector: ObjectCollector,
  activity: Activity,
  layout: Layout
): void {
  const source = rolePlacement(layout, "source-tray");
  const construction = rolePlacement(layout, "construction-area");
  const unit = activity.nativePlan.movableUnits[0]!;
  if (unit.representation.kind !== "independent-native-set") {
    throw new Error("html30-v2:independent-set-required");
  }
  const count = unit.representation.memberCount;
  const columns = Math.ceil(count / 2);
  const pitch = 96;
  const tokenWidth = columns * pitch;
  const tokenHeight = 2 * pitch;
  let order = 1;
  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    collector.add(
      makeCountingTokenCandidateObjectV2(
        `${unit.representation.memberIdPrefix}-unit-${String(index + 1).padStart(2, "0")}`,
        center(source).x - tokenWidth / 2 + pitch / 2 + column * pitch,
        center(source).y - tokenHeight / 2 + pitch / 2 + row * pitch,
        order
      )
    );
    order += 1;
  }
  collector.moduleKeys.add("NO01SC");
  const laneCount = activity.sequence === 6 ? 6 : 6;
  const gap = 10;
  const laneWidth = (construction.width - gap * (laneCount - 1)) / laneCount;
  const labels = activity.sequence === 6
    ? ["1명", "2명", "3명", "4명", "5명", "6명"]
    : ["1칸", "2칸", "3칸", "4칸", "5칸", "남김"];
  labels.forEach((label, index) => {
    const bounds = {
      x: construction.x + index * (laneWidth + gap),
      y: construction.y,
      width: laneWidth,
      height: construction.height
    };
    addLockedRectangle(
      collector,
      `${activity.activityId}-lane-${index + 1}`,
      bounds,
      { fill: "#FFFFFF", stroke: "#78BCE8", strokeDashArray: "8 6" }
    );
    addLockedText(
      collector,
      `${activity.activityId}-lane-label-${index + 1}`,
      label,
      bounds,
      24
    );
  });
}

function addCompactCountingGroups(
  collector: ObjectCollector,
  activity: Activity,
  layout: Layout
): void {
  const source = roleContentPlacement(layout, "source-tray");
  const construction = rolePlacement(layout, "construction-area");
  const groupUnits = activity.nativePlan.movableUnits.filter(
    (unit) => unit.representation.kind === "canonical-native-group"
  );
  const independent = activity.nativePlan.movableUnits.find(
    (unit) => unit.representation.kind === "independent-native-set"
  );
  const individualUnits = activity.nativePlan.movableUnits.filter(
    (unit) =>
      unit.representation.kind === "single-native-object" &&
      unit.startsIn === "source-tray"
  );
  const regionLabelFontSize = layout.typographyCssPx.regionLabel * CSS_TO_CANVAS;
  const columns = activity.sequence === 22 ? 3 : 2;
  const rows = Math.ceil(groupUnits.length / columns);
  const gap = 24;
  const tileWidth = (source.width - gap * (columns - 1)) / columns;
  const looseReserveHeight = independent || individualUnits.length > 0 ? 112 : 0;
  const groupAreaHeight = source.height - looseReserveHeight;
  const tileHeight = 114;
  if (rows * tileHeight + gap * (rows - 1) > groupAreaHeight) {
    throw new Error(`html30-v2:compact-group-area-overflow:${activity.sequence}`);
  }
  groupUnits.forEach((unit, index) => {
    if (unit.representation.kind !== "canonical-native-group") return;
    const column = index % columns;
    const row = Math.floor(index / columns);
    const bounds = {
      x: source.x + column * (tileWidth + gap),
      y: source.y + row * (tileHeight + gap),
      width: tileWidth,
      height: tileHeight
    };
    const groupNumber = Number(/(\d+)개|([678])장/.exec(unit.mathematicalMeaning)?.[1] ??
      /([678])/.exec(unit.mathematicalMeaning)?.[1] ?? 0);
    const memberIds = unit.representation.memberIds;
    if (groupNumber < 2 || memberIds.length !== groupNumber + 2) {
      throw new Error(
        `html30-v2:compact-group-member-drift:${activity.sequence}:${unit.unitId}`
      );
    }
    const tokenColumns = Math.ceil(groupNumber / 2);
    const tokenPitchX = 32;
    const tokenPitchY = 32;
    const tokenStartX =
      bounds.x + bounds.width / 2 - ((tokenColumns - 1) * tokenPitchX) / 2;
    const tokenObjects = Array.from({ length: groupNumber }, (_, tokenIndex) => {
      const columnIndex = tokenIndex % tokenColumns;
      const rowIndex = Math.floor(tokenIndex / tokenColumns);
      const token = makeCountingTokenCandidateObjectV2(
        memberIds[tokenIndex + 1]!,
        tokenStartX + columnIndex * tokenPitchX,
        bounds.y + 50 + rowIndex * tokenPitchY,
        index * 10 + tokenIndex + 1
      );
      const compactCoordinates = [
        [-14, -14],
        [14, -14],
        [14, 14],
        [-14, 14],
        [0, 0]
      ];
      token.coordinates = compactCoordinates.map((point) => [...point]);
      token.initCoordinates = compactCoordinates.map((point) => [...point]);
      return token;
    });
    collector.addGroup(unit.representation.groupId, [
      rectangleObject(memberIds[0]!, bounds, {
        fill: "#FFF7E8",
        stroke: "#E6A23C"
      }),
      ...tokenObjects,
      textObject(
        memberIds.at(-1)!,
        `${groupNumber}${activity.sequence === 9 ? "장" : "개"} 묶음`,
        {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: 32
        },
        20
      )
    ]);
  });
  collector.moduleKeys.add("NO01SC");
  if (independent?.representation.kind === "independent-native-set") {
    const count = independent.representation.memberCount;
    for (let index = 0; index < count; index += 1) {
      collector.add(
        makeCountingTokenCandidateObjectV2(
          `${independent.representation.memberIdPrefix}-unit-${String(index + 1).padStart(2, "0")}`,
          source.x + source.width - 44 - (index % 2) * 84,
          source.y + source.height - 44 - Math.floor(index / 2) * 84,
          groupUnits.length + index + 1
        )
      );
    }
  }
  if (individualUnits.length > 0) {
    const pitch = 96;
    const startX = center(source).x - ((individualUnits.length - 1) * pitch) / 2;
    individualUnits.forEach((unit, index) => {
      if (unit.representation.kind !== "single-native-object") return;
      collector.add(
        makeCountingTokenCandidateObjectV2(
          unit.representation.objectId,
          startX + index * pitch,
          source.y + source.height - 48,
          groupUnits.length + index + 1
        )
      );
    });
  }
  addLockedRectangle(
    collector,
    `${activity.activityId}-construction-target`,
    construction,
    { fill: "#FFFFFF", stroke: "#78BCE8", strokeDashArray: "10 8" }
  );
  addLockedText(
    collector,
    `${activity.activityId}-construction-hint`,
    activity.sequence === 22 ? "묶음과 낱개로 38을 확인하세요." : "필요한 묶음만 이곳에 놓으세요.",
    construction,
    regionLabelFontSize
  );
}

function fractionIntent(activity: Activity): { readonly numerator: number; readonly denominator: number } {
  const initial = activity.nativePlan.core.configuredInitialState;
  const denominator = Number(initial.denominator ?? initial.nativeVisibleParts ?? 0);
  const numerator = Number(initial.numerator ?? initial.visibleParts ?? 1);
  if (activity.sequence === 11) return { numerator: 1, denominator: 5 };
  if (!Number.isInteger(denominator) || denominator < 1) {
    throw new Error(`html30-v2:fraction-state:${activity.sequence}`);
  }
  return { numerator, denominator };
}

function addSingleFractions(
  collector: ObjectCollector,
  activity: Activity,
  layout: Layout
): void {
  const stage = roleContentPlacement(layout, "native-stage");
  const colors = ["#5CB8FF", "#FF9F5C"];
  const fractions = activity.sequence === 27
    ? [{ numerator: 3, denominator: 8 }, { numerator: 7, denominator: 8 }]
    : [fractionIntent(activity)];
  const nativeObjectIds = stageSingleObjectIds(activity);
  if (nativeObjectIds.length !== fractions.length) {
    throw new Error(`html30-v2:fraction-object-binding:${activity.sequence}`);
  }
  if (activity.sequence === 11) {
    const referenceY = stage.y + 8;
    const widths = [72, 108, 54, 126, 90];
    let x = center(stage).x -
      (widths.reduce((sum, width) => sum + width, 0) + 4 * (widths.length - 1)) / 2;
    widths.forEach((width, index) => {
      addLockedRectangle(
        collector,
        `${activity.activityId}-unequal-reference-${index + 1}`,
        { x, y: referenceY, width, height: 70 },
        { fill: "#FFE9A8", stroke: "#B58B18" }
      );
      x += width + 4;
    });
  }
  const wholeWidth = Math.min(stage.width - 96, 960);
  const railHeight = 150;
  const railX = center(stage).x - wholeWidth / 2;
  if (activity.sequence !== 27) {
    const railY = center(stage).y - railHeight / 2 +
      (activity.sequence === 11 ? 76 : 0);
    addLockedRectangle(
      collector,
      `${activity.activityId}-fraction-whole-rail`,
      { x: railX, y: railY, width: wholeWidth, height: railHeight },
      { fill: "#F8FAFC", stroke: "#8DA1B8", strokeDashArray: "8 6" }
    );
  } else {
    const guideX = stage.x + 52;
    addLockedRectangle(
      collector,
      `${activity.activityId}-fraction-left-guide`,
      { x: guideX, y: stage.y + 44, width: 4, height: stage.height - 88 },
      { fill: "#78BCE8", stroke: "#78BCE8" }
    );
  }
  fractions.forEach((fraction, index) => {
    const height = 150;
    const width = activity.sequence === 27
      ? Math.min(stage.width - 240, 960)
      : wholeWidth;
    const y = fractions.length === 2
      ? stage.y + 70 + index * 170
      : center(stage).y - height / 2 + (activity.sequence === 11 ? 76 : 0);
    const x = activity.sequence === 27
      ? stage.x + 52 + index * 140
      : railX;
    collector.addFragment(
      compileNativeTool(
        {
          kind: "fraction-model",
          toolKey: "NO03FM",
          fraction,
          color: colors[index]!,
          showLabel: ![10, 11, 12, 13, 25].includes(activity.sequence)
        },
        {
          id: nativeObjectIds[index]!,
          x,
          y,
          width,
          height
        }
      )
    );
  });
}

function addQuarterPartComposition(
  collector: ObjectCollector,
  activity: Activity,
  layout: Layout
): void {
  const source = rolePlacement(layout, "source-tray");
  const construction = rolePlacement(layout, "construction-area");
  const unit = activity.nativePlan.movableUnits[0]!;
  if (unit.representation.kind !== "independent-native-set") {
    throw new Error("html30-v2:quarter-parts-required");
  }
  const pieceWidth = 60;
  const gap = (source.width - pieceWidth * unit.representation.memberCount) /
    (unit.representation.memberCount - 1);
  for (let index = 0; index < unit.representation.memberCount; index += 1) {
    collector.addFragment(
      compileNativeTool(
        {
          kind: "fraction-model",
          toolKey: "NO03FM",
          fraction: { numerator: 1, denominator: 4 },
          color: "#5CB8FF",
          showLabel: true
        },
        {
          id: `${unit.representation.memberIdPrefix}-unit-${String(index + 1).padStart(2, "0")}`,
          x: source.x + index * (pieceWidth + gap),
          y: center(source).y - 40,
          width: pieceWidth * 4,
          height: 80
        }
      )
    );
  }
  const laneGap = 14;
  const laneWidth = (construction.width - laneGap * 2) / 3;
  ["전체 1", "전체 1", "남김"].forEach((label, index) => {
    const bounds = {
      x: construction.x + index * (laneWidth + laneGap),
      y: construction.y,
      width: laneWidth,
      height: construction.height
    };
    addLockedRectangle(
      collector,
      `${activity.activityId}-quarter-lane-${index + 1}`,
      bounds,
      { fill: "#FFFFFF", stroke: "#78BCE8", strokeDashArray: "8 6" }
    );
    addLockedText(
      collector,
      `${activity.activityId}-quarter-lane-label-${index + 1}`,
      label,
      bounds,
      26
    );
  });
}

function numberAndUnit(value: string): { readonly digits: readonly number[]; readonly suffix: string } {
  const match = /^(\d*)(cm|mm|km|m)?$/.exec(value);
  if (!match) throw new Error(`html30-v2:number-card-value:${value}`);
  if (!match[1] && !match[2]) throw new Error(`html30-v2:number-card-value:${value}`);
  return {
    digits: [...match[1]!].map(Number),
    suffix: match[2] ?? ""
  };
}

function unitValue(unit: MovableUnit): string {
  const match = /(?:^|\s)(\d+(?:(?:cm|mm|km|m))?|cm|mm|km|m)(?:\s|$)/.exec(
    unit.mathematicalMeaning
  );
  if (!match) throw new Error(`html30-v2:unit-value:${unit.unitId}`);
  return match[1]!;
}

function addNumberCardComposition(
  collector: ObjectCollector,
  activity: Activity,
  layout: Layout
): void {
  const source = roleContentPlacement(layout, "source-tray");
  const construction = roleContentPlacement(layout, "construction-area");
  const units = activity.nativePlan.movableUnits;
  const regionLabelFontSize = layout.typographyCssPx.regionLabel * CSS_TO_CANVAS;
  const oneColumn = [14, 15, 16, 28, 29].includes(activity.sequence);
  const columns = oneColumn ? 1 : 2;
  const rows = Math.ceil(units.length / columns);
  const rowHeight = source.height / rows;
  const columnWidth = source.width / columns;
  units.forEach((unit, index) => {
    if (unit.representation.kind !== "canonical-native-group") {
      throw new Error("html30-v2:number-card-group-required");
    }
    const value = unitValue(unit);
    const parsed = numberAndUnit(value);
    const memberCount = parsed.digits.length + (parsed.suffix ? 1 : 0) + 1;
    if (memberCount !== unit.representation.memberIds.length) {
      throw new Error(`html30-v2:number-card-member-drift:${unit.unitId}`);
    }
    const contentWidth = parsed.digits.length * 80 + (parsed.suffix ? 80 : 0);
    const cardWidth = contentWidth + 24;
    const cardHeight = 104;
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cardLeft = source.x + column * columnWidth + (columnWidth - cardWidth) / 2;
    const cardTop = source.y + row * rowHeight + (rowHeight - cardHeight) / 2;
    const left = cardLeft + 12;
    const top = cardTop + 12;
    const members: Record<string, unknown>[] = [
      rectangleObject(
        unit.representation.memberIds[0]!,
        { x: cardLeft, y: cardTop, width: cardWidth, height: cardHeight },
        { fill: "#F8FAFC", stroke: "#4A90E2" }
      ),
      ...parsed.digits.map((digit, digitIndex) =>
      numberCardObject(
        unit.representation.kind === "canonical-native-group"
          ? unit.representation.memberIds[digitIndex + 1]!
          : "unreachable",
        digit,
        left + digitIndex * 80,
        top
      )
    )];
    if (parsed.suffix) {
      members.push(
        textObject(
          unit.representation.memberIds.at(-1)!,
          parsed.suffix,
          { x: left + parsed.digits.length * 80, y: top, width: 80, height: 80 },
          28
        )
      );
    }
    collector.moduleKeys.add("NO04NT");
    collector.addGroup(unit.representation.groupId, members);
  });
  if (activity.sequence === 14 || activity.sequence === 15) {
    const labels = activity.sequence === 14 ? ["지우개", "복도"] : ["단추", "도시 사이"];
    const gap = 18;
    const width = (construction.width - gap) / 2;
    labels.forEach((label, index) => {
      const bounds = {
        x: construction.x + index * (width + gap),
        y: construction.y,
        width,
        height: construction.height
      };
      addLockedRectangle(
        collector,
        `${activity.activityId}-target-${index + 1}`,
        bounds,
        { fill: "#FFFFFF", stroke: "#78BCE8", strokeDashArray: "8 6" }
      );
      addLockedText(
        collector,
        `${activity.activityId}-target-label-${index + 1}`,
        label,
        bounds,
        regionLabelFontSize
      );
    });
    return;
  }
  if (activity.sequence === 16) {
    addLockedRectangle(
      collector,
      `${activity.activityId}-cm-target`,
      construction,
      { fill: "#FFFFFF", stroke: "#78BCE8", strokeDashArray: "8 6" }
    );
    addLockedText(
      collector,
      `${activity.activityId}-cm-target-label`,
      "3m 만들기",
      construction,
      regionLabelFontSize
    );
    return;
  }
  const plusCount = activity.sequence === 28 ? 2 : 1;
  const railGap = 12;
  const slotCount = plusCount + 1;
  const operatorWidth = 54;
  const slotWidth =
    (construction.width - operatorWidth * plusCount - railGap * (slotCount + plusCount - 1)) /
    slotCount;
  let x = construction.x;
  for (let index = 0; index < slotCount; index += 1) {
    const slot = { x, y: construction.y, width: slotWidth, height: construction.height };
    addLockedRectangle(
      collector,
      `${activity.activityId}-number-slot-${index + 1}`,
      slot,
      { fill: "#FFFFFF", stroke: "#78BCE8", strokeDashArray: "8 6" }
    );
    x += slotWidth;
    if (index < plusCount) {
      x += railGap;
      addLockedText(
        collector,
        `${activity.activityId}-plus-${index + 1}`,
        "+",
        { x, y: construction.y, width: operatorWidth, height: construction.height },
        42
      );
      x += operatorWidth + railGap;
    }
  }
}

function addCircle(collector: ObjectCollector, activity: Activity, layout: Layout): void {
  const stage = rolePlacement(layout, "native-stage");
  const point = center(stage);
  const nativeObjectId = stageSingleObjectIds(activity)[0]!;
  collector.moduleKeys.add("SM07CS");
  if (activity.sequence === 23) {
    collector.add(
      makeCircleRadiusCandidateObjectV2(nativeObjectId, point.x, point.y)
    );
    return;
  }
  const reference = makeCircleRadiusCandidateObjectV2(
    `${activity.activityId}-circle-reference`,
    point.x,
    point.y
  );
  reference.centerText = "";
  reference.isSurroundRect = false;
  reference.strokeWidth = 2;
  collector.add(reference, { locked: true });
  collector.add(
    makeCircleDiameterCandidateObjectV2(
      nativeObjectId,
      point.x,
      point.y
    )
  );
  addLockedText(
    collector,
    `${activity.activityId}-radius-scale-label`,
    "반지름 한 개 = 7cm",
    { x: point.x - 180, y: point.y + 220, width: 360, height: 48 },
    layout.typographyCssPx.regionLabel * CSS_TO_CANVAS
  );
}

function addNativeScene(
  collector: ObjectCollector,
  activity: Activity,
  layout: Layout
): void {
  switch (activity.sequence) {
    case 1:
    case 30:
      addPictureGraph(collector, activity, layout);
      return;
    case 2:
    case 3:
      addMultiplicationArray(collector, activity, layout);
      return;
    case 4:
    case 5:
    case 17:
    case 18:
    case 19:
      addPlaceValuePartials(collector, activity, layout);
      return;
    case 6:
    case 21:
      addDistributionLanes(collector, activity, layout);
      return;
    case 7:
    case 8:
    case 9:
    case 20:
    case 22:
      addCompactCountingGroups(collector, activity, layout);
      return;
    case 10:
    case 11:
    case 12:
    case 13:
    case 25:
    case 27:
      addSingleFractions(collector, activity, layout);
      return;
    case 14:
    case 15:
    case 16:
    case 28:
    case 29:
      addNumberCardComposition(collector, activity, layout);
      return;
    case 23:
    case 24:
      addCircle(collector, activity, layout);
      return;
    case 26:
      addQuarterPartComposition(collector, activity, layout);
      return;
    default:
      throw new Error(`html30-v2:sequence-unsupported:${activity.sequence}`);
  }
}

function moduleActivationMap(requiredModuleKeys: readonly string[]): Record<MathCanvasUnitId, Record<string, boolean>> {
  const required = new Set(requiredModuleKeys);
  return Object.fromEntries(
    MATHCANVAS_UNIT_IDS.map((unitId) => [
      unitId,
      Object.fromEntries(
        MATHCANVAS_MODULE_MANIFEST.filter(
          (entry) => entry.categoryId === unitId && entry.moduleKey
        ).map((entry) => [entry.moduleKey!, required.has(entry.moduleKey!)])
      )
    ])
  ) as Record<MathCanvasUnitId, Record<string, boolean>>;
}

export function compileEduititHtml30CandidateV2(
  activity: Activity,
  layout: Layout,
  domain: Domain
): EduititHtml30CompiledCandidateV2 {
  if (
    activity.activityId !== layout.activityId ||
    activity.sequence < 1 ||
    activity.sequence > 30 ||
    layout.persistedCanvasScale !== 3 ||
    layout.mathCanvasZoomPercent !== 100 ||
    layout.canvas100Candidate.viewBox.join(",") !== CANVAS_VIEW_BOX.join(",")
  ) {
    throw new Error("html30-v2:activity-layout-binding");
  }
  const collector = new ObjectCollector();
  addScaffold(collector, activity, layout);
  addNativeScene(collector, activity, layout);
  addAnswer(collector, activity, layout);
  const compiled = collector.result();
  const initialTextLeakageAudit = auditEduititHtml30InitialTextLeakageV2(
    activity.sequence,
    compiled.contentsJson
  );
  if (!initialTextLeakageAudit.passed) {
    throw new Error(
      `html30-v2:initial-answer-leakage:${activity.sequence}:` +
        initialTextLeakageAudit.violations.join(",")
    );
  }
  const category = MATHCANVAS_PROJECT_CATEGORIES[domain];
  const payload = mathCanvasPayloadSchema.parse({
    projectTitle: `[EDUITIT-MC30-V2-${String(activity.sequence).padStart(2, "0")}] ${activity.title}`,
    categoryId: category.categoryId,
    contentsJson: compiled.contentsJson,
    canvasOption: {
      grid: {
        type: "none",
        isGrid: false,
        distance: { x: 40, y: 40 },
        isGridToggle: false
      },
      scale: 3,
      lockIds: compiled.lockIds,
      viewBox: CANVAS_VIEW_BOX,
      CR07BSArr: [],
      CR07BSObj: { type1: 0.3, type2: 0.3, type3: 0.3, weight: 0 },
      moduleArr: moduleActivationMap([
        activity.nativePlan.core.toolKey,
        ...(activity.nativePlan.supporting ? [activity.nativePlan.supporting.toolKey] : []),
        ...collector.moduleKeys
      ]),
      isCaptured: false,
      penElements: [],
      canvasCenterCoordinate: { cx: 768, cy: 480 }
    },
    isShowMenuOnActivity: true,
    isNoteworthy: false,
    tags: ["에듀잇티", "수업꾸러미", "HTML30-V2", `sequence-${activity.sequence}`],
    studyLevel: "elementary"
  });
  return {
    schemaVersion: "1.0.0",
    candidateId: `${activity.activityId}-compiled-candidate`,
    activityId: activity.activityId,
    sequence: activity.sequence,
    sourceActivityVersion: activity.activityVersion,
    sourceLayoutContentSha256: sha256Hex(layout),
    payloadHash: sha256Hex(payload),
    payload,
    initialTextLeakageAudit: {
      ...initialTextLeakageAudit,
      passed: true
    },
    lifecycle: {
      externalWriteAllowed: false,
      releaseQualified: false,
      blockers: [
        "live 100-percent geometry confirmation is pending",
        "actual save-reopen and visual review are pending"
      ]
    }
  };
}
