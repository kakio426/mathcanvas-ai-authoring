# P3 Committed Build — 검증된 교사 variation과 제한적 출시

## Entry gate

`reports/P2_GO_NO_GO.md`가 구조 적합성 시험을 `GO`로 판정한 경우에만 실행한다.
활동별 core 분기나 재사용되지 않는 primitive가 남아 있으면 variation 기능을 추가하지 않는다.

## Role and objective

당신은 교사 저작 UX, 조합 폭발 제어, 승인 무결성, 운영 canary를 담당하는 수석 엔지니어다.

검증된 blueprint를 복제하거나 코드 분기를 추가하지 않고 교사가 다음 범위에서만
활동을 조정하게 한다.

- T0: 검증된 추천 기본값
- T1: 유한 knob
- T2: blueprint가 허용한 variation point

T3 자유 조립은 내부 연구 범위로 남기고 외부 MCP에는 노출하지 않는다.

## Target users

- 초등 교사: 기술적 좌표나 native tool ID를 보지 않고 수업 의도에 맞는 변형을 고른다.
- 학생: 모든 허용 조합에서 조작 가능성과 수학적 의미가 유지된 활동을 받는다.
- 운영자: released 조합과 contract drift를 증거 기반으로 관리한다.

## Scope and ordered requirements

### R1. variation 후보와 위험 분류 `[Core]`

P2의 실제 활동과 도구 계약을 기준으로 후보를 분류한다.

- T1 예: 난이도 band, 문항 수, 수 범위, 표현 방식, 안내 문구 수준
- T2 예: 허용된 representation slot 교체, 순서/방향, 비교/구성 조작 방식
- 금지: 좌표, raw tool ID, native field, arbitrary text code, 임의 item list,
  정답 payload, 무제한 count/range

각 후보에 교육 효과, 조합 수, layout 위험, 필요한 support evidence를 기록한다.
P2에서 넘어온 `provisional` primitive는 실제 두 번째 활동 소비를 추가해 재사용을
증명하거나 제거한다. unresolved `provisional`이 하나라도 있으면 release는 `NO-GO`다.

### R2. finite variation schema `[Core]`

- 각 blueprint는 자신이 허용하는 knob와 variation point를 명시한다.
- 모든 값은 enum 또는 상·하한이 작은 bounded integer/string union으로 제한한다.
- variation schema의 Cartesian product 크기를 계산한다.
- blueprint 하나의 허용 조합은 최대 256개, 전체 release suite는 최대 1,024개로 제한한다.
- 전역 기본값으로 조합을 열지 말고 blueprint별 허용 조합/금지 조합을 선언한다.
- unknown field와 지원되지 않은 조합은 fail-closed로 거부한다.
- variation이 core compiler나 validator의 activity switch로 전달되지 않게 한다.

### R3. representation 도구 deep probe `[Core]`

- 실제 variation에 필요한 도구만 조사한다.
- 분수 수직선 또는 P0 catalog에서 확인된 동등한 representation tool을 우선 후보로 삼는다.
- 생성, 고유 옵션, 조작, 저장, 재열기, API 왕복을 검증한다.
- creator-owned `AI-CONTRACT-PROBE-*`를 우선 사용하고 public project는
  probe가 불가능할 때만 fallback으로 사용한다.
- `probe-unavailable`과 `contract-mismatch`를 별도 상태로 기록한다.
- verified되지 않은 variation은 schema에 넣지 않는다.

### R4. variation resolution `[Core]`

- `ActivityBlueprint + variation + seed`를 단일 `ResolvedActivity`로 해소한다.
- 모든 선택 결과를 approval 전 확정한다.
- resolver는 variation마다 stable layout, resolved reference,
  native tool role을 산출한다.
- 승인 후 variation, blueprint version/hash, generator version, seed가 바뀌면 생성이 거부된다.
- fallback variation을 몰래 선택하지 않는다.

### R5. envelope 검증 `[Core]`

- blueprint별 허용 조합 전체를 생성한다.
- blueprint당 256개 또는 전체 1,024개를 넘으면 출시 범위를 줄이고 sampling으로
  안전을 추정하지 않는다.
- 각 조합에서 최소 다음을 검사한다.
  - schema와 reference 완결성
  - 수학 의미와 정답 조건
  - 초기 상태의 미충족 `requiresStudentAction` 제약
  - 중복/모호 문항
  - layout overlap/canvas bounds
  - native adapter option
  - lock/movable semantics
  - approval manifest integrity
- 실패 조합은 개별 blacklist 누적으로 덮지 말고 variation 범위나 primitive를 수정한다.

### R6. 교사-facing 추천 계약 `[Core]`

- planner는 자연어 의도를 released blueprint의 T0–T2로만 매핑한다.
- 교사가 선택하지 않은 값은 검증된 T0 default를 사용한다.
- 추천 결과에 선택된 옵션, 제한 이유, 지원되지 않는 요청을 사람이 이해할 수 있게 표시한다.
- low-confidence/범위 밖 요청은 명시적으로 거절하거나 가장 가까운 T0를
  승인 전에 제안하며 자동 생성하지 않는다.
- 좌표, tool ID, native object schema를 교사에게 노출하지 않는다.

### R7. released support gate `[Core]`

다음이 모두 충족된 조합만 `released`로 표시한다.

- tool contract가 verified
- blueprint/version/hash가 고정
- envelope test 통과
- 교육·수학 검토 통과
- approval/create-only end-to-end 통과
- 문서와 support matrix 갱신

도구, blueprint, variation을 각각 추적하며 하나의 전역 boolean으로 뭉치지 않는다.

### R8. live canary와 drift 대응 `[Core]`

- 생성자 소유 `AI-CONTRACT-PROBE-*`를 이용한 최소 live canary 절차를 만든다.
- 사용자 명시 실행 또는 안전한 운영 명령으로만 수행한다.
- 기존 프로젝트를 수정·삭제하지 않는다.
- 결과를 최소 다음 상태로 구분한다.
  - `pass`
  - `auth-required`
  - `probe-unavailable`
  - `palette-changed`
  - `contract-mismatch`
  - `delivery-failed`
- palette fingerprint 변화만으로 전체 생성을 막지 않는다.
- mismatch가 난 해당 tool/variation의 released state만 내리는 fail-closed 정책을 둔다.

### R9. 제품 표면과 문서 `[Core]`

- 외부 MCP에는 released T0–T2 요청만 추가한다.
- T3, raw blueprint upload, arbitrary composition, direct native payload는 노출하지 않는다.
- 기존 승인 요약에 blueprint ID/version/hash, seed, 선택 variation,
  예상 tool roles, payload hash를 포함한다.
- README/운영 문서/support matrix에 지원 활동과 variation 한계를 정확히 적는다.
- 구현되지 않은 도구나 scaffold를 지원된 것처럼 표시하지 않는다.

### R10. P3 결과 보고 `[Core]`

`reports/P3_RELEASE_READINESS.md`에 다음을 기록한다.

- blueprint별 T0/T1/T2 목록
- 허용 조합 수와 전수/경계 검증 수
- 제외한 조합과 구조적 이유
- released tool/activity/variation matrix
- live canary 결과와 관찰 시각
- public MCP surface diff
- 승인 무결성 검증
- 최종 release `GO` 또는 `NO-GO`

## Explicit non-goals

- T3 자유 조립을 외부 사용자에게 제공하지 않는다.
- arbitrary blueprint, JSON, code, coordinate, tool ID 입력을 받지 않는다.
- 조합 폭발을 sampling만으로 승인하지 않는다.
- 전체 palette를 released로 일괄 승격하지 않는다.
- 기존 프로젝트 수정·삭제를 지원하지 않는다.
- 새 UI 애플리케이션을 별도로 만들지 않는다.
- 새 workspace package는 2/3 승격 조건 없이 만들지 않는다.

## Architecture backbone

```text
teacher intent
  → released blueprint selection
  → T0 defaults + bounded T1 knobs + allowed T2 variations
  → finite combination validation
  → resolved activity
  → adapters/validator
  → immutable approval manifest
  → create-only delivery
```

variation은 blueprint 데이터의 선택 범위이며 compiler core의 새 활동 분기가 아니다.

## Definition of done

### Core

- released blueprint의 T0–T2 schema가 유한하고 엄격하다.
- blueprint당 256개, 전체 1,024개 이하의 모든 허용 조합이 전수 검증된다.
- `provisional` primitive가 0개다.
- 모든 출시 조합이 envelope 검증을 통과한다.
- 승인과 생성 사이의 blueprint/hash/seed/variation 변조가 차단된다.
- verified되지 않은 tool/variation은 planner와 MCP에서 보이지 않는다.
- canary가 failure 원인을 구분하고 해당 support 범위만 안전하게 내린다.
- P0–P2 골든과 `pnpm check`가 통과한다.
- release readiness 보고서가 근거와 함께 작성된다.

### Scaffold

- T3 관련 내부 아이디어는 문서의 비목표로만 남긴다. runtime scaffold도 외부 export도 만들지 않는다.

## Acceptance tests

1. 허용 variation의 Cartesian product 수가 계산되고 검증 실행 수와 일치한다.
2. 범위 밖 count/range와 unknown option은 parse 단계에서 거부된다.
3. forbidden 조합은 fallback 없이 명확한 오류를 낸다.
4. 모든 허용 조합은 reference, layout, semantics, native, safety 검증을 통과한다.
5. 승인 후 seed/variation/blueprint hash 변경은 생성 직전에 거부된다.
6. released가 아닌 tool/activity/variation은 planner와 MCP schema에 나타나지 않는다.
7. T3/raw payload/coordinate 입력 경로가 public export에 없다.
8. palette 변경과 contract mismatch가 다른 운영 상태로 보고된다.
9. 한 도구 mismatch가 무관한 released 활동을 전역 차단하지 않는다.
10. 기존 활동과 P2 활동의 고정 seed 골든이 모두 통과한다.
11. 모든 출시 조합이 초기 상태에서 미충족 학생 조작 제약을 1개 이상 가진다.
12. blueprint당 257번째 또는 전체 1,025번째 조합은 release schema 생성 단계에서 거부된다.
13. `provisional` primitive가 남아 있으면 release readiness가 `NO-GO`다.

## QA and verification

- `pnpm check`
- P0–P2 golden verify
- variation envelope 전체/경계 검증
- public MCP schema snapshot
- approval mutation negative tests
- canary 상태 fixture tests와 허용된 live smoke
- forbidden key/activity literal 검사
- `git diff --check`
- 민감정보 scan

## Required handoff

완료 시 `RELEASE GO` 또는 `RELEASE NO-GO`를 먼저 제시한다. 출시한 활동과 variation,
검증 조합 수, 제외 범위, canary 상태, public MCP diff, 승인 무결성 결과를 보고한다.
`NO-GO`면 어떤 support state를 내렸는지와 복구 조건을 명시한다.
