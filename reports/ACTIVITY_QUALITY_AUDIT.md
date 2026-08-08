# MathCanvas 학생 화면 품질 감사

`visual:audit`이 계약 통과율을 본다면 이 감사는 학생이 실제 화면에서 겪는 것을 봅니다.
모든 판정은 캔버스 단위를 CSS px로 환산한 뒤 내립니다.

- 환산비: 1 캔버스 단위 = 417.82 px / 720 단위 = **0.5803 px** (근거: `research/mathcanvas/wave10-common-unit-release-canary.json`, viewport 1280x800)
- 상태: **pass**
- 활동 21개 / variation 93개
- P0 0건 / P1 0건

## 기준 축별 결과

| 축 | P0 | P1 |
|---|---:|---:|
| 문제의 위치 | 0 | 0 |
| 폰트 크기 | 0 | 0 |
| 수학적 배움 | 0 | 0 |
| 학생 이해 | 0 | 0 |
| 답 입력 | 0 | 0 |

## 검사별 요약

| 검사 | 등급 | 축 | 해당 활동 |
|---|---|---|---:|

## 회귀 기준 연결

`qa/regressions/`에 등록된 2개 회귀 중 2개가 자동 검사에 연결되어 있습니다.

- `2026-07-29-student-input-and-native-fraction-menu`: 학생 글쓰기 위치가 보이지 않음 / 분수식에 네이티브 수식 메뉴 미사용
  - 자동 검사: `writing-region-too-small`, `writing-region-label-detached`, `text-below-absolute-minimum`
  - 사람이 확인해야 하는 잔여 기준: 조작 모형은 네이티브 분수 모형을, 분수식은 수식 입력기를 우선한다
- `user-reported-1630x1122`: 분수 카드 넘침, 띠가 출발선을 덮음, 출발/도착 미분리, 기호에 출발 카드 없음, 읽는 순서 끊김
  - 자동 검사: `outside-element-ambiguous-ownership`, `drop-slack-too-tight`, `interactive-target-too-small`, `cross-item-overlap`

## 활동별 상세

### number.division.quotient-remainder.claim-evidence-v1 (3학년)

문제 없음

### measure.angle.turn-size.claim-evidence-v1 (4학년)

문제 없음

### geometry.triangle.classification.claim-evidence-v1 (4학년)

문제 없음

### geometry.symmetry.equal-distance.claim-evidence-v1 (5학년)

문제 없음

### fraction.compare.unlike-denominators.visual-v1 (5학년)

문제 없음

### fraction.equivalent.same-whole.visual-v1 (5학년)

문제 없음

### number.make-10.cards-v1 (2학년)

문제 없음

### relation.equal-sign.balanced-equation.cards-v1 (4학년)

문제 없음

### relation.equal-sign.balance-scale.sum-card-v1 (4학년)

문제 없음

### measure.time.clock.hour-hand-boundary-v1 (2학년)

문제 없음

### measure.time.elapsed.clock-pair-v1 (2학년)

문제 없음

### fraction.add.same-denominator.strips-v1 (4학년)

문제 없음

### fraction.add.same-denominator.improper-sum-v1 (4학년)

문제 없음

### fraction.add.unlike-denominators.common-unit-v1 (5학년)

문제 없음

### fraction.subtract.unlike-denominators.common-unit-v1 (5학년)

문제 없음

### data.bar-graph.scale-unit.read-v1 (4학년)

문제 없음

### measure.length.unit-iteration.ruler-v1 (2학년)

문제 없음

### number.place-value.regroup-ten-bundles-v1 (2학년)

문제 없음

### pattern.repeat-unit.pattern-blocks-v1 (2학년)

문제 없음

### number.multiplication.group-array-meaning-v1 (2학년)

문제 없음

### probability.compare.bag-ratios-v1 (6학년)

문제 없음

## 판정 기준

P0는 학생이 활동을 제대로 수행할 수 없게 만드는 문제로 출시를 막습니다.
P1은 배포 전 개선 대상입니다. 임계값과 그 근거는 `scripts/quality-audit/thresholds.mjs`에 있습니다.
