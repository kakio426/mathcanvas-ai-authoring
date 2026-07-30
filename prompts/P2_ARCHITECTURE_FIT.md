# P2 Committed Build — 동치분수와 비분수 구조 적합성 시험

## Entry gate

`reports/P1_GO_NO_GO.md`가 P1의 모든 조건을 근거와 함께 `GO`로 판정한 경우에만 실행한다.
P1 구조에 활동별 core 분기, blueprint 절대 좌표, 이중 active schema가 남아 있으면
P2 기능을 추가하지 않는다.

## Role and objective

당신은 수학 활동 모델링과 compiler extensibility를 검증하는 수석 엔지니어다.

다음 두 활동을 순서대로 추가해 현재 구조가 “분수 템플릿 레지스트리”가 아니라
활동 수와 독립적인 저작 엔진인지 증명한다.

1. 동치분수 활동
2. 비분수 활동 `10 가르기·모으기`

성공 기준은 화면 두 개가 만들어지는 것이 아니라 core 코드의 증가가 활동 수에
비례하지 않는다는 증거다.

## Target users

- 초등 교사: 검증된 기본 활동 T0를 생성한다.
- 학생: 수학적 대상과 조작이 일치하는 활동을 사용한다.
- 개발자: 새 활동을 blueprint와 generator 데이터로 추가한다.

P2는 아직 임의 교사 variation을 출시하지 않는다.

## Scope and ordered requirements

### R1. 변경 전 architecture census `[Core]`

- P1이 동결한 `fixtures/architecture/p1-core-baseline.json`의 glob과 hash를 그대로 읽는다.
- P2에서 core glob을 추가·삭제·재정의하지 않는다.
- P1 시점의 line count, 활동 ID/제목 literal, switch case, adapter 수,
  primitive 수, blueprint 수를 기계적으로 기록한다.
- `reports/P2_ARCHITECTURE_DIFF.md`는 P1 baseline을 참조하며 별도 기준선을 만들지 않는다.
- 이후 각 활동 추가 직후 같은 검사를 반복한다.

### R2. 동치분수에 필요한 deep probe `[Core]`

- P1에서 verified된 분수 도구 계약이 동치분수 표현을 지원하는지 실제로 확인한다.
- 필요한 variant만 creator-owned `AI-CONTRACT-PROBE-*`에서 깊게 조사한다.
- 기존 프로젝트는 수정·삭제하지 않는다.
- 새 tool adapter가 필요 없다면 만들지 않는다.

### R3. 동치분수 활동 `[Core]`

- 새 blueprint 데이터, 교육 metadata, deterministic item generator를 추가한다.
- 같은 전체, 같은 값, 서로 다른 표현을 일반 의미 제약으로 검증한다.
- 현재 `LayoutBlock`과 adapter를 조합한다.
- blueprint 안에 좌표, raw payload, 직접 정답키, item list를 넣지 않는다.
- `requiresStudentAction: true`이고 초기 상태에서 미충족인 제약을 최소 하나 둔다.
- planner가 검증된 동치분수 의도를 구분해 추천하도록 하되 compiler/resolver/validator
  core는 activity ID를 알지 않는다.

### R4. 첫 번째 fit gate `[Core]`

동치분수 추가 직후 다음을 판정한다.

- compiler core diff: **0**
- layout resolver core diff: **0**
- validator dispatch/activity branch diff: **0**
- 허용되는 변경: blueprint 데이터, item generator, curriculum/planner의 선언형 catalog,
  테스트

기존 general predicate bug fix가 필요하면 P2 안에서 예외로 처리하지 않는다. 실패
테스트와 활동 literal 무포함을 확인한 뒤 P1 iteration으로 돌아가 수정하고 core
baseline을 다시 동결한 다음 P2를 새로 시작한다.

위 조건이 깨지면 `NO-GO`다. `10 가르기·모으기`로 진행하지 말고 P1 vocabulary 설계
문제로 되돌린다.

### R5. 비분수 도구 deep probe `[Core]`

P0 inventory에서 실제 도구 이름과 ID를 선택한다. 최소한 수 카드와,
10의 가르기·모으기를 표현할 수 있는 십 배열판/수 세기/연결 모형 중 실제 지원 가능한
도구를 조사한다.

- 생성, 렌더, 선택, 이동·크기/고유 조작, 저장, 재열기, API 왕복을 확인한다.
- sanitized `ToolContract` fixture와 `SupportEvidence`를 남긴다.
- 필요한 새 `ToolAdapter`는 도구 축의 확장이므로 허용한다.
- 도구 adapter 안에 `10 가르기·모으기` 활동명을 넣지 않는다.

동시에 기존 runtime contract gate를 다음으로 교체한다.

- 생성자 소유 `AI-CONTRACT-PROBE-*`를 1차 probe로 사용한다.
- public project는 1차 probe가 불가능할 때만 2차 fallback으로 사용한다.
- `auth-required`, `contract-probe-unavailable`, `contract-mismatch`를 구분한다.
- 활동이 실제 요구하는 ToolContract만 검사하며 무관한 도구 실패로 전체 생성을 막지 않는다.
- 기존 프로젝트를 수정·삭제하지 않는다.

### R6. 재사용 primitive admission `[Core]`

비분수 활동에 새 layout/constraint primitive가 필요하면 먼저 다음을 문서화한다.

- 기존 primitive 조합으로 표현할 수 없는 이유
- 서로 다른 두 활동에서 같은 의미로 쓰이는 실제 예 또는 이름을 지정한 두 번째 소비자
- primitive의 도메인 중립 이름과 검증 규칙
- invalid case와 fail-closed error

두 활동의 실제 소비가 없으면 우선 기존 primitive 조합으로 표현한다. 그래도 불가능하면
현재 P2에서 core를 수정하지 않고 `P2_NO_GO_ITERATION`을 남긴 뒤 P1로 돌아간다.
P1에서만 도메인 중립 설계, 이름을 지정한 두 번째 소비자, executable contract test,
P3 종료 전 만료 조건을 가진 `provisional` primitive를 추가하고 core baseline을
재동결할 수 있다. 그 후 P2를 처음부터 재시작한다. `provisional`을 사용하는 조합은
`released`로 올리지 않는다.

### R7. `10 가르기·모으기` 활동 `[Core]`

- 합이 10이 되는 부분-전체 관계를 deterministic item generator로 만든다.
- `aggregate-equals` 또는 검증된 동등한 일반 제약으로 수학 의미를 표현한다.
- number card/ten-frame/counting tool role을 adapter와 layout slot에 연결한다.
- 활동 결과가 “정답처럼 보이는 그림”에 그치지 않고 학생이 해야 할 조작과
  판정 조건을 명시한다.
- `requiresStudentAction: true`이고 초기 상태에서 미충족인 수학/상호작용 제약을
  최소 하나 보장한다.
- 교육 목표, 선수 개념, 예상 오개념, 피드백 문구의 경계를 blueprint metadata에 둔다.
- current create-only 승인 흐름을 재사용한다.

### R8. 두 번째 fit gate `[Core]`

- compiler/resolver/validator에 `ten`, `make10`, 활동 ID/제목 전용 분기가 없어야 한다.
- P1에서 동결한 core baseline hash가 P2 종료 시에도 일치해야 한다.
- 새 core primitive는 두 활동 이상에서 사용되거나, 정해진 `provisional` 계약과
  만료 조건을 가져야 한다.
- 새 adapter 증가는 도구 수와 대응해야 하며 활동 수와 대응하면 안 된다.
- blueprint를 제거해도 core에서 해당 활동명 literal이 남지 않아야 한다.
- fraction 활동의 기존 골든이 그대로 통과해야 한다.

### R9. planner와 지원 노출 `[Core]`

- planner는 의도→released blueprint 추천 catalog만 담당한다.
- 아직 verified되지 않은 blueprint/tool 조합은 추천하지 않는다.
- 낮은 confidence나 범위 밖 요청은 기존 fail-closed UX를 유지한다.
- P2의 두 활동은 구조 적합성 검증 동안 `verified`에 머문다.
- 두 활동의 외부 T0 `released` 승격은 P3 release gate에서만 수행한다.
- T1/T2 variation을 아직 외부 노출하지 않는다.

### R10. 교육·수학 검증 `[Core]`

각 활동에 다음 자동 검사를 둔다.

- seed 재현성과 중복 방지
- 수학적 참값과 시각 표현의 일치
- whole/part 기준과 조작 대상 일치
- 허용 범위 경계값
- 오개념을 강화할 수 있는 ambiguous case 차단
- 교육 metadata와 activity semantics 연결

### R11. P2 결과 보고 `[Core]`

`reports/P2_GO_NO_GO.md`와 `reports/P2_ARCHITECTURE_DIFF.md`에 다음을 기록한다.

- 활동별 추가 전후 core diff
- adapter/primitive/blueprint cardinality
- activity literal 검사
- deep-probe 도구와 support state
- 수학·교육 검증 결과
- P0/P1 골든 회귀
- P3 시작 `GO` 또는 `NO-GO`

fit gate가 실패하면 `reports/P2_NO_GO_ITERATION_<n>.md`에 실패 core hash/diff와
원인을 남긴다. P2 기능을 출시하지 않고 P1로 돌아가 전체 P1 Go 조건을 재실행한 뒤
새 version의 core baseline을 동결한다. 그 후 P2 architecture report를 새 iteration으로
처음부터 다시 만든다.

## Explicit non-goals

- 수직선 활동이나 전체 팔레트 adapter를 한꺼번에 추가하지 않는다.
- 교사 T1/T2 variation을 외부 공개하지 않는다.
- P2에서 새 활동을 외부 `released`로 승격하지 않는다.
- 새 workspace package와 불필요한 dependency를 추가하지 않는다.
- 활동별 validator, blueprint 좌표, raw payload escape를 만들지 않는다.
- T3 자유 조립과 기존 프로젝트 수정·삭제를 지원하지 않는다.

## Architecture backbone

```text
blueprint A: current fraction comparison ─┐
blueprint B: equivalent fractions ────────┼→ shared generators/constraints/layout
blueprint C: make-and-break 10 ───────────┘
                                           → tool adapters by native tool
                                           → shared compiler/validator core
```

core code는 활동 수가 아니라 도구·수학 의미·재사용 primitive 수에만 비례해야 한다.

## Definition of done

### Core

- 동치분수 추가의 compiler/resolver/validator core diff가 0이다.
- `10 가르기·모으기`가 활동별 core 분기 없이 동작한다.
- 필요한 새 도구 계약은 deep-probe로 verified된다.
- 새 primitive는 서로 다른 두 활동에서 실제 재사용되거나, 명시적 `provisional`
  상태와 P3 종료 전 만료 조건을 가진다.
- 세 활동의 deterministic, semantic, layout, native, safety 테스트가 통과한다.
- 모든 학습자 활동의 초기 상태에 미충족 `requiresStudentAction` 제약이 있다.
- runtime contract gate가 creator-owned primary/public fallback과 원인 분리를 사용한다.
- P0/P1 회귀와 `pnpm check`가 통과한다.
- 두 architecture 보고서가 증거와 함께 작성된다.

### Scaffold

- P3 variation point 후보를 문서화할 수 있으나 public schema나 MCP에 노출하지 않는다.

## Acceptance tests

1. 동치분수 blueprint 추가 전후 core 파일 hash/diff가 허용 목록 외에는 동일하다.
2. 동치분수의 두 표현은 실제 유리수 값이 같고 whole 기준이 같아야 한다.
3. 합이 10이 아닌 part 조합과 시각 수량 불일치는 거부된다.
4. 새 도구의 저장→재열기 fixture가 native contract와 일치한다.
5. blueprint ID를 임의로 바꿔도 같은 의미 제약은 같은 결과를 낸다.
6. 새 blueprint를 제거했을 때 core에 활동 전용 literal/분기가 남지 않는다.
7. 같은 seed는 같은 문항과 payload hash를 만든다.
8. 중복·모호·캔버스 이탈 문항은 stable error code로 거부된다.
9. released되지 않은 tool/blueprint 조합은 planner/MCP에서 추천되지 않는다.
10. 기존 fraction comparison 골든과 모든 안전 테스트가 통과한다.
11. 두 새 활동 모두 학생 조작 전 미충족 제약이 1개 이상이다.
12. public probe가 사라져도 creator-owned probe가 정상이면 준비 상태를 유지한다.
13. creator-owned probe 불가와 실제 contract mismatch가 서로 다른 error code를 낸다.

## QA and verification

- `pnpm check`
- P0/P1 golden verify
- 단계별 architecture census/diff
- activity literal와 forbidden blueprint key 검사
- deep contract round-trip test
- variation 미노출 public surface 검사
- `git diff --check`
- 민감정보 scan

## Required handoff

완료 시 `P2 GO` 또는 `P2 NO-GO`를 먼저 제시한다. 동치분수 core diff,
비분수 활동의 새 adapter/primitive 수, primitive 재사용 증거, 회귀 결과,
P3 시작 가능 여부를 수치와 파일 근거로 보고한다. `GO`여도 P3를 자동 시작하지 않는다.
