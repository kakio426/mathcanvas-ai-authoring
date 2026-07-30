import { assertNoSensitiveData } from "./normalize.mjs";
import {
  ROUND_TRIP_NUMERIC_TOLERANCE,
  WAVE1_RELEASED_TOOL_KEYS,
  buildCanaryPayload,
  compareRoundTripValues,
  countWave1ToolObjects,
  exactRoundTripHash,
  validateCanaryGoldenBinding,
  validateWave1CanaryGoldenBinding
} from "./round-trip-evidence.mjs";

export const WAVE1_CANARY_ARTIFACT_ID =
  "wave1-current-golden-canary-artifacts-v1";
export const WAVE1_CANARY_PROBE_ID =
  "wave1-current-golden-canary-v1";
export const WAVE1_CANARY_RECOVERY_ARTIFACT_ID =
  "wave1-current-golden-canary-recovery-artifacts-v1";
export const WAVE1_CANARY_RECOVERY_PROBE_ID =
  "wave1-current-golden-canary-recovery-v1";
export const WAVE1_CANARY_REDACTED_PROJECT_PATH =
  "/api/project/<redacted-project>";
export const WAVE2_CANARY_ARTIFACT_ID =
  "wave2-common-draw-canary-artifacts-v1";
export const WAVE2_CANARY_CREATE_CHECKPOINT_ID =
  "wave2-common-draw-canary-create-checkpoint-v1";
export const WAVE2_CANARY_PROBE_ID =
  "wave2-common-draw-canary-v1";
export const WAVE2_CANARY_TITLE_PREFIX =
  "AI-CONTRACT-PROBE-W2";
const MOVEMENT_FIELDS = new Set(["_x", "_y", "x", "y"]);
const SAVE_PAYLOAD_FIELDS = new Set([
  "canvasOption",
  "categoryId",
  "contentsJson",
  "contentsJsonLength",
  "isNoteworthy",
  "isShowMenuOnActivity",
  "projectTitle",
  "studyLevel",
  "tags"
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("canary evidence에는 유한한 숫자만 허용됩니다.");
  }
  if (typeof value === "undefined" || typeof value === "function") {
    throw new TypeError(
      "canary evidence에는 undefined 또는 함수를 허용하지 않습니다."
    );
  }
  return value;
}

function sameJson(left, right) {
  try {
    return JSON.stringify(canonicalize(left)) ===
      JSON.stringify(canonicalize(right));
  } catch {
    return false;
  }
}

function metadataDeltaSummary(initial, saved) {
  const shape = (value) =>
    Array.isArray(value)
      ? `array(${value.length})`
      : typeof value === "string"
        ? `string(${value.length})`
        : value === null
          ? "null"
          : typeof value;
  return [
    ...new Set([
      ...Object.keys(initial),
      ...Object.keys(saved)
    ])
  ]
    .filter(
      (key) =>
        key !== "contentsJson" &&
        key !== "canvasOption"
    )
    .sort()
    .filter((key) => !sameJson(initial[key], saved[key]))
    .map(
      (key) =>
        `${key}:${shape(initial[key])}->${shape(saved[key])}`
    );
}

function deriveModuleIndexTags(contentsJson, canvasOption) {
  const known = new Map(
    Object.values(canvasOption?.moduleArr ?? {})
      .flatMap((unit) => Object.keys(unit ?? {}))
      .map((key) => [key.toUpperCase(), key])
  );
  const derived = new Set();
  for (const object of contentsJson ?? []) {
    const prefix = String(object?.svgId ?? "").split("-")[0];
    const moduleKey = known.get(prefix.toUpperCase());
    if (moduleKey) derived.add(moduleKey);
  }
  return [...derived].sort();
}

function isoDate(value) {
  return (
    typeof value === "string" &&
    Number.isFinite(new Date(value).getTime()) &&
    new Date(value).toISOString() === value
  );
}

function hash64(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function comparableFromProjectPayload(payload) {
  return canonicalize({
    projectTitle: payload?.projectTitle,
    contentsJson: payload?.contentsJson,
    canvasOption: payload?.canvasOption,
    isShowMenuOnActivity: payload?.isShowMenuOnActivity,
    isNoteworthy: payload?.isNoteworthy ?? false,
    tags: payload?.tags,
    studyLevel: payload?.studyLevel,
    categoryId:
      payload?.categoryId ?? payload?.category?.categoryId
  });
}

function contentObjectsById(contents) {
  if (!Array.isArray(contents)) {
    throw new TypeError("canary contentsJson은 배열이어야 합니다.");
  }
  const byId = new Map();
  for (const object of contents) {
    if (
      typeof object?.id !== "string" ||
      object.id.length === 0 ||
      byId.has(object.id)
    ) {
      throw new Error("canary-content-id-invalid-or-duplicate");
    }
    byId.set(object.id, object);
  }
  return byId;
}

function assertCommonSaveBoundary(
  initialComparable,
  savedPayload,
  { allowPenElementsDelta = false } = {}
) {
  if (
    savedPayload === null ||
    typeof savedPayload !== "object" ||
    Array.isArray(savedPayload) ||
    Object.keys(savedPayload).some(
      (key) => !SAVE_PAYLOAD_FIELDS.has(key)
    ) ||
    !Array.isArray(savedPayload.contentsJson) ||
    (Object.hasOwn(savedPayload, "contentsJsonLength") &&
      savedPayload.contentsJsonLength !==
        savedPayload.contentsJson.length)
  ) {
    throw new Error("canary-save-payload-shape-invalid");
  }
  const savedComparable = comparableFromProjectPayload({
    ...initialComparable,
    ...savedPayload,
    categoryId:
      savedPayload.categoryId ?? initialComparable.categoryId,
    isShowMenuOnActivity:
      savedPayload.isShowMenuOnActivity ??
      initialComparable.isShowMenuOnActivity,
    isNoteworthy:
      savedPayload.isNoteworthy ??
      initialComparable.isNoteworthy
  });
  const initialCanvasOption = initialComparable?.canvasOption;
  const savedCanvasOption = savedComparable?.canvasOption;
  if (
    initialCanvasOption === null ||
    savedCanvasOption === null ||
    typeof initialCanvasOption !== "object" ||
    typeof savedCanvasOption !== "object"
  ) {
    throw new Error("canary-save-canvas-option-invalid");
  }
  const initialCanvasWithoutLifecycle = {
    ...initialCanvasOption,
    canvasCenterCoordinate: undefined,
    isCaptured: undefined,
    viewBox: undefined
  };
  const savedCanvasWithoutLifecycle = {
    ...savedCanvasOption,
    canvasCenterCoordinate: undefined,
    isCaptured: undefined,
    viewBox: undefined
  };
  delete initialCanvasWithoutLifecycle.canvasCenterCoordinate;
  delete initialCanvasWithoutLifecycle.isCaptured;
  delete initialCanvasWithoutLifecycle.viewBox;
  delete savedCanvasWithoutLifecycle.canvasCenterCoordinate;
  delete savedCanvasWithoutLifecycle.isCaptured;
  delete savedCanvasWithoutLifecycle.viewBox;
  if (allowPenElementsDelta) {
    delete initialCanvasWithoutLifecycle.penElements;
    delete savedCanvasWithoutLifecycle.penElements;
  }
  const initialViewBox = initialCanvasOption.viewBox;
  const savedViewBox = savedCanvasOption.viewBox;
  const viewBoxIsBounded =
    Array.isArray(initialViewBox) &&
    initialViewBox.length === 4 &&
    initialViewBox.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    ) &&
    initialViewBox[2] > 0 &&
    initialViewBox[3] > 0 &&
    Array.isArray(savedViewBox) &&
    savedViewBox.length === 4 &&
    savedViewBox.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    ) &&
    savedViewBox[2] >= initialViewBox[2] * 0.1 &&
    savedViewBox[3] >= initialViewBox[3] * 0.1 &&
    savedViewBox[2] <= initialViewBox[2] * 2 &&
    savedViewBox[3] <= initialViewBox[3] * 2 &&
    savedViewBox[0] >= initialViewBox[0] - initialViewBox[2] &&
    savedViewBox[1] >= initialViewBox[1] - initialViewBox[3] &&
    savedViewBox[0] <= initialViewBox[0] + initialViewBox[2] &&
    savedViewBox[1] <= initialViewBox[1] + initialViewBox[3] &&
    Math.max(
      0,
      Math.min(
        savedViewBox[0] + savedViewBox[2],
        initialViewBox[0] + initialViewBox[2]
      ) - Math.max(savedViewBox[0], initialViewBox[0])
    ) >= Math.min(savedViewBox[2], initialViewBox[2]) * 0.25 &&
    Math.max(
      0,
      Math.min(
        savedViewBox[1] + savedViewBox[3],
        initialViewBox[1] + initialViewBox[3]
      ) - Math.max(savedViewBox[1], initialViewBox[1])
    ) >= Math.min(savedViewBox[3], initialViewBox[3]) * 0.25;
  if (
    !sameJson(
      initialCanvasWithoutLifecycle,
      savedCanvasWithoutLifecycle
    ) ||
    savedCanvasOption.isCaptured !== true ||
    typeof savedCanvasOption?.canvasCenterCoordinate?.cx !== "number" ||
    typeof savedCanvasOption?.canvasCenterCoordinate?.cy !== "number" ||
    !Number.isFinite(savedCanvasOption.canvasCenterCoordinate.cx) ||
    !Number.isFinite(savedCanvasOption.canvasCenterCoordinate.cy) ||
    !viewBoxIsBounded
  ) {
    throw new Error("canary-save-has-unexpected-canvas-metadata-change");
  }
  const derivedTags = deriveModuleIndexTags(
    savedComparable.contentsJson,
    initialCanvasOption
  );
  const savedTagsAreDerivedModuleIndex =
    Array.isArray(savedComparable.tags) &&
    !sameJson(initialComparable?.tags, savedComparable.tags) &&
    sameJson([...savedComparable.tags].sort(), derivedTags);
  const initialWithoutContents = {
    ...initialComparable,
    canvasOption: initialCanvasWithoutLifecycle,
    contentsJson: [],
    ...(savedTagsAreDerivedModuleIndex
      ? { tags: savedComparable.tags }
      : {})
  };
  const savedWithoutContents = {
    ...savedComparable,
    canvasOption: savedCanvasWithoutLifecycle,
    contentsJson: []
  };
  if (!sameJson(initialWithoutContents, savedWithoutContents)) {
    throw new Error(
      `canary-save-mutated-project-metadata:${metadataDeltaSummary(
        initialWithoutContents,
        savedWithoutContents
      ).join(",")}`
    );
  }
  return {
    savedComparable,
    initialCanvasOption,
    savedCanvasOption,
    initialPenElements: initialCanvasOption.penElements,
    savedPenElements: savedCanvasOption.penElements,
    ...(savedTagsAreDerivedModuleIndex
      ? {
          derivedModuleIndexTags: {
            relation:
              "module-index-derived-from-saved-contents",
            submittedTagCount:
              initialComparable?.tags?.length ?? 0,
            savedTagCount: savedComparable.tags.length
          }
        }
      : {})
  };
}

function normalizeKnownEditorHydration(
  initialObject,
  savedObject
) {
  const normalized = structuredClone(savedObject);
  const defaults = [];
  if (
    initialObject.svgId === "drawElem" &&
    !Object.hasOwn(initialObject, "isEyeOn") &&
    savedObject.isEyeOn === false
  ) {
    delete normalized.isEyeOn;
    defaults.push("drawElem.isEyeOn=false");
  }
  if (
    initialObject.svgId === "input-text" &&
    savedObject?.parent !== null &&
    typeof savedObject?.parent === "object" &&
    Object.hasOwn(savedObject.parent, "editSnapshots") &&
    sameJson(savedObject.parent.editSnapshots, {})
  ) {
    const parentWithoutSnapshots = {
      ...savedObject.parent
    };
    delete parentWithoutSnapshots.editSnapshots;
    if (sameJson(initialObject.parent, parentWithoutSnapshots)) {
      normalized.parent = parentWithoutSnapshots;
      defaults.push("input-text.parent.editSnapshots={}");
    }
  }
  return { normalized, defaults };
}

function wireSummary(object) {
  return {
    objectId: object.id,
    wireSvgId:
      typeof object.svgId === "string"
        ? object.svgId
        : "<absent>",
    wireType:
      typeof object.type === "string"
        ? object.type
        : "<absent>",
    fieldNames: Object.keys(object).sort(),
    fieldTypes: Object.fromEntries(
      Object.entries(object)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([field, value]) => [
          field,
          value === null
            ? "null"
            : Array.isArray(value)
              ? "array"
              : typeof value
        ])
    ),
    finitePositionFields: Object.fromEntries(
      ["_x", "_y", "x", "y"]
        .filter(
          (field) =>
            typeof object[field] === "number" &&
            Number.isFinite(object[field])
        )
        .map((field) => [field, object[field]])
    )
  };
}

export function assertSavedPayloadDelta({
  initialComparable,
  savedPayload,
  newObjectIds,
  movedObjectId,
  minimumNewObjectCount = 1,
  maximumNewObjectCount = 4
}) {
  const {
    savedComparable,
    initialCanvasOption,
    savedCanvasOption,
    derivedModuleIndexTags
  } = assertCommonSaveBoundary(initialComparable, savedPayload);
  const initialById = contentObjectsById(
    initialComparable?.contentsJson
  );
  const savedById = contentObjectsById(savedComparable.contentsJson);
  const actualNewObjectIds = [...savedById.keys()].filter(
    (objectId) => !initialById.has(objectId)
  );
  if (
    !Number.isInteger(minimumNewObjectCount) ||
    !Number.isInteger(maximumNewObjectCount) ||
    minimumNewObjectCount < 0 ||
    maximumNewObjectCount < minimumNewObjectCount ||
    actualNewObjectIds.length < minimumNewObjectCount ||
    actualNewObjectIds.length > maximumNewObjectCount ||
    !Array.isArray(newObjectIds) ||
    !sameJson(
      [...actualNewObjectIds].sort(),
      [...newObjectIds].sort()
    ) ||
    typeof movedObjectId !== "string" ||
    !actualNewObjectIds.includes(movedObjectId) ||
    ![...initialById.keys()].every((objectId) =>
      savedById.has(objectId)
    )
  ) {
    throw new Error("canary-save-object-delta-invalid");
  }

  const hydrationDefaults = new Map();
  const changedInitialObjectIds = [];
  for (const [objectId, initialObject] of initialById) {
    const { normalized, defaults } =
      normalizeKnownEditorHydration(
        initialObject,
        savedById.get(objectId)
      );
    for (const entry of defaults) {
      hydrationDefaults.set(
        entry,
        (hydrationDefaults.get(entry) ?? 0) + 1
      );
    }
    if (!sameJson(initialObject, normalized)) {
      changedInitialObjectIds.push(objectId);
    }
  }
  if (changedInitialObjectIds.length !== 0) {
    throw new Error(
      `canary-save-mutated-initial-objects:${changedInitialObjectIds.join(",")}`
    );
  }
  const newObjects = actualNewObjectIds.map(
    (objectId) => savedById.get(objectId)
  );
  return {
    savedComparable,
    newObjectIds: actualNewObjectIds,
    movedObjectId,
    wireSummaries: newObjects.map(wireSummary),
    editorHydration: {
      defaults: Object.fromEntries(
        [...hydrationDefaults.entries()].sort(
          ([left], [right]) => left.localeCompare(right)
        )
      )
    },
    ...(derivedModuleIndexTags
      ? { derivedModuleIndexTags }
      : {}),
    automaticSaveMetadataFields: [
      "canvasCenterCoordinate",
      "isCaptured",
      "viewBox"
    ]
      .filter(
        (field) =>
          !sameJson(
            initialCanvasOption[field],
            savedCanvasOption[field]
          )
      )
      .map((field) => `canvasOption.${field}`)
  };
}

export function assertSavedPenElementsDelta({
  initialComparable,
  savedPayload,
  expectedPenStrokeIds
}) {
  const {
    savedComparable,
    initialCanvasOption,
    savedCanvasOption,
    initialPenElements,
    savedPenElements,
    derivedModuleIndexTags
  } = assertCommonSaveBoundary(initialComparable, savedPayload, {
    allowPenElementsDelta: true
  });
  if (
    !Array.isArray(initialPenElements) ||
    initialPenElements.length === 0 ||
    !Array.isArray(savedPenElements) ||
    savedPenElements.length === 0 ||
    !Array.isArray(expectedPenStrokeIds) ||
    expectedPenStrokeIds.length !== savedPenElements.length ||
    expectedPenStrokeIds.length > 64 ||
    expectedPenStrokeIds.some(
      (id) => typeof id !== "string" || id.length === 0
    ) ||
    new Set(expectedPenStrokeIds).size !==
      expectedPenStrokeIds.length ||
    sameJson(initialPenElements, savedPenElements)
  ) {
    throw new Error("canary-save-pen-elements-delta-invalid");
  }
  const savedIds = savedPenElements.map((element) =>
    typeof element?.id === "string" ? element.id : ""
  );
  if (
    savedIds.some((id) => id.length === 0) ||
    new Set(savedIds).size !== savedIds.length ||
    !sameJson(
      [...savedIds].sort(),
      [...expectedPenStrokeIds].sort()
    )
  ) {
    throw new Error("canary-save-pen-elements-id-set-invalid");
  }

  const initialById = contentObjectsById(
    initialComparable?.contentsJson
  );
  const savedById = contentObjectsById(
    savedComparable?.contentsJson
  );
  if (
    initialById.size !== savedById.size ||
    ![...initialById.keys()].every((id) => savedById.has(id))
  ) {
    throw new Error("canary-save-pen-mutated-object-set");
  }
  const hydrationDefaults = new Map();
  for (const [objectId, initialObject] of initialById) {
    const { normalized, defaults } =
      normalizeKnownEditorHydration(
        initialObject,
        savedById.get(objectId)
      );
    if (!sameJson(initialObject, normalized)) {
      throw new Error(
        `canary-save-pen-mutated-content:${objectId}`
      );
    }
    for (const entry of defaults) {
      hydrationDefaults.set(
        entry,
        (hydrationDefaults.get(entry) ?? 0) + 1
      );
    }
  }

  return {
    savedComparable,
    initialPenStrokeIds: initialPenElements
      .map((element) =>
        typeof element?.id === "string" ? element.id : ""
      )
      .sort(),
    savedPenStrokeIds: [...savedIds].sort(),
    penElementSummaries: savedPenElements.map((element) => ({
      strokeId: element.id,
      fieldNames: Object.keys(element).sort(),
      fieldTypes: Object.fromEntries(
        Object.entries(element)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([field, value]) => [
            field,
            value === null
              ? "null"
              : Array.isArray(value)
                ? "array"
                : typeof value
          ])
      ),
      ...(typeof element.d === "string"
        ? {
            pathLength: element.d.length,
            pathSha256: exactRoundTripHash(element.d)
          }
        : {})
    })),
    editorHydration: {
      defaults: Object.fromEntries(
        [...hydrationDefaults.entries()].sort(
          ([left], [right]) => left.localeCompare(right)
        )
      )
    },
    ...(derivedModuleIndexTags
      ? { derivedModuleIndexTags }
      : {}),
    automaticSaveMetadataFields: [
      "canvasCenterCoordinate",
      "isCaptured",
      "viewBox"
    ]
      .filter(
        (field) =>
          !sameJson(
            initialCanvasOption[field],
            savedCanvasOption[field]
          )
      )
      .map((field) => `canvasOption.${field}`)
  };
}

export function assertSingleFractionMovement({
  initialComparable,
  savedPayload,
  targetObjectId
}) {
  const {
    savedComparable,
    initialCanvasOption,
    savedCanvasOption,
    derivedModuleIndexTags
  } = assertCommonSaveBoundary(initialComparable, savedPayload);

  const initialById = contentObjectsById(
    initialComparable?.contentsJson
  );
  const savedById = contentObjectsById(savedComparable.contentsJson);
  if (
    initialById.size !== savedById.size ||
    ![...initialById.keys()].every((id) => savedById.has(id))
  ) {
    throw new Error("canary-save-mutated-object-set");
  }
  const normalizedSavedById = new Map();
  let rectangleIsEyeOnDefaultCount = 0;
  let textEditSnapshotsDefaultCount = 0;
  const targetPointerMetadataFields = [];
  for (const [objectId, initialObject] of initialById) {
    const savedObject = savedById.get(objectId);
    const { normalized, defaults } =
      normalizeKnownEditorHydration(initialObject, savedObject);
    rectangleIsEyeOnDefaultCount += defaults.filter(
      (entry) => entry === "drawElem.isEyeOn=false"
    ).length;
    textEditSnapshotsDefaultCount += defaults.filter(
      (entry) =>
        entry === "input-text.parent.editSnapshots={}"
    ).length;
    if (
      objectId === targetObjectId &&
      typeof initialObject?.svgId === "string" &&
      initialObject.svgId.startsWith("NO03FM-") &&
      savedObject?.parent !== null &&
      typeof savedObject?.parent === "object"
    ) {
      const normalizedParent = {
        ...savedObject.parent,
        mouseX: initialObject?.parent?.mouseX,
        mouseY: initialObject?.parent?.mouseY
      };
      if (
        Number.isFinite(savedObject.parent.mouseX) &&
        Number.isFinite(savedObject.parent.mouseY) &&
        sameJson(initialObject.parent, normalizedParent)
      ) {
        normalized.parent = normalizedParent;
        for (const field of ["mouseX", "mouseY"]) {
          if (
            !sameJson(
              initialObject.parent[field],
              savedObject.parent[field]
            )
          ) {
            targetPointerMetadataFields.push(
              `parent.${field}`
            );
          }
        }
      }
    }
    normalizedSavedById.set(objectId, normalized);
  }
  const changedObjectIds = [];
  for (const [objectId, initialObject] of initialById) {
    if (!sameJson(initialObject, normalizedSavedById.get(objectId))) {
      changedObjectIds.push(objectId);
    }
  }
  if (
    changedObjectIds.length !== 1 ||
    changedObjectIds[0] !== targetObjectId
  ) {
    throw new Error(
      `canary-save-must-change-one-target:${changedObjectIds.join(",")}`
    );
  }

  const initialTarget = initialById.get(targetObjectId);
  const savedTarget = normalizedSavedById.get(targetObjectId);
  if (
    typeof initialTarget?.svgId !== "string" ||
    !initialTarget.svgId.startsWith("NO03FM-") ||
    savedTarget?.svgId !== initialTarget.svgId
  ) {
    throw new Error("canary-save-target-is-not-the-same-fraction");
  }
  const keys = new Set([
    ...Object.keys(initialTarget),
    ...Object.keys(savedTarget)
  ]);
  const changedFields = [...keys]
    .filter(
      (key) => !sameJson(initialTarget[key], savedTarget[key])
    )
    .sort();
  if (
    changedFields.length === 0 ||
    changedFields.some((field) => !MOVEMENT_FIELDS.has(field)) ||
    (!changedFields.includes("x") && !changedFields.includes("y"))
  ) {
    throw new Error(
      `canary-save-has-non-movement-change:${changedFields.join(",")}`
    );
  }
  for (const field of changedFields) {
    if (
      typeof initialTarget[field] !== "number" ||
      typeof savedTarget[field] !== "number" ||
      !Number.isFinite(initialTarget[field]) ||
      !Number.isFinite(savedTarget[field])
    ) {
      throw new Error(`canary-save-movement-not-finite:${field}`);
    }
  }
  const delta = {
    x: Number(savedTarget.x) - Number(initialTarget.x),
    y: Number(savedTarget.y) - Number(initialTarget.y),
    _x: Number(savedTarget._x) - Number(initialTarget._x),
    _y: Number(savedTarget._y) - Number(initialTarget._y)
  };
  if (
    !Object.values(delta).every(Number.isFinite) ||
    (delta.x === 0 && delta.y === 0)
  ) {
    throw new Error("canary-save-has-no-finite-placement-delta");
  }
  return {
    savedComparable,
    changedObjectIds,
    changedFields,
    delta,
    editorRehydration: {
      rectangleIsEyeOnDefaultCount,
      textEditSnapshotsDefaultCount,
      targetPointerMetadataFields
    },
    ...(derivedModuleIndexTags
      ? { derivedModuleIndexTags }
      : {}),
    automaticSaveMetadataFields: [
      "canvasCenterCoordinate",
      "isCaptured",
      "viewBox"
    ]
      .filter(
        (field) =>
          !sameJson(
            initialCanvasOption[field],
            savedCanvasOption[field]
          )
      )
      .map((field) => `canvasOption.${field}`)
  };
}

function comparisonProjection(comparison) {
  return {
    normalizedEqual: comparison.normalizedEqual,
    numericDifferenceCount: comparison.numericDifferenceCount,
    maximumNumericDelta: comparison.maximumNumericDelta,
    unexpectedDifferenceCount:
      comparison.unexpectedDifferenceCount,
    unexpectedDifferences: comparison.unexpectedDifferences
  };
}

function countsFor(contents) {
  const classification = countWave1ToolObjects(contents);
  return {
    classification,
    counts: Object.fromEntries(
      WAVE1_RELEASED_TOOL_KEYS.map((toolKey) => [
        toolKey,
        classification.counts.get(toolKey) ?? 0
      ])
    )
  };
}

function expectedClaims(toolResults, finalComparableHash) {
  return Object.fromEntries(
    toolResults.map((result) => [
      result.toolKey,
      {
        lifecycle: {
          finalRenderedObjectCount:
            result.finalRenderedObjectCount,
          persistedObjectCount: result.finalReopenedObjectCount
        },
        released: {
          finalComparableHash,
          persistedAfterSave: true
        },
        verified: {
          finalReopenedObjectCount:
            result.finalReopenedObjectCount,
          submittedObjectCount: result.submittedObjectCount
        }
      }
    ])
  );
}

export function validateWave1CanaryEvidence({
  evidence,
  artifacts,
  goldenFixture
}) {
  const issues = [];
  const issue = (path, message) => issues.push({ path, message });
  if (
    evidence?.schemaVersion !== "1.0.0" ||
    evidence?.probeId !== WAVE1_CANARY_PROBE_ID ||
    !isoDate(evidence?.observedAt)
  ) {
    issue("identity", "canary schema, probe ID, ISO 관찰 시각이 필요합니다.");
  }
  if (
    artifacts?.schemaVersion !== "1.0.0" ||
    artifacts?.artifactId !== WAVE1_CANARY_ARTIFACT_ID ||
    artifacts?.runId !== evidence?.provenance?.runId
  ) {
    issue("artifacts", "canary artifact ID와 run ID가 일치해야 합니다.");
  }
  try {
    assertNoSensitiveData(evidence);
    assertNoSensitiveData(artifacts);
  } catch (error) {
    issue("redaction", String(error));
  }

  const goldenPayload =
    goldenFixture?.results?.compiledProject?.payload;
  const goldenPayloadHash = goldenFixture?.invariants?.payloadHash;
  try {
    validateWave1CanaryGoldenBinding({
      goldenPayload,
      expectedGoldenPayloadHash: goldenPayloadHash,
      submittedPayload: artifacts?.submittedPayload,
      runId: artifacts?.runId
    });
  } catch (error) {
    issue("goldenBinding", String(error));
  }
  if (
    evidence?.provenance?.source !==
      "current-golden-approved-canary" ||
    evidence?.provenance?.goldenFixtureId !==
      goldenFixture?.fixtureId ||
    evidence?.provenance?.goldenFixtureVersion !==
      goldenFixture?.fixtureVersion ||
    evidence?.provenance?.goldenPayloadHash !== goldenPayloadHash ||
    !hash64(evidence?.provenance?.submittedPayloadHash) ||
    evidence?.provenance?.submittedPayloadHash !==
      exactRoundTripHash(artifacts?.submittedPayload) ||
    !hash64(evidence?.provenance?.artifactsHash) ||
    evidence?.provenance?.artifactsHash !==
      exactRoundTripHash(artifacts)
  ) {
    issue("provenance", "골든·제출 payload·artifact hash 결속이 필요합니다.");
  }

  let submittedComparable;
  let initialComparison;
  let persistenceComparison;
  let mutation;
  let submittedCounts;
  let initialCounts;
  let finalCounts;
  try {
    submittedComparable = comparableFromProjectPayload(
      artifacts?.submittedPayload
    );
    if (
      !sameJson(
        submittedComparable,
        artifacts?.submittedComparable
      )
    ) {
      issue("artifacts.projection", "payload 비교 projection과 일치해야 합니다.");
    }
    initialComparison = compareRoundTripValues(
      submittedComparable,
      artifacts?.initialReopenedComparable
    );
    persistenceComparison = compareRoundTripValues(
      artifacts?.savedComparable,
      artifacts?.finalReopenedComparable
    );
    mutation = assertSingleFractionMovement({
      initialComparable: artifacts?.initialReopenedComparable,
      savedPayload: artifacts?.savedPayload,
      targetObjectId: evidence?.interaction?.targetObjectId
    });
    if (
      !sameJson(
        mutation.savedComparable,
        artifacts?.savedComparable
      )
    ) {
      issue(
        "artifacts.projection",
        "저장 payload의 overlay projection과 일치해야 합니다."
      );
    }
    submittedCounts = countsFor(submittedComparable.contentsJson);
    initialCounts = countsFor(
      artifacts?.initialReopenedComparable?.contentsJson
    );
    finalCounts = countsFor(
      artifacts?.finalReopenedComparable?.contentsJson
    );
  } catch (error) {
    issue("artifacts.recalculation", String(error));
  }

  if (
    initialComparison?.normalizedEqual !== true ||
    initialComparison?.unexpectedDifferenceCount !== 0 ||
    persistenceComparison?.normalizedEqual !== true ||
    persistenceComparison?.unexpectedDifferenceCount !== 0 ||
    evidence?.roundTrip?.numericTolerance !==
      ROUND_TRIP_NUMERIC_TOLERANCE ||
    !sameJson(
      evidence?.roundTrip?.initialReopen,
      comparisonProjection(initialComparison ?? {})
    ) ||
    !sameJson(
      evidence?.roundTrip?.savedReopen,
      comparisonProjection(persistenceComparison ?? {})
    )
  ) {
    issue("roundTrip", "POST→GET 및 PUT→GET 왕복 재계산 결과가 일치해야 합니다.");
  }

  const countSets = [
    submittedCounts,
    initialCounts,
    finalCounts
  ].filter(Boolean);
  if (
    countSets.length !== 3 ||
    countSets.some(
      ({ classification, counts }) =>
        classification.unclassifiedObjectCount !== 0 ||
        Object.values(counts).some(
          (count) => !Number.isInteger(count) || count <= 0
        )
    ) ||
    !sameJson(submittedCounts?.counts, initialCounts?.counts) ||
    !sameJson(submittedCounts?.counts, finalCounts?.counts)
  ) {
    issue("toolCounts", "4개 released 도구의 전체 객체가 왕복 보존되어야 합니다.");
  }

  const expectedObjectIds = [
    ...(artifacts?.finalReopenedComparable?.contentsJson ?? [])
  ]
    .map((object) => object?.id)
    .filter((id) => typeof id === "string")
    .sort();
  const goldenInstructionText = goldenPayload?.contentsJson?.find(
    (object) => object?.id === "instruction-main"
  )?.text;
  for (const stage of ["initial", "final"]) {
    const render = artifacts?.render?.[stage];
    if (
      render?.itemGroupCount !== expectedObjectIds.length ||
      render?.playgroundCount <= 0 ||
      render?.visibleSvgCount <= 0 ||
      render?.mathFieldCount !==
        (finalCounts?.counts?.["common.formula"] ?? -1) ||
      !sameJson(
        [...(render?.renderedObjectIds ?? [])].sort(),
        expectedObjectIds
      ) ||
      render?.containsProjectTitle !== true ||
      typeof goldenInstructionText !== "string" ||
      render?.containsGoldenInstruction !== true
    ) {
      issue(`render.${stage}`, "렌더 DOM과 payload 객체가 일치해야 합니다.");
    }
  }

  const toolResults = WAVE1_RELEASED_TOOL_KEYS.map((toolKey) => ({
    toolKey,
    submittedObjectCount:
      submittedCounts?.counts?.[toolKey] ?? -1,
    initialReopenedObjectCount:
      initialCounts?.counts?.[toolKey] ?? -1,
    finalReopenedObjectCount:
      finalCounts?.counts?.[toolKey] ?? -1,
    initialRenderedObjectCount:
      artifacts?.render?.initial?.renderedObjectIds?.filter((id) =>
        submittedCounts?.classification?.objectIdsByTool
          ?.get(toolKey)
          ?.includes(id)
      ).length ?? -1,
    finalRenderedObjectCount:
      artifacts?.render?.final?.renderedObjectIds?.filter((id) =>
        finalCounts?.classification?.objectIdsByTool
          ?.get(toolKey)
          ?.includes(id)
      ).length ?? -1
  }));
  if (!sameJson(evidence?.toolResults, toolResults)) {
    issue("toolResults", "artifact에서 재계산한 도구별 결과와 일치해야 합니다.");
  }
  const finalComparableHash = exactRoundTripHash(
    artifacts?.finalReopenedComparable
  );
  if (
    !sameJson(
      evidence?.claims,
      expectedClaims(toolResults, finalComparableHash)
    )
  ) {
    issue("claims", "도구별 lifecycle claim이 재계산 결과와 일치해야 합니다.");
  }

  if (
    !sameJson(evidence?.interaction?.changedObjectIds, mutation?.changedObjectIds) ||
    !sameJson(evidence?.interaction?.changedFields, mutation?.changedFields) ||
    !sameJson(evidence?.interaction?.delta, mutation?.delta) ||
    !sameJson(
      evidence?.interaction?.editorRehydration,
      mutation?.editorRehydration
    ) ||
    !sameJson(
      evidence?.interaction?.automaticSaveMetadataFields,
      mutation?.automaticSaveMetadataFields
    ) ||
    evidence?.interaction?.toolKey !== "NO03FM"
  ) {
    issue("interaction", "분수 객체 1개의 위치 변경만 허용됩니다.");
  }

  const allowedWrites = artifacts?.network?.allowedWrites ?? [];
  const blockedWrites = artifacts?.network?.blockedWrites ?? [];
  const blockedExternalWrites =
    artifacts?.network?.blockedExternalWrites ?? [];
  const unexpectedWrites = artifacts?.network?.unexpectedWrites ?? [];
  const recoveredCreation = artifacts?.network?.recoveredCreation;
  const allowedWriteDescriptors = allowedWrites.map(
    ({ method, path }) => ({ method, path })
  );
  const observedLivePost =
    allowedWrites.length === 2 &&
    sameJson(allowedWriteDescriptors, [
      { method: "POST", path: "/api/project" },
      {
        method: "PUT",
        path: WAVE1_CANARY_REDACTED_PROJECT_PATH
      }
    ]) &&
    recoveredCreation === undefined;
  const recoveredExactProject =
    allowedWrites.length === 1 &&
    sameJson(allowedWriteDescriptors, [
      {
        method: "PUT",
        path: WAVE1_CANARY_REDACTED_PROJECT_PATH
      }
    ]) &&
    sameJson(recoveredCreation, {
      method: "POST",
      path: "/api/project",
      payloadHash: exactRoundTripHash(
        artifacts?.submittedPayload
      ),
      recovery: "exact-title-and-payload-reopened",
      exactMatchCount: 1
    });
  const creationEvidenceMode = observedLivePost
    ? "observed-live-post"
    : recoveredExactProject
      ? "recovered-exact-server-project"
      : "invalid";
  const createWrite = observedLivePost
    ? allowedWrites[0]
    : recoveredCreation;
  const saveWrite = allowedWrites.at(-1);
  if (
    (!observedLivePost && !recoveredExactProject) ||
    allowedWrites.some(
      (write) =>
        !Number.isInteger(write.status) ||
        write.status < 200 ||
        write.status >= 300
    ) ||
    createWrite?.payloadHash !==
      exactRoundTripHash(artifacts?.submittedPayload) ||
    saveWrite?.payloadHash !==
      exactRoundTripHash(artifacts?.savedPayload) ||
    blockedWrites.some(
      (write) =>
        write?.method !== "POST" ||
        write?.path !==
          `${WAVE1_CANARY_REDACTED_PROJECT_PATH}/upload-image`
    ) ||
    blockedExternalWrites.some(
      (write) =>
        !["POST", "PUT", "PATCH", "DELETE"].includes(
          write?.method
        ) ||
        typeof write?.path !== "string" ||
        write.path.startsWith("https://mathcanvas.vivasam.com/")
    ) ||
    unexpectedWrites.length !== 0 ||
    !sameJson(evidence?.writeBoundary, {
      mode: "one-create-one-save",
      creationEvidenceMode,
      allowedCreateCount: 1,
      allowedSaveCount: 1,
      observedAllowedWriteCount: allowedWrites.length,
      blockedAncillaryWriteCount: blockedWrites.length,
      blockedExternalWriteCount: blockedExternalWrites.length,
      unexpectedWriteCount: 0
    })
  ) {
    issue("writeBoundary", "POST 1회와 canary PUT 1회 외에는 허용할 수 없습니다.");
  }

  const serialized = JSON.stringify({ evidence, artifacts });
  for (const forbidden of [
    "projectId",
    "jobId",
    "editorUrl",
    "accessToken",
    "Authorization",
    "owner"
  ]) {
    if (serialized.includes(forbidden)) {
      issue("redaction", `${forbidden} 필드를 포함할 수 없습니다.`);
    }
  }
  return {
    ok: issues.length === 0,
    issues
  };
}

export function buildWave1CanaryClaims(
  toolResults,
  finalComparableHash
) {
  return expectedClaims(toolResults, finalComparableHash);
}

export function projectComparison(comparison) {
  return comparisonProjection(comparison);
}

function recoveryToolResults(artifacts) {
  const submitted = countsFor(
    artifacts.submittedComparable.contentsJson
  );
  const final = countsFor(
    artifacts.finalReopenedComparable.contentsJson
  );
  return WAVE1_RELEASED_TOOL_KEYS.map((toolKey) => {
    const finalIds =
      final.classification.objectIdsByTool.get(toolKey) ?? [];
    return {
      toolKey,
      submittedObjectCount: submitted.counts[toolKey],
      finalReopenedObjectCount: final.counts[toolKey],
      finalRenderedObjectCount:
        artifacts.render.final.renderedObjectIds.filter((id) =>
          finalIds.includes(id)
        ).length
    };
  });
}

function recoveryClaims(toolResults, finalComparableHash) {
  return Object.fromEntries(
    toolResults.map((result) => [
      result.toolKey,
      {
        lifecycle: {
          finalRenderedObjectCount:
            result.finalRenderedObjectCount,
          persistedObjectCount: result.finalReopenedObjectCount
        },
        released: {
          finalComparableHash,
          persistedAfterGuardedSave: true,
          recoveryMode: true
        },
        verified: {
          finalReopenedObjectCount:
            result.finalReopenedObjectCount,
          submittedObjectCount: result.submittedObjectCount
        }
      }
    ])
  );
}

export function buildWave1CanaryRecoveryClaims(
  toolResults,
  finalComparableHash
) {
  return recoveryClaims(toolResults, finalComparableHash);
}

export function buildWave1CanaryRecoveryToolResults(artifacts) {
  return recoveryToolResults(artifacts);
}

export function validateWave1CanaryRecoveryEvidence({
  evidence,
  artifacts,
  goldenFixture
}) {
  const issues = [];
  const issue = (path, message) => issues.push({ path, message });
  if (
    evidence?.schemaVersion !== "1.0.0" ||
    evidence?.probeId !== WAVE1_CANARY_RECOVERY_PROBE_ID ||
    !isoDate(evidence?.observedAt) ||
    artifacts?.schemaVersion !== "1.0.0" ||
    artifacts?.artifactId !== WAVE1_CANARY_RECOVERY_ARTIFACT_ID ||
    artifacts?.runId !== evidence?.provenance?.runId
  ) {
    issue("identity", "recovery evidence와 artifact identity가 필요합니다.");
  }
  try {
    assertNoSensitiveData(evidence);
    assertNoSensitiveData(artifacts);
  } catch (error) {
    issue("redaction", String(error));
  }
  const goldenPayload =
    goldenFixture?.results?.compiledProject?.payload;
  const goldenPayloadHash = goldenFixture?.invariants?.payloadHash;
  try {
    validateWave1CanaryGoldenBinding({
      goldenPayload,
      expectedGoldenPayloadHash: goldenPayloadHash,
      submittedPayload: artifacts?.submittedPayload,
      runId: artifacts?.runId
    });
  } catch (error) {
    issue("goldenBinding", String(error));
  }
  if (
    evidence?.provenance?.source !==
      "current-golden-guarded-save-recovery" ||
    evidence?.provenance?.goldenFixtureId !==
      goldenFixture?.fixtureId ||
    evidence?.provenance?.goldenFixtureVersion !==
      goldenFixture?.fixtureVersion ||
    evidence?.provenance?.goldenPayloadHash !== goldenPayloadHash ||
    evidence?.provenance?.submittedPayloadHash !==
      exactRoundTripHash(artifacts?.submittedPayload) ||
    evidence?.provenance?.artifactsHash !==
      exactRoundTripHash(artifacts)
  ) {
    issue("provenance", "골든과 recovery artifact hash 결속이 필요합니다.");
  }

  let mutation;
  let persistence;
  let submittedCounts;
  let finalCounts;
  try {
    if (
      !sameJson(
        comparableFromProjectPayload(artifacts?.submittedPayload),
        artifacts?.submittedComparable
      )
    ) {
      issue("artifacts.submittedComparable", "제출 projection이 일치해야 합니다.");
    }
    mutation = assertSingleFractionMovement({
      initialComparable: artifacts?.submittedComparable,
      savedPayload: artifacts?.reconstructedSavedPayload,
      targetObjectId: evidence?.interaction?.targetObjectId
    });
    persistence = compareRoundTripValues(
      mutation.savedComparable,
      artifacts?.finalReopenedComparable
    );
    submittedCounts = countsFor(
      artifacts?.submittedComparable?.contentsJson
    );
    finalCounts = countsFor(
      artifacts?.finalReopenedComparable?.contentsJson
    );
  } catch (error) {
    issue("recalculation", String(error));
  }
  const persistenceProjection = persistence
    ? comparisonProjection(persistence)
    : undefined;
  if (
    persistence === undefined ||
    persistence?.normalizedEqual !== true ||
    persistence?.unexpectedDifferenceCount !== 0 ||
    evidence?.roundTrip?.numericTolerance !==
      ROUND_TRIP_NUMERIC_TOLERANCE ||
    !sameJson(
      evidence?.roundTrip?.reconstructionConsistency,
      {
        ...persistenceProjection,
        derivedFromFinalGet: true,
        independentlyCheckedPersistedFields: [
          "categoryId",
          "isNoteworthy",
          "isShowMenuOnActivity",
          "studyLevel"
        ]
      }
    )
  ) {
    issue(
      "roundTrip.reconstructionConsistency",
      "최종 GET 기반 재구성과 독립 확인 필드가 일치해야 합니다."
    );
  }
  if (
    submittedCounts?.classification?.unclassifiedObjectCount !== 0 ||
    finalCounts?.classification?.unclassifiedObjectCount !== 0 ||
    !sameJson(submittedCounts?.counts, finalCounts?.counts) ||
    Object.values(submittedCounts?.counts ?? {}).some(
      (count) => !Number.isInteger(count) || count <= 0
    )
  ) {
    issue("toolCounts", "released 4도구 객체가 최종 GET에 보존되어야 합니다.");
  }

  const expectedIds = (
    artifacts?.finalReopenedComparable?.contentsJson ?? []
  )
    .map((object) => object?.id)
    .filter((id) => typeof id === "string")
    .sort();
  const render = artifacts?.render?.final;
  const instructionText = goldenPayload?.contentsJson?.find(
    (object) => object?.id === "instruction-main"
  )?.text;
  if (
    render?.itemGroupCount !== expectedIds.length ||
    render?.playgroundCount <= 0 ||
    render?.visibleSvgCount <= 0 ||
    render?.mathFieldCount !==
      (finalCounts?.counts?.["common.formula"] ?? -1) ||
    !sameJson(
      [...(render?.renderedObjectIds ?? [])].sort(),
      expectedIds
    ) ||
    !sameJson(
      [...(render?.visibleObjectIds ?? [])].sort(),
      expectedIds
    ) ||
    render?.containsProjectTitle !== true ||
    typeof instructionText !== "string" ||
    render?.containsGoldenInstruction !== true
  ) {
    issue("render.final", "현재 골든의 59개 객체가 모두 보이게 렌더되어야 합니다.");
  }

  const toolResults = artifacts
    ? recoveryToolResults(artifacts)
    : [];
  if (!sameJson(evidence?.toolResults, toolResults)) {
    issue("toolResults", "최종 artifact에서 재계산한 도구 결과와 일치해야 합니다.");
  }
  const finalHash = exactRoundTripHash(
    artifacts?.finalReopenedComparable
  );
  if (
    !sameJson(
      evidence?.claims,
      recoveryClaims(toolResults, finalHash)
    )
  ) {
    issue("claims", "복구 lifecycle claim이 실제 최종 상태와 일치해야 합니다.");
  }
  if (
    mutation === undefined ||
    evidence?.interaction?.toolKey !== "NO03FM" ||
    evidence?.interaction?.clientTransformChanged !== true ||
    !sameJson(
      evidence?.interaction?.changedObjectIds,
      mutation.changedObjectIds
    ) ||
    !sameJson(
      evidence?.interaction?.changedFields,
      mutation.changedFields
    ) ||
    !sameJson(evidence?.interaction?.delta, mutation.delta) ||
    !sameJson(
      evidence?.interaction?.editorRehydration,
      mutation.editorRehydration
    ) ||
    !sameJson(
      evidence?.interaction?.automaticSaveMetadataFields,
      mutation.automaticSaveMetadataFields
    )
  ) {
    issue("interaction", "저장된 분수 이동과 editor hydration이 일치해야 합니다.");
  }

  const assertedOriginalOperations =
    artifacts?.assertedOriginalOperations ?? [];
  if (
    !sameJson(assertedOriginalOperations, [
      {
        method: "POST",
        path: "/api/project",
        payloadHash: exactRoundTripHash(
          artifacts?.submittedPayload
        ),
        recovery: "exact-title-current-golden-binding"
      },
      {
        method: "PUT",
        path: WAVE1_CANARY_REDACTED_PROJECT_PATH,
        payloadHash: exactRoundTripHash(
          artifacts?.reconstructedSavedPayload
        ),
        recovery: "guarded-save-final-reopen"
      }
    ]) ||
    artifacts?.readOnlyRecoveryBoundary
      ?.observedProductWriteCount !== 0 ||
    (artifacts?.readOnlyRecoveryBoundary?.unexpectedWrites ?? [])
      .length !== 0 ||
    !sameJson(evidence?.writeBoundary, {
      mode: "read-only-recovery-after-one-create-one-save",
      assertedOriginalCreateCount: 1,
      assertedOriginalSaveCount: 1,
      measuredRecoveryWriteCount: 0,
      originalWriteCountMeasured: false,
      originalRawWriteLogPersisted: false
    })
  ) {
    issue("writeBoundary", "복구 실행은 read-only이고 한계를 명시해야 합니다.");
  }
  if (
    evidence?.recoveryLimitation !==
    "The original 2xx PUT and request body passed the guarded route, but the raw operation log was not persisted before the render assertion failed. The saved body is reconstructed from the current UI save contract and final GET, so reconstructionConsistency is not an independent PUT-to-GET measurement and original write counts are asserted, not measured."
  ) {
    issue("recoveryLimitation", "원본 write log 미보존 한계를 정확히 밝혀야 합니다.");
  }
  const serialized = JSON.stringify({ evidence, artifacts });
  for (const forbidden of [
    "projectId",
    "jobId",
    "editorUrl",
    "accessToken",
    "Authorization",
    "owner"
  ]) {
    if (serialized.includes(forbidden)) {
      issue("redaction", `${forbidden} 필드를 포함할 수 없습니다.`);
    }
  }
  return { ok: issues.length === 0, issues };
}

export function validateWave2CanaryEvidence({
  evidence,
  artifacts,
  createCheckpoint,
  goldenFixture
}) {
  const issues = [];
  const issue = (path, message) => issues.push({ path, message });
  const runId = evidence?.provenance?.runId;
  if (
    evidence?.schemaVersion !== "1.0.0" ||
    evidence?.probeId !== WAVE2_CANARY_PROBE_ID ||
    !isoDate(evidence?.observedAt) ||
    artifacts?.schemaVersion !== "1.0.0" ||
    artifacts?.artifactId !== WAVE2_CANARY_ARTIFACT_ID ||
    artifacts?.runId !== runId
  ) {
    issue("identity", "Wave 2 evidence와 artifact identity가 일치해야 합니다.");
  }
  try {
    assertNoSensitiveData(evidence);
    assertNoSensitiveData(artifacts);
    assertNoSensitiveData(createCheckpoint);
  } catch (error) {
    issue("redaction", String(error));
  }

  const goldenPayload =
    goldenFixture?.results?.compiledProject?.payload;
  const goldenPayloadHash = goldenFixture?.invariants?.payloadHash;
  try {
    validateCanaryGoldenBinding({
      goldenPayload,
      expectedGoldenPayloadHash: goldenPayloadHash,
      submittedPayload: artifacts?.submittedPayload,
      runId,
      titlePrefix: WAVE2_CANARY_TITLE_PREFIX
    });
  } catch (error) {
    issue("goldenBinding", String(error));
  }
  if (
    evidence?.provenance?.source !==
      "approved-new-canary-ui-draw" ||
    evidence?.provenance?.goldenFixtureId !==
      goldenFixture?.fixtureId ||
    evidence?.provenance?.goldenPayloadHash !== goldenPayloadHash ||
    !hash64(evidence?.provenance?.submittedPayloadHash) ||
    evidence?.provenance?.submittedPayloadHash !==
      exactRoundTripHash(artifacts?.submittedPayload) ||
    !hash64(evidence?.provenance?.createCheckpointHash) ||
    evidence?.provenance?.createCheckpointHash !==
      exactRoundTripHash(createCheckpoint) ||
    !hash64(evidence?.provenance?.artifactsHash) ||
    evidence?.provenance?.artifactsHash !==
      exactRoundTripHash(artifacts)
  ) {
    issue("provenance", "Wave 2 evidence는 골든과 artifact hash에 결속되어야 합니다.");
  }

  const checkpointWrite =
    createCheckpoint?.network?.allowedWrites?.[0];
  if (
    createCheckpoint?.schemaVersion !== "1.0.0" ||
    createCheckpoint?.checkpointId !==
      WAVE2_CANARY_CREATE_CHECKPOINT_ID ||
    createCheckpoint?.runId !== runId ||
    !isoDate(createCheckpoint?.observedAt) ||
    createCheckpoint?.phase !==
      "create-response-captured-before-ui-draw" ||
    createCheckpoint?.provenance?.submittedPayloadHash !==
      exactRoundTripHash(artifacts?.submittedPayload) ||
    createCheckpoint?.network?.allowedWrites?.length !== 1 ||
    checkpointWrite?.method !== "POST" ||
    checkpointWrite?.path !== "/api/project" ||
    !Number.isInteger(checkpointWrite?.status) ||
    checkpointWrite.status < 200 ||
    checkpointWrite.status >= 300 ||
    checkpointWrite?.payloadHash !==
      exactRoundTripHash(artifacts?.submittedPayload)
  ) {
    issue(
      "creationCheckpoint",
      "재개된 Wave 2의 원래 POST 1회가 2xx checkpoint와 결속되어야 합니다."
    );
  }

  let submittedComparable;
  let initialComparison;
  let persistenceComparison;
  let mutation;
  try {
    submittedComparable = comparableFromProjectPayload(
      artifacts?.submittedPayload
    );
    initialComparison = compareRoundTripValues(
      submittedComparable,
      artifacts?.initialReopenedComparable
    );
    mutation = assertSavedPayloadDelta({
      initialComparable: artifacts?.initialReopenedComparable,
      savedPayload: artifacts?.savedPayload,
      newObjectIds: artifacts?.interaction?.newObjectIds,
      movedObjectId: artifacts?.interaction?.movedObjectId,
      minimumNewObjectCount: 1,
      maximumNewObjectCount: 4
    });
    persistenceComparison = compareRoundTripValues(
      mutation.savedComparable,
      artifacts?.finalReopenedComparable
    );
    if (
      !sameJson(
        submittedComparable,
        artifacts?.submittedComparable
      ) ||
      !sameJson(
        mutation.savedComparable,
        artifacts?.savedComparable
      ) ||
      !sameJson(
        mutation.editorHydration,
        artifacts?.discovery?.editorHydration
      ) ||
      !sameJson(
        mutation.derivedModuleIndexTags,
        artifacts?.discovery?.derivedModuleIndexTags
      )
    ) {
      issue("artifacts.projection", "Wave 2 payload projection이 재계산 결과와 달라졌습니다.");
    }
  } catch (error) {
    issue("artifacts.recalculation", String(error));
  }
  if (
    initialComparison?.normalizedEqual !== true ||
    initialComparison?.unexpectedDifferenceCount !== 0 ||
    persistenceComparison?.normalizedEqual !== true ||
    persistenceComparison?.unexpectedDifferenceCount !== 0 ||
    !sameJson(evidence?.roundTrip, {
      initialReopen: {
        normalizedEqual: true,
        unexpectedDifferenceCount: 0
      },
      savedReopen: {
        normalizedEqual: true,
        unexpectedDifferenceCount: 0
      }
    })
  ) {
    issue("roundTrip", "Wave 2 POST→GET과 PUT→GET은 예상 밖 차이가 없어야 합니다.");
  }

  const expectedFieldTypes = Object.fromEntries(
    [
      [
        [
          "_x",
          "_y",
          "clickCount",
          "curveOffset",
          "cx",
          "cy",
          "fillOpacity",
          "initSizeScale",
          "playgroundIndex",
          "radius",
          "rotate",
          "rx",
          "ry",
          "scale",
          "sizeScale",
          "strokeOpacity",
          "strokeType",
          "strokeWidth",
          "x",
          "y"
        ],
        "number"
      ],
      [
        [
          "elemSplice",
          "isBluePrint",
          "isCenterGravityPolygon",
          "isColorInverted",
          "isEyeOn",
          "isFillChange",
          "isGroup",
          "isGroupElement",
          "isGroupGridOn",
          "isHorizontalFlip",
          "isMerge",
          "isMoveRotateHandler",
          "isSplit",
          "isStackUp",
          "isStrokeChange",
          "isSurroundRect",
          "isTextEdit",
          "isTextEditFontSize",
          "isVerticalFlip"
        ],
        "boolean"
      ],
      [
        [
          "fill",
          "groupId",
          "id",
          "stroke",
          "strokeDashArray",
          "svgId",
          "type"
        ],
        "string"
      ],
      [["coordinates", "point1", "point2"], "array"],
      [["parent"], "object"]
    ].flatMap(([fields, type]) =>
      fields.map((field) => [field, type])
    )
  );
  const expectedFieldNames =
    Object.keys(expectedFieldTypes).sort();
  const roleByType = {
    dot: "point-click",
    line: "point-line-drag",
    circle: "circle-drag"
  };
  const initialIds = new Set(
    (artifacts?.initialReopenedComparable?.contentsJson ?? []).map(
      (object) => object?.id
    )
  );
  const newObjects =
    artifacts?.finalReopenedComparable?.contentsJson?.filter(
      (object) => !initialIds.has(object?.id)
    ) ?? [];
  const expectedParent = {
    curveMaxOffset: 140,
    defaultX: null,
    defaultY: null,
    endX: null,
    endY: null,
    isCircle1: false,
    isCircle2: false,
    isCurveHandler: false,
    isRadiusHandler: false,
    r: null
  };
  const finitePair = (value) =>
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(
      (entry) => typeof entry === "number" && Number.isFinite(entry)
    );
  const objectInvariantHolds = (object) => {
    const type = object?.type;
    return (
      object?.svgId === "drawElem" &&
      Object.hasOwn(roleByType, type) &&
      sameJson(Object.keys(object).sort(), expectedFieldNames) &&
      sameJson(wireSummary(object).fieldTypes, expectedFieldTypes) &&
      ["_x", "_y", "x", "y", "cx", "cy", "radius", "curveOffset", "rx", "ry", "rotate"]
        .every((field) => object[field] === 0) &&
      ["scale", "sizeScale", "initSizeScale", "clickCount", "playgroundIndex"]
        .every((field) => object[field] === 1) &&
      object.groupId === "" &&
      object.isBluePrint === false &&
      object.isEyeOn === false &&
      object.isMoveRotateHandler === false &&
      sameJson(object.parent, expectedParent) &&
      finitePair(object.point1) &&
      finitePair(object.point2) &&
      sameJson(object.coordinates, [
        object.point1,
        object.point2
      ]) &&
      (type === "dot"
        ? sameJson(object.point2, [0, 0])
        : !sameJson(object.point1, object.point2))
    );
  };
  const expectedWireObservations = newObjects.map((object) => ({
    interactionRole: roleByType[object.type],
    ...wireSummary(object)
  }));
  if (
    newObjects.length !== 3 ||
    new Set(newObjects.map((object) => object.type)).size !== 3 ||
    newObjects.some((object) => !objectInvariantHolds(object)) ||
    !sameJson(
      artifacts?.discovery?.wireObservations,
      expectedWireObservations
    ) ||
    !sameJson(
      evidence?.discovery?.wireObservations,
      expectedWireObservations
    ) ||
    evidence?.discovery?.initialObjectCount !== 59 ||
    evidence?.discovery?.finalObjectCount !== 62 ||
    !sameJson(
      evidence?.discovery?.derivedModuleIndexTags,
      artifacts?.discovery?.derivedModuleIndexTags
    )
  ) {
    issue("wireContract", "dot, line, circle의 관찰 wire 계약이 일치해야 합니다.");
  }

  const initialObjectIds =
    artifacts?.initialReopenedComparable?.contentsJson?.map(
      (object) => object.id
    ) ?? [];
  const finalObjectIds =
    artifacts?.finalReopenedComparable?.contentsJson?.map(
      (object) => object.id
    ) ?? [];
  const newObjectIds =
    artifacts?.interaction?.newObjectIds ?? [];
  for (const [stage, expectedIds] of [
    ["initial", initialObjectIds],
    ["afterDraw", finalObjectIds],
    ["final", finalObjectIds]
  ]) {
    const render = artifacts?.render?.[stage];
    if (
      render?.itemGroupCount !== expectedIds.length ||
      render?.playgroundCount <= 0 ||
      !sameJson(
        [...(render?.renderedObjectIds ?? [])].sort(),
        [...expectedIds].sort()
      ) ||
      !sameJson(
        [...(render?.renderedNewObjectIds ?? [])].sort(),
        stage === "initial" ? [] : [...newObjectIds].sort()
      )
    ) {
      issue(`render.${stage}`, "렌더 객체 ID가 저장 payload와 일치해야 합니다.");
    }
  }

  const movedObjectId = artifacts?.interaction?.movedObjectId;
  const displacement =
    artifacts?.interaction?.centerDisplacementByObjectId ?? {};
  const movedObject = newObjects.find(
    (object) => object.id === movedObjectId
  );
  if (
    movedObject?.type !== "circle" ||
    !sameJson(artifacts?.interaction?.movedRenderObjectIds, [
      movedObjectId
    ]) ||
    (artifacts?.interaction?.changedTransformObjectIds ?? [])
      .length !== 0 ||
    !Number.isFinite(displacement[movedObjectId]) ||
    displacement[movedObjectId] <= 4 ||
    newObjectIds.some(
      (objectId) =>
        objectId !== movedObjectId &&
        (!Number.isFinite(displacement[objectId]) ||
          displacement[objectId] > 1)
    ) ||
    !sameJson(evidence?.interaction, {
      toolbarActivations:
        artifacts?.interaction?.toolbarActivations,
      movedObjectId,
      changedTransformObjectIds: [],
      centerDisplacementByObjectId: displacement,
      movedRenderObjectIds: [movedObjectId]
    }) ||
    !sameJson(
      artifacts?.interaction?.toolbarActivations?.map(
        ({ ok, requestedTool, matchedLabel }) => ({
          ok,
          requestedTool,
          matchedLabel
        })
      ),
      [
        {
          ok: true,
          requestedTool: "point-line",
          matchedLabel: "점 / 선 (L)"
        },
        {
          ok: true,
          requestedTool: "point-line",
          matchedLabel: "점 / 선 (L)"
        },
        {
          ok: true,
          requestedTool: "circle",
          matchedLabel: "원 (O)"
        },
        {
          ok: true,
          requestedTool: "select",
          matchedLabel: "선택 (V)"
        }
      ]
    )
  ) {
    issue("interaction", "circle 하나만 화면에서 이동해야 합니다.");
  }

  const allowedWrites = artifacts?.network?.allowedWrites ?? [];
  const blockedWrites = artifacts?.network?.blockedWrites ?? [];
  const blockedExternalWrites =
    artifacts?.network?.blockedExternalWrites ?? [];
  const blockedExistingProjectReads =
    artifacts?.network?.blockedExistingProjectReads ?? [];
  const recoveredCreation = artifacts?.network?.recoveredCreation;
  const externalWriteIsBlocked = (write) => {
    try {
      return (
        ["POST", "PUT", "PATCH", "DELETE"].includes(write?.method) &&
        new URL(write?.path).origin !==
          "https://mathcanvas.vivasam.com"
      );
    } catch {
      return false;
    }
  };
  if (
    allowedWrites.length !== 1 ||
    allowedWrites[0]?.method !== "PUT" ||
    allowedWrites[0]?.path !== WAVE1_CANARY_REDACTED_PROJECT_PATH ||
    allowedWrites[0]?.status < 200 ||
    allowedWrites[0]?.status >= 300 ||
    allowedWrites[0]?.payloadHash !==
      exactRoundTripHash(artifacts?.savedPayload) ||
    !sameJson(recoveredCreation, {
      method: "POST",
      path: "/api/project",
      payloadHash: exactRoundTripHash(
        artifacts?.submittedPayload
      ),
      recovery: "private-state-exact-canary"
    }) ||
    blockedWrites.some(
      (write) =>
        write?.method !== "POST" ||
        write?.path !==
          `${WAVE1_CANARY_REDACTED_PROJECT_PATH}/upload-image`
    ) ||
    blockedExternalWrites.some(
      (write) => !externalWriteIsBlocked(write)
    ) ||
    blockedExistingProjectReads.length !== 0 ||
    !sameJson(evidence?.writeBoundary, {
      mode: "one-create-one-save",
      creationEvidenceMode: "recovered-private-state",
      allowedCreateCount: 1,
      allowedSaveCount: 1,
      observedAllowedWriteCount: 1,
      blockedWriteCount: blockedWrites.length,
      blockedExternalWriteCount: blockedExternalWrites.length,
      existingTeacherProjectReadCount: 0
    })
  ) {
    issue("writeBoundary", "동일 canary PUT 1회 외 write는 허용할 수 없습니다.");
  }

  const serialized = JSON.stringify({ evidence, artifacts });
  for (const forbidden of [
    "projectId",
    "jobId",
    "editorUrl",
    "accessToken",
    "Authorization",
    "owner"
  ]) {
    if (serialized.includes(forbidden)) {
      issue("redaction", `${forbidden} 필드를 포함할 수 없습니다.`);
    }
  }
  return { ok: issues.length === 0, issues };
}
