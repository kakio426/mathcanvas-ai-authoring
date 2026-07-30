# P1 Committed Build — primitive 추출과 현재 활동 무변경 이관

## Entry gate

이 프롬프트는 `reports/P0_GO_NO_GO.md`가 모든 P0 조건을 근거와 함께 `GO`로 판정한
경우에만 실행한다. 그렇지 않으면 코드를 변경하지 말고 P0 미충족 항목을 보고한다.

## Role and objective

당신은 TypeScript 타입 설계, compiler IR, 교육 활동 모델링, fail-closed 검증을
담당하는 수석 엔지니어다.

현재 분수 비교 활동의 외부 동작을 바꾸지 않고 하드코딩된 활동 구조를 다음의
재사용 가능한 최소 vocabulary로 분리한다.

- `ToolAdapter`
- `LayoutBlock`
- `InteractionConstraint`
- `ItemGenerator`
- `ActivityBlueprint`
- `ResolvedActivity`
- 계층형 validator

P1은 새 활동 출시가 아니라 **현재 한 활동의 무회귀 이관**이다.

## Background

- 정본 설계는 `PLAN.md`다.
- P0 골든 fixture와 tool catalog snapshot은 변경 감지와 회귀 판정 기준이다.
- P1 deep probe는 현재 활동이 실제로 쓰는 text, LaTeX, fraction model,
  draw/rectangle 도구로 제한한다.
- template registry에 활동 코드를 옮기는 것만으로는 성공이 아니다.

## Target users

- 교사: 기존 분수 비교 생성 요청이 같은 품질과 안전 흐름으로 동작해야 한다.
- 학생: 기존 조작 대상, 고정 표면, 시각적 대응 관계가 유지되어야 한다.
- 개발자: 다음 활동을 blueprint 데이터로 추가할 수 있는 안정적인 확장 경계가 필요하다.

## Scope and ordered requirements

### R1. P0 증거와 현재 결합 지도 `[Core]`

- P0 보고서, 골든, catalog snapshot을 읽고 정확한 입력·출력 기준을 기록한다.
- 현재 `contracts`, `planner`, `templates`, `compiler`, `validator`,
  `managed-browser` 사이의 활동별 결합을 파일·symbol 단위로 목록화한다.
- 활동 ID/제목/분수 전용 literal이 core 분기를 만드는 위치를 migration checklist에 적는다.
- P1 변경 전 고정 seed 골든 검증을 다시 실행한다.

### R2. 필요한 도구만 deep contract probe `[Core]`

- text, LaTeX, fraction model, draw/rectangle 도구의 생성, 핵심 속성,
  선택·이동·크기/고유 조작, 저장, 재열기, API 왕복을 독립 검증한다.
- probe가 프로젝트를 필요로 하면 생성자 소유의 새
  `AI-CONTRACT-PROBE-*` 프로젝트만 사용한다.
- 기존 프로젝트를 수정·삭제하지 않는다.
- raw는 P0 contract-lab 경계에 두고 sanitized contract fixture만 커밋한다.
- 각 도구의 `SupportEvidence`를 `captured → contracted → verified`까지만 올린다.
  제품 표면 출시가 끝나지 않았으므로 자동으로 `released`로 올리지 않는다.

### R3. vocabulary 계약 `[Core]`

기존 package 안에 다음 디렉터리 경계를 만든다.

```text
packages/contracts/src/catalog/
packages/contracts/src/vocabulary/
packages/mathcanvas-compiler/src/adapters/
packages/mathcanvas-compiler/src/resolve/
packages/validator/src/layers/
packages/templates/src/blueprints/
packages/templates/src/item-generators/
```

초기 schema는 최소한 다음을 표현한다.

- stable typed IDs와 versioned blueprint identity
- tool roles와 semantic item values
- seed, finite generator parameters, generated item provenance
- `canvas`, `band`, `row`, `stack`, `slot`, `anchor` 상대 레이아웃
- `align-edge-to`, `place-in`, `select-one-of` 상호작용 제약
- 학습자 조작 필요 여부인 `requiresStudentAction`
- 고정/이동 가능 여부와 instructional intent
- blueprint content hash와 variation metadata
- resolved bounds와 모든 참조가 해소된 `ResolvedActivity`

schema는 `strict`하게 unknown field를 거부한다.

최초 primitive는 기존 released 활동에서 독립 구조가 3회 이상 반복되고, 이름을
지정한 P2 소비자와 executable contract test가 있을 때만 baseline foundation으로
받아들인다. `grid`처럼 P2에서 필요할 가능성만 있는 primitive를 미리 넣지 않는다.
P1 재진입에서 한 소비자만 있는 primitive를 추가해야 한다면 `PLAN.md`의
`provisional` 계약과 만료 조건을 적용한다.

### R4. blueprint 금지 조건 `[Core]`

schema와 테스트로 다음을 구조적으로 거부한다.

- 절대 `x`, `y`, width, height 좌표
- raw `contentsJson`, `canvasOption` 또는 네이티브 객체 passthrough
- 문자열 결합으로 만든 참조
- 직접 나열한 정답 객체/정답키
- 생성 완료된 문항 목록
- 함수, inline expression, 임의 script
- 검증되지 않은 tool ID 또는 `released`로 위장한 support state

좌표는 `ResolvedActivity` 이후 resolver/adapter 내부에서만 생길 수 있다.
blueprint는 선언 노드 64개와 중첩 깊이 8을 넘을 수 없다. 같은 선언 조합이 한
blueprint에서 3회 이상 반복되거나 두 blueprint에서 재사용되면 좌표·함수 없는
data-defined composite로 승격한다.

### R5. deterministic `ItemGenerator` `[Core]`

- 현재 분수 비교 문제 은행을 seed 기반 generator 경계로 옮긴다.
- generator는 입력 parameter, seed, version이 같으면 byte-stable한 의미 결과를 낸다.
- 중복 문제, 시각적으로 구분하기 어려운 쌍, 허용 범위를 일반적인 predicate로 거부한다.
- blueprint에는 generator ID와 유한 parameter만 둔다.
- 문항 provenance를 manifest까지 전달한다.

### R6. 상대 `LayoutResolver` `[Core]`

- 현재 캔버스 배치를 재현할 최소 LayoutBlock algebra를 구현한다.
- blueprint는 관계와 slot을 선언하고 resolver가 canvas bounds에서 좌표를 계산한다.
- 같은 입력에는 안정적인 좌표를 산출한다.
- overlap, negative size, canvas overflow, missing anchor, cyclic reference를 fail-closed로 거부한다.
- 현재 활동 결과를 맞추기 위해 blueprint에 magic coordinate를 숨기지 않는다.
- margin, gap, minimum target size 같은 layout token은 활동 ID를 모르는 공유 상수로만 둔다.
- 도구 고유 native geometry 보정은 해당 `ToolAdapter`에 캡슐화한다.

### R7. 폐쇄형 `ToolAdapter` `[Core]`

- 현재 네 도구를 의미 입력에서 native object로 컴파일하는 adapter로 분리한다.
- adapter registry는 tool ID에 대한 폐쇄형 mapping이며 활동 ID를 받지 않는다.
- native object ID와 reference는 typed resolver output에서 생성한다.
- adapter가 지원하지 않는 option, variant, object field는 거부한다.
- raw payload escape hatch를 추가하지 않는다.

### R8. 계층형 validator `[Core]`

validator를 최소 다음 계층으로 분리한다.

1. schema와 version
2. reference와 layout
3. mathematical/interaction semantics
4. native contract와 safety/approval integrity

- validator core는 활동 ID, 활동 제목, 특정 blueprint filename으로 분기하지 않는다.
- 현재 분수 의미 검증은 재사용 가능한 value/constraint predicate로 옮긴다.
- canonical recompile, payload hash, lock/movable 규칙, canvas bounds,
  sensitive key 차단을 유지한다.
- 하나의 오류가 여러 계층에서 중복 보고되지 않도록 stable error code를 정한다.

### R9. 현재 활동 blueprint 이관 `[Core]`

- 현재 활동을 `packages/templates/src/blueprints/`의 선언형 데이터로 옮긴다.
- 활동에 필요한 교육 목표, tool role, generator, layout, constraints,
  기본 variation을 명시한다.
- planner의 현재 자연어 추천 동작과 public MCP 요청/응답은 바꾸지 않는다.
- compiler와 validator가 blueprint ID 전용 분기를 갖지 않게 한다.
- 기존 구현 경로는 새 경로와 동시에 장기 유지하지 않는다.

### R10. draft 전환 `[Core]`

- 활성 내부 draft/schema 경로는 하나만 둔다.
- 이전 형식의 저장 draft가 존재하면 묵시 변환하지 않고 명확한
  `draft-schema-expired` 오류로 격리한다.
- public API 호환을 위해 필요한 얇은 boundary mapping은 허용하되,
  내부에서 구·신 schema를 동시에 처리하지 않는다.
- 승인 manifest에 blueprint ID/version/hash, seed, variation,
  generator version을 포함한다.

### R11. 회귀와 구조 검사 `[Core]`

- P0 고정 seed의 학습 목표, 문항 값, 객체 역할, lock/movable 의미,
  학생 조작 제약, validation 결과가 동등해야 한다.
- 기존 전체 테스트를 유지하고 새 schema negative test를 추가한다.
- core 파일에서 활동 ID/제목 literal 분기를 찾는 architecture test 또는 lint 검사를 둔다.
- blueprint fixture에 forbidden key가 들어오면 schema parse가 실패해야 한다.
- 현재 학습자 활동은 `requiresStudentAction: true`이며 초기 상태에서 미충족인
  상호작용 제약을 최소 하나 가져야 한다.
- P1 종료 전에 `scripts/architecture/check-core-diff.mjs` 또는 동등한 무의존성
  검사를 만들고, `PLAN.md`의 고정 core glob을 path/SHA-256 manifest인
  `fixtures/architecture/p1-core-baseline.json`으로 동결한다.
- baseline 생성 명령과 verify 명령을 문서화하며 P2가 core glob을 바꾸지 못하게 한다.

P0 골든 동등성은 두 종류로 분리해 보고한다.

- **반드시 동등:** 학습 목표, 생성 문항 값, 객체 역할, lock/movable 의미,
  학생 조작 제약, validator 판정, payload hash와 approval hash의 연결
- **변경 가능:** resolver가 다시 계산한 절대 좌표와 그 결과인 payload/hash

좌표가 바뀌면 기존 숫자를 맞추기 위한 활동별 상수를 추가하지 않는다. 공유 layout
token만 사용하고, 시각 회귀 검토, 새 골든의 명시적 diff 승인, creator-owned
create-only canary를 모두 통과해야 한다.

### R12. P1 결과 보고 `[Core]`

`reports/P1_GO_NO_GO.md`에 다음을 기록한다.

- deep-probe contract와 support state
- migration 전후 결합 지도
- P0 골든 비교 결과
- bit-identical 항목과 의도적으로 변경된 layout/hash 항목
- active draft schema 수
- 고정 core glob과 baseline manifest hash
- public MCP surface diff
- 활동별 core 분기 검사 결과
- 하드코딩 방지 규칙 10개 각각의 증거
- P2 시작에 대한 `GO` 또는 `NO-GO`

## Explicit non-goals

- 동치분수, 수직선, `10 가르기·모으기`를 추가하지 않는다.
- 교사 T1/T2 option을 외부 노출하지 않는다.
- P1에 필요 없는 palette 도구를 깊게 조사하지 않는다.
- 새 workspace package나 새 dependency를 추가하지 않는다.
- T3 자유 조립, raw payload 입력, 범용 브라우저 실행을 만들지 않는다.
- 기존 프로젝트 수정·삭제를 지원하지 않는다.
- UI 재설계를 하지 않는다.

## Architecture backbone

```text
existing teacher request
  → existing recommendation boundary
  → fraction comparison blueprint
  → seeded item generator
  → relative layout resolver
  → resolved activity
  → tool adapters
  → compiled native project
  → layered validation
  → unchanged approval/create-only flow
```

의존 방향은 `contracts/vocabulary`가 compiler나 concrete blueprint를 알지 않고,
compiler core가 activity ID를 알지 않는 형태여야 한다.

## Definition of done

### Core

- R1–R12가 구현된다.
- `pnpm check`와 P0 골든 검증이 통과한다.
- 현재 활동의 수학 의미·역할·조작·검증과 사용자 안전 흐름에 회귀가 없다.
- 좌표가 바뀐 경우 공유 layout token 근거, 시각 회귀, 골든 diff 승인,
  create-only canary가 기록된다.
- blueprint 금지 조건이 schema와 negative test로 강제된다.
- 초기 상태에서 미충족 `requiresStudentAction` 제약이 최소 하나다.
- compiler/resolver/validator core에 활동명 분기가 없다.
- P2가 사용할 고정 core baseline manifest가 동결된다.
- 내부 active schema 경로가 하나다.
- P1에서 새 public product capability가 노출되지 않는다.

### Scaffold

- `ActivityBlueprint`와 primitive vocabulary는 P2가 사용할 수 있지만,
  P2 활동 데이터나 placeholder adapter는 만들지 않는다.

## Acceptance tests

1. 같은 seed와 blueprint version에서 같은 `ResolvedActivity`와 payload hash가 나온다.
2. P0 골든의 학습 목표, 문항 값, 역할, lock/movable, 학생 조작 제약,
   validator 판정이 일치한다. 좌표/hash 변경은 명시적 diff와 canary 없이는 허용하지 않는다.
3. blueprint에 `x`, `y`, raw payload, function, direct answer key를 넣으면 거부된다.
4. missing/cyclic reference와 canvas overflow가 stable error code로 거부된다.
5. tool adapter는 검증되지 않은 option을 거부한다.
6. validator는 blueprint ID를 바꿔도 같은 constraints에 같은 판정을 낸다.
7. expired draft는 묵시 변환되지 않고 명확한 오류를 낸다.
8. approval 후 blueprint hash/seed를 바꾸면 생성이 거부된다.
9. existing MCP tool 목록과 create-only 경계가 유지된다.
10. 저장→재열기 probe에서 네 도구의 계약 fixture가 일치한다.
11. 초기 활동은 학생 조작 전 미충족 제약이 1개 이상이고, 정답이 완성된 상태로 시작하지 않는다.
12. 고정 core baseline verify가 즉시 통과하고 glob 변경 시 실패한다.

## QA and verification

- `pnpm check`
- P0 golden verify
- architecture boundary/forbidden literal 검사
- fixed core baseline 생성·verify
- deep contract fixture tests
- `git diff --check`
- public export와 MCP tool 목록 diff 검토
- 저장소 민감정보 scan

## Required handoff

완료 시 `P1 GO` 또는 `P1 NO-GO`를 먼저 제시하고, 골든 동등성,
활동별 core 분기 수, active schema 수, deep-probe 상태, P2 시작 가능 여부를 보고한다.
`GO`여도 P2를 자동 시작하지 않는다.
