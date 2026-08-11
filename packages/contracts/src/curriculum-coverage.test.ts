import { describe, expect, it } from "vitest";
import {
  ELEMENTARY_CURRICULUM_FIXTURE_SCHEMA_VERSION,
  officialElementaryStandardsFixtureSchema
} from "./curriculum-coverage.js";

const source = {
  sourceId: "kr-moe-2022-33-annex-8-elementary-math" as const,
  title: "교육부 고시 제2022-33호 [별책 8] 수학과 교육과정" as const,
  noticeUrl: "https://example.com/notice",
  hwpDownloadUrl: "https://example.com/source.zip",
  pdfDownloadUrl: "https://example.com/source.pdf",
  noticeDate: "2022-12-22",
  reviewedAt: "2026-08-11T01:50:00.000Z",
  reviewer: "fixture schema test",
  hwpArchiveSha256: "1".repeat(64),
  hwpDocumentSha256: "2".repeat(64),
  pdfSha256: "3".repeat(64),
  sourceTextIncluded: false as const,
  extractionNote: "독립된 두 공식 형식의 코드를 대조했다."
};

function fixture(standards: unknown[]) {
  return {
    schemaVersion: ELEMENTARY_CURRICULUM_FIXTURE_SCHEMA_VERSION,
    source,
    standards
  };
}

const standard = {
  code: "[2수01-01]",
  gradeBand: "1-2",
  domain: "수와 연산",
  officialGoal: "0과 100까지의 수 개념을 이해한다.",
  sourceLocator: "[별책 8] > [2수01-01]",
  verificationStatus: "official-text-verified",
  reviewedAt: "2026-08-11T01:50:00.000Z",
  reviewer: "fixture schema test"
};

describe("공식 초등 수학 성취기준 fixture 계약", () => {
  it("코드에서 결정되는 학년군과 영역을 강제한다", () => {
    expect(
      officialElementaryStandardsFixtureSchema.safeParse(
        fixture([{ ...standard, gradeBand: "3-4" }])
      ).success
    ).toBe(false);
    expect(
      officialElementaryStandardsFixtureSchema.safeParse(
        fixture([{ ...standard, domain: "도형과 측정" }])
      ).success
    ).toBe(false);
  });

  it("성취기준 코드 중복을 거부한다", () => {
    const parsed = officialElementaryStandardsFixtureSchema.safeParse(
      fixture([standard, standard])
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes("중복"))).toBe(
        true
      );
    }
  });
});
