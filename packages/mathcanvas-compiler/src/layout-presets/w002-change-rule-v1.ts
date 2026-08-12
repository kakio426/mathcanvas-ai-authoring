import type { LayoutPreset } from "@mathcanvas/contracts";

export const W002_CHANGE_RULE_TOKEN_SET = "w002-change-rule-v1" as const;

/**
 * 학생이 시작값·변화량·방향을 선언한 뒤 네 항과 한 수정 항을
 * 동시에 대조할 수 있는 [2수02-02] 변화 규칙 전용 배치다.
 */
export const w002ChangeRuleLayoutPreset: LayoutPreset = {
  itemOriginY: 340,
  itemPitch: 1260,
  canvasBaseHeight: 500,
  minGap: 20,
  tokens: {
    "canvas.root": { scope: "canvas", x: 0, y: 0, width: 3000, height: 500 },
    "header.primary": { scope: "canvas", x: 180, y: 44, width: 2640, height: 58 },
    "header.secondary": { scope: "canvas", x: 180, y: 124, width: 2640, height: 58 },
    "header.tertiary": { scope: "canvas", x: 180, y: 204, width: 2640, height: 58 },
    "item.panel": { scope: "item", x: 50, y: 20, width: 2900, height: 1160 },
    "item.number": { scope: "item", x: 90, y: 42, width: 90, height: 44 },
    "item.question": { scope: "item", x: 220, y: 36, width: 2600, height: 66 },
    "item.rule-state-panel": { scope: "item", x: 90, y: 130, width: 820, height: 330 },
    "item.start-value-control": { scope: "item", x: 130, y: 220, width: 188, height: 188 },
    "item.step-magnitude-control": { scope: "item", x: 386, y: 220, width: 188, height: 188 },
    "item.direction-control": { scope: "item", x: 642, y: 220, width: 188, height: 188 },
    "item.sequence-panel": { scope: "item", x: 970, y: 130, width: 1190, height: 330 },
    "item.sequence-term-1": { scope: "item", x: 1010, y: 220, width: 188, height: 188 },
    "item.sequence-term-2": { scope: "item", x: 1248, y: 220, width: 188, height: 188 },
    "item.sequence-term-3": { scope: "item", x: 1486, y: 220, width: 188, height: 188 },
    "item.sequence-term-4": { scope: "item", x: 1724, y: 220, width: 188, height: 188 },
    "item.repair-panel": { scope: "item", x: 2220, y: 130, width: 500, height: 330 },
    "item.repair-target": { scope: "item", x: 2376, y: 220, width: 188, height: 188 },
    "item.source-panel": { scope: "item", x: 90, y: 900, width: 820, height: 220 },
    "item.rule-source-1": { scope: "item", x: 130, y: 920, width: 188, height: 188 },
    "item.rule-source-2": { scope: "item", x: 386, y: 920, width: 188, height: 188 },
    "item.rule-source-3": { scope: "item", x: 642, y: 920, width: 188, height: 188 },
    "item.prediction-label": { scope: "item", x: 130, y: 520, width: 720, height: 42 },
    "item.prediction-box": { scope: "item", x: 130, y: 570, width: 1220, height: 220 },
    "item.explanation-label": { scope: "item", x: 1510, y: 520, width: 720, height: 42 },
    "item.explanation-box": { scope: "item", x: 1510, y: 570, width: 1220, height: 360 }
  }
};
