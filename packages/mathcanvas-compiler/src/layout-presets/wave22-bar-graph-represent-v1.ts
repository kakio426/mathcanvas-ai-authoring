import type { LayoutPreset } from "@mathcanvas/contracts";
import { wave17MultiplicationArrayLayoutPreset } from "./wave17-multiplication-array-v1.js";

/**
 * Wave 22는 표와 막대그래프를 한 문항 안에 세로로 놓는다. 표가 자료의
 * 출처이고 그래프가 옮겨 담을 자리이므로, 읽는 순서와 같게 표를 위에
 * 배치한다. 선택·설명 열은 Wave 17에서 그대로 가져와 학생이 익숙한
 * 위치에서 답을 고르고 까닭을 쓰게 한다.
 */
export const wave22BarGraphRepresentLayoutPreset: LayoutPreset = {
  ...wave17MultiplicationArrayLayoutPreset,
  tokens: {
    ...wave17MultiplicationArrayLayoutPreset.tokens,
    "item.data-table": {
      scope: "item",
      x: 120,
      y: 118,
      width: 760,
      height: 150
    },
    "item.scale-label": {
      scope: "item",
      x: 120,
      y: 292,
      width: 400,
      height: 44
    },
    "item.bar-chart": {
      scope: "item",
      x: 120,
      y: 352,
      width: 760,
      height: 470
    }
  }
};
