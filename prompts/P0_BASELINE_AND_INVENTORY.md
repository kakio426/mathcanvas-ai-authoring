# P0 Committed Build — 기준선, 골든 회귀, 전체 팔레트 얕은 조사

## Role and objective

당신은 이 저장소의 수석 TypeScript·MCP·브라우저 자동화 엔지니어다.

제품 동작과 외부 MCP 표면을 바꾸지 않은 채 다음 단계가 의존할 신뢰 가능한 기준선을 만든다.

1. 현재 빌드·테스트 기준선을 재현한다.
2. 현재 분수 비교 활동의 고정 seed 결과를 정규화 골든 fixture로 고정한다.
3. 제품과 격리된 `contract-lab` 조사 경계를 만든다.
4. 실제 MathCanvas 화면에서 현재 보이는 모든 팔레트 도구와 옵션을 얕게 전수 조사한다.
5. 민감정보 없는 정규화 snapshot, 증거 metadata, P0 Go/No-Go 보고서를 남긴다.

이 단계는 새 활동이나 범용 저작 엔진을 구현하는 단계가 아니다.

## Background

- 제품 정본: 현재 GitHub 저장소
- 현재 구조: Node 20+, pnpm 9, TypeScript 모노레포, Vitest, 제한형 MCP,
  Playwright 기반 managed browser
- 현재 지원: `fraction.compare.unlike-denominators.visual-v1`
- 현재 핵심 안전성: 전용 Chrome 프로필, 사용자 직접 로그인, 명시적 승인,
  새 프로젝트 생성 전용, fail-closed 검증
- 외부 비교 경로 `/Users/yubyeongju/Downloads/mathcanvas`는 조사 체크리스트일 뿐이다.
  코드·문서·fixture·payload를 복사하거나 포팅하지 않는다.

## Target users

- 직접 사용자: 이후 P1–P3를 수행할 개발자와 계약 조사 운영자
- 간접 사용자: MathCanvas 활동을 만드는 초등 교사와 활동을 조작하는 학생
- P0에는 새 교사용 UI를 만들지 않는다.

## Platform and constraints

- 기존 macOS/Windows 설치 흐름을 깨지 않는다.
- 조사 실행은 기존 managed Chrome과 사용자 직접 로그인을 재사용한다.
- 별도 범용 브라우저 MCP 또는 임의 스크립트 실행 API를 만들지 않는다.
- 새 runtime dependency와 새 workspace package를 추가하지 않는다.
- Node 표준 라이브러리와 이미 설치된 dependency로 구현한다.
- raw capture는 로컬 전용이고 git에서 무조건 제외한다.

## Scope

### R1. 작업 트리와 기준선 기록 `[Core]`

- 시작 시 `git status --short`를 기록하고 unrelated 사용자 변경을 보존한다.
- `pnpm install --frozen-lockfile`을 실행한다.
- `pnpm check`를 실행해 typecheck, test, build 결과를 기록한다.
- 실패하면 기능 변경으로 덮지 말고 기존 실패와 P0에서 생긴 실패를 분리해 보고한다.
- 기준선 보고서에 Node, pnpm, OS, 현재 commit, 테스트 개수와 결과를 기록한다.

### R2. 현재 활동의 고정 seed 골든 `[Core]`

- planner → template → compiler → validator의 현재 정식 경로를 그대로 사용한다.
- 고정 입력과 고정 seed 하나를 명시적으로 선택하고 저장한다.
- 비결정적 필드가 있다면 의미를 바꾸지 않는 최소 정규화 함수를 테스트 코드에 둔다.
- 다음 결과를 `fixtures/golden/`에 사람이 검토 가능한 JSON으로 고정한다.
  - 입력 요청
  - recommendation/activity spec
  - compiled payload
  - payload hash와 approval 관련 핵심 metadata
  - validation report의 안정 필드
- 골든을 재생성하는 명시적 스크립트와 골든을 비교하는 테스트를 만든다.
- 테스트 기본 실행이 골든을 자동 갱신해서는 안 된다.
- 골든 변경은 의도적 변경 사유가 diff에 드러나야 한다.

### R3. contract-lab 격리 경계 `[Core]`

- `scripts/contract-lab/`을 만들되 package나 MCP export로 등록하지 않는다.
- 최소 기능은 다음과 같다.
  - raw capture 입력 경로 검증
  - 결정적 redaction/normalization
  - inventory snapshot 생성 및 schema 검증
  - 중복 ID, 누락 category, 미분류 option 검출
  - 민감정보 key/value pattern 검사
- 모든 명령은 사용법, 입력, 출력, 실패 코드를 README에 설명한다.
- 사용자 홈 전체나 광범위한 경로를 스캔하지 않는다.
- raw 입력과 sanitized 출력을 명확히 다른 디렉터리로 제한한다.

### R4. raw 자료 보호 `[Core]`

- 저장소 루트의 `.gitignore`에 `.mathcanvas-contract-lab/`을 추가한다.
- raw 기본 경로는 저장소 안의 `.mathcanvas-contract-lab/raw/`로 제한한다.
- raw 파일, screenshot, HAR, cookie, local storage, token을 커밋하지 않는다.
- redaction은 최소한 다음을 제거하거나 안정적인 placeholder로 바꾼다.
  - cookie, authorization, token, session, password 계열 key/value
  - 이메일·계정 ID·개인 프로젝트 제목
  - 환경별 URL query와 불안정 timestamp
- sanitization 후 secret scan을 통과하지 못하면 snapshot 출력을 실패시킨다.

### R5. 전체 팔레트 얕은 inventory `[Core]`

실제 MathCanvas 화면을 기준으로 현재 보이는 모든 팔레트 항목을 조사한다.
도구 하나마다 최소 다음 필드를 기록한다.

- `observedName`
- `toolId` 또는 확인 불가 사유
- `categoryId`와 화면 category 이름
- `moduleKey` 또는 확인 불가 사유
- 화면에서 보이는 variant/option
- 관찰 위치와 관찰 시각
- 근거 유형(`dom`, `network`, `bundle`, `manual`)
- 현재 support state(`captured` 이하만 허용)
- 후속 deep-probe 우선순위와 사유

이 단계의 “전체”는 로그인한 사용자가 현재 팔레트에서 볼 수 있는 범위다.
숨겨진 내부 기능을 추측해 지원 항목으로 만들지 않는다.

캡처 방식은 다음으로 고정한다.

- root에 이미 있는 `playwright-core`로 persistent Chrome context를 실행한다.
- profile은 `MATHCANVAS_STATE_DIR/chrome-profile` 또는 제품과 동일한 안전한 기본
  state directory를 사용한다.
- 제품의 `server.lock`과 같은 lock 경계를 먼저 확인한다. MCP 서버나 다른 조사
  프로세스가 profile을 사용 중이면 `contract-lab-profile-in-use`로 거부하고
  사용자가 해당 프로세스를 닫을 때까지 기다린다.
- 일반 Chrome profile, 임의 사용자 profile, 임의 CDP endpoint에는 연결하지 않는다.
- 로그인은 이 전용 Chrome에서 사용자가 직접 수행한다.
- 조사 스크립트는 palette 탐색과 DOM/network 관찰만 하며 프로젝트 생성·저장·수정·
  삭제 요청을 발생시키지 않는다.
- Playwright `evaluate`를 내부 조사 구현에 쓸 수는 있지만 범용 CLI/MCP 입력으로
  노출하지 않는다.

### R6. inventory snapshot 계약 `[Core]`

- sanitized 정본은 `research/mathcanvas/tool-catalog.snapshot.json`에 둔다.
- snapshot에는 schema version, source observation date, MathCanvas origin,
  palette fingerprint, tool count, category count를 포함한다.
- 배열은 category와 stable tool key 기준으로 정렬해 반복 실행 diff가 결정적이어야 한다.
- 동일 tool ID 중복, 빈 이름, 근거 없는 released 상태를 거부한다.
- 확인 불가 값은 빈 문자열로 속이지 말고 구조화된 `unknownReason`으로 남긴다.
- palette fingerprint는 변경 감지 metadata이며 제품 생성의 전역 gate가 아니다.

### R7. 조사 문서와 wave 지도 `[Core]`

- `research/mathcanvas/README.md`에 조사 방법, 재현 절차, 증거 한계,
  raw/sanitized 경계를 설명한다.
- 모든 도구를 깊게 조사하려 하지 말고 P1–P3에 필요한 deep-probe wave 후보를 만든다.
- 최소한 다음 후보 묶음을 표시한다.
  - P1: 현재 활동이 쓰는 text, LaTeX, fraction model, draw/rectangle
  - P2: equivalent fraction과 `10 가르기·모으기`에 필요한 number card,
    ten-frame/counting 계열
  - P3: 실제 variation에서 사용할 number line 또는 표현 variant
- 제품 지원 상태를 실제보다 높게 표시하지 않는다.

### R8. 자동 검증 `[Core]`

다음 테스트 또는 동등한 자동 검사를 추가한다.

- 고정 seed 골든이 재현된다.
- 골든 compiler payload와 hash가 일치한다.
- 정규화 함수가 입력을 변이하지 않는다.
- redaction이 민감 key/value fixture를 제거한다.
- 같은 raw fixture에서 byte-stable sanitized snapshot이 나온다.
- tool/category 중복과 unknown 사유 누락을 거부한다.
- `released`를 근거 없이 기록할 수 없다.
- 조사 모듈이 package public export나 MCP tool 목록에 연결되지 않는다.

### R9. P0 결과 보고 `[Core]`

`reports/P0_GO_NO_GO.md`를 만들고 다음을 포함한다.

- 기준선 commit과 환경
- 실행한 명령과 결과
- 기존/최종 테스트 수
- 골든 fixture 경로와 고정 seed
- snapshot ID, 관찰 날짜, tool/category 수
- unknown 또는 접근 불가 항목
- redaction/secret scan 결과
- P1 deep-probe 대상
- P0 Go 조건별 증거
- 최종 `GO`, `P0-OFFLINE-READY / LIVE-BLOCKED`, 또는 `NO-GO`

근거가 하나라도 부족하면 낙관적으로 `GO`를 쓰지 않는다.
오프라인 R1–R4/R8이 통과했지만 인증 때문에 R5–R7을 끝내지 못한 경우에는
산출물을 폐기하지 않고 `P0-OFFLINE-READY / LIVE-BLOCKED`로 기록한다.
이 부분 판정은 P1 시작 권한이 아니다.

## Explicit non-goals

- `ToolAdapter`, `LayoutBlock`, `InteractionConstraint`, 새 blueprint를 구현하지 않는다.
- 기존 schema를 범용 schema로 교체하지 않는다.
- 현재 활동의 output이나 MCP 요청/응답 계약을 변경하지 않는다.
- 새 활동, 새 교사용 option, 새 palette 도구 지원을 출시하지 않는다.
- 모든 도구의 생성→조작→저장→재열기 lifecycle을 P0에서 완료하지 않는다.
- 기존 또는 공개 프로젝트를 PUT/DELETE하지 않는다.
- live 조사만을 위해 사용자 프로젝트를 자동 생성하지 않는다.
- 외부 Python 버전의 코드나 문서를 가져오지 않는다.

## Architecture backbone for P0

```text
live MathCanvas observation
  → local raw capture (.mathcanvas-contract-lab/, gitignored)
  → deterministic sanitizer
  → validated normalized snapshot
  → research/mathcanvas/tool-catalog.snapshot.json
  → P1–P3 deep-probe queue

current fixed request + seed
  → existing planner/template/compiler/validator
  → normalized golden fixture
  → regression test
```

P0 조사 코드는 제품 데이터 흐름과 단방향으로 분리한다. 제품이 research snapshot을
runtime에 직접 읽어 기능을 활성화해서는 안 된다.

## Definition of done

### Core

- R1–R9가 모두 구현되고 자동 검사가 통과한다.
- `pnpm check`가 통과한다.
- live palette inventory가 완료되거나, auth/접근 불가가 구체적 근거와 함께
  `NO-GO`로 보고된다.
- raw 자료나 민감정보가 git diff에 없다.
- 현재 제품 output과 public MCP surface가 바뀌지 않았다.
- `reports/P0_GO_NO_GO.md`가 모든 판단 근거를 연결한다.

### Scaffold

- P1–P3의 deep-probe queue는 우선순위와 필요한 lifecycle만 기술한다.
- adapter/DSL/새 활동 코드는 만들지 않는다.

## Acceptance tests

1. 깨끗한 checkout에서 문서화한 명령으로 골든 검증이 재현된다.
2. 고정 seed를 바꾸지 않으면 골든 JSON과 hash가 byte-stable하다.
3. 민감정보가 든 synthetic raw fixture는 sanitization 후 해당 값이 남지 않는다.
4. sanitizer가 민감정보를 제거하지 못하면 non-zero로 실패한다.
5. duplicate tool ID와 category 누락 fixture는 거부된다.
6. `unknown` 값은 반드시 사유를 가진다.
7. palette snapshot 항목 수와 category별 합이 일치한다.
8. contract-lab 파일을 삭제해도 제품 package build graph와 MCP surface가 변하지 않는다.
9. 기존 fraction activity 관련 테스트와 managed-browser 안전 테스트가 모두 통과한다.
10. `git diff --check`가 통과한다.

## QA and verification

- `pnpm install --frozen-lockfile`
- `pnpm check`
- P0에서 추가한 골든 verify 명령
- contract-lab fixture test와 secret scan 명령
- `git diff --check`
- `git status --short`
- tracked 파일에 민감 pattern이 없는지 제한된 저장소 범위에서 확인

live 화면 확인 중 로그인이 필요하면 사용자에게 직접 로그인을 요청하고 기다린다.
비밀번호 입력을 자동화하거나 인증정보를 요청하지 않는다.

권장 실행 순서는 R1 → R2 → R3 → R4 → R8의 오프라인 작업을 먼저 끝내고,
로그인 가능 시 R5 → R6 → R7 → R9를 완료하는 것이다.

## Assumptions

- 로그인 후 보이는 현재 팔레트를 “현재 사용자에게 제공되는 전체 팔레트”로 정의한다.
- tool ID나 module key가 화면만으로 확인되지 않으면 network/bundle 근거를 사용할 수 있다.
- bundle에서 찾은 이름만으로 native contract를 확정하지 않는다.
- palette fingerprint가 달라도 P0 snapshot을 갱신할 수 있으며, 그 자체가 계약 mismatch는 아니다.
- live access가 일시적으로 불가능하면 `probe-unavailable`로 기록하며 지원 실패와 구분한다.

## Required handoff

완료 메시지는 구현 요약보다 판정부터 제시한다.

1. `P0 GO`, `P0-OFFLINE-READY / LIVE-BLOCKED`, 또는 `P0 NO-GO`
2. 기준선과 최종 검증 결과
3. snapshot ID/date/tool count/category count
4. unknown과 접근 제한
5. 생성·변경한 핵심 파일
6. 민감정보 검사 결과
7. P1을 시작해도 되는지와 그 근거

`GO`인 경우에도 P1을 자동으로 시작하지 않는다.
