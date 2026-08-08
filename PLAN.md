# MathCanvas 초등 1–6학년 네이티브 학습지 저작 계획

## Status

- **현재 정본(CANONICAL)** — 2026-08-08 committed plan
- 정확한 canonical model `claude-opus-5`, effort `xhigh`, read-only 재심의 최종
  판정은 **READY**, blocking P0/P1 0건이다. 초기 ITERATE의 P0 2·P1 10과
  2차 잔여 P1 2건은 `CHECKLIST.md` Planning gate에 해소 근거를 남겼다.
- 아래 `Ask planning state`와 `30개 pilot 실행 구조`가 교육 범위와 완료 기준에
  관한 최신 결정이다. 뒤쪽의 2026-07-30 P0–P3 계획은 이미 구축된 안전·구조
  기반과 역사적 근거로 유지하되, 새 작업의 범위·순서는 이 상위 계획을 따른다.
- 2026-07-30 기반에는 Kiro CLI `claude-opus-5` 검토와 대안 제안을 반영했다.
- 새 30개 pilot은 `CHECKLIST.md`의 R1부터 순서대로 진행하며 각 GO 조건을 통과하기
  전에는 다음 의존 단계를 시작하지 않는다.
- 현재 상세 실행 정본은 `PROMPT.md`와 `CHECKLIST.md`다. 과거
  `IMPLEMENTATION_PROMPT.md`와 `prompts/`는 이미 끝난 기반 작업의 기록이다.
- 이전 계획과 단일 대형 프롬프트는 `*_SUPERSEDED_2026-07-29.md`로 보존하되 구현 기준으로 사용하지 않는다.
- Legacy의 하드코딩 방지 규칙 1–12, support-state 순서, core baseline 동결,
  create-only·명시 승인·fail-closed 불변조건은 계속 유효하다. Legacy의 W2–W5
  실행 순서와 132개 테스트 상한은 이 wave에서 대체된다. 현재 test budget은
  회귀 방지 **하한**이며 새 계획은 test file 증가와 distinct failure branch를 제한한다.

## Ask planning state — 2026-08-08

### Confirmed Decisions

- 제품 목표는 영역별 대표 활동 몇 개를 만드는 데 그치지 않는다.
- 2022 개정 교육과정에 맞춘 초등 1–6학년 수학 학습지를 전반적으로 생성할 수
  있는 저작 시스템을 구현한다.
- 대상 학년은 초등 1–6학년 전체다.
- 교육 범위와 진척도는 2022 개정 교육과정의 공식 네 영역인 `수와 연산`,
  `변화와 관계`, `도형과 측정`, `자료와 가능성`으로 점검한다.
- MathCanvas를 그림판처럼 쓰지 않고, 가능한 한 수학 내용에 알맞은 네이티브
  요소로 학생의 수학적 판단과 확인 과정을 표현한다.
- 각 활동은 예상 또는 선택, 수학적 확인, 근거 설명, 수정 경로를 가져야 한다.
- 첫 콘텐츠 wave는
  `/Users/yubyeongju/Downloads/claude-all-30-ppt-content.md`의 30개 수업 원고를
  대상으로 한다.
- 30개 원고는 수업 아이디어와 교사에게 보일 콘텐츠 초점의 원천이다. 권한은
  두 축으로 분리한다. `standardAuthority`는 교육부 고시 제2022-33호 [별책 8]
  수학과 교육과정이며 학년군 성취기준·수학 용어를 관할한다. `unitAuthority`는
  검토 시점을 고정한 비상교육 2022 개정 교재 목차이며 학년·학기·단원을
  관할한다. 원고와 다르면 각 필드를 해당 authority에 맞게 교정한다.
- 교사에게는 30개 콘텐츠 초점을 모두 선택 가능한 항목으로 보존하되, 내부에서는
  같은 수학적 판단·오개념·네이티브 조작을 공유하는 `ActivityBlueprint` family와
  variation preset으로 재사용한다. family 수를 30개에 맞추거나 임의의 목표 수에
  맞추지 않는다.
- 첫 wave의 학습 유형은 `기본 연습`이다. 단순 계산 반복이 아니라 한두 개의
  조작이 깊은 문제로 기본 개념과 관계를 확인하게 한다.
- 교사 생성 흐름은 `학년 → 학기 → 단원 → 성취기준 → 학습 유형`을 먼저 고르고,
  그 뒤 추가 프롬프트를 입력할 수 있게 한다.
- 핵심 수학 내용에 가장 알맞은 MathCanvas 도구가 아직 제품에서 검증되지 않았다면
  다른 그림으로 대체하기 전에 해당 도구를 조사하고 생성·조작·저장·재열기를
  검증한다.
- 학생 활동은 한 화면·한 페이지에 끝나며 기본은 조작이 깊은 **한 문제**다.
  두 문제는 실제 chrome과 글자 하한을 넣은 세로 예산 계산이 가능하다고 증명된
  layout family에서만 선택적으로 허용한다.
- 금지하는 드래그는 화면 이동을 위한 pan과 탐색용 스크롤이다. 한 화면의
  `taskEnvelope` 안에서 학생이 수학 상태를 바꾸는 네이티브 drag·회전·선택은
  핵심 조작으로 허용한다.
- 화면 글자는 작게 압축하지 않는다. 제목·지시문·보기·라벨의 실제 글리프 정렬과
  상하좌우 여백을 실제 MathCanvas 캡처로 확인한다.
- 시각 방향은 **네이티브 workbench 중심 배치**와 **큰 교과서형 글자·넓은 여백**을
  결합한다. 고정 상자를 먼저 만든 뒤 요소를 축소해 넣지 않고, 네이티브 도구의
  검증된 `reserveBox`를 먼저 확보한 뒤 한 문제·두 문제 전용 배치 중 하나를 고른다.
- 첫 wave의 필수 학습 유형은 `기본 연습` 한 가지다. 장기 구조는 다른 학습 유형을
  추가할 수 있어야 하지만, 이번 wave에서 빈 선택지나 가짜 결과를 노출하지 않는다.
- 장기적인 “초등 1–6학년 전체 지원”의 최소 완료 단위는 공식 초등 수학
  성취기준마다 적어도 하나의 `released` 기본 연습 경로가 있고, 교과서 단원
  mapping을 통해 선택·생성·저장할 수 있는 상태다. 30개 pilot 완료와 이 장기
  완료율은 분리해 보고한다.

### Assumptions

- “전체적으로 생성 가능”은 단순 문항 텍스트 생성이 아니라, 교육과정에 결속된
  활동 선택·문항 변형·네이티브 조작·시각 배치·MathCanvas 저장까지 포함하는
  것으로 해석한다.
- 추가 프롬프트는 raw payload나 무제한 자유 배치를 허용하지 않고, 선택된
  성취기준·학습 유형·released 도구·검증된 variation 범위 안에서만 결과를 바꾼다.
- 30개 원고는 교사에게 보이는 30개 콘텐츠 선택지로 유지할 수 있지만, 구현은
  같은 수학적 결정과 네이티브 affordance를 공유하는 재사용 activity family와
  variation으로 묶는다.
- 첫 wave의 단원 탐색은 현재 검증된 비상교육 단원 mapping을 사용한다. 공식
  성취기준은 출판사 중립 정본으로 두고, 다른 출판사 단원 mapping은 같은 경계에
  나중에 추가한다.
- 공개 교육과정·비상교육 목차 검토에는 read-only 웹/PDF 접근을 허용한다.
  MathCanvas의 사용자 Chrome 금지와 별개이며, 원문 전체를 저장소에 재배포하지 않는다.
- `official-text-verified`는 구현 agent가 pin된 공식 PDF의 정확한 코드·문구·locator를
  대조하고 **구현 세션과 다른 별도 read-only reviewer session/model**의 검토가
  일치했을 때만 선언한다. 두 actor ID를 기록한다. 접근 불가·모호함이 남으면
  `official-source-checked` 이하로 두고 종속 entry를 `blocked`로 유지한다.
- 표준 학생 화면 release profile은 실제 MathCanvas 편집 화면 `1280×800 CSS px`다.
  이보다 작은 화면을 자동 축소로 지원한다고 주장하지 않는다.
- 추가 프롬프트는 필수 다섯 선택을 대체하지 않는다. 수 범위·맥락·난이도처럼
  catalog entry가 허용한 modifier만 반영하고, 지원하지 않는 요청은 이유와 함께
  fail-closed한다.

### First-wave corpus audit

- 30개 모두 초등 3학년이며 1학기 15개, 2학기 15개다.
- 2022 개정 교육과정 네 영역의 작업 분류로 보면 `수와 연산` 21개,
  `도형과 측정` 7개, `자료와 가능성` 2개, `변화와 관계` 0개다.
- 따라서 이 wave는 3학년 기본 연습 pilot이며, 초등 1–6학년 네 영역 전체
  완료율과 별도로 진척도를 관리한다.
- `02–03`, `04–05`, `08–09`, `10–11`, `12–13`, `14–15` 등은 같은 핵심
  관계를 공유한다. 30개의 독립 core 구현으로 복제하지 않고 수학적 결정,
  오개념, 네이티브 조작이 실제로 다를 때만 별도 activity family로 분리한다.
- 원고의 11개 PPT 단계 전체를 한 화면에 축소하지 않는다. 한 화면 활동은
  오개념 기반 예상, 네이티브 확인, 근거 설명과 수정, 필요하면 평행한 두 번째
  기본 문제만 남기는 방향을 우선 검토한다.

### Open Questions

- 차후 다른 출판사 단원 mapping을 어떤 순서로 추가할지는 30개 pilot 결과 뒤에
  정한다. 이번 wave를 막는 질문은 아니다.
- `기본 연습` 다음에 추가할 학습 유형의 우선순위는 장기 coverage 단계에서 정한다.
  이번 wave에서는 빈 scaffold를 교사 UI에 노출하지 않는다.

### Non-Goals

- 네이티브 요소를 장식 목적으로 억지로 넣지 않는다.
- 서로 다른 수치 seed를 서로 다른 교육과정 활동으로 부풀려 세지 않는다.
- 자동채점, 단계 강제, 즉시 피드백 등 MathCanvas가 보장하지 않는 동작을
  지원한다고 주장하지 않는다.
- 30개 원고를 11단계 PPT 그대로 한 화면에 축소하거나, 작은 글자와 긴 스크롤로
  모두 보이게 하지 않는다.
- 30개 pilot 완료를 초등 1–6학년 네 영역 전체 완료로 계산하지 않는다.

## 30개 pilot 실행 구조 — 2026-08-08

### 완료율을 두 개로 분리한다

| 지표 | 100%의 뜻 |
|---|---|
| `pilotCoverage` | 30개 콘텐츠 중 authority 결속과 교사 선택·생성·실제 화면 evidence를 모두 가진 `released` entry의 비율이다. 선수학습 복습 entry도 올바른 cross-band 분류가 있으면 분자에 포함된다. |
| `curriculumCoverage` | 공식 초등 수학 성취기준 각각에 적어도 하나의 `released` 기본 연습 경로가 있다. |

`pilotCoverage`가 100%여도 30개가 모두 3학년이고 `변화와 관계`가 0개이므로
`curriculumCoverage`를 100%로 보고하지 않는다. coverage 분모와 미지원 사유는
기계적으로 계산하며 수동 백분율을 문서에 써 넣지 않는다.

### 위험 ledger

| 위험 | 심각도 | 방지 계약과 GO 조건 |
|---|---:|---|
| PPT 내용과 authority 불일치 | P0 | standard binding은 교육부 locator, grade/semester/unit binding은 비상교육 locator를 각각 가져야 하며 불일치는 교정하거나 `blocked`로 둔다. |
| 30개 제목만큼 core 코드 복제 | P1 | `catalog entry → blueprint family → variation preset`을 분리하고 compiler·resolver·validator의 activity ID 분기를 금지한다. |
| 자유 프롬프트가 교육과정·지원 상태 우회 | P0 | 구조화 선택을 authority로 두고 prompt는 허용된 modifier만 만든다. raw payload·좌표·미지원 도구 요청은 거부한다. |
| 네이티브 도구 미검증 또는 그림 fallback | P0 | 필요한 수학 affordance별 후보를 조사하고 생성·조작·undo/reset·save/reopen 계약을 통과한 도구만 사용한다. 실패하면 종속 entry만 `blocked`로 둔다. |
| 네이티브 요소가 기존 상자에서 넘침 | P0 | 도구의 `reserveBox`와 선택 chrome을 먼저 계산한 뒤 전용 layout profile을 선택한다. 한 문제 전환 전 글자 축소·임의 좌표 이동을 금지한다. |
| 기본 연습이 정답 그림 또는 단순 드래그로 끝남 | P0 | 초기 상태를 미해결로 두고 오개념 기반 예상→네이티브 확인→설명→수정이 모두 있어야 한다. |
| 화면 pan·스크롤이 핵심 풀이에 필요 | P0 | 모든 핵심 조작과 쓰기 영역이 1280×800의 보이는 `taskEnvelope` 안에 있어야 한다. |
| live canary 비용·승인과 stale evidence | P1 | released entry마다 실제 MathCanvas save/reopen 화면을 한 번 확보하고, 그중 `(affordanceFamily × layoutProfile)`별 위험 최대 대표가 full lifecycle을 겸한다. 최초 write 전 exact candidate manifest와 `POST ≤1, PUT ≤candidateWriteCount(최대 30)` 예산을 승인받고 초과 시 중단한다. fingerprint 또는 family partition이 바뀌면 종속 evidence를 stale 처리한다. |
| 교사 UI가 30개 긴 목록으로 복잡해짐 | P1 | 학년→학기→단원→성취기준→학습 유형으로 먼저 좁히고, 같은 조건에 여러 entry가 있을 때만 활동 초점을 보여 준다. |
| 학생 정보가 prompt/payload에 포함 | P0 | 개인식별정보를 받지 않고 ‘우리 반 상황’은 500자 이하의 비식별 수업 맥락만 허용한다. |
| 활동별 테스트 복제로 suite 폭증 | P1 | family 불변조건·공통 contract test를 재사용하고 30 entry는 table-driven compile/coverage 검증으로 묶는다. |
| pilot 글자 하한이 기존 released 활동을 stale 처리 | P1 | 새 하한은 `student-one-screen-large-v1` profile parameter에만 결속한다. 기존 `student-screen-quality.ts` default와 audit `TYPE_SCALE`을 전역 상향하지 않는다. |

### Risk change log

- `대표 활동 몇 개` → `초등 1–6학년 전체를 향한 3학년 30개 pilot` (addresses: 목표 불일치)
- `PPT 원고를 그대로 구현` → `PPT는 아이디어 원천, 교육부 standardAuthority와 비상교육 unitAuthority를 분리` (addresses: 교육과정·단원 오결속)
- `30개 제목 = 30개 core 구현` → `30개 catalog entry + 재사용 blueprint family/variation` (addresses: 복제와 확장 비용)
- `11단계 PPT를 축소 배치` → `한 화면의 예상→네이티브 확인→설명→수정` (addresses: 가독성·인지 과부하)
- `드래그 금지` → `화면 pan/scroll 금지, taskEnvelope 안 수학 조작 허용` (addresses: 상호작용 모순)
- `도구 미지원 시 그림 대체` → `affordance probe와 support 승격, 실패 시 종속 activity 차단` (addresses: MathCanvas 장점 상실)
- `고정 상자에 요소 삽입` → `네이티브 reserveBox 우선, 한 문제 기본과 산술로 증명된 경우만 두 문제` (addresses: 겹침·축소)
- `자유 prompt가 활동 선택` → `필수 구조화 선택 + bounded modifier` (addresses: 안전·정확성 우회)
- `맞을 때까지 축소` → `큰 글자 하한 유지, 한 문제 fallback, 그래도 안 맞으면 fail-closed` (addresses: 작은 글자·겹침)

### 아키텍처 백본

#### 핵심 데이터 모델

| 모델 | 기존 seam과 책임 |
|---|---|
| `CurriculumSelection` | 학년·학기·단원·성취기준·학습 유형의 구조화 선택. 교사 요청의 authority다. |
| `CurriculumAuthorityBinding` | `standardAuthority`의 성취기준 locator와 `unitAuthority`의 학년·학기·단원 locator를 별도 provenance로 보존한다. lower-band 복습은 `prerequisiteStandardCodes`와 `crossBandReview`로 분리한다. |
| `CurriculumActivityCatalogEntry` | 30개 교사 표시 항목의 ID·원고 provenance·두 authority 결속·`blueprintFamilyId`·preset ID·`affordanceFamilyId`·release 상태를 연결한다. `packages/curriculum`이 소유한다. |
| `LearningPhaseContract` | `prediction → mathematical-confirmation → explanation → revision`의 닫힌 어휘와 layout region·constraint·tool role을 결속한다. |
| `ActivityBlueprint` | 같은 수학적 판단과 네 phase 구성을 공유하는 재사용 `blueprintFamily`다. entry별 텍스트나 좌표를 넣지 않는다. |
| `VariationPreset` / `ItemGenerator` | entry별 유한 변형과 seed 기반 문항을 만든다. 정답 목록이나 손 좌표를 저장하지 않는다. |
| `NativeAffordanceRequirement` | `affordanceFamily`별로 학생이 바꿔야 할 수학 관계와 후보 tool key, semantic-state projection, lifecycle와 공간 계약을 기술한다. |
| `OneScreenLayoutProfile` | `layoutFamily`가 쓰는 release viewport, pin된 font metrics, profile-scoped CSS 글자 하한, 영역 예산, native reserve를 기술한다. 두 문제 지원은 사전 세로 예산이 증명한 profile에만 있다. |
| `WorksheetPlanV2` | `catalogEntryId`, 세 family/version, preset/version, layout profile/version, seed, curriculum binding, 적용·거부 modifier를 담는 strict planner 산출물이다. legacy `Recommendation.manipulation`을 합성하지 않는다. |
| `WorksheetEntryReleaseState` | V2 entry의 `release-candidate`, `released`, `blocked`를 구분한다. candidate는 교사 UI 비노출이며 승인 contract-lab에서만 compile/write 가능하다. |
| `WorksheetReleaseEvidence` | curriculum/catalog/blueprint/generator/layout/tool/font/harness hash와 실제 canary를 결속하며 lifecycle key는 `(affordanceFamilyId, toolContractVersion, layoutProfileId)`다. |

세 가지 family는 혼용하지 않는다.

- `blueprintFamily`: 학습 결정·네 phase·closed constraint·generator 구조
- `affordanceFamily`: MathCanvas에서 바뀌는 수학 상태와 가장 구체적인 native 도구 계약
- `layoutFamily`: native reserve와 phase region을 한 화면에 합성하는 공간 문법

새 경로는 별도 `WorksheetRequestV2`로 구조화 선택·catalog entry·학습 유형을 전달한다.
기존 strict `GenerationRequest`와 prompt-regex 경로는 현재 released 활동의
compatibility-only V1으로 유지하고 신규 값으로 확장하지 않는다. planner는 V2를 먼저
exact-resolve하며 기존 문자열 `prompt`는 V2에서 선택적 modifier 입력일 뿐 교육과정이나
blueprint의 source of truth가 아니다. V1은 기존 활동이 V2로 이관될 때 명시적으로 만료한다.
V2 planner는 strict `WorksheetPlanV2`를 반환하고 templates의 별도
`prepareWorksheetV2(plan)` 진입점이 이를 소비한다. authoring-runtime은 request schema로
V1과 V2를 분기하되 V2도 기존 draft hash·approval·resolve·compile 안전 경계를 사용한다.
legacy `Recommendation`과 `prepareRegisteredActivity`의 manipulation 대조는 V1 전용이다.

#### 모듈 seam과 계약

1. `packages/curriculum`: 교육부 성취기준, 출판사별 단원 mapping, 30개 catalog entry,
   coverage 계산을 소유한다.
2. `packages/contracts`: 구조화 요청, catalog entry, affordance, one-screen profile,
   release evidence schema와 fail-closed 검증을 소유한다.
3. `packages/planner`: 검증된 선택을 정확한 catalog entry에 결속하고 optional prompt를
   허용 modifier로만 해석해 `WorksheetPlanV2`를 반환한다. 활동 ID별 regex 분기를 늘리지 않는다.
4. `packages/templates`: 재사용 `ActivityBlueprint`, variation preset, `ItemGenerator`와
   V2 전용 `prepareWorksheetV2`를 소유한다. legacy manipulation을 합성하지 않는다.
5. `packages/mathcanvas-compiler`: 도구 adapter와 결정적 layout resolver를 통해서만
   절대 좌표를 만든다. activity 제목·원고 번호를 알지 못한다.
6. `apps/teacher-ui`: 필수 다섯 선택, 조건부 활동 초점, optional prompt, 한/두 문제
   미리보기와 명시적 생성 승인을 제공한다.
7. `scripts/contract-lab`와 품질 harness: affordance probe, 공간·수명주기 계약,
   30개 합성 화면, 실제 캡처와 fingerprint를 검증한다.
8. `packages/authoring-runtime`: R2에서 V2 plan→prepare→draft/approval→resolve/compile
   분기를 실제로 연결한다. public path는 released entry만 허용한다.

R2에서 planner/curriculum/templates/runtime의 generic V2 resolver를 catalog data와
분리된 core seam으로 만들고 architecture checker의 측정 대상에 넣는다. R2/R3의
baseline 대상 변경은 wave 종료 때 이유를 CHECKLIST에 기록하고 interim rebaseline할 수
있다. R4에서 `LearningPhaseContract`·layout·font-metrics vocabulary를 확정한 뒤 최종
검토 baseline을 만든다.
R5–R8에서 core 변경이 필요하면 조용히 baseline을 다시 쓰지 않고 R2/R4로 돌아가
구조 근거와 Opus 재검토를 받은 뒤 재동결한다.

#### 상태와 데이터 흐름

```text
교사 구조화 선택
  → curriculum catalog의 정확한 entry
  → native support preflight
  → blueprint family + variation preset + seeded item
  → one-screen profile 선택
  → compiler/resolver
  → 정적·교육·시각 gate
  → preview와 명시적 승인
  → background create-only MathCanvas canary/활동
```

source of truth는 공식 교육과정 fixture, curriculum catalog, blueprint/variation registry,
support/evidence manifest다. `PLAN.md`는 결정, `CHECKLIST.md`는 진행 상태의 단일 기록이다.

`persistedMathematicalStateHash`는 raw payload 전체나 단순 x/y 이동을 해시하지 않는다.
각 affordance adapter가 닫힌 semantic-state projection을 제공하고, viewport/selection/
전체 평행이동을 정규화한 뒤 group membership·상대관계·각·분할·단위·graph key처럼
학습 목표에 필요한 상태만 해시한다. 관련 수학 관계가 바뀌지 않은 단순 이동은 같은
hash를 내야 한다.

released phase predicate는 다음 다섯 조건을 모두 만족해야 한다.

1. 네 `LearningPhaseContract`가 정확한 순서로 모두 존재한다.
2. prediction은 초기 미충족 decision constraint와 오개념 기반 surplus를 가진다.
3. mathematical-confirmation은 semantic native role을 사용하고 core manipulation 뒤
   `persistedMathematicalStateHash`가 바뀐다.
4. explanation은 실제 CSS 높이 44px 이상의 쓰기 영역을 가진다.
5. revision은 confirmation 뒤 학생이 처음 응답 또는 설명을 고칠 수 있는 도달 가능한
   region을 가진다. MathCanvas가 순서를 강제한다고 주장하지는 않는다.

#### Core와 scaffold

- `[core]` 30개 entry의 공식 결속, 필요한 native affordance 계약, 재사용 family,
  한 화면 큰 글자 배치, 구조화 교사 흐름, bounded prompt, 실제 canary와 release gate.
- `[scaffold]` 30개 밖의 초등 1–6학년 성취기준 coverage ledger와 미지원 표시,
  다른 출판사 단원 adapter seam, `기본 연습` 외 학습 유형 seam.
- scaffold는 미지원 상태를 정직하게 표시해야 하며 가짜 activity나 placeholder 결과를
  교사에게 노출하지 않는다.

가장 가까운 확장점은 (1) 다른 학년·성취기준 catalog entry, (2) 개념 형성·진단·적용
학습 유형, (3) 다른 출판사 단원 mapping이다. 모두 core compiler의 activity-ID 분기
없이 기존 catalog/blueprint/adapter 경계에 붙어야 한다.

학년군 밖의 성취기준을 3학년에서 복습하는 entry는 현재 단원의 primary standard로
위장하지 않는다. `crossBandReview`로 표시하고 단원에는 별도 review binding으로
연결하며, 교사 UI에는 `선수 학습 복습`으로 보인다. 이는 `pilotCoverage`에는
포함될 수 있지만 해당 3–4학년군 성취기준의 `curriculumCoverage` 분자에는 포함되지 않는다.

### 한 화면·큰 글자·네이티브 우선 시각 계약

- hard release viewport는 실제 MathCanvas `1280×800 CSS px`다.
- 새 글자 하한은 30개 pilot의 versioned `student-one-screen-large-v1` profile에만
  적용한다. 기존 released blueprint의 전역 `TYPE_SCALE`과 hash는 이번 wave에서
  바꾸지 않는다. 특히 `packages/templates/src/blueprints/student-screen-quality.ts`의
  legacy default 66/45/32/30/28과 `scripts/quality-audit/thresholds.mjs`의 audit
  `TYPE_SCALE`을 전역 상향하지 않는다. 새 값은 profile parameter로만 주입한다.
  이는 같은 스키마의 명시적 layout profile이지 묵시적 이중 스키마가 아니다.
- 실제 캡처 기준 목표는 제목 38–42px, 질문·핵심 지시 28–32px, 보기·수학 라벨
  24–28px, 보조 학습자 문구 22–24px이다. 배치는 font fingerprint에 결속된 pin된
  offline metrics table로 결정하고, 실제 glyph/line box 측정은 배치 입력이 아니라
  R8 release ratchet으로만 사용한다.
- R3에서 MathCanvas text가 DOM/SVG box로 질의 가능한지 먼저 확인한다. 가능하면
  rendered box를 검증에 쓰고, 불가능하면 pixel bounding box 또는 conservative
  font-metrics 예측과 Sol 육안 점검을 함께 사용한다. 어떤 경우에도 live browser
  측정값을 resolver 입력으로 사용하지 않는다.
- 두 줄 문장 상자는 line-height 1.35 이상, 상하 18px·좌우 20px 이상의 실제 여백을
  기본 목표로 한다. 보기 내용은 상자의 수평·수직 중앙에 있어야 한다.
- 위에서 아래로 `제목/목표 → 예상 → native workbench → 설명/수정`의 읽기 순서를
  유지한다. workbench는 남는 학생 화면의 가장 큰 영역을 차지한다.
- native 요소의 initial·selected·core-manipulated·undo/reset·save/reopen 상태에서
  `chromeBox`, `reserveBox`, label, 다음 블록의 교차가 0이어야 한다.
- 실제 editor chrome과 위 글자·공간 하한을 넣은 세로 예산을 먼저 계산한다.
  한 문제 profile은 필수다. 두 문제가 수치상 가능하다는 증거가 있을 때만 두 문제
  profile과 관련 테스트를 구현한다. 불가능하면 두 문제는 unsupported이며, 한 문제도
  맞지 않으면 임의 축소 없이 생성 실패다.
- 실제 시각 판정은 배경 canary 캡처를 Sol xhigh가 점검하며 P0/P1이 0이어야 한다.

### release와 live write 종결 상태

- `release-candidate`는 두 authority, blueprint/preset, offline phase·수학·공간·품질
  gate가 통과했지만 실제 save/reopen evidence가 아직 없는 V2 entry 상태다. public
  planner와 교사 UI에는 노출되지 않으며 `supported/released`로 계산하지 않는다.
- candidate actual canary는 public planner를 우회하되 안전 검증을 우회하지 않는다.
  `scripts/contract-lab`만 exact approval manifest와 candidate hash를 확인한 뒤
  `WorksheetPlanV2 → prepareWorksheetV2 → resolve → compile → validators` 경로를 직접
  호출할 수 있다. teacher preview/approval token을 발급하지 않는다.
- actual lifecycle과 모든 release gate가 통과한 뒤에만 catalog/support evidence를
  `released`로 승격한다. 그 뒤 public planner의 released-only 노출과 teacher preview를
  통과해야 한다. 실패하면 candidate 또는 blocked로 남는다.
- `actual entry screen`은 로컬 mock이 아니라 compiler 결과를 승인된 disposable
  MathCanvas canary에 save하고 fresh reopen한 실제 editor 캡처다.
- R3/R4 뒤 첫 live write 전에 release-candidate entry와 lifecycle 대표를 고정한
  `LiveCanaryBudget` manifest를 만들고 사용자에게 한 번 명시 승인받는다. hard ceiling은
  disposable project가 없을 때 `POST ≤1`, 전체 wave `PUT ≤candidateWriteCount`이며
  candidate는 최대 30개다. `candidateWriteCount`는 entry 수가 아니라 manifest에
  선언된 실제 PUT operation 총수이며 최초 manifest에서는 candidate당 정확히 1 PUT이다.
  family 최소·최대 variation은 offline/isolated로 전수 검증하고, 그중 실제 공간·조작
  위험이 가장 큰 entry의 PUT이 full lifecycle 대표를 겸한다.
- manifest는 exact entry ID·hash·예상 POST/PUT/GET 수를 가진다. 범위나 hash가 바뀌거나
  추가 write가 필요하면 즉시 중단하고 새 승인을 받는다. legacy의 건별 POST 1·PUT 1
  승인은 이 manifest 범위 안에서만 pilot 일괄 승인으로 대체된다.
- 최초 승인 ceiling은 재수집을 포함하지 않는다. R5/R8 canary 뒤 hash가 바뀌어 stale
  캡처를 다시 만들어야 하면 기존 manifest를 종료하고, 이미 사용한 write 수와 정확한
  재수집 entry를 밝힌 별도 manifest로 새 사용자 승인을 받아야 한다.
- 모든 entry가 `released`면 `pilot complete 30/30`이다. 일부 tool NO-GO가 남아도
  나머지 entry를 partial release하고 wave 실행 자체는 닫을 수 있다. 이때는
  `released N/30, blocked 30-N`만 주장하고 pilot 완료나 장기 curriculum coverage
  기여를 blocked entry에 대해 주장하지 않는다. blocked entry는 교사 UI 기본 선택에서
  숨기고, 관리/coverage 화면에서만 사유와 다음 조사 비용을 보여 준다.

### 실행 순서와 중간 GO 조건

1. **R1 — 30개 curriculum/affordance ledger `[core]`**: 30/30을 교육부
   standardAuthority와 비상교육 unitAuthority, cross-band review 여부, 핵심 결정,
   대표 오개념, native affordance, 세 family 후보에 결속한다.
   미검증 결속이 하나라도 있으면 다음 release로 넘기지 않는다.
2. **R2 — 구조화 catalog/request/coverage 계약 `[core]`**: 30개 entry와
   `WorksheetRequestV2 → WorksheetPlanV2 → prepareWorksheetV2`와 runtime draft/approval
   분기를 만들고, V1 manipulation/ACTIVITY_IDS를 확장하지 않으며 prompt가 선택을
   우회하지 못하게 한다.
3. **R3 — native affordance 조사·조건부 계약 `[core]`**: 필요한
   affordanceFamily별로 read-only 후보 조사와 spatial/semantic 조건부 GO/NO-GO를
   수행한다. 신규 live write는 하지 않으며 새 도구는 최대 `contracted`로 둔다.
   실제 save/reopen 승격은 R5/R8의 승인된 첫 released entry PUT 안에서 한다.
   도구가 막히면 종속 entry만 `blocked`로 기록하고 다른 family는 진행한다.
   semantic-state projection과 text box 관측 가능성도 여기서 검증하고
   기존 actual evidence에서 editor chrome·content width·`canvasUnitsToCssPx`를
   유도한 뒤 affordanceFamily partition을 freeze한다.
4. **R4 — one-screen layout/typography resolver `[core]`**: native reserve 우선의
   한 문제 profile, 세로 예산이 증명된 경우에만 두 문제 profile, profile-scoped
   큰 글자, pin된 font metrics, `LearningPhaseContract`, 중앙 정렬,
   wrap/clearance, no-scroll gate를 구현하고 generic core baseline을 최종 동결한다.
5. **R5 — 대표 vertical slice `[core]`**: 수와 연산의 discrete model,
   도형·측정, 자료·가능성에서 서로 다른 native/layout family를 먼저 완결해
   구조가 한 표현에 과적합하지 않았는지 offline candidate preview로 확인한다.
   vocabulary와 hash를 freeze한 뒤에만 승인된 네 actual canary를 실행한다.
6. **R6 — 30개 family/variation 완성 `[core]`**: 관계가 같은 원고를 묶어 구현하고
   R4의 닫힌 `LearningPhaseContract`에 데이터를 결속해 예상→확인→설명→수정과
   미해결 초기 상태를 기계 검증한다. affordanceFamily를 바꿔야 하면 R3로 돌아간다.
7. **R7 — 교사 생성 흐름 `[core]`**: 학년→학기→단원→성취기준→학습 유형,
   조건부 활동 초점, optional prompt, preview/approval을 실제 catalog에 연결한다.
8. **R8 — evidence와 release `[core]`**: 30/30 정적 terminal state,
   `(affordanceFamily × layoutProfile)`별 offline 최소·최대와 live 위험 최대 lifecycle, released entry별
   current-hash 실제 save/reopen 화면, 승인 write budget, Sol xhigh 시각 점검과
   최종 회귀를 통과한다. full 또는 정직한 partial release로 종결한다.
9. **R9 — 장기 coverage scaffold `[scaffold]`**: 1–6학년 네 영역의 지원·미지원
   현황을 계산해 표시하되 30개 밖 활동을 지원한다고 주장하지 않는다.

각 의미 있는 wave는 관련 테스트와 background canary, Claude Opus 5 논리·구조 점검,
Sol xhigh 시각 점검에서 차단 이슈가 없을 때만 `main`에 커밋·푸시한다. 사용자의
Chrome·현재 화면·포커스를 사용하지 않는다.

새 테스트 예산은 구현 시작 시 현재 test/test-file 수를 기록하고 회귀 하한을
유지한다. R1–R9 전체의 신규 test file은 원칙적으로 12개 이하, production seam당
1개 이하로 하며, 30 entry와 variation은 table-driven case로 기존 suite에 넣는다.
각 경계는 happy path 1개와 서로 다른 fail-closed 원인에 필요한 실패 case만 둔다.
새 native adapter가 정말 별도 계약을 가져 12개를 넘겨야 하면 체크리스트에 근거를
쓰고 Opus 5 검토를 받은 뒤 예산을 바꾼다. 총 test case 수에는 상한을 두지 않는다.

## Legacy foundation reference — 2026-07-30

> 아래 0–10절은 현재 저장소 기반이 만들어진 이유와 불변조건을 보존하는 역사적
> reference다. 새 30개 pilot의 범위·순서·완료 판정은 위 2026-08-08 계획과
> `PROMPT.md`·`CHECKLIST.md`가 우선한다.

### 0. 당시 Kiro Opus 5 실행 loop

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

당시 테스트 예산은 W2c 반영 후 실측 121개와 P1 종료 132개 상한이었다.
이 수치는 역사 기록이며 2026-08-08 pilot에는 적용하지 않는다.
한 경계에는 정상 1개와 필요한 실패 1개까지만 두며, 같은 validator의 변조 조합을
계속 늘리지 않는다. 신규 dependency, workspace package, 도구별 테스트는 만들지 않는다.

최종 산출물은 동일 개념·학년의 실제 인터랙티브 활동 3~5편과 비교한다. 수학 정확성,
목표 적합성, 학생 조작, 즉시 피드백, 탐구 다양성, 가독성, 교사 수정성,
템플릿 의존도, 저장 안정성, 수업 가치를 각 10점으로 평가한다. P2 최소 목표는
80점(모든 항목 6점 이상), 배포 목표는 85점(모든 항목 7점 이상)이다.

### 1. 목표와 기준선

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

### 2. 확인된 결정

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

### 3. 아키텍처 백본

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

### 4. 하드코딩 방지 규칙

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

### 5. 초기 모듈 경계

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

### 6. 구현 단계

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

### 7. 조사 운영 원칙

- 전체 팔레트는 P0에서 얕게 파악하고, 깊은 lifecycle 분석은 P1–P3 wave별로 수행한다.
- 깊은 probe가 프로젝트를 필요로 하면 `AI-CONTRACT-PROBE-*`로 새 프로젝트만 만든다.
- 사용자 계정의 기존 프로젝트를 수정하거나 삭제하지 않는다.
- 로그인은 사용자가 직접 수행하며 비밀번호·쿠키·토큰을 기록하지 않는다.
- 조사 원본과 sanitization 결과를 분리한다.
- 변경이 감지되면 해당 도구의 support state만 내리고 다른 도구 생성을 전역 차단하지 않는다.

### 8. 주요 위험과 대응

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

### 9. 비목표

- MathCanvas 자체 UI를 복제하거나 대체하지 않는다.
- 브라우저에서 임의 JavaScript를 실행하는 범용 MCP를 만들지 않는다.
- 기존 프로젝트 편집·삭제를 지원하지 않는다.
- 검증되지 않은 도구를 “지원됨”으로 표시하지 않는다.
- T3 자유 조립을 외부 제품 기능으로 출시하지 않는다.
- 외부 Python 구현을 포팅하지 않는다.
- P0에서 모든 도구의 전체 lifecycle을 끝내지 않는다.

### 10. 단계별 실행 문서

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
