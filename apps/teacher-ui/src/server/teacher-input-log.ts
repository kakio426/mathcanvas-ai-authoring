import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { ProblemParameters, TeacherIntent } from "@mathcanvas/contracts";

export interface TeacherInputLogEntry {
  at: string;
  unitId: string;
  standardCode: string;
  activityId: string;
  learningNeedId: string;
  problemCount: number;
  contextNote: string;
  problemParameters?: ProblemParameters;
  teacherIntent?: TeacherIntent;
  supported: boolean;
}

export async function appendTeacherInputLog(
  path: string,
  entry: TeacherInputLogEntry
): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await appendFile(path, `${JSON.stringify(entry)}\n`, {
      encoding: "utf8",
      mode: 0o600
    });
  } catch {
    // 1인 실사용 기록 실패가 교사의 추천 흐름을 막아서는 안 된다.
  }
}
