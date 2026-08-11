# 2022 개정 초등 수학 전 범위 생성 계획

상태: Phase 0·1 완료, Phase 2 대표 격자 1/12 pipeline-proven, reviewed target set 2/121, 전체 120개 잔여 queue 자동 산출, 무-family 97개를 24 engine·84 grade-band-safe track·97 work item으로 계획 고정
작성일: 2026-08-11  
최우선 목표: 2022 개정 초등 수학의 모든 공식 성취기준에 대해 교사가 실제로 사용할 수 있는 MathCanvas 수업자료를 생성한다.

이 계획은 `TEACHER_INTENT_PLAN.md`의 3개 사례 확장보다 우선한다. 기존 구현은 버리지 않고 기반으로 재사용하지만, 전체 교육과정 커버리지가 넓어지기 전에는 개별 사례 UI 마감과 TeacherIntent 세부 기능을 추가하지 않는다.

## 0. 전체를 끊지 않고 실행하는 방법

이 문서는 방향과 완료 정의를 고정하고, 실제 다음 작업은
`reports/curriculum-execution/latest.md`가 저장소 상태에서 자동 산출한다. 대표 셀
하나가 끝날 때마다 사용자에게 다음 항목을 묻지 않는다. 다음 명령 하나가 공식
커버리지, ProblemFamily registry, 12개 대표 격자와 121개 전체 queue가 서로
일치하는지 검증한다.

```bash
pnpm curriculum:program
```

전체 프로그램은 다음 여섯 단계다.

| 단계 | 목적 | 현재 |
|---|---|---|
| 0 | 공식 121개 원문·카탈로그 권위 | 완료 121/121 |
| 1 | 공통 ProblemFamily·검증·release 기반 | 완료, canonical 30 / released 21 |
| 2 | 3개 학년군×4개 영역 대표 격자 | 진행 중, 1/12 pipeline-proven |
| 3A | 121개 성취기준의 필수 AssessmentTarget 완전 분해 | 진행 중, 2/121 |
| 3B | 모든 필수 target에 family 연결·offline 검증 | 검토된 6개 중 5개 offline, 전역 분모 미완성 |
| 3C | 현재 해시 live create·저장·재열기 | 검토된 6개 중 2개 live, 전역 분모 미완성 |
| 4 | 모든 released family의 TeacherRequest·반영 표·실제 미리보기 | Phase 2 뒤 병행, 현재 공통 파라미터 4/30 |
| 5 | 문항 단위 수정·패키징·최종 릴리스 | 앞 단계 뒤 착수 |

실행은 두 레인으로 나눈다.

- **offline 제작 레인**: target 분해 → 기존 family 이관 또는 신규 family 구현 →
  정답·해설·오개념·exact preview → 전체 envelope compile·validator → 보고서 갱신.
- **live-evidence 레인**: offline 통과 항목만 canonical writer로 새 프로젝트를
  생성하고 조작·되돌리기·저장·재열기를 현재 해시에 결속한다.

MathCanvas 인증이나 플랫폼 상태 때문에 live 레인이 멈춰도 차단 항목을 queue에
남기고 offline 레인은 다음 성취기준으로 계속 간다. 가능하면 네 영역을 하나씩
포함한 4개 성취기준을 한 배치로 닫고, 배치마다 `pnpm check`·보고서·원자적
`main` 커밋과 push까지 수행한 뒤 다음 배치로 이어진다. Fable CLI는 사용하지
않는다.

## 1. 목표를 한 문장으로 고정

교사가 학년·단원·학습 목표 또는 자연어 요청을 주면, 시스템이 2022 개정 교육과정의 공식 성취기준에 연결된 문제를 만들고, 정답·해설·오개념 대안·MathCanvas payload를 검증한 뒤 새 MathCanvas 프로젝트로 생성해야 한다.

## 2. 확정 결정

### 사용자와 범위

- 운영자와 검수자는 제작자 1명이다. 외부 교사 파일럿은 현재 범위가 아니다.
- 학습자는 대한민국 초등학교 1~6학년 학생이다.
- 교육과정 권위 원본은 교육부 고시 제2022-33호 `[별책 8] 수학과 교육과정`이다.
- 보조 learning map은 고정 commit의 개념·선수 관계·관찰 증거에만 사용하고 공식 성취기준을 대체하지 않는다.
- 교과서 71개 단원은 교사 탐색용 목차다. 제품 커버리지의 공식 분모는 교과서 단원이 아니라 공식 성취기준과 그 성취기준을 분해한 평가 목표다.

### “커버됨”의 정의

성취기준 하나는 다음 조건을 모두 만족해야만 `released`로 계산한다.

1. 공식 원문 코드·문구·학년군·영역·출처 위치가 검증돼 있다.
2. 성취기준이 요구하는 평가 가능한 목표가 빠짐없이 `AssessmentTarget`으로 분해돼 있다.
3. 각 필수 `AssessmentTarget`에 하나 이상의 `ProblemFamily`가 연결돼 있다.
4. 문제 생성기가 선언한 전체 파라미터 경계에서 수학적으로 유효한 문항·정답·해설을 만든다.
5. 최소 하나의 그럴듯한 오개념 또는 잘못된 경로와 구별할 수 있다.
6. 실제 MathCanvas payload로 컴파일되고 생성 전 validator를 통과한다.
7. 사용한 MathCanvas 표현 방식의 저장·재열기 증거가 현재 해시와 결속돼 있다.

단순히 활동 ID가 단원에 연결돼 있거나, 정적인 예시 한 문항이 있거나, 미리보기만 보이는 것은 커버리지로 세지 않는다.

커버리지의 단위는 `AssessmentTarget`이다. 각 필수 target마다 최소 하나의 검증된 ProblemFamily가 있으면 `target-covered`로 계산한다. 한 성취기준에서 만들 수 있는 모든 문제 유형과 모든 파라미터 조합을 지원한다는 뜻은 아니다. 각 성취기준에는 현재 지원 범위를 설명하는 `scopeNote`를 노출하고, 보고서는 `targetCoverage`와 `familyVariety`를 별도 지표로 표시한다.

### 자료 유형

- 모든 성취기준은 최소 하나의 유효한 MathCanvas 수업자료를 생성해야 한다.
- 수학적 조작이 필요한 목표는 released native affordance를 사용한 상호작용 자료로 만든다.
- native affordance가 적합하지 않은 목표는 선택·구성·비교·설명 등 검증 가능한 문제 자료로 만들되, 일반 텍스트 상자만 놓고 “상호작용 활동”이라고 부르지 않는다.
- 자동채점, 단계 강제, 즉시 오답 피드백은 MathCanvas가 실제로 제공할 때만 주장한다.

## 3. 현재 기준선

2026-08-11 Phase 0·1과 현재 Phase 2 대표 셀을 반영한 저장소 실측값이다.

| 지표 | 현재 | 목표 |
|---|---:|---:|
| 공식 성취기준 분모 | 121 | 121 유지(원본 변경 때 명시 갱신) |
| `teacherCurriculumCatalog` 행 | 121 | 공식 원문과 항상 일치 |
| 공식 원문 대조 완료 성취기준 | 121 | 121 |
| 활동이 하나라도 연결된 성취기준 | 24 | 참고 지표 |
| released 활동이 연결된 성취기준 | 18 | 모든 필수 평가 목표가 released인 성취기준 100% |
| canonical ProblemFamily | 30 | 목표 달성에 필요한 수만큼 |
| released 활동 ID | 21 | 목표 달성에 필요한 수만큼 |
| 교과서 단원 수 | 71 | 71 |
| 활동이 하나라도 있는 단원 | 24/71 | 참고 지표 |
| released 활동이 하나라도 있는 단원 | 16/71 | 모든 단원이 최소 하나 이상 + 해당 성취기준 완전 추적 |
| 공통 ProblemParameters 지원 | 4/30 | 모든 released ProblemFamily가 공통 요청 계약 사용 |
| reviewed-complete AssessmentTarget set | 2/121 (target 6개) | 121/121 |
| `[2수02-01]` target coverage | live 2/2 | live 2/2 유지 + family variety 확장 |
| `[2수04-01]` target coverage | offline 3/4 · live 0/4 | live 4/4 |

주의:

- Phase 0 전 catalog 99행과 공식 121개를 대조한 결과, 빠진 22개는 모두 1~2학년군이었다. 현재는 121개 모두 공식 fixture에서 카탈로그로 투영된다.
- `getElementaryCurriculumCoverage()`의 `18/121`은 released 활동 reach다. `[2수02-01]`과 `[2수04-01]` 두 target set만 완성됐으므로 전역 `targetCoverage`는 계속 `unavailable`이다.
- `[2수02-01]`의 live 2/2는 현재 family가 다루는 세 무늬 블록 반복 사례에 대한 target 충족이다. 공식 문구에 있는 물체·수 배열의 모든 변형 또는 가능한 모든 규칙 유형을 지원한다는 뜻은 아니다.
- `familyVariety`는 Phase 1 canonical `FamilyId`를 사용하며 target coverage와 합치지 않는다.
- 현재 16/71은 “released 활동이 하나라도 있음”일 뿐 단원 전체를 만들 수 있다는 뜻이 아니다.
- 공식 source manifest와 121개 레코드는 `packages/curriculum/src/fixtures/kr-2022-elementary-math/official-standards.json`에 있고, 최신 숫자는 `reports/curriculum-coverage/latest.md`에서 확인한다.

현재 단원별 released 연결은 1학년 2/11, 2학년 4/12, 3학년 1/12, 4학년 5/12, 5학년 4/12, 6학년 0/12다.

## 4. 제품 아키텍처

### 핵심 데이터 모델

| 엔터티 | 역할 | 깊이 |
|---|---|---|
| `OfficialStandard` | 공식 코드·문구·학년군·영역·출처 해시 | core |
| `AssessmentTarget` | 한 성취기준을 실제로 평가할 수 있는 원자적 목표로 분해 | core |
| `ProblemFamily` | 같은 수학 구조를 공유하는 문제 생성 규칙 | core |
| `ProblemParameters` | 수, 단위, 맥락, 난이도, 문항 수, 오개념 등 허용 조건 | core |
| `GeneratedItem` | 문제, 정답, 해설, 대안, 수학적 불변량, 관찰 증거 | core |
| `RenderRecipe` | GeneratedItem을 MathCanvas native 객체와 레이아웃으로 변환 | core |
| `CapabilityManifest` | 어떤 목표와 파라미터를 지원·거절하는지 선언 | core |
| `ReleaseEvidence` | offline 전수검사, canary, 저장·재열기, 현재 해시 | core |
| 자연어 파서 | 교사 문장을 구조화 요청으로 번역 | scaffold, 전체 생성 기반 뒤에 구현 |
| 다중 교사 배포·텔레메트리 | 배포 및 사용 데이터 | 현재 제외 |

### 모듈 경계

1. **교육과정 권위 계층**  
   공식 원문 fixture와 `OfficialStandard`만 관리한다. 활동 구현이 공식 문구를 직접 복제하거나 추측하지 않는다.

2. **평가 목표 계층**  
   성취기준을 `AssessmentTarget`으로 분해하고 선수학습·오개념·관찰 증거를 선언한다.

3. **문제 생성 계층**  
   네 영역별 모듈 아래에 `ProblemFamily`를 등록한다.
   - 수와 연산
   - 변화와 관계
   - 도형과 측정
   - 자료와 가능성

4. **MathCanvas 표현 계층**  
   문제 생성과 좌표·도구 선택을 분리한다. 여러 ProblemFamily가 선택, 배열·묶음, 수직선, 측정, 도형 구성, 자료 표현 같은 `RenderRecipe`를 재사용한다.

5. **교사 요청 계층**  
   학년·단원·성취기준·조건을 받아 capability registry에서 ProblemFamily를 고른다. 플래너, MCP, UI는 특정 활동 ID를 `if` 문으로 알지 않는다.

6. **검증·커버리지 계층**  
   공식 분모, 평가 목표, generator, renderer, release evidence를 조인해 하나의 기계 판독 가능한 보고서를 만든다.

### 확장성 인수 기준

새 ProblemFamily를 추가할 때 다음 파일은 수정하지 않아야 한다.

- 공통 플래너 분기
- MCP 도구 스키마의 수동 union
- teacher-ui의 활동별 하드코딩 폼
- 반영/미반영 표 계산 코드
- 공통 template registry의 수동 import 목록
- 공통 generator registry의 수동 import 목록
- `ACTIVITY_IDS`와 `ACTIVITY_SUPPORT`의 수동 record

허용되는 유일한 등록 지점은 영역별 `family index` 한 곳이다. 새 가족은 `family module + manifest + tests + 영역별 index 등록`만으로 나타나야 하며, 더미 가족 인수 테스트로 이를 자동 검증한다. 이 조건을 만족하지 못하면 전 범위 확장을 시작하지 않는다.

### 단일 진실 공급원과 데이터 흐름

```text
OfficialStandard
  -> AssessmentTarget
  -> CapabilityManifest / ProblemFamily
  -> GeneratedItem
  -> RenderRecipe
  -> ActivitySpec + approval hash
  -> compiled MathCanvas payload
  -> validator
  -> 교사 승인
  -> 새 MathCanvas 프로젝트
```

커버리지 보고서는 위 연결을 역으로 추적한다. 어느 고리든 없거나 해시가 오래되면 `released`가 아니다.

## 5. 실행 단계

### Phase 0 — 공식 분모와 진실한 커버리지

상태: **완료(2026-08-11)**. 공식 121개, catalog diff 0건, `pnpm check` 416/416 테스트와 전체 품질 gate 통과. 세부 증거는 `ELEMENTARY_2022_FULL_COVERAGE_CHECKLIST.md`에 기록한다.

목적: “전체”가 몇 개인지 모르는 상태를 먼저 끝낸다.

작업:

1. 교육부 `[별책 8] 수학과 교육과정`의 공식 URL·파일 SHA-256·검토일을 고정한다. 원문 전체는 저장소에 재배포하지 않는다.
2. 초등 `[2수]`, `[4수]`, `[6수]` 성취기준 코드·문구·학년군·영역·원문 위치를 fixture로 추출한다.
3. HWP와 PDF를 독립 추출해 전 항목을 정규화 대조하고 `official-text-verified` 상태를 기록한다. 두 형식의 차이는 자동으로 숨기지 않고 항목별로 어느 원문을 채택했는지 manifest에 남긴다.
4. 공식 fixture와 catalog의 코드·문구·학년군·영역 차이를 자동 보고한다. 최초 대조에서 발견한 22개 누락은 1~2학년군 공식 레코드를 추가해 해소했다.
5. 71개 단원은 official standard에 대한 탐색 인덱스로 다시 연결한다.
6. `pnpm curriculum:coverage`를 추가해 학년군·영역·성취기준·단원별 상태를 출력한다.

완료 기준:

- 공식 원문 성취기준 누락·중복 0건
- `[원문 미대조]` 항목이 공식 분모에 0건
- 현재 분자와 분모가 숫자로 출력됨
- `getElementaryCurriculumCoverage()`가 더 이상 `unavailable`이 아님
- 커밋된 fixture 레코드의 schema·코드 형식·중복·학년군·영역·검토 상태가 잘못되면 CI가 실패함
- 공식 원문 다운로드와 파일 해시 재대조는 CI가 아니라 수동·주기 검토 명령으로 분리됨

이 단계에서는 blueprint, UI, TeacherIntent를 수정하지 않는다.

### Phase 1 — 공통 ProblemFamily 기반

상태: **완료(2026-08-11)**. Phase 1에서 legacy 29개를 canonical화했고 이후 native
family 1개가 추가돼 현재 canonical 30개/released 21개다. 기존 released
blueprint·layout·payload hash 21/21 불변, 전체 440/440 테스트와 품질 gate 통과.
기계 판독 대응표는 `reports/problem-family-registry/latest.json`, 확장 규칙은
`docs/PROBLEM_FAMILY_ARCHITECTURE.md`에 고정한다.

목적: 성취기준마다 하드코딩 데모를 만드는 구조를 없앤다.

작업:

1. `OfficialStandard`, `AssessmentTarget`, `ProblemFamily`, `CapabilityManifest`, `RenderRecipe`, `ReleaseEvidence` 스키마를 추가한다.
2. catalog 활동 ID·template ID·manipulation 문자열을 연결하는 canonical `FamilyId`를 정의한다.
3. 기존 21 released 활동과 release evidence를 새 registry에 점진적으로 이관한다. 현재 visual audit의 blueprint·layout hash 결속을 유지하고 compiled payload hash 기준선도 고정한다.
4. 기존 blueprint를 즉시 RenderRecipe로 재작성하지 않는다. 기존 구현은 `legacy recipe adapter`로 감싸고 신규 ProblemFamily부터 분리된 RenderRecipe를 사용한다.
5. 새 registry가 기존 record를 감싸는 strangler 방식으로 전환한다. 새 경로가 같은 결과를 내는 것이 확인된 뒤에만 구 경로를 제거한다.
6. 기존 TeacherIntent 3종을 공통 `ProblemParameters` 계약으로 이관한다.
7. planner·MCP·teacher-ui가 registry만 읽도록 바꾼다.
8. `mapped → generatable → offline-validated → live-released` 상태를 분리한다.

구현 메모: 과거 `ACTIVITY_IDS`, `ACTIVITY_SUPPORT`, 중앙 generator/variation 목록은
contracts→templates 의존 방향을 뒤집지 않기 위해 frozen legacy adapter input으로
남겼다. 신규 family는 이 기록을 수정하지 않고 영역 index의
`ProblemFamilyNativeModule(source + capability + runtime + cognitiveManifest + variationEnvelope)`만 사용한다.

완료 기준:

- 기존 21 released 활동의 payload hash가 의도치 않게 변하지 않음
- `pnpm check` 전체 통과 및 기존 released payload snapshot hash 불변
- 네 번째 ProblemFamily를 추가할 때 공통 planner·MCP·UI 코드를 수정하지 않음
- 더미 가족 인수 테스트가 영역별 index 한 곳 외의 공통 등록 파일 변경 필요성을 거부함
- 미지원 조건은 자동으로 `unsupported` 또는 `clarification-required`가 되며 침묵 무시 0건

### Phase 2 — 네 영역·세 학년군 대표 격자

상태: **진행 중**. reviewed AssessmentTarget 분해와 native family의 첫 실제
사용에 더해, 기존 released family 한 개를 새 target 권위 계층으로 이관했다.
현재 pipeline-proven 셀은 1/12, reviewed-complete set은 2/121뿐이며 Phase 1의
더미 인수 fixture를 출시 family로 세지 않는다. 고정된 12개 대표와 실행 순서는
`scripts/curriculum/elementary-execution-program.json`이 소유한다.

목적: 수와 연산에 편중된 구조가 아닌지 전 범위 확장 전에 증명한다.

공식 원문에 존재하는 각 `학년군 × 영역` 셀마다 최소 하나의 새 또는 기존 ProblemFamily를 끝까지 통과시킨다. 정확한 빈 셀 목록은 Phase 0 커버리지 보고서가 산출한다. 기존 가족을 대표로 사용할 때도 AssessmentTarget, 새 capability contract, 해시 결속 evidence를 포함한 새 파이프라인을 통과해야 한다.

각 대표 가족은 다음을 포함한다.

- 공식 성취기준과 AssessmentTarget
- 결정적 generator와 유효 파라미터 envelope
- 오개념 기반 대안
- 정답·해설·관찰 증거
- exact preview
- MathCanvas RenderRecipe
- compiler·validator
- 최소·최대·wrap/stack 변형 canary
- 저장·재열기

완료 기준:

- 대표 격자의 빈 셀 0개
- 영역별 최소 하나의 실제 MathCanvas 새 프로젝트 생성·재열기 성공
- 한 영역 전용 하드코딩이 공통 계층에 0건

#### Phase 2-A — 1~2학년군 × 자료와 가능성 첫 세로 단면

상태: **offline 검증 완료**. target 4개 중 주어진 기준 분류·개수 세기·결과
설명의 3개를 다루며, 학생이 기준을 스스로 정하는 1개는 의도적으로 미지원이다.
60개 variation 전수 compile·validator와 전체 회귀는 통과했지만 fresh canary와
저장·재열기 전이므로 `verified/offline-validated`를 유지한다.

첫 구현 대상은 공식 성취기준 `[2수04-01]`이다. 이 성취기준을 완전한
`AssessmentTargetSet`으로 분해하고, 그중 정해진 기준으로 사물을 분류해 개수를
세고 결과를 말하는 목표를 `data.classification.given-criterion-count-v1` native
family로 구현한다. 자신이 정한 기준으로 다시 분류하는 목표는 별도 필수 target으로
남기며, 첫 family 하나로 성취기준 전체를 커버했다고 표시하지 않는다.

학생이 내려야 하는 판단은 “주어진 기준에 맞는 사물이 어느 것이며 모두 몇 개인지”다.
학생은 다섯 개수 카드 중 하나를 먼저 고르고, 섞인 사물 목록을 기준에 따라 하나씩
확인해 선택을 고치며, 기준에 맞는 사물 이름과 개수를 남긴다. 전체를 무조건 세는
오개념과 기준 반대편을 세는 오개념을 실제 대안으로 포함한다.

이 단위의 core 완료 기준:

- `[2수04-01]`의 필수 target 분해가 완전성 review 상태로 등록됨
- native family가 공통 planner·MCP·teacher-ui 분기 추가 없이 노출됨
- 같은 seed·조건은 같은 문항과 hash, 조건 변경은 문항과 hash를 함께 바꿈
- 최소·최대 matching count와 1·3문항 경계에서 문항·정답·exact preview·compile·validator 통과
- cognitive manifest와 learning-map 고정 fixture가 blueprint hash에 결속됨
- offline 통과 뒤에도 fresh canary·저장·재열기 전에는 `verified/offline-validated` 유지

#### Phase 2-R02 — 1~2학년군 × 변화와 관계 legacy live 이관

상태: **완료(2026-08-11)**. 공식 `[2수02-01]`을 규칙 찾기와 같은 규칙을
여러 방법으로 표현하기의 필수 target 2개로 완전 분해했다. 기존 released
`pattern.repeat-unit.pattern-blocks-v1` family가 두 target을 모두 지원하며,
현재 blueprint hash와 저장·재열기 release canary가 일치한다.

이 대표 셀은 새 blueprint를 만들지 않고 legacy family를 새 권위 계층에 연결하는
strangler 경로를 검증한다. target 연결은 legacy 전용 이관 표 한 곳에만 두고,
canonical registry가 공식 성취기준·reviewed-complete set·family manifest를
fail-closed로 대조한다. 교사용 preview는 실제 생성된 질문, 여섯 칸 무늬,
사용 가능한 다섯 조각과 수 선택지를 정확히 투영한다.

이 단위의 완료 증거:

- `[2수02-01]` reviewed-complete target 2개와 고정 learning-map 선수 관계
- legacy family manifest가 두 target을 선언하고 현재 release canary hash와 결속
- 2·3문항 variation 전체에서 결정성, 정답·해설·exact preview, compile·validator 통과
- blueprint·generator·compiled payload 변경 0건이므로 기존 current-hash canary 재사용
- 커버리지 보고서에 `[2수02-01]` live 2/2, 전역 target coverage는 `unavailable`

범위 제한: 현재 family는 세 종류의 무늬 블록으로 이루어진 반복 단위를 찾고
이어 놓는 경우만 제공한다. 물체·수 배열, 비반복 변화 규칙, 모든 표현 양식까지
지원한다고 주장하지 않으며, 그런 추가 문제 다양성은 `familyVariety` 확장으로
별도 추적한다.

### Phase 3 — 전 성취기준 breadth-first 확장

목적: 공식 커버리지를 100%로 만든다.

순서:

1. 12개 대표 격자를 먼저 pipeline-proven으로 만든다.
2. 같은 `학년군×영역`에서 다음 공식 성취기준을 하나씩 꺼내 12개 셀을 순환한다.
3. 한 배치에는 가능하면 서로 다른 네 영역의 성취기준을 하나씩 넣는다.
4. reviewed target gap → released family 재사용 → offline family 완성 → 신규 family 설계 순으로 같은 셀 안에서 가장 가까운 안전 경로를 택한다.

고정된 한 학년군을 끝낼 때까지 다른 학년군을 비워 두지 않는다. 전체 순서는
`reports/curriculum-execution/latest.md`의 breadth queue가 산출하고, 현재 상태가
바뀔 때마다 자동 재정렬한다.

ProblemFamily는 성취기준 수만큼 무조건 만들지 않는다. 같은 수학 구조를 공유하면 하나의 family가 여러 AssessmentTarget을 안전하게 지원한다. 단, 넓은 성취기준의 일부만 다루면서 전체를 커버했다고 표시하지 않는다.

선택형, 주장-근거형, 구성형, 비교형, 측정형, 자료 표현형처럼 여러 성취기준이 재사용할 수 있는 범용 가족 원형을 먼저 설계한다. 성취기준 전용 가족은 기존 원형으로 수학적 판단과 관찰 증거를 표현할 수 없을 때만 만든다.

가족별 완료 기준:

- 선언된 유효 상태 공간 전수 또는 경계 조합 전수 통과
- 상태 공간이 충분히 큰 경우 고정된 대표 조합과 property test 통과
- 유한 상태가 더 작지 않은 한 최소 12개의 서로 다른 정규화 문항 생성
- 정답·해설·오개념·단위·수 범위 validator 통과
- 같은 입력은 같은 문항·hash, 의미 조건 변경은 문항·hash 동반 변경
- 실제 생성 가능한 payload와 현재 release evidence

학년군 완료 기준:

- 해당 학년군의 모든 OfficialStandard와 필수 AssessmentTarget이 `live-released`
- 해당 학년군 교과서 모든 단원에서 자료 탐색 가능
- 학년군·영역을 고르게 포함한 고정 30개 교사 요청 회귀 세트 100% 통과
- 학년군 완료 시 실제 `AssessmentTarget / ProblemFamily / 검수 시간` 처리량을 기록하고 남은 학년군의 예상 작업량을 다시 계산함

Phase 3 전체 완료 기준:

- 공식 성취기준의 모든 필수 AssessmentTarget이 `live-released`
- `targetCoverage` 100%와 미지원 target 0건
- 모든 성취기준 카드가 현재 `scopeNote`와 `familyVariety`를 표시함

#### Phase 3-P — 무-family 97개 전체 구현 프로그램

상태: **계획 기준선 완료, foundation 대기**. 2026-08-11 execution report에서
`review-target-set-and-design-family`로 분류된 정확히 97개를 다음 세 층으로
분리했다.

- 공통 MathCanvas 표현·상태 계층: **24개 shared RenderRecipe/engine class**
- 단일 `gradeBand`·`domain`을 지키는 구현 소유권: **84개 concrete family track**
- 실제 breadth-first 실행 단위: **W001~W097 standard work item**

97개 코드의 mapped occurrence와 unique code는 모두 97이며 duplicate·missing·extra는
각각 0이다. 기계 판독 원본은 `scripts/curriculum/no-family-plan.json`, 현재 상태를
조인한 보드는 `reports/curriculum-execution/no-family-plan.md`다. 다음 명령이 코드
집합 hash, work order hash, grade-band 혼합, batch·track·engine 누락과 stale report를
검증한다.

```bash
pnpm curriculum:no-family-plan
```

84는 최종 family 수가 아니다. `AssessmentTargetSet` 완전 분해에서 학생의 결정,
수학적 불변량, 관찰 증거가 갈리면 track을 분리한다. 현재 예상 범위는 concrete
family 92~110개, 필수 AssessmentTarget 230~380개, bounded loop work item
288~330회다. 수를 맞추기 위한 병합은 금지한다.

Sol max 계획 초안은 97개 officialGoal을 **236개 expected target outline**으로
분해했다. 각 target은 학생의 결정·불변량·화면 증거·오개념 class를 가지며 코드,
공식 문구, W001~W097 순서, 필수 필드의 누락·중복·불일치가 모두 0임을 자동
검증한다. 이 outline은 Luna의 범위 입력이지 곧바로 `reviewed-complete` 증거가
아니다. 실제 AssessmentTarget module로 옮길 때 추가 분리가 필요하면 Sol 재계획으로
멈춘다.

실행 전 foundation은 두 가지다.

1. 고정 learning-map commit에서 97개 standard에 필요한 concept·representation·
   application·prerequisite record를 추출하고 fixture hash에 결속한다. 현재 기본
   fixture는 0/97, grade-3 pilot을 포함해도 9/97이므로 88개가 추가로 필요하다.
2. number line, semantic array, coordinate plane, circle, cube/solid/net, graph edit,
   unit exchange, capacity/mass measurement의 필수 bounded discovery 9개와 조건부
   discovery 최대 3개를 work item으로 분리한다.

모델 역할은 고정한다.

- **Sol max**: target outline, engine/family 경계, grade-band split, native affordance,
  재계획과 architecture 결정, 그리고 `TARGET_SET`·`FAMILY_TRACK` 결과의 독립 검토
- **Luna max**: 승인된 work item 하나의 구현·테스트·보고서와 push 전 local candidate
  commit. Sol `SOL_REVIEW` 승인 전에는 상태 승격과 main push를 하지 않음
- 같은 deterministic 실패 2회, target 완전성 불명, 새로운 schema/native tool,
  결정·불변량·증거 분기는 `blocked-needs-sol-replan`

현재 Codex sub-agent catalog에는 `Luna`라는 모델명이 노출되지 않으므로 저장소의
실행 계약은 모델 독립적으로 고정한다. Luna가 제공되는 운영 환경에서 Luna max를
선택한다. 전체 반복 계약은 `CURRICULUM_97_LUNA_LOOP_PROMPT.md`를 권위로 사용하며,
독립 검토 계약은 `SOL_REVIEW_PROMPT.md`와
`scripts/curriculum/sol-review-board.json`을 사용한다. Fable CLI는 사용하지 않는다.

각 standard의 첫 operation은 `LEARNING_MAP_BINDING`이다. 그 다음
`TARGET_SET → SOL_REVIEW → (AFFORDANCE_DISCOVERY/ENGINE_CORE) → FAMILY_TRACK →
SOL_REVIEW` 순으로 진행한다. generated work item에는 operation, dependencies,
allowed files, target outline SHA-256을 함께 기록하며, Sol review record는 candidate
commit hash와 changed files에 결속한다. `changes-requested`는 새 attempt·새 candidate
commit으로만 재시도한다.

중요하게, 이 97개를 닫는 것만으로 전체 완료가 아니다. 기존 family 재사용·offline
완성·reviewed gap으로 분류된 나머지 24개를 합쳐 121/121 standard의 모든 필수
target이 current-hash live evidence를 가질 때 Phase 3가 끝난다.

### Phase 4 — 전 범위 교사용 AI

목적: 교사가 registry를 몰라도 원하는 자료를 요청하게 한다.

Phase 2 대표 격자와 공통 registry가 통과한 뒤 착수할 수 있다. Phase 3과 병행하되 `live-released` ProblemFamily만 교사에게 노출하고, 활동별 자연어 분기를 추가하지 않는다.

구조화 요청 축:

- 학년·학기·단원
- 성취기준 또는 학습 목표
- 특정 수·식·단위
- 맥락
- 문항 수와 난이도
- 목표 오개념
- 개별/모둠, 수업 시간, 자료 유형

흐름:

```text
자연어 요청
  -> 구조화 TeacherRequest
  -> 필요한 확인 질문 최대 1개
  -> 지원/미지원 조건 표
  -> 실제 문항·정답·MathCanvas 화면 미리보기
  -> 승인
  -> 생성
```

완료 기준:

- 모든 released ProblemFamily가 동일한 요청·반영 표 계약을 사용
- 학년군×영역별 골든 교사 문장 세트 통과
- 구체 요청과 빈 요청이 의미 없이 같은 결과가 되는 byte-equivalence 0건
- 미지원 요청의 침묵 무시 0건

### Phase 5 — 부분 수정과 최종 릴리스

지원할 수정 연산:

- 특정 문항 교체
- 수·단위·맥락 변경
- 난이도 변경
- 오답 대안 변경
- 문항 수 변경

완료 기준:

- 전체 재추천 없이 한 문항만 수정 가능
- 수정 후 정답·해설·payload·hash 재검증
- 저장·재열기 후 수정 결과 유지
- `pnpm check`, 교육 품질 gate, MathCanvas live canary 모두 통과

## 6. Phase 0 구현 묶음

Phase 0은 다음 세 논리 묶음으로 구현한다. 활동·UI는 건드리지 않는다.

1. 공식 권위 — `[2수]`·`[4수]`·`[6수]` 121개 fixture, 교육부 URL·해시·검토 메타데이터, schema, 중복·코드·학년군·영역 검사, 수동 원본 재검증 명령.
2. 카탈로그 투영 — 121개 공식 목표를 `teacherCurriculumCatalog`와 `resolveCurriculum()`의 권위로 사용하고, 71개 단원에 unknown·orphan 없이 연결.
3. 진실한 보고 — `pnpm curriculum:coverage`, 학년군·영역별 `mapped / generatable / offline-validated / live-released`, catalog diff, 단원 reach, `targetCoverage` 산정 불가 상태를 JSON·Markdown으로 고정.

Phase 0 전체 QA를 통과하기 전에는 새 blueprint와 TeacherIntent를 추가하지 않는다.

## 7. 위험 장부와 대응

| 위험 | 잘못될 결과 | 대응 |
|---|---|---|
| 공식 분모가 틀림 | 100%라는 수치가 거짓이 됨 | 교육부 HWP·NCIC PDF 독립 추출, 파일 해시, 차이 기록과 주기적 제작자 재검토를 hard gate로 둠 |
| 단원과 성취기준을 혼동 | 단원 하나의 활동으로 전체 단원을 커버했다고 착각 | 공식 커버리지는 AssessmentTarget 기준, 단원은 탐색 지표로만 사용 |
| 성취기준마다 하드코딩 | 121개 이상의 데모와 분기 폭증 | ProblemFamily·RenderRecipe registry와 무핵심수정 인수 기준 |
| 수와 연산 편중 | 곱셈·나눗셈만 정교해짐 | Phase 2에서 학년군×영역 대표 격자를 먼저 닫음 |
| 미리보기만 통과 | 실제 MathCanvas 생성 실패 | compiled payload·validator·live create·reopen을 별도 gate로 유지 |
| 범위를 넓히며 품질 붕괴 | 문제는 많지만 수학적으로 쓸 수 없음 | AssessmentTarget, 오개념, 불변량, 정답·해설 validator를 필수화 |
| TeacherIntent union 폭증 | 활동 추가마다 MCP/UI 수정 | schema-driven form과 capability registry 사용 |
| MathCanvas 도구 한계 은폐 | 일반 텍스트 자료를 상호작용이라 주장 | native 도구와 비상호작용 자료의 상태를 구분하고 제한을 표시 |
| 검수자 1명의 피로 | 수동 QA가 확장을 막음 | envelope/property test 후 새 RenderRecipe만 대표 live canary 수행 |
| 자잘한 마감으로 재이탈 | 커버리지가 늘지 않음 | Phase별 금지 작업과 종료 기준을 CI·체크리스트로 고정 |
| canary 노후화 | MathCanvas 변경 뒤 과거 화면 증거를 계속 신뢰 | blueprint·generator·layout·platform contract hash 변경 시 즉시 무효화하고, 최종 릴리스 전에 90일이 지난 대표 canary를 다시 수행 |
| 생성 문구 품질 편차 | 수학은 맞지만 교실에서 읽기 어려운 문항이 누적 | 가족별 고정 표본에 저자 검수 체크리스트와 `language.classroom-korean` 결과를 evidence로 기록 |
| 다음 항목을 사람이 매번 선택 | 작은 완료마다 작업이 멈추고 전체 우선순위가 흔들림 | 12개 대표 manifest와 121개 generated queue를 `pnpm curriculum:program`으로 검증 |
| 외부 canary 한 건 차단 | 인증·플랫폼 문제로 offline 확장까지 모두 멈춤 | offline 제작과 live-evidence를 독립 queue로 운영하고 차단 중에도 다음 offline 배치를 진행 |

## 8. 현재 비목표

- 다수 교사 파일럿
- 텔레메트리와 개인정보 수집
- macOS/Windows 배포 패키징 고도화
- 새 30개 수업 시리즈의 별도 마감
- 색상·간격·문구 같은 비차단 UI polish
- 전 범위 기반이 없는 상태에서 자연어 파서부터 만드는 작업
- 기존 3개 TeacherIntent 사례를 더 정교하게 다듬는 작업

## 9. 진행 중단 규칙

다음 중 하나라도 발생하면 새 문제 가족 추가를 멈추고 기반을 수정한다.

- official fixture에 없는 성취기준 코드 사용
- 한 성취기준의 일부 목표만 다루고 `released` 처리
- activity ID에 대한 planner·MCP·UI 하드코딩 추가
- 요청 조건을 알리지 않고 무시
- 미리보기와 compiled payload의 문제·정답 불일치
- 현재 해시와 결속되지 않은 canary로 release 승격
- 커버리지 수치가 분모 없이 제시됨

위 hard stop이 아니면 개별 성취기준 완료 뒤 사용자에게 다음 작업을 묻지 않고
execution board의 다음 항목으로 이동한다. Fable 또는 외부 교사 검수가 없다는
이유만으로 진행을 멈추지 않으며, 저장소 QA와 제작자 1인 검수 기준을 사용한다.

## 10. 최종 완료 판정

다음 문장을 증거와 함께 말할 수 있을 때만 완료다.

> 교육부 고시 제2022-33호의 초등 수학 공식 성취기준과 필수 평가 목표가 모두 등록되어 있고, 각 목표는 최소 하나의 검증된 문제 가족을 통해 문항·정답·해설과 MathCanvas 자료로 생성되며, 현재 해시의 생성·저장·재열기 증거가 있다.
