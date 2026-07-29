import {
  CONTRACT_SCHEMA_VERSION,
  MIN_VISUAL_FRACTION_DIFFERENCE_RATIO,
  assertNoSensitiveKeys,
  canvasActivityHash,
  canvasActivitySpecSchema,
  compiledCanvasProjectSchema,
  sha256Hex,
  validationReportSchema,
  type CanvasActivitySpec,
  type CompiledCanvasProject,
  type ValidationIssue,
  type ValidationReport
} from "@mathcanvas/contracts";
import {
  FRACTION_SVG_BY_DENOMINATOR,
  MATHCANVAS_CONTRACT_VERSION,
  MATHCANVAS_NUMBER_OPERATIONS_CATEGORY_ID,
  compileCanvasActivitySpec,
  nativeComparisonSymbolBounds,
  nativeFractionFormulaBounds
} from "@mathcanvas/compiler";

type Bounds = { x: number; y: number; width: number; height: number };

const supportedSvgIds = new Set([
  ...Object.values(FRACTION_SVG_BY_DENOMINATOR),
  "input-text",
  "math-latex",
  "drawElem",
  "group-element"
]);

const visualDifferenceBands = {
  easy: { min: 0.28, max: 0.56 },
  normal: { min: 0.15, max: 0.27 },
  hard: { min: MIN_VISUAL_FRACTION_DIFFERENCE_RATIO, max: 0.145 }
} as const;

function intersects(left: Bounds, right: Bounds): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function contains(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function sameBounds(left: Bounds | undefined, right: Bounds): boolean {
  return (
    left?.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
}

function centerDifference(outer: Bounds, inner: Bounds): {
  x: number;
  y: number;
} {
  return {
    x: Math.abs(
      inner.x + inner.width / 2 - (outer.x + outer.width / 2)
    ),
    y: Math.abs(
      inner.y + inner.height / 2 - (outer.y + outer.height / 2)
    )
  };
}

function isCenteredWithin(
  outer: Bounds | undefined,
  inner: Bounds | undefined,
  tolerance = 1
): boolean {
  if (!outer || !inner || !contains(outer, inner)) return false;
  const difference = centerDifference(outer, inner);
  return difference.x <= tolerance && difference.y <= tolerance;
}

function nativeBounds(
  object: Record<string, unknown> | undefined
): Bounds | undefined {
  if (!object) return undefined;
  if (
    Array.isArray(object.point1) &&
    Array.isArray(object.point2) &&
    object.point1.length >= 2 &&
    object.point2.length >= 2
  ) {
    const x = Number(object.point1[0]);
    const y = Number(object.point1[1]);
    const right = Number(object.point2[0]);
    const bottom = Number(object.point2[1]);
    if ([x, y, right, bottom].every(Number.isFinite)) {
      return { x, y, width: right - x, height: bottom - y };
    }
  }
  const x = Number(object.x);
  const y = Number(object.y);
  const width = Number(object.width);
  const height = Number(object.height);
  if ([x, y, width, height].every(Number.isFinite)) {
    return { x, y, width, height };
  }
  return undefined;
}

function issue(
  issues: ValidationIssue[],
  code: string,
  area: ValidationIssue["area"],
  message: string,
  path?: string
): void {
  issues.push({
    code,
    severity: "error",
    area,
    message,
    ...(path === undefined ? {} : { path })
  });
}

function fractionValueKey(numerator: number, denominator: number): string {
  let left = Math.abs(numerator);
  let right = Math.abs(denominator);
  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  const divisor = left || 1;
  return `${numerator / divisor}/${denominator / divisor}`;
}

function report(
  issues: ValidationIssue[],
  canvasSpecId: string,
  payloadHash: string,
  checkedAt: Date
): ValidationReport {
  return validationReportSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    canvasSpecId,
    compiledPayloadHash: payloadHash,
    checkedAt: checkedAt.toISOString(),
    issues,
    canCreate: !issues.some((value) => value.severity === "error")
  });
}

export function validateForCreation(
  specInput: CanvasActivitySpec,
  compiledInput: CompiledCanvasProject,
  checkedAt = new Date()
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const parsedSpec = canvasActivitySpecSchema.safeParse(specInput);
  const parsedCompiled = compiledCanvasProjectSchema.safeParse(compiledInput);

  if (!parsedSpec.success) {
    for (const zodIssue of parsedSpec.error.issues) {
      issue(
        issues,
        "canvas-activity-spec-invalid",
        "schema",
        zodIssue.message,
        zodIssue.path.join(".")
      );
    }
  }
  if (!parsedCompiled.success) {
    for (const zodIssue of parsedCompiled.error.issues) {
      issue(
        issues,
        "compiled-canvas-project-invalid",
        "schema",
        zodIssue.message,
        zodIssue.path.join(".")
      );
    }
  }
  try {
    assertNoSensitiveKeys({ spec: specInput, compiled: compiledInput });
  } catch (error) {
    issue(
      issues,
      "sensitive-data-detected",
      "security",
      error instanceof Error ? error.message : "민감 정보가 포함되었습니다."
    );
  }

  const fallbackCanvasId =
    typeof (specInput as { canvasId?: unknown }).canvasId === "string"
      ? (specInput as { canvasId: string }).canvasId
      : "invalid-canvas";
  const fallbackPayloadHash =
    typeof (compiledInput as { payloadHash?: unknown }).payloadHash === "string" &&
    /^[a-f0-9]{64}$/.test(
      (compiledInput as { payloadHash: string }).payloadHash
    )
      ? (compiledInput as { payloadHash: string }).payloadHash
      : "0".repeat(64);
  if (!parsedSpec.success || !parsedCompiled.success) {
    return report(
      issues,
      fallbackCanvasId,
      fallbackPayloadHash,
      checkedAt
    );
  }

  const spec = parsedSpec.data;
  const compiled = parsedCompiled.data;
  if (canvasActivityHash(spec) !== spec.canvasHash) {
    issue(
      issues,
      "canvas-hash-mismatch",
      "security",
      "캔버스 해시가 현재 사양과 맞지 않습니다."
    );
  }
  try {
    const canonicalCompiled = compileCanvasActivitySpec(spec);
    if (sha256Hex(compiled) !== sha256Hex(canonicalCompiled)) {
      issue(
        issues,
        "compiled-project-not-canonical",
        "api-contract",
        "컴파일된 MathCanvas 객체가 검증된 템플릿 결과와 다릅니다."
      );
    }
  } catch (error) {
    issue(
      issues,
      "canonical-compilation-failed",
      "api-contract",
      error instanceof Error ? error.message : "정규 컴파일에 실패했습니다."
    );
  }

  if (
    spec.standardCode !== "[6수01-07]" ||
    spec.curriculumReferences[0]?.code !== "[6수01-07]" ||
    spec.curriculumReferences[0]?.officialGoal !==
      "분모가 다른 분수의 크기를 비교하고 그 방법을 설명할 수 있다." ||
    spec.grade < 5 ||
    spec.grade > 6
  ) {
    issue(
      issues,
      "curriculum-contract-mismatch",
      "curriculum",
      "첫 템플릿은 [6수01-07]과 5~6학년군만 지원합니다."
    );
  }

  const problem = spec.problem;
  const leftCross =
    problem.left.numerator * problem.right.denominator;
  const rightCross =
    problem.right.numerator * problem.left.denominator;
  const actualRelation =
    leftCross > rightCross ? ">" : leftCross < rightCross ? "<" : "=";
  if (problem.left.denominator === problem.right.denominator) {
    issue(
      issues,
      "denominators-not-unlike",
      "mathematics",
      "두 분수의 분모는 서로 달라야 합니다."
    );
  }
  if (
    actualRelation === "=" ||
    actualRelation !== problem.correctRelation ||
    fractionValueKey(
      problem.left.numerator,
      problem.left.denominator
    ) ===
      fractionValueKey(
        problem.right.numerator,
        problem.right.denominator
      )
  ) {
    issue(
      issues,
      "relation-incorrect",
      "mathematics",
      "두 분수의 비교 기호가 실제 크기와 다르거나 크기가 같습니다."
    );
  }
  const visualDifference = Math.abs(
    problem.left.numerator / problem.left.denominator -
      problem.right.numerator / problem.right.denominator
  );
  const differenceBand = visualDifferenceBands[problem.difficulty];
  if (
    visualDifference < differenceBand.min ||
    visualDifference > differenceBand.max
  ) {
    issue(
      issues,
      "visual-difference-outside-difficulty-band",
      "pedagogy",
      `${problem.difficulty} 문제의 띠 길이 차이가 난이도 범위와 맞지 않습니다.`
    );
  }

  const semanticIds = [
    ...spec.visualModels.map((object) => object.id),
    ...spec.fixedObjects.map((object) => object.id),
    ...spec.movableObjects.map((object) => object.id),
    ...spec.inputObjects.map((object) => object.id),
    ...spec.placementGuides.map((object) => object.id)
  ];
  if (new Set(semanticIds).size !== semanticIds.length) {
    issue(
      issues,
      "duplicate-semantic-id",
      "schema",
      "캔버스 객체 ID가 중복됩니다."
    );
  }

  const models = spec.visualModels;
  if (
    models.length !== 2 ||
    new Set(models.map((model) => model.wholeWidth)).size !== 1 ||
    new Set(models.map((model) => model.commonStartX)).size !== 1
  ) {
    issue(
      issues,
      "same-whole-violated",
      "pedagogy",
      "두 분수 띠는 같은 전체 폭과 같은 출발선을 써야 합니다."
    );
  }
  for (const model of models) {
    const expected =
      model.role === "left-strip" ? problem.left : problem.right;
    const expectedWidth =
      (model.wholeWidth / expected.denominator) * expected.numerator;
    if (
      model.fraction.numerator !== expected.numerator ||
      model.fraction.denominator !== expected.denominator ||
      Math.abs(model.bounds.width - expectedWidth) > 0.001 ||
      model.bounds.height !== model.segmentHeight
    ) {
      issue(
        issues,
        "visual-fraction-mismatch",
        "mathematics",
        `${model.id}의 띠와 숫자 분수가 다릅니다.`
      );
    }
  }
  const leftModel = models.find((model) => model.role === "left-strip");
  const rightModel = models.find((model) => model.role === "right-strip");
  if (leftModel && rightModel && actualRelation !== "=") {
    const leftEnd = leftModel.bounds.x + leftModel.bounds.width;
    const rightEnd = rightModel.bounds.x + rightModel.bounds.width;
    const opposingCueGap =
      actualRelation === ">" ? rightEnd - leftEnd : leftEnd - rightEnd;
    if (opposingCueGap < spec.layout.minGap) {
      issue(
        issues,
        "source-layout-does-not-require-alignment",
        "pedagogy",
        "준비 상자의 띠 끝만 보고 답을 고를 수 없도록, 옮기기 전 위치는 실제 관계와 반대여야 합니다."
      );
    }
  }

  const lanes = spec.placementGuides.filter(
    (guide) => guide.kind === "comparison-lane"
  );
  const relationSlots = spec.placementGuides.filter(
    (guide) => guide.kind === "relation-slot"
  );
  const commonStartX = models[0]?.commonStartX;
  const wholeWidth = models[0]?.wholeWidth;
  const startLine = spec.fixedObjects.find(
    (object) => object.kind === "common-start-line"
  );
  const targetLabel = spec.fixedObjects.find(
    (object) => object.id === `${problem.id}-target-label`
  );
  const startLabel = spec.fixedObjects.find(
    (object) => object.id === `${problem.id}-start-label`
  );
  if (
    lanes.length !== 2 ||
    relationSlots.length !== 1 ||
    commonStartX === undefined ||
    wholeWidth === undefined ||
    lanes.some(
      (lane) =>
        lane.bounds.x !== commonStartX ||
        lane.bounds.width !== wholeWidth ||
        lane.behavior !== "visual-guide-only"
    ) ||
    !startLine ||
    startLine.bounds.x + startLine.bounds.width / 2 !== commonStartX
  ) {
    issue(
      issues,
      "common-start-guide-mismatch",
      "pedagogy",
      "두 띠 자리와 빨간 출발선이 같은 기준점에 맞지 않습니다."
    );
  }
  if (
    !targetLabel ||
    !startLabel ||
    intersects(targetLabel.bounds, startLabel.bounds) ||
    (startLine && intersects(startLabel.bounds, startLine.bounds))
  ) {
    issue(
      issues,
      "target-instructions-overlap",
      "layout",
      "목표 안내, 출발선 이름, 출발선은 서로 겹치지 않아야 합니다."
    );
  }
  if (
    lanes.length === 2 &&
    intersects(lanes[0]!.bounds, lanes[1]!.bounds)
  ) {
    issue(
      issues,
      "comparison-lanes-overlap",
      "layout",
      "두 분수 띠 자리가 겹칩니다."
    );
  }
  if (
    relationSlots[0] &&
    lanes.some((lane) => intersects(relationSlots[0]!.bounds, lane.bounds))
  ) {
    issue(
      issues,
      "relation-slot-overlaps-lane",
      "layout",
      "기호 자리와 분수 띠 자리가 겹칩니다."
    );
  }
  if (
    startLine &&
    models.some(
      (model) =>
        lanes.some((lane) => intersects(model.bounds, lane.bounds)) ||
        intersects(model.bounds, startLine.bounds) ||
        model.bounds.x + model.bounds.width + spec.layout.minGap >
          (commonStartX ?? 0)
    )
  ) {
    issue(
      issues,
      "fraction-source-not-separated",
      "layout",
      "끌기 전 분수 띠는 빈 목표 자리와 출발선에서 떨어진 준비 상자 안에 있어야 합니다."
    );
  }

  const allSemanticBounds = [
    ...spec.fixedObjects.map((object) => ({
      id: object.id,
      kind: object.kind,
      bounds: object.bounds
    })),
    ...spec.movableObjects.map((object) => ({
      id: object.id,
      kind: object.kind,
      bounds: object.bounds
    })),
    ...spec.inputObjects.map((object) => ({
      id: object.id,
      kind: object.kind,
      bounds: object.bounds
    })),
    ...spec.placementGuides.map((object) => ({
      id: object.id,
      kind: object.kind,
      bounds: object.bounds
    }))
  ];
  for (const object of allSemanticBounds) {
    const { x, y, width, height } = object.bounds;
    if (
      x < 0 ||
      y < 0 ||
      x + width > spec.layout.width ||
      y + height > spec.layout.height
    ) {
      issue(
        issues,
        "object-out-of-bounds",
        "layout",
        `${object.id}가 1280×800 Stage 밖으로 나갑니다.`
      );
    }
    if (
      (object.kind === "comparison-symbol" ||
        object.kind === "fraction-strip" ||
        object.kind === "explanation-text" ||
        object.kind === "relation-slot") &&
      (width < 44 || height < 44)
    ) {
      issue(
        issues,
        "target-too-small",
        "interaction",
        `${object.id}의 조작 영역은 44×44 이상이어야 합니다.`
      );
    }
  }

  const instruction = spec.fixedObjects.find(
    (object) => object.kind === "instruction"
  );
  const mat = spec.fixedObjects.find(
    (object) => object.kind === "comparison-mat"
  );
  if (
    !instruction ||
    !mat ||
    mat.bounds.y -
      (instruction.bounds.y + instruction.bounds.height) <
      spec.layout.minGap
  ) {
    issue(
      issues,
      "instruction-to-mat-gap-too-small",
      "layout",
      "한 줄 지시문과 비교판 사이 간격이 부족합니다."
    );
  }
  const symbols = spec.movableObjects.filter(
    (object) => object.kind === "comparison-symbol"
  );
  if (
    symbols.length !== 2 ||
    (symbols[0] && symbols[1] && intersects(symbols[0].bounds, symbols[1].bounds))
  ) {
    issue(
      issues,
      "comparison-symbols-overlap",
      "layout",
      "비교 기호 두 개가 겹치거나 빠졌습니다."
    );
  }
  const response = spec.inputObjects[0];
  if (
    !response ||
    symbols.some((symbol) => intersects(symbol.bounds, response.bounds)) ||
    (relationSlots[0] &&
      symbols.some((symbol) =>
        intersects(symbol.bounds, relationSlots[0]!.bounds)
      )) ||
    Math.min(...symbols.map((symbol) => symbol.bounds.y + symbol.bounds.height)) >
      response.bounds.y
  ) {
    issue(
      issues,
      "response-area-overlaps-symbols",
      "layout",
      "기호와 비교 까닭 입력칸이 겹칩니다."
    );
  }

  const lockedIds = new Set(compiled.payload.canvasOption.lockIds.flat());
  const nativeById = new Map(
    compiled.payload.contentsJson.flatMap((object) =>
      typeof object.id === "string" ? [[object.id, object] as const] : []
    )
  );
  if (nativeById.size !== compiled.payload.contentsJson.length) {
    issue(
      issues,
      "duplicate-or-missing-native-id",
      "api-contract",
      "MathCanvas 네이티브 객체 ID가 없거나 중복됩니다."
    );
  }
  for (const fixed of spec.fixedObjects) {
    if (!nativeById.has(fixed.id) || !lockedIds.has(fixed.id)) {
      issue(
        issues,
        "fixed-object-invalid",
        "interaction",
        `${fixed.id}가 없거나 잠겨 있지 않습니다.`
      );
    }
  }
  const panelContracts = [
    {
      id: `${problem.id}-source-panel`,
      bounds: { x: 60, y: 130, width: 500, height: 350 }
    },
    {
      id: `${problem.id}-target-panel`,
      bounds: { x: 590, y: 130, width: 620, height: 350 }
    },
    {
      id: `${problem.id}-symbol-panel`,
      bounds: { x: 40, y: 500, width: 1180, height: 130 }
    },
    {
      id: `${problem.id}-response-panel`,
      bounds: { x: 40, y: 640, width: 1180, height: 108 }
    }
  ] as const;
  for (const panel of panelContracts) {
    const nativePanel = nativeById.get(panel.id);
    if (
      nativePanel?.svgId !== "drawElem" ||
      !sameBounds(nativeBounds(nativePanel), panel.bounds) ||
      !lockedIds.has(panel.id)
    ) {
      issue(
        issues,
        "layout-panel-contract-invalid",
        "layout",
        `${panel.id}의 위치·크기·잠금 상태가 화면 계약과 다릅니다.`
      );
    }
  }
  const panelChildContracts = [
    {
      panelId: `${problem.id}-source-panel`,
      childIds: [
        ...models.map((model) => `${model.id}-source-card`),
        `${problem.id}-move-step-label`
      ]
    },
    {
      panelId: `${problem.id}-target-panel`,
      childIds: [
        ...lanes.map((lane) => `${lane.id}-surface`),
        `${problem.id}-start-line`,
        `${problem.id}-left-fraction-card`,
        `${problem.id}-left-fraction-formula`,
        `${problem.id}-right-fraction-card`,
        `${problem.id}-right-fraction-formula`,
        `${problem.id}-target-label`,
        `${problem.id}-start-label`
      ]
    },
    {
      panelId: `${problem.id}-symbol-panel`,
      childIds: [
        ...(relationSlots[0] ? [`${relationSlots[0].id}-surface`] : []),
        ...symbols.map((symbol) => `${symbol.id}-source-card`),
        `${problem.id}-relation-left-fraction-card`,
        `${problem.id}-relation-left-fraction-formula`,
        `${problem.id}-relation-right-fraction-card`,
        `${problem.id}-relation-right-fraction-formula`,
        `${problem.id}-symbol-label`
      ]
    },
    {
      panelId: `${problem.id}-response-panel`,
      childIds: [
        ...(response ? [`${response.id}-surface`] : []),
        `${problem.id}-response-label`
      ]
    }
  ];
  for (const contract of panelChildContracts) {
    const panelBounds = nativeBounds(nativeById.get(contract.panelId));
    const invalidChildId = contract.childIds.find((childId) => {
      const childBounds = nativeBounds(nativeById.get(childId));
      return !panelBounds || !childBounds || !contains(panelBounds, childBounds);
    });
    if (invalidChildId) {
      issue(
        issues,
        "layout-panel-contract-invalid",
        "layout",
        `${invalidChildId}가 ${contract.panelId} 안에 들어 있지 않습니다.`
      );
    }
  }
  const movableNativeIds = spec.movableObjects.map((object) =>
    object.kind === "fraction-strip" ? object.sourceModelId : object.id
  );
  for (const nativeId of movableNativeIds) {
    if (!nativeId || !nativeById.has(nativeId) || lockedIds.has(nativeId)) {
      issue(
        issues,
        "movable-object-invalid",
        "interaction",
        `${String(nativeId)}가 이동 가능한 객체로 만들어지지 않았습니다.`
      );
    }
  }

  const movableIds = new Set(spec.movableObjects.map((object) => object.id));
  for (const guide of spec.placementGuides) {
    if (
      guide.behavior !== "visual-guide-only" ||
      guide.intendedObjectIds.some((id) => !movableIds.has(id))
    ) {
      issue(
        issues,
        "placement-guide-contract-invalid",
        "interaction",
        `${guide.id}의 시각 안내 대상이 올바르지 않습니다.`
      );
    }
    const surfaceId = `${guide.id}-surface`;
    if (!nativeById.has(surfaceId) || !lockedIds.has(surfaceId)) {
      issue(
        issues,
        "placement-guide-surface-invalid",
        "interaction",
        `${guide.id}의 고정 안내 표면이 없거나 잠겨 있지 않습니다.`
      );
    }
  }

  for (const model of models) {
    const native = nativeById.get(model.id);
    const groupId = `${model.id}-move-group`;
    const moveGroup = nativeById.get(groupId);
    const perWidth = model.wholeWidth / model.fraction.denominator;
    const expectedGeometricWidth = perWidth * model.fraction.numerator;
    if (!native) {
      issue(
        issues,
        "native-fraction-contract-mismatch",
        "api-contract",
        `${model.id} 분수 띠가 없습니다.`
      );
      continue;
    }
    const coordinates = native.coordinates;
    if (
      native.svgId !==
        FRACTION_SVG_BY_DENOMINATOR[model.fraction.denominator] ||
      native.count !== model.fraction.numerator ||
      native.divider !== model.fraction.denominator ||
      native.defaultWidth !== model.wholeWidth ||
      Math.abs(Number(native.width) - expectedGeometricWidth) > 0.001 ||
      native.isMoveRotateHandler !== false ||
      native.isFillChange !== false ||
      native.isSplit !== false ||
      native.groupId !== groupId ||
      native.isGroup !== true ||
      (native.parent as Record<string, unknown> | undefined)?.isResizeHandle !==
        false ||
      (native.parent as Record<string, unknown> | undefined)?.isAngleHandle !==
        false ||
      !Array.isArray(coordinates)
    ) {
      issue(
        issues,
        "native-fraction-contract-mismatch",
        "api-contract",
        `${model.id}가 이동 전용 분수 띠 계약과 다릅니다.`
      );
      continue;
    }
    const groupViewBox = moveGroup?.viewBox as
      | Record<string, unknown>
      | undefined;
    if (
      moveGroup?.svgId !== "group-element" ||
      moveGroup.groupId !== groupId ||
      moveGroup.isGroup !== true ||
      moveGroup.isBluePrint !== true ||
      moveGroup.isMoveRotateHandler !== false ||
      moveGroup.playgroundIndex !== 0 ||
      lockedIds.has(groupId) ||
      !Array.isArray(moveGroup.ids) ||
      moveGroup.ids.length !== 1 ||
      moveGroup.ids[0] !== model.id ||
      groupViewBox?.x !== model.bounds.x ||
      groupViewBox?.y !== model.bounds.y ||
      groupViewBox?.width !== model.bounds.width ||
      groupViewBox?.height !== model.bounds.height
    ) {
      issue(
        issues,
        "native-fraction-group-contract-mismatch",
        "interaction",
        `${model.id}의 크기·회전 조절을 막는 이동 전용 그룹이 올바르지 않습니다.`
      );
    }
    const xCoordinates = (coordinates as Array<[number, number]>).map(
      (point) => point[0]
    );
    const renderedWidth =
      Math.max(...xCoordinates) - Math.min(...xCoordinates);
    const nativeX = Number(native.x);
    const nativeY = Number(native.y);
    const renderedLeft = nativeX + Math.min(...xCoordinates);
    const renderedTop =
      nativeY +
      Math.min(
        ...(coordinates as Array<[number, number]>).map((point) => point[1])
      );
    const targetX = model.commonStartX - Math.min(...xCoordinates);
    if (
      Math.abs(renderedWidth - expectedGeometricWidth) > 0.001 ||
      Math.abs(renderedLeft - model.bounds.x) > 0.001 ||
      Math.abs(renderedTop - model.bounds.y) > 0.001 ||
      targetX + Math.max(...xCoordinates) >
        model.commonStartX + model.wholeWidth + 0.001
    ) {
      issue(
        issues,
        "native-fraction-geometry-mismatch",
        "layout",
        `${model.id}의 실제 좌표가 원래 자리나 출발선 안내와 맞지 않습니다.`
      );
    }

    const sourceCardId = `${model.id}-source-card`;
    const sourceCard = nativeById.get(sourceCardId);
    const sourceCardBounds = nativeBounds(sourceCard);
    if (
      sourceCard?.svgId !== "drawElem" ||
      !sourceCardBounds ||
      !contains(sourceCardBounds, model.bounds) ||
      lanes.some((lane) => intersects(sourceCardBounds, lane.bounds)) ||
      (startLine && intersects(sourceCardBounds, startLine.bounds)) ||
      !lockedIds.has(sourceCardId)
    ) {
      issue(
        issues,
        "fraction-source-card-invalid",
        "layout",
        `${model.id}의 끌기 준비 상자가 없거나 목표 자리와 겹칩니다.`
      );
    }
  }

  for (const symbol of symbols) {
    const native = nativeById.get(symbol.id);
    const nativeSymbolBounds = nativeBounds(native);
    if (
      native?.svgId !== "math-latex" ||
      native.isMoveRotateHandler !== false ||
      native.parent !== null ||
      lockedIds.has(symbol.id)
    ) {
      issue(
        issues,
        "native-symbol-contract-mismatch",
        "api-contract",
        `${symbol.id}가 이동 전용 기호 계약과 다릅니다.`
      );
    }
    const sourceCardId = `${symbol.id}-source-card`;
    const sourceCard = nativeById.get(sourceCardId);
    const sourceCardBounds = nativeBounds(sourceCard);
    const expectedNativeSymbolBounds = nativeComparisonSymbolBounds(
      symbol.bounds
    );
    if (
      sourceCard?.svgId !== "drawElem" ||
      !sourceCardBounds ||
      !contains(sourceCardBounds, symbol.bounds) ||
      !sameBounds(nativeSymbolBounds, expectedNativeSymbolBounds) ||
      (relationSlots[0] &&
        intersects(sourceCardBounds, relationSlots[0].bounds)) ||
      (response && intersects(sourceCardBounds, response.bounds)) ||
      !lockedIds.has(sourceCardId)
    ) {
      issue(
        issues,
        "symbol-source-card-invalid",
        "layout",
        `${symbol.id}의 기호가 준비 카드 가운데에 있지 않거나 기호 자리·입력칸과 겹칩니다.`
      );
    }
  }

  const fractionFormulaContracts = [
    {
      prefix: `${problem.id}-left-fraction`,
      numerator: problem.left.numerator,
      denominator: problem.left.denominator
    },
    {
      prefix: `${problem.id}-right-fraction`,
      numerator: problem.right.numerator,
      denominator: problem.right.denominator
    },
    {
      prefix: `${problem.id}-relation-left-fraction`,
      numerator: problem.left.numerator,
      denominator: problem.left.denominator
    },
    {
      prefix: `${problem.id}-relation-right-fraction`,
      numerator: problem.right.numerator,
      denominator: problem.right.denominator
    }
  ];
  for (const { prefix, numerator, denominator } of fractionFormulaContracts) {
    const cardId = `${prefix}-card`;
    const card = nativeById.get(cardId);
    const cardBounds = nativeBounds(card);
    const formulaId = `${prefix}-formula`;
    const formula = nativeById.get(formulaId);
    const formulaBounds = nativeBounds(formula);
    const expectedFormulaBounds = cardBounds
      ? nativeFractionFormulaBounds(cardBounds, numerator, denominator)
      : undefined;
    const hasLegacyPieces = [
      `${prefix}-numerator`,
      `${prefix}-line`,
      `${prefix}-denominator`
    ].some((id) => nativeById.has(id));
    if (
      card?.svgId !== "drawElem" ||
      !cardBounds ||
      formula?.svgId !== "math-latex" ||
      formula.text !== `\\frac{${numerator}}{${denominator}}` ||
      formula.parent !== null ||
      formula.fill !== "transparent" ||
      formula.isTextEditFontSize !== true ||
      formula.isMoveRotateHandler !== false ||
      !formulaBounds ||
      !expectedFormulaBounds ||
      !sameBounds(formulaBounds, expectedFormulaBounds) ||
      !lockedIds.has(cardId) ||
      !lockedIds.has(formulaId) ||
      hasLegacyPieces
    ) {
      issue(
        issues,
        "native-fraction-formula-invalid",
        "api-contract",
        `${prefix}가 수식 메뉴의 한 개짜리 잠긴 분수식 객체가 아닙니다.`
      );
    }
  }
  const nativeResponse = response ? nativeById.get(response.id) : undefined;
  const responseLabel = spec.fixedObjects.find(
    (object) => object.id === `${problem.id}-response-label`
  );
  const nativeResponseBounds = nativeBounds(nativeResponse);
  if (
    !response ||
    !responseLabel ||
    !contains(
      { x: 40, y: 640, width: 1180, height: 108 },
      responseLabel.bounds
    ) ||
    !nativeResponseBounds ||
    !contains(response.bounds, nativeResponseBounds) ||
    nativeResponseBounds.x -
      (responseLabel.bounds.x + responseLabel.bounds.width) <
      spec.layout.minGap
  ) {
    issue(
      issues,
      "response-label-not-integrated",
      "layout",
      "‘까닭’ 안내와 학생 입력 영역이 한 입력 상자 안에서 나뉘어 있지 않습니다."
    );
  }
  if (
    !response ||
    nativeResponse?.svgId !== "input-text" ||
    nativeResponse.text !== "\u200B" ||
    nativeResponse.isTextEdit !== true ||
    nativeResponse.isTextEditFontSize !== false ||
    nativeResponse.isMoveRotateHandler !== false ||
    lockedIds.has(response.id)
  ) {
    issue(
      issues,
      "native-response-input-contract-mismatch",
      "api-contract",
      "비교 까닭 칸이 학생이 편집할 수 있는 실제 글자 객체가 아닙니다."
    );
  }
  const responseSurfaceId = response
    ? `${response.id}-surface`
    : "missing-response-surface";
  const responseSurface = nativeById.get(responseSurfaceId);
  if (
    !response ||
    responseSurface?.svgId !== "drawElem" ||
    responseSurface.fill !== "#FFF9E8" ||
    responseSurface.stroke !== "#2F78C4" ||
    !Array.isArray(responseSurface.point1) ||
    !Array.isArray(responseSurface.point2) ||
    Number(responseSurface.point1[0]) !== response.bounds.x ||
    Number(responseSurface.point1[1]) !== response.bounds.y ||
    Number(responseSurface.point2[0]) !==
      response.bounds.x + response.bounds.width ||
    Number(responseSurface.point2[1]) !==
      response.bounds.y + response.bounds.height ||
    !lockedIds.has(responseSurfaceId)
  ) {
    issue(
      issues,
      "response-input-surface-invalid",
      "layout",
      "비교 까닭 입력칸의 보이는 테두리와 잠금 상태가 올바르지 않습니다."
    );
  }

  for (const [index, object] of compiled.payload.contentsJson.entries()) {
    if (
      typeof object.svgId !== "string" ||
      !supportedSvgIds.has(object.svgId)
    ) {
      issue(
        issues,
        "unsupported-svg-id",
        "api-contract",
        `지원하지 않는 MathCanvas svgId입니다: ${String(object.svgId)}`,
        `payload.contentsJson.${index}.svgId`
      );
    }
    if (
      (object.svgId === "input-text" || object.svgId === "math-latex") &&
      typeof object.fontSize === "number" &&
      object.fontSize < 24
    ) {
      issue(
        issues,
        "student-font-too-small",
        "layout",
        `${String(object.id)}의 글자 크기는 24 이상이어야 합니다.`
      );
    }
    if (
      object.svgId === "math-latex" &&
      typeof object.text === "string" &&
      /[가-힣]/.test(object.text)
    ) {
      issue(
        issues,
        "korean-text-inside-latex",
        "api-contract",
        "한글 안내는 일반 글자 객체에 넣어야 합니다."
      );
    }
  }

  if (
    compiled.contractVersion !== MATHCANVAS_CONTRACT_VERSION ||
    compiled.payload.categoryId !== MATHCANVAS_NUMBER_OPERATIONS_CATEGORY_ID ||
    compiled.payload.studyLevel !== "elementary" ||
    compiled.payload.canvasOption.scale !== 2 ||
    compiled.payload.isNoteworthy !== false ||
    compiled.payload.isShowMenuOnActivity !== false ||
    compiled.sourceCanvasSpecId !== spec.canvasId ||
    compiled.canvasHash !== spec.canvasHash ||
    compiled.setHash !== spec.setHash
  ) {
    issue(
      issues,
      "project-contract-mismatch",
      "api-contract",
      "새 한 문제 분수 비교 프로젝트 계약과 다릅니다."
    );
  }
  if (compiled.payloadHash !== sha256Hex(compiled.payload)) {
    issue(
      issues,
      "payload-hash-mismatch",
      "security",
      "컴파일된 payload의 무결성 해시가 맞지 않습니다."
    );
  }
  if (
    JSON.stringify(spec).includes('"accepts"') ||
    JSON.stringify(compiled.payload).includes('"accepts"')
  ) {
    issue(
      issues,
      "unsupported-snap-contract-leaked",
      "interaction",
      "실제 스냅 행동이 없는 accepts 필드를 생성 계약에 넣을 수 없습니다."
    );
  }
  if (
    compiled.payload.contentsJson.some(
      (object) =>
        typeof object.text === "string" &&
        (object.text.includes(problem.explanation) ||
          object.text.includes(` ${problem.correctRelation} `))
    )
  ) {
    issue(
      issues,
      "teacher-answer-leaked",
      "pedagogy",
      "학생 캔버스에 교사용 정답이나 설명이 노출되었습니다."
    );
  }

  return report(issues, spec.canvasId, compiled.payloadHash, checkedAt);
}
