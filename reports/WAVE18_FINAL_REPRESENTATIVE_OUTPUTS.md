# Wave 18 최종 대표 결과물

기준일: 2026-08-01

현재 구현은 초등 수학 4개 영역에 걸친 17개 `released` 활동, MathCanvas native
도구 9종, 검증된 variation 89개를 제공한다. 모든 출시 활동은 선택을 먼저
드러내고, 오개념과 충돌하며, 화면의 수학적 불변량으로 스스로 확인한 뒤
설명·수정하는 흐름을 갖는다.

## 영역별 대표 결과

| 영역 | 대표 활동 | 실제 결과 화면 | 저장·재열기 증거 |
|---|---|---|---|
| 수와 연산 | 묶음 배열과 곱셈식 연결 | [multiplication-array.png](../.mathcanvas-contract-lab/previews/wave17/multiplication-array.png) | [wave17-multiplication-release-canary.json](../research/mathcanvas/wave17-multiplication-release-canary.json) |
| 변화와 관계 | 가장 짧은 반복 단위 찾기 | [repeating-pattern.png](../.mathcanvas-contract-lab/previews/wave16/repeating-pattern.png) | [wave16-pattern-release-canary.json](../research/mathcanvas/wave16-pattern-release-canary.json) |
| 도형과 측정 | 1 cm 단위 반복 길이 재기 | [broken-ruler-length.png](../.mathcanvas-contract-lab/previews/wave13/broken-ruler-length.png) | [wave13-broken-ruler-release-canary.json](../research/mathcanvas/wave13-broken-ruler-release-canary.json) |
| 자료와 가능성 | 두 주머니 가능성 비교 | [probability-bag-comparison.png](../.mathcanvas-contract-lab/previews/wave17/probability-bag-comparison.png) | [wave17-probability-release-canary.json](../research/mathcanvas/wave17-probability-release-canary.json) |

Wave 16~17의 실제 MathCanvas 프로젝트:

- 반복 규칙: <https://mathcanvas.vivasam.com/ko/view/51JyOp>
- 곱셈의 의미: <https://mathcanvas.vivasam.com/ko/view/5zK4Vu>
- 가능성 비교: <https://mathcanvas.vivasam.com/ko/view/iOWxJq>

## 현재 판정

- 품질 점수: **80/100**
- 강점: 수학적 사고 흐름, 한국 교육과정·교실 언어, 재현 가능한 출시 하네스
- 남은 큰 공백: 학생별 응답 수집, 실시간 진행 관찰, 교사 pacing 같은 수업 운영

수업 운영 공백은 활동지 생성 품질의 결함으로 숨기지 않는다. 다음 단계에서
85점 이상을 목표로 한다면 실제 교실 응답을 다루는 별도 런타임 경계를 설계해야
한다.
