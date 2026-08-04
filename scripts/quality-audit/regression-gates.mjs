/**
 * `qa/regressions/`에 등록한 회귀 기준과 그 기준을 실제로 강제하는 자동 검사의
 * 연결표.
 *
 * 회귀 폴더는 지금까지 문서로만 존재했고 어떤 체크 스크립트도 참조하지 않았다.
 * 그래서 `FAIL`로 등록된 실패를 안고도 `pnpm check`가 통과했다. 이 표는 그
 * 구멍을 막는다. 회귀 폴더가 하나라도 이 표에 없으면 감사가 실패한다.
 *
 * `codes`가 빈 배열이면 "아직 자동 검사가 없음"을 뜻하고, 그 자체로 감사에서
 * 미해결 항목으로 보고된다. 사람이 눈으로만 확인하고 넘어가는 것을 막기 위해
 * 침묵하지 않는다.
 */
export const REGRESSION_GATES = Object.freeze({
  "2026-07-29-student-input-and-native-fraction-menu": {
    summary: "학생 글쓰기 위치가 보이지 않음 / 분수식에 네이티브 수식 메뉴 미사용",
    codes: [
      "writing-region-too-small",
      "writing-region-label-detached",
      "text-below-absolute-minimum"
    ],
    /** 자동 검사로 옮기지 못한 잔여 기준. 사람이 확인해야 한다. */
    manualOnly: [
      "조작 모형은 네이티브 분수 모형을, 분수식은 수식 입력기를 우선한다"
    ]
  },
  "user-reported-1630x1122": {
    summary: "분수 카드 넘침, 띠가 출발선을 덮음, 출발/도착 미분리, 기호에 출발 카드 없음, 읽는 순서 끊김",
    codes: [
      "outside-element-ambiguous-ownership",
      "drop-slack-too-tight",
      "interactive-target-too-small",
      "cross-item-overlap"
    ],
    manualOnly: []
  }
});
