// 공개 MathCanvas 수업에서 관찰한 그래프 도구의 구조 필드다.
// 저작 시 값이 정해지는 필드(제목, 축 이름, 항목, 눈금, 막대값)는 여기에 없다.
// 근거: research/mathcanvas/graph-tool-contract.observations.json
//       research/mathcanvas/graph-tool-object-template.json
//       research/mathcanvas/graph-tool-release-canary.json

export const BAR_CHART_SVG_ID = "DP04BC-01" as const;
export const DATA_TABLE_SVG_ID = "DP02TG-02" as const;

/** 세로축 최대값 = (gridlineCount - 1) x valuePerGridline */
export function barChartAxisMaximum(
  gridlineCount: number,
  valuePerGridline: number
): number {
  return (gridlineCount - 1) * valuePerGridline;
}

export const BAR_CHART_STRUCTURAL_FIELDS: Readonly<Record<string, unknown>> =
  {
    "cx": 0,
    "cy": 0,
    "rx": 0,
    "ry": 0,
    "deps": [
      "10"
    ],
    "fill": "#FF5862",
    "keys": [
      "title",
      "unit",
      "name",
      "start",
      "deps",
      "label",
      "firstGraphValue",
      "secondGraphValue"
    ],
    "type": 1,
    "scale": 1,
    "width": 120,
    "height": 64,
    "parent": {
      "moveX": 0,
      "moveY": 0,
      "reset": false,
      "startX": 0,
      "startY": 0,
      "newData": null,
      "addValue": null,
      "flgCount": 0,
      "gridLine": 0,
      "observer": {},
      "plusToggle": false,
      "handlerType": null,
      "minusToggle": false,
      "totalToggle": false,
      "aGraphToggle": false,
      "bGraphToggle": false,
      "graphHandler": false,
      "handlerIndex": null,
      "widthHandler": false,
      "heightHandler": false,
      "addGraphToggle": false,
      "minusToggleIdx": null
    },
    "rotate": 0,
    "stroke": "#000000",
    "groupId": "",
    "isEyeOn": false,
    "isGroup": false,
    "isMerge": false,
    "isSplit": false,
    "firstFill": "#FF5862",
    "isStackUp": false,
    "sizeScale": 1,
    "waveCount": 0,
    "clickCount": 0,
    "elemSplice": true,
    "isShuffled": false,
    "isTextEdit": false,
    "secondFill": "#32CCFF",
    "strokeType": 1,
    "coordinates": [
      [
        0,
        0
      ]
    ],
    "fillOpacity": 1,
    "isBluePrint": false,
    "strokeWidth": 4,
    "isFillChange": true,
    "isFirstGraph": true,
    "toolbarWidth": 120,
    "initSizeScale": 1,
    "isGroupGridOn": false,
    "strokeOpacity": 1,
    "toolbarHeight": 64,
    "isGroupElement": false,
    "isStrokeChange": false,
    "isSurroundRect": false,
    "isVerticalFlip": false,
    "isColorInverted": false,
    "labelGroupCount": 1,
    "playgroundIndex": 1,
    "strokeDashArray": "",
    "isHorizontalFlip": false,
    "globalCentroidFlg": true,
    "isTextEditFontSize": false,
    "isMoveRotateHandler": false,
    "isCenterGravityPolygon": false
  };

export const DATA_TABLE_STRUCTURAL_FIELDS: Readonly<Record<string, unknown>> =
  {
    "cx": 0,
    "cy": 0,
    "rx": 0,
    "ry": 0,
    "fill": "#ffffff",
    "keys": [
      "title",
      "name",
      "nameTag",
      "countName",
      "tableCell",
      "percentCell"
    ],
    "isCol": false,
    "isSum": true,
    "scale": 1,
    "length": 448,
    "parent": {
      "moveX": null,
      "moveY": null,
      "reset": false,
      "startX": 0,
      "startY": 0,
      "flgCount": 0,
      "handlerX": null,
      "handlerY": null,
      "observer": {},
      "curTables": null,
      "sortToggle": false,
      "minusToggle": false,
      "targetTable": null,
      "heightHandler": false,
      "isElementClick": false,
      "minusToggleIdx": null,
      "isBottomToolbar": false,
      "isNumberToolbar": false,
      "isPercentToolbar": false,
      "isDataMovementHandle": false
    },
    "rotate": 0,
    "stroke": "#000000",
    "groupId": "",
    "isEyeOn": false,
    "isGroup": false,
    "isMerge": false,
    "isSplit": false,
    "nameTag": [
      "광역시"
    ],
    "perWidth": 156,
    "totalSum": [
      2559
    ],
    "cellCount": 6,
    "countName": [
      "공원 수(개소)"
    ],
    "isPercent": false,
    "isStackUp": false,
    "perHeight": 64,
    "sizeScale": 1,
    "tableCell": [
      "396",
      "478",
      "315",
      "430",
      "328",
      "612"
    ],
    "totalCell": [
      2559
    ],
    "clickCount": 0,
    "elemSplice": true,
    "isTextEdit": false,
    "strokeType": 1,
    "coordinates": [
      [
        -2,
        46
      ],
      [
        154,
        46
      ],
      [
        -2,
        496
      ],
      [
        154,
        496
      ]
    ],
    "fillOpacity": 1,
    "isBluePrint": false,
    "percentCell": [
      15.47,
      18.68,
      12.31,
      16.8,
      12.82,
      23.92
    ],
    "strokeWidth": 4,
    "isFillChange": false,
    "totalPercent": [
      100
    ],
    "initSizeScale": 1,
    "isGroupGridOn": false,
    "strokeOpacity": 1,
    "isGroupElement": false,
    "isStrokeChange": false,
    "isSurroundRect": false,
    "isVerticalFlip": false,
    "isColorInverted": false,
    "playgroundIndex": 1,
    "strokeDashArray": "",
    "isHorizontalFlip": false,
    "defaultTransFromX": 736,
    "defaultTransFromY": 249,
    "globalCentroidFlg": true,
    "isTextEditFontSize": false,
    "isMoveRotateHandler": false,
    "isCenterGravityPolygon": false
  };
