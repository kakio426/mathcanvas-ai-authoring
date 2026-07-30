# P0.5 Wave 4 — 전체 module/variant 정적 계약

4개 영역 46개 module의 304개 variant를 활동지별 템플릿이나 전용 factory가 아닌
데이터 계약으로 정규화했다.

- module 46, variant 304, constructor/shape cluster 79, shape family 70
- sub-toolbar option 66
- 원본 bundle SHA-256 결속
- 모든 정적 상태는 `captured` 유지
- 기존 released 범위는 `NO03FM` 직사각형 분수 모형 12개뿐
- 신규 MCP, `NativeToolIntent`, module별 adapter, 외부 write 없음
- 새 테스트 2개만 추가

정적 계약은 lifecycle 승격 자료가 아니므로 W4B 뒤에도 `captured` 정본으로 유지하고,
실측 결과는 별도 canary evidence에 기록한다. 첫 대표는 nested child 계약이 없는
단일 element 계열이며 variant 수가 많은 `NO04NT` 수 카드다. 별도 사용자 승인 전에는
프로젝트 생성이나 저장을 실행하지 않는다.

## W4B — NO04NT 숫자 카드 lifecycle

승인된 새 프로젝트에서 숫자 카드의 첫 그룹을 `모두 꺼내기`로 생성해
`NO04NT-01`~`NO04NT-10` 10개를 한 번에 검증했다.

- 생성 10, 렌더 10, 저장·재열기 10
- object ID와 `savedSvgId` 10개 보존
- 10개 모두 같은 wire field set과 `cluster:2ac3a9218428cf15`
- 배치·`svgId`를 제외한 field 차이 0
- `NO04NT-01`~`NO04NT-10`만 fail-closed adapter 범위로 release
- 연결된 Chrome에서는 요청 계측을 제공하지 않아
  `originalWriteCountMeasured: false`와 UI 생성·저장 action 수를 함께 기록
- canary provenance hash, evidence pointer, 전체 factory wire parity 자동 검증
- 전체 124 tests, typecheck, build, contract verify 통과
