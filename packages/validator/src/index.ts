import {
  CONTRACT_SCHEMA_VERSION,
  MIN_VISUAL_FRACTION_DIFFERENCE_RATIO,
  activitySpecSchema,
  assertNoSensitiveKeys,
  compiledProjectSchema,
  sha256Hex,
  validationReportSchema,
  type ActivitySpec,
  type CompiledProject,
  type ValidationIssue,
  type ValidationReport
} from "@mathcanvas/contracts";
import {
  FRACTION_SVG_BY_DENOMINATOR,
  MATHCANVAS_CONTRACT_VERSION,
  MATHCANVAS_NUMBER_OPERATIONS_CATEGORY_ID,
  compileActivitySpec
} from "@mathcanvas/compiler";

const supportedSvgIds = new Set([
  ...Object.values(FRACTION_SVG_BY_DENOMINATOR),
  "input-text",
  "math-latex",
  "drawElem"
]);

function intersects(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function fractionValueKey(numerator: number, denominator: number): string {
  const divisor = greatestCommonDivisor(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
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

export function validateForCreation(
  specInput: ActivitySpec,
  compiledInput: CompiledProject,
  checkedAt = new Date()
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const parsedSpec = activitySpecSchema.safeParse(specInput);
  const parsedCompiled = compiledProjectSchema.safeParse(compiledInput);
  if (!parsedSpec.success) {
    for (const zodIssue of parsedSpec.error.issues) {
      issue(
        issues,
        "activity-spec-invalid",
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
        "compiled-project-invalid",
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

  const spec = parsedSpec.success ? parsedSpec.data : specInput;
  const compiled = parsedCompiled.success ? parsedCompiled.data : compiledInput;
  if (parsedSpec.success && parsedCompiled.success) {
    const canonicalCompiled = compileActivitySpec(parsedSpec.data);
    if (sha256Hex(parsedCompiled.data) !== sha256Hex(canonicalCompiled)) {
      issue(
        issues,
        "compiled-project-not-canonical",
        "api-contract",
        "컴파일된 MathCanvas 객체가 검증된 템플릿의 정확한 결과와 다릅니다."
      );
    }
  }
  if (spec.curriculumReferences[0]?.code !== "[6수01-07]") {
    issue(
      issues,
      "curriculum-standard-mismatch",
      "curriculum",
      "첫 템플릿은 공식 성취기준 [6수01-07]만 지원합니다."
    );
  }
  if (
    spec.curriculumReferences[0]?.officialGoal !==
    "분모가 다른 분수의 크기를 비교하고 그 방법을 설명할 수 있다."
  ) {
    issue(
      issues,
      "curriculum-goal-mismatch",
      "curriculum",
      "공식 성취기준 목표가 검증된 문구와 다릅니다."
    );
  }

  const allIds = [
    ...spec.visualModels.map((value) => value.id),
    ...spec.fixedObjects.map((value) => value.id),
    ...spec.movableObjects.map((value) => value.id),
    ...spec.dropAreas.map((value) => value.id)
  ];
  if (new Set(allIds).size !== allIds.length) {
    issue(issues, "duplicate-semantic-id", "schema", "활동 객체 ID가 중복됩니다.");
  }

  const instructionObjects = spec.fixedObjects.filter(
    (object) => object.kind === "instruction"
  );
  for (let leftIndex = 0; leftIndex < instructionObjects.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < instructionObjects.length;
      rightIndex += 1
    ) {
      const left = instructionObjects[leftIndex];
      const right = instructionObjects[rightIndex];
      if (left && right && intersects(left.bounds, right.bounds)) {
        issue(
          issues,
          "instruction-overlap",
          "layout",
          `${left.id}와 ${right.id} 지시문 영역이 겹칩니다.`
        );
      }
    }
  }
  const orderedInstructions = [...instructionObjects].sort(
    (left, right) => left.bounds.y - right.bounds.y
  );
  for (let index = 1; index < orderedInstructions.length; index += 1) {
    const previous = orderedInstructions[index - 1];
    const current = orderedInstructions[index];
    if (
      previous &&
      current &&
      current.bounds.y -
        (previous.bounds.y + previous.bounds.height) <
        spec.layout.minGap
    ) {
      issue(
        issues,
        "instruction-gap-too-small",
        "layout",
        `${previous.id}와 ${current.id} 사이 간격이 ${spec.layout.minGap}보다 작습니다.`
      );
    }
  }
  const lastInstruction = orderedInstructions.at(-1);
  const firstComparisonMat = spec.fixedObjects
    .filter((object) => object.kind === "comparison-mat")
    .sort((left, right) => left.bounds.y - right.bounds.y)[0];
  if (
    lastInstruction &&
    firstComparisonMat &&
    firstComparisonMat.bounds.y -
      (lastInstruction.bounds.y + lastInstruction.bounds.height) <
      spec.layout.minGap
  ) {
    issue(
      issues,
      "instruction-to-problem-gap-too-small",
      "layout",
      `지시문과 첫 비교판 사이 간격이 ${spec.layout.minGap}보다 작습니다.`
    );
  }

  const seenComparisons = new Set<string>();
  for (const problem of spec.problems) {
    const comparisonKey = [
      fractionValueKey(
        problem.left.numerator,
        problem.left.denominator
      ),
      fractionValueKey(
        problem.right.numerator,
        problem.right.denominator
      )
    ]
      .sort()
      .join("|");
    if (seenComparisons.has(comparisonKey)) {
      issue(
        issues,
        "duplicate-fraction-comparison",
        "pedagogy",
        `${problem.id}는 앞 문제와 같은 두 분수를 다시 비교합니다.`
      );
    }
    seenComparisons.add(comparisonKey);
    const leftCross =
      problem.left.numerator * problem.right.denominator;
    const rightCross =
      problem.right.numerator * problem.left.denominator;
    const relation = leftCross > rightCross ? ">" : leftCross < rightCross ? "<" : "=";
    if (problem.left.denominator === problem.right.denominator) {
      issue(
        issues,
        "denominators-not-unlike",
        "mathematics",
        `${problem.id}의 분모가 서로 다르지 않습니다.`
      );
    }
    if (relation === "=" || relation !== problem.correctRelation) {
      issue(
        issues,
        "relation-incorrect",
        "mathematics",
        `${problem.id}의 비교 기호가 실제 크기와 다릅니다.`
      );
    }
    const visualDifference = Math.abs(
      problem.left.numerator / problem.left.denominator -
        problem.right.numerator / problem.right.denominator
    );
    if (visualDifference < MIN_VISUAL_FRACTION_DIFFERENCE_RATIO) {
      issue(
        issues,
        "visual-difference-too-small",
        "pedagogy",
        `${problem.id}의 분수 띠 길이 차이는 전체의 ${MIN_VISUAL_FRACTION_DIFFERENCE_RATIO * 100}% 이상이어야 합니다.`
      );
    }
    const models = spec.visualModels.filter(
      (model) => model.problemId === problem.id
    );
    if (
      models.length !== 2 ||
      new Set(models.map((model) => model.wholeWidth)).size !== 1 ||
      new Set(models.map((model) => model.commonStartX)).size !== 1
    ) {
      issue(
        issues,
        "same-whole-violated",
        "pedagogy",
        `${problem.id}의 두 분수 모형은 같은 전체와 출발선을 써야 합니다.`
      );
    }
    for (const model of models) {
      const expected =
        model.role === "left-strip" ? problem.left : problem.right;
      if (
        model.fraction.numerator !== expected.numerator ||
        model.fraction.denominator !== expected.denominator
      ) {
        issue(
          issues,
          "visual-fraction-mismatch",
          "mathematics",
          `${model.id}의 시각 모형과 숫자 분수가 다릅니다.`
        );
      }
    }
    const lanes = spec.dropAreas.filter(
      (area) =>
        area.problemId === problem.id && area.kind === "comparison-lane"
    );
    const startLine = spec.fixedObjects.find(
      (object) => object.id === `${problem.id}-start-line`
    );
    const commonStart = models[0]?.commonStartX;
    const wholeWidth = models[0]?.wholeWidth;
    if (
      lanes.length !== 2 ||
      commonStart === undefined ||
      wholeWidth === undefined ||
      lanes.some(
        (lane) =>
          lane.bounds.x !== commonStart ||
          lane.bounds.width !== wholeWidth
      ) ||
      !startLine ||
      startLine.bounds.x + startLine.bounds.width / 2 !== commonStart
    ) {
      issue(
        issues,
        "common-start-target-mismatch",
        "pedagogy",
        `${problem.id}의 놓기 칸과 출발선이 같은 기준점에 맞지 않습니다.`
      );
    }
  }

  const semanticBounds = [
    ...spec.fixedObjects.map((object) => ({
      id: object.id,
      bounds: object.bounds,
      kind: object.kind
    })),
    ...spec.movableObjects.map((object) => ({
      id: object.id,
      bounds: object.bounds,
      kind: object.kind
    })),
    ...spec.dropAreas.map((object) => ({
      id: object.id,
      bounds: object.bounds,
      kind: object.kind
    }))
  ];
  for (const object of semanticBounds) {
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
        `${object.id}가 캔버스 밖으로 나갑니다.`
      );
    }
    if (
      (object.kind === "relation-slot" ||
        object.kind === "comparison-symbol") &&
      (width < 42 || height < 42)
    ) {
      issue(
        issues,
        "target-too-small",
        "interaction",
        `${object.id}의 조작 영역은 42×42 이상이어야 합니다.`
      );
    }
  }

  const locked = new Set(compiled.payload.canvasOption.lockIds.flat());
  const nativeIds = compiled.payload.contentsJson
    .map((object) => object.id)
    .filter((id): id is string => typeof id === "string");
  if (new Set(nativeIds).size !== nativeIds.length) {
    issue(
      issues,
      "duplicate-native-id",
      "api-contract",
      "MathCanvas 객체 ID가 중복됩니다."
    );
  }
  const nativeById = new Map(
    compiled.payload.contentsJson.flatMap((object) =>
      typeof object.id === "string" ? [[object.id, object] as const] : []
    )
  );
  for (const fixed of spec.fixedObjects) {
    if (!nativeById.has(fixed.id)) {
      issue(
        issues,
        "fixed-object-missing",
        "api-contract",
        `${fixed.id}에 해당하는 고정 MathCanvas 객체가 없습니다.`
      );
    } else if (!locked.has(fixed.id)) {
      issue(
        issues,
        "fixed-object-unlocked",
        "interaction",
        `${fixed.id}가 잠겨 있지 않습니다.`
      );
    }
  }
  for (const movable of spec.movableObjects) {
    const nativeId =
      movable.kind === "fraction-strip"
        ? movable.sourceModelId
        : movable.id;
    if (!nativeId || !nativeById.has(nativeId)) {
      issue(
        issues,
        "movable-object-missing",
        "api-contract",
        `${movable.id}에 해당하는 이동 MathCanvas 객체가 없습니다.`
      );
    } else if (locked.has(nativeId)) {
      issue(
        issues,
        "movable-object-locked",
        "interaction",
        `${movable.id}는 학생이 움직일 수 있어야 합니다.`
      );
    }
  }

  const movableIds = new Set(spec.movableObjects.map((object) => object.id));
  for (const area of spec.dropAreas) {
    for (const acceptedId of area.accepts) {
      if (!movableIds.has(acceptedId)) {
        issue(
          issues,
          "drop-accepts-unknown-object",
          "interaction",
          `${area.id}가 알 수 없는 이동 객체 ${acceptedId}를 받도록 되어 있습니다.`
        );
      }
    }
    const surfaceId = `${area.id}-surface`;
    const labelId = `${area.id}-label`;
    if (!nativeById.has(surfaceId) || !locked.has(surfaceId)) {
      issue(
        issues,
        "drop-surface-invalid",
        "interaction",
        `${area.id}의 고정 놓기 영역 표면이 없거나 잠겨 있지 않습니다.`
      );
    }
    if (!nativeById.has(labelId) || !locked.has(labelId)) {
      issue(
        issues,
        "drop-label-invalid",
        "interaction",
        `${area.id}의 놓기 위치 안내가 없거나 잠겨 있지 않습니다.`
      );
    }
  }

  for (const model of spec.visualModels) {
    const native = compiled.payload.contentsJson.find(
      (object) => object.id === model.id
    );
    if (!native) {
      issue(
        issues,
        "native-model-missing",
        "api-contract",
        `${model.id}에 해당하는 MathCanvas 객체가 없습니다.`
      );
      continue;
    }
    const expectedWidth = Math.round(
      (model.wholeWidth / model.fraction.denominator) *
        model.fraction.numerator
    );
    if (
      native.svgId !==
        FRACTION_SVG_BY_DENOMINATOR[model.fraction.denominator] ||
      native.count !== model.fraction.numerator ||
      native.divider !== model.fraction.denominator ||
      typeof native.width !== "number" ||
      Math.abs(native.width - expectedWidth) > 0.001
    ) {
      issue(
        issues,
        "native-fraction-mismatch",
        "api-contract",
        `${model.id}의 MathCanvas 분수 모형 필드가 명세와 다릅니다.`
      );
    }
    const coordinates = native.coordinates;
    const nativeX = native.x;
    const nativeY = native.y;
    if (
      typeof nativeX !== "number" ||
      typeof nativeY !== "number" ||
      !Array.isArray(coordinates) ||
      coordinates.some(
        (point) =>
          !Array.isArray(point) ||
          typeof point[0] !== "number" ||
          typeof point[1] !== "number" ||
          nativeX + point[0] < 0 ||
          nativeX + point[0] > spec.layout.width ||
          nativeY + point[1] < 0 ||
          nativeY + point[1] > spec.layout.height
      )
    ) {
      issue(
        issues,
        "native-fraction-out-of-bounds",
        "layout",
        `${model.id}의 실제 MathCanvas 분수 좌표가 캔버스 밖으로 나갑니다.`
      );
    }
  }

  for (const movable of spec.movableObjects.filter(
    (object) => object.kind === "comparison-symbol"
  )) {
    const native = nativeById.get(movable.id);
    if (
      native?.svgId !== "math-latex" ||
      native.fill !== "transparent" ||
      native.parent !== null ||
      native.isMoveRotateHandler !== false
    ) {
      issue(
        issues,
        "native-symbol-contract-mismatch",
        "api-contract",
        `${movable.id}가 검증된 MathCanvas 수식 객체 계약과 다릅니다.`
      );
    }
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
  }
  if (
    compiled.contractVersion !== MATHCANVAS_CONTRACT_VERSION ||
    compiled.payload.categoryId !== MATHCANVAS_NUMBER_OPERATIONS_CATEGORY_ID ||
    compiled.payload.studyLevel !== "elementary" ||
    compiled.payload.isNoteworthy !== false
  ) {
    issue(
      issues,
      "project-contract-mismatch",
      "api-contract",
      "새 초등 수와 연산 프로젝트 생성 계약과 다릅니다."
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

  for (const problem of spec.problems) {
    const lanes = spec.dropAreas.filter(
      (area) =>
        area.problemId === problem.id && area.kind === "comparison-lane"
    );
    const relationSlots = spec.dropAreas.filter(
      (area) =>
        area.problemId === problem.id && area.kind === "relation-slot"
    );
    if (lanes.length !== 2 || relationSlots.length !== 1) {
      issue(
        issues,
        "drop-area-count-invalid",
        "interaction",
        `${problem.id}에는 비교 칸 2개와 기호 칸 1개가 필요합니다.`
      );
    }
    if (lanes.length === 2 && intersects(lanes[0]!.bounds, lanes[1]!.bounds)) {
      issue(
        issues,
        "comparison-lanes-overlap",
        "layout",
        `${problem.id}의 두 비교 칸이 겹칩니다.`
      );
    }
  }

  return validationReportSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    activitySpecId: spec.id,
    compiledPayloadHash: compiled.payloadHash,
    checkedAt: checkedAt.toISOString(),
    issues,
    canCreate: !issues.some((value) => value.severity === "error")
  });
}
