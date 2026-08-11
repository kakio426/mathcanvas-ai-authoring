# 2022 개정 초등 수학 전 범위 생성 체크리스트

기준 문서: `ELEMENTARY_2022_FULL_COVERAGE_PLAN.md`  
현재 실행 범위: Phase 0·1 완료, Phase 2 대표 격자 1/12, reviewed target set 2/121, 연속 실행 queue 120개
상태 표기: `[ ]` 미착수, `[-]` 진행 중, `[x]` 완료, `[!]` 차단

## P-EXEC — 전체 연속 실행 프로그램

- [x] 3개 학년군×4개 영역의 대표 성취기준과 family 12개를 중복 없이 고정한다.
- [x] 대표 셀 상태를 pipeline-proven / target-bound-offline / released 후보 / offline 후보로 자동 분류한다.
- [x] 121개 성취기준을 target gap / released 재사용 / offline 완성 / 신규 family 설계로 분류한다.
- [x] 학년군과 영역을 순환하는 전체 breadth queue를 생성한다.
- [x] offline 제작 레인과 외부 MathCanvas live-evidence 레인을 분리한다.
- [x] `pnpm curriculum:program`과 `curriculum:program:update`를 추가한다.
- [x] execution report가 stale이면 `pnpm check`를 실패시킨다.
- [x] 대표 셀 완료마다 다음 항목을 사용자에게 묻지 않고 generated queue로 이동한다.
- [x] Fable CLI를 실행 경로에서 제외한다.
- [x] `pnpm curriculum:program`이 대표 격자 1/12, target set 2/121, 다음 offline `[4수03-09]`를 재현한다.
- [x] `pnpm check` 전체 75파일·452/452 테스트, build, native/contract/cognitive/visual/quality gate를 통과한다.
- [x] 실행 프로그램을 원자적 커밋으로 정리해 `main`에 push한다.

현재 자동 선택:

- offline 레인: `[4수03-09]` 삼각형 분류 target 완전 분해·released family 이관
- live-evidence 레인: `[2수04-01]` 분류 native family 현재 해시 canary·저장·재열기
- Phase 3 첫 coverage gap: `[2수04-01]` 자신이 정한 기준 분류 target family 추가

전체 현황과 120개 잔여 순서는 `reports/curriculum-execution/latest.md`를 권위로 사용한다.

## P0-A — 계획 보정

- [x] `targetCoverage`와 `familyVariety`를 분리한다.
- [x] CI의 외부 다운로드 의존을 제거한다.
- [x] Phase 1을 strangler 이관 방식으로 바꾼다.
- [x] canonical FamilyId와 단일 등록 지점 인수 기준을 명시한다.
- [x] 기존 release evidence의 실제 hash 검증을 보존한다.
- [x] Phase 3 처리량 재산정 checkpoint를 추가한다.
- [x] Phase 4를 Phase 2 이후 Phase 3과 병행하도록 바꾼다.
- [x] 커버리지 100%를 Phase 3 전체 종료 기준으로 이동한다.

## P0-B — 공식 성취기준 fixture

- [x] 교육부 공식 URL·파일 SHA-256·검토일 manifest를 추가한다.
- [x] `[2수]` 공식 레코드를 추가한다.
- [x] `[4수]` 공식 레코드를 추가한다.
- [x] `[6수]` 공식 레코드를 추가한다.
- [x] 원문 전체를 저장소에 재배포하지 않는지 확인한다.
- [x] schema·코드 형식·중복·학년군·영역 검사를 추가한다.
- [x] 공식 원문 해시 재대조를 수동 명령으로 분리한다.

완료 기준:

- [x] 모든 fixture 레코드가 `official-text-verified`다.
- [x] 중복 코드 0건, 학년군·영역 불일치 0건이다.
- [x] 공식 fixture 검사 테스트가 통과한다.

## P0-C — catalog diff와 커버리지

- [x] official fixture와 현재 `teacherCurriculumCatalog` 코드 차이를 계산한다.
- [x] 공식 문구·영역·학년군 차이를 계산한다.
- [x] `OfficialStandard`별 `mapped / generatable / offline-validated / live-released` 상태를 계산한다.
- [x] `targetCoverage`와 `familyVariety`를 별도 필드로 둔다.
- [x] 1~6학년 교과서 단원의 unknown·orphan code를 검사한다.
- [x] `getElementaryCurriculumCoverage()`가 검증된 공식 분모를 사용한다.
- [x] `pnpm curriculum:coverage`를 추가한다.
- [x] `reports/curriculum-coverage/latest.md`와 기계 판독 JSON을 생성한다.

완료 기준:

- [x] 공식 분모와 현재 분자가 학년군·영역별 숫자로 출력된다.
- [x] 단순 단원 연결과 성취기준 완전 커버리지가 구분된다.
- [x] 지원하지 않는 성취기준을 지원한다고 표시하지 않는다.

## P0-D — 문서·QA

- [x] `docs/ARCHITECTURE.md`의 과거 3종 설명을 현재 상태로 고친다.
- [x] README의 커버리지 표현을 새 보고서와 동기화한다.
- [x] 관련 단위 테스트를 통과한다.
- [x] `pnpm curriculum:coverage`를 통과한다.
- [x] coverage metric 계약 변경 이유를 기록하고 architecture baseline을 검토 재동결한다.
- [x] `pnpm check` 전체를 통과한다.
- [x] plan과 checklist를 다시 읽고 Phase 0 누락이 없는지 대조한다.

## Phase 0 증거 — 2026-08-11

- 공식 분모: 121개 (`[2수]` 29, `[4수]` 47, `[6수]` 45)
- HWP/PDF 대조: 코드 121/121 일치, 목표 117개 공백 정규화 일치, 형식 차이 4개는 manifest에 채택 원문 기록
- 원본 재대조: 교육부 archive, archive 내부 수학 HWP, NCIC PDF SHA-256 모두 PASS
- catalog diff: 누락 0, fixture 밖 0, 문구 0, 학년군 0, 영역 0
- 현재 상태: mapped 98, offline-validated 5, live-released reach 18
- `targetCoverage`: AssessmentTarget registry 전까지 `unavailable`
- 단원 인덱스: 71개, unknown 0, orphan official standard 0, released 활동 reach 16개 단원
- architecture baseline: 32 files, `a8a237bda09a8b0c48b8c252ec7b7ea57ad94210e7b2c184dcda5d351ac90a9c`
- 전체 QA: 68 test files, 416/416 tests, build, curriculum coverage, native/contract/cognitive/visual/quality audit PASS
- Fable CLI 최종 검토: `PASS`, P0 0건. P1 두 건(legacy 상태 하드코딩, 보고 시각 명명)은 canonical support 파생과 `authorityReviewedAt`으로 검토 직후 해소

## Phase 0 이후 금지

다음 항목은 Phase 0 완료 보고 전에는 착수하지 않는다.

- 새 blueprint
- 새 TeacherIntent
- 기존 3종의 UI polish
- 부분 수정 기능
- 다수 교사 배포 기능

## P1-A — 기준선과 이관 경계

- [x] 기존 활동 ID·template ID·generator·manipulation·교육과정·support·release evidence의 현재 진실 공급원을 대조한다.
- [x] 기존 29개 registered / 21개 released family의 canonical ID 대응표를 만든다.
- [x] 기존 released blueprint content hash·layout hash·compiled payload snapshot 기준선을 고정한다.
- [x] Phase 1에서 새 blueprint, 새 수학 문항, UI polish를 만들지 않는 범위를 테스트와 registry 보고서의 native 0개로 보호한다.

완료 기준:

- [x] 이관 전후에 비교할 기계 판독 가능한 기준선이 저장소에 있다.
- [x] legacy adapter가 보존해야 할 필드와 새 registry가 소유할 필드가 문서와 타입으로 구분된다.

## P1-B — 공통 계약과 영역별 registry

- [x] `FamilyId`, `AssessmentTarget`, `ProblemFamily`, `ProblemParameters`, `CapabilityManifest`, `RenderRecipe`, `ReleaseEvidence` 스키마를 추가한다.
- [x] lifecycle을 `mapped → generatable → offline-validated → live-released`로 분리한다.
- [x] 네 교육과정 영역별 family index와 하나의 읽기 전용 domain registry를 만든다.
- [x] family ID·activity ID·template ID·manipulation의 중복과 불일치를 시작 시점에 거부한다.
- [x] 미지원 파라미터 처리 정책을 `unsupported` 또는 `clarification-required`로 명시한다.

완료 기준:

- [x] registry가 전체 29개 family를 정확히 한 번씩 반환하고 기존 21개 released 상태를 보존한다.
- [x] 공통 소비자는 개별 family 리터럴이나 수동 union을 몰라도 manifest를 조회할 수 있다.

## P1-C — legacy strangler 이관

- [x] 기존 blueprint와 generator를 `legacy recipe adapter`로 감싼다.
- [x] `ACTIVITY_IDS`, `ACTIVITY_SUPPORT`, release evidence는 frozen legacy input으로 격리하고 canonical 보고·소비 경로는 새 registry projection으로 바꾼다. 신규 family는 이 record를 수정하지 않는다.
- [x] template runtime registry가 canonical family binding과 native module seam을 노출하되 기존 compile 경로를 보존한다.
- [x] visual/cognitive/layout evidence의 기존 hash 결속을 그대로 유지한다.

완료 기준:

- [x] 기존 public API와 legacy 추천·compile 결과가 바뀌지 않는다.
- [x] 21개 released family의 blueprint/layout/payload hash가 기준선과 일치한다.

## P1-D — 공통 ProblemParameters와 소비자 전환

- [x] 기존 3개 TeacherIntent를 `ProblemParameters` 요청 envelope로 호환 이관한다.
- [x] capability의 parameter schema·필드·기본값·route를 family manifest에서 투영한다.
- [x] planner가 `requestedFamilyId`와 family registry의 route/capability로 신규 경로를 선택하도록 바꾼다. 과거 prompt router는 legacy fallback으로만 남긴다.
- [x] MCP가 generic family ID·ProblemParameters schema와 registry 설명을 읽고 신규 family용 수동 union을 요구하지 않는다.
- [x] teacher-ui가 registry projection만 읽고 개별 activity 조건을 하드코딩하지 않는지 검증한다.
- [x] authoring-runtime의 승인 token·activitySpecHash·create-only 안전 게이트를 보존한다.

완료 기준:

- [x] legacy 3개 요청의 기존 hash가 보존되고, 동등한 ProblemParameters 요청은 같은 문항·정답·compiled payload를 만든다. 새 envelope가 포함된 approval hash를 legacy hash와 같다고 과장하지 않는다.
- [x] 지원하지 않는 family·kind·필드·값은 침묵 무시 없이 명시적으로 차단된다.

## P1-E — 확장성 인수 테스트와 커버리지 조인

- [x] 더미 fourth family를 native domain module 계약으로 조립하는 인수 fixture를 만든다.
- [x] 더미 family 때문에 공통 planner·MCP·teacher-ui·template/generator registry를 수정하면 실패하는 아키텍처 테스트를 추가한다.
- [x] 새 family가 `family module + manifest + tests + 영역별 index`만으로 조회·route·runtime·폼 projection에 나타남을 증명한다.
- [x] 커버리지 보고서가 canonical family와 lifecycle을 사용하고 family 수를 target coverage로 표시하지 않는다.

완료 기준:

- [x] 단일 등록 지점 인수 테스트가 통과한다.
- [x] 공식 성취기준→family→runtime binding→release evidence 조인이 끊기면 CI가 실패한다.

## P1-F — 회귀 QA와 종료 대조

- [x] 관련 단위·contract·architecture 테스트를 통과한다.
- [x] `pnpm curriculum:coverage`를 재생성했다. reach는 18/121로 동일하고 familyVariety의 basis만 legacy proxy에서 canonical registry로 바뀌었다.
- [x] `pnpm check` 전체를 통과한다.
- [x] plan과 checklist를 다시 읽어 Phase 1 누락과 범위 이탈을 대조한다.
- [x] architecture baseline을 검토했다. frozen core baseline 32개·hash는 변경되지 않았고 재동결이 필요하지 않았다.
- [x] 구현·테스트·문서를 원자적 커밋으로 정리해 `main`에 push한다.

## Phase 1 증거 — 2026-08-11

- canonical registry: 29개 exactly-once, released 21개, native production family 0개
- 공통 요청: `requestedFamilyId` 29/29 라우팅, ProblemParameters 3개 legacy family 무손실 호환
- 확장 seam: 네 영역 index + `ProblemFamilyNativeModule(source/capability/runtime)`, 더미 geometry family가 runtime·planner 계약·MCP generic schema·teacher-ui form projection에 나타남
- hash 기준선: released 21개의 blueprint·layout·compiled payload 21/21 일치
- 커버리지: 공식 121, mapped 121, any family reach 23, released reach 18, target coverage unavailable 유지
- 전체 QA: 71 test files, 440/440 tests, build, registry/coverage stale check, native/contract/cognitive/visual/quality audit PASS
- architecture baseline: 32 files, `a8a237bda09a8b0c48b8c252ec7b7ea57ad94210e7b2c184dcda5d351ac90a9c` 유지
- 외부 MathCanvas 쓰기: 0건. Phase 1은 새 family를 출시하지 않아 fresh canary가 완료 조건이 아님
- Fable CLI 독립 검수: `PASS`, P0 0건, P1 0건. P2 권고였던 MCP legacy manipulation enum, 문항 수 상한 이원화, 다중 성취기준 route, 배열 값 비교, native projector 요건은 커밋 전 해소
- Fable CLI 수정 재검수: `PASS`, Phase 1 커밋 가능. 추가 권고인 ProblemParameters record key 순서 의존도 정규화 비교로 해소

Phase 1은 위 완료 기준이 모두 충족되기 전까지 완료로 표시하지 않는다.

## P2-A — `[2수04-01]` AssessmentTarget 권위

- [x] `[2수04-01]`을 정해진 기준 분류 / 자신이 정한 기준 분류 / 분류별 개수 세기 / 기준에 따른 결과 말하기의 필수 target으로 완전 분해한다.
- [x] target set의 완전성 상태·검토일·검토자를 기계 판독 가능하게 등록한다.
- [x] 고정 learning-map commit의 concept / representation / application topic과 hard prerequisite를 최소 fixture에 결속한다.
- [x] 존재하지 않는 공식 성취기준·topic·중복 target·불완전 target set을 테스트로 거부한다.
- [x] 커버리지 보고서가 reviewed target 분해 진행률과 `[2수04-01]`의 released target coverage를 family 수와 분리해 표시한다.

완료 기준:

- [x] `[2수04-01]` target set은 reviewed-complete이며 필수 target 누락이 없다.
- [x] 전체 121개 분해 전에는 전역 target coverage를 계속 `unavailable`로 정직하게 유지한다.

## P2-B — native family 확장 seam

- [x] native source가 하나 이상의 reviewed `AssessmentTarget`을 선언하도록 강제한다.
- [x] target이 family의 공식 성취기준과 다르면 canonical registry 생성이 실패한다.
- [x] native cognitive manifest가 영역 모듈에서 함께 등록되고 중앙 cognitive map 수정이 필요 없게 한다.
- [x] 기존 29개 legacy family와 released payload hash를 보존한다.

완료 기준:

- [x] 다음 신규 family 등록은 family module + 영역 index + target registry + tests만으로 소비 경로와 감사 경로에 합쳐진다.
- [x] planner·MCP·teacher-ui·중앙 generator/variation/cognitive 목록에 family 리터럴이 없다.

## P2-C — `data.classification.given-criterion-count-v1`

- [x] 공식 `[2수04-01]`과 세 개의 지원 target을 manifest에 연결한다.
- [x] 분류 기준·맞는 사물 수를 공통 `ProblemParameters`로 받고 범위 밖·추가 필드를 fail-closed 처리한다.
- [x] 같은 입력은 같은 문항, 의미 조건 변경은 문항·hash 동반 변경인 결정적 generator를 만든다.
- [x] 전체·반대편·하나 빠뜨리기/더 세기 오개념을 다룬다. 양쪽이 4개로 같은 경우에는 개수 카드가 아니라 학생이 남기는 사물 이름으로 기준 반전을 구별한다.
- [x] 정확한 문항 preview와 정답·해설·실제 적용 파라미터 projection을 제공한다.
- [x] classroom Korean, text fit, labeled choice pool, no-overlap, cognitive release predicate를 등록한다.
- [x] 1·3문항, matching count 2·6, 전체 분류 맥락 경계를 테스트한다.
- [x] resolve → compile → validator가 error 0건으로 통과한다.

완료 기준:

- [x] 학생의 판단, 오개념 갈등, 화면에 남는 증거, 확인 구조, 수정 경로가 manifest와 실제 payload에 일치한다.
- [x] fresh canary 전 상태는 `verified / offline-validated`이며 released로 과장하지 않는다.

## P2-D — 회귀 QA와 종료 대조

- [x] 관련 package·통합 테스트를 통과한다.
- [x] `pnpm cognitive:verify`를 통과한다.
- [x] problem-family와 curriculum 보고서를 갱신하고 stale check를 통과한다.
- [x] `pnpm check` 전체를 통과한다.
- [x] Phase 1 released 21개 기준선이 불변인지 확인한다.
- [!] Fable CLI는 2026-08-11 계정의 `Fable 5 requires usage credits`로 실행이 차단됐다. 과거 차단 이력만 보존하고 이후 단계에서는 재실행하지 않는다.
- [x] 같은 읽기 전용 검수 프롬프트를 Claude Sonnet에 대체 실행해 `PASS`, P0 0건, P1 0건을 받았다.
- [x] plan과 checklist 원문을 다시 읽고 누락을 대조한다.
- [x] 구현을 원자적 커밋으로 정리해 `main`에 push한다.

Phase 2 전체는 12개 대표 격자의 빈 셀이 0개가 될 때만 완료다. Phase 2-A 하나를
완료해도 “전 영역 생성 가능” 또는 “Phase 2 완료”라고 보고하지 않는다.

## Phase 2-A offline 증거 — 2026-08-11

- 권위 분해: `[2수04-01]` reviewed-complete target 4개, 필수 누락 0개
- 구현 범위: native family 1개가 주어진 기준 분류·개수 세기·결과 설명 3개 target을 offline으로 다룸; 자신이 정한 기준 1개는 명시적 미지원
- 유한 envelope: 분류 맥락 4 × 맞는 사물 수 5 × 문항 수 3 = 60조합 전수 resolve·compile·validator PASS
- 확장 seam: native module이 source·capability·runtime·cognitive manifest·variation envelope를 함께 등록하며 공통 소비자에 family 리터럴 0건
- 상태: canonical 30, released 21, `[2수04-01]` offline 3/4 · live 0/4, 전역 target coverage unavailable
- 외부 MathCanvas 쓰기: 0건. fresh canary·저장·재열기 전이므로 `verified/offline-validated` 유지
- 독립 검수: Fable 5는 usage credits로 차단; Claude Sonnet 대체 검수 `PASS`, P0/P1 0건

## P2-R02 — `[2수02-01]` 반복 규칙 legacy live 이관

- [x] 공식 `[2수02-01]`을 규칙 찾기 / 같은 규칙을 여러 방법으로 표현하기의 필수 target 2개로 완전 분해한다.
- [x] 대상별 AssessmentTarget 모듈과 공통 registry 집계·중복·완전성 검사를 추가한다.
- [x] 고정 learning-map의 concept / representation / application topic과 hard prerequisite를 결속한다.
- [x] 기존 `pattern.repeat-unit.pattern-blocks-v1` family를 legacy 전용 target binding 표에서 두 target에 연결한다.
- [x] legacy와 native source 모두 존재하는 target, 같은 공식 성취기준, reviewed-complete set만 참조하도록 fail-closed 검증한다.
- [x] 실제 질문·여섯 칸 무늬·사용 가능한 다섯 조각·수 선택지를 교사용 exact preview로 투영한다.
- [x] 2·3문항 variation 전체에서 결정성, 정답, 반복 단위 구조, unused 대안, compile·validator를 검증한다.
- [x] 현재 blueprint/layout hash와 기존 release canary의 create-only·저장·재열기 증거가 일치하는지 통합 테스트로 고정한다.
- [x] blueprint·generator·compiled payload를 바꾸지 않았으므로 새 외부 MathCanvas write가 필요하지 않음을 확인한다.
- [x] problem-family와 curriculum 보고서를 갱신해 `[2수02-01]` live 2/2와 전역 target coverage `unavailable`을 함께 기록한다.
- [x] `pnpm check` 전체를 통과한다.
- [!] Fable CLI는 2026-08-11 계정의 `Fable 5 requires usage credits`로 실행이 차단됐다. 통과로 표시하지 않는다.
- [x] 같은 읽기 전용 검수 프롬프트를 Claude Sonnet에 대체 실행해 `PASS`, P0 0건, P1 0건을 받았다. P2의 timeout 변경 사유 주석 권고도 반영했다.
- [x] 구현을 원자적 커밋으로 정리해 `main`에 push한다.

완료 경계:

- `[2수02-01]` live 2/2는 세 무늬 블록 반복 사례의 두 필수 target을 다룬다는 뜻이다.
- 물체·수 배열, 비반복 변화 규칙, 모든 가능한 문제 유형까지 지원한다는 뜻이 아니다.
- Phase 2 전체는 여전히 진행 중이며 reviewed-complete target set은 2/121뿐이다.

## Phase 2-R02 live 이관 증거 — 2026-08-11

- 권위 분해: `[2수02-01]` reviewed-complete target 2개, 필수 누락 0개
- 구현 범위: 기존 released `pattern.repeat-unit.pattern-blocks-v1`이 세 무늬 블록 반복 사례에서 규칙 찾기·여러 방법 표현 target 2/2를 live로 다룸
- variation envelope: 문항 수 2·3 전부 결정적 resolve·compile·validator PASS
- release 결속: current blueprint `4143cea8a814cabbb474672c5836c4bfa664de287a53db22da4bbc15f82cc675`, 기존 wave16 canary의 create-only·저장·재열기 증거와 일치
- payload 영향: blueprint·generator·compiled payload 변경 0건, 외부 MathCanvas 쓰기 0건
- 상태: canonical 30, released 21, reviewed target set 2/121·target 6개, `[2수02-01]` live 2/2, 전역 target coverage unavailable
- 전체 QA: 75 test files, 452/452 tests, build, curriculum coverage, native/contract/cognitive/visual/quality audit PASS
- 독립 검수: Fable 5 usage credits 차단; Claude Sonnet 대체 검수 `PASS`, P0/P1 0건, P2 추적성 권고 반영
