# MathCanvas 3학년 기본 연습 30개 pilot 구현 프롬프트

먼저 `PLAN.md`의 2026-08-08 confirmed plan을 읽고, `CHECKLIST.md`를 R1부터 순서대로 진행하며 상태와 evidence를 그 파일에서만 갱신한다.

## 역할과 목표

당신은 MathCanvas 저작 엔진, 초등 수학 교육과정, 학생용 인터랙션, 실제 화면 품질을 함께 책임지는 수석 TypeScript 엔지니어이자 학습 설계자다.

첫 목표는 `/Users/yubyeongju/Downloads/claude-all-30-ppt-content.md`의 30개 수업 아이디어를 2022 개정 교육과정에 정확히 결속하고, 교사가 선택해 실제 MathCanvas 활동으로 만들 수 있는 3학년 `기본 연습` pilot을 완성하는 것이다.

단, 30개 정적 학습지를 복제하는 것이 아니다. MathCanvas의 가장 구체적인 네이티브 수학 요소를 학생의 핵심 확인 도구로 사용하고, 같은 수학적 판단과 phase 구조는 재사용 `blueprintFamily`와 variation으로 묶는다. 모든 활동은 한 화면에서 학생이 예상하고, 네이티브 요소로 확인하고, 근거를 설명하고, 처음 생각을 수정할 수 있어야 한다.

## 배경

- 저장소: `/Users/yubyeongju/Documents/mathcanvas-ai/mathcanvas-ai-authoring`
- 구현 시작 기준선: `main == origin/main == e58060e101b01261b2e22f191245ddebe04e5ed6`
- 기존 기반: TypeScript 모노레포, 구조화 curriculum catalog, `ActivityBlueprint`, seed 기반 `ItemGenerator`, deterministic layout resolver, closed tool adapters, create-only 승인 흐름, background contract lab, native spatial contract/evidence, 시각·품질 audit.
- 현재 교사 UI는 학년·학기·단원·성취기준·활동·학생 어려움·문항 수를 고르고 내부에서 문자열 prompt를 조합한다.
- 현재 planner는 구조화 필드도 사용하지만 많은 prompt regex와 manipulation 분기로 template을 고른다. 새 30개 경로에서는 구조화 catalog 선택이 authority여야 한다.
- 교육부 고시 제2022-33호 [별책 8]은 학년군 성취기준을 정하지만 출판사 교과서의 학년·학기·단원 번호를 정하지 않는다. 현재 `teacher-catalog.ts`도 official standard와 비상교육 unit을 별도 모델로 가진다.
- 현재 30개 원고는 모두 3학년이고 1학기 15개, 2학기 15개다. 작업 분류는 `수와 연산` 21개, `도형과 측정` 7개, `자료와 가능성` 2개, `변화와 관계` 0개다.
- 30개는 초등 1–6학년 전체 완성이 아니라 첫 pilot이다. 장기 구조는 네 영역 전체로 확장되어야 하지만 unsupported 범위를 지원한다고 주장하지 않는다.
- `mathcanvas-learning-design`의 native-before-layout, 예상→확인→설명→수정, 교실 한국어, spatial contract, lifecycle canary 규칙을 비타협 기준으로 사용한다.

## 대상 사용자

- 학습자: 한국어를 사용하는 초등 3학년 학생. 교실 노트북 수준의 화면에서 한 페이지 활동을 수행한다.
- 교사: 학년→학기→단원→성취기준→학습 유형을 고르고, 필요하면 수업 맥락을 짧게 덧붙인 뒤 결과를 확인·승인한다.
- 유지보수자: 교육과정 결속, blueprintFamily·affordanceFamily·layoutFamily, 실제 캡처와 release evidence를 검토한다.

## 플랫폼과 환경

- 기존 workspace package와 create-only·명시 승인·fail-closed 경계를 유지한다.
- 제품 런타임에 Python 경로나 범용 브라우저 자동화를 추가하지 않는다.
- 실제 MathCanvas 검증은 인증된 전용 background/headless 프로필과 기존 contract-lab 경로만 사용한다.
- 사용자의 Chrome, 일반 Chrome 프로필, 현재 화면, 포커스, 임의 CDP endpoint를 사용하지 않는다.
- hard 학생 화면 profile은 실제 MathCanvas `1280×800 CSS px`다.
- 외부 write는 기존 disposable canary 프로젝트와 승인된 save 경계만 사용한다. 기존 사용자 프로젝트를 수정·삭제하지 않는다.
- 테스트는 변경 위험에 비례해 실행한다. 관련 package test와 table-driven audit를 먼저 돌리고, offline gate 통과 뒤에만 background canary를 실행한다.
- 공식 교육과정과 비상교육 목차 확인에는 공개 URL/PDF에 대한 read-only web 접근을 허용한다. 이는 MathCanvas 자동화와 분리하며 사용자의 Chrome을 열지 않는다.
- `standardAuthority`는 `교육부 고시 제2022-33호 [별책 8] 수학과 교육과정`, URL `https://ncic.re.kr/inv/org/download.do?year=2022&seq=10003559&orgType=ogi4`다.
- `unitAuthority`는 `packages/curriculum/src/teacher-catalog.ts`의 `textbookSources`가 가리키는 비상교육 2022 개정 학기별 교재 정보 페이지다. 3학년은 `https://book.visang.com/books/info/5435`와 `https://book.visang.com/books/info/5734`다.

## 이번 버전의 범위

- 30개 원고의 교육부 standardAuthority·비상교육 unitAuthority 분리 결속과 provenance ledger
- 교사에게 보이는 30개 catalog entry와 내부 재사용 blueprintFamily/variation 분리
- `기본 연습` 학습 유형과 구조화 생성 요청
- catalog authority를 우회하지 못하는 bounded optional prompt
- 30개에 필요한 MathCanvas native affordance 조사·계약·지원 승격
- 네이티브 요소의 실제 공간을 먼저 확보하는 one-screen layout profile
- 큰 글자, 충분한 상하좌우 여백, 보기의 수평·수직 중앙 정렬
- 기본 한 문제, 세로 예산으로 가능성이 증명된 경우에만 두 문제인 깊은 예상→확인→설명→수정 활동
- 필수 다섯 선택을 따르는 교사 UI와 기존 preview/approval/create 흐름
- 30개 정적 compile coverage, `(affordanceFamily × layoutProfile)` lifecycle, released entry별 actual MathCanvas save/reopen 화면
- 장기 초등 1–6학년 coverage를 과장 없이 확장할 수 있는 catalog seam과 미지원 표시

## 비목표

- PPT의 11개 수업 단계를 한 화면에 모두 축소하는 것
- 30개 제목마다 compiler·resolver·validator·adapter를 복제하는 것
- 네이티브 요소를 장식으로 넣거나 미검증 도구를 그림 대용으로 사용하는 것
- 활동별 절대 좌표, per-item nudge, raw MathCanvas payload passthrough
- 글자를 줄여 두 문제를 억지로 맞추거나 풀이에 canvas pan/scroll을 요구하는 것
- MathCanvas가 보장하지 않는 자동채점·단계 강제·즉시 정오 피드백
- `기본 연습` 외 학습 유형의 빈 UI 또는 placeholder 활동
- 30개 pilot 완료를 초등 1–6학년 전체 완료로 표시하는 것
- 모든 출판사의 단원 체계를 이번 wave에서 구현하는 것
- 학생 이름·학급·개인 성취 데이터 수집

## 핵심 교사 흐름

1. 교사가 학년을 고른다.
2. 선택한 학년의 학기를 고른다.
3. 해당 학기·출판사 mapping의 단원을 고른다.
4. 단원에 실제 결속된 성취기준을 고른다.
5. released 결과가 있는 학습 유형을 확인한다. 첫 wave에서는 `기본 연습` 한 장을 preselected confirmation card로 보여 주고 빈 다른 유형은 노출하지 않는다.
6. 같은 조건에 여러 30개 entry가 있을 때만 `활동 초점`을 고른다. 전역 30개 긴 목록은 만들지 않는다.
7. 필요하면 500자 이하의 비식별 추가 prompt를 입력한다. 허용되지 않은 변경은 적용하지 않고 이유를 알려 준다.
8. 시스템은 기본 한 문제로 preview를 만든다. R4의 실제 세로 예산이 가능하다고 증명한 layout에서만 두 문제를 자동 선택할 수 있다.
9. 교사가 학습 목표, 활동 흐름, MathCanvas 결과를 확인하고 명시적으로 승인한다.
10. 시스템은 새 MathCanvas 활동만 만들고 기존 활동은 바꾸지 않는다.

## 핵심 학생 흐름

모든 30개 entry는 한 화면 안에서 다음 학습 사건을 가진다.

1. `예상`: 대표 오개념을 포함한 선택지나 구성 중 하나를 고른다. 초기 상태는 미해결이다.
2. `수학적 확인`: 내용에 가장 알맞은 released 네이티브 요소를 조작해 핵심 불변량이나 관계를 확인한다.
3. `설명`: 무엇을 움직이거나 비교했고 왜 그런지 학생 말로 적는다.
4. `수정`: 처음 선택과 확인 결과가 다르면 답이나 설명을 고칠 수 있다.

완성된 정답 그림, 정답이 잠긴 text, 의미 없는 단순 drag는 이 흐름을 충족하지 않는다.

## 기능 요구사항

### R1. 30개 curriculum·affordance ledger `[core]`

30개 원고 각각에 stable source ID, 제목, 원고 위치, 교육부 성취기준 binding, 비상교육 학년·학기·단원 binding, 영역, 핵심 수학적 결정, 대표 오개념, 확인할 불변량, 필요한 native affordance, blueprintFamily·affordanceFamily·layoutFamily 후보를 기록한다.

PPT는 auxiliary source다. `standardAuthority`는 성취기준·수학 용어만, `unitAuthority`는 학년·학기·교과서 단원만 관할한다. 원고의 단원 번호와 비상교육 목차가 다르면 unitAuthority에 맞게 교정한다. 두 locator를 한 `official` provenance로 합치지 않는다.

공식 원문 검토는 다음 절차로 한다.

1. 위 NCIC 공식 PDF를 read-only로 열고 source version·조회 시점·content fingerprint를 pin한다.
2. 필요한 standard code·정확한 문구·PDF 쪽·영역·소주제와 비상교육 unit title·number를 각 authority에서 대조한다.
3. 구현 agent의 추출 결과를 **구현 세션과 다른 별도 read-only reviewer session/model**이 같은 standard/unit locator와 비교한다. 동일 세션 자가검토는 두 번째 검토로 세지 않는다.
4. 둘이 일치할 때 reviewer actor·reviewedAt과 함께 `official-text-verified`를 선언한다.
5. URL/PDF 접근이 불가능하거나 문구·locator가 모호하면 `official-source-checked` 이하로 두고 종속 entry를 `blocked`로 유지한다. 사용자의 추측이나 auxiliary source만으로 승격하지 않는다.

3학년 단원에서 하위 학년군 성취기준을 복습하는 경우 현재 단원의 primary standard로 위장하지 않는다. `prerequisiteStandardCodes`와 `crossBandReview`를 사용하고 교사에게 `선수 학습 복습`으로 표시한다. 이 entry는 올바른 분류와 release evidence가 있으면 `pilotCoverage`에는 포함되지만 3–4학년군 `curriculumCoverage` 분자에는 포함되지 않는다.

30개 제목은 유지하되 같은 핵심 결정과 phase 구조를 공유하는 항목을 blueprintFamily 후보로 묶는다. 세 family 개수는 30이나 사전 목표 수에 맞추지 않는다.

각 entry에는 원고 11단계 중 한 화면에 남긴 학습 사건과 의도적으로 제외한 단계를 기록한다.

### R2. 구조화 catalog·request·coverage `[core]`

기존 curriculum seam을 확장해 `CurriculumSelection`, `CurriculumAuthorityBinding`, `CurriculumActivityCatalogEntry`, `learningType`, `catalogEntryId`, `blueprintFamilyId`, `variationPresetId`, `affordanceFamilyId`, `availability`를 검증한다.

새 경로에는 별도 strict `WorksheetRequestV2`를 만든다. `catalogEntryId`, 구조화 selection, optional context/modifier text, seed를 전달하고 `manipulation`은 받지 않는다. 기존 `GenerationRequest` V1과 regex path는 현재 released 활동의 compatibility-only 경로로 그대로 두며 신규 30개 manipulation 문자열이나 `ACTIVITY_IDS`를 추가하지 않는다. planner는 V2 schema를 먼저 exact-resolve하고, V1만 기존 regex chain으로 보낸다. V1은 기존 활동의 V2 migration 전까지 새 기능 없이 유지하며 장기 만료 대상임을 표시한다.

V2 planner는 strict `WorksheetPlanV2`를 반환한다. 필드는 최소 `requestId`, `catalogEntryId`, `blueprintFamilyId/version`, `variationPresetId/version`, `affordanceFamilyId/version`, `layoutProfileId/version`, `seed`, authority/curriculum binding, 적용 modifier, 거부 modifier와 이유다. V2는 legacy `Recommendation`이나 `manipulation`을 합성하지 않는다.

R2가 이 plan을 소비하는 templates의 별도 `prepareWorksheetV2(plan)` 진입점과 authoring-runtime의 V2 draft/hash/approval/resolve/compile 분기까지 소유한다. V1은 기존 `recommendActivity → prepareRegisteredActivity`와 manipulation 대조를 유지한다. V2는 `planWorksheetV2 → prepareWorksheetV2 → resolveActivity → compileActivity`로 내려가되 동일한 draft hash·승인·validator 안전 경계를 사용한다. R2에서는 generic transport fixture로 seam을 검증하고, R4 종료 때 실제 layout profile·LearningPhaseContract fixture로 end-to-end 통과시킨 뒤 R5를 시작한다.

교사 UI에서 전달한 구조화 선택이 planner의 source of truth다. optional prompt는 선택된 entry가 선언한 수 범위·난이도·맥락 등 유한 modifier만 만들 수 있다. standard, grade, 세 family binding, tool support, raw payload, 좌표를 바꿀 수 없다.

`pilotCoverage`와 장기 `curriculumCoverage`를 분리한다. 30개 밖의 미지원 성취기준은 명시적으로 unsupported로 남긴다.

현재 `assertTeacherTextbookCatalog`의 고정 `92` 개수 불변조건은 authority dataset에서 계산한 기대 집합과 unmapped set 비교로 바꾼다. cross-band review는 단원 `standardCodes`에 거짓 primary code를 넣지 않고 별도 review binding으로 검증한다.

### R3. native affordance 조사와 조건부 계약 `[core]`

R1에서 나온 `affordanceFamily`마다 현재 released 도구가 가장 구체적인 수학 상태를 표현하는지 먼저 확인한다. 적합한 released 도구가 없을 때만 MathCanvas 팔레트 후보를 조사한다. R3 종료 때 affordanceFamily partition을 freeze하며 R6에서 바꾸려면 R3로 되돌아온다.

후보는 이름이 아니라 학생이 바꾸는 수학 상태로 평가한다. R3에서는 existing evidence와 read-only/isolated probe로 initial, selected, core-manipulated, undo/reset, semantic state 변화, intrinsic box, selection chrome, bounded movement envelope를 확인해 conditional GO/NO-GO를 낸다. 신규 live write는 하지 않으며 새 도구는 최대 `contracted`다. 실제 save/fresh reopen은 R5 또는 R8의 승인된 첫 released entry PUT 안에서 검증해 `verified/released`로 승격한다.

각 adapter는 raw payload hash 대신 닫힌 `semanticStateProjection`을 제공한다. viewport·selection·전체 평행이동을 정규화하고 group membership, 상대관계, 각, 분할, 단위, graph key처럼 목표에 필요한 상태만 해시한다. 관련 관계가 바뀌지 않은 단순 이동은 같은 hash이고, 핵심 조작은 다른 hash여야 한다.

layout을 만들기 전에 MathCanvas text가 DOM/SVG box로 질의 가능한지 read-only로 probe한다. 가능하면 실제 box는 release 검증에만 쓰고, 불가능하면 pixel bounding box 또는 font fingerprint에 결속된 conservative metrics table을 만든다. 어느 경우에도 live glyph 측정값을 resolver의 배치 입력으로 사용하지 않는다.

기존 current actual evidence에서 1280×800 editor chrome 높이, visible content width, zoom mode와 `canvasUnitsToCssPx`를 유도해 R4 세로 예산 입력으로 pin한다.

`captured → contracted → verified → released`를 건너뛰지 않는다. conditional GO를 release로 주장하지 않는다. 도구가 NO-GO면 점·선·그림으로 조용히 대체하지 않고 종속 entry만 `blocked`로 둔다. 다른 독립 affordanceFamily는 계속 진행한다.

### R4. one-screen layout·typography resolver `[core]`

기존 상자 크기를 먼저 정하지 않는다. native spatial contract의 `reserveBox`, `chromeBox`, 최소 조작 크기, label clearance를 먼저 계산한 뒤 versioned `student-one-screen-large-v1` `OneScreenLayoutProfile`을 고른다. 이 글자 하한은 30개 pilot profile에만 적용한다. `packages/templates/src/blueprints/student-screen-quality.ts`의 legacy default 66/45/32/30/28과 `scripts/quality-audit/thresholds.mjs`의 audit `TYPE_SCALE`을 전역 상향하지 않는다. 새 하한은 explicit profile parameter로만 주입해 기존 released blueprint hash를 바꾸지 않는다.

hard viewport 1280×800에서 제목 38–42px, 질문·핵심 지시 28–32px, 보기·수학 라벨 24–28px, 보조 학습자 문구 22–24px을 목표로 한다. 학습자 고정 문구는 22px 아래로 내리지 않는다. 두 줄 문장은 line-height 1.35 이상과 상하 18px·좌우 20px 목표 여백을 가진다.

배치 입력은 R3에서 pin한 font fingerprint와 conservative offline metrics table만 사용한다. 보기 문구는 그 결정적 metrics로 수평·수직 중앙에 배치한다. 실제 glyph/line box는 R8에서 결과를 검증하는 ratchet이지 resolver 입력이 아니다. 자동 wrap, title/line clearance, native selected/manipulated bounds, 쓰기 영역을 함께 검사한다.

먼저 실제 editor chrome 높이와 위 하한을 넣어 한 문제·두 문제의 세로 예산을 수치로 계산하고 evidence에 기록한다. 한 문제 profile은 필수다. 두 문제가 가능한 수치가 나올 때만 두 문제 profile과 관련 test를 구현한다. 불가능하면 두 문제는 unsupported로 남기고 한 문제만 사용한다. 한 문제도 맞지 않으면 축소·스크롤·per-item nudge 없이 fail-closed한다.

R4에서 `ActivityBlueprint`의 닫힌 `LearningPhaseContract` schema와 generic released predicate를 정의하고 architecture baseline에 포함한다. R6는 이 schema에 30개 데이터를 결속할 뿐 vocabulary를 추가하지 않는다.

R2/R3에서 baseline 대상 core를 변경하면 wave 종료 때 이유를 CHECKLIST에 기록하고 interim rebaseline할 수 있다. R4가 generic V2 request/phase/layout/font-metrics seam을 완성하면 최종 `pnpm architecture:baseline`을 검토해 동결한다. 이후 core 변경이 필요하면 R2/R4로 돌아가 근거와 Opus 검토를 받은 뒤 재동결한다.

### R5. 대표 vertical slice `[core]`

30개 전체 전에 적어도 다음 네 표현 계열을 실제로 완결한다.

- PPT 02 `같은 묶음은 곱셈으로`: discrete group/array
- PPT 10 `분수의 첫 조건, 똑같이`: equal partition/part-whole
- PPT 23 `원의 중심과 반지름 찾기`: geometry native workbench
- PPT 01 `그림 하나에 숨은 수`: picture graph/data interpretation

먼저 네 slice를 offline `WorksheetPlanV2 → prepareWorksheetV2 → resolve → compile → validators → candidate approval artifact`로 완주한다. 이때 상태는 `release-candidate`이며 교사 UI와 public released planner에는 노출하지 않는다. 네 표현을 함께 본 뒤 vocabulary를 고칠 필요가 있으면 live write 전에 R2/R4로 돌아가 수정·재동결하고 candidate hash를 다시 고정한다.

`release-candidate`는 두 authority, blueprint/preset, phase·수학·공간·품질 offline gate가 통과했지만 actual save/reopen evidence가 아직 없는 V2 entry다. public planner를 우회하되 compiler/validator를 우회하지 않는 `scripts/contract-lab` 전용 경로만, exact approval manifest 안에서 candidate plan을 직접 compile/write할 수 있다. teacher preview/approval token은 발급하지 않는다.

hash freeze와 승인 뒤 실제 canary를 통과하면 tool/entry를 released로 승격하고, 그때 public V2 planner→authoring-runtime→teacher preview 경로까지 확인한다. 이 네 slice 때문에 core에 활동 ID 분기가 생기면 다음 30개 구현 전에 vocabulary 또는 seam을 고친다.

실제 R5 canary 전에 exact 네 entry ID·hash·write count를 가진 승인 manifest를 만들고 사용자에게 승인받는다. 예상 budget은 disposable project가 없을 때 `POST ≤1`, `PUT = 4`다. 이 네 PUT은 전체 wave hard ceiling `PUT ≤30`에 포함된다.

live 뒤 코드/hash 수정으로 R5 캡처가 stale되면 원래 ceiling으로 자동 재수집하지 않는다. 기존 manifest를 종료하고 이미 사용한 write 수와 재수집할 exact entry를 적은 새 manifest로 사용자 승인을 다시 받는다.

### R6. 30개 blueprintFamily·variation 완성 `[core]`

R1의 근거로 `blueprintFamily`, `affordanceFamily`, `layoutFamily`를 구분해 30개 entry를 모두 연결한다. 기존 released blueprint가 학습 결정과 native affordance를 충족하면 재사용·일반화하고, 충족하지 않을 때만 새 blueprintFamily를 추가한다. R3에서 freeze한 affordanceFamily를 바꿔야 하면 R3로 되돌아가 evidence를 stale 처리한다.

R4에서 정의·동결한 `LearningPhaseContract`에 `prediction`, `mathematical-confirmation`, `explanation`, `revision` 데이터를 layout region·constraint·tool role로 결속한다. released predicate는 다음을 모두 요구한다: 네 phase가 순서대로 존재, prediction에 초기 미충족 decision constraint와 오개념 surplus, confirmation의 native 조작 뒤 semantic-state hash 변화, explanation에 실제 CSS 높이 44px 이상의 쓰기 영역, confirmation 뒤 도달 가능한 revision region.

각 entry는 기본 한 문제, R4가 증명한 layout에서만 두 문제를 사용한다. 문제 수만 다른 복제, 정답 노출, decorative native, raw 이동만 바꾸는 의미 없는 카드 drag를 거부한다.

blueprintFamily별 최소·대표·최대 variation을 생성하고 수학 불변조건, 보기의 오개념 타당성, 같은 전체/단위, 단위 변환, 몫·나머지, 그래프 key 등 해당 family의 의미 조건을 item generator 또는 closed constraint로 검증한다. validator에 entry ID 분기를 만들지 않는다.

### R7. 교사 생성 UI·preview·approval `[core]`

현재 teacher UI를 필수 다섯 결정 중심으로 바꾸고 실제 30개 catalog에 연결한다. 학습 유형이 하나뿐일 때는 `기본 연습`을 preselected confirmation card로 보여 주며 가짜 빈 선택지는 만들지 않는다. 기존 `학생이 어려워하는 지점`은 이번 경로의 필수 축에서 제거하거나 catalog의 오개념 preset으로 흡수한다. 4·6문항 선택은 30개 경로에 노출하지 않는다.

선택지가 없거나 verified-only/blocked인 조합은 생성 가능한 것처럼 보이지 않게 하고, 이유와 다음 행동을 교사 말로 안내한다. optional prompt가 적용한 modifier와 적용하지 못한 요청을 preview에서 알 수 있어야 한다.

기존 로그인 상태, session, approval token, content hash, create-only confirmation을 유지한다. 교사 UI 자체도 작은 글자·치우친 보기·과밀한 카드 없이 keyboard와 screen reader로 탐색 가능해야 한다.

### R8. 실제 evidence·독립 검토·release `[core]`

30/30 entry를 table-driven으로 resolve해 `release-candidate`, released compiled artifact 또는 근거가 있는 `blocked` state로 시작하고, R8 종료 때 released/blocked terminal state로 닫는다. 각 released entry마다 current hash에 결속된 actual entry screen을 하나 확보하고, 그중 `(affordanceFamily × layoutProfile)`별 위험 최대 entry가 full lifecycle 대표를 겸한다. family 최소·최대 variation은 offline/isolated로 전수 검증한다. actual entry screen은 로컬 mock이 아니라 compiler 결과를 승인된 disposable MathCanvas canary에 save하고 fresh reopen한 실제 editor 캡처다.

candidate write는 R5와 같은 contract-lab 전용 `WorksheetPlanV2 → prepareWorksheetV2 → resolve → compile → validators` 경로만 사용한다. public planner/UI의 released-only gate는 우회하거나 완화하지 않는다. actual lifecycle과 모든 release gate를 통과한 뒤에만 catalog entry와 tool support를 released로 승격하고, 이후 public V2 planner와 teacher preview/approval을 검증한다.

실제 캡처는 background에서만 만들며 initial, selected, core-manipulated, undo/reset, reopened 상태에서 겹침·잘림·정렬·글자 크기·교실 용어·정답 노출을 검사한다. tool/font/layout fingerprint 또는 affordanceFamily partition이 바뀌면 종속 evidence를 stale 처리한다.

R8 live write 전에 R5에서 이미 사용한 4건을 제외한 exact release-candidate entry ID·hash와 write count를 manifest로 만들고 다시 사용자 승인을 받는다. `candidateWriteCount`는 entry 수가 아니라 manifest에 선언된 PUT operation 총수이며 최초 manifest는 candidate당 정확히 1 PUT이다. 전체 wave hard ceiling은 disposable project 생성 `POST ≤1`, `PUT ≤candidateWriteCount`이고 최대 30이다. full lifecycle 대표는 이 PUT 안에서 수집한다. manifest를 벗어난 write, hash 변경, 추가 project가 필요하면 실행 전에 중단하고 새 승인을 받는다.

R5/R8 write 뒤 stale 재수집은 최초 ceiling에 포함된 것으로 간주하지 않는다. 기존 manifest를 종료하고 이미 사용한 write와 exact 재수집 범위를 보고한 뒤 별도 사용자 승인을 받아야 한다.

시각 점검은 Sol xhigh가 수행한다. 최종 release 조건은 visual audit 100, quality audit 100, P0/P1 0, Sol xhigh P0/P1/P2 0, 관련 테스트와 `pnpm check` 통과다. Claude Opus 5의 논리·확장성 검토에서 차단 지적이 있으면 같은 wave 안에서 수정·재검증한다.

모두 released면 `pilot complete 30/30`이다. blocked가 남으면 R8 실행은 partial release로 complete할 수 있지만 `released N/30`만 주장한다. blocked entry는 교사 기본 선택에서 숨기고 관리/coverage 화면에 이유와 다음 조사 비용을 남기며 pilot 완료나 그 entry의 curriculum coverage 기여를 주장하지 않는다.

각 의미 있는 완결 wave만 관련 변경을 `main`에 커밋·push한다. 사용자 변경을 섞지 않고, push 뒤 `main == origin/main`을 확인한다.

### R9. 장기 coverage scaffold `[scaffold]`

초등 1–6학년 네 영역의 공식 standard index와 활동 지원 상태를 연결할 수 있는 real seam을 둔다. 현재 빠진 1–2학년군 index가 이 seam의 명시적 후속 범위다. `분모 코드 수가 존재`와 `공식 문구·locator까지 검증 완료`를 별도 상태로 둔다. 첫 wave에서 완전한 공식 분모를 검증하지 못하면 `curriculumCoverage`를 숫자로 추정하지 말고 `unavailable`과 필요한 다음 작업을 표시한다.

다른 출판사 단원 mapping, `기본 연습` 밖의 학습 유형, 다른 학년 entry가 기존 curriculum/catalog/blueprint 경계에 데이터로 붙을 수 있어야 한다. placeholder 활동이나 가짜 released 상태는 허용하지 않는다.

## 콘텐츠와 데이터 요구사항

- 30개 source ID는 `ppt-01`부터 `ppt-30`까지 안정적이고 제목 변경과 분리한다.
- source provenance는 파일 경로·제목·원고 locator·검토 hash를 가진다. PPT 원문 전체를 제품 payload에 복사하지 않는다.
- curriculum binding은 standardAuthority source ID·PDF locator·version/fingerprint와 unitAuthority source URL·unit locator·version/fingerprint를 별도로 가지고 reviewer actor와 reviewedAt을 기록한다.
- catalog entry는 teacher label, instructional grade, semester, unit mapping, primary standard code, prerequisite codes/crossBandReview, domain, learning type, blueprintFamily ID/version, variation preset ID/version, affordanceFamily ID, layoutFamily ID, availability, blocking reason을 가진다.
- blueprintFamily와 preset의 content hash, generator version, layout profile, tool/spatial contract fingerprint가 release evidence에 결속된다.
- 같은 blueprintFamily를 쓰는 entry도 서로 다른 핵심 결정을 가르치면 별도 preset 또는 blueprintFamily로 나눌 근거가 있어야 한다.
- variation은 seed로 재현 가능하고 허용 범위 밖 수치·단위·문맥을 만들지 않는다.

## 시각·UX 방향

- 스타일은 native workbench가 중심인 밝은 교과서형 화면이다.
- 색은 높은 대비의 navy/blue를 기본으로 하고 green은 확인·수정, orange는 제한된 주의 신호에만 사용한다.
- 위에서 아래로 제목/목표 → 예상 → native workbench → 설명/수정 순서를 유지한다.
- workbench가 학생 화면에서 가장 큰 영역을 차지한다. 설명 상자나 장식 카드가 native 수학 요소보다 커지지 않는다.
- 제목은 이전보다 분명히 크고, 최상단 문장 카드와 보기에는 충분한 상하 여백이 있다.
- 보기 1·2·3과 문장들은 상자의 왼쪽 아래가 아니라 수평·수직 중앙에 놓인다.
- rounded card, 테두리, 배경색은 학습 단계 구분에 필요한 만큼만 사용한다.
- 선택 handle, 도구 local UI, 조작 뒤 커진 group, 라벨, 다음 단계가 실제 캡처에서 겹치지 않아야 한다.
- 학생이 화면을 pan/scroll하지 않아도 핵심 문제와 쓰기 영역을 볼 수 있어야 한다. 수학 조작용 drag는 보이는 taskEnvelope 안에서 허용한다.

## 아키텍처 백본

### 데이터 모델

- `CurriculumSelection`: 필수 다섯 선택의 immutable authority.
- `CurriculumAuthorityBinding`: 교육부 standardAuthority와 비상교육 unitAuthority의 분리 provenance, primary/prerequisite/cross-band relation.
- `CurriculumActivityCatalogEntry`: 30개 teacher-facing 항목과 authority/blueprintFamily/preset/affordanceFamily/layoutFamily/release 상태의 binding.
- `LearningPhaseContract`: prediction / mathematical-confirmation / explanation / revision의 닫힌 순서와 layout region·constraint·tool role binding.
- 기존 `ActivityBlueprint`: 재사용 수학 활동 blueprintFamily.
- 기존 variation registry와 `ItemGenerator`: entry별 유한 preset과 재현 가능한 문항.
- `NativeAffordanceRequirement`: affordanceFamily별 semantic-state projection과 tool/spatial lifecycle 요구.
- `OneScreenLayoutProfile`: layoutFamily별 viewport·pin된 font metrics·profile-scoped typography·reserve·세로 예산 계약.
- `WorksheetRequestV2`: catalogEntryId와 structured selection을 authority로 삼는 신규 strict request. legacy V1 manipulation/prompt enum을 확장하지 않는다.
- `WorksheetPlanV2`: catalogEntry/family/preset/layout/seed/authority binding과 적용·거부 modifier를 담는 strict planner output. legacy Recommendation/manipulation을 사용하지 않는다.
- `WorksheetEntryReleaseState`: `release-candidate`(교사 비노출·manifest-bound contract-lab only), `released`, `blocked`의 V2 entry state.
- `WorksheetReleaseEvidence`: 모든 입력·구조·도구·렌더 fingerprint와 `(affordanceFamily × layoutProfile)` canary binding.

`blueprintFamily`, `affordanceFamily`, `layoutFamily`는 서로 다른 partition이며 명칭을 혼용하지 않는다.

### 모듈 seam

- `packages/curriculum`: standardAuthority truth, unitAuthority mapping, cross-band relation, 30 catalog, coverage.
- `packages/contracts`: request/catalog/affordance/layout/evidence schema.
- `packages/planner`: exact catalog resolution과 bounded modifier. regex prompt routing은 새 경로의 authority가 아니다.
- `packages/templates`: blueprintFamily, variation, generator. source title별 core switch 금지.
- `packages/mathcanvas-compiler`: generic adapter와 layout resolver. entry ID를 모른다.
- `packages/authoring-runtime`: R2에서 V2 plan→prepareWorksheetV2→draft/hash/approval→resolve/compile 분기를 연결하고 V1 manipulation 경로와 분리한다.
- `apps/teacher-ui`: structured selection, conditional focus, optional prompt, preview/approval.
- `scripts/contract-lab`와 audit: native probe, actual MathCanvas lifecycle, capture/evidence.

R2에서 planner/curriculum/templates/authoring-runtime의 generic V2 resolver를 catalog data와 분리된 core seam으로 만들고 architecture checker가 측정하게 한다. R2/R3의 measured core 변경은 CHECKLIST 근거를 남긴 interim rebaseline을 허용하고, R4에서 phase/layout/font metrics까지 최종 동결한다. R5–R8은 `architecture:verify`만 사용한다. core를 바꿔야 하면 R2/R4로 되돌아가 이유와 Opus 재검토 후 baseline을 갱신한다.

### 상태와 source of truth

두 authority fixture와 catalog, blueprint/variation registry, support manifest, release evidence가 제품 정본이다. `PLAN.md`는 결정, `CHECKLIST.md`는 진행 상태의 유일한 기록이다. 별도 progress 문서를 만들지 않는다.

### 확장점

- 다른 학년·성취기준의 catalog entry
- 개념 형성·오개념 진단·적용 학습 유형
- 다른 출판사의 unit mapping adapter

이 확장 때문에 compiler·resolver·validator에 activity ID 분기가 생기면 구조 실패다.

## 기술 제약

- blueprint에 `x`, `y`, `width`, `height`, answer key, raw payload, inline function을 넣지 않는다.
- 절대 좌표는 resolved IR 이후 generic layout resolver만 만든다.
- 새 30개 경로는 `WorksheetRequestV2.catalogEntryId`를 exact-resolve하며 planner가 prompt regex만으로 standard, 세 family binding, tool을 선택하지 않는다.
- legacy `manipulationSchema`, `ACTIVITY_IDS`, `GenerationRequest` V1에는 30개용 신규 값을 추가하지 않는다.
- legacy `Recommendation.manipulation`과 `prepareRegisteredActivity`는 V1 전용이다. V2는 `WorksheetPlanV2`와 `prepareWorksheetV2`를 사용한다.
- public planner와 teacher UI는 released V2 entry만 노출한다. release-candidate는 contract-lab exact manifest 경로에서만 compiler/validator를 통과해 canary write할 수 있다.
- native tool support state를 건너뛰지 않는다. fingerprint stale와 roundtrip drift는 fail-closed한다.
- 신규 package, dependency, 범용 solver는 실제로 기존 seam으로 표현할 수 없다는 근거와 사용자 승인 없이는 추가하지 않는다.
- 기존 released 활동과 안전 경계를 깨지 않는다. migration이 필요하면 명시적 schema/version과 만료 규칙을 둔다.
- 구현 시작 시 현재 test case와 test-file 수를 기록하고 회귀 하한을 유지한다. Legacy의 132개 상한은 폐기되었고 현재 budget script는 하한이다.
- R1–R9 전체 신규 test file은 원칙적으로 12개 이하, production seam당 1개 이하로 한다. 30 entry와 variation은 table-driven case로 기존 suite에 넣는다.
- 각 경계는 happy path 1개와 서로 다른 fail-closed branch에 필요한 실패 case만 둔다. 새 native adapter의 독립 계약 때문에 12개를 넘겨야 하면 근거를 CHECKLIST에 쓰고 Opus 검토를 받은 뒤 예산을 바꾼다. 총 test case 수에는 상한을 두지 않는다.
- 사용자 작업 트리의 관련 없는 변경을 덮어쓰거나 commit하지 않는다.

## 개인정보와 안전

- 학생 이름, 학번, 학급, 개별 성취 정보, 인증 토큰, 쿠키, 계정 ID를 prompt·payload·fixture·evidence에 넣지 않는다.
- 교사 context는 500자 이하 비식별 수업 맥락만 허용하고 저장·로그 범위를 최소화한다.
- 실제 MathCanvas 작업은 새 프로젝트 생성 전용과 명시 승인 규칙을 유지한다.
- canary evidence는 sanitize하고 인증 정보가 없는지 검증한다.
- 사용자의 화면·Chrome·포커스를 빼앗지 않는다.

## 전체 acceptance criteria

- 30개 원고가 30/30 authority-reviewed catalog terminal state로 존재한다. full pilot 완료를 주장하려면 blocked가 0이어야 하고, blocked가 남은 실행은 `released N/30` partial release로만 종결한다.
- 30개 teacher-facing entry와 내부 blueprint family 수가 분리되고, source ID별 core compiler/resolver/validator 분기가 0이다.
- 교사 흐름이 학년→학기→단원→성취기준→학습 유형→조건부 활동 초점→optional prompt 순서로 작동한다.
- optional prompt가 curriculum, 세 family binding, support state, raw payload, 좌표를 우회하지 못한다.
- 모든 released entry가 닫힌 phase predicate로 예상→네이티브 확인→설명→수정, 미해결 초기 상태, semantic-state change, 44px 이상 쓰기 영역을 증명한다.
- 모든 released entry가 한 화면의 기본 한 문제로 끝나고 핵심 풀이에 pan/scroll이 필요 없다. 두 문제는 R4 세로 예산이 가능하다고 증명한 profile에서만 허용된다.
- 실제 1280×800 캡처에서 글자 하한, 중앙 정렬, 문장 여백, native chrome/label clearance를 통과한다.
- 모든 released `(affordanceFamily × layoutProfile)`가 current lifecycle evidence를 가지고, released entry가 current-hash actual MathCanvas save/reopen 화면을 가진다.
- live write가 승인 manifest와 wave hard ceiling `POST ≤1, PUT ≤candidateWriteCount ≤30` 안에 있다.
- visual audit 100, quality audit 100, P0/P1 0, Sol xhigh P0/P1/P2 0, Claude Opus 5 blocking 0, `pnpm check` 통과다.
- `pilotCoverage`와 `curriculumCoverage`가 분리되고, 30개 완료를 전체 초등 수학 완료로 과장하지 않는다.
- 의미 있는 wave가 `main`에 분리 커밋·push되고 마지막에 `main == origin/main`이다.

## QA 경로

1. 변경 전 git 상태와 repository instructions를 확인한다.
2. R1 ledger와 schema를 table-driven test로 검증한다.
3. 수정 package의 build/test와 curriculum/catalog/blueprint compile을 먼저 실행한다.
4. blueprintFamily별 수학·phase·교실 한국어·variation 불변조건과 affordanceFamily semantic-state 조건을 검사한다.
5. pin된 font metrics 기반 one-screen static layout과 native spatial ratchet을 검사한다.
6. offline gate가 모두 통과한 release-candidate만 exact write manifest와 사용자 승인을 받은 뒤 전용 background canary를 실행한다.
7. 실제 캡처에서 initial/selected/manipulated/undo-reset/reopened를 비교한다.
8. Sol xhigh로 시각 체크리스트 전체를 점검하고 지적을 수정한다.
9. Claude Opus 5로 구조·교육 논리·증거 과장을 읽기 전용 점검한다.
10. 관련 wave의 최종 `pnpm check` 후 diff를 검토하고 commit·push한다.

## Open questions와 assumptions

- 첫 wave의 단원 mapping은 현재 저장소가 검증한 비상교육 흐름을 사용한다. 다른 출판사는 scaffold다.
- 첫 wave learning type은 `기본 연습` 하나다.
- 수학 조작용 drag는 허용하고 화면 탐색용 pan/scroll은 금지한다.
- 세 family partition의 정확한 수는 R1–R3에서 결정한다. 예상 범위나 quota로 구조를 왜곡하지 않는다.
- 1280×800보다 작은 화면은 이번 release 지원 범위가 아니다.
- 완전한 공식 1–6학년 standard denominator를 이번 wave에서 검증하지 못하면 장기 coverage 숫자를 표시하지 않는다.
- native tool NO-GO로 blocked entry가 남으면 성공으로 포장하거나 그림 fallback하지 않고, 영향 범위와 다음 조사 비용을 사용자에게 보고한다.
- 공식 source 접근·두 번째 검토가 실패한 entry는 release하지 않는다.
- R4 산술 gate가 두 문제를 불가능하다고 판정하면 이번 pilot은 한 문제 profile만 구현한다.
