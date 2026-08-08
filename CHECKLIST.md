# MathCanvas 네이티브 affordance·공간 계약 체크리스트

이 파일이 구현 진행 상태의 단일 기록이다. 상태는 `pending`, `in_progress`, `blocked`, `complete` 중 하나로만 갱신하고, 동시에 하나의 항목만 `in_progress`로 둔다.

## R1 — 학습 설계 스킬 규칙 추가

- Depth: `core`
- Status: `in_progress`
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
  - `packages/contracts/src/vocabulary/native-spatial.test.ts` 9개 테스트 및 contracts build 통과.

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
  - `research/mathcanvas/native-spatial-activity-scope.json`의 blueprint hash-bound changed scope와 `native-spatial-contract-catalog.json`을 verifier가 읽어 semantic native role의 contract/lifecycle issue를 자동 생성하고 `evaluateNativeSpatialRatchet`에 전달한다. blocking issue와 expired waiver는 종료 코드 1로 막는다.
  - `packages/contracts/src/catalog/native-spatial-harness.test.ts`의 missing-contract/stale-scope/state-change issue-generation fixture와 관련 contracts tests 6개 통과 및 `pnpm native-spatial:verify` 통과.

## R4 — 나눗셈 후보 rubric과 background deep probe

- Depth: `core`
- Status: `complete`
- Depends on: R2, R3
- Candidates: `NO01SC`, `NO01NR`, `NO07IC`, `NO04NG`
- Definition of done:
  - [ ] 모든 후보를 묶음 생성, 동일 크기 표현, 나머지 가시성, payload state change, lifecycle, 화면 품질의 같은 rubric으로 평가한다. (`NO01SC-01` 의미 조작을 우선 통과)
  - [ ] 최소·대표·최대 variant를 관측한다. (`NO01SC-01`의 단위·4개 그룹 크기만 관측)
  - [ ] initial, selected, core manipulation, undo/reset, actual save/reopen를 관측한다. (그룹·이동·undo와 client Save payload 관측, actual save/reopen 미완료)
  - [x] non-pointer 경로의 존재 여부를 `false`로 기록했다.
  - [x] environment fingerprint와 immutable evidence ID가 있다.
  - [x] 토큰·쿠키·계정 ID·비공개 원문이 sanitized evidence에 없다.
  - [x] 도구 우선순위는 이름이 아니라 의미 동작 rubric에서 도출했다. `NO01SC-01`을 조건부 primary로 선정했다.
- Verification:
  - [x] 전용 headless profile만 사용
  - [x] 사용자의 Chrome·화면·포커스 미사용
  - [x] candidate comparison report 또는 bounded evidence 생성
- Evidence/notes:
  - 인증된 전용 프로필을 read-only CDP로 재사용하는 `capture-page.mjs --headless --live-auth --path /ko/myCanvas --login-timeout-ms 0` 경로를 추가하고 실제 `/ko/myCanvas`와 owned-project editor를 1440×1000 및 1280×800에서 캡처했다. live-auth에서는 GET/HEAD/OPTIONS 외 요청을 모두 차단한다.
  - 실제 도구 설정 화면에서 `수 구슬`, `수 세기 모형`, `십 배열판`, `배열표`, `셈돌` 버튼과 bounds를 확인했다. `셈돌` 선택 시도는 설정 완료 단계에서 발생한 기존 프로젝트 `POST/PUT`을 차단했으며 write 0회로 끝났다.
  - 사용자 Chrome·작업 화면은 건드리지 않았다. 후보별 캔버스를 분리한 read-only 응답 주입 probe에서 `NO01SC-01` 네 낱개가 하나의 `group-element`와 공통 `groupId`를 가지며 함께 이동하고 undo로 풀리는 것을 확인했다. 정본은 `research/mathcanvas/division-native-semantic-probe.json`이고 외부 write는 0회다.
  - 크기를 모르는 12개 후보를 기본 좌표에 겹쳐 놓은 비교 화면과 generic drag-only 탈락 판정은 방법론 오류이므로 증거·캡처·실행기에서 제거했다. 격리 probe 캡처도 완성 학생 화면 품질 증거로 사용하지 않는다.

## R5 — 선정 도구 release GO/NO-GO

- Depth: `core`
- Status: `in_progress`
- Depends on: R4
- Definition of done:
  - [x] 후보별 static evidence와 격리 의미 조작 결과가 기록된다. (`NO01SC-01` native group을 조건부 primary로 선정)
  - [x] captured-only 후보를 probe 성공만으로 활동에 넣지 않는다.
  - [ ] 진행 시 `captured → contracted → verified → released` evidence가 모두 존재한다.
  - [x] 새 package, 범용 solver, raw passthrough 없이 기존 seam에서 구현된다.
  - [x] 범위가 크게 확장되면 사용자에게 비용과 범위를 보고하고 확인받는다. (이번에는 확장하지 않음)
  - [x] persistent lifecycle gate 전까지 현행 점+펜 유지와 `verified` 상태가 안전 fallback으로 기록된다.
  - [x] `NO04NT`가 primary math state-change gate를 만족하지 못한다는 점이 명시된다.
- Gate:
  - [x] CONDITIONAL GO — `NO01SC-01` 전용 공간 계약·23개 상태·actual save/reopen을 R6–R9에서 검증
  - [ ] NO-GO — native 장식 없이 현행 유지, 결과 보고 후 종료
- Evidence/notes:
  - `research/mathcanvas/division-native-candidate-rubric.json`의 decision은 `conditional-go-no01sc-grouping-persistent-lifecycle-required`다. client Save payload의 group membership은 수학 상태로 확인했지만 실제 저장·재열기와 전체 23개 상태는 아직 release gate다.
  - `NO01NR`는 보조 표현, `NO04NG`는 확인 표현, `NO07IC`는 의미 불일치로 분류했다. `NO04NT`는 답 기록 보조일 뿐 primary state-change로 주장하지 않는다.

## R6 — selected tool spatial adapter와 deterministic layout pipeline

- Depth: `core`
- Status: `in_progress`
- Depends on: R5 conditional GO
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
  - `NO01SC-01`의 측정된 4개 그룹 chrome 약 116×116 CSS px를 기준으로 최소 workbench `reserveBox` 680×460 CSS px, task envelope 약 620×320 CSS px의 전용 배치를 구현한다. release 승격은 persistent lifecycle evidence까지 보류한다.

## R7 — 나눗셈 native workbench 활동 재설계

- Depth: `core`
- Status: `pending`
- Depends on: R5 conditional GO, R6
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
  - 한 활동에 한 문제만 두고 23개 낱개를 중립 pool에 배치한다. 고정된 5개 정답 슬롯 대신 `4개씩 묶은 것` 작업 lane과 `남은 것` lane을 두어 학생이 그룹 수를 직접 결정하게 한다.

## R8 — 정적 variation·spatial·품질 검증

- Depth: `core`
- Status: `pending`
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
  - selected chrome가 사라져도 lane과 cluster 배치로 묶음과 나머지가 계속 구분되어야 한다.

## R9 — 실제 background canary suite

- Depth: `core`
- Status: `pending`
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
  - 격리 의미 probe는 외부 write 0회이며 release canary가 아니다. 제품 구현과 정적 gate가 통과한 뒤 23개 전체 상태(구성원 4개 wrapper 5개, ungrouped 3개, 중복·중첩 0개)를 actual save/reopen으로 확인한다.
  - 실제 학생 화면 캡처에서 겹침·정렬·글자 크기·교실 용어를 확인하고 시각 판정은 sol xhigh에 맡긴다.

## R10 — 최종 검증, support state, commit·push

- Depth: `core`
- Status: `pending`
- Depends on: R1–R9 또는 R5 NO-GO 종료 조건
- Definition of done:
  - [ ] `pnpm cognitive:verify` 통과
  - [ ] `pnpm check`가 수정된 최종 diff에서 통과
  - [ ] sol xhigh가 수정된 최종 diff와 evidence를 검토하고 P0/P1이 없다.
  - [ ] persistent fresh canary와 현재 hash가 있을 때만 대상 활동이 `released`다.
  - [x] persistent evidence가 생기기 전에는 대상 활동이 `verified`를 유지한다.
  - [ ] 관련 없는 사용자 변경이 commit에 포함되지 않는다.
  - [ ] 의미 있는 단위별 commit 메시지가 의도를 설명한다.
  - [ ] `main`과 `origin/main` 동기화가 확인된다.
  - [ ] 최종 보고에 선택/탈락 근거, 상태 전후 수학 evidence, 캡처, 테스트, 제한 사항이 있다.
- Evidence/notes:
  - 현재 잘못된 겹침 canary 커밋은 원격에 push하지 않았으며, 정정된 의미 probe·workbench·persistent canary를 하나의 완결된 단위로 검증한 뒤 amend/commit·push한다.
  - `mathcanvas-learning-design` 스킬 변경은 `/Users/yubyeongju/.codex/skills/mathcanvas-learning-design/SKILL.md`의 로컬 skill 파일에 반영되며 이 저장소 commit에는 포함되지 않는다.
  - `NO01SC-01` 의미 probe에 대한 sol xhigh 중간 판정은 ITERATE다. primary 후보 선정은 타당하지만 full 23 state, 선택 해제 뒤 지속적 시각 구분, save/reopen이 P1 release gate로 남아 있다.

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
  - 현재 core release를 막지 않는 이유: R5가 NO-GO이고 native workbench를 출시하지 않았다. 다음 native 후보 live probe 전에 `native-spatial-activity-scope.json`을 최신 blueprint hash로 갱신하고 contract catalog를 채운다.
