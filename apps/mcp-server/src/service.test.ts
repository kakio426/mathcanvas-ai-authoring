import {
  mkdtempSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CreationJobStore,
  MANAGED_BROWSER_VERSION,
  type BrowserConnection,
  type CreationResult,
  type MathCanvasBrowserRuntime
} from "@mathcanvas/managed-browser";
import {
  writeVerifiedDraftFixture
} from "../../../tests/helpers/verified-draft-fixture.js";
import {
  MathCanvasAuthoringService,
  projectLearnerFacingInstructions
} from "./service.js";

const fixedClock = {
  now: () => new Date("2026-07-29T04:00:00.000Z")
};

class FakeBrowserRuntime implements MathCanvasBrowserRuntime {
  public createCalls = 0;
  public openCalls = 0;
  public closeCalls = 0;

  public constructor(
    public connection: BrowserConnection = {
      runtimeVersion: MANAGED_BROWSER_VERSION,
      state: "ready",
      ready: true,
      checkedAt: fixedClock.now().toISOString(),
      currentUrl: "https://mathcanvas.vivasam.com/ko/myCanvas"
    },
    public creationResult: CreationResult = {
      ok: true,
      completedAt: "2026-07-29T04:00:01.000Z",
      projectId: "P_generated",
      editorUrl: "https://mathcanvas.vivasam.com/ko/view/P_generated"
    }
  ) {}

  public async openWorkspace(): Promise<BrowserConnection> {
    this.openCalls += 1;
    return this.connection;
  }

  public async checkConnection(): Promise<BrowserConnection> {
    return this.connection;
  }

  public async createProject(): Promise<CreationResult> {
    this.createCalls += 1;
    return this.creationResult;
  }

  public async close(): Promise<void> {
    this.closeCalls += 1;
  }
}

function createService(
  runtime = new FakeBrowserRuntime(),
  store = new CreationJobStore(),
  draftSnapshotPath?: string
) {
  return new MathCanvasAuthoringService(
    runtime,
    store,
    fixedClock,
    draftSnapshotPath ? { draftSnapshotPath } : {}
  );
}

function learnerInstructionFixture() {
  const itemId = "instruction-fixture-item";
  return {
    items: [{ id: itemId }],
    instructions: ["기존 공통 안내"],
    emissions: [
      ["instruction-predict", "① 예상하세요."],
      ["instruction-verify", "② 확인하세요."],
      ["instruction-explain", "③ 설명하세요."]
    ].map(([role, text], index) => ({
      id: `instruction-fixture-${index + 1}`,
      role,
      itemId,
      toolIntent: { properties: { text } }
    }))
  } as unknown as Parameters<
    typeof projectLearnerFacingInstructions
  >[0];
}

describe("MCP 서비스 흐름", () => {
  it("v1·v2 저장 draft는 묵시 변환하지 않고 만료 오류로 격리한다", () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-v1-draft-"));
    const snapshotPath = join(directory, "drafts.json");
    for (const version of [1, 2]) {
      writeFileSync(snapshotPath, JSON.stringify({ version, drafts: [] }));
      expect(() =>
        createService(
          new FakeBrowserRuntime(),
          new CreationJobStore(),
          snapshotPath
        )
      ).toThrow("이전 추천안 형식은 만료");
    }
  });

  it("전용 Chrome을 열고 로그인 위치를 정확히 안내한다", async () => {
    const runtime = new FakeBrowserRuntime({
      runtimeVersion: MANAGED_BROWSER_VERSION,
      state: "login-required",
      ready: false,
      checkedAt: fixedClock.now().toISOString(),
      currentUrl: "https://mathcanvas.vivasam.com/ko/myCanvas"
    });
    const status = await createService(runtime).openWorkspace();
    expect(runtime.openCalls).toBe(1);
    expect(runtime.closeCalls).toBe(1);
    expect(status.ready).toBe(false);
    expect(status.message).toContain("전용 Chrome");
    expect(status.message).toContain("내 캔버스");
  });

  it("교사 승인과 동일한 해시로만 출시 활동을 한 번 생성한다", async () => {
    const runtime = new FakeBrowserRuntime();
    const directory = mkdtempSync(
      join(tmpdir(), "mathcanvas-service-verified-")
    );
    const draft = writeVerifiedDraftFixture(
      directory,
      fixedClock.now()
    );
    const service = createService(
      runtime,
      new CreationJobStore(),
      draft.snapshotPath
    );
    await expect(
      service.createNewProject({
        draftId: draft.draftId,
        activitySpecHash: draft.activitySpecHash,
        teacherConfirmed: false
      })
    ).rejects.toThrow("명시적으로 승인");
    await expect(
      service.createNewProject({
        draftId: draft.draftId,
        activitySpecHash: "0".repeat(64),
        teacherConfirmed: true
      })
    ).rejects.toThrow("다릅니다");
    const created = await service.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(created).toMatchObject({
      status: "succeeded",
      projectId: "P_generated",
      editorUrl: "https://mathcanvas.vivasam.com/ko/view/P_generated"
    });
    expect(created.validation.canCreate).toBe(true);
    expect(created.teacherAnswerKey).toHaveLength(4);
    expect(runtime.createCalls).toBe(1);
    const repeated = await service.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(repeated.jobId).toBe(created.jobId);
    expect(runtime.createCalls).toBe(1);
  });

  it("지원하지 않는 요청은 draft를 만들지 않는다", () => {
    const result = createService().recommend({
      prompt: "원의 넓이 활동지를 만들어 주세요."
    });
    expect(result.supported).toBe(false);
    expect(result.draftId).toBeUndefined();
  });

  it("곱셈 TeacherIntent를 실제 첫 문항·정답·추천 echo에 반영한다", () => {
    const teacherIntent = {
      kind: "multiplication-array-v1",
      itemsPerGroup: 4,
      groupCount: 6,
      contextObjectId: "ice-cream",
      misconceptionId: "groups-size-order"
    } as const;
    const result = createService().recommend({
      prompt: "곱셈 배열에서 두 수의 뜻을 확인하는 활동을 만들어 주세요.",
      requestedStandardCode: "[2수01-10]",
      requestedGrade: 3,
      problemCount: 2,
      manipulation: "multiplication-array-choice-drag",
      teacherIntent
    });
    expect(result.supported).toBe(true);
    expect(result.recommendation.teacherIntent).toEqual(teacherIntent);
    expect(result.activitySummary?.problemPreviews[0]).toEqual({
      problemNumber: 1,
      statements: [
        "한 묶음에 아이스크림이 4개씩 있습니다. 6묶음을 나타낸 식은 무엇인가요?"
      ],
      statementSource: "learner-instructions"
    });
    expect(result.teacherAnswerKey?.[0]).toMatchObject({
      problemNumber: 1,
      answer: "4\\times6",
      explanation: expect.stringContaining("4개")
    });
    expect(result.activitySummary?.appliedTeacherIntent).toEqual(
      teacherIntent
    );
  });

  it("나눗셈 TeacherIntent를 23개를 4개씩 묶는 실제 문항과 정답에 반영한다", () => {
    const teacherIntent = {
      kind: "division-grouping-v1",
      totalCount: 23,
      groupSize: 4,
      contextObjectId: "candy",
      misconceptionId: "quotient-remainder-meaning"
    } as const;
    const result = createService().recommend({
      prompt: "사탕 23개를 4개씩 묶는 몫과 나머지 활동을 만들어 주세요.",
      requestedStandardCode: "[4수01-06]",
      requestedGrade: 3,
      manipulation: "claim-evidence-revision-drag",
      teacherIntent
    });
    expect(result.supported).toBe(true);
    expect(result.recommendation).toMatchObject({
      problemCount: 1,
      teacherIntent
    });
    expect(result.activitySummary?.appliedTeacherIntent).toEqual(
      teacherIntent
    );
    expect(result.activitySummary?.problemPreviews[0]).toEqual({
      problemNumber: 1,
      statements: [
        "사탕 23개를 4개씩 묶으면 몇 묶음이고 몇 개가 남을까요?"
      ],
      statementSource: "learner-instructions"
    });
    expect(result.teacherAnswerKey?.[0]).toMatchObject({
      answer: "5묶음, 3개",
      explanation: "4개씩 5묶음은 20개이고 3개가 남습니다."
    });
  });

  it("4명에게 똑같이 나누기를 4개씩 묶기로 침묵 변환하지 않는다", () => {
    expect(() =>
      createService().recommend({
        prompt: "사탕 23개를 4명에게 똑같이 나누게 해 주세요.",
        teacherIntent: {
          kind: "division-grouping-v1",
          totalCount: 23,
          groupSize: 4,
          contextObjectId: "candy",
          misconceptionId: "quotient-remainder-meaning"
        }
      })
    ).toThrowError(
      expect.objectContaining({
        code: "teacher-intent-confirmation-required"
      })
    );
  });

  it("분수 TeacherIntent를 실제 분수 쌍·정답·exact preview에 반영한다", () => {
    const teacherIntent = {
      kind: "fraction-comparison-v1",
      numerator: 3,
      leftDenominator: 4,
      rightDenominator: 5,
      misconceptionId: "denominator-size-only"
    } as const;
    const result = createService().recommend({
      prompt: "3/4과 3/5의 크기를 분수 띠로 비교하게 해 주세요.",
      requestedStandardCode: "[6수01-07]",
      requestedGrade: 5,
      manipulation: "fraction-strip-common-start-drag",
      denominatorRelation: "mixed",
      teacherIntent
    });
    expect(result.supported).toBe(true);
    expect(result.recommendation).toMatchObject({
      problemCount: 4,
      denominatorRelation: "mixed",
      teacherIntent
    });
    expect(result.activitySummary?.appliedTeacherIntent).toEqual(
      teacherIntent
    );
    expect(result.activitySummary?.problemPreviews[0]).toEqual({
      problemNumber: 1,
      statements: ["3/4 ? 3/5"],
      statementSource: "learner-instructions"
    });
    expect(result.teacherAnswerKey?.[0]?.answer).toBe("3/4 > 3/5");
  });

  it("몫과 나머지 추천 요약도 선택된 이야기의 학생용 지시문을 그대로 보여 준다", () => {
    const result = createService().recommend({
      prompt:
        "초등학교 3학년 나눗셈에서 몫과 나머지를 직접 묶어 확인하는 활동지를 만들어 주세요.",
      requestedStandardCode: "[4수01-06]",
      requestedGrade: 3,
      problemCount: 1,
      difficulty: "normal",
      manipulation: "claim-evidence-revision-drag"
    });
    expect(result.supported).toBe(true);
    const instructions = result.activitySummary?.studentInstructions;
    expect(instructions).toHaveLength(3);
    expect(instructions?.[0]).toContain("답 카드 하나");
    expect(instructions?.[1]).toContain("Shift 키로");
    expect(instructions?.[1]).toMatch(
      /② (연필을|색종이를|구슬을) \d+(자루|장|개)씩 가운데로 옮기세요\./
    );
    expect(instructions?.[1]).toContain("오른쪽에 놓으세요.");
    expect(instructions?.[1]).not.toContain("한 묶음만큼");
    expect(instructions?.[2]).not.toContain("남은 물건");
  });

  it("문항별 추천 안내는 exact-one 세 역할만 투영하고 부분 누락·중복·공백은 막는다", () => {
    const valid = learnerInstructionFixture();
    expect(projectLearnerFacingInstructions(valid)).toEqual([
      "① 예상하세요.",
      "② 확인하세요.",
      "③ 설명하세요."
    ]);
    expect(
      projectLearnerFacingInstructions({
        ...valid,
        emissions: []
      })
    ).toEqual(["기존 공통 안내"]);

    const missing = structuredClone(valid);
    missing.emissions = missing.emissions.filter(
      (emission) => emission.role !== "instruction-verify"
    );
    expect(() => projectLearnerFacingInstructions(missing)).toThrow(
      "한 문항의 학생 안내 세 역할"
    );

    const duplicate = structuredClone(valid);
    duplicate.emissions.push({
      ...structuredClone(duplicate.emissions[0]!),
      id: "instruction-fixture-duplicate"
    });
    expect(() => projectLearnerFacingInstructions(duplicate)).toThrow(
      "한 문항의 학생 안내 세 역할"
    );

    const blank = structuredClone(valid);
    blank.emissions[1]!.toolIntent.properties.text = "   ";
    expect(() => projectLearnerFacingInstructions(blank)).toThrow(
      "누락되거나 중복"
    );

    const foreignItem = structuredClone(valid);
    foreignItem.emissions.push({
      ...structuredClone(foreignItem.emissions[1]!),
      id: "instruction-fixture-foreign",
      itemId: "ghost-item"
    });
    expect(() => projectLearnerFacingInstructions(foreignItem)).toThrow(
      "한 문항의 학생 안내 세 역할"
    );
  });

  it("브라우저 실패 코드를 교사가 행동할 수 있는 안내로 바꾼다", async () => {
    const runtime = new FakeBrowserRuntime(undefined, {
      ok: false,
      completedAt: "2026-07-29T04:00:01.000Z",
      errorCode: "login-required",
      httpStatus: 401
    });
    const directory = mkdtempSync(
      join(tmpdir(), "mathcanvas-service-browser-failure-")
    );
    const draft = writeVerifiedDraftFixture(
      directory,
      fixedClock.now()
    );
    const service = createService(
      runtime,
      new CreationJobStore(),
      draft.snapshotPath
    );
    const created = await service.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(created.status).toBe("failed");
    expect(service.getJobStatus(created.jobId).message).toContain(
      "다시 로그인"
    );
    expect(runtime.createCalls).toBe(1);
  });

  it("로그인 실패 뒤 같은 추천안으로 다시 생성할 수 있다", async () => {
    const runtime = new FakeBrowserRuntime(undefined, {
      ok: false,
      completedAt: "2026-07-29T04:00:01.000Z",
      errorCode: "login-required",
      httpStatus: 401
    });
    const directory = mkdtempSync(
      join(tmpdir(), "mathcanvas-service-retry-")
    );
    const draft = writeVerifiedDraftFixture(
      directory,
      fixedClock.now()
    );
    const service = createService(
      runtime,
      new CreationJobStore(),
      draft.snapshotPath
    );
    const first = await service.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(first.status).toBe("failed");

    runtime.creationResult = {
      ok: true,
      completedAt: "2026-07-29T04:00:02.000Z",
      projectId: "P_retry",
      editorUrl: "https://mathcanvas.vivasam.com/ko/view/P_retry"
    };
    const retried = await service.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(retried).toMatchObject({
      status: "succeeded",
      projectId: "P_retry"
    });
    expect(retried.activitySpecHash).toBe(draft.activitySpecHash);
    expect(retried.teacherAnswerKey).toEqual(first.teacherAnswerKey);
    expect(runtime.createCalls).toBe(2);
  });

  it("서버 재시작 뒤 같은 승인 결과를 다시 외부 쓰기 하지 않는다", async () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-managed-jobs-"));
    const jobSnapshotPath = join(directory, "creation-jobs.json");
    const firstRuntime = new FakeBrowserRuntime();
    const draft = writeVerifiedDraftFixture(
      directory,
      fixedClock.now()
    );
    const firstService = createService(
      firstRuntime,
      new CreationJobStore({ snapshotPath: jobSnapshotPath }),
      draft.snapshotPath
    );
    const created = await firstService.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(firstRuntime.createCalls).toBe(1);

    const restartedRuntime = new FakeBrowserRuntime();
    const restartedService = createService(
      restartedRuntime,
      new CreationJobStore({ snapshotPath: jobSnapshotPath }),
      draft.snapshotPath
    );
    const repeated = await restartedService.createNewProject({
      draftId: draft.draftId,
      activitySpecHash: draft.activitySpecHash,
      teacherConfirmed: true
    });
    expect(repeated.jobId).toBe(created.jobId);
    expect(repeated.projectId).toBe("P_generated");
    expect(restartedRuntime.createCalls).toBe(0);
  });

  it("저장된 추천안이 바뀌면 재시작 중 격리한다", () => {
    const directory = mkdtempSync(join(tmpdir(), "mathcanvas-tamper-"));
    const draft = writeVerifiedDraftFixture(
      directory,
      fixedClock.now()
    );
    const snapshot = JSON.parse(
      readFileSync(draft.snapshotPath, "utf8")
    ) as {
      drafts: Array<{
        resolved: {
          title: string;
        };
      }>;
    };
    snapshot.drafts[0]!.resolved.title = "바뀐 활동지";
    writeFileSync(draft.snapshotPath, JSON.stringify(snapshot));

    const runtime = new FakeBrowserRuntime();
    expect(() =>
      createService(
        runtime,
        new CreationJobStore(),
        draft.snapshotPath
      )
    ).toThrow("올바르지 않습니다");
    expect(runtime.createCalls).toBe(0);
  });
});
