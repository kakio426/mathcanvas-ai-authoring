import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "@mathcanvas/contracts";
import {
  FRACTION_SVG_BY_DENOMINATOR,
  NUMBER_CARD_DIGIT_VARIANTS,
  makeNumberCardObject
} from "@mathcanvas/compiler";
import {
  classifyP3CanaryResult,
  validateP3ReleaseCanaryEvidence
} from "../scripts/contract-lab/validate-p3-release-canary.mjs";
import {
  validateActivityReleaseCanaryEvidence
} from "../scripts/contract-lab/validate-activity-release-canary.mjs";
import {
  divisionProductStaticPayloadIdentity
} from "../scripts/contract-lab/lib/division-product-static-projection.mjs";

const root = resolve(import.meta.dirname, "..");
const sanitizeCli = join(
  root,
  "scripts",
  "contract-lab",
  "sanitize.mjs"
);
const validateCli = join(
  root,
  "scripts",
  "contract-lab",
  "validate-catalog.mjs"
);
const validateControlMatrixCli = join(
  root,
  "scripts",
  "contract-lab",
  "validate-control-matrix.mjs"
);
const validateBundleContractCli = join(
  root,
  "scripts",
  "contract-lab",
  "validate-bundle-contract.mjs"
);
const validateWave1CanaryCli = join(
  root,
  "scripts",
  "contract-lab",
  "validate-wave1-canary.mjs"
);
const validateCommonDrawContractCli = join(
  root,
  "scripts",
  "contract-lab",
  "validate-common-draw-contract.mjs"
);
const validateModuleVariantContractCli = join(
  root,
  "scripts",
  "contract-lab",
  "validate-module-variant-contract.mjs"
);
const validateWave4NumberCardCanaryCli = join(
  root,
  "scripts",
  "contract-lab",
  "validate-wave4-number-card-canary.mjs"
);
const verifyDivisionNativeRubricCli = join(
  root,
  "scripts",
  "contract-lab",
  "verify-division-native-rubric.mjs"
);
const validateDivisionCountingGroupCli = join(
  root,
  "scripts",
  "contract-lab",
  "validate-division-counting-group-canary.mjs"
);

function runNode(arguments_: string[]) {
  return spawnSync(process.execPath, arguments_, {
    cwd: root,
    encoding: "utf8"
  });
}

function rehashCommonDrawObservation(
  observation: {
    integrity: { payloadSha256: string };
  } & Record<string, unknown>
) {
  const { integrity, ...hashInput } = observation;
  integrity.payloadSha256 = sha256Hex(hashInput);
}

describe("P0 contract-lab 격리와 정규화", () => {
  it("나눗셈 고정 payload projection은 editor transient를 제외하고 학생 문구 drift는 보존한다", () => {
    const current = [
      {
        id: "instruction-verify",
        svgId: "input-text",
        text: "② 색종이를 7장씩 가운데로 옮기세요.",
        parent: { observer: null },
        playgroundIndex: 1
      }
    ];
    const serialized = [
      {
        ...current[0],
        parent: { observer: null, editSnapshots: {} },
        playgroundIndex: 99,
        isEyeOn: false
      }
    ];
    const staleInstruction = [
      {
        ...serialized[0],
        text: "② 색종이 7장을 가운데에 모으세요."
      }
    ];
    expect(divisionProductStaticPayloadIdentity(current)).toEqual(
      divisionProductStaticPayloadIdentity(serialized)
    );
    expect(
      divisionProductStaticPayloadIdentity(staleInstruction).sha256
    ).not.toBe(divisionProductStaticPayloadIdentity(current).sha256);

    const serializationTail = [
      {
        id: "static-object",
        svgId: "input-text",
        x: 184.04000000000002,
        fontSize: 30,
        strokeType: 1,
        clickCount: 0
      }
    ];
    const canonicalDecimal = [
      {
        ...serializationTail[0],
        x: 184.04
      }
    ];
    expect(divisionProductStaticPayloadIdentity(serializationTail)).toEqual(
      divisionProductStaticPayloadIdentity(canonicalDecimal)
    );

    for (const [field, value] of [
      ["clickCount", 0.0000004],
      ["strokeType", 1.0000004],
      ["fontSize", 30.0000004],
      ["x", 184.0400004]
    ] as const) {
      const mutated = [
        {
          ...canonicalDecimal[0],
          [field]: value
        }
      ];
      expect(
        divisionProductStaticPayloadIdentity(mutated).sha256,
        `${field} drift must remain observable`
      ).not.toBe(
        divisionProductStaticPayloadIdentity(canonicalDecimal).sha256
      );
    }

    for (const [field, value] of [
      ["clickCount", 0.0000000000000004],
      ["strokeType", 1.0000000000000004],
      ["fontSize", 30.00000000000004]
    ] as const) {
      const mutated = [
        {
          ...canonicalDecimal[0],
          [field]: value
        }
      ];
      expect(
        divisionProductStaticPayloadIdentity(mutated).sha256,
        `${field} epsilon drift must remain exact`
      ).not.toBe(
        divisionProductStaticPayloadIdentity(canonicalDecimal).sha256
      );
    }
  });

  it("나눗셈 schema 2 출시 증거를 공통 cognitive envelope로 정규화한다", () => {
    const evidence = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "division-counting-group-canary.json"
        ),
        "utf8"
      )
    );
    expect(
      validateActivityReleaseCanaryEvidence(evidence)
    ).toMatchObject({
      blueprintId:
        "number.division.quotient-remainder.claim-evidence-v1",
      status: "pass",
      releaseQualified: true
    });

    const unreleased = structuredClone(evidence);
    unreleased.releaseQualified = false;
    expect(() =>
      validateActivityReleaseCanaryEvidence(unreleased)
    ).toThrow("activity-release-canary-evidence-shape-invalid");
  });

  it("division native verifier는 후보를 겹친 의미 probe를 거부한다", () => {
    const temporary = mkdtempSync(
      join(root, ".mathcanvas-contract-lab", "division-native-rubric-")
    );
    try {
      const rubric = JSON.parse(
        readFileSync(
          join(
            root,
            "research",
            "mathcanvas",
            "division-native-candidate-rubric.json"
          ),
          "utf8"
        )
      ) as {
        liveProbe: { evidence: string[] };
      };
      const semanticProbe = JSON.parse(
        readFileSync(
          join(
            root,
            "research",
            "mathcanvas",
            "division-native-semantic-probe.json"
          ),
          "utf8"
        )
      ) as { isolation: { unknownCandidatesColocated: boolean } };
      semanticProbe.isolation.unknownCandidatesColocated = true;
      const observationPath = join(temporary, "semantic-probe.json");
      const rubricPath = join(temporary, "rubric.json");
      writeFileSync(
        observationPath,
        `${JSON.stringify(semanticProbe)}\n`,
        "utf8"
      );
      rubric.liveProbe.evidence = [relative(root, observationPath)];
      writeFileSync(rubricPath, `${JSON.stringify(rubric)}\n`, "utf8");

      const result = runNode([
        verifyDivisionNativeRubricCli,
        `--input=${rubricPath}`
      ]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "division-native-rubric-linked-semantic-probe-invalid"
      );
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("나눗셈 actual canary는 fixed chrome guard와 보기 line-box 중심 변조를 거부한다", () => {
    const temporary = mkdtempSync(
      join(root, ".mathcanvas-contract-lab", "division-layout-guard-")
    );
    try {
      const evidence = JSON.parse(
        readFileSync(
          join(
            root,
            "research",
            "mathcanvas",
            "division-counting-group-31-by-6-canary.json"
          ),
          "utf8"
        )
      );
      const shifted = structuredClone(evidence);
      for (const state of ["initial", "reopened"]) {
        const record =
          shifted.environment.fixedChromeTaskClearance[state];
        record.taskEnvelopeCssPx.x += 20;
        record.taskSurfacesCssPx.forEach(
          (surface: { bounds: { x: number } }) => {
            surface.bounds.x += 20;
          }
        );
        record.taskClearanceInsideSafeCssPx.left += 20;
        record.taskClearanceInsideSafeCssPx.right -= 20;
      }
      const shiftedPath = join(temporary, "fixed-guard-breach.json");
      writeFileSync(shiftedPath, `${JSON.stringify(shifted)}\n`, "utf8");
      const shiftedResult = runNode([
        validateDivisionCountingGroupCli,
        `--input=${shiftedPath}`
      ]);
      expect(shiftedResult.status).toBe(1);
      expect(shiftedResult.stderr).toContain(
        "division-counting-group-canary-invalid:environment"
      );

      const offCenter = structuredClone(evidence);
      offCenter.environment.classroomTextClearance.metrics
        .choiceLineBoxCenterOffsetsCssPx[0].y = 5;
      const offCenterPath = join(temporary, "line-box-off-center.json");
      writeFileSync(
        offCenterPath,
        `${JSON.stringify(offCenter)}\n`,
        "utf8"
      );
      const offCenterResult = runNode([
        validateDivisionCountingGroupCli,
        `--input=${offCenterPath}`
      ]);
      expect(offCenterResult.status).toBe(1);
      expect(offCenterResult.stderr).toContain(
        "division-counting-group-canary-invalid:environment"
      );

      const profileDrift = structuredClone(evidence);
      for (const state of ["initial", "reopened"]) {
        const record =
          profileDrift.environment.fixedChromeTaskClearance[state];
        record.fixedChrome.top.bounds.height = 32;
        record.fixedSafeCssPx.y = 40;
        record.fixedSafeCssPx.height = 696;
        record.taskClearanceInsideSafeCssPx.top =
          record.taskEnvelopeCssPx.y - 40;
      }
      profileDrift.environment.geometryProfileReference.fixedSafeCssPx = {
        x: 240,
        y: 40,
        width: 976,
        height: 696
      };
      const profileDriftPath = join(
        temporary,
        "coherent-fixed-profile-drift.json"
      );
      writeFileSync(
        profileDriftPath,
        `${JSON.stringify(profileDrift)}\n`,
        "utf8"
      );
      const profileDriftResult = runNode([
        validateDivisionCountingGroupCli,
        `--input=${profileDriftPath}`
      ]);
      expect(profileDriftResult.status).toBe(1);
      expect(profileDriftResult.stderr).toContain(
        "division-counting-group-canary-invalid:environment"
      );

      const screenshotDrift = structuredClone(evidence);
      screenshotDrift.screenshots[0].sha256 = "0".repeat(64);
      const screenshotDriftPath = join(
        temporary,
        "screenshot-hash-drift.json"
      );
      writeFileSync(
        screenshotDriftPath,
        `${JSON.stringify(screenshotDrift)}\n`,
        "utf8"
      );
      const screenshotDriftResult = runNode([
        validateDivisionCountingGroupCli,
        `--input=${screenshotDriftPath}`
      ]);
      expect(screenshotDriftResult.status).toBe(1);
      expect(screenshotDriftResult.stderr).toContain(
        "division-counting-group-canary-invalid:screenshots"
      );

      const missingScreenshot = structuredClone(evidence);
      missingScreenshot.screenshots[0].path =
        ".mathcanvas-contract-lab/previews/wave18/division-counting-group-31-by-6/missing.png";
      const missingScreenshotPath = join(
        temporary,
        "missing-screenshot.json"
      );
      writeFileSync(
        missingScreenshotPath,
        `${JSON.stringify(missingScreenshot)}\n`,
        "utf8"
      );
      const missingScreenshotResult = runNode([
        validateDivisionCountingGroupCli,
        `--input=${missingScreenshotPath}`
      ]);
      expect(missingScreenshotResult.status).toBe(1);
      expect(missingScreenshotResult.stderr).toContain(
        "division-counting-group-canary-invalid:screenshots"
      );
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("나눗셈 actual canary는 그룹 chrome 중첩과 line-box check key 위조를 거부한다", () => {
    const temporary = mkdtempSync(
      join(root, ".mathcanvas-contract-lab", "division-spatial-guard-")
    );
    try {
      const evidence = JSON.parse(
        readFileSync(
          join(
            root,
            "research",
            "mathcanvas",
            "division-counting-group-29-by-7-canary.json"
          ),
          "utf8"
        )
      );
      for (const state of ["current", "reopened"] as const) {
        const overlapped = structuredClone(evidence);
        const spatial =
          state === "current"
            ? overlapped.spatialContractCandidate
            : overlapped.spatialContractCandidate.reopenedSpatial;
        spatial.groupChromeBoxesCssPx[1] = structuredClone(
          spatial.groupChromeBoxesCssPx[0]
        );
        spatial.allGroupChromeBoxesSeparated = true;
        const overlapPath = join(temporary, `${state}-chrome-overlap.json`);
        writeFileSync(
          overlapPath,
          `${JSON.stringify(overlapped)}\n`,
          "utf8"
        );
        const overlapResult = runNode([
          validateDivisionCountingGroupCli,
          `--input=${overlapPath}`
        ]);
        expect(overlapResult.status).toBe(1);
        expect(overlapResult.stderr).toContain(
          "division-counting-group-canary-invalid:spatial-contract-candidate"
        );
      }

      const renamedCheck = structuredClone(evidence);
      const checks =
        renamedCheck.environment.classroomTextClearance.checks;
      checks.choiceTextsCentered = checks.choiceLineBoxesCentered;
      delete checks.choiceLineBoxesCentered;
      const renamedPath = join(temporary, "renamed-line-box-check.json");
      writeFileSync(
        renamedPath,
        `${JSON.stringify(renamedCheck)}\n`,
        "utf8"
      );
      const renamedResult = runNode([
        validateDivisionCountingGroupCli,
        `--input=${renamedPath}`
      ]);
      expect(renamedResult.status).toBe(1);
      expect(renamedResult.stderr).toContain(
        "division-counting-group-canary-invalid:environment"
      );

      const staleStaticResume = structuredClone(evidence);
      const staleSha = sha256Hex(
        "② 색종이 7장을 가운데에 모으세요."
      );
      staleStaticResume.writeBoundary.allowedSaveCountThisExecution = 0;
      staleStaticResume.writeBoundary.priorApprovedSaveObserved = true;
      staleStaticResume.writeBoundary.priorApprovedVersionCount = 1;
      staleStaticResume.writeBoundary.resumedFromPriorApprovedSave = true;
      staleStaticResume.writeBoundary.saveSkippedToAvoidDuplicateWrite = true;
      staleStaticResume.writeBoundary.cumulativeApprovedSaveCount = 1;
      staleStaticResume.learnerFacingStaticPayload.expectedSha256 = staleSha;
      staleStaticResume.learnerFacingStaticPayload.sourceAtStartSha256 =
        staleSha;
      staleStaticResume.learnerFacingStaticPayload.sourceAtStartMatchesExpected =
        true;
      staleStaticResume.learnerFacingStaticPayload.persistedSha256 = staleSha;
      staleStaticResume.learnerFacingStaticPayload.reopenedSha256 = staleSha;
      staleStaticResume.learnerFacingStaticPayload.secondReadSha256 = staleSha;
      const staleStaticPath = join(
        temporary,
        "stale-learner-facing-static-resume.json"
      );
      writeFileSync(
        staleStaticPath,
        `${JSON.stringify(staleStaticResume)}\n`,
        "utf8"
      );
      const staleStaticResult = runNode([
        validateDivisionCountingGroupCli,
        `--input=${staleStaticPath}`
      ]);
      expect(staleStaticResult.status).toBe(1);
      expect(staleStaticResult.stderr).toContain(
        "division-counting-group-canary-invalid:learner-facing-static-payload"
      );
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });

  it("민감 key와 값을 제거하고 같은 입력에서 byte-stable 출력을 만든다", () => {
    const temporary = mkdtempSync(
      join(tmpdir(), "mathcanvas-contract-lab-")
    );
    const rawRoot = join(temporary, "raw");
    const outputRoot = join(temporary, "sanitized");
    const rawPath = join(rawRoot, "input.json");
    const firstPath = join(outputRoot, "first.json");
    const secondPath = join(outputRoot, "second.json");
    const fixture = readFileSync(
      join(
        root,
        "tests",
        "fixtures",
        "contract-lab",
        "raw-sensitive.json"
      ),
      "utf8"
    );
    mkdirSync(rawRoot, { recursive: true });
    writeFileSync(rawPath, fixture, {
      encoding: "utf8",
      flag: "wx"
    });
    const baseArguments = [
      sanitizeCli,
      "--input",
      rawPath,
      "--raw-root",
      rawRoot,
      "--output-root",
      outputRoot
    ];
    const first = runNode([
      ...baseArguments,
      "--output",
      firstPath
    ]);
    const second = runNode([
      ...baseArguments,
      "--output",
      secondPath
    ]);

    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    const firstOutput = readFileSync(firstPath, "utf8");
    expect(firstOutput).toBe(readFileSync(secondPath, "utf8"));
    expect(firstOutput).not.toMatch(
      /teacher@example\.com|super-secret-value|session=secret|account=123|privateProject123/
    );
    expect(firstOutput).toContain("<redacted-email>");
    expect(firstOutput).toContain("<redacted-timestamp>");
    expect(firstOutput).toContain("/ko/view/<redacted-project>");
    expect(firstOutput).toContain("_redactedFields");
  });

  it("raw root 밖의 파일을 읽지 않는다", () => {
    const temporary = mkdtempSync(
      join(tmpdir(), "mathcanvas-contract-lab-path-")
    );
    const rawRoot = join(temporary, "raw");
    const outside = join(temporary, "outside.json");
    const outputRoot = join(temporary, "sanitized");
    writeFileSync(outside, "{}\n", "utf8");

    const result = runNode([
      sanitizeCli,
      "--input",
      outside,
      "--output",
      join(outputRoot, "result.json"),
      "--raw-root",
      rawRoot,
      "--output-root",
      outputRoot
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("허용된 경로 내부");
  });

  it("Wave 2 common draw 읽기 전용 evidence를 검증한다", () => {
    const result = runNode([validateCommonDrawContractCli]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "PASS common draw observation"
    );
    const observation = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "common-draw-contract.observations.json"
        ),
        "utf8"
      )
    ) as {
      drawObservation: {
        wireAccounting: Record<string, number>;
        residualWireShapes: Array<Record<string, unknown>>;
        unresolvedCandidateShapes: unknown[];
      };
    };
    expect(observation.drawObservation.wireAccounting).toEqual({
      totalObjectCount: 31,
      knownReleasedOrWrapperObjectCount: 30,
      catalogMathModuleObjectCount: 1,
      unexplainedResidualObjectCount: 0
    });
    expect(
      observation.drawObservation.residualWireShapes
    ).toEqual([
      expect.objectContaining({
        wireSvgId: "NO01SC-12",
        classification: "catalog-math-module",
        moduleKey: "NO01SC",
        sampleCount: 1
      })
    ]);
    expect(
      observation.drawObservation.unresolvedCandidateShapes
    ).toEqual([]);
  });

  it("Wave 2 evidence의 unknown 누락과 식별 필드를 거부한다", () => {
    const temporary = mkdtempSync(
      join(tmpdir(), "mathcanvas-common-draw-invalid-")
    );
    const observation = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "common-draw-contract.observations.json"
        ),
        "utf8"
      )
    ) as {
      unresolved: Array<Record<string, unknown>>;
      projectId?: string;
    };
    delete observation.unresolved[0]!.unknownReason;
    observation.projectId = "P_private-contract-probe";
    const invalidPath = join(temporary, "invalid.json");
    writeFileSync(
      invalidPath,
      `${JSON.stringify(observation)}\n`,
      "utf8"
    );

    const result = runNode([
      validateCommonDrawContractCli,
      "--input",
      invalidPath,
      "--research-root",
      temporary
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "unknown에는 fields, reason, evidenceIds가 필요합니다."
    );
    expect(result.stderr).toContain(
      "비식별 evidence에 금지된 식별 필드가 있습니다."
    );
  });

  it("Wave 2 전체 객체 회계 누락과 설명 불가능 residual을 거부한다", () => {
    const temporary = mkdtempSync(
      join(tmpdir(), "mathcanvas-common-draw-accounting-")
    );
    const source = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "common-draw-contract.observations.json"
        ),
        "utf8"
      )
    ) as {
      drawObservation: {
        wireAccounting: {
          totalObjectCount: number;
          catalogMathModuleObjectCount: number;
          unexplainedResidualObjectCount: number;
        };
        residualWireShapes: Array<Record<string, unknown>>;
        unresolvedCandidateShapes: Array<Record<string, unknown>>;
      };
    };
    const residual = source.drawObservation.residualWireShapes[0]!;
    residual.classification = "unexplained-residual";
    delete residual.moduleKey;
    source.drawObservation.unresolvedCandidateShapes = [
      structuredClone(residual)
    ];
    source.drawObservation.wireAccounting.totalObjectCount = 30;
    source.drawObservation.wireAccounting.catalogMathModuleObjectCount = 0;
    source.drawObservation.wireAccounting.unexplainedResidualObjectCount = 1;
    const invalidPath = join(temporary, "invalid.json");
    writeFileSync(
      invalidPath,
      `${JSON.stringify(source)}\n`,
      "utf8"
    );

    const result = runNode([
      validateCommonDrawContractCli,
      "--input",
      invalidPath,
      "--research-root",
      temporary
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "source 전체 객체와 residual 분류 회계가 일치하지 않습니다."
    );
    expect(result.stderr).toContain(
      "새 draw 후보가 발견되면 unknown 계약을 재검토해야 합니다."
    );
  });

  it("가짜 catalog module로 residual을 세탁하지 못한다", () => {
    const temporary = mkdtempSync(
      join(tmpdir(), "mathcanvas-common-draw-fake-module-")
    );
    const observation = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "common-draw-contract.observations.json"
        ),
        "utf8"
      )
    ) as {
      integrity: { payloadSha256: string };
      drawObservation: {
        residualWireShapes: Array<Record<string, unknown>>;
      };
    } & Record<string, unknown>;
    const residual = observation.drawObservation.residualWireShapes[0]!;
    residual.wireSvgId = "FAKE99XX-01";
    residual.moduleKey = "FAKE99XX";
    residual.evidenceIds = [
      "research/mathcanvas/tool-catalog.snapshot.json#tool=FAKE99XX"
    ];
    rehashCommonDrawObservation(observation);
    const invalidPath = join(temporary, "invalid.json");
    writeFileSync(invalidPath, `${JSON.stringify(observation)}\n`, "utf8");

    const result = runNode([
      validateCommonDrawContractCli,
      "--input",
      invalidPath,
      "--research-root",
      temporary
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "수학 module residual에는 일치하는 moduleKey와 catalog 근거가 필요합니다."
    );
  });

  it("source wire histogram에서 residual을 숨기지 못한다", () => {
    const temporary = mkdtempSync(
      join(tmpdir(), "mathcanvas-common-draw-hidden-residual-")
    );
    const observation = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "common-draw-contract.observations.json"
        ),
        "utf8"
      )
    ) as {
      integrity: { payloadSha256: string };
      drawObservation: {
        wireAccounting: {
          knownReleasedOrWrapperObjectCount: number;
          catalogMathModuleObjectCount: number;
        };
        residualWireShapes: unknown[];
      };
    } & Record<string, unknown>;
    observation.drawObservation.residualWireShapes = [];
    observation.drawObservation.wireAccounting
      .knownReleasedOrWrapperObjectCount = 31;
    observation.drawObservation.wireAccounting
      .catalogMathModuleObjectCount = 0;
    rehashCommonDrawObservation(observation);
    const invalidPath = join(temporary, "invalid.json");
    writeFileSync(invalidPath, `${JSON.stringify(observation)}\n`, "utf8");

    const result = runNode([
      validateCommonDrawContractCli,
      "--input",
      invalidPath,
      "--research-root",
      temporary
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "source wire histogram의 residual과 상세 분류가 일치해야 합니다."
    );
  });

  it("circle과 point-line 근거를 unresolved 자기참조로 되돌리지 못한다", () => {
    const temporary = mkdtempSync(
      join(tmpdir(), "mathcanvas-common-draw-self-reference-")
    );
    const observation = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "common-draw-contract.observations.json"
        ),
        "utf8"
      )
    ) as {
      integrity: { payloadSha256: string };
      unresolved: Array<{
        stableKey: string;
        evidenceIds: string[];
      }>;
    } & Record<string, unknown>;
    const circle = observation.unresolved.find(
      (entry) => entry.stableKey === "common.circle"
    )!;
    circle.evidenceIds = circle.evidenceIds.map((evidenceId) =>
      evidenceId.endsWith("#key=drawObservation")
        ? "research/mathcanvas/common-draw-contract.observations.json#key=unresolved"
        : evidenceId
    );
    rehashCommonDrawObservation(observation);
    const invalidPath = join(temporary, "invalid.json");
    writeFileSync(invalidPath, `${JSON.stringify(observation)}\n`, "utf8");

    const result = runNode([
      validateCommonDrawContractCli,
      "--input",
      invalidPath,
      "--research-root",
      temporary
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "circle과 point-line은 자기참조가 아닌 drawObservation 근거를 가져야 합니다."
    );
  });

  it("Wave 2 observation builder는 고정 입력에서 byte-stable하다", () => {
    const script = `
      import { readFileSync } from "node:fs";
      import {
        buildCommonDrawObservation,
        extractMathPaletteModuleKeys
      } from "./scripts/contract-lab/lib/common-draw-contract.mjs";
      import { stableJson } from "./scripts/contract-lab/lib/normalize.mjs";
      const catalog = JSON.parse(
        readFileSync(
          "./research/mathcanvas/tool-catalog.snapshot.json",
          "utf8"
        )
      );
      const input = {
        observationDate: "2026-07-29",
        catalogModuleKeys: extractMathPaletteModuleKeys(catalog),
        responses: [{
          status: 200,
          body: {
            contentsJson: [
              { id: "rect", svgId: "drawElem", type: "rect" },
              { id: "count", svgId: "NO01SC-12" }
            ],
            canvasOption: { penElements: [] }
          }
        }]
      };
      const first = stableJson(buildCommonDrawObservation(input));
      const second = stableJson(buildCommonDrawObservation(input));
      if (first !== second) process.exitCode = 1;
      else process.stdout.write("PASS byte-stable common draw observation\\n");
    `;
    const result = runNode([
      "--input-type=module",
      "--eval",
      script
    ]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "PASS byte-stable common draw observation"
    );
  });

  it("Wave 3 pen 정적 계약은 bundle hash에 결속되고 byte-stable하다", () => {
    const script = `
      import { existsSync, readFileSync } from "node:fs";
      import {
        buildPenStaticContract,
        buildWave3PenCanaryPayload,
        validatePenStaticContract
      } from "./scripts/contract-lab/lib/common-draw-contract.mjs";
      import { stableJson } from "./scripts/contract-lab/lib/normalize.mjs";
      const bundleSnapshot = JSON.parse(
        readFileSync(
          "./research/mathcanvas/bundle-contract.snapshot.json",
          "utf8"
        )
      );
      const committed = readFileSync(
        "./research/mathcanvas/pen-contract.static.json",
        "utf8"
      );
      const parsed = JSON.parse(committed);
      const golden = JSON.parse(
        readFileSync(
          "./fixtures/golden/fraction-comparison.p0-v1.json",
          "utf8"
        )
      );
      const canaryPayload = buildWave3PenCanaryPayload(
        golden.results.compiledProject.payload,
        "20260730T000000Z"
      );
      const probePen = canaryPayload.canvasOption.penElements;
      const validation = validatePenStaticContract(parsed, {
        bundle: bundleSnapshot.bundle
      });
      const rawPath =
        "./.mathcanvas-contract-lab/raw/main-bundle.raw.js";
      let byteStable = true;
      if (existsSync(rawPath)) {
        const source = readFileSync(rawPath, "utf8");
        const first = buildPenStaticContract({
          source,
          bundle: bundleSnapshot.bundle
        });
        const second = buildPenStaticContract({
          source,
          bundle: bundleSnapshot.bundle
        });
        byteStable =
          stableJson(first) === stableJson(second) &&
          stableJson(first) === committed;
      }
      if (
        !byteStable ||
        !validation.ok ||
        probePen.length !== 2 ||
        typeof probePen[0].strokeWidth !== "number" ||
        typeof probePen[1].strokeWidth !== "string" ||
        probePen.some((element) => element.isColor !== false) ||
        /function T5t|function P5t|function mct/.test(committed)
      ) {
        process.stderr.write(JSON.stringify(validation.issues));
        process.exitCode = 1;
      } else {
        process.stdout.write("PASS byte-stable pen static contract\\n");
      }
    `;
    const result = runNode([
      "--input-type=module",
      "--eval",
      script
    ]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "PASS byte-stable pen static contract"
    );
  });

  it("Wave 4 계약은 46개 module과 304개 variant를 결정론적으로 덮는다", () => {
    const result = runNode([validateModuleVariantContractCli]);
    const contract = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "module-variant-contract.static.json"
        ),
        "utf8"
      )
    ) as {
      bundle: Record<string, unknown>;
      clusters: Array<{ clusterId: string }>;
      counts: Record<string, number>;
      modules: Array<{
        moduleKey: string;
        staticEvidenceState: string;
        unknown: Array<{ reason: string }>;
        variants: Array<{
          clusterId: string;
          variantId: string;
        }>;
      }>;
    };
    const bundle = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "bundle-contract.snapshot.json"
        ),
        "utf8"
      )
    ) as { bundle: Record<string, unknown> };
    const numberCardEvidence = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "wave4-number-card-canary.roundtrip.json"
        ),
        "utf8"
      )
    ) as {
      tool: { variantIds: string[]; clusterId: string };
      lifecycle: {
        createdObjectCount: number;
        reopenedObjectCount: number;
        objectIdsPreserved: boolean;
        fieldSetCount: number;
        varyingFieldsExcludingPlacementAndSvgId: string[];
      };
      savedWireExample: Record<string, unknown>;
    };
    const digitMapping = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "wave4-number-card-digit-mapping.ui.json"
        ),
        "utf8"
      )
    ) as {
      mapping: Array<{ value: number; variantId: string }>;
    };
    const clusterIds = new Set(
      contract.clusters.map((cluster) => cluster.clusterId)
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "46 modules 304 variants"
    );
    expect(contract.bundle).toEqual(bundle.bundle);
    expect(contract.counts).toEqual({
      modules: 46,
      variants: 304,
      clusters: 79,
      shapeFamilies: 70,
      options: 66
    });
    expect(
      contract.modules.every(
        (module) =>
          module.staticEvidenceState === "captured" &&
          module.unknown.length > 0 &&
          module.unknown.every((entry) => entry.reason.length > 0) &&
          module.variants.every((variant) =>
            clusterIds.has(variant.clusterId)
          )
      )
    ).toBe(true);
    const fractionVariants = new Set(
      contract.modules
        .find((module) => module.moduleKey === "NO03FM")!
        .variants.map((variant) => variant.variantId)
    );
    expect(
      Object.values(FRACTION_SVG_BY_DENOMINATOR).every(
        (variantId) => fractionVariants.has(variantId)
      )
    ).toBe(true);
    expect(numberCardEvidence.tool).toMatchObject({
      clusterId: "cluster:2ac3a9218428cf15",
      variantIds: Array.from(
        { length: 10 },
        (_, index) =>
          `NO04NT-${String(index + 1).padStart(2, "0")}`
      )
    });
    expect(numberCardEvidence.lifecycle).toMatchObject({
      createdObjectCount: 10,
      reopenedObjectCount: 10,
      objectIdsPreserved: true,
      fieldSetCount: 1,
      varyingFieldsExcludingPlacementAndSvgId: []
    });
    expect(digitMapping.mapping).toMatchObject(
      NUMBER_CARD_DIGIT_VARIANTS
    );
    expect(
      makeNumberCardObject(
        { kind: "number-card", toolKey: "NO04NT", value: 0 },
        {
          id: "[redacted-object-id]",
          x: 671.6,
          y: 452,
          width: 80,
          height: 80
        }
      )
    ).toEqual(numberCardEvidence.savedWireExample);
    const wave4Validation = runNode([
      validateWave4NumberCardCanaryCli,
      "--digit-mapping",
      join(
        root,
        "research",
        "mathcanvas",
        "wave4-number-card-digit-mapping.ui.json"
      )
    ]);
    expect(
      wave4Validation.status,
      wave4Validation.stderr
    ).toBe(0);
  });

  it("catalog을 정렬·계수·fingerprint 계산 후 검증한다", () => {
    const fixturePath = join(
      root,
      "tests",
      "fixtures",
      "contract-lab",
      "catalog-valid.json"
    );
    const result = runNode([
      validateCli,
      "--input",
      fixturePath,
      "--print-normalized"
    ]);

    expect(result.status, result.stderr).toBe(0);
    const normalized = JSON.parse(result.stdout) as {
      counts: {
        categories: number;
        tools: number;
        toolsByCategory: Record<string, number>;
      };
      paletteFingerprint: string;
    };
    expect(normalized.counts).toEqual({
      categories: 1,
      tools: 1,
      toolsByCategory: { number: 1 }
    });
    expect(normalized.paletteFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("중복 tool ID, unknown 사유 누락, released 위장을 거부한다", () => {
    const temporary = mkdtempSync(
      join(tmpdir(), "mathcanvas-contract-lab-invalid-")
    );
    const source = JSON.parse(
      readFileSync(
        join(
          root,
          "tests",
          "fixtures",
          "contract-lab",
          "catalog-valid.json"
        ),
        "utf8"
      )
    ) as {
      tools: Array<Record<string, unknown>>;
    };
    const first = source.tools[0]!;
    source.tools = [
      {
        ...first,
        supportState: "released",
        unknowns: []
      },
      {
        ...first,
        stableKey: "fraction-model-copy"
      }
    ];
    const invalidPath = join(temporary, "invalid.json");
    writeFileSync(
      invalidPath,
      `${JSON.stringify(source)}\n`,
      "utf8"
    );

    const result = runNode([
      validateCli,
      "--input",
      invalidPath
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("toolId가 중복");
    expect(result.stderr).toContain("구조화된 unknown 사유");
    expect(result.stderr).toContain("captured 이하");
  });

  it("contract-lab이 제품 public export와 MCP tool 표면에 연결되지 않는다", () => {
    const publicSurface = [
      "packages/contracts/src/index.ts",
      "packages/curriculum/src/index.ts",
      "packages/managed-browser/src/index.ts",
      "packages/mathcanvas-compiler/src/index.ts",
      "packages/planner/src/index.ts",
      "packages/templates/src/index.ts",
      "packages/validator/src/index.ts",
      "apps/mcp-server/src/server.ts"
    ]
      .map((path) => readFileSync(join(root, path), "utf8"))
      .join("\n");

    expect(publicSurface).not.toMatch(
      /contract[-_]lab|capture[-_]palette|tool[-_]catalog/i
    );
  });

  it("모든 catalog 도구와 편집기 제어에 MCP 연결 결정이 있다", () => {
    const result = runNode([validateControlMatrixCli]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "56 tool mappings 18 editor controls"
    );
  });

  it("46개 수학 도구의 bundle variant와 factory coverage가 완전하다", () => {
    const result = runNode([validateBundleContractCli]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "46 tools 304 variants 66 options"
    );
  });

  it("bundle-only module 조정과 matrix bundle count drift를 거부한다", () => {
    const temporary = mkdtempSync(
      join(tmpdir(), "mathcanvas-contract-reconciliation-")
    );
    const catalog = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "tool-catalog.snapshot.json"
        ),
        "utf8"
      )
    );
    const bundle = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "bundle-contract.snapshot.json"
        ),
        "utf8"
      )
    );
    const matrix = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "control-contract.matrix.json"
        ),
        "utf8"
      )
    );
    const catalogPath = join(temporary, "catalog.json");
    const bundlePath = join(temporary, "bundle.json");
    const matrixPath = join(temporary, "matrix.json");
    writeFileSync(catalogPath, JSON.stringify(catalog), "utf8");

    bundle.nonPaletteModules = [];
    writeFileSync(bundlePath, JSON.stringify(bundle), "utf8");
    const invalidBundle = runNode([
      validateBundleContractCli,
      "--research-root",
      temporary,
      "--catalog",
      catalogPath,
      "--snapshot",
      bundlePath
    ]);
    expect(invalidBundle.status).toBe(1);
    expect(invalidBundle.stderr).toContain(
      "registry key 전체를 설명"
    );

    matrix.counts.bundleAnalyzedMathTools = 50;
    writeFileSync(matrixPath, JSON.stringify(matrix), "utf8");
    const invalidMatrix = runNode([
      validateControlMatrixCli,
      "--research-root",
      temporary,
      "--catalog",
      catalogPath,
      "--matrix",
      matrixPath
    ]);
    expect(invalidMatrix.status).toBe(1);
    expect(invalidMatrix.stderr).toContain("실제 합계 46");
  });

  it("현재 골든 canary의 59객체 저장·재열기 증거를 검증한다", () => {
    const result = runNode([validateWave1CanaryCli]);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "PASS wave1 current-golden canary 20260729T103957Z"
    );
  });

  it("canary 복구 한계·도구 수·가시 렌더를 통과로 위장하지 못한다", () => {
    const temporary = mkdtempSync(
      join(tmpdir(), "mathcanvas-canary-evidence-")
    );
    const evidence = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "wave1-current-golden-canary.roundtrip.json"
        ),
        "utf8"
      )
    );
    const artifacts = JSON.parse(
      readFileSync(
        join(
          root,
          "research",
          "mathcanvas",
          "wave1-current-golden-canary.artifacts.json"
        ),
        "utf8"
      )
    );
    const inputPath = join(temporary, "canary.json");
    const artifactsPath = join(temporary, "artifacts.json");
    evidence.provenance.source = "totally-made-up";
    evidence.toolResults[0].submittedObjectCount = 1;
    evidence.writeBoundary.assertedOriginalSaveCount = 2;
    artifacts.render.final.visibleObjectIds.pop();
    writeFileSync(inputPath, JSON.stringify(evidence), "utf8");
    writeFileSync(artifactsPath, JSON.stringify(artifacts), "utf8");

    const result = runNode([
      validateWave1CanaryCli,
      "--research-root",
      temporary,
      "--input",
      inputPath,
      "--artifacts",
      artifactsPath
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "골든과 recovery artifact hash 결속"
    );
    expect(result.stderr).toContain(
      "최종 artifact에서 재계산한 도구 결과"
    );
    expect(result.stderr).toContain(
      "현재 골든의 59개 객체가 모두 보이게"
    );
    expect(result.stderr).toContain(
      "복구 실행은 read-only이고 한계를 명시"
    );
    expect(
      [
        { ok: true },
        { ok: false, errorCode: "auth-required" },
        {
          ok: false,
          errorCode: "contract-probe-unavailable"
        },
        { ok: false, errorCode: "palette-changed" },
        { ok: false, errorCode: "contract-mismatch" },
        { ok: false, errorCode: "project-create-failed" }
      ].map(classifyP3CanaryResult)
    ).toEqual([
      "pass",
      "auth-required",
      "probe-unavailable",
      "palette-changed",
      "contract-mismatch",
      "delivery-failed"
    ]);
    expect(() =>
      validateP3ReleaseCanaryEvidence({
        schemaVersion: "1.0.0",
        probeId: "p3-release-canary-v1",
        observedAt: "2026-07-30T00:00:00.000Z",
        results: Array.from({ length: 3 }, (_, index) => ({
          blueprintId: `blueprint-${index}`,
          status: "pass",
          payloadHash: "a".repeat(64),
          projectReferenceHash: "b".repeat(64),
          editorPath: "/ko/view/<redacted-project>",
          createRequestCount: 1,
          existingProjectWriteCount: index
        })),
        summary: { passCount: 3, overallStatus: "pass" }
      })
    ).toThrow("p3-canary-result-invalid");
  });

  it("커밋된 P3 출시 canary 봉투를 그대로 검증한다", () => {
    const evidence = JSON.parse(
      readFileSync(
        join(root, "research", "mathcanvas", "p3-release-canary.json"),
        "utf8"
      )
    );
    expect(validateP3ReleaseCanaryEvidence(evidence)).toBe(evidence);
  });
});
