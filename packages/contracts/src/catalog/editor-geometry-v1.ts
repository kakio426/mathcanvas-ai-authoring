import { z } from "zod";
import { canonicalJson, sha256Hex } from "../hash.js";
import { stableIdSchema } from "../vocabulary/ids.js";

export const EDITOR_GEOMETRY_EVIDENCE_SCHEMA_VERSION = "1.0.0" as const;
export const STUDENT_ONE_SCREEN_GEOMETRY_PROFILE_VERSION = "1.0.0" as const;
export const EDITOR_GEOMETRY_GUARD_CSS_PX = 8 as const;
export const EDITOR_GEOMETRY_TOLERANCE_CSS_PX = 0.01 as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const prefixedSha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

const boundsSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().positive(),
    height: z.number().finite().positive()
  })
  .strict();

const viewportScreenBoundsSchema = z
  .object({
    x: z.literal(0),
    y: z.literal(0),
    width: z.literal(1280),
    height: z.literal(800)
  })
  .strict();

const matrixSchema = z
  .object({
    a: z.number().finite(),
    b: z.number().finite(),
    c: z.number().finite(),
    d: z.number().finite(),
    e: z.number().finite(),
    f: z.number().finite()
  })
  .strict();

type Bounds = z.infer<typeof boundsSchema>;
type Matrix = z.infer<typeof matrixSchema>;

const fixedChromeSchema = z
  .object({
    top: z
      .object({
        selector: z.literal("#top-toolbar"),
        bounds: boundsSchema
      })
      .strict(),
    left: z
      .object({
        selector: z.literal("#left-toolbar"),
        bounds: boundsSchema
      })
      .strict(),
    right: z
      .object({
        selector: z.literal("#right-toolbar"),
        bounds: boundsSchema
      })
      .strict(),
    bottom: z
      .object({
        selector: z.literal("#bottom-common-toolbar"),
        bounds: boundsSchema
      })
      .strict()
  })
  .strict();

const dynamicChromeBoxSchema = z
  .object({
    role: z.literal("selection-context-toolbar"),
    signature: z
      .object({
        strategy: z.literal("visible-dark-toolbar-outside-fixed-chrome-v1"),
        tag: z.literal("div"),
        backgroundColor: z.string().regex(/^rgba?\(/),
        backgroundAlpha: z.number().finite().min(0.75).max(1),
        perceivedLuminance: z.number().finite().min(0).max(125),
        controlCount: z.number().int().min(3).max(100)
      })
      .strict(),
    bounds: boundsSchema
  })
  .strict();

const calibrationSchema = z
  .object({
    referenceSelector: z.literal("#division-remainder-1-choice-panel"),
    canvasBox: boundsSchema,
    projectedCssBox: boundsSchema,
    renderedBorderBox: boundsSchema,
    inflationCssPx: z
      .object({
        left: z.number().finite(),
        top: z.number().finite(),
        right: z.number().finite(),
        bottom: z.number().finite()
      })
      .strict(),
    effectiveScaleX: z.number().finite().positive(),
    effectiveScaleY: z.number().finite().positive(),
    deltaFromCoordinateScaleX: z.number().finite(),
    deltaFromCoordinateScaleY: z.number().finite(),
    usage: z.literal("diagnostic-only-not-coordinate-conversion")
  })
  .strict();

const geometrySampleSchema = z
  .object({
    viewport: z
      .object({
        width: z.literal(1280),
        height: z.literal(800),
        devicePixelRatio: z.literal(1)
      })
      .strict(),
    editorState: z
      .object({
        surfaceMode: z.literal("authoring-editor"),
        sidebarState: z.literal("expanded"),
        leftToolbarFolded: z.literal(false),
        topToolbarVisible: z.literal(true),
        fullScreen: z.literal(false),
        storeScale: z.literal(5),
        zoomObservation: z.literal("fit-compatible-geometry-observed"),
        selectedCount: z.number().int().min(0).max(1000),
        storeViewBox: z.array(z.number().finite()).length(4)
      })
      .strict(),
    canvas: z
      .object({
        selector: z.literal("svg#outermost"),
        screenBounds: viewportScreenBoundsSchema,
        viewBox: boundsSchema,
        preserveAspectRatio: z.literal("none"),
        ctm: matrixSchema,
        inverse: matrixSchema,
        determinant: z.number().finite().positive(),
        scaleX: z.number().finite().positive(),
        scaleY: z.number().finite().positive(),
        skewRotationResidual: z.number().finite().min(0),
        cornerResidualCssPx: z.number().finite().min(0)
      })
      .strict(),
    fixedChrome: fixedChromeSchema,
    dynamicChrome: z
      .object({
        state: z.enum(["initial", "selected"]),
        deduplicatedCandidateCount: z.number().int().min(0).max(1),
        chosenSignatureSha256: sha256Schema.nullable(),
        boxes: z.array(dynamicChromeBoxSchema).max(1)
      })
      .strict(),
    calibration: calibrationSchema
  })
  .strict();

const assetRecordSchema = z
  .object({
    bytes: z.number().int().positive(),
    path: z.string().regex(/^\/assets\/.+\.(?:css|m?js)$/i),
    sha256: sha256Schema
  })
  .strict();

function approximate(left: number, right: number, tolerance = 1e-6): boolean {
  return Math.abs(left - right) <= tolerance;
}

function determinant(matrix: Matrix): number {
  return matrix.a * matrix.d - matrix.b * matrix.c;
}

function inverseMatrix(matrix: Matrix): Matrix {
  const value = determinant(matrix);
  if (!Number.isFinite(value) || Math.abs(value) < 1e-12) {
    throw new Error("editor-geometry-singular-ctm");
  }
  return {
    a: matrix.d / value,
    b: -matrix.b / value,
    c: -matrix.c / value,
    d: matrix.a / value,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) / value,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) / value
  };
}

function transformPoint(matrix: Matrix, point: { x: number; y: number }) {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f
  };
}

function transformBounds(matrix: Matrix, bounds: Bounds): Bounds {
  const points = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
  ].map((point) => transformPoint(matrix, point));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

function cornerResidualCssPx(
  matrix: Matrix,
  viewBox: Bounds,
  screenBounds: Bounds
): number {
  const projected = [
    transformPoint(matrix, { x: viewBox.x, y: viewBox.y }),
    transformPoint(matrix, {
      x: viewBox.x + viewBox.width,
      y: viewBox.y
    }),
    transformPoint(matrix, {
      x: viewBox.x,
      y: viewBox.y + viewBox.height
    }),
    transformPoint(matrix, {
      x: viewBox.x + viewBox.width,
      y: viewBox.y + viewBox.height
    })
  ];
  const expected = [
    { x: screenBounds.x, y: screenBounds.y },
    {
      x: screenBounds.x + screenBounds.width,
      y: screenBounds.y
    },
    {
      x: screenBounds.x,
      y: screenBounds.y + screenBounds.height
    },
    {
      x: screenBounds.x + screenBounds.width,
      y: screenBounds.y + screenBounds.height
    }
  ];
  return Math.max(
    ...projected.map((point, index) =>
      Math.hypot(
        point.x - expected[index]!.x,
        point.y - expected[index]!.y
      )
    )
  );
}

function parseCssColor(value: string): {
  alpha: number;
  perceivedLuminance: number;
} | null {
  const match = value.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)$/
  );
  if (!match) return null;
  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (
    ![red, green, blue, alpha].every(Number.isFinite) ||
    Math.min(red, green, blue) < 0 ||
    Math.max(red, green, blue) > 255 ||
    alpha < 0 ||
    alpha > 1
  ) {
    return null;
  }
  return {
    alpha,
    perceivedLuminance: red * 0.2126 + green * 0.7152 + blue * 0.0722
  };
}

function boundsApproximatelyEqual(
  left: Bounds,
  right: Bounds,
  tolerance: number = EDITOR_GEOMETRY_TOLERANCE_CSS_PX
): boolean {
  return (
    approximate(left.x, right.x, tolerance) &&
    approximate(left.y, right.y, tolerance) &&
    approximate(left.width, right.width, tolerance) &&
    approximate(left.height, right.height, tolerance)
  );
}

function matrixApproximatelyEqual(
  left: Matrix,
  right: Matrix,
  tolerance: number = EDITOR_GEOMETRY_TOLERANCE_CSS_PX
): boolean {
  return (["a", "b", "c", "d", "e", "f"] as const).every((key) =>
    approximate(left[key], right[key], tolerance)
  );
}

function maxNumericDrift(left: unknown, right: unknown): number {
  if (typeof left === "number" && typeof right === "number") {
    return Math.abs(left - right);
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return Number.POSITIVE_INFINITY;
    return left.reduce(
      (maximum, child, index) =>
        Math.max(maximum, maxNumericDrift(child, right[index])),
      0
    );
  }
  if (
    left !== null &&
    right !== null &&
    typeof left === "object" &&
    typeof right === "object"
  ) {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord).sort();
    const rightKeys = Object.keys(rightRecord).sort();
    if (canonicalJson(leftKeys) !== canonicalJson(rightKeys)) {
      return Number.POSITIVE_INFINITY;
    }
    return leftKeys.reduce(
      (maximum, key) =>
        Math.max(
          maximum,
          maxNumericDrift(leftRecord[key], rightRecord[key])
        ),
      0
    );
  }
  return left === right ? 0 : Number.POSITIVE_INFINITY;
}

function staticSampleProjection(
  sample: z.infer<typeof geometrySampleSchema>
) {
  const { selectedCount: _selectedCount, ...editorState } = sample.editorState;
  return {
    viewport: sample.viewport,
    editorState,
    canvas: sample.canvas,
    fixedChrome: sample.fixedChrome,
    calibration: sample.calibration
  };
}

function intersects(left: Bounds, right: Bounds): boolean {
  return (
    left.x + left.width > right.x &&
    left.x < right.x + right.width &&
    left.y + left.height > right.y &&
    left.y < right.y + right.height
  );
}

function isWithin(left: Bounds, right: Bounds): boolean {
  return (
    left.x >= right.x &&
    left.y >= right.y &&
    left.x + left.width <= right.x + right.width &&
    left.y + left.height <= right.y + right.height
  );
}

function inflate(bounds: Bounds, amount: number): Bounds {
  return {
    x: bounds.x - amount,
    y: bounds.y - amount,
    width: bounds.width + amount * 2,
    height: bounds.height + amount * 2
  };
}

function expectedSafeRects(
  initial: z.infer<typeof geometrySampleSchema>,
  selected: z.infer<typeof geometrySampleSchema>,
  guard: number
) {
  const fixed = initial.fixedChrome;
  const fixedSafeCss: Bounds = {
    x: fixed.left.bounds.x + fixed.left.bounds.width + guard,
    y: fixed.top.bounds.y + fixed.top.bounds.height + guard,
    width:
      fixed.right.bounds.x - guard -
      (fixed.left.bounds.x + fixed.left.bounds.width + guard),
    height:
      fixed.bottom.bounds.y - guard -
      (fixed.top.bounds.y + fixed.top.bounds.height + guard)
  };
  const dynamicTop = Math.min(
    ...selected.dynamicChrome.boxes.map((entry) => entry.bounds.y)
  );
  const referenceInteractionSafeCss: Bounds = {
    ...fixedSafeCss,
    height:
      Math.min(fixed.bottom.bounds.y - guard, dynamicTop - guard) -
      fixedSafeCss.y
  };
  const inverse = inverseMatrix(initial.canvas.ctm);
  return {
    fixedSafeCss,
    referenceInteractionSafeCss,
    fixedSafeCanvas: transformBounds(inverse, fixedSafeCss),
    referenceInteractionSafeCanvas: transformBounds(
      inverse,
      referenceInteractionSafeCss
    )
  };
}

function addIssue(
  context: z.RefinementCtx,
  path: Array<string | number>,
  message: string
) {
  context.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

function validateSample(
  sample: z.infer<typeof geometrySampleSchema>,
  context: z.RefinementCtx,
  path: Array<string | number>
) {
  const matrix = sample.canvas.ctm;
  const expectedDeterminant = determinant(matrix);
  if (
    expectedDeterminant <= 0 ||
    !approximate(sample.canvas.determinant, expectedDeterminant, 1e-6)
  ) {
    addIssue(context, [...path, "canvas", "determinant"], "CTM determinant가 정확히 결속되어야 합니다.");
  }
  let expectedInverse: Matrix | null = null;
  try {
    expectedInverse = inverseMatrix(matrix);
  } catch {
    addIssue(context, [...path, "canvas", "ctm"], "CTM은 역행렬을 가져야 합니다.");
  }
  if (
    expectedInverse &&
    !matrixApproximatelyEqual(sample.canvas.inverse, expectedInverse, 1e-5)
  ) {
    addIssue(context, [...path, "canvas", "inverse"], "inverse CTM이 실제 CTM과 다릅니다.");
  }
  const scaleX = Math.hypot(matrix.a, matrix.b);
  const scaleY = Math.hypot(matrix.c, matrix.d);
  if (
    !approximate(sample.canvas.scaleX, scaleX, 1e-8) ||
    !approximate(sample.canvas.scaleY, scaleY, 1e-8) ||
    Math.abs(scaleX - scaleY) > 1e-6 ||
    sample.canvas.skewRotationResidual > 1e-6
  ) {
    addIssue(context, [...path, "canvas"], "initial-fit 좌표 변환은 X/Y scale과 skew residual에 결속되어야 합니다.");
  }
  const widthRatio =
    sample.canvas.screenBounds.width / sample.canvas.viewBox.width;
  const heightRatio =
    sample.canvas.screenBounds.height / sample.canvas.viewBox.height;
  const actualCornerResidual = cornerResidualCssPx(
    matrix,
    sample.canvas.viewBox,
    sample.canvas.screenBounds
  );
  const projectedCanvasBounds = transformBounds(
    matrix,
    sample.canvas.viewBox
  );
  if (
    !approximate(widthRatio, scaleX, 1e-6) ||
    !approximate(heightRatio, scaleY, 1e-6) ||
    !boundsApproximatelyEqual(
      projectedCanvasBounds,
      sample.canvas.screenBounds
    ) ||
    !approximate(
      sample.canvas.cornerResidualCssPx,
      actualCornerResidual,
      0.00001
    ) ||
    actualCornerResidual > EDITOR_GEOMETRY_TOLERANCE_CSS_PX ||
    sample.canvas.cornerResidualCssPx > EDITOR_GEOMETRY_TOLERANCE_CSS_PX
  ) {
    addIssue(context, [...path, "canvas", "cornerResidualCssPx"], "viewBox 모서리와 화면 모서리가 fit 변환으로 일치해야 합니다.");
  }
  const storeViewBox = sample.editorState.storeViewBox;
  const actualViewBox = [
    sample.canvas.viewBox.x,
    sample.canvas.viewBox.y,
    sample.canvas.viewBox.width,
    sample.canvas.viewBox.height
  ];
  if (
    storeViewBox.some(
      (value, index) =>
        !approximate(value, actualViewBox[index] ?? Number.NaN, 0.001)
    )
  ) {
    addIssue(context, [...path, "editorState", "storeViewBox"], "store/UI viewBox와 SVG viewBox가 일치해야 합니다.");
  }
  const projected = transformBounds(
    matrix,
    sample.calibration.canvasBox
  );
  if (
    !boundsApproximatelyEqual(
      projected,
      sample.calibration.projectedCssBox,
      0.001
    )
  ) {
    addIssue(context, [...path, "calibration", "projectedCssBox"], "calibration projected box는 CTM에서 파생되어야 합니다.");
  }
  const effectiveScaleX =
    sample.calibration.renderedBorderBox.width /
    sample.calibration.canvasBox.width;
  const effectiveScaleY =
    sample.calibration.renderedBorderBox.height /
    sample.calibration.canvasBox.height;
  if (
    !approximate(sample.calibration.effectiveScaleX, effectiveScaleX, 1e-8) ||
    !approximate(sample.calibration.effectiveScaleY, effectiveScaleY, 1e-8) ||
    !approximate(
      sample.calibration.deltaFromCoordinateScaleX,
      effectiveScaleX - scaleX,
      1e-8
    ) ||
    !approximate(
      sample.calibration.deltaFromCoordinateScaleY,
      effectiveScaleY - scaleY,
      1e-8
    )
  ) {
    addIssue(context, [...path, "calibration"], "rendered effective scale은 diagnostic으로만 정확히 파생되어야 합니다.");
  }
  const expectedInflation = {
    left:
      sample.calibration.projectedCssBox.x -
      sample.calibration.renderedBorderBox.x,
    top:
      sample.calibration.projectedCssBox.y -
      sample.calibration.renderedBorderBox.y,
    right:
      sample.calibration.renderedBorderBox.x +
      sample.calibration.renderedBorderBox.width -
      (sample.calibration.projectedCssBox.x +
        sample.calibration.projectedCssBox.width),
    bottom:
      sample.calibration.renderedBorderBox.y +
      sample.calibration.renderedBorderBox.height -
      (sample.calibration.projectedCssBox.y +
        sample.calibration.projectedCssBox.height)
  };
  if (
    !(Object.keys(expectedInflation) as Array<keyof typeof expectedInflation>).every(
      (key) =>
        approximate(
          sample.calibration.inflationCssPx[key],
          expectedInflation[key],
          0.00001
        )
    )
  ) {
    addIssue(context, [...path, "calibration", "inflationCssPx"], "inflation LTRB는 projected/rendered bounds에서 파생되어야 합니다.");
  }
}

export const editorGeometryEvidenceSchema = z
  .object({
    schemaVersion: z.literal(EDITOR_GEOMETRY_EVIDENCE_SCHEMA_VERSION),
    evidenceId: stableIdSchema,
    observedAt: z.string().datetime(),
    provenance: z
      .object({
        sourceKind: z.literal("dedicated-editor-geometry"),
        rawSha256: sha256Schema,
        initialScreenshotSha256: sha256Schema,
        selectedScreenshotSha256: sha256Schema,
        sanitizedPath: z.literal("/ko/view/<redacted-project>"),
        rawCommitted: z.literal(false),
        harnessVersion: z.literal("editor-geometry-probe:v1"),
        browserFingerprint: prefixedSha256Schema,
        assetFingerprint: z
          .object({
            records: z.array(assetRecordSchema).min(1).max(24),
            aggregateSha256: sha256Schema
          })
          .strict()
      })
      .strict(),
    environment: z
      .object({
        viewport: z.literal("1280x800"),
        devicePixelRatio: z.literal(1),
        surfaceMode: z.literal("authoring-editor"),
        sidebarState: z.literal("expanded"),
        zoomObservation: z.literal("fit-compatible-geometry-observed"),
        pan: z
          .object({ x: z.number().finite(), y: z.number().finite() })
          .strict(),
        userChromeTouched: z.literal(false),
        writePolicy: z.literal("GET-only-with-exact-aborted-telemetry")
      })
      .strict(),
    interactionReference: z
      .object({
        coverage: z.literal("single-reference-diagnostic"),
        activityId: z.literal(
          "number.division.quotient-remainder.claim-evidence-v1"
        ),
        affordanceFamilyId: z.literal("native-counting-model-v1"),
        toolKey: z.literal("NO01SC"),
        variantId: z.literal("NO01SC-01"),
        targetSelector: z.literal(
          "#division-remainder-1-counting-model-pool-unit-01"
        ),
        targetRole: z.literal("counting-model-source-unit"),
        observedSelectedCount: z.literal(7),
        genericResolverInputAllowed: z.literal(false)
      })
      .strict(),
    networkAudit: z
      .object({
        projectSource: z
          .object({
            target: z.literal("/api/project/<redacted-project>"),
            responseStatuses: z.array(z.literal(200)).min(1).max(12)
          })
          .strict(),
        blockedRequestCount: z.literal(0),
        suppressedTelemetry: z
          .object({
            method: z.literal("POST"),
            origin: z.literal("https://lc.getunicorn.org"),
            target: z.literal("/l"),
            count: z.literal(1),
            delivered: z.literal(false)
          })
          .strict()
      })
      .strict(),
    stability: z
      .object({
        sampleCountPerState: z.literal(2),
        toleranceCssPx: z.literal(EDITOR_GEOMETRY_TOLERANCE_CSS_PX),
        initialMaxDrift: z.number().finite().min(0),
        selectedMaxDrift: z.number().finite().min(0),
        initialFirst: geometrySampleSchema,
        initialSecond: geometrySampleSchema,
        selectedFirst: geometrySampleSchema,
        selectedSecond: geometrySampleSchema
      })
      .strict(),
    derived: z
      .object({
        guardCssPx: z.literal(EDITOR_GEOMETRY_GUARD_CSS_PX),
        derivation: z.literal(
          "fixed-edge-constraints-plus-single-reference-dynamic-diagnostic"
        ),
        fixedSafeCss: boundsSchema,
        fixedSafeCanvas: boundsSchema,
        singleReferenceInteractionDiagnostic: z
          .object({
            coverage: z.literal("single-reference-diagnostic"),
            usableAsGenericResolverInput: z.literal(false),
            interactionSafeCss: boundsSchema,
            interactionSafeCanvas: boundsSchema
          })
          .strict()
      })
      .strict(),
    eligibility: z
      .object({
        fixedGeometryInputReady: z.literal(true),
        interactionGeometryInputReady: z.literal(false),
        blockers: z.tuple([
          z.literal("affordance-family-dynamic-chrome-coverage-pending")
        ]),
        note: z.string().min(1).max(300)
      })
      .strict(),
    limitations: z.array(z.string().min(1).max(500)).min(2).max(8)
  })
  .strict()
  .superRefine((value, context) => {
    const records = value.provenance.assetFingerprint.records;
    const recordPaths = records.map((record) => record.path);
    if (
      new Set(recordPaths).size !== recordPaths.length ||
      recordPaths.join("|") !== [...recordPaths].sort().join("|") ||
      value.provenance.assetFingerprint.aggregateSha256 !== sha256Hex(records)
    ) {
      addIssue(context, ["provenance", "assetFingerprint"], "asset records는 정렬·중복 제거된 aggregate hash와 결속되어야 합니다.");
    }

    const initialFirst = value.stability.initialFirst;
    const initialSecond = value.stability.initialSecond;
    const selectedFirst = value.stability.selectedFirst;
    const selectedSecond = value.stability.selectedSecond;
    const actualInitialDrift = maxNumericDrift(initialFirst, initialSecond);
    const actualSelectedDrift = maxNumericDrift(selectedFirst, selectedSecond);
    if (
      actualInitialDrift > value.stability.toleranceCssPx ||
      actualSelectedDrift > value.stability.toleranceCssPx ||
      !approximate(value.stability.initialMaxDrift, actualInitialDrift, 1e-8) ||
      !approximate(value.stability.selectedMaxDrift, actualSelectedDrift, 1e-8)
    ) {
      addIssue(context, ["stability"], "initial/selected 두 표본은 tolerance 안에서 안정적이어야 합니다.");
    }
    for (const [name, sample] of [
      ["initialFirst", initialFirst],
      ["initialSecond", initialSecond],
      ["selectedFirst", selectedFirst],
      ["selectedSecond", selectedSecond]
    ] as const) {
      validateSample(sample, context, ["stability", name]);
      const fixedBoxes = Object.values(sample.fixedChrome).map(
        (entry) => entry.bounds
      );
      if (
        fixedBoxes.some(
          (box) => !isWithin(box, sample.canvas.screenBounds)
        )
      ) {
        addIssue(
          context,
          ["stability", name, "fixedChrome"],
          "모든 fixed chrome bounds는 viewport screen bounds 안에 있어야 합니다."
        );
      }
    }
    const staticFirstDrift = maxNumericDrift(
      staticSampleProjection(initialFirst),
      staticSampleProjection(selectedFirst)
    );
    const staticSecondDrift = maxNumericDrift(
      staticSampleProjection(initialSecond),
      staticSampleProjection(selectedSecond)
    );
    if (
      staticFirstDrift > value.stability.toleranceCssPx ||
      staticSecondDrift > value.stability.toleranceCssPx
    ) {
      addIssue(
        context,
        ["stability"],
        "initial/selected 상태에서 dynamic chrome과 selectedCount 외 static geometry는 같아야 합니다."
      );
    }
    if (
      initialFirst.dynamicChrome.state !== "initial" ||
      initialSecond.dynamicChrome.state !== "initial" ||
      initialFirst.dynamicChrome.deduplicatedCandidateCount !== 0 ||
      initialSecond.dynamicChrome.deduplicatedCandidateCount !== 0 ||
      initialFirst.dynamicChrome.chosenSignatureSha256 !== null ||
      initialSecond.dynamicChrome.chosenSignatureSha256 !== null ||
      initialFirst.dynamicChrome.boxes.length !== 0 ||
      initialSecond.dynamicChrome.boxes.length !== 0 ||
      initialFirst.editorState.selectedCount !== 0 ||
      initialSecond.editorState.selectedCount !== 0
    ) {
      addIssue(context, ["stability", "initialFirst", "dynamicChrome"], "initial sample에는 selection chrome이 없어야 합니다.");
    }
    if (
      selectedFirst.dynamicChrome.state !== "selected" ||
      selectedSecond.dynamicChrome.state !== "selected" ||
      selectedFirst.dynamicChrome.deduplicatedCandidateCount !== 1 ||
      selectedSecond.dynamicChrome.deduplicatedCandidateCount !== 1 ||
      selectedFirst.dynamicChrome.boxes.length !== 1 ||
      selectedSecond.dynamicChrome.boxes.length !== 1 ||
      selectedFirst.editorState.selectedCount !==
        value.interactionReference.observedSelectedCount ||
      selectedSecond.editorState.selectedCount !==
        value.interactionReference.observedSelectedCount
    ) {
      addIssue(context, ["stability", "selectedFirst", "dynamicChrome"], "selected sample은 실제 dynamic selection chrome을 가져야 합니다.");
    }
    for (const [name, sample] of [
      ["selectedFirst", selectedFirst],
      ["selectedSecond", selectedSecond]
    ] as const) {
      const box = sample.dynamicChrome.boxes[0];
      if (!box) continue;
      const color = parseCssColor(box.signature.backgroundColor);
      const viewport = sample.canvas.screenBounds;
      const fixedBoxes = Object.values(sample.fixedChrome).map(
        (entry) => entry.bounds
      );
      if (
        !color ||
        color.alpha < 0.75 ||
        color.perceivedLuminance > 125 ||
        !approximate(box.signature.backgroundAlpha, color.alpha, 1e-6) ||
        !approximate(
          box.signature.perceivedLuminance,
          color.perceivedLuminance,
          0.001
        ) ||
        !isWithin(box.bounds, viewport) ||
        fixedBoxes.some((fixedBox) => intersects(fixedBox, box.bounds)) ||
        sample.dynamicChrome.chosenSignatureSha256 !== sha256Hex(box)
      ) {
        addIssue(
          context,
          ["stability", name, "dynamicChrome"],
          "선택 툴바는 viewport 안의 유일한 dark candidate와 exact signature hash에 결속되어야 합니다."
        );
      }
    }
    if (
      !approximate(value.environment.pan.x, initialSecond.canvas.viewBox.x, 0.001) ||
      !approximate(value.environment.pan.y, initialSecond.canvas.viewBox.y, 0.001)
    ) {
      addIssue(context, ["environment", "pan"], "pan은 observed viewBox origin과 같아야 합니다.");
    }
    if (
      !value.limitations.some(
        (entry) =>
          entry.includes("single-reference") &&
          entry.includes("generic interaction")
      ) ||
      !value.limitations.some(
        (entry) => entry.includes("0px") && entry.includes("clearance")
      )
    ) {
      addIssue(
        context,
        ["limitations"],
        "단일 reference 범위와 0px activity clearance를 명시해야 합니다."
      );
    }

    let expected: ReturnType<typeof expectedSafeRects> | null = null;
    try {
      expected = expectedSafeRects(
        initialSecond,
        selectedSecond,
        value.derived.guardCssPx
      );
    } catch {
      addIssue(context, ["derived"], "safe rect를 계산할 수 있는 invertible CTM이 필요합니다.");
    }
    if (!expected) return;
    const screenBounds = initialSecond.canvas.screenBounds;
    if (
      !isWithin(value.derived.fixedSafeCss, screenBounds) ||
      !isWithin(
        value.derived.singleReferenceInteractionDiagnostic
          .interactionSafeCss,
        screenBounds
      )
    ) {
      addIssue(
        context,
        ["derived"],
        "fixed/reference interaction CSS safe rect는 viewport 안에 있어야 합니다."
      );
    }
    for (const key of [
      "fixedSafeCss",
      "fixedSafeCanvas",
      "referenceInteractionSafeCss",
      "referenceInteractionSafeCanvas"
    ] as const) {
      const actual =
        key === "fixedSafeCss" || key === "fixedSafeCanvas"
          ? value.derived[key]
          : key === "referenceInteractionSafeCss"
            ? value.derived.singleReferenceInteractionDiagnostic
                .interactionSafeCss
            : value.derived.singleReferenceInteractionDiagnostic
                .interactionSafeCanvas;
      if (!boundsApproximatelyEqual(actual, expected[key])) {
        addIssue(
          context,
          ["derived", key],
          `${key}는 chrome·guard·inverse CTM에서 파생되어야 합니다.`
        );
      }
    }
    const fixedBoxes = Object.values(initialSecond.fixedChrome).map(
      (entry) => inflate(entry.bounds, value.derived.guardCssPx)
    );
    const dynamicBoxes = selectedSecond.dynamicChrome.boxes.map((entry) =>
      inflate(entry.bounds, value.derived.guardCssPx)
    );
    if (
      fixedBoxes.some((box) => intersects(box, value.derived.fixedSafeCss)) ||
      [...fixedBoxes, ...dynamicBoxes].some((box) =>
        intersects(
          box,
          value.derived.singleReferenceInteractionDiagnostic
            .interactionSafeCss
        )
      )
    ) {
      addIssue(context, ["derived"], "safe rect는 guard-inflated fixed/dynamic chrome과 교차할 수 없습니다.");
    }
  });

export type EditorGeometryEvidence = z.infer<
  typeof editorGeometryEvidenceSchema
>;

const geometryProfileBodySchema = z
  .object({
    schemaVersion: z.literal(STUDENT_ONE_SCREEN_GEOMETRY_PROFILE_VERSION),
    profileId: z.literal("student-one-screen-fixed-geometry-v1"),
    profileVersion: z.literal("1.0.0"),
    evidenceId: stableIdSchema,
    evidenceFileSha256: sha256Schema,
    resolverInputPolicy: z.literal("pinned-offline-profile-only"),
    liveMeasurementAllowed: z.literal(false),
    viewport: z.literal("1280x800"),
    surfaceMode: z.literal("authoring-editor"),
    sidebarState: z.literal("expanded"),
    zoomObservation: z.literal("fit-compatible-geometry-observed"),
    guardCssPx: z.literal(EDITOR_GEOMETRY_GUARD_CSS_PX),
    transform: z
      .object({
        source: z.literal("svg-getScreenCTM"),
        screenBounds: viewportScreenBoundsSchema,
        viewBox: boundsSchema,
        preserveAspectRatio: z.literal("none"),
        ctm: matrixSchema,
        inverse: matrixSchema,
        scaleX: z.number().finite().positive(),
        scaleY: z.number().finite().positive(),
        cornerResidualCssPx: z.number().finite().min(0),
        effectiveRenderedScaleUsage: z.literal("diagnostic-only")
      })
      .strict(),
    fixedSafeCss: boundsSchema,
    fixedSafeCanvas: boundsSchema,
    singleReferenceInteractionDiagnostic: z
      .object({
        coverage: z.literal("single-reference-diagnostic"),
        activityId: z.literal(
          "number.division.quotient-remainder.claim-evidence-v1"
        ),
        affordanceFamilyId: z.literal("native-counting-model-v1"),
        usableAsGenericResolverInput: z.literal(false),
        interactionSafeCss: boundsSchema,
        interactionSafeCanvas: boundsSchema
      })
      .strict(),
    tolerance: z
      .object({
        geometryCssPx: z.literal(EDITOR_GEOMETRY_TOLERANCE_CSS_PX),
        roundTripCssPx: z.literal(EDITOR_GEOMETRY_TOLERANCE_CSS_PX)
      })
      .strict(),
    eligibility: z
      .object({
        fixedGeometryInputReady: z.literal(true),
        interactionGeometryInputReady: z.literal(false),
        blockers: z.tuple([
          z.literal("affordance-family-dynamic-chrome-coverage-pending")
        ]),
        r4OverallComplete: z.literal(false),
        releaseQualified: z.literal(false)
      })
      .strict()
  })
  .strict();

export type StudentOneScreenGeometryProfileBody = z.infer<
  typeof geometryProfileBodySchema
>;

export function studentOneScreenGeometryProfileContentHash(
  body: StudentOneScreenGeometryProfileBody
): string {
  return sha256Hex(body);
}

export const studentOneScreenGeometryProfileSchema = geometryProfileBodySchema
  .extend({ contentSha256: sha256Schema })
  .strict()
  .superRefine((value, context) => {
    const { contentSha256, ...body } = value;
    if (contentSha256 !== studentOneScreenGeometryProfileContentHash(body)) {
      addIssue(context, ["contentSha256"], "profile content hash가 본문과 다릅니다.");
    }
    let expectedInverse: Matrix | null = null;
    try {
      expectedInverse = inverseMatrix(value.transform.ctm);
    } catch {
      addIssue(context, ["transform", "ctm"], "profile CTM은 invertible이어야 합니다.");
    }
    if (
      !expectedInverse ||
      !matrixApproximatelyEqual(value.transform.inverse, expectedInverse, 1e-5) ||
      !approximate(
        value.transform.scaleX,
        Math.hypot(value.transform.ctm.a, value.transform.ctm.b),
        1e-8
      ) ||
      !approximate(
        value.transform.scaleY,
        Math.hypot(value.transform.ctm.c, value.transform.ctm.d),
        1e-8
      )
    ) {
      addIssue(context, ["transform"], "profile transform은 full CTM과 inverse에 결속되어야 합니다.");
    }
    const actualCornerResidual = cornerResidualCssPx(
      value.transform.ctm,
      value.transform.viewBox,
      value.transform.screenBounds
    );
    if (
      !approximate(
        value.transform.cornerResidualCssPx,
        actualCornerResidual,
        0.00001
      ) ||
      actualCornerResidual > value.tolerance.geometryCssPx ||
      !boundsApproximatelyEqual(
        transformBounds(value.transform.ctm, value.transform.viewBox),
        value.transform.screenBounds
      )
    ) {
      addIssue(
        context,
        ["transform", "cornerResidualCssPx"],
        "profile CTM은 pinned viewBox와 screen bounds 모서리에 직접 결속되어야 합니다."
      );
    }
    if (
      !isWithin(value.fixedSafeCss, value.transform.screenBounds) ||
      !isWithin(
        value.singleReferenceInteractionDiagnostic.interactionSafeCss,
        value.transform.screenBounds
      )
    ) {
      addIssue(
        context,
        ["fixedSafeCss"],
        "offline profile의 CSS safe rect는 pinned screen bounds 안에 있어야 합니다."
      );
    }
    if (!expectedInverse) return;
    for (const [cssBounds, canvasBounds, path] of [
      [value.fixedSafeCss, value.fixedSafeCanvas, "fixedSafeCss"],
      [
        value.singleReferenceInteractionDiagnostic.interactionSafeCss,
        value.singleReferenceInteractionDiagnostic.interactionSafeCanvas,
        "singleReferenceInteractionDiagnostic"
      ]
    ] as const) {
      const expectedCanvas = transformBounds(
        value.transform.inverse,
        cssBounds
      );
      if (!boundsApproximatelyEqual(canvasBounds, expectedCanvas)) {
        addIssue(context, [path], `${path} canvas bounds는 inverse CTM에서 파생되어야 합니다.`);
      }
      const roundTrip = transformBounds(
        value.transform.ctm,
        canvasBounds
      );
      if (!boundsApproximatelyEqual(cssBounds, roundTrip)) {
        addIssue(context, [path], `${path} roundtrip이 tolerance를 벗어났습니다.`);
      }
    }
  });

export type StudentOneScreenGeometryProfile = z.infer<
  typeof studentOneScreenGeometryProfileSchema
>;

export function assertStudentOneScreenGeometryProfileBinding(
  profile: StudentOneScreenGeometryProfile,
  evidence: EditorGeometryEvidence,
  evidenceFileSha256: string
): true {
  const expected = evidence.stability.initialSecond;
  if (
    profile.evidenceId !== evidence.evidenceId ||
    profile.evidenceFileSha256 !== evidenceFileSha256 ||
    profile.viewport !== evidence.environment.viewport ||
    profile.surfaceMode !== evidence.environment.surfaceMode ||
    profile.sidebarState !== evidence.environment.sidebarState ||
    profile.zoomObservation !== evidence.environment.zoomObservation ||
    profile.guardCssPx !== evidence.derived.guardCssPx ||
    canonicalJson(profile.transform.ctm) !== canonicalJson(expected.canvas.ctm) ||
    canonicalJson(profile.transform.inverse) !==
      canonicalJson(expected.canvas.inverse) ||
    canonicalJson(profile.transform.screenBounds) !==
      canonicalJson(expected.canvas.screenBounds) ||
    canonicalJson(profile.transform.viewBox) !==
      canonicalJson(expected.canvas.viewBox) ||
    profile.transform.preserveAspectRatio !==
      expected.canvas.preserveAspectRatio ||
    profile.transform.cornerResidualCssPx !==
      expected.canvas.cornerResidualCssPx ||
    profile.transform.scaleX !== expected.canvas.scaleX ||
    profile.transform.scaleY !== expected.canvas.scaleY ||
    canonicalJson(profile.fixedSafeCss) !==
      canonicalJson(evidence.derived.fixedSafeCss) ||
    canonicalJson(profile.fixedSafeCanvas) !==
      canonicalJson(evidence.derived.fixedSafeCanvas) ||
    profile.singleReferenceInteractionDiagnostic.activityId !==
      evidence.interactionReference.activityId ||
    profile.singleReferenceInteractionDiagnostic.affordanceFamilyId !==
      evidence.interactionReference.affordanceFamilyId ||
    canonicalJson(
      profile.singleReferenceInteractionDiagnostic.interactionSafeCss
    ) !==
      canonicalJson(
        evidence.derived.singleReferenceInteractionDiagnostic
          .interactionSafeCss
      ) ||
    canonicalJson(
      profile.singleReferenceInteractionDiagnostic.interactionSafeCanvas
    ) !==
      canonicalJson(
        evidence.derived.singleReferenceInteractionDiagnostic
          .interactionSafeCanvas
      )
  ) {
    throw new Error("student-one-screen-geometry-profile-drift");
  }
  return true;
}
