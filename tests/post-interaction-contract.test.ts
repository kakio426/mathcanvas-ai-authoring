import { describe, expect, it } from "vitest";
// @ts-expect-error contract-lab 모듈은 배포 코드와 분리된 런타임 JavaScript다.
import * as postInteraction from "../scripts/contract-lab/lib/post-interaction-visual.mjs";

const {
  assertPostInteractionContract,
  measurePostInteractionContract
} = postInteraction;

const target = { x: 100, y: 100, width: 120, height: 80 };
const moved = { x: 120, y: 115, width: 40, height: 30 };

describe("공통 조작 후 품질 계약", () => {
  it("이동·목표 포함·비저장 조건을 한 번에 통과시킨다", () => {
    const interaction = measurePostInteractionContract({
      action: "choose-claim-and-check-evidence",
      moveDistances: [84],
      movedBoxes: [moved],
      targetBoxes: [target],
      correctDecisionPlaced: true,
      transientOnly: true,
      existingProjectWriteCount: 0
    });

    expect(
      assertPostInteractionContract(interaction, {
        expectedAction: "choose-claim-and-check-evidence",
        expectedMovedRoleCount: 1
      })
    ).toEqual(interaction);
  });

  it("움직이지 않은 조작을 실패시킨다", () => {
    const interaction = measurePostInteractionContract({
      action: "choose-claim-and-check-evidence",
      moveDistances: [4],
      movedBoxes: [moved],
      targetBoxes: [target],
      correctDecisionPlaced: true,
      transientOnly: true,
      existingProjectWriteCount: 0
    });

    expect(() => assertPostInteractionContract(interaction)).toThrow(
      "post-interaction-contract-invalid"
    );
  });

  it("목표 밖 배치나 기존 프로젝트 저장을 실패시킨다", () => {
    const interaction = measurePostInteractionContract({
      action: "choose-claim-and-check-evidence",
      moveDistances: [84],
      movedBoxes: [{ ...moved, x: 240 }],
      targetBoxes: [target],
      correctDecisionPlaced: true,
      transientOnly: true,
      existingProjectWriteCount: 1
    });

    expect(() => assertPostInteractionContract(interaction)).toThrow(
      "post-interaction-contract-invalid"
    );
  });
});
