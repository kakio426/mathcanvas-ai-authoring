import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendTeacherInputLog } from "./teacher-input-log.js";

describe("교사 입력 로컬 로그", () => {
  it("유효 추천 한 번마다 JSONL 한 줄을 덧붙인다", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "teacher-input-log-")), "log.jsonl");
    const base = {
      at: "2026-08-10T00:00:00.000Z",
      unitId: "unit-1",
      standardCode: "[2수01-10]",
      activityId: "number.multiplication.group-array-meaning-v1",
      learningNeedId: "meaning-order",
      problemCount: 2,
      contextNote: "",
      supported: true
    };
    await appendTeacherInputLog(path, base);
    await appendTeacherInputLog(path, {
      ...base,
      at: "2026-08-10T00:01:00.000Z",
      contextNote: "수업 메모",
      teacherIntent: {
        kind: "multiplication-array-v1",
        itemsPerGroup: 4,
        groupCount: 6,
        contextObjectId: "ice-cream",
        misconceptionId: "groups-size-order"
      }
    });

    const lines = readFileSync(path, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => JSON.parse(line) as unknown)).toEqual([
      base,
      {
        ...base,
        at: "2026-08-10T00:01:00.000Z",
        contextNote: "수업 메모",
        teacherIntent: {
          kind: "multiplication-array-v1",
          itemsPerGroup: 4,
          groupCount: 6,
          contextObjectId: "ice-cream",
          misconceptionId: "groups-size-order"
        }
      }
    ]);
  });

  it("기록 실패를 추천 오류로 전파하지 않는다", async () => {
    const directory = mkdtempSync(join(tmpdir(), "teacher-input-log-failure-"));
    const fileAsDirectory = join(directory, "file");
    writeFileSync(fileAsDirectory, "not-a-directory");
    await expect(
      appendTeacherInputLog(join(fileAsDirectory, "log.jsonl"), {
        at: "2026-08-10T00:00:00.000Z",
        unitId: "unit-1",
        standardCode: "[2수01-10]",
        activityId: "activity-1",
        learningNeedId: "need-1",
        problemCount: 2,
        contextNote: "",
        supported: false
      })
    ).resolves.toBeUndefined();
  });
});
