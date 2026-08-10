#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  MATHCANVAS_PROJECT_CATEGORIES
} from "../../packages/contracts/dist/index.js";
import {
  compileNativeTool
} from "../../packages/mathcanvas-compiler/dist/index.js";
import {
  repositoryRoot,
  resolveStateDirectory
} from "./lib/paths.mjs";
import { createLiveAuthHeadlessSession } from "./lib/live-auth-headless.mjs";
import { assertLegacyHtml30WriterDisabled } from "../hooks/mathcanvas-harness-guard.mjs";

assertLegacyHtml30WriterDisabled("create-eduitit-html30-projects");

const origin = "https://mathcanvas.vivasam.com";
const harnessPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-prompt-harness.json"
);
const rawDiscoveryPath = join(
  repositoryRoot,
  ".mathcanvas-contract-lab/raw/r5-native-tool-discovery.raw.json"
);
const manifestPath = join(
  repositoryRoot,
  "research/mathcanvas/eduitit-html30-created-projects.json"
);

const specs = [
  [1, "25권을 나타내려면 별이 몇 개 필요할까요?", ["4개", "5개", "6개"], "picture", { values: [4, 0, 0], labels: ["책", "", ""] }, "‘책’ 칸을 누른 뒤 아래쪽 빈칸을 눌러 별을 5개로 만드세요.", "별의 수와 별 하나가 뜻하는 5권을 곱한 식으로 설명하세요."],
  [2, "귤이 4개씩 5접시라면 모두 몇 개일까요?", ["9개", "16개", "20개"], "array", {}, "표의 오른쪽과 아래쪽 끝점을 끌어 4칸씩 5줄로 만드세요.", "한 줄의 수와 줄 수를 곱한 식으로 설명하세요."],
  [3, "바둑돌이 6개씩 7줄이라면 모두 몇 개일까요?", ["13개", "36개", "42개"], "array", {}, "표의 오른쪽과 아래쪽 끝점을 끌어 6칸씩 7줄로 만드세요.", "한 줄의 수와 줄 수를 곱한 식으로 설명하세요."],
  [4, "34×2의 값은 얼마일까요?", ["38", "64", "68"], "place-value", { hundreds: 0, tens: 3, ones: 4, multiplier: 2 }, "한 벌의 모형을 ‘1벌’ 칸에 놓고, 같은 모형을 ‘2벌’ 칸에도 복사해 놓으세요.", "30×2와 4×2를 더한 식으로 설명하세요."],
  [5, "공이 31개씩 든 상자가 3개라면 모두 몇 개일까요?", ["34개", "63개", "93개"], "place-value", { hundreds: 0, tens: 3, ones: 1, multiplier: 3 }, "한 벌의 모형을 ‘1벌’·‘2벌’·‘3벌’ 칸에 복사해 놓으세요.", "30×3과 1×3을 더한 식으로 설명하세요."],
  [6, "쿠키 18개를 6명에게 똑같이 나누면 한 명은 몇 개일까요?", ["2개", "3개", "6개"], "counting", { count: 18, recipientCount: 6 }, "쿠키 모형을 1명부터 6명까지 한 개씩 번갈아 옮기세요.", "각 사람에게 간 모형 수와 18÷6을 함께 써서 설명하세요."],
  [7, "7×□=35에서 □에 알맞은 수는 무엇일까요?", ["4", "5", "7"], "counting", { count: 35 }, "모형 35개를 7개씩 묶어 묶음 수를 확인하세요.", "7개씩 만든 묶음 수와 35÷7을 함께 써서 설명하세요."],
  [8, "32÷8의 몫은 무엇일까요?", ["4", "8", "24"], "counting", { count: 32 }, "모형 32개를 8개씩 묶어 묶음 수를 확인하세요.", "8×4=32와 연결되는 나눗셈식 두 개를 써서 설명하세요."],
  [9, "붙임 딱지 42장을 6장씩 묶으면 몇 묶음일까요?", ["6묶음", "7묶음", "8묶음"], "counting", { count: 42 }, "모형 42개를 6개씩 묶어 묶음 수를 확인하세요.", "6개씩 만든 묶음 수와 42÷6을 함께 써서 설명하세요."],
  [10, "전체를 똑같이 5조각으로 나눈 한 조각은 얼마일까요?", ["1/4", "1/5", "5/1"], "fraction", { fractions: [[1, 5]] }, "분수 띠의 끝점을 끌어 똑같은 조각 5개가 전체 1이 되게 하세요.", "전체 조각 수와 고른 한 조각을 분모와 분자로 설명하세요."],
  [11, "크기가 다른 5조각 중 한 조각을 1/5이라고 할 수 있을까요?", ["할 수 있어요", "할 수 없어요", "큰 조각만 돼요"], "fraction", { fractions: [[1, 5]] }, "분수 띠를 5등분해 조각의 크기가 모두 같은지 확인하세요.", "1/5이 되려면 다섯 조각이 어떠해야 하는지 설명하세요."],
  [12, "전체 7조각 중 3조각을 고르면 얼마일까요?", ["3/7", "7/3", "4/7"], "fraction", { fractions: [[3, 7]] }, "분수 띠의 끝점을 끌어 7조각 중 3조각이 보이게 하세요.", "전체 조각 수와 고른 조각 수를 분수로 설명하세요."],
  [13, "피자 10조각 중 4조각을 먹으면 먹은 양은 얼마일까요?", ["4/10", "6/10", "10/4"], "fraction", { fractions: [[4, 10]] }, "분수 띠에서 10조각 중 4조각이 보이게 하세요.", "분모 10과 분자 4가 각각 무엇을 뜻하는지 설명하세요."],
  [14, "지우개와 복도의 길이에 알맞은 단위는 무엇일까요?", ["cm와 m", "m와 cm", "mm와 km"], "unit", { digits: "520", labels: ["지우개 약 5", "복도 약 20"] }, "숫자 카드를 지우개와 복도에 알맞은 단위 옆으로 옮기세요.", "물건의 실제 크기를 근거로 cm와 m을 고른 까닭을 쓰세요."],
  [15, "단추의 두께와 도시 사이 거리에 알맞은 단위는 무엇일까요?", ["mm와 km", "cm와 m", "km와 mm"], "unit", { digits: "25", labels: ["단추 약 2", "도시 사이 약 5"] }, "숫자 카드를 단추와 도시 사이 거리에 알맞은 단위 옆으로 옮기세요.", "아주 작은 길이와 먼 거리를 근거로 단위를 설명하세요."],
  [16, "3m는 몇 cm일까요?", ["30cm", "300cm", "3000cm"], "unit", { digits: "3100", labels: ["1m = 100cm"] }, "3 카드와 100 카드의 관계를 이용해 3m를 cm로 나타내세요.", "1m=100cm를 세 번 사용한 식으로 설명하세요."],
  [17, "241×3의 값은 얼마일까요?", ["633", "723", "843"], "place-value", { hundreds: 2, tens: 4, ones: 1, multiplier: 3 }, "백·십·일 모형 한 벌을 ‘1벌’부터 ‘3벌’ 칸에 복사해 놓으세요.", "200×3, 40×3, 1×3의 부분곱을 더해 설명하세요."],
  [18, "213×3의 값은 얼마일까요?", ["619", "639", "699"], "place-value", { hundreds: 2, tens: 1, ones: 3, multiplier: 3 }, "백·십·일 모형 한 벌을 ‘1벌’부터 ‘3벌’ 칸에 복사해 놓으세요.", "세 부분곱 600, 30, 9를 더한 식으로 설명하세요."],
  [19, "32×14의 값은 얼마일까요?", ["128", "352", "448"], "place-value", { hundreds: 0, tens: 3, ones: 2, multiplier: 14 }, "32 모형을 ‘10배’ 칸과 ‘4배’ 칸으로 나누어 놓으세요.", "32×10과 32×4의 두 부분곱을 더해 설명하세요."],
  [20, "구슬 28개를 7개씩 묶으면 몇 묶음일까요?", ["3묶음", "4묶음", "7묶음"], "counting", { count: 28 }, "구슬 모형을 7개씩 골라 묶음으로 모으세요.", "한 묶음의 수와 묶음 수를 28÷7과 함께 설명하세요."],
  [21, "17÷5의 몫과 나머지는 무엇일까요?", ["3…2", "4…1", "5…2"], "counting", { count: 17 }, "모형 17개를 5개씩 묶고 남는 모형을 따로 두세요.", "5개씩 만든 묶음 수와 남은 수가 5보다 작은지 설명하세요."],
  [22, "38÷6=6…2가 맞는지 무엇으로 확인할까요?", ["6×6+2", "6+6+2", "38-6+2"], "counting", { count: 38 }, "모형을 6개씩 6묶음과 남은 2개로 나누어 놓으세요.", "나누는 수×몫+나머지가 38이 되는지 설명하세요."],
  [23, "점 O와 원 위의 점을 이은 선분의 이름은 무엇일까요?", ["반지름", "지름", "원의 둘레"], "circle", { angle: 90 }, "원 모형을 누른 뒤 나타난 점을 끌어 선분 방향을 바꾸세요.", "O와 원 위의 점을 이은 선분을 근거로 설명하세요."],
  [24, "반지름이 7cm인 원의 지름은 몇 cm일까요?", ["7cm", "14cm", "21cm"], "circle", { angle: 180 }, "원 모형을 누른 뒤 나타난 두 점이 중심 O 양쪽에 오도록 옮기세요.", "지름이 반지름 두 개로 이어짐을 식으로 설명하세요."],
  [25, "10칸 중 6칸을 색칠하면 색칠한 부분은 얼마일까요?", ["4/10", "6/10", "10/6"], "fraction", { fractions: [[6, 10]] }, "분수 띠에서 전체 10칸 중 6칸이 보이게 하세요.", "전체 칸 수와 색칠한 칸 수를 분수로 설명하세요."],
  [26, "11/4를 대분수로 나타내면 무엇일까요?", ["2와 3/4", "3과 2/4", "4와 1/4"], "fraction", { fractions: [[4, 4], [4, 4], [3, 4]] }, "1/4 조각을 4개씩 묶어 전체 1이 몇 개인지 확인하세요.", "전체로 묶인 수와 남은 1/4 조각 수를 설명하세요."],
  [27, "3/8과 7/8 중 더 큰 분수는 무엇일까요?", ["3/8", "7/8", "같아요"], "fraction", { fractions: [[3, 8], [7, 8]] }, "두 분수 띠의 전체 길이를 맞추고 색칠된 조각 수를 비교하세요.", "분모가 같을 때 분자가 큰 분수가 큰 까닭을 설명하세요."],
  [28, "2L 250mL는 모두 몇 mL일까요?", ["250mL", "2050mL", "2250mL"], "unit", { digits: "2250", labels: ["1L = 1000mL", "2L = 2000mL", "+ 250mL"] }, "2L를 2000mL로 바꾼 뒤 250mL를 더해 수 카드를 놓으세요.", "2000mL와 250mL를 더한 식으로 설명하세요."],
  [29, "3kg 40g은 모두 몇 g일까요?", ["340g", "3004g", "3040g"], "unit", { digits: "3040", labels: ["1kg = 1000g", "3kg = 3000g", "+ 40g"] }, "3kg을 3000g으로 바꾼 뒤 40g을 더해 수 카드를 놓으세요.", "3000g과 40g을 더한 식으로 설명하세요."],
  [30, "■ 한 개가 4명일 때 A반 5개와 B반 2개는 몇 명 차이일까요?", ["3명", "8명", "12명"], "picture", { values: [5, 2, 0], labels: ["A반", "B반", ""] }, "A반과 B반의 그림 수 차이를 그림그래프에서 확인하세요.", "그림 수의 차이 3에 범례 4명을 곱한 식으로 설명하세요."]
].map(([sequence, question, choices, nativeKind, native, confirmation, explanation]) => ({
  sequence,
  question,
  choices,
  nativeKind,
  native,
  confirmation,
  explanation
}));

function clone(value) {
  return structuredClone(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fragmentObjects(fragment) {
  return fragment.kind === "single" ? [fragment.object] : [...fragment.objects];
}

function textObject(id, text, bounds, fontSize, options = {}) {
  return fragmentObjects(
    compileNativeTool(
      {
        kind: "text",
        toolKey: "common.text",
        text,
        fontSize,
        centerInPlacement: options.centerInPlacement ?? false
      },
      { id, ...bounds }
    )
  )[0];
}

function rectangleObject(id, bounds, options = {}) {
  return fragmentObjects(
    compileNativeTool(
      {
        kind: "draw-rectangle",
        toolKey: "common.rectangle",
        fill: options.fill ?? "#FFFFFF",
        stroke: options.stroke ?? "#94A3B8",
        strokeDashArray: options.strokeDashArray ?? "none"
      },
      { id, ...bounds }
    )
  )[0];
}

function numberCard(id, value, x, y) {
  return fragmentObjects(
    compileNativeTool(
      { kind: "number-card", toolKey: "NO04NT", value },
      { id, x, y, width: 96, height: 96 }
    )
  )[0];
}

function rawTemplate(discovery, variantId, id, x, y, patch = {}) {
  const observation = discovery.observations.find(
    (candidate) => candidate.variantId === variantId
  );
  if (!observation?.initial?.object) {
    throw new Error(`html30-native-template-missing:${variantId}`);
  }
  const object = clone(observation.initial.object);
  return {
    ...object,
    ...patch,
    id,
    x,
    y,
    _x: 0,
    _y: 0
  };
}

function countingObjects(sequence, native, lockedIds) {
  const count = native.count;
  const parts = count <= 31 ? [count] : [Math.ceil(count / 2), Math.floor(count / 2)];
  const objects = [];
  if (native.recipientCount) {
    for (let index = 0; index < native.recipientCount; index += 1) {
      const rectangleId = `mc30-${sequence}-recipient-${index + 1}`;
      const labelId = `mc30-${sequence}-recipient-label-${index + 1}`;
      const x = 700 + index * 116;
      objects.push(
        rectangleObject(
          rectangleId,
          { x, y: 782, width: 104, height: 260 },
          { fill: "#FFFFFF", stroke: "#78BCE8", strokeDashArray: "8 6" }
        ),
        textObject(
          labelId,
          `${index + 1}명`,
          { x, y: 790, width: 104, height: 56 },
          38,
          { centerInPlacement: true }
        )
      );
      lockedIds.push(rectangleId, labelId);
    }
  }
  objects.push(...parts.flatMap((part, index) =>
    fragmentObjects(
      compileNativeTool(
        { kind: "counting-model", toolKey: "NO01SC", count: part },
        {
          id: `mc30-${sequence}-count-${index + 1}`,
          x: 700,
          y: native.recipientCount ? 455 : parts.length === 1 ? 520 : 455 + index * 265,
          width: 680,
          height: native.recipientCount ? 260 : parts.length === 1 ? 500 : 250
        }
      )
    )
  ));
  return objects;
}

function fractionObjects(sequence, fractions) {
  const count = fractions.length;
  return fractions.flatMap(([numerator, denominator], index) =>
    fragmentObjects(
      compileNativeTool(
        {
          kind: "fraction-model",
          toolKey: "NO03FM",
          fraction: { numerator, denominator },
          color: ["#5CB8FF", "#FF9F5C", "#66CC88"][index % 3],
          showLabel: true
        },
        {
          id: `mc30-${sequence}-fraction-${index + 1}`,
          x: 720,
          y: 560 + index * (count > 2 ? 145 : 210),
          width: 690,
          height: 120
        }
      )
    )
  );
}

function placeValueObjects(sequence, native, lockedIds) {
  const objects = [];
  const sourceValue = Number(
    `${native.hundreds ?? 0}${native.tens ?? 0}${native.ones ?? 0}`
  );
  const multiplier = Number(native.multiplier ?? 1);
  const laneLabels = multiplier >= 10
    ? ["10배", `${multiplier - 10}배`]
    : Array.from({ length: multiplier }, (_value, index) => `${index + 1}벌`);
  const sourceTrayId = `mc30-${sequence}-place-source-tray`;
  objects.push(
    rectangleObject(
      sourceTrayId,
      { x: 690, y: 430, width: 720, height: 245 },
      { fill: "#FFFFFF", stroke: "#78BCE8" }
    ),
    textObject(
      `mc30-${sequence}-place-source-label`,
      `원래 한 벌 · ${sourceValue}`,
      { x: 710, y: 440, width: 410, height: 52 },
      40
    ),
    textObject(
      `mc30-${sequence}-place-multiplier-sign`,
      "×",
      { x: 1190, y: 442, width: 46, height: 52 },
      44,
      { centerInPlacement: true }
    )
  );
  lockedIds.push(
    sourceTrayId,
    `mc30-${sequence}-place-source-label`,
    `mc30-${sequence}-place-multiplier-sign`
  );
  laneLabels.forEach((label, index) => {
    const laneId = `mc30-${sequence}-place-lane-${index + 1}`;
    const labelId = `mc30-${sequence}-place-lane-label-${index + 1}`;
    const y = 695 + index * 115;
    objects.push(
      rectangleObject(
        laneId,
        { x: 690, y, width: 720, height: 102 },
        { fill: "#F8FAFC", stroke: "#8DA1B8", strokeDashArray: "8 6" }
      ),
      textObject(
        labelId,
        label,
        { x: 705, y: y + 22, width: 110, height: 56 },
        36,
        { centerInPlacement: true }
      )
    );
    lockedIds.push(laneId, labelId);
  });
  const values = [
    [100, native.hundreds ?? 0],
    [10, native.tens ?? 0],
    [1, native.ones ?? 0]
  ];
  let index = 0;
  for (const [value, count] of values) {
    for (let position = 0; position < count; position += 1) {
      const column = index % 6;
      const row = Math.floor(index / 6);
      objects.push(
        ...fragmentObjects(
          compileNativeTool(
            { kind: "place-value-model", toolKey: "NO04PD", value },
            {
              id: `mc30-${sequence}-place-${value}-${position + 1}`,
              x: 720 + column * 112,
              y: 500 + row * 112,
              width: 100,
              height: 100
            }
          )
        )
      );
      index += 1;
    }
  }
  const multiplierDigits = String(native.multiplier ?? "").split("");
  multiplierDigits.forEach((digit, digitIndex) => {
    objects.push(
      numberCard(
        `mc30-${sequence}-multiplier-${digitIndex + 1}`,
        Number(digit),
        1250 + digitIndex * 96,
        438
      )
    );
  });
  return objects;
}

function unitObjects(sequence, native, lockedIds) {
  const objects = [];
  const labelCount = native.labels?.length ?? 0;
  const cardY = labelCount > 1 ? 735 : 620;
  [...String(native.digits)].forEach((digit, index) => {
    objects.push(
      numberCard(
        `mc30-${sequence}-unit-card-${index + 1}`,
        Number(digit),
        720 + (index % 6) * 105,
        cardY + Math.floor(index / 6) * 115
      )
    );
  });
  (native.labels ?? []).forEach((label, index) => {
    const id = `mc30-${sequence}-unit-label-${index + 1}`;
    objects.push(
      textObject(id, label, { x: 720, y: 455 + index * 76, width: 680, height: 62 }, 46)
    );
    lockedIds.push(id);
  });
  return objects;
}

function nativeObjects(spec, discovery, lockedIds) {
  if (spec.nativeKind === "picture") {
    const graphValue = [
      [0, 0, spec.native.values[0] ?? 0],
      [0, 0, spec.native.values[1] ?? 0],
      [0, 0, spec.native.values[2] ?? 0]
    ];
    return [
      // DP03PG's visible graph and legend extend well beyond its outer anchor.
      // Center the measured native footprint inside the work panel instead of
      // treating the panel's left edge as the tool's visual origin.
      rawTemplate(discovery, "DP03PG-01", `mc30-${spec.sequence}-picture`, 710, 520, {
        label: spec.native.labels,
        graphValue,
        selectedIndex: null
      })
    ];
  }
  if (spec.nativeKind === "array") {
    return [
      rawTemplate(discovery, "NO04NG-03", `mc30-${spec.sequence}-array`, 830, 480)
    ];
  }
  if (spec.nativeKind === "counting") {
    return countingObjects(spec.sequence, spec.native, lockedIds);
  }
  if (spec.nativeKind === "fraction") {
    return fractionObjects(spec.sequence, spec.native.fractions);
  }
  if (spec.nativeKind === "place-value") {
    return placeValueObjects(spec.sequence, spec.native, lockedIds);
  }
  if (spec.nativeKind === "circle") {
    const radius = 200;
    const angle = spec.native.angle;
    const radians = (angle * Math.PI) / 180;
    return [
      rawTemplate(discovery, "SM07CS-02", `mc30-${spec.sequence}-circle`, 1080, 735, {
        angle,
        point1: { x: radius, y: 0 },
        point2: {
          x: Number((Math.cos(radians) * radius).toFixed(6)),
          y: Number((-Math.sin(radians) * radius).toFixed(6))
        }
      })
    ];
  }
  if (spec.nativeKind === "unit") {
    return unitObjects(spec.sequence, spec.native, lockedIds);
  }
  throw new Error(`html30-native-kind-unknown:${spec.nativeKind}`);
}

function requiredModules(spec) {
  return {
    picture: ["DP03PG"],
    array: ["NO04NG"],
    counting: ["NO01SC"],
    fraction: ["NO03FM"],
    "place-value": ["NO04PD", "NO04NT"],
    circle: ["SM07CS"],
    unit: ["NO04NT", "NO01SC"]
  }[spec.nativeKind];
}

function moduleActivationMap(catalog, required) {
  const active = new Set(required);
  const result = { Unit01: {}, Unit02: {}, Unit03: {}, Unit04: {} };
  for (const tool of catalog.tools ?? []) {
    if (
      typeof tool?.moduleKey === "string" &&
      typeof tool?.categoryId === "string" &&
      Object.hasOwn(result, tool.categoryId)
    ) {
      result[tool.categoryId][tool.moduleKey] = active.has(tool.moduleKey);
    }
  }
  return result;
}

function buildPayload(spec, harnessEntry, discovery, catalog) {
  const objects = [];
  const lockedIds = [];
  const addLockedText = (id, text, bounds, fontSize) => {
    objects.push(textObject(id, text, bounds, fontSize));
    lockedIds.push(id);
  };
  const addLockedRectangle = (id, bounds, options = {}) => {
    objects.push(rectangleObject(id, bounds, options));
    lockedIds.push(id);
  };
  addLockedText(
    `mc30-${spec.sequence}-question`,
    spec.question,
    { x: -40, y: 10, width: 1600, height: 86 },
    spec.question.length > 34 ? 64 : 70
  );
  addLockedText(
    `mc30-${spec.sequence}-instruction-1`,
    "① 답 카드를 하나 골라 ‘처음 고른 답’ 칸으로 옮기세요.",
    { x: -40, y: 120, width: 1600, height: 62 },
    52
  );
  addLockedText(
    `mc30-${spec.sequence}-instruction-2`,
    `② ${spec.confirmation}`,
    { x: -40, y: 198, width: 1600, height: 62 },
    52
  );
  addLockedText(
    `mc30-${spec.sequence}-instruction-3`,
    `③ ${spec.explanation}`,
    { x: -40, y: 276, width: 1600, height: 62 },
    52
  );
  addLockedText(
    `mc30-${spec.sequence}-choice-label`,
    "예상한 답 고르기",
    { x: -20, y: 360, width: 640, height: 58 },
    46
  );
  spec.choices.forEach((choice, index) => {
    addLockedRectangle(
      `mc30-${spec.sequence}-choice-card-${index + 1}`,
      { x: -20 + index * 216, y: 430, width: 200, height: 104 },
      { fill: "#F8FAFC", stroke: "#8DA1B8" }
    );
    objects.push(
      textObject(
        `mc30-${spec.sequence}-choice-${index + 1}`,
        choice,
        { x: -20 + index * 216, y: 430, width: 200, height: 104 },
        45,
        { centerInPlacement: true }
      )
    );
  });
  addLockedText(
    `mc30-${spec.sequence}-prediction-label`,
    "처음 고른 답 · 설명한 뒤 다르면 바꾸기",
    { x: -20, y: 556, width: 640, height: 58 },
    42
  );
  addLockedRectangle(
    `mc30-${spec.sequence}-prediction-card`,
    { x: -20, y: 620, width: 640, height: 112 },
    { fill: "#FFFFFF", stroke: "#8DA1B8", strokeDashArray: "10 8" }
  );
  objects.push(
    textObject(
      `mc30-${spec.sequence}-prediction-box`,
      " ",
      { x: -20, y: 620, width: 640, height: 112 },
      42
    )
  );
  addLockedText(
    `mc30-${spec.sequence}-explanation-label`,
    "식과 까닭 쓰기",
    { x: -20, y: 754, width: 640, height: 58 },
    42
  );
  addLockedRectangle(
    `mc30-${spec.sequence}-explanation-card`,
    { x: -20, y: 818, width: 640, height: 250 },
    { fill: "#FFFFFF", stroke: "#8DA1B8", strokeDashArray: "10 8" }
  );
  objects.push(
    textObject(
      `mc30-${spec.sequence}-explanation-box`,
      " ",
      { x: -20, y: 818, width: 640, height: 250 },
      40
    )
  );
  addLockedRectangle(
    `mc30-${spec.sequence}-native-panel`,
    { x: 650, y: 370, width: 800, height: 700 },
    { fill: "#F2FAFE", stroke: "#78BCE8" }
  );
  objects.push(...nativeObjects(spec, discovery, lockedIds));

  const domain = harnessEntry.catalogBinding.domain;
  const category = MATHCANVAS_PROJECT_CATEGORIES[domain];
  if (!category) throw new Error(`html30-domain-unknown:${domain}`);
  const projectTitle = `[EDUITIT-MC30-${String(spec.sequence).padStart(2, "0")}] ${harnessEntry.title}`;
  return {
    projectTitle,
    categoryId: category.categoryId,
    contentsJson: objects,
    canvasOption: {
      grid: {
        type: "none",
        isGrid: false,
        distance: { x: 40, y: 40 },
        isGridToggle: false
      },
      scale: 5,
      lockIds: lockedIds.map((id) => [id]),
      viewBox: [-499.455994, -129.584, 2211.840088, 1382.400024],
      CR07BSArr: [],
      CR07BSObj: { type1: 0.3, type2: 0.3, type3: 0.3, weight: 0 },
      moduleArr: moduleActivationMap(catalog, requiredModules(spec)),
      isCaptured: false,
      penElements: [],
      canvasCenterCoordinate: { cx: 606.46405, cy: 561.616012 }
    },
    isShowMenuOnActivity: true,
    isNoteworthy: false,
    tags: ["에듀잇티", "수업꾸러미", `sequence-${spec.sequence}`],
    studyLevel: "elementary"
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function saveManifest(manifest) {
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

const harness = readJson(harnessPath);
const discovery = readJson(rawDiscoveryPath);
const catalog = readJson(
  join(repositoryRoot, "research/mathcanvas/tool-catalog.snapshot.json")
);
if (harness.entries.length !== 30 || specs.length !== 30) {
  throw new Error("html30-exact-count-required");
}

let manifest;
try {
  manifest = readJson(manifestPath);
} catch {
  manifest = {
    schemaVersion: "1.0.0",
    manifestId: "eduitit-html30-created-projects-v1",
    sourceHarnessSha256: sha256(readFileSync(harnessPath)),
    creationMode: "authenticated-background-post-first-then-single-review",
    projects: []
  };
}

const existingBySequence = new Map(
  manifest.projects.map((project) => [project.sequence, project])
);
const updateExisting = process.argv.includes("--update-existing");
const session = await createLiveAuthHeadlessSession(resolveStateDirectory());
let context;
try {
  context = await session.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  await page.goto(`${origin}/ko/myCanvas`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000
  });

  for (const spec of specs) {
    if (existingBySequence.has(spec.sequence) && !updateExisting) {
      process.stdout.write(`SKIP ${spec.sequence}/30 existing\n`);
      continue;
    }
    const harnessEntry = harness.entries.find(
      (entry) => entry.sequence === spec.sequence
    );
    if (!harnessEntry) {
      throw new Error(`html30-harness-entry-missing:${spec.sequence}`);
    }
    const payload = buildPayload(spec, harnessEntry, discovery, catalog);
    const existingRecord = existingBySequence.get(spec.sequence);
    const result = await page.evaluate(async ({ body, existingProjectId }) => {
      const token = window.localStorage.getItem("accessToken");
      const headers = {
        "Content-Type": "application/json;charset=utf-8",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      if (existingProjectId) {
        const response = await fetch(`/api/project/${encodeURIComponent(existingProjectId)}`, {
          method: "PUT",
          headers,
          credentials: "include",
          body: JSON.stringify(body)
        });
        const text = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          projectId: existingProjectId,
          reused: true,
          updated: true,
          responseText: response.ok ? "" : text.slice(0, 500)
        };
      }
      const query = new URLSearchParams({
        projectTitle: body.projectTitle,
        offset: "1",
        limit: "100",
        sortCondition: "createdAt",
        sortOrder: "desc"
      });
      const listed = await fetch(`/api/project?${query.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        cache: "no-store"
      });
      if (!listed.ok) {
        return { ok: false, status: listed.status, stage: "list" };
      }
      const listBody = await listed.json();
      const existing = listBody.list?.find(
        (project) => project.projectTitle === body.projectTitle
      );
      if (existing?.projectId) {
        return { ok: true, status: 200, projectId: existing.projectId, reused: true };
      }
      const response = await fetch("/api/project", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(body)
      });
      const text = await response.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      return {
        ok: response.ok && typeof parsed?.projectId === "string",
        status: response.status,
        projectId: parsed?.projectId ?? null,
        reused: false,
        responseText: response.ok ? "" : text.slice(0, 500)
      };
    }, { body: payload, existingProjectId: existingRecord?.projectId ?? null });
    if (!result.ok || !result.projectId) {
      throw new Error(
        `html30-create-failed:${spec.sequence}:${result.stage ?? "post"}:${result.status}:${result.responseText ?? ""}`
      );
    }
    const record = {
      sequence: spec.sequence,
      lessonId: harnessEntry.lessonId,
      title: harnessEntry.title,
      projectTitle: payload.projectTitle,
      projectId: result.projectId,
      url: `${origin}/ko/view/${result.projectId}`,
      payloadSha256: sha256(JSON.stringify(payload)),
      reusedExistingProject: result.reused,
      createdAt: new Date().toISOString()
    };
    if (existingRecord) {
      Object.assign(existingRecord, record, {
        createdAt: existingRecord.createdAt,
        updatedAt: new Date().toISOString()
      });
    } else {
      manifest.projects.push(record);
    }
    manifest.projects.sort((left, right) => left.sequence - right.sequence);
    manifest.completedCount = manifest.projects.length;
    manifest.completed = manifest.projects.length === 30;
    saveManifest(manifest);
    process.stdout.write(
      `${result.updated ? "UPDATED" : "CREATED"} ${spec.sequence}/30 ${record.url}\n`
    );
    await page.waitForTimeout(250);
  }
} finally {
  await context?.close().catch(() => undefined);
}

manifest.completedCount = manifest.projects.length;
manifest.completed = manifest.projects.length === 30;
manifest.finishedAt = new Date().toISOString();
saveManifest(manifest);
process.stdout.write(`DONE ${manifest.completedCount}/30 ${manifestPath}\n`);
