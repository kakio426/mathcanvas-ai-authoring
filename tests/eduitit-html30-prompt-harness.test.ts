import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { grade3PilotWorksheetCatalog } from "@mathcanvas/curriculum";
import { beforeAll, describe, expect, it } from "vitest";

const mathcanvasRoot = resolve(import.meta.dirname, "..");
const eduititRoot = resolve(mathcanvasRoot, "..", "..", "eduitit");
const harnessModuleUrl = pathToFileURL(
  join(
    mathcanvasRoot,
    "scripts",
    "prompt-harness",
    "eduitit-html30.mjs"
  )
).href;
const harnessJsonPath = join(
  mathcanvasRoot,
  "research",
  "mathcanvas",
  "eduitit-html30-prompt-harness.json"
);
const promptPackPath = join(
  mathcanvasRoot,
  "research",
  "mathcanvas",
  "eduitit-html30-prompt-pack.md"
);

type HarnessModule = {
  assertPromptHarnessMatches: (
    canonicalHarness: Record<string, unknown>,
    candidate: Record<string, unknown>
  ) => void;
  buildEduititHtml30PromptHarness: (input: {
    eduititRoot: string;
    catalog: typeof grade3PilotWorksheetCatalog;
  }) => Record<string, unknown>;
  canonicalJson: (value: unknown) => string;
  promptHarnessJson: (value: Record<string, unknown>) => string;
  renderPromptPack: (value: Record<string, unknown>) => string;
  sha256: (value: string) => string;
};

type PromptEntry = {
  sequence: number;
  lessonId: string;
  title: string;
  sourceBinding: {
    sourceKind: string;
    packageManifestPath: string;
    packageManifestBindingPolicy: string;
    packageManifestSha256: string;
    slideHtmlPath: string;
    slideHtmlSha256: string;
    sourceSlides: Array<{
      screenLabel: string;
      purpose: string;
      staticNormalizedText: string;
      staticNormalizedTextSha256: string;
    }>;
  };
  catalogBinding: {
    catalogEntryId: string;
    alignmentStatus: string;
    alignmentIssues: string[];
    snapshotSha256: string;
    learningGoal: string;
    blueprintFamily: { id: string; version: string };
    variationPreset: { id: string; version: string };
    affordanceFamily: {
      family: { id: string; version: string };
      candidateToolKeys: string[];
      supportState: string;
      evidenceIds: string[];
    };
    layoutFamily: { id: string; version: string };
    authorityBinding: {
      standard: {
        source: {
          contentSha256: string;
        };
      };
    };
  };
  promptPolicy: {
    status: string;
    sourceAlignmentReady: boolean;
    compileAllowed: boolean;
    compileBlockers: string[];
    releaseAllowed: boolean;
    defaultProblemCount: number;
    maximumProblemCount: number;
    catalogProblemCountPolicy: { min: number; max: number; default: number };
    oneScreen: boolean;
    mathCanvasZoomPercent: number;
    persistedCanvasScale: number;
    minimumWorkbenchShare: number;
    workbenchClearanceCssPx: number;
    learnerFlow: string[];
    catalogLegacyPhaseSequence: string[];
    forbiddenRegions: string[];
    nativePlacement: string;
    studentToolMenuRequired: boolean;
    keyboardModifiersAllowed: string[];
    teacherContext: {
      placeholder: string;
      maximumCharacters: number;
      allowedEffect: string;
      forbiddenEffects: string[];
    };
    requiresFreshBackgroundCanary: boolean;
    requiresActualSaveReopen: boolean;
    requiresSolVisualReview: boolean;
  };
  implementationPrompt: string;
  implementationPromptSha256: string;
};

type PromptHarness = Record<string, unknown> & {
  generatedFrom: {
    sourceMode: string;
    entryCount: number;
  };
  entries: PromptEntry[];
  contentSha256: string;
};

type JsonRecord = Record<string, any>;

function withEduititOverlay(
  mutateFirst: (input: {
    seriesManifest: JsonRecord;
    record: JsonRecord;
    packageManifest: JsonRecord;
    html: string;
  }) => string,
  run: (overlayRoot: string) => void
): void {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "mathcanvas-html30-"));
  try {
    const sourceBundleRoot = join(
      eduititRoot,
      "edu_materials",
      "static",
      "edu_materials",
      "lesson_bundles"
    );
    const overlayBundleRoot = join(
      temporaryRoot,
      "edu_materials",
      "static",
      "edu_materials",
      "lesson_bundles"
    );
    mkdirSync(overlayBundleRoot, { recursive: true });
    const seriesManifest = JSON.parse(
      readFileSync(join(sourceBundleRoot, "series-manifest.json"), "utf8")
    ) as JsonRecord;
    const records = seriesManifest.records as JsonRecord[];
    for (const [index, record] of records.entries()) {
      const lessonDirectory = dirname(record.packageManifest as string);
      const sourceLessonDirectory = join(sourceBundleRoot, lessonDirectory);
      const overlayLessonDirectory = join(overlayBundleRoot, lessonDirectory);
      if (index !== 0) {
        symlinkSync(sourceLessonDirectory, overlayLessonDirectory, "dir");
        continue;
      }
      mkdirSync(overlayLessonDirectory, { recursive: true });
      const packageManifestPath = join(
        sourceBundleRoot,
        record.packageManifest as string
      );
      const packageManifest = JSON.parse(
        readFileSync(packageManifestPath, "utf8")
      ) as JsonRecord;
      const sourceHtmlPath = join(
        dirname(packageManifestPath),
        packageManifest.slideHtmlAsset as string
      );
      const mutatedHtml = mutateFirst({
        seriesManifest,
        record,
        packageManifest,
        html: readFileSync(sourceHtmlPath, "utf8")
      });
      const overlayHtmlPath = join(
        overlayLessonDirectory,
        packageManifest.slideHtmlAsset as string
      );
      mkdirSync(dirname(overlayHtmlPath), { recursive: true });
      writeFileSync(overlayHtmlPath, mutatedHtml);
      writeFileSync(
        join(overlayLessonDirectory, "manifest.json"),
        `${JSON.stringify(packageManifest, null, 2)}\n`
      );
    }
    writeFileSync(
      join(overlayBundleRoot, "series-manifest.json"),
      `${JSON.stringify(seriesManifest, null, 2)}\n`
    );
    run(temporaryRoot);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function rehashCandidate(
  module: HarnessModule,
  candidate: PromptHarness
): void {
  for (const entry of candidate.entries) {
    entry.implementationPromptSha256 = module.sha256(
      entry.implementationPrompt
    );
  }
  const base = structuredClone(candidate) as Record<string, unknown>;
  delete base.contentSha256;
  candidate.contentSha256 = module.sha256(module.canonicalJson(base));
}

describe("Eduitit 실제 HTML 30개 MathCanvas prompt harness", () => {
  let module: HarnessModule;
  let canonical: PromptHarness;

  beforeAll(async () => {
    module = (await import(harnessModuleUrl)) as HarnessModule;
    canonical = module.buildEduititHtml30PromptHarness({
      eduititRoot,
      catalog: grade3PilotWorksheetCatalog
    }) as PromptHarness;
  });

  it("배포된 *-slides.html 30개를 sequence와 SHA로 1:1 결속한다", () => {
    expect(canonical.generatedFrom).toMatchObject({
      sourceMode: "actual-eduitit-published-slide-html",
      entryCount: 30
    });
    expect(canonical.entries).toHaveLength(30);
    expect(canonical.entries.map((entry) => entry.sequence)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1)
    );
    expect(
      new Set(canonical.entries.map((entry) => entry.lessonId)).size
    ).toBe(30);
    expect(
      new Set(
        canonical.entries.map(
          (entry) => entry.catalogBinding.catalogEntryId
        )
      ).size
    ).toBe(30);
    expect(
      new Set(
        canonical.entries.map(
          (entry) => entry.sourceBinding.slideHtmlSha256
        )
      ).size
    ).toBe(30);
    expect(
      new Set(
        canonical.entries.map(
          (entry) => entry.implementationPromptSha256
        )
      ).size
    ).toBe(30);

    for (const entry of canonical.entries) {
      expect(entry.sourceBinding.sourceKind).toBe(
        "eduitit-published-lesson-bundle-html"
      );
      expect(entry.sourceBinding.packageManifestPath).toMatch(
        /^eduitit:edu_materials\/static\/edu_materials\/lesson_bundles\//
      );
      expect(entry.sourceBinding.packageManifestBindingPolicy).toBe(
        "canonical-json-without-mathcanvas-editor-url-v1"
      );
      expect(entry.sourceBinding.slideHtmlPath).toMatch(
        /^eduitit:edu_materials\/static\/edu_materials\/lesson_bundles\/.*-slides\.html$/
      );
      expect(
        entry.sourceBinding.sourceSlides.map((slide) => slide.screenLabel)
      ).toEqual(["02", "03", "06", "09", "10"]);
      expect(
        entry.sourceBinding.sourceSlides.map((slide) => slide.purpose)
      ).toEqual([
        "prediction-conflict",
        entry.sequence === 21
          ? "early-mathematical-confirmation-source"
          : "condition-change",
        "mathematical-confirmation-source",
        "independent-transfer",
        "misconception-revision"
      ]);
    }
  });

  it("배포 결과인 MathCanvas 링크만 바뀌어도 수업 원본 결속은 흔들리지 않는다", () => {
    withEduititOverlay(
      ({ packageManifest, html }) => {
        packageManifest.mathCanvasEditorUrl =
          "https://mathcanvas.vivasam.com/ko/view/rebound-link";
        return html;
      },
      (overlayRoot) => {
        const rebound = module.buildEduititHtml30PromptHarness({
          eduititRoot: overlayRoot,
          catalog: grade3PilotWorksheetCatalog
        }) as PromptHarness;
        expect(rebound.entries[0]!.sourceBinding.packageManifestSha256).toBe(
          canonical.entries[0]!.sourceBinding.packageManifestSha256
        );
        expect(rebound.entries[0]!.sourceBinding.slideHtmlSha256).toBe(
          canonical.entries[0]!.sourceBinding.slideHtmlSha256
        );
      }
    );
  });

  it("30개 prompt가 native-first 한 문제·100%·작업판 중심·release 금지를 공유한다", () => {
    for (const entry of canonical.entries) {
      expect(entry.promptPolicy).toMatchObject({
        status: "design-only",
        compileAllowed: false,
        releaseAllowed: false,
        defaultProblemCount: 1,
        maximumProblemCount: 1,
        oneScreen: true,
        mathCanvasZoomPercent: 100,
        persistedCanvasScale: 3,
        minimumWorkbenchShare: 0.72,
        workbenchClearanceCssPx: 24,
        learnerFlow: [
          "question",
          "native-construction",
          "compact-answer-if-needed"
        ],
        catalogLegacyPhaseSequence: [
          "prediction",
          "mathematical-confirmation",
          "explanation",
          "revision"
        ],
        forbiddenRegions: [
          "top-directions",
          "prediction",
          "first-answer",
          "revision",
          "written-reason"
        ],
        nativePlacement: "generator-preplaced",
        studentToolMenuRequired: false,
        keyboardModifiersAllowed: [],
        requiresFreshBackgroundCanary: true,
        requiresActualSaveReopen: true,
        requiresSolVisualReview: true
      });
      expect(entry.promptPolicy.teacherContext).toMatchObject({
        placeholder: "{{teacherContext}}",
        maximumCharacters: 500,
        allowedEffect: "non-identifying-context-only"
      });
      expect(entry.promptPolicy.teacherContext.forbiddenEffects).toEqual(
        expect.arrayContaining([
          "curriculum-selection",
          "mathematical-invariant",
          "native-tool-support",
          "raw-payload",
          "coordinates",
          "release-state"
        ])
      );
      expect(
        entry.implementationPrompt.match(/\{\{teacherContext\}\}/g)
      ).toHaveLength(1);
      expect(entry.implementationPrompt).toContain(
        "MathCanvas native-first"
      );
      expect(entry.implementationPrompt).toContain(
        `package manifest: ${entry.sourceBinding.packageManifestPath}`
      );
      expect(entry.implementationPrompt).toContain(
        `deployed HTML asset: ${entry.sourceBinding.slideHtmlPath}`
      );
      expect(entry.implementationPrompt).toContain("정확히 1문제");
      expect(entry.implementationPrompt).toContain(
        "문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역"
      );
      expect(entry.implementationPrompt).toContain(
        "①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다"
      );
      expect(entry.implementationPrompt).toContain(
        "학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다"
      );
      expect(entry.implementationPrompt).toContain("canonical native group");
      expect(entry.implementationPrompt).toContain(
        "실제 MathCanvas 100%, persisted canvasOption.scale=3"
      );
      expect(entry.implementationPrompt).toContain("28 CSS px 이상");
      expect(entry.implementationPrompt).toContain("22 CSS px 이상");
      expect(entry.implementationPrompt).toContain("learningMapTopicId:");
      expect(entry.implementationPrompt).toContain("standard authority:");
      expect(entry.implementationPrompt).toContain("unit authority:");
      expect(entry.implementationPrompt).toContain(
        `catalog snapshot SHA-256: ${entry.catalogBinding.snapshotSha256}`
      );
      expect(entry.implementationPrompt).toContain(
        `blueprintFamily: ${entry.catalogBinding.blueprintFamily.id}@${entry.catalogBinding.blueprintFamily.version}`
      );
      expect(entry.implementationPrompt).toContain(
        `variationPreset: ${entry.catalogBinding.variationPreset.id}@${entry.catalogBinding.variationPreset.version}`
      );
      expect(entry.implementationPrompt).toContain(
        `affordanceFamily: ${entry.catalogBinding.affordanceFamily.family.id}@${entry.catalogBinding.affordanceFamily.family.version} · support=${entry.catalogBinding.affordanceFamily.supportState}`
      );
      for (const toolKey of entry.catalogBinding.affordanceFamily
        .candidateToolKeys) {
        expect(entry.implementationPrompt).toContain(toolKey);
      }
      for (const evidenceId of entry.catalogBinding.affordanceFamily
        .evidenceIds) {
        expect(entry.implementationPrompt).toContain(evidenceId);
      }
      expect(entry.implementationPrompt).toContain(
        `layoutFamily: ${entry.catalogBinding.layoutFamily.id}@${entry.catalogBinding.layoutFamily.version}`
      );
      expect(entry.implementationPrompt).toContain(
        "스크롤이나 캔버스 패닝 없이"
      );
      expect(entry.implementationPrompt).not.toContain(
        "드래그나 스크롤 없이"
      );
      expect(entry.implementationPrompt).toContain(
        "canonical compile 경로에 넣지 않는다"
      );
      expect(entry.implementationPrompt).not.toMatch(
        /claude-all-30-ppt-content|\.pptx\b|source\.html/i
      );
    }
  });

  it("현재 catalog 차이 3건은 자동 compile을 막고 27건만 exact로 둔다", () => {
    const exact = canonical.entries.filter(
      (entry) => entry.catalogBinding.alignmentStatus === "exact"
    );
    const needsReview = canonical.entries.filter(
      (entry) => entry.catalogBinding.alignmentStatus === "needs-review"
    );
    expect(exact).toHaveLength(27);
    expect(needsReview.map((entry) => entry.sequence)).toEqual([25, 26, 27]);
    for (const entry of exact) {
      expect(entry.promptPolicy.sourceAlignmentReady).toBe(true);
      expect(entry.promptPolicy.compileAllowed).toBe(false);
      expect(entry.promptPolicy.compileBlockers).toContain(
        "catalog-availability:blocked"
      );
      expect(entry.catalogBinding.alignmentIssues).toEqual([]);
    }
    for (const entry of needsReview) {
      expect(entry.promptPolicy.sourceAlignmentReady).toBe(false);
      expect(entry.promptPolicy.compileAllowed).toBe(false);
      expect(entry.promptPolicy.compileBlockers).toContain(
        "catalog-alignment:unit-title-mismatch:분수->분수와 소수"
      );
      expect(entry.catalogBinding.alignmentIssues).toEqual([
        "unit-title-mismatch:분수->분수와 소수"
      ]);
    }
  });

  it("생성된 JSON과 30개 Markdown prompt pack이 canonical source와 byte-exact다", () => {
    const stored = JSON.parse(
      readFileSync(harnessJsonPath, "utf8")
    ) as PromptHarness;
    expect(() => module.assertPromptHarnessMatches(canonical, stored)).not.toThrow();
    expect(readFileSync(harnessJsonPath, "utf8")).toBe(
      module.promptHarnessJson(canonical)
    );
    expect(readFileSync(promptPackPath, "utf8")).toBe(
      module.renderPromptPack(canonical)
    );
    expect((readFileSync(promptPackPath, "utf8").match(/^## \d{2} · /gm) ?? [])).toHaveLength(30);
  });

  it("package와 HTML을 함께 11장으로 바꿔도 12장 published contract가 차단한다", () => {
    withEduititOverlay(
      ({ record, packageManifest, html }) => {
        const mutatedHtml = html.replace(
          /<section\b[^>]*data-screen-label=["']12["'][\s\S]*?(?=<\/x-import>)/i,
          ""
        );
        expect((html.match(/\bdata-slide\b/g) ?? [])).toHaveLength(12);
        expect((mutatedHtml.match(/\bdata-slide\b/g) ?? [])).toHaveLength(11);
        record.slideCount = 11;
        packageManifest.slideCount = 11;
        packageManifest.sourceSlideHtmlSha256 = module.sha256(mutatedHtml);
        const presentationAsset = (packageManifest.assets as JsonRecord[]).find(
          (asset) => asset.role === "presentation"
        );
        presentationAsset!.bytes = Buffer.byteLength(mutatedHtml);
        presentationAsset!.sha256 = module.sha256(mutatedHtml);
        return mutatedHtml;
      },
      (overlayRoot) => {
        expect(() =>
          module.buildEduititHtml30PromptHarness({
            eduititRoot: overlayRoot,
            catalog: grade3PilotWorksheetCatalog
          })
        ).toThrow(/package-manifest-contract/);
      }
    );
  });

  it("series와 다른 package curriculum을 HTML SHA가 같아도 차단한다", () => {
    withEduititOverlay(
      ({ packageManifest, html }) => {
        (packageManifest.curriculum as JsonRecord).usageNote =
          "series와 다른 변조된 교육과정 설명";
        return html;
      },
      (overlayRoot) => {
        expect(() =>
          module.buildEduititHtml30PromptHarness({
            eduititRoot: overlayRoot,
            catalog: grade3PilotWorksheetCatalog
          })
        ).toThrow(/package-manifest-contract/);
      }
    );
  });

  it("catalog가 1문제를 허용하는 범위에서 화면은 1문제로 고정하고 교사 맥락 한도만 파생한다", () => {
    const catalog = structuredClone(
      grade3PilotWorksheetCatalog
    ) as unknown as JsonRecord[];
    catalog[0]!.modifierPolicy.problemCount.max = 1;
    catalog[0]!.modifierPolicy.contextMaxChars = 100;
    const derived = module.buildEduititHtml30PromptHarness({
      eduititRoot,
      catalog: catalog as unknown as typeof grade3PilotWorksheetCatalog
    }) as PromptHarness;
    expect(derived.entries[0]!.promptPolicy.maximumProblemCount).toBe(1);
    expect(derived.entries[0]!.promptPolicy.catalogProblemCountPolicy.max).toBe(1);
    expect(
      derived.entries[0]!.promptPolicy.teacherContext.maximumCharacters
    ).toBe(100);
    expect(derived.entries[0]!.implementationPrompt).toContain("정확히 1문제");
    expect(derived.entries[0]!.implementationPrompt).toContain("100자 이하");
    expect(derived.entries[0]!.implementationPrompt).not.toContain(
      "두 문제는"
    );
  });

  it("필수 phase 순서와 bounded modifier를 벗어난 catalog 입력을 차단한다", () => {
    const changedPhase = structuredClone(
      grade3PilotWorksheetCatalog
    ) as unknown as JsonRecord[];
    changedPhase[0]!.phaseSequence = [
      "prediction",
      "explanation",
      "mathematical-confirmation",
      "revision"
    ];
    expect(() =>
      module.buildEduititHtml30PromptHarness({
        eduititRoot,
        catalog:
          changedPhase as unknown as typeof grade3PilotWorksheetCatalog
      })
    ).toThrow(/catalog-phase-contract/);

    const unboundedModifier = structuredClone(
      grade3PilotWorksheetCatalog
    ) as unknown as JsonRecord[];
    unboundedModifier[0]!.modifierPolicy.problemCount.max = 3;
    expect(() =>
      module.buildEduititHtml30PromptHarness({
        eduititRoot,
        catalog:
          unboundedModifier as unknown as typeof grade3PilotWorksheetCatalog
      })
    ).toThrow(/catalog-modifier-contract/);

    const fractionalModifier = structuredClone(
      grade3PilotWorksheetCatalog
    ) as unknown as JsonRecord[];
    fractionalModifier[0]!.modifierPolicy.problemCount.max = 1.5;
    expect(() =>
      module.buildEduititHtml30PromptHarness({
        eduititRoot,
        catalog:
          fractionalModifier as unknown as typeof grade3PilotWorksheetCatalog
      })
    ).toThrow(/catalog-modifier-contract/);
  });

  it.each([
    "source HTML SHA",
    "catalog entry swap",
    "catalog authority SHA",
    "release 승격",
    "source slide 문장",
    "teacher prompt raw-payload 허용"
  ])("%s 변조를 content hash 재계산 뒤에도 fail-closed한다", (caseName) => {
    const candidate = structuredClone(canonical);
    if (caseName === "source HTML SHA") {
      candidate.entries[0]!.sourceBinding.slideHtmlSha256 = "0".repeat(64);
    } else if (caseName === "catalog entry swap") {
      const first = candidate.entries[0]!.catalogBinding.catalogEntryId;
      candidate.entries[0]!.catalogBinding.catalogEntryId =
        candidate.entries[1]!.catalogBinding.catalogEntryId;
      candidate.entries[1]!.catalogBinding.catalogEntryId = first;
    } else if (caseName === "catalog authority SHA") {
      candidate.entries[0]!.catalogBinding.authorityBinding.standard.source.contentSha256 =
        "0".repeat(64);
    } else if (caseName === "release 승격") {
      candidate.entries[0]!.promptPolicy.releaseAllowed = true;
    } else if (caseName === "source slide 문장") {
      const slide = candidate.entries[0]!.sourceBinding.sourceSlides[0]!;
      slide.staticNormalizedText = `${slide.staticNormalizedText} 변조`;
      slide.staticNormalizedTextSha256 = module.sha256(
        slide.staticNormalizedText
      );
    } else {
      candidate.entries[0]!.implementationPrompt =
        candidate.entries[0]!.implementationPrompt.replace(
          "raw payload·좌표·release 상태는 바꾸지 않는다.",
          "raw payload 변경을 허용한다."
        );
    }
    rehashCandidate(module, candidate);
    expect(() =>
      module.assertPromptHarnessMatches(canonical, candidate)
    ).toThrow(/snapshot-drift/);
  });
});
