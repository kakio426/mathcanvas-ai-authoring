import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findOwnerGeneratedTemplateApproval,
  ownerGeneratedTemplateApprovalsSchema
} from "./owner-generated-approvals.js";

describe("새 자동 제작 템플릿 승인", () => {
  it("과거 프로토타입을 승인으로 간주하지 않는다", () => {
    const approvals = ownerGeneratedTemplateApprovalsSchema.parse(
      JSON.parse(
        readFileSync(
          join(
            process.cwd(),
            "config",
            "owner-generated-template-approvals.json"
          ),
          "utf8"
        )
      )
    );
    expect(approvals.policy).toMatchObject({
      previousPrototypeApprovalAllowed: false,
      freshCanaryRequired: true,
      exactLessonApprovalRequired: true,
      blueprintHashBindingRequired: true
    });
    expect(
      findOwnerGeneratedTemplateApproval(
        approvals,
        "g3s1-multiplication-array-transfer",
        "number.multiplication.group-array-meaning-v1",
        "0".repeat(64)
      )
    ).toBeUndefined();
    expect(
      findOwnerGeneratedTemplateApproval(
        approvals,
        "g3s1-multiplication-array-transfer",
        "number.multiplication.group-array-meaning-v1",
        "4102e64b7b440b80b57c93fc2ab05697e12c36453e2081f11ceee9033735485e"
      )
    ).toMatchObject({ reviewer: "owner-loop-visual-qa" });
  });
});
