/**
 * 학생 화면 품질 기준.
 *
 * 모든 배치 값은 캔버스 단위이고 MathCanvas 편집기는 캔버스 전체 폭을 화면에
 * 맞춰 축소 렌더한다. 따라서 읽기·조작 판단은 반드시 CSS px로 환산한 뒤 한다.
 *
 * 환산비 근거: `wave10-common-unit-v1` layout preset의 `item.join-lane` 폭은
 * 720 캔버스 단위이고, 같은 활동의 실제 브라우저 canary
 * (`research/mathcanvas/wave10-common-unit-release-canary.json`)가 기록한
 * `laneWidth`는 417.82 px다. 417.82 / 720 = 0.5803.
 * 관측 환경은 `packages/managed-browser/src/runtime.ts`의 headless viewport
 * 1280×800이며, 이는 교실 노트북의 보수적인 기준선이다.
 */
export const CANVAS_UNIT_TO_CSS_PX = 0.5803;

export const RENDER_SCALE_EVIDENCE = Object.freeze({
  layoutPreset: "wave10-common-unit-v1",
  token: "item.join-lane",
  tokenWidthUnits: 720,
  measuredWidthCssPx: 417.8240966796875,
  canaryPath: "research/mathcanvas/wave10-common-unit-release-canary.json",
  viewport: "1280x800"
});

export const toCssPx = (units) => units * CANVAS_UNIT_TO_CSS_PX;
export const toUnits = (cssPx) => cssPx / CANVAS_UNIT_TO_CSS_PX;

/** 어떤 학년에게도 허용하지 않는 절대 하한. */
export const ABSOLUTE_MINIMUM_TEXT_CSS_PX = 14;

/** 학년대별 권장 하한. 낮은 학년일수록 크게 읽혀야 한다. */
export const RECOMMENDED_TEXT_CSS_PX = Object.freeze({
  low: 18, // 1~2학년
  mid: 17, // 3~4학년
  high: 16 // 5~6학년
});

export const gradeBandOf = (grade) =>
  grade <= 2 ? "low" : grade <= 4 ? "mid" : "high";

/**
 * WCAG 2.2 2.5.8 Target Size (Minimum)은 24×24 CSS px, 2.5.5 (Enhanced)는
 * 44×44 CSS px다. 초등, 특히 저학년의 트랙패드·터치 조작을 감안해 24 미만은
 * 출시 차단, 44 미만은 배포 전 개선으로 둔다.
 */
export const INTERACTIVE_TARGET_BLOCKING_CSS_PX = 24;
export const INTERACTIVE_TARGET_RECOMMENDED_CSS_PX = 44;

/**
 * 드롭 여유. 목표 영역과 이동 요소의 각 축 차이가 이보다 작으면 학생이
 * 픽셀 단위로 맞춰야 한다. 여유 16 px는 축마다 ±8 px의 오차를 허용한다.
 */
export const DROP_SLACK_BLOCKING_CSS_PX = 6;
export const DROP_SLACK_RECOMMENDED_CSS_PX = 16;

/**
 * 손글씨 영역. MathCanvas에는 학생용 입력 필드 도구가 없고 `텍스트` 객체
 * 생성 또는 `펜` 손글씨만 가능하다. 초등 손글씨 한 줄에 필요한 최소 높이를
 * 44 px, 권장을 60 px로 둔다.
 */
export const WRITING_REGION_BLOCKING_CSS_PX = 44;
export const WRITING_REGION_RECOMMENDED_CSS_PX = 60;

/**
 * 문제 패널 바깥에 놓인 요소의 소속 판정.
 * (다음 문제와의 간격) / (자기 문제와의 간격)이 이 값 이상이어야 어느 문제에
 * 속하는지 모호하지 않다.
 */
export const OUTSIDE_ELEMENT_PROXIMITY_RATIO = 3;

/** 문제와 문제 사이 최소 간격. */
export const INTER_ITEM_MINIMUM_GAP_CSS_PX = 24;

/**
 * 목표 타입 스케일.
 *
 * 블루프린트마다 `fontSize`를 손으로 정하면서 20~64 사이 20종이 생겼다. 화면
 * 품질 수정을 실제로 적용할 때 크기는 이 스케일에서만 고른다. 값은 위의
 * 환산비로 목표 CSS px에서 역산했다. 하한 `label`은 저학년 권장 18 px이다.
 *
 * 아직 블루프린트에 적용하지 않았다. 적용은 라벨을 상자 안 머리말로 옮기는
 * 구조 변경과 함께 한 번에 해야 한다. `docs/STUDENT_SCREEN_QUALITY.md` 참고.
 */
export const TYPE_SCALE = Object.freeze({
  label: Math.ceil(18 / CANVAS_UNIT_TO_CSS_PX), // 32, 화면 18.6 px
  body: Math.ceil(20 / CANVAS_UNIT_TO_CSS_PX), // 35, 화면 20.3 px
  candidate: Math.ceil(22 / CANVAS_UNIT_TO_CSS_PX), // 38, 화면 22.1 px
  question: Math.ceil(26 / CANVAS_UNIT_TO_CSS_PX), // 45, 화면 26.1 px
  instruction: Math.ceil(28 / CANVAS_UNIT_TO_CSS_PX), // 49, 화면 28.4 px
  display: Math.ceil(38 / CANVAS_UNIT_TO_CSS_PX) // 66, 화면 38.3 px
});
