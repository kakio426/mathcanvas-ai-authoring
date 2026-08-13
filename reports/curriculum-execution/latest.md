# 2022 개정 초등 수학 전체 실행 보드

- 실행 모드: **continuous-autonomous**
- 공식 분모: **121개 성취기준**
- 대표 격자: **1/12 pipeline-proven**
- reviewed target set: **4/121**
- 현재 검토된 target: **11개 · offline 6 · live 2**
- 전역 target coverage: **unavailable**
- 남은 성취기준 작업 queue: **120개**

> 이 보드는 released 활동 reach와 성취기준 완전 커버리지를 합치지 않습니다. 전체 target 분모가 완성되기 전에는 전역 백분율을 제시하지 않습니다.

## 연속 실행 계약

- 대표 셀이나 성취기준 하나가 끝날 때마다 사용자에게 다음 항목을 묻지 않는다.
- offline 제작 레인과 외부 MathCanvas live-evidence 레인을 분리해 한쪽 차단이 다른 쪽을 멈추지 않게 한다.
- 가능하면 네 영역을 한 항목씩 포함한 4개 성취기준을 한 배치로 처리한다.
- 각 배치는 보고서 갱신, pnpm check, 원자적 main 커밋과 push까지 닫고 다음 배치로 이어진다.
- Fable CLI를 호출하지 않는다.
- 현재 해시의 canary가 없으면 live-released로 승격하지 않는다.

## 전체 단계

| 단계 | 목표 | 상태 | 현재 증거 |
|---|---|---|---|
| 0 | 공식 분모와 카탈로그 권위 | complete | 121/121 |
| 1 | 공통 ProblemFamily 기반 | complete | 131 canonical / 21 released |
| 2 | 학년군×영역 대표 격자 | in-progress | 1/12 pipeline-proven |
| 3A | 121개 AssessmentTargetSet 완전 분해 | in-progress | 4/121 |
| 3B | 필수 target family·offline 검증 | in-progress | 6/11 reviewed targets; global denominator incomplete |
| 3C | 현재 해시 live create·저장·재열기 | in-progress | 2/11 reviewed targets; global denominator incomplete |
| 4 | 전 범위 TeacherRequest·반영 표·실제 미리보기 | queued-after-phase-2 | 8/131 common-parameter families |
| 5 | 문항 단위 수정·최종 제품 릴리스 | queued | not globally measured |

## 지금 자동으로 선택된 작업

- offline 레인: [2수04-01] · data.classification.given-criterion-count-v1 · family 설계·offline 검증
- live-evidence 레인: 없음
- 대표 격자 이후 breadth 레인: [2수04-01] · 미지원 reviewed target family 추가

## 12개 대표 격자

| 순서 | 학년군×영역 | 성취기준 | 대표 family | family 상태 | target | 셀 상태 | 다음 동작 |
|---:|---|---|---|---|---|---|---|
| R01 | 1-2 × 자료와 가능성 | [2수04-01] | data.classification.given-criterion-count-v1 | generatable | 0/4 | candidate-needs-implementation | family 설계·offline 검증 |
| R02 | 1-2 × 변화와 관계 | [2수02-01] | pattern.repeat-unit.pattern-blocks-v1 | live-released | 2/2 | pipeline-proven | 현재 해시 증거 유지 |
| R03 | 3-4 × 도형과 측정 | [4수03-09] | geometry.triangle.classification.claim-evidence-v1 | live-released | 미분해 | released-candidate-needs-target-review | target 완전 분해·released family 이관 |
| R04 | 5-6 × 수와 연산 | [6수01-06] | fraction.equivalent.same-whole.visual-v1 | live-released | 미분해 | released-candidate-needs-target-review | target 완전 분해·released family 이관 |
| R05 | 1-2 × 도형과 측정 | [2수03-10] | measure.length.unit-iteration.ruler-v1 | live-released | 미분해 | released-candidate-needs-target-review | target 완전 분해·released family 이관 |
| R06 | 3-4 × 자료와 가능성 | [4수04-01] | data.bar-graph.scale-unit.read-v1 | live-released | 미분해 | released-candidate-needs-target-review | target 완전 분해·released family 이관 |
| R07 | 5-6 × 변화와 관계 | [6수02-02] | relation.ratio.same-unit.claim-evidence-v1 | offline-validated | 미분해 | offline-candidate-needs-target-review | target 완전 분해·offline family 검증 |
| R08 | 1-2 × 수와 연산 | [2수01-04] | number.make-10.cards-v1 | live-released | 미분해 | released-candidate-needs-target-review | target 완전 분해·released family 이관 |
| R09 | 3-4 × 변화와 관계 | [4수02-03] | relation.equal-sign.balance-scale.sum-card-v1 | live-released | 미분해 | released-candidate-needs-target-review | target 완전 분해·released family 이관 |
| R10 | 5-6 × 자료와 가능성 | [6수04-04] | probability.compare.bag-ratios-v1 | live-released | 미분해 | released-candidate-needs-target-review | target 완전 분해·released family 이관 |
| R11 | 3-4 × 수와 연산 | [4수01-06] | number.division.quotient-remainder.claim-evidence-v1 | live-released | 미분해 | released-candidate-needs-target-review | target 완전 분해·released family 이관 |
| R12 | 5-6 × 도형과 측정 | [6수03-02] | geometry.symmetry.equal-distance.claim-evidence-v1 | live-released | 미분해 | released-candidate-needs-target-review | target 완전 분해·released family 이관 |

## 121개 성취기준 작업 유형

| 작업 | 성취기준 수 |
|---|---:|
| 현재 해시 canary·저장·재열기 | 1 |
| 완료 | 1 |
| 미지원 reviewed target family 추가 | 2 |
| target 완전 분해 → released family 결속 | 17 |
| target 완전 분해 → offline family 검증·출시 | 100 |

새 family 설계가 필요한 기준선은 `reports/curriculum-execution/no-family-plan.md`의 24 engine · 84 grade-band-safe track · W001~W097 계획을 사용한다.

## 전체 breadth queue

대표 격자 뒤에는 아래 순서를 다시 묻지 않고 진행한다. 같은 rotation 안에서 학년군과 영역을 바꾸며 한 셀에 몰리지 않게 한다.

| queue | rotation | 코드 | 학년군 | 영역 | 다음 동작 | 기존 family |
|---:|---:|---|---|---|---|---|
| 1 | 1 | [2수04-01] | 1-2 | 자료와 가능성 | 미지원 reviewed target family 추가 | data.classification.given-criterion-count-v1 |
| 2 | 1 | [4수03-09] | 3-4 | 도형과 측정 | target 완전 분해 → released family 결속 | geometry.triangle.classification.claim-evidence-v1 |
| 3 | 1 | [6수01-06] | 5-6 | 수와 연산 | target 완전 분해 → released family 결속 | fraction.equivalent.same-whole.visual-v1 |
| 4 | 1 | [2수03-10] | 1-2 | 도형과 측정 | target 완전 분해 → released family 결속 | measure.length.unit-iteration.ruler-v1 |
| 5 | 1 | [4수04-01] | 3-4 | 자료와 가능성 | target 완전 분해 → released family 결속 | data.bar-graph.represent-from-table-v1, data.bar-graph.scale-unit.read-v1, data.picture-graph.key.claim-evidence-v1 |
| 6 | 1 | [6수02-02] | 5-6 | 변화와 관계 | target 완전 분해 → offline family 검증·출시 | relation.ratio.same-unit.claim-evidence-v1 |
| 7 | 1 | [2수01-04] | 1-2 | 수와 연산 | target 완전 분해 → released family 결속 | number.make-10.cards-v1 |
| 8 | 1 | [4수02-03] | 3-4 | 변화와 관계 | target 완전 분해 → released family 결속 | relation.equal-sign.balance-scale.sum-card-v1, relation.equal-sign.balanced-equation.cards-v1 |
| 9 | 1 | [6수04-04] | 5-6 | 자료와 가능성 | target 완전 분해 → released family 결속 | probability.compare.bag-ratios-v1 |
| 10 | 1 | [4수01-06] | 3-4 | 수와 연산 | target 완전 분해 → released family 결속 | number.division.partial-quotients.construction-v1, number.division.quotient-remainder.claim-evidence-v1 |
| 11 | 1 | [6수03-02] | 5-6 | 도형과 측정 | target 완전 분해 → released family 결속 | geometry.symmetry.equal-distance.claim-evidence-v1 |
| 12 | 2 | [2수04-02] | 1-2 | 자료와 가능성 | 현재 해시 canary·저장·재열기 | data.early-table.organize-v1, portfolio.2su04-02.diagnostic-v1 |
| 13 | 2 | [2수02-02] | 1-2 | 변화와 관계 | 미지원 reviewed target family 추가 | pattern.create-repeat-unit-explain-v1, pattern.declared-repeat.repair-v1, pattern.repeat-unit.construct-v1, portfolio.2su02-02.diagnostic-v1 |
| 14 | 2 | [4수03-01] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-01.diagnostic-v1 |
| 15 | 2 | [6수01-01] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | number.mixed-calculation.order.claim-evidence-v1 |
| 16 | 2 | [2수03-01] | 1-2 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.2su03-01.diagnostic-v1 |
| 17 | 2 | [4수04-02] | 3-4 | 자료와 가능성 | target 완전 분해 → offline family 검증·출시 | portfolio.4su04-02.diagnostic-v1 |
| 18 | 2 | [6수02-01] | 5-6 | 변화와 관계 | target 완전 분해 → offline family 검증·출시 | portfolio.6su02-01.diagnostic-v1 |
| 19 | 2 | [2수01-01] | 1-2 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.2su01-01.diagnostic-v1 |
| 20 | 2 | [4수02-01] | 3-4 | 변화와 관계 | target 완전 분해 → offline family 검증·출시 | portfolio.4su02-01.diagnostic-v1 |
| 21 | 2 | [6수04-01] | 5-6 | 자료와 가능성 | target 완전 분해 → offline family 검증·출시 | portfolio.6su04-01.diagnostic-v1 |
| 22 | 2 | [4수01-01] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-01.diagnostic-v1 |
| 23 | 2 | [6수03-01] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-01.diagnostic-v1 |
| 24 | 3 | [2수04-03] | 1-2 | 자료와 가능성 | target 완전 분해 → offline family 검증·출시 | portfolio.2su04-03.diagnostic-v1 |
| 25 | 3 | [4수03-02] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-02.diagnostic-v1 |
| 26 | 3 | [6수01-02] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.6su01-02.diagnostic-v1 |
| 27 | 3 | [2수03-02] | 1-2 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.2su03-02.diagnostic-v1 |
| 28 | 3 | [4수04-03] | 3-4 | 자료와 가능성 | target 완전 분해 → offline family 검증·출시 | portfolio.4su04-03.diagnostic-v1 |
| 29 | 3 | [6수02-03] | 5-6 | 변화와 관계 | target 완전 분해 → offline family 검증·출시 | portfolio.6su02-03.diagnostic-v1 |
| 30 | 3 | [2수01-02] | 1-2 | 수와 연산 | target 완전 분해 → released family 결속 | number.place-value.regroup-ten-bundles-v1 |
| 31 | 3 | [4수02-02] | 3-4 | 변화와 관계 | target 완전 분해 → offline family 검증·출시 | portfolio.4su02-02.diagnostic-v1 |
| 32 | 3 | [6수04-02] | 5-6 | 자료와 가능성 | target 완전 분해 → offline family 검증·출시 | portfolio.6su04-02.diagnostic-v1 |
| 33 | 3 | [4수01-02] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-02.diagnostic-v1 |
| 34 | 3 | [6수03-03] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-03.diagnostic-v1 |
| 35 | 4 | [4수03-03] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-03.diagnostic-v1 |
| 36 | 4 | [6수01-03] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.6su01-03.diagnostic-v1 |
| 37 | 4 | [2수03-03] | 1-2 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.2su03-03.diagnostic-v1 |
| 38 | 4 | [6수02-04] | 5-6 | 변화와 관계 | target 완전 분해 → offline family 검증·출시 | portfolio.6su02-04.diagnostic-v1 |
| 39 | 4 | [2수01-03] | 1-2 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.2su01-03.diagnostic-v1 |
| 40 | 4 | [6수04-03] | 5-6 | 자료와 가능성 | target 완전 분해 → offline family 검증·출시 | data.graph.purpose.claim-evidence-v1 |
| 41 | 4 | [4수01-03] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-03.diagnostic-v1 |
| 42 | 4 | [6수03-04] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-04.diagnostic-v1 |
| 43 | 5 | [4수03-04] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-04.diagnostic-v1 |
| 44 | 5 | [6수01-04] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | number.factor-pairs.array-construction-v1 |
| 45 | 5 | [2수03-04] | 1-2 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.2su03-04.diagnostic-v1 |
| 46 | 5 | [6수02-05] | 5-6 | 변화와 관계 | target 완전 분해 → offline family 검증·출시 | portfolio.6su02-05.diagnostic-v1 |
| 47 | 5 | [2수01-05] | 1-2 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.2su01-05.diagnostic-v1 |
| 48 | 5 | [6수04-05] | 5-6 | 자료와 가능성 | target 완전 분해 → offline family 검증·출시 | portfolio.6su04-05.diagnostic-v1 |
| 49 | 5 | [4수01-04] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | number.multiplication.partial-products.construction-v1 |
| 50 | 5 | [6수03-05] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-05.diagnostic-v1 |
| 51 | 6 | [4수03-05] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-05.diagnostic-v1 |
| 52 | 6 | [6수01-05] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.6su01-05.diagnostic-v1 |
| 53 | 6 | [2수03-05] | 1-2 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.2su03-05.diagnostic-v1 |
| 54 | 6 | [2수01-06] | 1-2 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.2su01-06.diagnostic-v1 |
| 55 | 6 | [6수04-06] | 5-6 | 자료와 가능성 | target 완전 분해 → offline family 검증·출시 | portfolio.6su04-06.diagnostic-v1 |
| 56 | 6 | [4수01-05] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-05.diagnostic-v1 |
| 57 | 6 | [6수03-06] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-06.diagnostic-v1 |
| 58 | 7 | [4수03-06] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-06.diagnostic-v1 |
| 59 | 7 | [6수01-07] | 5-6 | 수와 연산 | target 완전 분해 → released family 결속 | fraction.compare.unlike-denominators.visual-v1 |
| 60 | 7 | [2수03-06] | 1-2 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.2su03-06.diagnostic-v1 |
| 61 | 7 | [2수01-07] | 1-2 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.2su01-07.diagnostic-v1 |
| 62 | 7 | [4수01-07] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-07.diagnostic-v1 |
| 63 | 7 | [6수03-07] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-07.diagnostic-v1 |
| 64 | 8 | [4수03-07] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-07.diagnostic-v1 |
| 65 | 8 | [6수01-08] | 5-6 | 수와 연산 | target 완전 분해 → released family 결속 | fraction.add.unlike-denominators.common-unit-v1, fraction.subtract.unlike-denominators.common-unit-v1 |
| 66 | 8 | [2수03-07] | 1-2 | 도형과 측정 | target 완전 분해 → released family 결속 | measure.time.clock.hour-hand-boundary-v1 |
| 67 | 8 | [2수01-08] | 1-2 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.2su01-08.diagnostic-v1 |
| 68 | 8 | [4수01-08] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-08.diagnostic-v1 |
| 69 | 8 | [6수03-08] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-08.diagnostic-v1 |
| 70 | 9 | [4수03-08] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-08.diagnostic-v1 |
| 71 | 9 | [6수01-09] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.6su01-09.diagnostic-v1 |
| 72 | 9 | [2수03-08] | 1-2 | 도형과 측정 | target 완전 분해 → released family 결속 | measure.time.elapsed.clock-pair-v1 |
| 73 | 9 | [2수01-09] | 1-2 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.2su01-09.diagnostic-v1 |
| 74 | 9 | [4수01-09] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-09.diagnostic-v1 |
| 75 | 9 | [6수03-09] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-09.diagnostic-v1 |
| 76 | 10 | [4수03-10] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-10.diagnostic-v1 |
| 77 | 10 | [6수01-10] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.6su01-10.diagnostic-v1 |
| 78 | 10 | [2수03-09] | 1-2 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.2su03-09.diagnostic-v1 |
| 79 | 10 | [2수01-10] | 1-2 | 수와 연산 | target 완전 분해 → released family 결속 | number.multiplication.group-array-meaning-v1 |
| 80 | 10 | [4수01-10] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-10.diagnostic-v1 |
| 81 | 10 | [6수03-10] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-10.diagnostic-v1 |
| 82 | 11 | [4수03-11] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-11.diagnostic-v1 |
| 83 | 11 | [6수01-11] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.6su01-11.diagnostic-v1 |
| 84 | 11 | [2수03-11] | 1-2 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.2su03-11.diagnostic-v1 |
| 85 | 11 | [2수01-11] | 1-2 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.2su01-11.diagnostic-v1 |
| 86 | 11 | [4수01-11] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-11.diagnostic-v1 |
| 87 | 11 | [6수03-11] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-11.diagnostic-v1 |
| 88 | 12 | [4수03-12] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-12.diagnostic-v1 |
| 89 | 12 | [6수01-12] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.6su01-12.diagnostic-v1 |
| 90 | 12 | [2수03-12] | 1-2 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.2su03-12.diagnostic-v1 |
| 91 | 12 | [4수01-12] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-12.diagnostic-v1 |
| 92 | 12 | [6수03-12] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-12.diagnostic-v1 |
| 93 | 13 | [4수03-13] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-13.diagnostic-v1 |
| 94 | 13 | [6수01-13] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.6su01-13.diagnostic-v1 |
| 95 | 13 | [2수03-13] | 1-2 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.2su03-13.diagnostic-v1 |
| 96 | 13 | [4수01-13] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-13.diagnostic-v1 |
| 97 | 13 | [6수03-13] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-13.diagnostic-v1 |
| 98 | 14 | [4수03-14] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-14.diagnostic-v1 |
| 99 | 14 | [6수01-14] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.6su01-14.diagnostic-v1 |
| 100 | 14 | [4수01-14] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-14.diagnostic-v1 |
| 101 | 14 | [6수03-14] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-14.diagnostic-v1 |
| 102 | 15 | [4수03-15] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-15.diagnostic-v1 |
| 103 | 15 | [6수01-15] | 5-6 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.6su01-15.diagnostic-v1 |
| 104 | 15 | [4수01-15] | 3-4 | 수와 연산 | target 완전 분해 → released family 결속 | fraction.add.same-denominator.improper-sum-v1, fraction.add.same-denominator.strips-v1 |
| 105 | 15 | [6수03-15] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-15.diagnostic-v1 |
| 106 | 16 | [4수03-16] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-16.diagnostic-v1 |
| 107 | 16 | [4수01-16] | 3-4 | 수와 연산 | target 완전 분해 → offline family 검증·출시 | portfolio.4su01-16.diagnostic-v1 |
| 108 | 16 | [6수03-16] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-16.diagnostic-v1 |
| 109 | 17 | [4수03-17] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-17.diagnostic-v1 |
| 110 | 17 | [6수03-17] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-17.diagnostic-v1 |
| 111 | 18 | [4수03-18] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-18.diagnostic-v1 |
| 112 | 18 | [6수03-18] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-18.diagnostic-v1 |
| 113 | 19 | [4수03-19] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-19.diagnostic-v1 |
| 114 | 19 | [6수03-19] | 5-6 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.6su03-19.diagnostic-v1 |
| 115 | 20 | [4수03-20] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-20.diagnostic-v1 |
| 116 | 21 | [4수03-21] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-21.diagnostic-v1 |
| 117 | 22 | [4수03-22] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-22.diagnostic-v1 |
| 118 | 23 | [4수03-23] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-23.diagnostic-v1 |
| 119 | 24 | [4수03-24] | 3-4 | 도형과 측정 | target 완전 분해 → released family 결속 | measure.angle.turn-size.claim-evidence-v1 |
| 120 | 25 | [4수03-25] | 3-4 | 도형과 측정 | target 완전 분해 → offline family 검증·출시 | portfolio.4su03-25.diagnostic-v1 |
