# [SUPERSEDED] MathCanvas 전체 도구 조사와 안전한 지원 범위 확장

> **STATUS: NO-GO — 구현에 사용하지 말 것**
>
> Kiro CLI의 `claude-opus-5` 계획 심사에서 활동 양식 하드코딩을 제거하지 못하고
> 재배치할 위험이 확인됐다. `CLAUDE_OPUS_5_PLAN_REVIEW_2026-07-29.md`의 대안을
> 반영한 후 단계별 프롬프트로 교체해야 한다.

## Role and objective

당신은 `kakio426/mathcanvas-ai-authoring`의 수석 TypeScript·MCP·교육 소프트웨어 엔지니어다.

현재 한 가지 활동인 `분모가 다른 분수의 크기 비교`에 강하게 결합된 구조를 다음 방향으로 확장하라.

1. 실제 MathCanvas 화면에서 현재 제공되는 모든 팔레트 도구와 옵션·상호작용·저장 계약을 전수 조사한다.
2. Python은 오프라인 조사와 빠른 계약 후보 분석에만 사용하고, 배포 제품은 기존 TypeScript 모노레포와 제한형 MCP 구조를 유지한다.
3. 단일 분수 템플릿에 하드코딩된 스키마·컴파일러·validator·planner를 도구 어댑터와 템플릿 레지스트리 구조로 일반화한다.
4. 첫 정식 확장 묶음으로 분수 모형, 수직선, 수 카드를 지원하고 `분수 크기 비교`, `동치분수`, `수직선에 분수 나타내기` 활동을 출시 상태까지 완성한다.
5. 두 번째·세 번째 도구 묶음은 실제 등록 경계와 지원 상태를 갖춘 scaffold로 남기되, 구현되지 않은 기능을 지원된 것처럼 노출하지 않는다.

이 작업은 빠른 데모가 아니라 committed build다. 기능 수를 무리하게 넓히기보다 조사 기반, 계약, 안전성, 회귀 호환성과 첫 묶음의 완성도를 우선한다.

## Background

현재 저장소는 TypeScript·pnpm 모노레포이며 다음 장점을 이미 갖고 있다.

- Codex·Claude Code 공용 stdio MCP 서버
- 별도 영구 프로필의 제한형 Google Chrome
- 사용자 직접 로그인
- 새 프로젝트 `POST`만 허용하는 쓰기 경계
- 교사 승인 해시와 payload 해시 검증
- Zod 스키마, 결정적 템플릿, fail-closed validator
- 상태 복구와 중복 생성 방지
- 기존 15개 테스트 파일, 74개 테스트와 전체 빌드

하지만 다음 부분은 단일 분수 비교 활동에 하드코딩돼 있다.

- 단일 literal인 `VERIFIED_TEMPLATE_ID`
- 한 값만 허용하는 `manipulationSchema`
- 분수 비교 전용 `ActivityProblem`, `VisualModel`, `ActivitySpec`
- `generateFractionComparisonActivity()` 직접 호출
- 분수 객체를 직접 아는 컴파일러와 validator
- `[6수01-07]`만 직접 검사하는 교육과정 경계

`kakio426/mathcanvas-ai-authoring`은 사용자가 직접 만든 정본이다. 모든 제품 결정, 아키텍처와 구현은 이 저장소를 기준으로 한다.

`/Users/yubyeongju/Downloads/mathcanvas`는 사용자가 만든 코드가 아닌 외부 비교 자료다. 20개 안팎의 교구에 관한 Python 빌더와 교육적 활용 기록이 있지만 코드·문서·필드 값을 복사, 번역 또는 기계 이식하지 않는다. 출처와 라이선스가 확인되지 않은 외부 구현은 제품 코드의 근거로 사용할 수 없다. 조사 누락을 줄이는 참고 목록으로만 보고, 실제 MathCanvas 화면, 저장 결과, 재열기 결과와 API 객체에서 독립적으로 확인한 내용만 새로 구현한다.

## Target users

- 직접 사용자: 한국 초등학교 교사
- 학습자: 초등학교 1~6학년 학생
- 운영 환경: 교사의 Windows 또는 macOS 데스크톱, Codex 또는 Claude Code, Google Chrome
- 교육 기준: 2022 개정 교육과정

교사는 수학 자료 개발자나 API 사용자가 아니다. 기술적인 도구 ID 대신 학년·단원·학습 목표와 학생 조작을 중심으로 상호작용해야 한다.

## Platform and environment

- Node.js 20 이상
- TypeScript, pnpm workspace, Zod, Vitest
- `playwright-core` 기반 관리형 Chrome
- stdio MCP
- macOS·Windows 설치 지원
- MathCanvas origin은 정확히 `https://mathcanvas.vivasam.com`
- 프로덕션 런타임에 Python 의존성을 추가하지 않는다.
- 조사용 Python 스크립트는 표준 라이브러리를 우선하고 인증 정보·브라우저 세션·외부 쓰기 권한을 받지 않는다.

작업 시작 시 현재 `main`에서 `pnpm install --frozen-lockfile && pnpm check`를 실행해 기준선을 기록하라. 기존 동작과 테스트를 보존하면서 단계별로 변경한다.

## Scope for this version

### Phase 0: 전체 도구 계약 조사

조사 시작일의 MathCanvas 전체 팔레트 항목을 하나의 `ContractSnapshot`으로 고정한다. 모든 도구에 대해 다음을 조사한다.

- 영역·카테고리·표시 이름·도구 ID·module key
- 팔레트에서 기본 객체 생성
- 제공되는 모든 의미 있는 옵션과 변형
- 선택, 이동, 회전, 크기 변경, 색상·속성 변경
- 도구 고유 조작
- 복제와 캔버스 요소 삭제
- 저장, 새로고침 또는 재열기
- 조작 전후 API 객체와 DOM/SVG 기하의 정규화 diff
- canvasOption과 다른 도구에 대한 의존성
- 좌표 anchor, 실제 footprint, 최소·최대 또는 허용 범위
- 오류·무시되는 필드·렌더 중단 조건

전체 팔레트 도구에 위 조사 항목이 채워지거나, 관찰할 수 없는 이유가 명시되어야 Phase 0을 완료한 것으로 본다. 단순 도구 이름 목록은 완료가 아니다.

### Phase 1: 범용 기반과 첫 정식 출시 묶음

- 분수 모형
- 수직선 중 분수 활동에 필요한 변형
- 수 카드 중 첫 활동에 필요한 변형
- 기존 공통 객체인 텍스트, 수식, 그리기 요소
- 분수 크기 비교 활동의 v2 이전
- 동치분수 활동
- 수직선에 분수 나타내기 활동

실제 조사에서 확인한 도구 ID와 변형만 사용하라. 다운로드 폴더의 `NO03FM`, `NO07NL`, `NO04NT` 등의 이름은 가설이며 라이브 스냅샷으로 확인하기 전에는 계약 상수로 채택하지 않는다.

### Later-wave scaffold

다음 항목은 catalog entry, adapter 등록 경계, template 등록 경계와 release gate만 실제로 만든다.

- 두 번째 묶음: 수 세기 모형, 십 배열판, 연결 모형, 수 모형
- 세 번째 묶음: 접시저울, 모양추, 대수 막대, 대수 블록

가짜 adapter, 빈 템플릿, 하드코딩된 성공 상태는 만들지 않는다. 조사 근거가 있더라도 이번 버전에서 구현하지 않은 항목은 최대 `contracted` 상태로 남긴다.

## Non-goals

- 기존 사용자 프로젝트 수정 또는 삭제
- 프로젝트 `PUT`·`DELETE` 도구 추가
- 범용 브라우저 제어, 임의 JavaScript 평가 또는 브라우저 콘솔 붙여넣기 방식
- Python 로컬 HTTP 서버
- 다운로드 폴더의 `builder.py` 기계적 이식
- 다운로드 폴더의 외부 코드·문서·필드값 복사 또는 번역
- 조사되지 않은 필드나 도구의 추측 구현
- 범용 자유 교구 조합 MCP의 외부 공개
- 학생 계정, 학생 응답, 수행 시간, 조작 로그 수집
- 학생 자동 진단 또는 학생 링크 자동 발행
- 원격 AI 추천 서비스
- 다교사·불특정 다수 공개 배포
- 구현되지 않은 두 번째·세 번째 묶음의 출시 표시

## Core user flow

1. 교사가 MathCanvas 전용 Chrome을 연다.
2. 교사가 전용 창에서 직접 로그인한다.
3. 교사가 학년·단원·학습 목표를 요청한다.
4. 시스템이 `released` 상태의 활동 템플릿만 대상으로 활동, 교구, 문제 수, 난이도와 조작 방식을 추천한다.
5. 시스템이 학생 조작 지시, 사고 발문, 대표 오개념, 교사 관찰 포인트와 정답지를 보여 준다.
6. 교사가 추천안을 명시적으로 승인한다.
7. 시스템이 ActivitySpec, tool contract version, template version, payload hash와 최신 MathCanvas 계약을 다시 검증한다.
8. 검증을 모두 통과하면 새 프로젝트를 한 번만 생성하고 편집 화면을 연다.
9. 계약 불일치, 로그인 만료, 미출시 요청 또는 검증 오류는 생성하지 않고 구체적인 안전 오류로 반환한다.

## Architectural backbone

### Data model

다음 핵심 엔티티를 strict Zod schema와 TypeScript type으로 구현한다.

#### `ContractSnapshot`

- `schemaVersion`
- `snapshotId`
- `capturedAt`
- MathCanvas 화면 또는 앱 지문
- 팔레트 해시
- 조사 계정 범위
- `ToolDescriptor` 목록
- sanitized fixture 참조
- raw evidence가 Git 밖에 있다는 표시

기존 스냅샷을 덮어쓰지 않는다. 계약 변경은 새 스냅샷으로 추가한다.

#### `ToolDescriptor`

- 안정적인 내부 `toolId`
- 화면 표시 이름
- 영역·카테고리
- 관찰된 module key와 native `svgId`
- 변형 목록
- 속성 컨트롤
- 지원 상호작용
- canvasOption 의존성
- 관찰 날짜와 fixture 참조

#### `ToolContract`

- 계약 ID와 semver
- 대응 `toolId`
- strict parameter schema
- native object 불변조건
- 좌표·anchor·footprint 규칙
- 허용 상호작용
- 정규화 fixture와 관찰 근거
- 호환 ContractSnapshot 범위

#### `SupportEvidence`

다음 상태에 필요한 증거를 구조화한다.

`discovered → captured → contracted → compiled → lifecycle-verified → activity-verified → released`

현재 상태는 증거로부터 계산한다. 임의 문자열 변경으로 승급할 수 없어야 한다.

- `discovered`: 팔레트 존재와 식별 정보
- `captured`: 기본·옵션·상호작용·저장 전후 관찰 자료
- `contracted`: strict schema, 불변조건, footprint와 의존성
- `compiled`: adapter와 fixture 기반 canonical 출력
- `lifecycle-verified`: 생성한 출력이 실제 화면에서 렌더·조작·저장·재열기됨
- `activity-verified`: 수학·교육·배치·조작 검증을 통과한 템플릿 존재
- `released`: 인증된 canary 생성과 외부 MCP 공개 게이트 통과

#### `ActivityTemplateDefinition`

- 일반 identifier인 template ID와 semver
- 출시 상태
- 학년군과 성취기준
- 학습 목표와 대표 오개념
- 선수 지식
- required tool contracts와 최소 버전
- 허용 문제 수·난이도·조작 방식
- matcher 메타데이터
- validator와 generator 참조

#### `ActivitySpecV2`

- 일반 template reference
- curriculum reference
- learning design
- 문제 데이터
- semantic activity objects
- interaction rules와 drop/relationship 정보
- layout
- provenance

semantic object는 `toolRef`, 역할, bounds와 parameter bag을 가질 수 있지만, compiler에 들어가기 전에 해당 `ToolAdapter.parameterSchema`로 strict parse해야 한다. 검증되지 않은 arbitrary record가 native payload로 전달되어서는 안 된다.

#### `ToolAdapter`

각 도구군은 다음 실제 경계를 구현한다.

- `parameterSchema`
- `compile`
- `validateSemantic`
- `validateNative`
- `footprint`
- `supportedInteractions`
- `contractVersion`

#### Legacy compatibility

현재 분수 전용 ActivitySpec을 legacy v1 경계로 보존한다. 새 추천은 v2를 생성한다. 기존 분수 비교 활동을 v2 템플릿으로 이전하고 다음을 회귀 검증한다.

- 기존 교사 흐름
- 문제 생성의 결정성
- 승인·payload 해시
- 기존 MathCanvas native contract
- 로그인·재시도·중복 생성 안전성

기존 로컬 draft 파일 때문에 서버가 시작 즉시 죽지 않도록 명시적인 legacy parse 또는 안전한 quarantine 경로를 제공한다.

### Module seams

#### `apps/contract-lab` `[core]`

개발자 전용 CLI다. MCP 도구로 등록하지 않는다. 정확한 MathCanvas origin, 전용 프로필과 `AI-CONTRACT-...` 분석 프로젝트만 다룬다. 자유형 script/eval을 노출하지 않고 명시적인 조사 recipe만 실행한다.

권장 명령 경계:

- `inventory`
- `capture --tool <id>`
- `normalize`
- `diff`
- `report`
- `verify-evidence`

명령 이름은 저장소 관례에 맞게 조정할 수 있지만 책임 경계는 유지한다.

#### `packages/contract-observer` `[core]`

- 팔레트 발견
- raw capture 입력 형식
- 민감정보 검사와 redaction
- canonical normalization
- 전후 diff
- snapshot과 synthetic fixture 생성

실제 로그인 세션과 페이지 접근은 TypeScript 관리형 Chrome 안에서만 수행한다.

#### `packages/tool-catalog` `[core]`

- ContractSnapshot
- ToolDescriptor
- ToolContract
- SupportEvidence
- 지원 상태 계산
- 생성 가능한 지원 행렬

지원 목록을 여러 파일에 손으로 중복 작성하지 않는다.

#### `packages/contracts` `[core]`

- 도구 비종속 v2 활동·추천·승인·생성 작업 schema
- legacy v1 호환 경계
- 민감정보 차단
- canonical hash

단일 template literal과 단일 manipulation literal을 전역 schema에서 제거한다.

#### `packages/mathcanvas-compiler` `[core]`

도구 어댑터 레지스트리를 통해 semantic object를 native object로 변환한다. 템플릿 ID나 교육과정 코드를 직접 알지 않는다.

#### `packages/templates` `[core]`

템플릿별 폴더와 registry를 사용한다. 각 템플릿은 generator, template validator, 교육 메타데이터와 문제 은행을 자체 경계로 가진다.

#### `packages/validator` `[core]`

다음 층을 분리한다.

1. 공통 schema·security·hash 검증
2. 공통 layout·ID·reference 검증
3. tool adapter semantic/native 검증
4. template별 수학·교육·상호작용 검증
5. MathCanvas 프로젝트 계약 검증

한 도구를 추가할 때 거대한 단일 함수에 조건문을 계속 붙이지 않는다.

#### `packages/planner` `[core]`

template registry와 matcher로 추천한다. 특정 템플릿 generator를 직접 호출하지 않는다. 지원하지 않는 요청은 가장 가까운 미출시 기능을 성공처럼 반환하지 않고 정확한 blocking reason을 준다.

#### `packages/managed-browser` `[core]`

프로덕션 생성 경계, 정확한 origin 검사, 실시간 계약 fingerprint, 새 프로젝트 POST와 중복 조정을 유지한다. 조사 기능은 별도 내부 인터페이스에서만 저수준 런타임을 재사용한다.

#### `apps/mcp-server` `[core]`

현재 다섯 도구의 승인 의미를 유지한다. `released` 활동만 반환하는 읽기 전용 `mathcanvas_list_supported_activities`를 추가할 수 있다. 범용 native object 생성이나 자유 브라우저 도구는 노출하지 않는다.

#### Later-wave registries `[scaffold]`

두 번째·세 번째 묶음이 동일한 ToolAdapter와 ActivityTemplateDefinition으로 들어올 실제 등록 위치를 만든다. placeholder 결과는 반환하지 않는다.

### State and data flow

조사 흐름:

`관리형 Chrome 관찰 → Git 제외 raw evidence → 오프라인 정규화·diff → sanitized ContractSnapshot → ToolContract → adapter fixture/test → SupportEvidence 승급`

제품 흐름:

`교사 요청 → planner/template registry → Recommendation → ActivitySpecV2 → adapter compiler → CompiledProject → layered validator → 교사 승인 해시 → 실시간 계약 검사 → 새 프로젝트 POST`

신뢰할 수 있는 제품 계약의 단일 소스는 Git에 커밋된 sanitized snapshot, tool contract와 fixture다. `.mathcanvas-contract-lab/`의 raw evidence를 프로덕션 코드가 직접 읽어서는 안 된다.

### Extension points

- 두 번째·세 번째 도구 묶음의 adapter와 활동 템플릿
- 도형·측정, 자료·가능성 영역의 tool contract와 curriculum record
- 새 MathCanvas ContractSnapshot에 대한 계약 비교와 명시적 migration

학생 분석·원격 추천·학생 게시 기능은 이번 skeleton의 extension point로 미리 구현하지 않는다.

## Ordered functional requirements

### R1. Baseline and regression guard

- 현재 의존성을 고정 설치하고 전체 검사를 통과시킨다.
- 기존 74개 테스트와 현재 분수 비교 행동을 기준선으로 기록한다.
- 작업 중 기존 보안 불변조건을 깨는 변경은 먼저 회귀 테스트를 추가한다.

### R2. Contract-lab safety boundary

- `.mathcanvas-contract-lab/`을 Git에서 제외한다.
- raw 자료가 저장소나 MCP 응답으로 유출되지 않는 경계를 만든다.
- 분석용 프로젝트 제목 패턴을 강제한다.
- 로그인 필요 시 사용자에게 전용 Chrome에서 직접 로그인하도록 안내하고 비밀번호를 입력하거나 받지 않는다.
- 기존 프로젝트를 자동 탐색해 수정하지 않는다.

### R3. Full live inventory

- 실제 화면에서 전체 팔레트와 옵션을 발견한다.
- 도구마다 전체 조사 matrix를 채운다.
- 확인되지 않은 다운로드 문서 항목은 별도로 표시한다.
- 누락·중복·이름 충돌을 자동 검사한다.

### R4. Normalization and evidence pipeline

- 토큰, 쿠키, Authorization, 사용자 식별자와 프로젝트 원본 메타데이터를 차단한다.
- 불안정한 ID, 시간, 좌표 노이즈를 규칙에 따라 정규화하되 의미 있는 필드를 지우지 않는다.
- 기본·변형·상호작용·저장 전후의 최소 synthetic fixture와 diff를 생성한다.
- Python을 사용할 경우 오프라인 입력 파일만 받고 네트워크와 인증 경계를 갖지 않게 한다.

### R5. Tool catalog and support states

- ContractSnapshot, ToolDescriptor, ToolContract, SupportEvidence를 구현한다.
- 모든 팔레트 도구가 catalog에 정확히 한 번 등장하게 한다.
- 증거 없이 상태가 승급되지 않도록 테스트한다.
- 사람과 기계가 읽는 지원 행렬을 같은 데이터에서 생성한다.

### R6. Generic v2 contracts

- 기존 전역 literal을 일반 registry reference로 교체한다.
- ActivitySpecV2와 legacy v1 경계를 구현한다.
- invalid template ID, tool contract version, parameter, reference와 interaction을 strict하게 거부한다.
- 현재 저장된 draft/job 업그레이드 오류를 안전하게 처리한다.

### R7. Adapter-based compiler

- compiler에서 템플릿별 분기와 분수 전역 지식을 제거한다.
- ToolAdapter registry를 구현한다.
- canonical output과 deterministic hash를 유지한다.
- adapter가 없는 semantic object는 fail closed한다.

### R8. Layered validator

- 공통, 도구별, 템플릿별 validator를 분리한다.
- 기존 분수 검증을 동일하거나 더 강한 수준으로 이전한다.
- 오류는 schema, curriculum, mathematics, pedagogy, layout, interaction, api-contract, security 영역과 정확한 path를 유지한다.

### R9. Template and planner registry

- 템플릿 metadata, matcher, generator와 validator를 registry로 연결한다.
- 추천 결과는 필요한 tool contract 최소 버전을 포함한다.
- `released`가 아닌 템플릿은 추천·생성하지 않는다.
- 활동별 교사용 안내와 정답지 생성기를 템플릿 경계로 옮긴다.

### R10. First-wave tool adapters

라이브 계약에 근거해 분수 모형, 필요한 수직선 변형, 필요한 수 카드 변형과 공통 텍스트·수식·그리기 adapter를 구현한다.

각 adapter는 다음을 충족해야 한다.

- strict parameter parse
- native invariant 검사
- 실제 footprint 계산
- canvasOption/module 의존성 선언
- fixture golden test
- 컴파일 결과의 실제 렌더·조작·저장·재열기 검증

### R11. First-wave activities

다음 세 활동을 학습 목표·오개념 중심 템플릿으로 구현한다.

1. 분수 크기 비교
2. 동치분수 발견 또는 확인
3. 수직선에 분수 나타내기

각 활동은 다음을 포함한다.

- 2022 개정 교육과정의 검증된 성취기준과 출처
- 선수 지식
- 대표 오개념
- 학생이 직접 해야 할 조작
- 무엇을 어디로 조작하고 무엇을 관찰하는지 명확한 문장
- 사고 발문
- 교사 관찰 포인트
- 문제별 정답과 수학적 설명
- 결정적 seed와 난이도 규칙
- 겹침·캔버스 이탈·너무 작은 조작 영역 방지

교구를 완성된 그림처럼만 놓지 말고 학생이 수행할 조작을 남긴다.

### R12. MCP capability surface

- 기존 승인·생성 흐름을 보존한다.
- 교사가 출시 활동을 확인할 수 있는 읽기 전용 목록 기능을 제공한다.
- 추천 응답에 템플릿, 학년, 목표, 교구, 조작, 대표 오개념, 정답지 요약을 포함한다.
- 자유 조합·raw payload·도구 ID는 외부 MCP 입력으로 받지 않는다.

### R13. Live contract preflight

- 생성 직전에 필요한 tool contract fingerprint를 검사한다.
- 전체 catalog가 아니라 해당 활동에 필요한 계약만 정확히 검사할 수 있게 한다.
- 계약 불일치 시 어떤 도구 계약이 달라졌는지 안전한 detail code로 알리고 생성하지 않는다.
- 토큰이나 raw payload를 응답에 넣지 않는다.

### R14. Authenticated canary and promotion

- 제작자 계정의 분석용 새 프로젝트로 세 활동을 각각 최소 한 건 검증한다.
- 실제 렌더, 학생 조작, 저장, 재열기와 편집 화면을 확인한다.
- canary 증거와 자동 테스트가 모두 있어야 `released`로 승급한다.
- 프로젝트 자동 삭제를 구현하지 않는다. 생성 목록을 보고하고 사용자가 수동 정리하게 한다.

### R15. Documentation and release record

- 아키텍처, 계약 조사 방법, 지원 행렬, 교육 QA, 보안 문서를 현재 구현과 일치하게 갱신한다.
- `DISTRIBUTION_PERMISSION.md`의 현재 허가 상태를 확대 해석하지 않는다.
- 실제로 하지 않은 Windows 실기기 검증이나 다교사 배포를 완료로 표시하지 않는다.

## Content and data requirements

- 교육과정 기록에는 공식 출처, locator, 버전, 확인일과 검토 상태가 있어야 한다.
- 템플릿은 교구 이름이 아니라 학습 목표와 오개념을 중심으로 명명한다.
- 하나의 활동은 필요한 경우 1~3개 교구를 결합할 수 있다.
- 원본 MathCanvas 응답 전체를 fixture로 커밋하지 않는다.
- proprietary SVG path 데이터, 토큰, 쿠키, 사용자 이름, member ID, Authorization header를 저장하지 않는다.
- native `svgId`처럼 호환성 검증에 필요한 최소 식별자는 허가·보안 범위 안에서 정규화 fixture에 기록할 수 있다.
- raw screenshot은 로컬 조사 폴더에만 두며 공개 문서나 Git에 자동 포함하지 않는다.

## Visual and UX direction

새로운 별도 웹 UI를 만들지 않는다. 사용자 표면은 MCP 대화와 생성된 MathCanvas 활동이다.

- MCP 문구는 교사가 이해할 수 있는 자연스러운 한국어로 쓴다.
- 내부 도구 ID나 계약 버전은 오류 진단에 꼭 필요한 경우가 아니면 교사에게 전면 노출하지 않는다.
- 생성 활동은 제목, 조작 지시, 작업 공간, 사고 발문이 시각적으로 구분되어야 한다.
- MathCanvas 실제 렌더 기준으로 텍스트 가독성, 대비, 겹침, 캔버스 경계, 조작 가능한 크기를 validator에 반영한다.
- 학생이 해야 할 조작 없이 완성된 설명 그림만 나오는 활동은 pedagogy validation에서 실패한다.
- 오류는 사용자가 해야 할 다음 행동을 알려 주되 계약 정보나 인증 정보를 노출하지 않는다.

## Technical constraints

- 기존 pnpm workspace와 TypeScript strict 설정을 유지한다.
- 스키마는 가능한 한 `.strict()`를 사용한다.
- 새로운 도구 추가가 전역 union과 거대 validator 수정을 반복 요구하지 않게 한다.
- registry는 중복 ID·버전 충돌을 시작 시점 또는 테스트에서 거부한다.
- 모든 생성은 결정적이고 canonical hash가 재현 가능해야 한다.
- Node와 페이지 컨텍스트에서 payload hash가 일치해야 한다.
- 프로덕션은 stdio만 사용하며 loopback HTTP 서버를 열지 않는다.
- 정확한 origin 비교를 유지하고 유사 도메인·다른 포트를 허용하지 않는다.
- 기존 설치 스크립트와 상태 폴더 권한을 유지한다.
- raw 조사 도구는 프로덕션 package export와 MCP 도구 목록에서 제외한다.
- 조사용 Python은 개발 편의 도구이며 설치·실행의 필수 조건이 아니다.
- 조사용 Python은 이 프로젝트에서 새로 작성한 독립 구현이어야 하며 다운로드 폴더의 외부 코드를 재사용하지 않는다.

## Privacy and safety constraints

- 비밀번호, 쿠키, 토큰을 요청·입력·저장하지 않는다.
- 인증 값은 MathCanvas 페이지 컨텍스트 밖으로 반환하지 않는다.
- 기존 프로젝트 수정·삭제 API를 추가하지 않는다.
- 분석은 전용 계정 또는 `AI-CONTRACT-YYYYMMDD-도구명-번호` 프로젝트만 사용한다.
- 모든 외부 쓰기는 사용자 승인 범위 안의 새 분석 프로젝트 또는 승인된 새 활동 프로젝트로 제한한다.
- validator나 계약 검사가 불확실하면 생성하지 않는다.
- 학생 개인정보와 수행 데이터를 다루지 않는다.
- 여러 교사 배포는 서면 허가 범위가 확인되기 전까지 보류한다.

## Depth tags

### `core`

- 전체 팔레트 조사와 증거 pipeline
- contract-lab 안전 경계
- tool catalog와 상태 계산
- ActivitySpecV2와 legacy 호환
- ToolAdapter registry
- 계층형 validator
- planner/template registry
- 첫 도구 묶음
- 첫 활동 묶음
- 승인·보안·브라우저 계약
- 문서·테스트·canary

모든 core 단위는 실제 데이터, 실제 오류 처리, 회귀 테스트와 완료 증거를 가져야 한다. placeholder copy, hardcoded success 또는 수동으로만 맞는 상태는 허용하지 않는다.

### `scaffold`

- 두 번째·세 번째 도구 묶음의 catalog entry
- adapter와 template 등록 seam
- 후속 release gate

scaffold도 실제 schema와 등록 경계를 사용해야 하지만 구현되지 않은 adapter·템플릿은 없어도 된다. 외부에 노출되면 안 된다.

## Definition of done per core unit

### Contract lab

- 전체 팔레트 누락 여부를 보고한다.
- 잘못된 origin, 로그인 없음, 기존 프로젝트, 제목 규칙 위반과 민감정보 발견을 안전하게 거부한다.
- raw와 sanitized 출력 위치가 분리된다.
- 같은 입력을 다시 정규화하면 같은 결과가 나온다.

### Tool catalog

- 모든 발견 도구가 정확히 하나의 descriptor를 가진다.
- 모든 descriptor가 관찰 근거를 가진다.
- 지원 상태가 증거에서 계산된다.
- 사람용 Markdown 지원표와 machine-readable 데이터가 일치한다.

### ActivitySpecV2 and registries

- 새 template/tool 등록에 전역 literal 수정이 필요하지 않는다.
- 잘못된 ID, 버전, parameter, reference와 상호작용은 컴파일 전에 실패한다.
- legacy 분수 활동이 안전하게 처리된다.

### First-wave tools

- 실제 화면의 필요한 변형과 속성을 재현한다.
- native fixture와 compiler 출력이 canonical하게 일치한다.
- 실제 캔버스에서 생성·조작·저장·재열기가 된다.
- footprint와 module 의존성이 validator에서 검사된다.

### First-wave activities

- 세 활동이 모두 교육과정, 수학, 교육, 배치, 상호작용과 API 계약 검증을 통과한다.
- 실제 학생 조작이 남아 있다.
- 문제·정답·설명이 계산 결과와 일치한다.
- 빈 상태, 최소·최대 문제 수, 난이도, 중복 문제와 경계 배치를 테스트한다.

### Browser and safety

- 기존 새 프로젝트 전용 경계가 유지된다.
- 승인안 변경, payload 변경, 계약 변경, 로그인 만료와 중복 요청을 안전하게 처리한다.
- 토큰·raw payload가 MCP 응답과 파일에 나타나지 않는다.

## Acceptance criteria

1. 기준선의 기존 테스트가 모두 유지되고 `pnpm check`가 통과한다.
2. 전체 팔레트 snapshot에 누락되거나 중복된 화면 도구가 없다.
3. 모든 발견 도구가 기본, 옵션, 공통 편집, 고유 조작, 저장·재열기와 전후 diff 관찰 기록 또는 명시적인 관찰 불가 사유를 가진다.
4. Git 추적 파일에 토큰, 쿠키, Authorization, 사용자 식별자, 원본 프로젝트 응답과 raw screenshot이 없다.
5. 지원 상태는 증거 없이 승급할 수 없다.
6. compiler와 validator가 단일 분수 template literal에 의존하지 않는다.
7. 현재 분수 비교 활동이 v2 구조에서도 기능·수학·승인·생성 안전성 회귀를 통과한다.
8. 동치분수와 수직선에 분수 나타내기 활동이 자동 검증과 실제 인증 canary를 통과한다.
9. 분수 모형, 필요한 수직선과 수 카드 adapter가 실제 렌더·조작·저장·재열기를 통과한다.
10. 외부 MCP는 `released` 활동만 추천·생성하며 later-wave scaffold를 노출하지 않는다.
11. 기존 프로젝트에 대한 `PUT`·`DELETE` 및 범용 브라우저 도구가 존재하지 않는다.
12. macOS 설치·doctor·브라우저 smoke가 통과하고 Windows 미검증 상태를 정직하게 문서화한다.
13. 실제 생성한 분석·canary 프로젝트 목록과 수동 정리 필요 여부를 사용자에게 보고한다.
14. 다교사 또는 공개 배포를 완료로 주장하지 않는다.

## QA path

1. 기존 `pnpm check`
2. 새 schema와 registry unit tests
3. normalization·redaction golden tests
4. tool catalog 누락·중복·상태 승급 tests
5. adapter별 semantic/native/footprint tests
6. template별 deterministic generation과 수학·교육 tests
7. compiler canonical hash tests
8. layered validator negative tests
9. legacy v1 회귀 tests
10. MCP tool 목록, 미출시 차단, 승인·오류 응답 tests
11. 관리형 Chrome contract smoke
12. 제작자 로그인 후 세 활동의 실제 새 프로젝트 canary
13. 렌더·조작·저장·재열기 수동 확인과 sanitized 결과 기록
14. 의존성 감사와 민감정보 검색
15. README, ARCHITECTURE, MATHCANVAS_CONTRACT, EDUCATION_QA, SECURITY, REPORT, 지원 행렬의 구현 일치 검토

라이브 로그인이 필요하면 작업을 중단한 것으로 처리하지 말고, 사용자에게 전용 Chrome에서 직접 로그인하도록 요청한 뒤 같은 조사 또는 canary를 재개한다. 실제 확인하지 못한 단계는 통과로 표시하지 않는다.

## Open questions and assumptions

### Confirmed assumptions

- 조사 기준 시점의 실제 MathCanvas 팔레트가 전체 범위를 결정한다.
- 제작자 계정으로 분석용 새 프로젝트를 생성할 수 있다.
- 전체 조사 결과는 제품 코드보다 먼저 확정한다.
- 이번 committed 범위는 전체 조사 기반과 첫 도구·활동 묶음의 정식 출시까지다.
- 두 번째·세 번째 묶음은 후속 구현을 위한 실제 scaffold지만 이번 버전의 출시 범위는 아니다.
- Python은 선택적인 오프라인 조사 도구이며 제품 아키텍처가 아니다.
- 현재 저장소의 안전 원칙은 기능 확장보다 우선한다.

### Blocking open questions

없다. 실제 팔레트 수, 옵션 수와 라이브 계약 값은 질문으로 추측하지 말고 Phase 0 조사 결과로 확정한다.

## Required handoff

완료 시 다음을 보고하라.

- 실제 조사한 ContractSnapshot ID와 기준 날짜
- 전체 도구 수와 상태별 개수
- 첫 묶음의 released 도구와 활동
- 생성한 분석·canary 프로젝트 목록
- 자동·수동 QA 결과
- 남은 미검증 항목
- 두 번째 묶음을 시작하기 위한 정확한 다음 작업
- 변경 파일과 실행 명령
- 다교사·공개 배포 허가 상태
