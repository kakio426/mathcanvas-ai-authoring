import type { LayoutPreset } from "@mathcanvas/contracts";
import {
  centeredChoicePoolTokens,
  centeredRowLeft
} from "./centered-choice-pool.js";

const choices = Array.from(
  { length: 5 },
  (_, index) => `position-card-${index + 1}`
);
const choiceCenterX = 1850;

/**
 * Wave 22는 표에서 그래프로 옮겨 적는 활동이라 왼쪽 열을 읽는 순서대로
 * 표 → 눈금 안내 → 막대그래프 세로로 쌓는다. 막대그래프는 축과 항목
 * 이름을 스스로 그리므로 다른 활동보다 높은 칸이 필요하고, 그만큼 문항
 * 칸 전체를 키워 설명 칸과 겹치지 않게 한다. 막대그래프는 선언한
 * 높이보다 크게 그려지므로 아래쪽 여백을 실측으로 더 벌렸다. 선택과 예상은 Wave 17과
 * 같은 오른쪽 자리에 두어 학생이 익숙한 위치에서 답을 고르게 한다.
 */
export const wave22BarGraphRepresentLayoutPreset: LayoutPreset = {
  itemOriginY: 330,
  itemPitch: 1320,
  canvasBaseHeight: 390,
  minGap: 8,
  tokens: {
    "canvas.root": { scope: "canvas", x: 0, y: 0, width: 2300, height: 390 },
    "header.primary": { scope: "canvas", x: 220, y: 44, width: 1860, height: 58 },
    "header.secondary": { scope: "canvas", x: 220, y: 124, width: 1860, height: 58 },
    "header.tertiary": { scope: "canvas", x: 220, y: 204, width: 1860, height: 58 },
    "item.panel": { scope: "item", x: 70, y: 20, width: 2160, height: 1260 },
    "item.number": { scope: "item", x: 110, y: 42, width: 90, height: 44 },
    "item.question": { scope: "item", x: 230, y: 35, width: 1250, height: 64 },
    "item.data-table": { scope: "item", x: 200, y: 120, width: 1240, height: 230 },
    "item.scale-label": { scope: "item", x: 230, y: 365, width: 420, height: 44 },
    "item.bar-chart": { scope: "item", x: 200, y: 425, width: 1240, height: 480 },
    "item.prediction-label": { scope: "item", x: 1520, y: 115, width: 210, height: 40 },
    "item.prediction-box": { scope: "item", x: 1750, y: 105, width: 300, height: 64 },
    "item.choice-panel": { scope: "item", x: 1500, y: 195, width: 700, height: 225 },
    "item.pool-label": {
      scope: "item",
      x: centeredRowLeft(choiceCenterX, 3, 190, 18) + 20,
      y: 209,
      width: 280,
      height: 34
    },
    ...centeredChoicePoolTokens({
      roles: choices,
      rowCounts: [3, 2],
      centerX: choiceCenterX,
      firstRowY: 255,
      rowGap: 8,
      memberWidth: 190,
      memberHeight: 70,
      contentWidth: 150,
      columnGap: 18,
      insetX: 8,
      insetY: 6
    }),
    "item.explanation-label": { scope: "item", x: 230, y: 1080, width: 280, height: 40 },
    "item.explanation-box": { scope: "item", x: 450, y: 1065, width: 1700, height: 150 }
  }
};
