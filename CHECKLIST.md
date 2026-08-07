# MathCanvas 네이티브 affordance·공간 계약 체크리스트

이 파일이 구현 진행 상태의 단일 기록이다. 상태는 `pending`, `in_progress`, `blocked`, `complete` 중 하나로만 갱신하고, 동시에 하나의 항목만 `in_progress`로 둔다.

## R1 — 학습 설계 스킬 규칙 추가

- Depth: `core`
- Status: `complete`
- Depends on: 없음
- Scope:
  - `/Users/yubyeongju/.codex/skills/mathcanvas-learning-design/SKILL.md`
  - native-before-layout, semantic released tool preference, bounded fallback, state-change evidence, spatial contract, overflow order, 상태별 canary 규칙
- Definition of done:
  - [x] 특정 나눗셈 도구에 결합되지 않은 일반 규칙이다.
  - [x] workflow와 binary rejection rules 양쪽에 필요한 강제가 들어 있다.
  - [x] 장식용 native, spatial contract 없는 신규 native, per-item 좌표 보정이 거부된다.
  - [x] initial/selected/manipulated/undo-reset/save-reopen 검증이 명시된다.
  - [x] 기존 예상→확인→설명→수정과 교실 한국어 규칙을 약화하지 않는다.
- Evidence/notes:
  - `/Users/yubyeongju/.codex/skills/mathcanvas-learning-design/SKILL.md`에 native affordance 선행, 네 경계, bounded flow, ratchet, 상태별 canary와 binary rejection을 추가했다.

## R2 — 공간 경계 vocabulary와 contract/evidence 분리

- Depth: `core`
- Status: `complete`
- Depends on: R1
- Scope:
  - `visualBox`, `chromeBox`, `taskEnvelope`, `reserveBox`
  - normative spatial contract schema
  - immutable observation evidence schema
  - tool version staleness와 roundtrip tolerance
- Definition of done:
  - [x] 네 경계가 타입·문서·테스트에서 같은 의미를 가진다.
  - [x] 각 gate가 사용하는 경계가 표 또는 실행 가능한 mapping으로 고정된다.
  - [x] volatile 관측값이 normative contract 필드와 섞이지 않는다.
  - [x] selected chrome은 `reserveBox`에 한 번만 반영되고 `minGap`과 중복되지 않는다.
  - [x] unbounded free drag는 거짓 reserve 계산 대신 fail-closed 또는 명시적 한계가 된다.
  - [x] reopen drift가 tolerance를 넘으면 layout 확장이 아니라 결함으로 실패한다.
  - [x] tool/factory/bundle fingerprint 변경 시 stale contract가 차단된다.
- Verification:
  - [x] 관련 contracts schema/unit tests
  - [x] 정상 fixture 1개와 stale/drift 실패 fixture
- Evidence/notes:
  - `packages/contracts/src/vocabulary/native-spatial.ts`에 normative contract와 별도 observation evidence schema를 추가했다.
  - lifecycle assertion이 다섯 상태의 순서·중복·hash transition·reopen numeric drift·contract fingerprint·reserve/task envelope 포함을 직접 검사한다. unbounded envelope와 minInteractiveSize보다 작은 reserve를 fail-closed한다.
  - `packages/contracts/src/vocabulary/native-spatial.test.ts` 8개 테스트 및 contracts build 통과.

## R3 — affordance·spatial gate와 baseline ratchet

- Depth: `core`
- Status: `complete`
- Depends on: R2
- Scope:
  - 후보 검토, semantic-native 우선, primary state change, fallback 제한
  - reserve fit, 최소 조작 크기, vertical flow, label clearance, roundtrip
  - report-only baseline + changed-scope hard ratchet
- Definition of done:
  - [x] 신규·변경 활동의 새 위반은 report-only 중에도 실패한다.
  - [x] 기존 released 부채만 명시적 baseline으로 남는다.
  - [x] waiver가 activity+gate, owner, reason, expiry를 요구한다.
  - [x] gate별 hard 승격 조건이 코드 또는 문서와 테스트에 반영된다.
  - [x] bounds profile 요구는 신규·변경 활동이 사용하는 도구로 한정된다.
  - [x] screenshot 완전 일치 대신 tolerance 기반 구조 측정을 사용한다.
- Verification:
  - [x] 관련 gate schema/function tests
  - [x] 초기 baseline ratchet 상태 검증과 신규 위반 차단 함수 테스트
- Evidence/notes:
  - `packages/contracts/src/catalog/native-spatial-gates.ts`에 gate ID, baseline/waiver schema, changed-scope ratchet, hard 승격 조건을 추가했다.
  - `research/mathcanvas/native-spatial-gate-state.json`은 `currentIssues`와 `changedActivityIds`를 포함한 초기 ratchet 상태이며 verifier가 `evaluateNativeSpatialRatchet`를 실제 호출한다. blocking issue와 expired waiver는 종료 코드 1로 막는다.
  - 관련 contracts tests 3개 통과 및 `pnpm native-spatial:verify` 통과.

## R4 — 나눗셈 후보 rubric과 background deep probe

- Depth: `core`
- Status: `blocked`
- Depends on: R2, R3
- Candidates: `NO01SC`, `NO01NR`, `NO07IC`, `NO04NG`
- Definition of done:
  - [ ] 모든 후보를 묶음 생성, 동일 크기 표현, 나머지 가시성, payload state change, lifecycle, 화면 품질의 같은 rubric으로 평가한다.
  - [ ] 최소·대표·최대 variant를 관측한다.
  - [ ] initial, selected, core manipulation, undo/reset, actual save/reopen를 관측한다.
  - [ ] non-pointer 경로의 존재 여부를 기록한다.
  - [ ] environment fingerprint와 immutable evidence ID가 있다.
  - [ ] 토큰·쿠키·계정 ID·비공개 원문이 sanitized evidence에 없다.
  - [ ] 도구 우선순위는 이름이 아니라 rubric 결과에서 도출된다.
- Verification:
  - [x] 전용 headless profile만 사용
  - [x] 사용자의 Chrome·화면·포커스 미사용
  - [x] candidate comparison report 또는 bounded evidence 생성
- Evidence/notes:
  - `scripts/contract-lab/capture-page.mjs --headless --path /ko/myCanvas --login-timeout-ms 0`를 전용 background probe로 실행했으나 `auth-required`로 중단됐다.
  - probe는 write 0회이며 사용자 Chrome·화면·포커스를 건드리지 않았다. 실제 저장·재열기·핵심 조작을 관측하지 못했으므로 후보를 live verified로 승격하지 않는다.
  - `research/mathcanvas/division-native-candidate-rubric.json`에 `NO01SC`, `NO01NR`, `NO07IC`, `NO04NG`의 static catalog evidence, 미검증 live 상태, blocker와 다음 probe 조건을 sanitized 형태로 기록했다.

## R5 — 선정 도구 release GO/NO-GO

- Depth: `core`
- Status: `complete`
- Depends on: R4
- Definition of done:
  - [x] 후보별 static evidence와 live 미검증 blocker가 기록된다. (인증 차단으로 교육·기술 우선순위는 아직 선정하지 않음)
  - [x] captured-only 후보를 probe 성공만으로 활동에 넣지 않는다.
  - [ ] 진행 시 `captured → contracted → verified → released` evidence가 모두 존재한다. (NO-GO 분기이므로 비적용)
  - [x] 새 package, 범용 solver, raw passthrough 없이 기존 seam에서 구현된다.
  - [x] 범위가 크게 확장되면 사용자에게 비용과 범위를 보고하고 확인받는다. (이번에는 확장하지 않음)
  - [x] 모든 후보 탈락 시 현행 점+펜 유지와 `verified` 상태가 정상 fallback으로 기록된다.
  - [x] `NO04NT`가 primary math state-change gate를 만족하지 못한다는 점이 명시된다.
- Gate:
  - [ ] GO — R6 이후 진행
  - [x] NO-GO — native 장식 없이 현행 유지, 결과 보고 후 종료
- Evidence/notes:
  - `research/mathcanvas/division-native-candidate-rubric.json`의 decision은 `no-go-until-live-native-probe`다.
  - 현재 나눗셈 활동은 검증된 점+펜 fallback을 유지한다. native 장식만 추가하거나 `NO04NT`를 primary state-change로 주장하지 않는다.

## R6 — selected tool spatial adapter와 deterministic layout pipeline

- Depth: `core`
- Status: `blocked`
- Depends on: R5 GO (R5 NO-GO로 release adapter는 보류)
- Definition of done:
  - [ ] 선택 도구의 spatial contract가 adapter lookup에 연결된다.
  - [ ] selection은 content만 읽고 sizing/fit/growth 결과를 재입력하지 않는다.
  - [ ] `itemPitch`가 variant 상수다.
  - [ ] growth는 `reserveBox` 기준 단일 누적 패스다.
  - [ ] horizontal→stacked/multi-row 같은 fallback은 최대 한 번이고 width를 엄격히 줄인다.
  - [ ] fallback 뒤에도 맞지 않으면 hard error다.
  - [ ] core resolver에 활동 ID 분기가 없다.
  - [ ] per-item 좌표 보정과 최소 크기 이하 downscale이 없다.
  - [ ] selected chrome, 다음 블록, 다음 문항이 max variant에서 겹치지 않는다.
- Verification:
  - [ ] selector determinism test
  - [ ] monotone fallback test
  - [ ] max reserveBox flow test
  - [ ] unsupported/unbounded/stale failure tests
- Evidence/notes:
  - `packages/mathcanvas-compiler/src/resolve/native-spatial-layout.ts`에 selected-tool과 분리된 bounded layout seam을 추가하고 variant selection, reserve placement, single-pass vertical flow를 단위 테스트했다. variant는 primary+optional fallback 최대 2개이며 fallback required width의 엄격한 감소와 overflow를 검사한다.
  - selected native contract adapter 연결과 activity release는 R5의 live evidence가 생길 때까지 보류한다.

## R7 — 나눗셈 native workbench 활동 재설계

- Depth: `core`
- Status: `blocked`
- Depends on: R5 GO, R6
- Definition of done:
  - [ ] 학생 결정이 몫과 나머지이며 처음 상태에서 미해결이다.
  - [ ] 오개념 기반 대안이 적어도 3개이고 rejectable surplus가 있다.
  - [ ] 네이티브 조작이 같은 수씩 묶기와 남는 수를 실제 수학 상태로 표현한다.
  - [ ] `묶음 수 × 묶음마다의 수 + 남은 수 = 전체 수`를 학생 구성에서 확인할 수 있다.
  - [ ] 나머지가 묶는 수보다 작다는 사실을 관찰할 수 있다.
  - [ ] `NO04NT`는 답 기록·수정 보조로만 사용된다.
  - [ ] 정답이 locked text, 지시문, 완성 그림에 노출되지 않는다.
  - [ ] 예상→구성→설명→수정 순서가 화면 위→아래와 일치한다.
  - [ ] 3단계 이상 지시는 번호가 있고 교실에서 읽을 수 있는 문장이다.
  - [ ] 예상·설명 쓰기 공간, 라벨 정렬, 그룹 중심, `minGap`이 유지된다.
  - [ ] MathCanvas에 없는 자동채점·단계 강제·피드백을 주장하지 않는다.
- Verification:
  - [ ] cognitive manifest/hash/learning-map binding
  - [ ] classroom language predicate
  - [ ] labeled group/text fit/no-overlap predicates
  - [ ] primary native math-state-change predicate
- Evidence/notes:
  - R5 NO-GO에 따라 native workbench를 구현하지 않는다. 현재 점+펜 활동은 `verified` fallback으로 유지한다.

## R8 — 정적 variation·spatial·품질 검증

- Depth: `core`
- Status: `blocked`
- Depends on: R6, R7
- Definition of done:
  - [ ] 활동 variation 전수와 선택 native 최소·최대 variant가 컴파일된다.
  - [ ] visualBox/container/canvas fit이 통과한다.
  - [ ] selected reserveBox와 task-relevant manipulated state가 보호 영역과 겹치지 않는다.
  - [ ] undo/reset, target fit, label clearance, text fit, minGap을 검사한다.
  - [ ] native 도구 공존 시 z-order, local UI, handle 충돌을 검사한다.
  - [ ] empty/error/unsupported variant가 원인별로 fail-closed한다.
  - [ ] 1280×800 CSS px 환산 기준의 글자·조작·쓰기·drop slack 하한을 통과한다.
  - [ ] 관련 없는 테스트나 중복 변조 조합을 추가하지 않는다.
- Verification:
  - [ ] 관련 package unit tests
  - [ ] targeted visual audit
  - [ ] targeted quality audit
- Evidence/notes:
  - native selected variant가 없어 R8의 native-specific release 검증은 실행하지 않는다. generic spatial seam의 targeted tests만 R6 evidence로 남긴다.

## R9 — 실제 background canary suite

- Depth: `core`
- Status: `blocked`
- Depends on: R8
- Definition of done:
  - [ ] offline checks 통과 후에만 실행한다.
  - [ ] 전용 headless profile을 사용하고 사용자의 화면을 빼앗지 않는다.
  - [ ] 최소·최대·wrap/stack·known-good 대조군을 포함한 4–6 case가 있다.
  - [ ] initial/selected/manipulated/undo-reset/reopened 캡처와 측정이 있다.
  - [ ] 실제 save/load 경계를 통과한다.
  - [ ] 동일 저장 결과를 두 번 재열어 normalized measurement가 tolerance 내에서 동일하다.
  - [ ] blueprint/layout/spatial-contract/tool/font/asset/harness fingerprint와 결속된다.
  - [ ] 실제 캡처에서 겹침·정렬·글자 크기·교실 용어 P0/P1이 0이다.
  - [ ] 한 프로젝트에 suite를 담지 못하면 최소 추가 write와 이유가 기록된다.
- Verification:
  - [ ] persistent lifecycle evidence
  - [ ] sanitized canary JSON
  - [ ] 실제 preview 경로
- Evidence/notes:
  - 인증이 확보되기 전에는 native activity canary를 만들지 않는다. R4의 auth-blocked probe 기록만 유지하며 사용자의 Chrome을 호출하지 않는다.

## R10 — 최종 검증, support state, commit·push

- Depth: `core`
- Status: `in_progress`
- Depends on: R1–R9 또는 R5 NO-GO 종료 조건
- Definition of done:
  - [ ] `pnpm cognitive:verify` 통과
  - [ ] `pnpm check` 통과
  - [ ] sol xhigh가 최종 diff와 evidence를 검토하고 P0/P1이 없다.
  - [ ] persistent fresh canary와 현재 hash가 있을 때만 대상 활동이 `released`다.
  - [ ] 증거가 부족하거나 R5가 NO-GO면 대상 활동은 `verified`를 유지한다.
  - [ ] 관련 없는 사용자 변경이 commit에 포함되지 않는다.
  - [ ] 의미 있는 단위별 commit 메시지가 의도를 설명한다.
  - [ ] `main`과 `origin/main` 동기화가 확인된다.
  - [ ] 최종 보고에 선택/탈락 근거, 상태 전후 수학 evidence, 캡처, 테스트, 제한 사항이 있다.
- Evidence/notes:
  - `pnpm check`는 178개 테스트, build, native ratchet, division rubric verifier, cognitive, visual 100점, quality P0/P1 0건으로 통과했다. 현재 목표는 R5 NO-GO 종료 조건의 fallback 상태 검증과 native spatial foundation의 안전한 인계다.
  - `mathcanvas-learning-design` 스킬 변경은 `/Users/yubyeongju/.codex/skills/mathcanvas-learning-design/SKILL.md`의 로컬 skill 파일에 반영되며 이 저장소 commit에는 포함되지 않는다.

## Scaffold debt — 이번 범위에서 추적만 하는 항목

- Status: `pending`
- Depth: `scaffold`
- Items:
  - [ ] 기존 released 활동 전체의 native spatial evidence 백필 목록
  - [ ] 나눗셈 외 도구 쌍의 pairwise interaction matrix
  - [ ] gate별 report-only→hard 전환 현황
- Definition of done:
  - [ ] 실제 baseline/ratchet seam에 연결되어 있으며 별도 progress 문서를 만들지 않는다.
  - [ ] 이번 core release를 막지 않는 이유와 후속 owner/expiry가 이 파일의 notes에 기록된다.
- Evidence/notes:
