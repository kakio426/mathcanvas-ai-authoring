import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

export const EDUITIT_HTML30_HARNESS_VERSION =
  "eduitit-html30-mathcanvas-prompt:v1";
export const EDUITIT_HTML30_SCHEMA_VERSION = "1.0.0";

const REQUIRED_SOURCE_SCREENS = ["02", "03", "06", "09", "10"];
const EXPECTED_SLIDE_COUNT = 12;
const SOURCE_SCREEN_PURPOSES = {
  "02": "prediction-conflict",
  "03": "condition-change",
  "06": "mathematical-confirmation-source",
  "09": "independent-transfer",
  "10": "misconception-revision"
};
const REQUIRED_PHASES = [
  "prediction",
  "mathematical-confirmation",
  "explanation",
  "revision"
];

function fail(code, detail = "") {
  throw new Error(
    `eduitit-html30-prompt-harness:${code}${detail ? `:${detail}` : ""}`
  );
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])])
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function assertSafeRelativePath(value, context) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").includes("..")
  ) {
    fail("unsafe-relative-path", context);
  }
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_match, code) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function attributeValue(attributes, name) {
  const match = attributes.match(
    new RegExp(`${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i")
  );
  return match ? decodeHtmlEntities(match[2]).trim() : "";
}

function normalizedStaticSlideText(fragment) {
  return decodeHtmlEntities(
    fragment
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/\{\{[\s\S]*?\}\}/g, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(
        /<\/(?:p|div|li|h[1-6]|tr|td|th|table|ul|ol|figure|figcaption)>/gi,
        "\n"
      )
      .replace(/<[^>]+>/g, " ")
  )
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" | ");
}

function extractSlides(html, lessonId) {
  const slides = [];
  const slidePattern =
    /<section\b([^>]*\bdata-slide\b[^>]*)>([\s\S]*?)(?=<section\b[^>]*\bdata-slide\b|<\/x-import>)/gi;
  for (const match of html.matchAll(slidePattern)) {
    const attributes = match[1];
    const screenLabel = attributeValue(attributes, "data-screen-label");
    const stageLabel = attributeValue(attributes, "data-label");
    const speakerNotes = attributeValue(attributes, "data-speaker-notes");
    const staticNormalizedText = normalizedStaticSlideText(match[2]);
    if (!screenLabel || !stageLabel || !staticNormalizedText) {
      fail("slide-evidence-missing", `${lessonId}:${slides.length + 1}`);
    }
    slides.push({
      screenLabel,
      stageLabel,
      speakerNotes,
      staticNormalizedText,
      staticNormalizedTextSha256: sha256(staticNormalizedText)
    });
  }
  return slides;
}

function normalizeStandardCode(value) {
  if (typeof value !== "string" || !/^\[?\d수\d{2}-\d{2}\]?$/.test(value)) {
    fail("invalid-standard-code", String(value));
  }
  return value.startsWith("[") ? value : `[${value}]`;
}

function expectedCatalogEntryId(sequence) {
  return `grade3-basic-practice-ppt-${String(sequence).padStart(2, "0")}`;
}

function sourcePathFromRoot(root, absolutePath) {
  const value = relative(root, absolutePath).split(sep).join("/");
  assertSafeRelativePath(value, "source-path");
  return `eduitit:${value}`;
}

function assertPublishedHtmlContract({
  html,
  lessonId,
  title,
  slideCount
}) {
  if (slideCount !== EXPECTED_SLIDE_COUNT) {
    fail("html-slide-count-contract", `${lessonId}:${slideCount}`);
  }
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!titleMatch || decodeHtmlEntities(titleMatch[1]).trim() !== title) {
    fail("html-title-mismatch", lessonId);
  }
  const slideSize = html.match(
    /<meta\s+name=["']eduitit-slide-size["']\s+content=["']([^"']+)["']/i
  )?.[1];
  if (slideSize !== "1920x1080") {
    fail("html-slide-size-mismatch", lessonId);
  }
  const deckRoots = [...html.matchAll(/\bdata-eduitit-deck\b/gi)];
  if (deckRoots.length !== 1) {
    fail("html-deck-root-count", `${lessonId}:${deckRoots.length}`);
  }
  const deckLessonId = html.match(
    /\bdata-eduitit-lesson-id=["']([^"']+)["']/i
  )?.[1];
  if (deckLessonId !== lessonId) {
    fail("html-lesson-id-mismatch", lessonId);
  }
  const slides = extractSlides(html, lessonId);
  if (slides.length !== slideCount) {
    fail("html-slide-count-mismatch", `${lessonId}:${slides.length}`);
  }
  const screenLabels = slides.map((slide) => slide.screenLabel);
  if (new Set(screenLabels).size !== slides.length) {
    fail("html-screen-label-duplicate", lessonId);
  }
  const selected = REQUIRED_SOURCE_SCREENS.map((screenLabel) => {
    const matches = slides.filter(
      (slide) => slide.screenLabel === screenLabel
    );
    if (matches.length !== 1) {
      fail(
        "required-source-screen-count",
        `${lessonId}:${screenLabel}:${matches.length}`
      );
    }
    return {
      purpose:
        screenLabel === "03" && matches[0].stageLabel.includes("수학적 확인")
          ? "early-mathematical-confirmation-source"
          : SOURCE_SCREEN_PURPOSES[screenLabel],
      ...matches[0]
    };
  });
  return { slides, selected };
}

function catalogAlignment(record, catalogEntry) {
  const sourceCodes = record.curriculum.standardCodes.map(
    normalizeStandardCode
  );
  const issues = [];
  if (catalogEntry.title !== record.title) issues.push("title-mismatch");
  if (catalogEntry.selection.grade !== record.curriculum.grade) {
    issues.push("grade-mismatch");
  }
  if (catalogEntry.selection.semester !== record.curriculum.semester) {
    issues.push("semester-mismatch");
  }
  if (
    catalogEntry.authorityBinding.unit.unitNumber !==
    record.curriculum.unitNumber
  ) {
    issues.push("unit-number-mismatch");
  }
  if (
    catalogEntry.authorityBinding.unit.title !== record.curriculum.unitTitle
  ) {
    issues.push(
      `unit-title-mismatch:${catalogEntry.authorityBinding.unit.title}->${record.curriculum.unitTitle}`
    );
  }
  if (!sourceCodes.includes(catalogEntry.selection.standardCode)) {
    issues.push("primary-standard-not-in-html-source");
  }
  return {
    status: issues.length === 0 ? "exact" : "needs-review",
    issues,
    sourceStandardCodes: sourceCodes
  };
}

function promptEvidenceLines(sourceSlides) {
  return sourceSlides
    .map(
      (slide) =>
        `- ${slide.screenLabel} ${slide.stageLabel} (${slide.purpose}) · HTML static normalized text: ${slide.staticNormalizedText}\n  교사 메모: ${slide.speakerNotes}`
    )
    .join("\n");
}

function promptPolicyFromCatalog(catalogEntry) {
  if (
    canonicalJson(catalogEntry.phaseSequence) !==
    canonicalJson(REQUIRED_PHASES)
  ) {
    fail("catalog-phase-contract", catalogEntry.catalogEntryId);
  }
  const problemCount = catalogEntry.modifierPolicy.problemCount;
  const contextMaxChars = catalogEntry.modifierPolicy.contextMaxChars;
  if (
    !Number.isInteger(problemCount.min) ||
    !Number.isInteger(problemCount.default) ||
    !Number.isInteger(problemCount.max) ||
    problemCount.min !== 1 ||
    problemCount.default !== 1 ||
    problemCount.max < problemCount.default ||
    problemCount.max > 2 ||
    !Number.isInteger(contextMaxChars) ||
    contextMaxChars < 1 ||
    contextMaxChars > 500
  ) {
    fail("catalog-modifier-contract", catalogEntry.catalogEntryId);
  }
  return {
    phaseSequence: [...catalogEntry.phaseSequence],
    problemCount: { ...problemCount },
    contextMaxChars
  };
}

function makeImplementationPrompt({
  record,
  packageManifest,
  htmlSha256,
  packageManifestSourcePath,
  slideHtmlSourcePath,
  sourceSlides,
  catalogEntry,
  alignment,
  catalogSnapshotSha256,
  promptPolicy
}) {
  const alignmentBlock =
    alignment.status === "exact"
      ? "현재 catalog binding은 Eduitit HTML metadata와 exact이다."
      : `현재 catalog binding은 검토가 필요하다: ${alignment.issues.join(
          ", "
        )}. 이 불일치를 해소하기 전 compile/release하지 않는다.`;
  const screen03 = sourceSlides.find(
    (slide) => slide.screenLabel === "03"
  );
  const conflictEvidenceInstruction =
    screen03?.purpose === "early-mathematical-confirmation-source"
      ? "2. 02의 서로 다른 생각과 03의 이른 수학적 확인을 이용해 대표 오개념을 하나 정하고, 정답 외에 구별 가능한 선택지를 최소 2개 둔다."
      : "2. 02의 서로 다른 생각과 03의 조건 변화를 이용해 대표 오개념을 하나 정하고, 정답 외에 구별 가능한 선택지를 최소 2개 둔다.";
  return [
    "당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.",
    "",
    "[변경 불가 source binding]",
    `- sequence: ${record.sequence}`,
    `- lessonId: ${record.lessonId}`,
    `- title: ${record.title}`,
    `- package manifest: ${packageManifestSourcePath}`,
    `- deployed HTML asset: ${slideHtmlSourcePath}`,
    `- HTML SHA-256: ${htmlSha256}`,
    `- grade/semester/unit: ${record.curriculum.grade}학년 ${record.curriculum.semester}학기 ${record.curriculum.unitNumber}. ${record.curriculum.unitTitle}`,
    `- standardCodes: ${alignment.sourceStandardCodes.join(", ")}`,
    `- domain / official learning goal: ${catalogEntry.domain} / ${catalogEntry.learningGoal}`,
    `- learningMapTopicId: ${catalogEntry.learningMapTopicId}`,
    `- standard authority: ${catalogEntry.authorityBinding.standard.source.sourceId}@${catalogEntry.authorityBinding.standard.source.version} · ${catalogEntry.authorityBinding.standard.source.contentSha256} · ${catalogEntry.authorityBinding.standard.source.locator}`,
    `- unit authority: ${catalogEntry.authorityBinding.unit.source.sourceId}@${catalogEntry.authorityBinding.unit.source.version} · ${catalogEntry.authorityBinding.unit.source.contentSha256} · ${catalogEntry.authorityBinding.unit.source.locator}`,
    `- textbook lesson: ${record.curriculum.lessonRange} · ${record.curriculum.lessonTitle} · pp.${record.curriculum.textbookPages.start}-${record.curriculum.textbookPages.end}`,
    `- source usage: ${record.curriculum.usageNote}`,
    `- catalogEntryId: ${catalogEntry.catalogEntryId}`,
    `- catalog snapshot SHA-256: ${catalogSnapshotSha256}`,
    `- catalog availability: ${catalogEntry.availability}`,
    `- blueprintFamily: ${catalogEntry.blueprintFamily.id}@${catalogEntry.blueprintFamily.version} · ${catalogEntry.blueprintFamily.rationale}`,
    `- variationPreset: ${catalogEntry.variationPreset.id}@${catalogEntry.variationPreset.version} · ${catalogEntry.variationPreset.rationale}`,
    `- affordanceFamily: ${catalogEntry.affordanceFamily.family.id}@${catalogEntry.affordanceFamily.family.version} · support=${catalogEntry.affordanceFamily.supportState}`,
    `- affordance operation: ${catalogEntry.affordanceFamily.family.rationale}`,
    `- candidateToolKeys: ${catalogEntry.affordanceFamily.candidateToolKeys.join(", ")}`,
    `- native evidenceIds: ${catalogEntry.affordanceFamily.evidenceIds.join(", ")}`,
    `- layoutFamily: ${catalogEntry.layoutFamily.id}@${catalogEntry.layoutFamily.version} · ${catalogEntry.layoutFamily.rationale}`,
    `- phaseSequence: ${promptPolicy.phaseSequence.join(" → ")}`,
    `- ${alignmentBlock}`,
    "",
    "[실제 HTML에서 추출한 수업 근거]",
    promptEvidenceLines(sourceSlides),
    "",
    "[설계 과제]",
    "1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.",
    conflictEvidenceInstruction,
    "3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.",
    `4. 기본 ${promptPolicy.problemCount.default}문제, 최대 ${promptPolicy.problemCount.max}문제만 사용한다.${
      promptPolicy.problemCount.max === 2
        ? " 두 문제는 native reserve를 포함한 one-screen spatial contract가 증명할 때만 사용한다."
        : ""
    } 1280×800 학생 화면에서 스크롤이나 캔버스 패닝 없이 끝나야 한다.`,
    "5. 예상 선택 → native 수학 상태로 확인 → 확인한 불변량을 식·말로 설명 → 처음 선택 수정의 네 단계를 위에서 아래로 배치한다.",
    "6. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 묶음, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.",
    "7. 학생 문장은 대상과 행동을 직접 이름 붙이고 한 문장에 한 가지 보이는 행동만 쓴다. HTML의 내부 단계명이나 정답 문장을 그대로 복사하지 않는다.",
    "8. 설명은 ‘왜?’로 끝내지 말고 학생이 방금 만든 모형·식·범례·단위·선분 같은 수학적 증거를 쓰게 한다.",
    "",
    "[한 화면·글자·공간 계약]",
    "- viewport 1280×800, fixed chrome guard 8 CSS px, no scroll.",
    "- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.",
    "- 서로 다른 의미 묶음 사이는 같은 문장 행 간격보다 크게 둔다. 제목은 안내보다 명확히 크고, 보기 글자는 상자 중앙에 둔다.",
    "- native visualBox/chromeBox/taskEnvelope/reserveBox를 실제 계약에서 읽고 전용 layout variant를 선택한다. 임의 좌표 nudge로 맞추지 않는다.",
    "- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.",
    "",
    "[추가 교사 프롬프트]",
    "{{teacherContext}}",
    `- 비어 있어도 된다. 입력 시 ${promptPolicy.contextMaxChars}자 이하의 비식별 수업 맥락만 반영한다.`,
    "- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.",
    "",
    "[출력 및 완료 조건]",
    "- source binding, mathematical decision, misconception conflict, self-verification invariant, native affordance plan, learner-facing ①②③ 흐름, one-screen layout variant, predicates, evidence plan, blockers를 구조화해 제시한다.",
    "- 초기 화면에 정답을 완성해 두지 않는다. 모든 물체를 뻔한 칸에 옮기는 그림판 활동으로 만들지 않는다.",
    `- 이 prompt는 design-only다. current catalog availability가 ${catalogEntry.availability}이므로 canonical compile 경로에 넣지 않는다.`,
    "- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.",
    "- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.",
    `- 현재 package manifest schema ${packageManifest.schemaVersion}, HTML ${packageManifest.slideCount} slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.`
  ].join("\n");
}

function catalogSnapshot(entry) {
  return canonicalValue(entry);
}

export function buildEduititHtml30PromptHarness({
  eduititRoot,
  catalog
}) {
  const resolvedEduititRoot = resolve(eduititRoot);
  const sourceRoot = join(
    resolvedEduititRoot,
    "edu_materials",
    "static",
    "edu_materials",
    "lesson_bundles"
  );
  const seriesManifestPath = join(sourceRoot, "series-manifest.json");
  const seriesManifestBytes = readFileSync(seriesManifestPath);
  const seriesManifest = JSON.parse(seriesManifestBytes.toString("utf8"));
  if (
    seriesManifest.schemaVersion !== 1 ||
    seriesManifest.presentationStatus !== "available" ||
    seriesManifest.count !== 30 ||
    !Array.isArray(seriesManifest.records) ||
    seriesManifest.records.length !== 30
  ) {
    fail("series-manifest-contract");
  }
  if (!Array.isArray(catalog) || catalog.length !== 30) {
    fail("catalog-count", String(catalog?.length));
  }
  const expectedSequences = Array.from({ length: 30 }, (_, index) => index + 1);
  if (
    JSON.stringify(seriesManifest.records.map((record) => record.sequence)) !==
    JSON.stringify(expectedSequences)
  ) {
    fail("series-sequence-contract");
  }
  if (
    new Set(seriesManifest.records.map((record) => record.lessonId)).size !==
      30 ||
    new Set(seriesManifest.records.map((record) => record.title)).size !== 30
  ) {
    fail("series-identity-duplicate");
  }

  const entries = seriesManifest.records.map((record) => {
    const catalogEntryId = expectedCatalogEntryId(record.sequence);
    const catalogMatches = catalog.filter(
      (entry) => entry.catalogEntryId === catalogEntryId
    );
    if (catalogMatches.length !== 1) {
      fail("catalog-entry-count", `${catalogEntryId}:${catalogMatches.length}`);
    }
    const catalogEntry = catalogMatches[0];
    assertSafeRelativePath(record.packageManifest, record.lessonId);
    const packageManifestPath = join(sourceRoot, record.packageManifest);
    const packageManifestBytes = readFileSync(packageManifestPath);
    const packageManifest = JSON.parse(packageManifestBytes.toString("utf8"));
    if (
      packageManifest.schemaVersion !== 5 ||
      packageManifest.seriesId !== seriesManifest.seriesId ||
      packageManifest.generatedAt !== seriesManifest.generatedAt ||
      packageManifest.sequence !== record.sequence ||
      packageManifest.lessonId !== record.lessonId ||
      packageManifest.title !== record.title ||
      packageManifest.subject !== "수학" ||
      packageManifest.subjectCode !== "MATH" ||
      packageManifest.grade !== record.grade ||
      packageManifest.unit !== record.unit ||
      canonicalJson(packageManifest.curriculum) !==
        canonicalJson(record.curriculum) ||
      record.presentationMode !== "html" ||
      record.presentationStatus !== "available" ||
      packageManifest.presentationMode !== record.presentationMode ||
      packageManifest.presentationStatus !== record.presentationStatus ||
      packageManifest.shortformStatus !== record.shortformStatus ||
      packageManifest.slideCount !== EXPECTED_SLIDE_COUNT ||
      (record.slideCount !== undefined &&
        packageManifest.slideCount !== record.slideCount)
    ) {
      fail("package-manifest-contract", record.lessonId);
    }
    assertSafeRelativePath(packageManifest.slideHtmlAsset, record.lessonId);
    const htmlPath = join(
      dirname(packageManifestPath),
      packageManifest.slideHtmlAsset
    );
    const htmlBytes = readFileSync(htmlPath);
    const htmlSha256 = sha256(htmlBytes);
    const presentationAssets = packageManifest.assets.filter(
      (asset) => asset.role === "presentation"
    );
    if (
      presentationAssets.length !== 1 ||
      presentationAssets[0].path !== packageManifest.slideHtmlAsset ||
      presentationAssets[0].bytes !== htmlBytes.byteLength ||
      presentationAssets[0].sha256 !== htmlSha256 ||
      packageManifest.sourceSlideHtmlSha256 !== htmlSha256 ||
      packageManifest.digest !== record.digest ||
      !packageManifest.slideHtmlAsset.startsWith(`${record.digest}/`)
    ) {
      fail("published-html-evidence-drift", record.lessonId);
    }
    const html = htmlBytes.toString("utf8");
    const { selected } = assertPublishedHtmlContract({
      html,
      lessonId: record.lessonId,
      title: record.title,
      slideCount: packageManifest.slideCount
    });
    const alignment = catalogAlignment(record, catalogEntry);
    const catalogEntrySnapshot = catalogSnapshot(catalogEntry);
    const catalogSnapshotSha256 = sha256(
      canonicalJson(catalogEntrySnapshot)
    );
    const catalogPromptPolicy = promptPolicyFromCatalog(catalogEntry);
    const packageManifestSourcePath = sourcePathFromRoot(
      resolvedEduititRoot,
      packageManifestPath
    );
    const slideHtmlSourcePath = sourcePathFromRoot(
      resolvedEduititRoot,
      htmlPath
    );
    const implementationPrompt = makeImplementationPrompt({
      record,
      packageManifest,
      htmlSha256,
      packageManifestSourcePath,
      slideHtmlSourcePath,
      sourceSlides: selected,
      catalogEntry,
      alignment,
      catalogSnapshotSha256,
      promptPolicy: catalogPromptPolicy
    });
    const compileBlockers = [
      `catalog-availability:${catalogEntry.availability}`,
      ...catalogEntry.blockingReasons.map(
        (reason) => `catalog-blocker:${reason}`
      ),
      ...alignment.issues.map((issue) => `catalog-alignment:${issue}`)
    ];
    return {
      sequence: record.sequence,
      promptId: `mathcanvas-${record.lessonId}-v1`,
      lessonId: record.lessonId,
      title: record.title,
      sourceBinding: {
        sourceKind: "eduitit-published-lesson-bundle-html",
        packageManifestPath: packageManifestSourcePath,
        packageManifestSha256: sha256(packageManifestBytes),
        slideHtmlPath: slideHtmlSourcePath,
        slideHtmlSha256: htmlSha256,
        slideHtmlBytes: htmlBytes.byteLength,
        slideCount: packageManifest.slideCount,
        slideSize: "1920x1080",
        sourceSlides: selected
      },
      curriculum: {
        ...record.curriculum,
        standardCodes: alignment.sourceStandardCodes
      },
      catalogBinding: {
        alignmentStatus: alignment.status,
        alignmentIssues: alignment.issues,
        snapshotSha256: catalogSnapshotSha256,
        ...catalogEntrySnapshot
      },
      promptPolicy: {
        status: "design-only",
        offlineReady: true,
        sourceAlignmentReady: alignment.status === "exact",
        compileAllowed: false,
        compileBlockers,
        releaseAllowed: false,
        defaultProblemCount: catalogPromptPolicy.problemCount.default,
        maximumProblemCount: catalogPromptPolicy.problemCount.max,
        oneScreen: true,
        viewportCssPx: { width: 1280, height: 800 },
        fixedChromeGuardCssPx: 8,
        typographyCssPx: {
          titleOrQuestionMinimum: 28,
          instructionOptionLabelMinimum: 22
        },
        requiredPhases: catalogPromptPolicy.phaseSequence,
        teacherContext: {
          placeholder: "{{teacherContext}}",
          optional: true,
          maximumCharacters: catalogPromptPolicy.contextMaxChars,
          allowedEffect: "non-identifying-context-only",
          forbiddenEffects: [
            "curriculum-selection",
            "mathematical-invariant",
            "native-tool-support",
            "raw-payload",
            "coordinates",
            "release-state"
          ]
        },
        requiresFreshBackgroundCanary: true,
        requiresActualSaveReopen: true,
        requiresSolVisualReview: true
      },
      implementationPrompt,
      implementationPromptSha256: sha256(implementationPrompt)
    };
  });

  const catalogEntryIds = entries.map(
    (entry) => entry.catalogBinding.catalogEntryId
  );
  if (new Set(catalogEntryIds).size !== 30) {
    fail("catalog-entry-duplicate");
  }
  const base = {
    schemaVersion: EDUITIT_HTML30_SCHEMA_VERSION,
    harnessVersion: EDUITIT_HTML30_HARNESS_VERSION,
    seriesId: seriesManifest.seriesId,
    generatedFrom: {
      sourceMode: "actual-eduitit-published-slide-html",
      seriesManifestPath: sourcePathFromRoot(
        resolvedEduititRoot,
        seriesManifestPath
      ),
      seriesManifestSha256: sha256(seriesManifestBytes),
      seriesGeneratedAt: seriesManifest.generatedAt,
      entryCount: 30
    },
    entries
  };
  return {
    ...base,
    contentSha256: sha256(canonicalJson(base))
  };
}

export function promptHarnessJson(harness) {
  return `${JSON.stringify(harness, null, 2)}\n`;
}

export function renderPromptPack(harness) {
  const lines = [
    "# Eduitit HTML 30 · MathCanvas 구현 프롬프트",
    "",
    `- harness: ${harness.harnessVersion}`,
    `- series: ${harness.seriesId}`,
    `- source manifest SHA-256: ${harness.generatedFrom.seriesManifestSha256}`,
    `- harness content SHA-256: ${harness.contentSha256}`,
    "- source of truth: Eduitit에 배포된 실제 `*-slides.html` 30개",
    "- 상태: 설계용 prompt pack. actual canary·save/reopen 전 release 금지.",
    ""
  ];
  for (const entry of harness.entries) {
    lines.push(
      `## ${String(entry.sequence).padStart(2, "0")} · ${entry.title}`,
      "",
      `- lessonId: \`${entry.lessonId}\``,
      `- catalogEntryId: \`${entry.catalogBinding.catalogEntryId}\``,
      `- HTML SHA-256: \`${entry.sourceBinding.slideHtmlSha256}\``,
      `- catalog alignment: \`${entry.catalogBinding.alignmentStatus}\`${
        entry.catalogBinding.alignmentIssues.length
          ? ` · ${entry.catalogBinding.alignmentIssues.join(", ")}`
          : ""
      }`,
      "",
      "```text",
      entry.implementationPrompt,
      "```",
      ""
    );
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function assertPromptHarnessMatches(canonicalHarness, candidate) {
  if (canonicalJson(canonicalHarness) !== canonicalJson(candidate)) {
    fail("snapshot-drift");
  }
}

export function defaultEduititRoot(mathcanvasRoot) {
  return resolve(mathcanvasRoot, "..", "..", "eduitit");
}

export function defaultOutputPaths(mathcanvasRoot) {
  return {
    json: join(
      mathcanvasRoot,
      "research",
      "mathcanvas",
      "eduitit-html30-prompt-harness.json"
    ),
    markdown: join(
      mathcanvasRoot,
      "research",
      "mathcanvas",
      "eduitit-html30-prompt-pack.md"
    )
  };
}
