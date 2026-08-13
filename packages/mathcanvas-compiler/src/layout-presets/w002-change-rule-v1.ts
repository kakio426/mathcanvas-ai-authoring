import type { LayoutPreset } from "@mathcanvas/contracts";

export const W002_CHANGE_RULE_TOKEN_SET = "w002-change-rule-v1" as const;

export const W002_CHANGE_RULE_TARGET_ROLES = [
  "rule-control-start",
  "rule-control-step",
  "rule-control-direction",
  "sequence-term-1",
  "sequence-term-2",
  "sequence-term-3",
  "sequence-term-4",
  "repair-target"
] as const;

const STATE_ORDER_BY_POOL = [
  ["inc-1-by-1", "dec-8-by-1", "inc-3-by-2", "dec-6-by-2"],
  ["dec-6-by-2", "inc-3-by-2", "dec-8-by-1", "inc-1-by-1"],
  ["inc-3-by-2", "inc-1-by-1", "dec-6-by-2", "dec-8-by-1"],
  ["dec-8-by-1", "dec-6-by-2", "inc-1-by-1", "inc-3-by-2"],
  ["inc-1-by-1", "dec-6-by-2", "dec-8-by-1", "inc-3-by-2"],
  ["inc-3-by-2", "dec-8-by-1", "dec-6-by-2", "inc-1-by-1"],
  ["dec-6-by-2", "inc-1-by-1", "inc-3-by-2", "dec-8-by-1"],
  ["dec-8-by-1", "inc-3-by-2", "inc-1-by-1", "dec-6-by-2"]
] as const;

const SOURCE_POOL_IDS = [
  "rule-start",
  "rule-step",
  "rule-direction",
  "sequence-0",
  "sequence-1",
  "sequence-2",
  "sequence-3",
  "repair"
] as const;

export const W002_CHANGE_RULE_SOURCE_ROLE_IDS = SOURCE_POOL_IDS.flatMap(
  (poolId, poolIndex) =>
    STATE_ORDER_BY_POOL[poolIndex]!.map(
      (stateId) => `change-${poolId}-${stateId}`
    )
);

const sourceTokens = Object.fromEntries(
  W002_CHANGE_RULE_SOURCE_ROLE_IDS.map((role, index) => {
    const column = Math.floor(index / 4);
    const row = index % 4;
    return [
      `item.${role}`,
      {
        scope: "item" as const,
        x: 130 + column * 340,
        y: 570 + row * 100,
        width: 80,
        height: 80
      }
    ];
  })
);

/**
 * v15 ENGINE_CORE 전용 배치. 8개의 의미별 pool마다 네 state 카드를
 * 독립 순서로 놓아 같은 행이 하나의 완성 규칙을 암시하지 않게 한다.
 */
export const w002ChangeRuleLayoutPreset: LayoutPreset = {
  itemOriginY: 340,
  itemPitch: 1740,
  canvasBaseHeight: 500,
  minGap: 20,
  tokens: {
    "canvas.root": { scope: "canvas", x: 0, y: 0, width: 3000, height: 500 },
    "header.primary": { scope: "canvas", x: 180, y: 44, width: 2640, height: 58 },
    "header.secondary": { scope: "canvas", x: 180, y: 124, width: 2640, height: 58 },
    "header.tertiary": { scope: "canvas", x: 180, y: 204, width: 2640, height: 58 },
    "item.panel": { scope: "item", x: 50, y: 20, width: 2900, height: 1640 },
    "item.number": { scope: "item", x: 90, y: 42, width: 90, height: 44 },
    "item.question": { scope: "item", x: 220, y: 36, width: 2600, height: 66 },
    "item.rule-state-panel": { scope: "item", x: 90, y: 130, width: 820, height: 330 },
    "item.rule-control-start": { scope: "item", x: 130, y: 220, width: 188, height: 188 },
    "item.rule-control-step": { scope: "item", x: 386, y: 220, width: 188, height: 188 },
    "item.rule-control-direction": { scope: "item", x: 642, y: 220, width: 188, height: 188 },
    "item.sequence-panel": { scope: "item", x: 970, y: 130, width: 1190, height: 330 },
    "item.sequence-term-1": { scope: "item", x: 1010, y: 220, width: 188, height: 188 },
    "item.sequence-term-2": { scope: "item", x: 1248, y: 220, width: 188, height: 188 },
    "item.sequence-term-3": { scope: "item", x: 1486, y: 220, width: 188, height: 188 },
    "item.sequence-term-4": { scope: "item", x: 1724, y: 220, width: 188, height: 188 },
    "item.repair-panel": { scope: "item", x: 2220, y: 130, width: 500, height: 330 },
    "item.repair-target": { scope: "item", x: 2376, y: 220, width: 188, height: 188 },
    "item.source-panel": { scope: "item", x: 90, y: 520, width: 2820, height: 460 },
    ...sourceTokens,
    "item.prediction-label": { scope: "item", x: 130, y: 1040, width: 720, height: 42 },
    "item.prediction-box": { scope: "item", x: 130, y: 1090, width: 1220, height: 220 },
    "item.explanation-label": { scope: "item", x: 1510, y: 1040, width: 720, height: 42 },
    "item.explanation-box": { scope: "item", x: 1510, y: 1090, width: 1220, height: 360 }
  }
};
