import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(
  new URL("../packages/managed-browser/package.json", import.meta.url)
);
const { chromium } = require("playwright-core");

const [editorUrl, problemId, outputDirectoryInput, mode] = process.argv.slice(2);
const readOnly = mode === "--read-only";
if (
  !editorUrl ||
  !/^https:\/\/mathcanvas\.vivasam\.com\/ko\/view\/[A-Za-z0-9_-]+$/.test(
    editorUrl
  ) ||
  !problemId ||
  !/^problem-\d+$/.test(problemId) ||
  !outputDirectoryInput
) {
  throw new Error(
    "사용법: node scripts/qa-live-editor.mjs <editor-url> <problem-id> <output-directory> [--read-only]"
  );
}

const outputDirectory = resolve(outputDirectoryInput);
const userDataDirectory =
  "/Users/yubyeongju/.mathcanvas-ai-authoring/chrome-profile";
mkdirSync(outputDirectory, { recursive: true });

const viewports = [
  { name: "user-reported-1630x1122", width: 1630, height: 1122 },
  { name: "reference-1280x800", width: 1280, height: 800 },
  { name: "tablet-landscape-1024x768", width: 1024, height: 768 }
];

const context = await chromium.launchPersistentContext(userDataDirectory, {
  channel: "chrome",
  headless: true,
  viewport: { width: viewports[0].width, height: viewports[0].height }
});

const tolerance = 1.5;
const results = [];

function contained(outer, inner) {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.right <= outer.right + tolerance &&
    inner.bottom <= outer.bottom + tolerance
  );
}

function intersectionArea(left, right) {
  const width = Math.max(
    0,
    Math.min(left.right, right.right) - Math.max(left.x, right.x)
  );
  const height = Math.max(
    0,
    Math.min(left.bottom, right.bottom) - Math.max(left.y, right.y)
  );
  return width * height;
}

try {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(editorUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.waitForSelector(`#${problemId}-mat`, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1_000);

  const measure = () =>
    page.evaluate((id) => {
      const rect = (elementId) => {
        const element = document.getElementById(elementId);
        if (!element) return null;
        let bounds;
        if (/(?:numerator|denominator)$/.test(elementId)) {
          const textNode = element.querySelector(".text-edit")?.firstChild;
          if (!textNode) return null;
          const range = document.createRange();
          range.selectNodeContents(textNode);
          bounds = range.getBoundingClientRect();
        } else {
          const measuredElement = elementId.endsWith("-explanation-input")
            ? element.querySelector("foreignObject") ?? element
            : element;
          bounds = measuredElement.getBoundingClientRect();
        }
        return {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          right: bounds.right,
          bottom: bounds.bottom
        };
      };
      const ids = [
        "instruction-main",
        `${id}-order-label`,
        `${id}-mat`,
        `${id}-source-panel`,
        `${id}-target-panel`,
        `${id}-symbol-panel`,
        `${id}-response-panel`,
        `${id}-left-strip-source-card`,
        `${id}-right-strip-source-card`,
        `${id}-left-strip`,
        `${id}-right-strip`,
        `${id}-left-lane-surface`,
        `${id}-right-lane-surface`,
        `${id}-move-step-label`,
        `${id}-target-label`,
        `${id}-start-line`,
        `${id}-start-label`,
        `${id}-symbol-label`,
        `${id}-less-symbol-source-card`,
        `${id}-greater-symbol-source-card`,
        `${id}-less-symbol`,
        `${id}-greater-symbol`,
        `${id}-relation-slot-surface`,
        `${id}-relation-left-fraction-card`,
        `${id}-relation-right-fraction-card`,
        `${id}-left-fraction-numerator`,
        `${id}-left-fraction-line`,
        `${id}-left-fraction-denominator`,
        `${id}-right-fraction-numerator`,
        `${id}-right-fraction-line`,
        `${id}-right-fraction-denominator`,
        `${id}-relation-left-fraction-numerator`,
        `${id}-relation-left-fraction-line`,
        `${id}-relation-left-fraction-denominator`,
        `${id}-relation-right-fraction-numerator`,
        `${id}-relation-right-fraction-line`,
        `${id}-relation-right-fraction-denominator`,
        `${id}-response-label`,
        `${id}-explanation-input-surface`,
        `${id}-explanation-input`,
        "right-toolbar",
        "bottom-common-toolbar"
      ];
      const fractionValue = (side) => {
        const read = (part) => {
          const text = document
            .querySelector(`#${id}-${side}-fraction-${part} .text-edit`)
            ?.textContent?.trim();
          return Number(text);
        };
        return {
          numerator: read("numerator"),
          denominator: read("denominator")
        };
      };
      return {
        viewport: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight
        },
        rects: Object.fromEntries(
          ids.map((elementId) => [elementId, rect(elementId)])
        ),
        fractions: {
          left: fractionValue("left"),
          right: fractionValue("right")
        }
      };
    }, problemId);

  for (const viewport of viewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height
    });
    await page.goto(editorUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30_000
    });
    await page.waitForSelector(`#${problemId}-mat`, { timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    const state = await measure();
    const rects = state.rects;
    const fractionPrefixes = [
      `${problemId}-left-fraction`,
      `${problemId}-right-fraction`,
      `${problemId}-relation-left-fraction`,
      `${problemId}-relation-right-fraction`
    ];
    const leftIsLarger =
      state.fractions.left.numerator * state.fractions.right.denominator >
      state.fractions.right.numerator * state.fractions.left.denominator;
    const leftSourceEnd = rects[`${problemId}-left-strip`]?.right;
    const rightSourceEnd = rects[`${problemId}-right-strip`]?.right;
    const requiredIds = Object.entries(rects)
      .filter(([, bounds]) => bounds === null)
      .map(([id]) => id);
    const assertions = {
      exactViewport:
        state.viewport.innerWidth === viewport.width &&
        state.viewport.innerHeight === viewport.height,
      requiredObjectsPresent: requiredIds.length === 0,
      pageOverflowFree:
        state.viewport.scrollWidth <= viewport.width &&
        state.viewport.scrollHeight <= viewport.height,
      activityInsideViewport: [
        rects["instruction-main"],
        rects[`${problemId}-order-label`],
        rects[`${problemId}-mat`],
        rects[`${problemId}-symbol-panel`],
        rects[`${problemId}-response-panel`]
      ].every(
        (bounds) =>
          bounds &&
          bounds.x >= -tolerance &&
          bounds.y >= -tolerance &&
          bounds.right <= viewport.width + tolerance &&
          bounds.bottom <= viewport.height + tolerance
      ),
      sourceAndTargetSeparated:
        rects[`${problemId}-source-panel`] &&
        rects[`${problemId}-target-panel`] &&
        intersectionArea(
          rects[`${problemId}-source-panel`],
          rects[`${problemId}-target-panel`]
        ) === 0,
      stripCardsInsideSource:
        rects[`${problemId}-source-panel`] &&
        [
          rects[`${problemId}-left-strip-source-card`],
          rects[`${problemId}-right-strip-source-card`]
        ].every(
          (bounds) =>
            bounds && contained(rects[`${problemId}-source-panel`], bounds)
        ),
      targetsInsideTarget:
        rects[`${problemId}-target-panel`] &&
        [
          rects[`${problemId}-left-lane-surface`],
          rects[`${problemId}-right-lane-surface`],
          rects[`${problemId}-start-line`],
          rects[`${problemId}-start-label`]
        ].every(
          (bounds) =>
            bounds && contained(rects[`${problemId}-target-panel`], bounds)
        ),
      symbolRowContained:
        rects[`${problemId}-symbol-panel`] &&
        [
          rects[`${problemId}-less-symbol-source-card`],
          rects[`${problemId}-greater-symbol-source-card`],
          rects[`${problemId}-relation-slot-surface`],
          rects[`${problemId}-relation-left-fraction-card`],
          rects[`${problemId}-relation-right-fraction-card`]
        ].every(
          (bounds) =>
            bounds && contained(rects[`${problemId}-symbol-panel`], bounds)
        ),
      responseIntegrated:
        rects[`${problemId}-explanation-input-surface`] &&
        [
          rects[`${problemId}-response-label`],
          rects[`${problemId}-explanation-input`]
        ].every(
          (bounds) =>
            bounds &&
            contained(
              rects[`${problemId}-explanation-input-surface`],
              bounds
            )
        ),
      sourceCueRequiresAlignment:
        typeof leftSourceEnd === "number" &&
        typeof rightSourceEnd === "number" &&
        (leftIsLarger
          ? rightSourceEnd - leftSourceEnd >= 8
          : leftSourceEnd - rightSourceEnd >= 8),
      fixedTargetLabelsSeparated:
        rects[`${problemId}-target-label`] &&
        rects[`${problemId}-start-label`] &&
        rects[`${problemId}-start-line`] &&
        intersectionArea(
          rects[`${problemId}-target-label`],
          rects[`${problemId}-start-label`]
        ) === 0 &&
        intersectionArea(
          rects[`${problemId}-start-label`],
          rects[`${problemId}-start-line`]
        ) === 0,
      composedFractionsCentered: fractionPrefixes.every((prefix) => {
        const numerator = rects[`${prefix}-numerator`];
        const line = rects[`${prefix}-line`];
        const denominator = rects[`${prefix}-denominator`];
        if (!numerator || !line || !denominator) return false;
        const lineCenter = line.x + line.width / 2;
        return (
          Math.abs(numerator.x + numerator.width / 2 - lineCenter) <= 3 &&
          Math.abs(denominator.x + denominator.width / 2 - lineCenter) <= 3 &&
          numerator.bottom <= line.y + tolerance &&
          denominator.y >= line.bottom - tolerance
        );
      }),
      responseLabelInputGap:
        rects[`${problemId}-response-label`] &&
        rects[`${problemId}-explanation-input`] &&
        rects[`${problemId}-explanation-input`].x -
          rects[`${problemId}-response-label`].right >=
          6,
      stageRowsSeparated:
        rects[`${problemId}-mat`] &&
        rects[`${problemId}-symbol-panel`] &&
        rects[`${problemId}-response-panel`] &&
        intersectionArea(
          rects[`${problemId}-mat`],
          rects[`${problemId}-symbol-panel`]
        ) === 0 &&
        intersectionArea(
          rects[`${problemId}-symbol-panel`],
          rects[`${problemId}-response-panel`]
        ) === 0,
      toolbarsDoNotCoverActivity:
        rects["right-toolbar"] &&
        rects["bottom-common-toolbar"] &&
        [
          rects[`${problemId}-mat`],
          rects[`${problemId}-symbol-panel`],
          rects[`${problemId}-response-panel`]
        ].every(
          (bounds) =>
            bounds &&
            intersectionArea(rects["right-toolbar"], bounds) === 0 &&
            intersectionArea(rects["bottom-common-toolbar"], bounds) === 0
        )
    };
    const failedAssertions = Object.entries(assertions)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    results.push({
      name: viewport.name,
      viewport: state.viewport,
      assertions,
      failedAssertions,
      requiredIds,
      rects
    });
    await page.screenshot({
      path: resolve(outputDirectory, `${viewport.name}-before.png`),
      fullPage: false
    });
  }

  let inputText = null;
  let manipulation = {
    skipped: true,
    assertions: {},
    failedAssertions: []
  };
  if (!readOnly) {
    await page.setViewportSize({ width: 1630, height: 1122 });
    await page.goto(editorUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30_000
    });
    await page.waitForSelector(`#${problemId}-mat`, { timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    const beforeManipulation = await measure();
    const userReportedInitial = results.find(
      (result) => result.name === "user-reported-1630x1122"
    );

    async function drag(sourceId, targetId) {
      const source = await page.locator(`#${sourceId}`).boundingBox();
      const target = await page.locator(`#${targetId}`).boundingBox();
      if (!source || !target) {
        throw new Error(
          `${sourceId} 또는 ${targetId}의 실제 위치를 찾지 못했습니다.`
        );
      }
      await page.mouse.move(
        source.x + source.width / 2,
        source.y + source.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        target.x + Math.min(source.width / 2, target.width / 2),
        target.y + target.height / 2,
        { steps: 16 }
      );
      await page.mouse.up();
      await page.waitForTimeout(400);
    }

    await drag(`${problemId}-left-strip`, `${problemId}-left-lane-surface`);
    await drag(`${problemId}-right-strip`, `${problemId}-right-lane-surface`);
    async function readInteger(elementId) {
      const text = await page
        .locator(`#${elementId} .text-edit`)
        .textContent();
      const value = Number(text?.trim());
      if (!Number.isInteger(value)) {
        throw new Error(`${elementId}에서 분수 값을 읽지 못했습니다.`);
      }
      return value;
    }
    const leftNumerator = await readInteger(
      `${problemId}-left-fraction-numerator`
    );
    const leftDenominator = await readInteger(
      `${problemId}-left-fraction-denominator`
    );
    const rightNumerator = await readInteger(
      `${problemId}-right-fraction-numerator`
    );
    const rightDenominator = await readInteger(
      `${problemId}-right-fraction-denominator`
    );
    const leftFraction = `${leftNumerator}/${leftDenominator}`;
    const rightFraction = `${rightNumerator}/${rightDenominator}`;
    const leftIsLarger =
      leftNumerator * rightDenominator >
      rightNumerator * leftDenominator;
    const symbolKind = leftIsLarger ? "greater" : "less";
    const reason = leftIsLarger
      ? `${leftFraction} 띠가 ${rightFraction} 띠보다 더 길어요.`
      : `${rightFraction} 띠가 ${leftFraction} 띠보다 더 길어요.`;
    await drag(
      `${problemId}-${symbolKind}-symbol`,
      `${problemId}-relation-slot-surface`
    );

    const response = page.locator(`#${problemId}-explanation-input`);
    await response.dblclick();
    await page.keyboard.press("Meta+A");
    await page.keyboard.type(reason);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);

    const afterManipulation = await measure();
    inputText = (
      await response.locator(".text-edit").textContent()
    )?.trim() ?? null;
    const fixedTextAfterIds = [
      "instruction-main",
      `${problemId}-order-label`,
      `${problemId}-move-step-label`,
      `${problemId}-target-label`,
      `${problemId}-start-label`,
      `${problemId}-symbol-label`,
      `${problemId}-response-label`
    ];
    const movedStripAfterIds = [
      `${problemId}-left-strip`,
      `${problemId}-right-strip`
    ];
    const manipulationAssertions = {
      manipulationViewportExact:
        beforeManipulation.viewport.innerWidth === 1630 &&
        beforeManipulation.viewport.innerHeight === 1122 &&
        afterManipulation.viewport.innerWidth === 1630 &&
        afterManipulation.viewport.innerHeight === 1122,
      manipulationUsesFresh1630Layout:
        userReportedInitial !== undefined &&
        Math.abs(
          beforeManipulation.rects[`${problemId}-mat`].x -
            userReportedInitial.rects[`${problemId}-mat`].x
        ) <= tolerance,
      sourceCueRequiresAlignment:
        leftIsLarger
          ? beforeManipulation.rects[`${problemId}-right-strip`].right -
              beforeManipulation.rects[`${problemId}-left-strip`].right >=
            8
          : beforeManipulation.rects[`${problemId}-left-strip`].right -
              beforeManipulation.rects[`${problemId}-right-strip`].right >=
            8,
      leftStripMovedToLane:
        Math.abs(
          afterManipulation.rects[`${problemId}-left-strip`].x -
            afterManipulation.rects[`${problemId}-left-lane-surface`].x
        ) <= 4,
      rightStripMovedToLane:
        Math.abs(
          afterManipulation.rects[`${problemId}-right-strip`].x -
            afterManipulation.rects[`${problemId}-right-lane-surface`].x
        ) <= 4,
      symbolMovedToSlot:
        intersectionArea(
          afterManipulation.rects[`${problemId}-${symbolKind}-symbol`],
          afterManipulation.rects[`${problemId}-relation-slot-surface`]
        ) > 0,
      movedStripsDoNotCoverFixedText: movedStripAfterIds.every((stripId) =>
        fixedTextAfterIds.every(
          (textId) =>
            intersectionArea(
              afterManipulation.rects[stripId],
              afterManipulation.rects[textId]
            ) === 0
        )
      ),
      symbolDoesNotCoverRelationFractions: [
        `${problemId}-relation-left-fraction-card`,
        `${problemId}-relation-right-fraction-card`
      ].every(
        (cardId) =>
          intersectionArea(
            afterManipulation.rects[`${problemId}-${symbolKind}-symbol`],
            afterManipulation.rects[cardId]
          ) === 0
      ),
      responseTextEntered: inputText === reason,
      responseTextInsideSurface: contained(
        afterManipulation.rects[`${problemId}-explanation-input-surface`],
        afterManipulation.rects[`${problemId}-explanation-input`]
      )
    };
    manipulation = {
      skipped: false,
      assertions: manipulationAssertions,
      failedAssertions: Object.entries(manipulationAssertions)
        .filter(([, passed]) => !passed)
        .map(([name]) => name),
      beforeViewport: beforeManipulation.viewport,
      afterViewport: afterManipulation.viewport,
      before: beforeManipulation.rects,
      after: afterManipulation.rects,
      inputText
    };
    await page.screenshot({
      path: resolve(
        outputDirectory,
        "user-reported-1630x1122-after-manipulation.png"
      ),
      fullPage: false
    });
  }

  const report = {
    editorUrl,
    problemId,
    checkedAt: new Date().toISOString(),
    results,
    manipulation,
    passed:
      results.every((result) => result.failedAssertions.length === 0) &&
      manipulation.failedAssertions.length === 0
  };
  writeFileSync(
    resolve(outputDirectory, "metrics.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        viewportFailures: results.map((result) => ({
          name: result.name,
          failedAssertions: result.failedAssertions
        })),
        manipulationFailures: manipulation.failedAssertions,
        inputText
      },
      null,
      2
    )
  );
  if (!report.passed) process.exitCode = 1;
} finally {
  await context.close();
}
