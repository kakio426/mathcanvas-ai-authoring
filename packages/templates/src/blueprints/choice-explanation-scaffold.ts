export const CHOICE_CARD_ROLES = [
  "position-card-1",
  "position-card-2",
  "position-card-3",
  "position-card-4",
  "position-card-5"
] as const;

export const CHOICE_VALUE_PATHS = [
  "candidate1",
  "candidate2",
  "candidate3",
  "candidate4",
  "candidate5"
] as const;

export const layoutBlock = (
  id: string,
  kind: "band" | "row" | "slot",
  preset: string,
  repeat: "once" | "each-item",
  collisionGroup?: string,
  flowGroup?: string
) => ({
  id,
  kind,
  preset,
  repeat,
  ...(collisionGroup ? { collisionGroup } : {}),
  ...(flowGroup ? { flowGroup } : {}),
  children: []
});

const choiceBackdropRole = (index: number) => ({
  role: `position-card-${index}-backdrop`,
  scope: "each-item" as const,
  layoutRole: `position-card-${index}-backdrop`,
  idRole: `position-card-${index}-backdrop`,
  toolKey: "common.rectangle",
  intentKind: "draw-rectangle" as const,
  locked: true,
  movable: false,
  instructionalIntent:
    "서로 다른 생각을 한눈에 구별하도록 카드 테두리를 제공합니다.",
  properties: { fill: "#F7FAFD", stroke: "#8291A7" },
  bindings: {},
  containerRole: "choice-panel"
});

const choiceCardRole = (
  index: number,
  fontSize = 32,
  candidateCount = 5
) => ({
  role: `position-card-${index}`,
  scope: "each-item" as const,
  layoutRole: `position-card-${index}`,
  idRole: `position-card-${index}`,
  toolKey: "common.formula",
  intentKind: "latex" as const,
  locked: false,
  movable: true,
  instructionalIntent:
    candidateCount === 5
      ? "오개념을 포함한 다섯 생각 중 하나를 먼저 고르게 합니다."
      : "오개념을 포함한 네 생각 중 하나를 먼저 고르게 합니다.",
  properties: { text: "", fontSize },
  bindings: { text: `item.candidate${index}Latex` },
  containerRole: "choice-panel"
});

export function makeChoiceExplanationScaffoldRoles(input: {
  readonly instructions: readonly [string, string, string];
  readonly instructionalIntents: readonly [string, string, string];
  readonly questionIntent: string;
  readonly predictionLabel: string;
  readonly poolLabel: string;
  readonly explanationLabel: string;
  readonly candidateCount?: 4 | 5;
  readonly centerCandidates?: boolean;
  readonly fontSizes?: {
    readonly instruction?: number;
    readonly question?: number;
    readonly label?: number;
    readonly candidate?: number;
  };
}) {
  const candidateRoles = CHOICE_CARD_ROLES.slice(
    0,
    input.candidateCount ?? CHOICE_CARD_ROLES.length
  );
  return [
    ...input.instructions.map((text, index) => ({
      role: [
        "instruction-predict",
        "instruction-verify",
        "instruction-explain"
      ][index]!,
      scope: "activity" as const,
      layoutRole: [
        "instruction-predict",
        "instruction-verify",
        "instruction-explain"
      ][index]!,
      idRole: [
        "instruction-predict",
        "instruction-verify",
        "instruction-explain"
      ][index]!,
      toolKey: "common.text",
      intentKind: "text" as const,
      locked: true,
      movable: false,
      instructionalIntent: input.instructionalIntents[index]!,
      properties: {
        text,
        fontSize: input.fontSizes?.instruction ?? 31
      },
      bindings: {}
    })),
    {
      role: "work-panel",
      scope: "each-item" as const,
      layoutRole: "work-panel",
      idRole: "work-panel",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle" as const,
      locked: true,
      movable: false,
      instructionalIntent:
        "한 문항의 선택, 조작, 설명 영역을 묶습니다.",
      properties: { fill: "none", stroke: "#65758B" },
      bindings: {}
    },
    {
      role: "number",
      scope: "each-item" as const,
      layoutRole: "number",
      idRole: "number",
      toolKey: "common.text",
      intentKind: "text" as const,
      locked: true,
      movable: false,
      instructionalIntent: "문항 순서를 표시합니다.",
      properties: { text: "", fontSize: 28 },
      bindings: { text: "item.orderLabel" },
      containerRole: "work-panel"
    },
    {
      role: "question",
      scope: "each-item" as const,
      layoutRole: "question",
      idRole: "question",
      toolKey: "common.text",
      intentKind: "text" as const,
      locked: true,
      movable: false,
      instructionalIntent: input.questionIntent,
      properties: {
        text: "",
        fontSize: input.fontSizes?.question ?? 27
      },
      bindings: { text: "item.questionText" },
      containerRole: "work-panel"
    },
    {
      role: "prediction-label",
      scope: "each-item" as const,
      layoutRole: "prediction-label",
      idRole: "prediction-label",
      toolKey: "common.text",
      intentKind: "text" as const,
      locked: true,
      movable: false,
      instructionalIntent: "조작 전에 고른 답을 놓을 곳을 알립니다.",
      properties: {
        text: input.predictionLabel,
        fontSize: input.fontSizes?.label ?? 23
      },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "prediction-box",
      scope: "each-item" as const,
      layoutRole: "prediction-box",
      idRole: "prediction-box",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle" as const,
      locked: true,
      movable: false,
      instructionalIntent: "학생이 처음 고른 답을 남기는 빈 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#65758B",
        strokeDashArray: "8 6"
      },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "choice-panel",
      scope: "each-item" as const,
      layoutRole: "choice-panel",
      idRole: "choice-panel",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle" as const,
      locked: true,
      movable: false,
      instructionalIntent:
        candidateRoles.length === 5
          ? "서로 다른 다섯 생각을 한데 묶습니다."
          : "서로 다른 네 생각을 한데 묶습니다.",
      properties: { fill: "#FFFFFF", stroke: "#B2BFCE" },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "pool-label",
      scope: "each-item" as const,
      layoutRole: "pool-label",
      idRole: "pool-label",
      toolKey: "common.text",
      intentKind: "text" as const,
      locked: true,
      movable: false,
      instructionalIntent: "학생이 고를 수 있는 답을 안내합니다.",
      properties: {
        text: input.poolLabel,
        fontSize: input.fontSizes?.label ?? 23
      },
      bindings: {},
      containerRole: "choice-panel"
    },
    ...candidateRoles.map((_, index) =>
      choiceBackdropRole(index + 1)
    ),
    ...candidateRoles.map((_, index) => {
      const role = choiceCardRole(
        index + 1,
        input.fontSizes?.candidate,
        candidateRoles.length
      );
      return input.centerCandidates
        ? {
            ...role,
            properties: {
              ...role.properties,
              centerInPlacement: true
            }
          }
        : role;
    }),
    {
      role: "explanation-label",
      scope: "each-item" as const,
      layoutRole: "explanation-label",
      idRole: "explanation-label",
      toolKey: "common.text",
      intentKind: "text" as const,
      locked: true,
      movable: false,
      instructionalIntent: "조작으로 확인한 까닭을 쓰게 합니다.",
      properties: {
        text: input.explanationLabel,
        fontSize: input.fontSizes?.label ?? 23
      },
      bindings: {},
      containerRole: "work-panel"
    },
    {
      role: "explanation-box",
      scope: "each-item" as const,
      layoutRole: "explanation-box",
      idRole: "explanation-box",
      toolKey: "common.rectangle",
      intentKind: "draw-rectangle" as const,
      locked: true,
      movable: false,
      instructionalIntent:
        "처음 생각을 고친 까닭과 확인한 관계를 쓰는 빈 영역입니다.",
      properties: {
        fill: "#FFFFFF",
        stroke: "#65758B",
        strokeDashArray: "8 6"
      },
      bindings: {},
      containerRole: "work-panel"
    }
  ];
}

export function makeChoiceExplanationScaffoldLayoutChildren(
  candidateCount: number = CHOICE_CARD_ROLES.length
) {
  const candidateRoles = CHOICE_CARD_ROLES.slice(0, candidateCount);
  return [
    layoutBlock("instruction-predict", "row", "header.primary", "once"),
    layoutBlock("instruction-verify", "row", "header.secondary", "once"),
    layoutBlock("instruction-explain", "row", "header.tertiary", "once"),
    layoutBlock("work-panel", "slot", "item.panel", "each-item"),
    layoutBlock("number", "slot", "item.number", "each-item"),
    layoutBlock("question", "slot", "item.question", "each-item"),
    layoutBlock(
      "prediction-label",
      "slot",
      "item.prediction-label",
      "each-item"
    ),
    layoutBlock(
      "prediction-box",
      "slot",
      "item.prediction-box",
      "each-item"
    ),
    layoutBlock("choice-panel", "band", "item.choice-panel", "each-item"),
    layoutBlock("pool-label", "slot", "item.pool-label", "each-item"),
    ...candidateRoles.map((role) =>
      layoutBlock(
        `${role}-backdrop`,
        "slot",
        `item.${role}-backdrop`,
        "each-item"
      )
    ),
    ...candidateRoles.map((role) =>
      layoutBlock(
        role,
        "slot",
        `item.${role}`,
        "each-item",
        "position-pool"
      )
    ),
    layoutBlock(
      "explanation-label",
      "slot",
      "item.explanation-label",
      "each-item"
    ),
    layoutBlock(
      "explanation-box",
      "slot",
      "item.explanation-box",
      "each-item"
    )
  ];
}
