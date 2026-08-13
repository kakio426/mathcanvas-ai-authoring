import { describe, expect, it } from "vitest";
import { SESSION_TTL_MS, TeacherSessionStore } from "./session.js";

describe("teacher preparation desk session", () => {
  it("교사가 수업일 동안 열어 둔 책상을 유지하고 12시간 뒤에는 닫는다", () => {
    const store = new TeacherSessionStore();
    const openedAt = Date.UTC(2026, 7, 14, 8, 0, 0);
    const session = store.create(openedAt);
    expect(SESSION_TTL_MS).toBe(12 * 60 * 60 * 1000);
    expect(store.get(session.id, openedAt + 8 * 60 * 60 * 1000)).toBe(session);
    expect(store.get(session.id, openedAt + 21 * 60 * 60 * 1000)).toBeUndefined();
  });
});
