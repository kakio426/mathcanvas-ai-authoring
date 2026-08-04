# MathCanvas 시각 품질 감사

- 상태: **fail**
- 활동: 17개
- variation: 89개
- 시각 감사 점수: **75.0/100**
- P0: 17건 / P1: 0건 / P2: 0건
- 실제 preview: 17/17개
- 실제 조작 후 canary: 13/17개 (나머지는 정적 조작 시뮬레이션)

## 계열별 결과

| 계열 | 활동 | 점수 | P0 | P1 |
|---|---:|---:|---:|---:|
| equation-card | 4 | 75.0 | 4 | 0 |
| strip-measurement | 9 | 75.0 | 9 | 0 |
| native-model | 4 | 75.0 | 4 | 0 |

## 남은 문제

- **P0 release-canary-stale-or-failed** · fraction.compare.unlike-denominators.visual-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · fraction.equivalent.same-whole.visual-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · number.make-10.cards-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · relation.equal-sign.balanced-equation.cards-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · relation.equal-sign.balance-scale.sum-card-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · measure.time.clock.hour-hand-boundary-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · measure.time.elapsed.clock-pair-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · fraction.add.same-denominator.strips-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · fraction.add.same-denominator.improper-sum-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · fraction.add.unlike-denominators.common-unit-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · fraction.subtract.unlike-denominators.common-unit-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · data.bar-graph.scale-unit.read-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · measure.length.unit-iteration.ruler-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · number.place-value.regroup-ten-bundles-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · pattern.repeat-unit.pattern-blocks-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · number.multiplication.group-array-meaning-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.
- **P0 release-canary-stale-or-failed** · probability.compare.bag-ratios-v1: 출시 canary가 현재 blueprint hash와 결속된 PASS 증거가 아닙니다.

## 판정 기준

P0는 출시 차단, P1은 배포 전 수정, P2는 후속 미감 개선입니다. 모든 variation에서 실제 rendered bounds를 사용하고, 선택물을 목표 중앙에 놓은 조작 후 상태까지 계산합니다. 실제 글자 잉크는 현재 blueprint·layout hash에 결속된 canary preview로 보완합니다. 이 점수는 자동 계약 통과율이며, 최종 미감·교육 품질 점수와는 구분합니다.
