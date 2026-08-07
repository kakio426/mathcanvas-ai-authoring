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
        "844dd2349fa73213fc9425073a1a799bd42c486c95c9b3c772ea9eb93ad6f900"
      )
    ).toMatchObject({ reviewer: "owner-loop-visual-qa" });
  });
});
