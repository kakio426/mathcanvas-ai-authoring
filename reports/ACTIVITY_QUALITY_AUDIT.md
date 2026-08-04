# MathCanvas 학생 화면 품질 감사

`visual:audit`이 계약 통과율을 본다면 이 감사는 학생이 실제 화면에서 겪는 것을 봅니다.
모든 판정은 캔버스 단위를 CSS px로 환산한 뒤 내립니다.

- 환산비: 1 캔버스 단위 = 417.82 px / 720 단위 = **0.5803 px** (근거: `research/mathcanvas/wave10-common-unit-release-canary.json`, viewport 1280x800)
- 상태: **fail**
- 활동 17개 / variation 89개
- P0 185건 / P1 232건

## 기준 축별 결과

| 축 | P0 | P1 |
|---|---:|---:|
| 문제의 위치 | 0 | 6 |
| 폰트 크기 | 105 | 109 |
| 수학적 배움 | 0 | 2 |
| 학생 이해 | 0 | 26 |
| 답 입력 | 80 | 89 |

## 검사별 요약

| 검사 | 등급 | 축 | 해당 활동 |
|---|---|---|---:|
| `writing-region-too-small` | P0 | 답 입력 | 17 |
| `text-below-absolute-minimum` | P0 | 폰트 크기 | 15 |
| `drop-slack-too-tight` | P0 | 답 입력 | 11 |
| `writing-region-label-detached` | P1 | 답 입력 | 17 |
| `text-fit-unguarded-role` | P1 | 폰트 크기 | 15 |
| `text-below-grade-recommendation` | P1 | 폰트 크기 | 14 |
| `interactive-target-below-recommendation` | P1 | 답 입력 | 11 |
| `drop-slack-below-recommendation` | P1 | 답 입력 | 10 |
| `question-not-visually-dominant` | P1 | 학생 이해 | 6 |
| `writing-region-below-recommendation` | P1 | 답 입력 | 3 |
| `inter-item-gap-too-small` | P1 | 문제의 위치 | 3 |
| `outside-element-ambiguous-ownership` | P1 | 문제의 위치 | 3 |
| `item-question-ungated` | P1 | 수학적 배움 | 2 |

## 회귀 기준 연결

`qa/regressions/`에 등록된 2개 회귀 중 2개가 자동 검사에 연결되어 있습니다.

- `2026-07-29-student-input-and-native-fraction-menu`: 학생 글쓰기 위치가 보이지 않음 / 분수식에 네이티브 수식 메뉴 미사용
  - 자동 검사: `writing-region-too-small`, `writing-region-label-detached`, `text-below-absolute-minimum`
  - 사람이 확인해야 하는 잔여 기준: 조작 모형은 네이티브 분수 모형을, 분수식은 수식 입력기를 우선한다
- `user-reported-1630x1122`: 분수 카드 넘침, 띠가 출발선을 덮음, 출발/도착 미분리, 기호에 출발 카드 없음, 읽는 순서 끊김
  - 자동 검사: `outside-element-ambiguous-ownership`, `drop-slack-too-tight`, `interactive-target-too-small`, `cross-item-overlap`

## 활동별 상세

### fraction.compare.unlike-denominators.visual-v1 (5학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 180곳: choice-pool-label("비교 기호")가 fontSize 22 = 화면 12.8px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 180곳: prediction-label("예상한 기호")가 fontSize 24 = 화면 13.9px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 180곳: left-lane-label("첫째 띠")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 180곳: right-lane-label("둘째 띠")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 180곳: explanation-label("비교한 까닭")가 fontSize 24 = 화면 13.9px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 drop-slack-too-tight** · 답 입력 · 45곳: left-strip를 left-lane-surface에 놓을 때 세로 여유가 화면 0px뿐입니다(±0.0px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 45곳: right-strip를 right-lane-surface에 놓을 때 세로 여유가 화면 0px뿐입니다(±0.0px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 writing-region-too-small** · 답 입력 · 180곳: prediction-box의 높이가 화면 40.6px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 180곳: relation-slot-label가 화면 15.1px입니다. 5학년 권장 하한은 16px입니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 180곳: 질문 prompt(48, 27.9px)이 보기 less-symbol(64, 37.1px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 180곳: 질문 prompt(48, 27.9px)이 보기 greater-symbol(64, 37.1px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 180곳: 질문 prompt(48, 27.9px)이 보기 equal-symbol(64, 37.1px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 180곳: number의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 180곳: prompt의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 180곳: less-symbol의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 180곳: greater-symbol의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 180곳: equal-symbol의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 45곳: less-symbol → relation-slot-surface의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 45곳: greater-symbol → relation-slot-surface의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 45곳: equal-symbol → relation-slot-surface의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 180곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-below-recommendation** · 답 입력 · 180곳: explanation-box의 높이가 화면 52.2px으로 손글씨 권장 60px 미만입니다.
- **P1 writing-region-label-detached** · 답 입력 · 180곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 inter-item-gap-too-small** · 문제의 위치 · 135곳: 문제 사이 최소 간격이 화면 13.9px입니다.
- **P1 outside-element-ambiguous-ownership** · 문제의 위치 · 135곳: 패널 밖 요소 7개가 자기 문제와 13.9px, 다음 문제와 32.5px 떨어져 있습니다(비율 2.33, 기준 3). 어느 문제의 것인지 학생이 구분하기 어렵습니다.

### fraction.equivalent.same-whole.visual-v1 (5학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 20곳: candidate-pool-label("분수 띠")가 fontSize 22 = 화면 12.8px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 20곳: prediction-label("예상한 분수")가 fontSize 24 = 화면 13.9px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 20곳: reference-lane-label("기준 띠")가 fontSize 24 = 화면 13.9px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 20곳: target-lane-label("고른 띠")가 fontSize 24 = 화면 13.9px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 20곳: explanation-label("같은 크기인 까닭")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 drop-slack-too-tight** · 답 입력 · 5곳: candidate-strip-1를 target-lane-surface에 놓을 때 세로 여유가 화면 0px뿐입니다(±0.0px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 5곳: candidate-strip-2를 target-lane-surface에 놓을 때 세로 여유가 화면 0px뿐입니다(±0.0px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 5곳: candidate-strip-3를 target-lane-surface에 놓을 때 세로 여유가 화면 0px뿐입니다(±0.0px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 5곳: candidate-strip-4를 target-lane-surface에 놓을 때 세로 여유가 화면 0px뿐입니다(±0.0px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 5곳: candidate-strip-5를 target-lane-surface에 놓을 때 세로 여유가 화면 0px뿐입니다(±0.0px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 5곳: candidate-strip-6를 target-lane-surface에 놓을 때 세로 여유가 화면 0px뿐입니다(±0.0px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 writing-region-too-small** · 답 입력 · 20곳: prediction-box의 높이가 화면 40.6px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 20곳: number의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 20곳: prompt의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 writing-region-label-detached** · 답 입력 · 20곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-below-recommendation** · 답 입력 · 20곳: explanation-box의 높이가 화면 52.2px으로 손글씨 권장 60px 미만입니다.
- **P1 writing-region-label-detached** · 답 입력 · 20곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 inter-item-gap-too-small** · 문제의 위치 · 15곳: 문제 사이 최소 간격이 화면 13.9px입니다.
- **P1 outside-element-ambiguous-ownership** · 문제의 위치 · 15곳: 패널 밖 요소 8개가 자기 문제와 13.9px, 다음 문제와 38.3px 떨어져 있습니다(비율 2.75, 기준 3). 어느 문제의 것인지 학생이 구분하기 어렵습니다.

### number.make-10.cards-v1 (2학년)

- **P0 writing-region-too-small** · 답 입력 · 14곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 14곳: prediction-label가 화면 15.1px입니다. 2학년 권장 하한은 18px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 14곳: frame-label가 화면 15.1px입니다. 2학년 권장 하한은 18px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 14곳: explanation-label가 화면 15.1px입니다. 2학년 권장 하한은 18px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 14곳: pool-label가 화면 16.2px입니다. 2학년 권장 하한은 18px입니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 14곳: number의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 14곳: plus-operator의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 14곳: equals-operator의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 14곳: total-value의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 writing-region-label-detached** · 답 입력 · 14곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 14곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.

### relation.equal-sign.balanced-equation.cards-v1 (4학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: marking-hint("고른 수만큼 이어서 표시하기")가 fontSize 24 = 화면 13.9px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 writing-region-too-small** · 답 입력 · 9곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: prediction-label가 화면 14.5px입니다. 4학년 권장 하한은 17px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: top-row-label가 화면 14.5px입니다. 4학년 권장 하한은 17px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: bottom-row-label가 화면 14.5px입니다. 4학년 권장 하한은 17px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: pool-label가 화면 15.1px입니다. 4학년 권장 하한은 17px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: explanation-label가 화면 14.5px입니다. 4학년 권장 하한은 17px입니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: number의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: left-a의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: plus-left의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: left-b의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: equals의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: right-c의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: plus-right의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: piece-card-1 → answer-slot의 여유가 화면 9.3px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: piece-card-2 → answer-slot의 여유가 화면 9.3px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: piece-card-3 → answer-slot의 여유가 화면 9.3px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: piece-card-4 → answer-slot의 여유가 화면 9.3px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: piece-card-5 → answer-slot의 여유가 화면 9.3px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: piece-card-6 → answer-slot의 여유가 화면 9.3px입니다. 권장은 16px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-below-recommendation** · 답 입력 · 9곳: explanation-box의 높이가 화면 58px으로 손글씨 권장 60px 미만입니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.

### relation.equal-sign.balance-scale.sum-card-v1 (4학년)

- **P0 writing-region-too-small** · 답 입력 · 9곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: prediction-label가 화면 14.5px입니다. 4학년 권장 하한은 17px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: pool-label가 화면 15.1px입니다. 4학년 권장 하한은 17px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: explanation-label가 화면 14.5px입니다. 4학년 권장 하한은 17px입니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: number의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: left-a의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: plus의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: left-b의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: equals의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: unknown-result의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.

### measure.time.clock.hour-hand-boundary-v1 (2학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: prediction-label("내가 고른 곳")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: pool-label("고를 수 있는 말")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: position-card-1("10 바로 위")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: position-card-2("8 바로 위")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: position-card-3("7과 8 사이, 7에 가까이")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: position-card-4("7과 8 사이, 8에 가까이")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: position-card-5("7 바로 위")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: explanation-label("확인한 뒤 쓴 까닭")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 writing-region-too-small** · 답 입력 · 9곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: number가 화면 16.2px입니다. 2학년 권장 하한은 18px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: question가 화면 17.4px입니다. 2학년 권장 하한은 18px입니다.
- **P1 interactive-target-below-recommendation** · 답 입력 · 9곳: prediction-box의 짧은 변이 화면 37.1px입니다. 초등 조작 권장은 44px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-1 → prediction-box의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-2 → prediction-box의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-3 → prediction-box의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-4 → prediction-box의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-5 → prediction-box의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 item-question-ungated** · 수학적 배움 · 9곳: 문항 질문 question("7시에서 긴바늘을 50분까지 돌리면 ")가 language.classroom-korean의 promptRoles에 없어 학생이 이해할 한국어인지 아무도 검사하지 않습니다.

### measure.time.elapsed.clock-pair-v1 (2학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: start-clock-label("시작")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: end-clock-label("끝")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: prediction-label("내가 고른 시간")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: pool-label("고를 수 있는 시간")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: position-card-1("60분")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: position-card-2("50분")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: position-card-3("15분")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: position-card-4("85분")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: position-card-5("45분")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: explanation-label("확인한 뒤 쓴 까닭")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 writing-region-too-small** · 답 입력 · 9곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: number가 화면 16.2px입니다. 2학년 권장 하한은 18px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: question가 화면 17.4px입니다. 2학년 권장 하한은 18px입니다.
- **P1 interactive-target-below-recommendation** · 답 입력 · 9곳: prediction-box의 짧은 변이 화면 37.1px입니다. 초등 조작 권장은 44px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-1 → prediction-box의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-2 → prediction-box의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-3 → prediction-box의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-4 → prediction-box의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-5 → prediction-box의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 item-question-ungated** · 수학적 배움 · 9곳: 문항 질문 question("4시 50분부터 5시 35분까지 몇 ")가 language.classroom-korean의 promptRoles에 없어 학생이 이해할 한국어인지 아무도 검사하지 않습니다.

### fraction.add.same-denominator.strips-v1 (4학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: left-strip-label("첫째 띠")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: right-strip-label("둘째 띠")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: join-lane-label("띠 이어 붙이기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: prediction-label("내가 고른 합")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: pool-label("고를 수 있는 답")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: explanation-label("까닭 쓰기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 writing-region-too-small** · 답 입력 · 9곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: number가 화면 16.2px입니다. 4학년 권장 하한은 17px입니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: question의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: position-card-1의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: position-card-2의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: position-card-3의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: position-card-4의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: position-card-5의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: left-strip → join-lane의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: right-strip → join-lane의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 interactive-target-below-recommendation** · 답 입력 · 9곳: prediction-box의 짧은 변이 화면 37.1px입니다. 초등 조작 권장은 44px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-1 → prediction-box의 여유가 화면 7px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-2 → prediction-box의 여유가 화면 7px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-3 → prediction-box의 여유가 화면 7px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-4 → prediction-box의 여유가 화면 7px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: position-card-5 → prediction-box의 여유가 화면 7px입니다. 권장은 16px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.

### fraction.add.same-denominator.improper-sum-v1 (4학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: left-strip-label("첫째 띠")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: right-strip-label("둘째 띠")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: join-lane-label("띠 이어 붙이기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: prediction-label("내가 고른 합")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: pool-label("고를 수 있는 답")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: explanation-label("까닭 쓰기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: one-whole-label("여기까지가 1")가 fontSize 22 = 화면 12.8px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 drop-slack-too-tight** · 답 입력 · 3곳: position-card-1를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 3곳: position-card-2를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 3곳: position-card-3를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 3곳: position-card-4를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 3곳: position-card-5를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 writing-region-too-small** · 답 입력 · 9곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: number가 화면 16.2px입니다. 4학년 권장 하한은 17px입니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: question의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: position-card-1의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: position-card-2의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: position-card-3의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: position-card-4의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: position-card-5의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: left-strip → join-lane의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: right-strip → join-lane의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 interactive-target-below-recommendation** · 답 입력 · 9곳: prediction-box의 짧은 변이 화면 37.1px입니다. 초등 조작 권장은 44px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.

### fraction.add.unlike-denominators.common-unit-v1 (5학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: left-strip-label("첫째 띠")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: right-strip-label("둘째 띠")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: join-lane-label("띠 이어 붙이기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: prediction-label("내가 고른 합")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: pool-label("고를 수 있는 답")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: explanation-label("까닭 쓰기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: unit-ruler-label("같은 크기의 칸")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-1를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-2를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-3를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-4를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-5를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 writing-region-too-small** · 답 입력 · 5곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: question의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-1의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-2의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-3의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-4의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-5의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 2곳: left-strip → join-lane의 여유가 화면 8.1px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 2곳: right-strip → join-lane의 여유가 화면 8.1px입니다. 권장은 16px입니다.
- **P1 interactive-target-below-recommendation** · 답 입력 · 5곳: prediction-box의 짧은 변이 화면 37.1px입니다. 초등 조작 권장은 44px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.

### fraction.subtract.unlike-denominators.common-unit-v1 (5학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: left-strip-label("처음 띠")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: right-strip-label("덮는 띠")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: join-lane-label("띠 덮어 보기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: prediction-label("내가 고른 차")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: pool-label("고를 수 있는 답")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: explanation-label("까닭 쓰기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: unit-ruler-label("같은 크기의 칸")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-1를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-2를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-3를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-4를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-5를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 writing-region-too-small** · 답 입력 · 5곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: question의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-1의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-2의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-3의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-4의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-5의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 2곳: left-strip → join-lane의 여유가 화면 8.1px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 2곳: right-strip → join-lane의 여유가 화면 8.1px입니다. 권장은 16px입니다.
- **P1 interactive-target-below-recommendation** · 답 입력 · 5곳: prediction-box의 짧은 변이 화면 37.1px입니다. 초등 조작 권장은 44px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.

### data.bar-graph.scale-unit.read-v1 (4학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: left-strip-label("초록 막대")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: right-strip-label("파란 막대")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: join-lane-label("눈금 맞추기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: prediction-label("내가 고른 수")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: pool-label("고를 수 있는 답")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: explanation-label("까닭 쓰기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: unit-ruler-label("눈금")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: left-strip를 reference-lane에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: right-strip를 question-lane에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-1를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-2를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-3를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-4를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-5를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 writing-region-too-small** · 답 입력 · 5곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 5곳: number가 화면 16.2px입니다. 4학년 권장 하한은 17px입니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-1의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-2의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-3의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-4의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-5의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 interactive-target-below-recommendation** · 답 입력 · 5곳: prediction-box의 짧은 변이 화면 37.1px입니다. 초등 조작 권장은 44px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.

### measure.length.unit-iteration.ruler-v1 (2학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: question("연필의 왼쪽 끝이 자의 시작점")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: left-strip-label("연필")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: right-strip-label("1 cm 막대")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: join-lane-label("1 cm 막대 놓기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: prediction-label("내가 고른 길이")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: pool-label("고를 수 있는 길이(cm)")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: explanation-label("길이와 까닭 쓰기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: unit-ruler-label("1 cm씩 나눈 자")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-1를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-2를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-3를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-4를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-5를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 writing-region-too-small** · 답 입력 · 5곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 5곳: number가 화면 16.2px입니다. 2학년 권장 하한은 18px입니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(23, 13.3px)이 보기 position-card-1(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(23, 13.3px)이 보기 position-card-2(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(23, 13.3px)이 보기 position-card-3(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(23, 13.3px)이 보기 position-card-4(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(23, 13.3px)이 보기 position-card-5(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-1의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-2의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-3의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-4의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-5의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 interactive-target-below-recommendation** · 답 입력 · 5곳: prediction-box의 짧은 변이 화면 37.1px입니다. 초등 조작 권장은 44px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.

### number.place-value.regroup-ten-bundles-v1 (2학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: prediction-label("내가 고른 수")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: pool-label("고를 수 있는 수")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: explanation-label("수가 바뀐 까닭 쓰기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: initial-label("처음 수")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: initial-decomposition("4백 + 0십 + 6일")가 fontSize 24 = 화면 13.9px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: ten-bank-label("십 모형 10개")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: exchange-box-label("묶음판 10칸 채우기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-label("10줄 × 10칸")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-row-1("□□□□□□□□□□")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-row-2("□□□□□□□□□□")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-row-3("□□□□□□□□□□")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-row-4("□□□□□□□□□□")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-row-5("□□□□□□□□□□")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-row-6("□□□□□□□□□□")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-row-7("□□□□□□□□□□")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-row-8("□□□□□□□□□□")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-row-9("□□□□□□□□□□")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-row-10("□□□□□□□□□□")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: hundred-grid-relation("10 × 10 = 100")가 fontSize 24 = 화면 13.9px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: exchange-ten-1를 exchange-slot-1에 놓을 때 세로 여유가 화면 4.6px뿐입니다(±2.3px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: exchange-ten-2를 exchange-slot-2에 놓을 때 세로 여유가 화면 4.6px뿐입니다(±2.3px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: exchange-ten-3를 exchange-slot-3에 놓을 때 세로 여유가 화면 4.6px뿐입니다(±2.3px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: exchange-ten-4를 exchange-slot-4에 놓을 때 세로 여유가 화면 4.6px뿐입니다(±2.3px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: exchange-ten-5를 exchange-slot-5에 놓을 때 세로 여유가 화면 4.6px뿐입니다(±2.3px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: exchange-ten-6를 exchange-slot-6에 놓을 때 세로 여유가 화면 4.6px뿐입니다(±2.3px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: exchange-ten-7를 exchange-slot-7에 놓을 때 세로 여유가 화면 4.6px뿐입니다(±2.3px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: exchange-ten-8를 exchange-slot-8에 놓을 때 세로 여유가 화면 4.6px뿐입니다(±2.3px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: exchange-ten-9를 exchange-slot-9에 놓을 때 세로 여유가 화면 4.6px뿐입니다(±2.3px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: exchange-ten-10를 exchange-slot-10에 놓을 때 세로 여유가 화면 4.6px뿐입니다(±2.3px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-1를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-2를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-3를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-4를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-5를 prediction-box에 놓을 때 세로 여유가 화면 2.3px뿐입니다(±1.1px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 writing-region-too-small** · 답 입력 · 5곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 5곳: number가 화면 16.2px입니다. 2학년 권장 하한은 18px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 5곳: question가 화면 15.7px입니다. 2학년 권장 하한은 18px입니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-1(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-2(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-3(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-4(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-5(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-1의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-2의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-3의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-4의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-5의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 interactive-target-below-recommendation** · 답 입력 · 5곳: prediction-box의 짧은 변이 화면 37.1px입니다. 초등 조작 권장은 44px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.

### pattern.repeat-unit.pattern-blocks-v1 (2학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: prediction-label("내가 고른 조각 수")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: pool-label("고를 수 있는 조각 수")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: explanation-label("되풀이되는 까닭 쓰기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: pattern-label("이어 놓을 자리")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: piece-bank-label("이어 놓을 조각")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-1를 prediction-box에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-2를 prediction-box에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-3를 prediction-box에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-4를 prediction-box에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-5를 prediction-box에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 writing-region-too-small** · 답 입력 · 5곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 5곳: number가 화면 16.2px입니다. 2학년 권장 하한은 18px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 5곳: question가 화면 15.7px입니다. 2학년 권장 하한은 18px입니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-1(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-2(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-3(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-4(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-5(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: number의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-1의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-2의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-3의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-4의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-5의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 interactive-target-below-recommendation** · 답 입력 · 5곳: prediction-box의 짧은 변이 화면 37.1px입니다. 초등 조작 권장은 44px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 2곳: completion-block-2 → next-slot-1의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 1곳: completion-block-3 → next-slot-1의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 2곳: completion-block-2 → next-slot-2의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 1곳: completion-block-3 → next-slot-2의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 1곳: completion-block-4 → next-slot-1의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 1곳: completion-block-4 → next-slot-2의 여유가 화면 11.6px입니다. 권장은 16px입니다.

### number.multiplication.group-array-meaning-v1 (2학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: prediction-label("내가 고른 식")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: pool-label("고를 수 있는 식")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: explanation-label("두 수의 뜻 쓰기")가 fontSize 23 = 화면 13.3px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 5곳: array-text("(●●●●)  (●●●●)  ")가 fontSize 24 = 화면 13.9px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-1를 prediction-box에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-2를 prediction-box에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-3를 prediction-box에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-4를 prediction-box에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 2곳: position-card-5를 prediction-box에 놓을 때 세로 여유가 화면 3.5px뿐입니다(±1.8px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 writing-region-too-small** · 답 입력 · 5곳: prediction-box의 높이가 화면 37.1px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 5곳: number가 화면 16.2px입니다. 2학년 권장 하한은 18px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 5곳: question가 화면 15.7px입니다. 2학년 권장 하한은 18px입니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 5곳: group-label가 화면 14.5px입니다. 2학년 권장 하한은 18px입니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-1(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-2(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-3(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-4(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 5곳: 질문 question(27, 15.7px)이 보기 position-card-5(32, 18.6px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: number의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-1의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-2의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-3의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-4의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 5곳: position-card-5의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 interactive-target-below-recommendation** · 답 입력 · 5곳: prediction-box의 짧은 변이 화면 37.1px입니다. 초등 조작 권장은 44px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 5곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.

### probability.compare.bag-ratios-v1 (6학년)

- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: choice-pool-label("비교 기호")가 fontSize 22 = 화면 12.8px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: prediction-label("내가 고른 기호")가 fontSize 24 = 화면 13.9px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: left-lane-label("첫째")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: right-lane-label("둘째")가 fontSize 20 = 화면 11.6px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: explanation-label("비교한 까닭")가 fontSize 24 = 화면 13.9px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 text-below-absolute-minimum** · 폰트 크기 · 9곳: bag-context("첫째 주머니는 전체 6개 중 ")가 fontSize 21 = 화면 12.2px로, 어떤 학년에도 허용하지 않는 하한 14px 미만입니다.
- **P0 drop-slack-too-tight** · 답 입력 · 3곳: left-strip를 left-lane-surface에 놓을 때 세로 여유가 화면 0px뿐입니다(±0.0px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 drop-slack-too-tight** · 답 입력 · 3곳: right-strip를 right-lane-surface에 놓을 때 세로 여유가 화면 0px뿐입니다(±0.0px). 학생이 픽셀 단위로 맞춰야 합니다.
- **P0 writing-region-too-small** · 답 입력 · 9곳: prediction-box의 높이가 화면 40.6px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P0 writing-region-too-small** · 답 입력 · 9곳: explanation-box의 높이가 화면 40.6px입니다. MathCanvas에는 학생용 입력 필드가 없어 텍스트 객체 생성이나 펜 손글씨로만 채울 수 있고, 그러려면 최소 44px가 필요합니다.
- **P1 text-below-grade-recommendation** · 폰트 크기 · 9곳: relation-slot-label가 화면 15.1px입니다. 6학년 권장 하한은 16px입니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 9곳: 질문 prompt(48, 27.9px)이 보기 less-symbol(64, 37.1px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 9곳: 질문 prompt(48, 27.9px)이 보기 greater-symbol(64, 37.1px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 question-not-visually-dominant** · 학생 이해 · 9곳: 질문 prompt(48, 27.9px)이 보기 equal-symbol(64, 37.1px)보다 작습니다. 학생이 무엇을 묻는지보다 무엇을 고를지를 먼저 봅니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: number의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: prompt의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: less-symbol의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: greater-symbol의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 text-fit-unguarded-role** · 폰트 크기 · 9곳: equal-symbol의 고정 문구가 visual.text-fit 대상에 없어 생성 값이 길어져도 넘침을 아무도 막지 않습니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: less-symbol → relation-slot-surface의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: greater-symbol → relation-slot-surface의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 drop-slack-below-recommendation** · 답 입력 · 3곳: equal-symbol → relation-slot-surface의 여유가 화면 11.6px입니다. 권장은 16px입니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: prediction-label이 prediction-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 writing-region-label-detached** · 답 입력 · 9곳: explanation-label이 explanation-box 바깥에 떠 있습니다. 라벨을 상자 안 머리말로 묶어야 학생이 그곳이 쓰는 자리임을 압니다.
- **P1 inter-item-gap-too-small** · 문제의 위치 · 6곳: 문제 사이 최소 간격이 화면 13.9px입니다.
- **P1 outside-element-ambiguous-ownership** · 문제의 위치 · 6곳: 패널 밖 요소 7개가 자기 문제와 13.9px, 다음 문제와 32.5px 떨어져 있습니다(비율 2.33, 기준 3). 어느 문제의 것인지 학생이 구분하기 어렵습니다.

## 판정 기준

P0는 학생이 활동을 제대로 수행할 수 없게 만드는 문제로 출시를 막습니다.
P1은 배포 전 개선 대상입니다. 임계값과 그 근거는 `scripts/quality-audit/thresholds.mjs`에 있습니다.
