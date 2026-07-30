# MathCanvas 유연 저작 엔진 확장 계획

## Status

- **현재 정본(CANONICAL)** — 2026-07-30
- Kiro CLI `claude-opus-5` 검토와 대안 제안을 반영했다.
- 구현은 P0부터 순서대로 진행하며, 각 단계의 Go 조건을 통과하기 전에는 다음 단계를 시작하지 않는다.
- 상세 실행 프롬프트는 `IMPLEMENTATION_PROMPT.md`와 `prompts/` 아래에 있다.
- 이전 계획과 단일 대형 프롬프트는 `*_SUPERSEDED_2026-07-29.md`로 보존하되 구현 기준으로 사용하지 않는다.

## 0. Kiro Opus 5 실행 loop

2026-07-30부터 장기 실행은 Wave마다 다음 네 단계만 반복한다.

1. Kiro Opus 5가 산출물, 금지사항, 테스트 예산, GO 조건을 확정한다.
2. Codex가 그 예산 안에서 최소 구현한다.
3. 외부 write가 있으면 실행 전 Kiro PASS를 받고, 실행 후 evidence를 다시 검증한다.
4. `CONDITIONAL PASS`는 지적 항목만 최대 2회 수정한다. 같은 지적이 반복되면
   증분 패치를 중단하고 Kiro가 범위를 줄여 다시 계획한다.

현재 순서는 `W2a 공통 draw canary 안전 교정 → W2b 승인 canary 1회 →
W2c 관찰 계약 승격 → W3 pen → W4 수학 module family → W5 P0.5 종료 →
P1 비고정형 primitive/layout`이다. P0.5 전에는 P1을 시작하지 않는다.

도구별 factory와 MCP를 늘리지 않는다. adapter 경계는 다음 세 family만 목표로 한다.

- `native-common-object`: text, latex, draw
- `native-module-variant`: 수학 팔레트 46개를 descriptor 데이터로 표현
- `canvas-pen-elements`: payload 위치가 달라 별도 유지

테스트는 W2c 반영 후 실측 121개이며 P1 종료 시 132개를 상한으로 한다.
한 경계에는 정상 1개와 필요한 실패 1개까지만 두며, 같은 validator의 변조 조합을
계속 늘리지 않는다. 신규 dependency, workspace package, 도구별 테스트는 만들지 않는다.

최종 산출물은 동일 개념·학년의 실제 인터랙티브 활동 3~5편과 비교한다. 수학 정확성,
목표 적합성, 학생 조작, 즉시 피드백, 탐구 다양성, 가독성, 교사 수정성,
템플릿 의존도, 저장 안정성, 수업 가치를 각 10점으로 평가한다. P2 최소 목표는
80점(모든 항목 6점 이상), 배포 목표는 85점(모든 항목 7점 이상)이다.

## 1. 목표와 기준선

현재 GitHub 정본 `kakio426/mathcanvas-ai-authoring`은 TypeScript 모노레포, 제한형 MCP,
전용 Chrome 프로필, 사용자 직접 로그인, 명시적 승인, 새 프로젝트 생성 전용,
fail-closed 검증이라는 좋은 안전 기반을 갖고 있다. 목표는 이 기반을 유지하면서
한 가지 분수 비교 활동에 결합된 구조를 다양한 수학 활동으로 확장하는 것이다.

가장 중요한 제품 불변조건은 다음과 같다.

> **활동 수나 활동지 양식 수가 늘어날 때 core 코드가 함께 늘어나면 안 된다.**

코드 증가는 다음 세 축에서만 허용한다.

1. MathCanvas의 새로운 네이티브 도구 계약
2. 새로운 수학 개념을 표현하는 재사용 가능한 의미 규칙
3. 여러 활동에서 재사용되는 primitive vocabulary

활동 이름, 특정 문항 배열, 특정 좌표 배치만을 위해 compiler·validator·planner에
분기를 추가하는 것은 금지한다.

## 2. 확인된 결정

### 소유권과 조사 자료

- 이 GitHub 저장소가 사용자가 만든 제품의 유일한 정본이다.
- `/Users/yubyeongju/Downloads/mathcanvas`는 외부 비교 자료이며 사용자 코드가 아니다.
- 외부 자료의 코드·문서·payload를 복사하거나 이식하지 않는다.
- 외부 자료는 조사 누락 방지용 체크리스트로만 보고, 모든 계약은 실제 MathCanvas
  화면과 API 왕복으로 독립 검증한다.

### 제품 구조

- 배포 제품은 현재 TypeScript 모노레포와 제한형 MCP 구조를 유지한다.
- Python은 필요할 경우 오프라인·일회성 분석에만 사용하며 제품 런타임 경로가 아니다.
- 고정 템플릿 레지스트리를 늘리는 대신 **검증된 primitive recipe DSL**을 사용한다.
- DSL은 무제한 자유 형식이 아니다. 폐쇄형 도구 어댑터, 폐쇄형 레이아웃 블록,
  폐쇄형 상호작용 제약, 검증된 문항 생성기를 조립하는 하이브리드 구조다.
- 새 활동은 원칙적으로 blueprint 데이터와 승인된 variation 값만 추가해 만든다.

### 교사 제어 수준

- **T0 추천 활동:** 검증된 기본 blueprint를 바로 사용한다.
- **T1 유한 옵션:** 난이도, 문항 수, 수 범위, 표현 방식 등 검증된 knob를 고른다.
- **T2 허용 변형:** blueprint가 명시한 variation point 안에서만 구조를 바꾼다.
- **T3 자유 조립:** 내부 연구·관리 도구에만 허용하며 외부 MCP 제품 표면에는 노출하지 않는다.

### 교육 범위와 안전

- 장기 범위는 초등 1–6학년과 2022 개정 교육과정이다.
- 목표, 선수 개념, 예상 오개념, 정답 조건을 활동 데이터에 명시한다.
- 학생 개인정보를 수집하거나 payload에 넣지 않는다.
- 기존 안전 원칙과 승인 흐름은 완화하지 않는다.
- 기존 프로젝트의 수정·삭제는 지원하지 않는다.

## 3. 아키텍처 백본

```text
TeacherIntent
  → ActivityBlueprint + approved variations
  → ItemGenerator(seed)
  → LayoutResolver
  → ResolvedActivity
  → ToolAdapters
  → CompiledProject
  → layered validation
  → explicit approval
  → create-only MathCanvas project
```

### 핵심 모델

| 모델 | 책임 | 금지 사항 |
|---|---|---|
| `ToolDescriptor` | 팔레트 도구의 식별자·분류·옵션을 기술 | 검증되지 않은 지원 선언 |
| `ToolContract` | 생성·렌더·조작·저장·재열기 계약을 증거와 연결 | 민감한 원본 응답 커밋 |
| `ToolAdapter` | 의미 있는 tool input을 네이티브 객체로 컴파일 | 활동 이름별 분기 |
| `LayoutBlock` | `canvas`, `band`, `row`, `stack`, `grid`, `slot`, `anchor` 같은 상대 배치 | blueprint의 절대 좌표 |
| `InteractionConstraint` | `align-edge-to`, `place-in`, `select-one-of`, `aggregate-equals` 등 검증 가능한 관계와 `requiresStudentAction`을 기술 | 문자열로 만든 임의 참조 |
| `ItemGenerator` | seed와 유한 입력에서 재현 가능한 문항을 생성 | blueprint에 문항 목록 직접 삽입 |
| `ActivityBlueprint` | 목표·역할·레이아웃·제약·variation point를 데이터로 선언 | raw payload, 직접 정답키, inline code |
| `ResolvedActivity` | 모든 항목·슬롯·참조가 해소된 중간 표현 | 미해결 선택지와 불안정 ID |
| `CompiledProject` | MathCanvas 네이티브 payload와 승인용 manifest | 지원되지 않은 객체 passthrough |
| `SupportEvidence` | 지원 상태를 증거 기반으로 관리 | 조사 사실과 출시 상태 혼용 |

### `SupportEvidence` 상태

```text
captured → contracted → verified → released
```

- `captured`: 실제 화면/API에서 원본 계약을 확보했다.
- `contracted`: 타입·fixture·adapter 후보로 정규화했다.
- `verified`: 생성·저장·재열기와 필요한 조작을 자동/수동 검증했다.
- `released`: 제품 표면과 문서에서 지원한다고 선언할 수 있다.

지원 상태를 건너뛸 수 없다. 팔레트 hash는 변경 감지용 metadata일 뿐,
프로젝트 생성의 전역 차단 조건으로 사용하지 않는다.

## 4. 하드코딩 방지 규칙

모든 새 blueprint와 core 변경은 아래 규칙을 통과해야 한다.

1. blueprint에 절대 `x`, `y`, 폭·높이 좌표를 직접 쓰지 않는다.
2. 객체 참조를 문자열 결합으로 만들지 않는다.
3. MathCanvas raw payload를 우회 삽입하는 escape hatch를 두지 않는다.
4. 정답 객체나 정답키를 직접 나열하지 않고 제약으로 표현한다.
5. 실제 문항 목록을 저장하지 않고 seed 기반 `ItemGenerator`를 사용한다.
6. blueprint 안에 함수, 식 평가기, 임의 스크립트를 넣지 않는다.
7. P1의 최초 primitive는 기존 released 동작의 직접 추출이고, 현재 활동 안에서
   독립 구조가 3회 이상 반복되며, 이름을 지정한 P2 소비자와 executable contract
   test가 있을 때 baseline foundation으로 인정한다. P1 baseline 이후 primitive
   추가는 원칙적으로 서로 다른 두 활동의 실제 요구로 재사용성을 입증한다.
   한 활동만 있는 경우에는 도메인 중립 설계, 이름을 지정한 두 번째 소비자,
   executable contract test를 갖춘 `provisional`로만 허용하며 다음 wave 종료 전
   재사용을 증명하거나 제거한다. `provisional` primitive를 사용하는 조합은 `released`로 올리지 않는다.
8. core validator는 활동 ID나 활동 제목을 알지 못해야 한다.
9. approval manifest에 blueprint ID, version, content hash, seed, variation을 기록한다.
10. 이전 draft는 새 스키마로 묵시 변환하지 않고 만료·격리한다. 이중 스키마를 장기 운영하지 않는다.
11. 학습자 활동은 `requiresStudentAction: true`이고 초기 상태에서 미충족인
    상호작용 제약을 최소 하나 가져야 한다. 완성된 정답 그림만 생성하는 blueprint는 거부한다.
12. blueprint는 선언 노드 64개, 중첩 깊이 8을 넘지 않는다. 같은 선언 조합이
    한 blueprint에서 3회 이상 반복되거나 두 blueprint에서 재사용되면 좌표·로직 없는
    data-defined composite로 승격한다.

### 구조 적합성 판정

다음 중 하나라도 발생하면 새 활동을 추가하지 말고 vocabulary를 먼저 고친다.

- 새 활동 때문에 compiler·resolver·validator에 활동명 분기가 생김
- 같은 의미의 레이아웃/제약 primitive가 이름만 다르게 중복됨
- blueprint 수에 비례해 core 파일 또는 switch case가 증가함
- 테스트가 blueprint의 결과가 아니라 특정 내부 구현 분기를 보호함

## 5. 초기 모듈 경계

초기에는 새 workspace package를 만들지 않고 기존 package 안에 디렉터리 경계를 둔다.

```text
packages/contracts/src/
  catalog/                 # descriptor, contract snapshot, support evidence
  vocabulary/              # layout, constraint, blueprint, resolved IR

packages/mathcanvas-compiler/src/
  adapters/                # tool별 native compile 경계
  resolve/                 # item/layout/reference resolution

packages/validator/src/
  layers/                  # schema, reference, semantic, safety 검증

packages/templates/src/
  blueprints/              # 활동 데이터
  item-generators/         # seed 기반 문항 생성기

scripts/contract-lab/      # 비제품 조사 도구; MCP export 금지
```

### 고정 core 측정 경계

P1 종료 시 아래 glob을 `fixtures/architecture/p1-core-baseline.json`에 path와 SHA-256으로
동결한다. P2의 “core diff 0”은 이 목록을 기준으로 기계적으로 판정한다.

```text
packages/contracts/src/vocabulary/**
packages/mathcanvas-compiler/src/core/**
packages/mathcanvas-compiler/src/resolve/**
packages/mathcanvas-compiler/src/index.ts
packages/validator/src/layers/**
packages/validator/src/index.ts
```

`adapters/**` 증가는 네이티브 도구 수 축, `blueprints/**`와 `item-generators/**` 증가는
활동 데이터 축으로 별도 측정한다. P2 도중 core 경계를 다시 정의할 수 없다.

P1 종료 시 `pnpm architecture:baseline`으로 위 경계를 동결하고, 이후에는
`pnpm architecture:verify`로 path·SHA-256과 활동 전용 literal 유입을 확인한다.

다음 중 2개 이상을 만족할 때만 별도 package 승격을 검토한다.

1. 독립적인 외부 소비자가 2개 이상이다.
2. 현재 package 의존 방향을 거슬러야 한다.
3. 독립 릴리스 또는 버전 경계가 필요하다.

## 6. 구현 단계

### P0 — 기준선, 골든 회귀, 전체 팔레트 얕은 조사

목적은 현재 제품을 변경하지 않고 안전한 조사 기반과 회귀 기준을 만드는 것이다.

- `pnpm install --frozen-lockfile`, `pnpm check` 기준선을 기록한다.
- 현재 분수 비교 활동을 고정 seed로 컴파일하여 승인 manifest와 payload의
  정규화된 골든 fixture를 만든다.
- `scripts/contract-lab/`에 제품과 분리된 조사·redaction·snapshot 경계를 만든다.
- 현재 MathCanvas 팔레트의 모든 도구에 대해 이름, 실제 tool ID, category,
  module key, 화면에 드러난 variant/option을 얕게 전수 조사한다.
- 원본 캡처는 gitignored 로컬 디렉터리에만 두고, 저장소에는 민감정보를 제거한
  정규화 snapshot과 증거 metadata만 커밋한다.
- 전체 도구를 한꺼번에 깊게 분석하지 않는다. 각 구현 wave가 필요로 하는 도구만
  생성→조작→저장→재열기→왕복 비교까지 깊게 분석한다.
- live inventory는 기존 `playwright-core`로 MathCanvas 전용 profile을 독점 실행해
  읽기 전용 관찰한다. MCP 서버가 같은 profile을 사용 중이면 lock에서 거부하고,
  일반 Chrome profile이나 임의 CDP endpoint에 연결하지 않는다.

**P0 Go 조건**

- 기존 typecheck/test/build가 통과한다.
- 고정 seed 골든이 재현 가능하고 기존 안전 동작을 보호한다.
- 팔레트의 모든 보이는 도구가 중복 없이 분류되거나 `unknown` 사유를 가진다.
- snapshot에 토큰, 쿠키, 계정 식별자, 프로젝트 비공개 내용이 없다.
- 조사 코드가 MCP/제품 export 경로에 연결되지 않는다.

오프라인 R1–R4/R8이 끝났지만 로그인이 없어 inventory가 끝나지 않은 경우
`P0-OFFLINE-READY / LIVE-BLOCKED`로 보고한다. 산출물은 보존하되 P1 진입은 계속 금지한다.

### P0.5 — 전체 도구 계약과 MCP 연결 게이트

사용자 확인에 따라 활동 DSL보다 도구 계층을 먼저 완성한다. 화면 버튼마다 공개 MCP
명령을 추가하지는 않는다. 기존의 의도 추천→승인→create-only MCP 흐름은 유지하고,
MathCanvas UI 변화가 compiler에 직접 전파되지 않도록 폐쇄형 adapter registry 뒤에
도구 계약을 둔다.

조사 표면은 다음을 모두 포함한다.

1. 왼쪽 수학 팔레트 4개 영역의 46개 module
2. 하단 공통 도구의 실행 취소, 다시 실행, 선택, 펜, 지우개, 점/선, 사각형, 원,
   텍스트, 수식
3. 오른쪽의 새로고침, 전체 화면, 그리드, 확대, 축소, 이동
4. 상단의 캡처, 설정, 저장, 활동 만들기, URL 복사, 나가기
5. 도구 설정, 패널 접기, category 펼치기/접기 같은 탐색 제어

각 항목은 반드시 다음 중 하나의 연결 결정을 가진다.

- `tool-adapter`: 새 프로젝트 payload에 들어가는 콘텐츠 도구
- `managed-browser-operation`: create-only 저장·미리보기·연결 상태를 위한 orchestration
- `internal-editor-action`: 검증·미리보기 내부에서만 필요한 편집 상태
- `excluded-by-policy`: 기존 프로젝트 수정/삭제, UI 전용, 안전 경계 밖 기능

46개 수학 module과 펜·점/선·도형·텍스트·수식은 각각 trigger, option, native 저장
형태, module 활성화, 렌더, 조작, 저장, 재열기, 왕복 비교 계약을 기록한다. 구현은
활동 이름별 또는 화면 버튼별 분기가 아니라 **동일 native 저장 형태를 공유하는
contract family** 단위 adapter로 묶고 descriptor registry에서 도구별 차이를
데이터로 제공한다. 아직 lifecycle을 검증하지 않은 도구는 registry에 있어도
제품에서 사용할 수 없다.

**P0.5 Go 조건**

- 위의 모든 보이는 항목이 중복 없이 contract matrix에 있고, MCP 연결 방식 또는
  구체적인 제외 사유가 있다.
- 콘텐츠 도구마다 의미 입력 schema와 native output schema가 있거나, 계약 확보가
  불가능한 구체적 증거가 있다.
- adapter registry는 미등록·미검증 도구를 fail-closed로 거부한다.
- `captured → contracted → verified → released` 상태를 테스트로 건너뛸 수 없다.
- public MCP는 도구별 버튼 API를 늘리지 않고 기존 승인·create-only 흐름을 유지한다.
- 생성·저장·재열기 검증이 필요한 live write는 사용자 승인으로 만든 전용 canary
  프로젝트에서만 수행하며 기존 프로젝트를 수정하지 않는다.
- 이 게이트가 끝나기 전에는 blueprint/layout/새 활동 구현을 시작하지 않는다.

### P1 — primitive 추출과 현재 활동 무변경 이관

목적은 새 기능을 더하기 전에 현재 활동을 새 구조로 옮겨 아키텍처가 실제로 작동함을
증명하는 것이다.

P0.5의 tool contract와 adapter registry를 그대로 소비하며, 활동을 위해 새로운
화면별 native payload 분기를 추가하지 않는다.

- 현재 사용 중인 텍스트·LaTeX·분수 모델·사각형 도구의 계약만 깊게 분석한다.
- `ToolAdapter`, `LayoutBlock`, 초기 `InteractionConstraint`,
  `ItemGenerator`, `ActivityBlueprint`, `ResolvedActivity`를 도입한다.
- 현재 분수 비교 활동을 blueprint 데이터로 이관한다.
- 학습 목표, 문항 값, 객체 역할, lock/movable 의미, 상호작용 제약, validator 판정은
  P0 골든과 동등해야 한다. 기존 매직 좌표 자체는 동등성 대상이 아니다.
- 좌표가 바뀌면 활동 무관 공유 layout token과 resolver 계산에서만 나와야 하며,
  payload/hash 변경 사유, 시각 회귀, create-only canary를 명시적으로 승인한다.
- 이전 draft는 명시적으로 만료시키고, 새 draft와 이중 해석하지 않는다.

**P1 Go 조건**

- 현재 활동의 수학 의미·객체 역할·학생 조작·검증과 안전 승인 흐름에 회귀가 없다.
- blueprint에 절대 좌표, raw payload, 직접 정답키, inline logic이 없다.
- 학습자 활동의 초기 상태에 미충족 `requiresStudentAction` 제약이 최소 하나 있다.
- core compiler·resolver·validator에 활동 ID 분기가 없다.
- 고정 core glob과 hash baseline이 P1 종료 시 동결된다.
- 새 public MCP 기능을 늘리지 않는다.

### P2 — 아키텍처 적합성 시험

목적은 구조가 분수 템플릿 레지스트리로 굳어지지 않았음을 두 종류의 활동으로 증명하는 것이다.

1. **동치분수 활동:** 기존 primitive 조합과 새 blueprint 데이터로 추가한다.
2. **10 가르기·모으기 활동:** 분수가 아닌 활동을 추가해 과적합을 검사한다.

필요한 분수·수 카드·십 배열판/수 세기 계열 도구만 깊게 분석하고 adapter를 추가한다.
동치분수나 비분수 활동 때문에 core vocabulary를 바꿔야 하면 현재 P2 안에서 수정하지
않는다. No-Go iteration을 기록하고 P1로 돌아가 구조를 보완·재검증·재동결한 뒤
P2를 처음부터 다시 시험한다. 한 소비자뿐인 primitive는 P1에서만 `provisional`
규칙으로 받아들일 수 있다.

P2 fit gate가 실패하면 `reports/P2_NO_GO_ITERATION_<n>.md`를 남기고 P2 변경을 출시하지
않는다. P1로 돌아가 vocabulary를 수정하고 P1 전체 Go 조건을 재검증한 뒤
`p1-core-baseline` version/hash를 다시 동결하고, 깨끗한 새 P2 iteration으로 재시작한다.

**P2 Go 조건**

- 동치분수 추가 시 core compiler/resolver/validator diff가 0이다.
- `10 가르기·모으기`는 활동 전용 분기 없이 일반 primitive를 재사용한다.
- 새 primitive는 두 활동에서 재사용되거나 명시된 `provisional` 조건을 만족한다.
- 두 활동 모두 초기 상태에서 학생이 수행해야 할 미충족 제약을 최소 하나 가진다.
- 두 활동 모두 seed 재현성, 의미 검증, 승인 manifest, 생성 전용 안전성을 통과한다.
- creator-owned probe를 1차, public project를 2차 fallback으로 쓰도록 기존 runtime
  contract gate를 교체하고 실패 원인을 분리한다.

### P3 — 교사 변형과 제한적 출시

목적은 활동을 코드로 복제하지 않고 교사가 안전하게 변형하도록 만드는 것이다.

- T1 유한 knob와 T2 variation point를 schema로 정의한다.
- blueprint당 최대 256개, 전체 출시 suite 최대 1,024개의 유한 envelope로 제한하고
  모든 허용 조합을 전수 검증한다. 초과하면 sampling하지 않고 출시 범위를 줄인다.
- 외부 MCP는 `released` blueprint와 T0–T2만 노출한다.
- `AI-CONTRACT-PROBE-*` 이름의 생성자 소유 프로젝트로 live canary를 운영한다.
- public project는 probe 불가 시 fallback으로만 사용한다.
- `probe unavailable`과 `contract mismatch`를 서로 다른 상태로 보고한다.

**P3 Go 조건**

- 허용 variation 조합이 미해결 참조나 캔버스 이탈 없이 컴파일된다.
- 조합 수가 무제한으로 폭증하지 않고 명시된 envelope 안에 있다.
- blueprint version/hash/seed/variation이 승인과 생성 사이에서 일치한다.
- `released`가 아닌 도구·활동·variation은 제품 표면에 나타나지 않는다.

## 7. 조사 운영 원칙

- 전체 팔레트는 P0에서 얕게 파악하고, 깊은 lifecycle 분석은 P1–P3 wave별로 수행한다.
- 깊은 probe가 프로젝트를 필요로 하면 `AI-CONTRACT-PROBE-*`로 새 프로젝트만 만든다.
- 사용자 계정의 기존 프로젝트를 수정하거나 삭제하지 않는다.
- 로그인은 사용자가 직접 수행하며 비밀번호·쿠키·토큰을 기록하지 않는다.
- 조사 원본과 sanitization 결과를 분리한다.
- 변경이 감지되면 해당 도구의 support state만 내리고 다른 도구 생성을 전역 차단하지 않는다.

## 8. 주요 위험과 대응

| 위험 | 대응 |
|---|---|
| 템플릿 레지스트리로 하드코딩 위치만 이동 | recipe DSL, cardinality test, 비분수 fit gate |
| blueprint에 좌표가 스며듦 | 상대 LayoutBlock만 허용하고 schema에서 좌표 금지 |
| 활동별 validator 증가 | 폐쇄형 의미 제약과 활동 ID 무지 원칙 |
| 분수 모델에 과적합 | P2에서 `10 가르기·모으기`를 필수 gate로 사용 |
| 전체 도구 심층 조사로 구현이 장기 정지 | 얕은 전체 inventory + wave별 심층 조사 |
| MathCanvas 변경으로 probe 실패 | creator-owned probe, public fallback, 상태 원인 분리 |
| 원본 캡처의 민감정보 유출 | gitignored raw 저장소, deterministic redaction, secret scan |
| 스키마 전환 복잡도 | 구 draft 만료·격리, 고정 seed 골든 회귀, 장기 이중 스키마 금지 |
| 너무 이른 package 분할 | 기존 package 내부 디렉터리부터 시작하고 2/3 승격 규칙 적용 |

## 9. 비목표

- MathCanvas 자체 UI를 복제하거나 대체하지 않는다.
- 브라우저에서 임의 JavaScript를 실행하는 범용 MCP를 만들지 않는다.
- 기존 프로젝트 편집·삭제를 지원하지 않는다.
- 검증되지 않은 도구를 “지원됨”으로 표시하지 않는다.
- T3 자유 조립을 외부 제품 기능으로 출시하지 않는다.
- 외부 Python 구현을 포팅하지 않는다.
- P0에서 모든 도구의 전체 lifecycle을 끝내지 않는다.

## 10. 단계별 실행 문서

- 진입점: `IMPLEMENTATION_PROMPT.md`
- P0: `prompts/P0_BASELINE_AND_INVENTORY.md`
- P1: `prompts/P1_PRIMITIVE_MIGRATION.md`
- P2: `prompts/P2_ARCHITECTURE_FIT.md`
- P3: `prompts/P3_TEACHER_VARIATION.md`

P0, P0.5 Wave 1, Wave 2는 Kiro Opus 5 PASS로 끝났고 원·점/선 계약은
`contracted`가 됐다. Wave 3 펜의 정적 계약, fail-closed delta seam과 승인형
canary 구현도 오프라인에서 완료했다. `common.pen`은 아직 `captured`와
`empty-array-only`이며 Kiro Opus 5 구현 안전 재검토는 PASS다. 다음 gate는
**새 프로젝트 POST 1회·해당 canary PUT 1회의 별도 사용자 승인**이다. 그 승인
전에는 Wave 3 live canary를 실행하지 않는다. authored dot/line/circle 검증도
별도 승인 대상이다.
P1–P3 프롬프트는 P0.5 전체 결과 보고서가 Go를 선언한 경우에만 사용할 수 있다.
