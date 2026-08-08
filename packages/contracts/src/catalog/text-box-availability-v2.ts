import { z } from "zod";
import { sha256Hex } from "../hash.js";
import { stableIdSchema } from "../vocabulary/ids.js";

export const TEXT_BOX_AVAILABILITY_V2_SCHEMA_VERSION = "1.1.0" as const;

export const TEXT_BOX_DIRECT_SELECTOR_ENTRIES = [
  { name: "svg text", selector: "svg#outermost text" },
  { name: "svg foreignObject", selector: "svg#outermost foreignObject" },
  { name: "input", selector: "svg#outermost input" },
  { name: "textarea", selector: "svg#outermost textarea" },
  {
    name: "contenteditable",
    selector: "svg#outermost [contenteditable='true']"
  },
  { name: "math-field", selector: "svg#outermost math-field" }
] as const;

export const TEXT_BOX_CANVAS_ROOT_SELECTOR = "svg#outermost" as const;

const allowedTagsBySelector: Record<string, Set<string>> = {
  "svg#outermost text": new Set(["text"]),
  "svg#outermost foreignObject": new Set(["foreignobject"]),
  "svg#outermost input": new Set(["input"]),
  "svg#outermost textarea": new Set(["textarea"]),
  "svg#outermost [contenteditable='true']": new Set([
    "article",
    "div",
    "input",
    "math-field",
    "p",
    "section",
    "span",
    "textarea"
  ]),
  "svg#outermost math-field": new Set(["math-field"])
};

const directSelectorNames: Set<string> = new Set(
  TEXT_BOX_DIRECT_SELECTOR_ENTRIES.map((entry) => entry.name)
);
const directSelectorValues: Set<string> = new Set(
  TEXT_BOX_DIRECT_SELECTOR_ENTRIES.map((entry) => entry.selector)
);
const exactSelector = TEXT_BOX_DIRECT_SELECTOR_ENTRIES.map(
  (entry) => entry.selector
).join(",");

const fontSampleSchema = z
  .object({
    family: z.string().min(1).max(160),
    size: z
      .string()
      .regex(/^\d+(?:\.\d+)?px$/)
      .refine((size) => Number.parseFloat(size) > 0 && Number.parseFloat(size) <= 512),
    weight: z.string().min(1).max(40),
    lineHeight: z
      .string()
      .regex(/^(?:normal|\d+(?:\.\d+)?px)$/)
      .refine(
        (lineHeight) =>
          lineHeight === "normal" ||
          (Number.parseFloat(lineHeight) > 0 &&
            Number.parseFloat(lineHeight) <= 1024)
      )
  })
  .strict();

type FontSample = z.infer<typeof fontSampleSchema>;

export function textBoxFontFingerprint(fontSamples: FontSample[]): string {
  const normalized = fontSamples
    .map((sample) => ({
      family: sample.family,
      lineHeight: sample.lineHeight,
      size: sample.size,
      weight: sample.weight
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right))
    );
  return `sha256:${sha256Hex(normalized)}`;
}

const boundSchema = z
  .object({
    selector: z.string().min(1).max(80),
    tag: z.string().min(1).max(40),
    bounds: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        width: z.number().finite().positive(),
        height: z.number().finite().positive()
      })
      .strict(),
    fontSamples: z.array(fontSampleSchema).min(1).max(32),
    textLength: z.number().int().min(0).max(100_000)
  })
  .strict();

const canvasRootSchema = z
  .object({
    selector: z.literal(TEXT_BOX_CANVAS_ROOT_SELECTOR),
    tag: z.literal("svg"),
    id: z.literal("outermost"),
    bounds: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        width: z.number().finite().positive(),
        height: z.number().finite().positive()
      })
      .strict()
  })
  .strict();

const selectorEntrySchema = z
  .object({
    name: z.string().min(1).max(40),
    selector: z.string().min(1).max(120)
  })
  .strict();

export const textBoxAvailabilityProbeSchema = z
  .object({
    schemaVersion: z.literal(TEXT_BOX_AVAILABILITY_V2_SCHEMA_VERSION),
    probeId: stableIdSchema,
    observedAt: z.string().datetime(),
    sourceEvidence: z
      .object({
        sourceKind: z.enum([
          "editor-diagnostics-context",
          "dedicated-editor-diagnostics"
        ]),
        rawSha256: z.string().regex(/^[a-f0-9]{64}$/),
        screenshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
        redactedPath: z.literal("/ko/view/<redacted-project>"),
        rawCommitted: z.literal(false)
      })
      .strict(),
    environment: z
      .object({
        surfaceMode: z.literal("authoring-editor"),
        viewport: z.string().regex(/^\d+x\d+$/).nullable(),
        editorPath: z.literal("/ko/view/<redacted-project>"),
        writePolicy: z.literal("read-only-observation"),
        userChromeTouched: z.literal(false)
      })
      .strict(),
    query: z
      .object({
        status: z.enum(["pending-exact-selector-probe", "completed"]),
        selector: z.literal(exactSelector),
        selectorEntries: z.array(selectorEntrySchema).length(
          TEXT_BOX_DIRECT_SELECTOR_ENTRIES.length
        ),
        selectorCounts: z.record(z.number().int().min(0)).nullable(),
        visibleSelectorCounts: z.record(z.number().int().min(0)).nullable(),
        candidateTagCounts: z.record(z.number().int().min(0)),
        directTextBoxTags: z.array(z.string().min(1).max(40)).max(12),
        directTextBoxCount: z.number().int().min(0).nullable(),
        visibleBounds: z.array(boundSchema).max(240),
        canvasRoot: canvasRootSchema.nullable(),
        groupWrapperCount: z.number().int().min(0).nullable(),
        groupTextCount: z.number().int().min(0).nullable()
      })
      .strict(),
    decision: z
      .object({
        status: z.enum([
          "pending-exact-selector-probe",
          "observed-not-ready",
          "resolved"
        ]),
        directTextBoxQueryable: z.boolean().nullable(),
        fallback: z.enum([
          "pending-exact-selector-probe",
          "dom-svg-text-box",
          "font-fingerprint-conservative"
        ]),
        liveMeasurementAllowed: z.literal(false),
        resolverInputPolicy: z.literal("contract-only"),
        metricsTable: z.null()
      })
      .strict(),
    fontFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/).nullable(),
    limitations: z.array(z.string().min(1).max(500)).min(1).max(8)
  })
  .strict()
  .superRefine((value, context) => {
    const actualEntries = value.query.selectorEntries.map((entry) => entry.name);
    const actualSelectors = value.query.selectorEntries.map(
      (entry) => entry.selector
    );
    if (
      new Set(actualEntries).size !== actualEntries.length ||
      actualEntries.some((name) => !directSelectorNames.has(name)) ||
      new Set(actualSelectors).size !== actualSelectors.length ||
      actualSelectors.some((selector) => !directSelectorValues.has(selector)) ||
      actualSelectors.join(",") !== exactSelector
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["query", "selectorEntries"],
        message: "정확한 direct text-box selector 집합과 순서에 결속되어야 합니다."
      });
    }

    if (value.query.status === "pending-exact-selector-probe") {
      if (
        value.query.selectorCounts !== null ||
        value.query.visibleSelectorCounts !== null ||
        value.query.directTextBoxCount !== null ||
        value.query.groupWrapperCount !== null ||
        value.query.groupTextCount !== null ||
        value.query.canvasRoot !== null ||
        value.query.directTextBoxTags.length > 0 ||
        value.query.visibleBounds.length > 0 ||
        Object.keys(value.query.candidateTagCounts).length > 0
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["query"],
          message: "pending probe는 관측 결과를 임의의 0 또는 부분 집합으로 채울 수 없습니다."
        });
      }
      if (
        value.decision.status !== "pending-exact-selector-probe" ||
        value.decision.directTextBoxQueryable !== null ||
        value.decision.fallback !== "pending-exact-selector-probe" ||
        value.decision.metricsTable !== null ||
        value.fontFingerprint !== null
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["decision"],
          message: "exact selector probe 전에는 availability/fallback을 결정할 수 없습니다."
        });
      }
      return;
    }

    if (
      value.query.selectorCounts === null ||
      value.query.visibleSelectorCounts === null ||
      value.query.directTextBoxCount === null ||
      value.query.groupWrapperCount === null ||
      value.query.groupTextCount === null ||
      value.query.canvasRoot === null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["query"],
        message: "completed probe는 selector/count/bounds/font fingerprint를 모두 가져야 합니다."
      });
      return;
    }

    if (
      value.sourceEvidence.sourceKind !== "dedicated-editor-diagnostics" ||
      value.environment.viewport === null ||
      value.environment.editorPath !== "/ko/view/<redacted-project>"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceEvidence"],
        message: "completed probe는 dedicated editor source와 실제 viewport/path에 결속되어야 합니다."
      });
    }
    if (value.environment.viewport === null) return;

    const expectedNames = TEXT_BOX_DIRECT_SELECTOR_ENTRIES.map(
      (entry) => entry.name
    );
    const expectedNameKeys = [...expectedNames].sort().join(",");
    const selectorCountKeys = Object.keys(value.query.selectorCounts)
      .sort()
      .join(",");
    const visibleSelectorCountKeys = Object.keys(
      value.query.visibleSelectorCounts
    )
      .sort()
      .join(",");
    if (
      selectorCountKeys !== expectedNameKeys ||
      visibleSelectorCountKeys !== expectedNameKeys
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["query"],
        message: "selector count record는 exact selector 이름 집합만 가져야 합니다."
      });
    }
    for (const name of expectedNames) {
      if (!(name in value.query.selectorCounts)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["query", "selectorCounts"],
          message: `selector count 누락: ${name}`
        });
      }
      if (!(name in value.query.visibleSelectorCounts)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["query", "visibleSelectorCounts"],
          message: `visible selector count 누락: ${name}`
        });
      }
      const visibleCount = value.query.visibleSelectorCounts[name] ?? -1;
      const totalCount = value.query.selectorCounts[name] ?? -1;
      if (visibleCount > totalCount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["query", "visibleSelectorCounts", name],
          message: "visible selector count는 전체 selector count를 넘을 수 없습니다."
        });
      }
    }
    const directCount = value.query.directTextBoxCount;
    const tagCount = Object.values(value.query.candidateTagCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    const sortedTags = [...new Set(value.query.directTextBoxTags)].sort();
    const boundsBySelector = new Map<string, number>();
    const knownSelectors = new Set(actualSelectors);
    const rootBounds = value.query.canvasRoot?.bounds;
    const [viewportWidth = 0, viewportHeight = 0] =
      value.environment.viewport.split("x").map(Number);
    const intersects = (
      bounds: { x: number; y: number; width: number; height: number },
      container: { x: number; y: number; width: number; height: number }
    ) =>
      bounds.x + bounds.width > container.x &&
      bounds.x < container.x + container.width &&
      bounds.y + bounds.height > container.y &&
      bounds.y < container.y + container.height;
    if (
      !Number.isInteger(viewportWidth) ||
      !Number.isInteger(viewportHeight) ||
      viewportWidth < 320 ||
      viewportWidth > 3840 ||
      viewportHeight < 240 ||
      viewportHeight > 2400
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["environment", "viewport"],
        message: "completed viewport는 지원된 editor CSS px 범위여야 합니다."
      });
    }
    if (
      !rootBounds ||
      !intersects(rootBounds, {
        x: 0,
        y: 0,
        width: viewportWidth,
        height: viewportHeight
      })
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["query", "canvasRoot"],
        message: "canvas root는 viewport와 교차해야 합니다."
      });
    }
    for (const bound of value.query.visibleBounds) {
      if (!knownSelectors.has(bound.selector)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["query", "visibleBounds"],
          message: "visible bound가 exact selector 집합 밖에 있습니다."
        });
      }
      const allowedTags = allowedTagsBySelector[bound.selector];
      if (!allowedTags?.has(bound.tag)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["query", "visibleBounds"],
          message: `selector와 rendered tag가 맞지 않습니다: ${bound.selector}/${bound.tag}`
        });
      }
      const fontSampleKeys = bound.fontSamples.map((sample) =>
        JSON.stringify({
          family: sample.family,
          lineHeight: sample.lineHeight,
          size: sample.size,
          weight: sample.weight
        })
      );
      if (
        new Set(fontSampleKeys).size !== fontSampleKeys.length ||
        fontSampleKeys.join("|") !== [...fontSampleKeys].sort().join("|")
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["query", "visibleBounds"],
          message: "각 visible bound의 font sample은 중복 없는 canonical style set이어야 합니다."
        });
      }
      if (
        !rootBounds ||
        !intersects(bound.bounds, rootBounds) ||
        !intersects(bound.bounds, {
          x: 0,
          y: 0,
          width: viewportWidth,
          height: viewportHeight
        })
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["query", "visibleBounds"],
          message: "visible bound는 canvas root와 viewport에 교차해야 합니다."
        });
      }
      boundsBySelector.set(
        bound.selector,
        (boundsBySelector.get(bound.selector) ?? 0) + 1
      );
    }
    for (const entry of value.query.selectorEntries) {
      const boundCount = boundsBySelector.get(entry.selector) ?? 0;
      const expectedCount =
        value.query.visibleSelectorCounts[entry.name] ?? -1;
      if (boundCount !== expectedCount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["query", "visibleBounds"],
          message: `visible bounds와 selector count가 다릅니다: ${entry.name}`
        });
      }
    }
    const boundsTagCounts = value.query.visibleBounds.reduce(
      (counts, bound) => {
        counts[bound.tag] = (counts[bound.tag] ?? 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    );
    const sortRecord = (record: Record<string, number>) =>
      Object.fromEntries(Object.entries(record).sort(([left], [right]) =>
        left.localeCompare(right)
      ));
    if (
      JSON.stringify(sortRecord(boundsTagCounts)) !==
      JSON.stringify(sortRecord(value.query.candidateTagCounts))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["query", "candidateTagCounts"],
        message: "candidate tag count는 visible bounds의 tag count와 같아야 합니다."
      });
    }
    if (
      Object.keys(boundsTagCounts).sort().join(",") !==
      sortedTags.join(",")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["query", "directTextBoxTags"],
        message: "directTextBoxTags는 visible bounds tag에서 파생되어야 합니다."
      });
    }
    if (
      sortedTags.length !== value.query.directTextBoxTags.length ||
      sortedTags.join(",") !== value.query.directTextBoxTags.join(",") ||
      (directCount === 0 && value.query.directTextBoxTags.length !== 0) ||
      (directCount > 0 && value.query.directTextBoxTags.length === 0) ||
      tagCount !== directCount ||
      value.query.visibleBounds.length !== directCount
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["query"],
        message: "direct count·tag 집합·visible bounds가 서로 정확히 결속되어야 합니다."
      });
    }
    const queryable = directCount > 0;
    if (value.decision.directTextBoxQueryable !== queryable) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decision", "directTextBoxQueryable"],
        message: "directTextBoxQueryable은 directTextBoxCount의 biconditional이어야 합니다."
      });
    }
    if (value.fontFingerprint === null && queryable) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fontFingerprint"],
        message: "direct candidate가 있으면 실제 font sample fingerprint가 필요합니다."
      });
    }
    if (
      queryable &&
      value.fontFingerprint !==
        textBoxFontFingerprint(
          value.query.visibleBounds.flatMap((bound) => bound.fontSamples)
        )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fontFingerprint"],
        message: "font fingerprint는 실제 text-bearing descendant style set에서 파생되어야 합니다."
      });
    }
    if (queryable) {
      if (
        value.decision.fallback !== "dom-svg-text-box" ||
        value.decision.status !== "resolved" ||
        value.decision.metricsTable !== null
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["decision"],
          message: "direct box가 있으면 DOM/SVG 경로만 resolved로 선택할 수 있습니다."
        });
      }
    } else {
      if (value.decision.fallback !== "font-fingerprint-conservative") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["decision", "fallback"],
          message: "direct box가 없으면 font-fingerprint-conservative만 허용합니다."
        });
      }
      if (
        value.decision.metricsTable === null &&
        value.decision.status !== "observed-not-ready"
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["decision", "status"],
          message: "metrics table이 없으면 fallback은 observed-not-ready에 머물러야 합니다."
        });
      }
      if (
        value.decision.metricsTable === null &&
        value.fontFingerprint !== null
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fontFingerprint"],
          message: "direct candidate가 없으면 빈/임의 font fingerprint를 기록할 수 없습니다."
        });
      }
    }
  });

export type TextBoxAvailabilityProbe = z.infer<
  typeof textBoxAvailabilityProbeSchema
>;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

export function assertTextBoxAvailabilityProbeBinding(
  probe: TextBoxAvailabilityProbe,
  expected: TextBoxAvailabilityProbe
): true {
  const actualJson = JSON.stringify(canonicalize(probe));
  const expectedJson = JSON.stringify(canonicalize(expected));
  if (actualJson !== expectedJson) {
    throw new Error("text-box-probe-evidence-drift");
  }
  return true;
}
