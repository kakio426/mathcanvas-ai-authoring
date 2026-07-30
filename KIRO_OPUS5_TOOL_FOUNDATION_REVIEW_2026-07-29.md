# Kiro Opus 5 도구 기반 검토

## 검토 환경

- reviewer: Kiro CLI
- model: `claude-opus-5`
- effort: `max`
- mode: read-only review
- date: 2026-07-29

## 1차 판정

`CONDITIONAL PASS`

제품 안전 불변조건, 기존 payload/hash, public MCP 5개, create-only 흐름, raw/PII
격리는 통과했다. 다음 deep-probe 전에는 아래 항목을 수정하고 재검증하도록 판정했다.

## 지적과 조치

| ID | 심각도 | 지적 | 조치 |
|---|---|---|---|
| F1 | P1 | bundle registry 47번째 `DI01DICE`가 미조정 | bundle-only non-palette module로 사유·근거·variant·option 기록, 전체 registry reconciliation 검증 추가 |
| F2 | P2 | `bundleAnalyzedMathTools`가 50으로 오계산 | null/undefined 계산 수정, bundle count 3개 재계산 validator 추가 |
| F3 | P2 | 공통 factory 후보 7개 중 미발견 3개를 조용히 제거 | 7개 모두 기록하고 미발견은 `unknownReason`, found/missing count 검증 |
| F4 | P2 | manifest drift 테스트가 이름/key만 비교 | category/module/surface와 control matrix integration target까지 비교 |
| F5 | P2 | support transition helper가 제품에서 강제되지 않음 | 모든 manifest entry를 support history validator로 생성, released lifecycle evidence와 registry 양방향 동등성 테스트 |
| F6 | P2 | mismatch 테스트가 실제 mismatch를 실행하지 않음 | untyped boundary cast로 `common.formula` + `text` 교차 요청을 넣어 throw 검증 |
| F7 | P3 | research README와 P0 보고서 누락 | 두 문서 생성 |
| F8 | P3 | matrix adapter status가 registry 도입 전 명칭 | `registered`로 갱신 |
| F9 | P3 | module activation의 non-null assertion | 명시적 type guard로 제거 |

## 재검증 조건

- `pnpm typecheck`
- `pnpm test`
- `pnpm contract:verify`
- `pnpm golden:verify`
- `git diff --check`
- 수정 후 같은 Kiro Opus 5 모델의 재검토

재검증 PASS 전까지 contract-family deep-probe와 P1 진입을 금지한다.

## 동일 모델 재검증

- reviewer: Kiro CLI
- model: `claude-opus-5`
- effort: `max`
- date: 2026-07-29
- verdict: `PASS`

F1~F9는 모두 `CLOSED`로 판정됐다. 재검증 과정에서 Kiro가 직접 다음 명령과
불변조건을 다시 확인했다.

- `pnpm check`: 19 test files, 91 tests, typecheck와 전체 workspace build 통과
- `pnpm contract:verify`: 56 tool mappings, 18 editor controls, 46 bundle tools,
  304 variants, 66 options 통과
- `pnpm golden:verify`: activity spec, approval, compiled payload hash 불변
- `git diff --check`: 통과
- bundle snapshot과 control matrix의 raw 기반 재생성 결과 byte-identical
- public MCP surface 5개와 create-only 경계 불변
- `DI01DICE`를 포함한 bundle registry key 47개 전수 조정
- released manifest와 adapter registry의 양방향 집합 동등성
- count·registry reconciliation 변조 거부 테스트

## 재검증에서 새로 발견한 후속 항목

| ID | 심각도 | 내용 | 처리 시점 |
|---|---|---|---|
| N1 | P2 | 기존 released 4도구의 `verified`·lifecycle 근거가 실제 canary 왕복이 아니라 mock 테스트이며 단계별 증거가 중복될 수 있음 | deep-probe wave 1에서 필수 폐쇄 |
| N2 | P3 | 소스 manifest 오작성은 모듈 import 전체를 차단함. 현재는 CI가 잡는 개발 오류지만 향후 외부 데이터화 시 per-tool degrade 필요 | 구조 외부화 시 처리 |
| N3 | P3 | `.nvmrc`의 Node 24와 검증 실행 환경 Node 26.4.0이 다름 | wave 1과 병행 정리 |

최종 허용 범위는 contract-family deep-probe wave 1과 필요 시 wave 2까지다.
blueprint, layout, P1 진입은 계속 금지한다.

Wave 1은 다음을 필수 산출물로 가진다.

1. support history의 인덱스 fallback 제거와 단계별 명시 증거
2. 단계 간 증거 중복을 거부하는 불변조건
3. 전용 `AI-CONTRACT-PROBE-*` canary에서 분수 모형·텍스트·수식·사각형의
   생성→렌더→필요한 조작→저장→재열기→왕복 비교
4. 도구 adapter가 절대 좌표와 결합되지 않도록 계약 경계 결정
5. 같은 Kiro Opus 5의 독립 재검증

## Wave 1 1차 재검증

- verdict: `CONDITIONAL PASS`
- N1: `OPEN`

Kiro는 read-only probe가 실제 서버 재열기와 렌더를 증명하고 기존 프로젝트의
데이터·쓰기 위험을 낮게 통제한다고 확인했다. intent/placement 분리와 골든 무회귀,
public MCP 5개, create-only 경계도 통과했다.

다만 다음 문제로 N1을 닫지 않았다.

1. 보고서 선언값을 artifact에서 다시 계산하지 않아 위조 성공이 가능함
2. 24개 객체 중 released 4도구 합계가 22개로만 분류됨
3. probe payload `135033f9…`와 현재 골든 `fa0b8e75…`가 다름
4. 일부 manifest evidence fragment가 실제 문서 구조와 맞지 않음
5. `persistedMutationCount`가 전체 payload 비교값이 아니라 리터럴임
6. numeric tolerance 선언과 집행이 분리되고 큰 수 정규화 안전 상한이 없음

Codex는 1, 2, 4, 5, 6을 수정했다. 비식별 artifact를 함께 기록하고 validator가
제출 payload hash, 4도구 분류, 허용 오차, comparable hash, 조작 전후 전체 서버
payload를 직접 재계산한다. 분수 모형의 group wrapper 2개도 `NO03FM` 계약에
귀속해 4+4+8+8=24 불변식을 강제한다. tool/key/claim evidence fragment 해석기와
도구 간 released 근거 중복 거부를 추가했다.

3번은 새 canary가 필요한 외부 쓰기 경계다. 현재 골든을 사용하는
`AI-CONTRACT-PROBE-*` 프로젝트 생성 1건과 조작 저장 1건을 사용자에게 명시적으로
승인받기 전에는 실행하지 않는다.

## Wave 1 current-golden canary 최종 재검증

- reviewer: Kiro CLI
- model: `claude-opus-5`
- effort: `max`
- mode: read-only review
- verdict: `PASS`
- N1: `CLOSED`

사용자가 명시적으로 승인한 범위 안에서 현재 59객체 골든으로 전용
`AI-CONTRACT-PROBE-*` 프로젝트 1건을 만들고, 분수 모형 1개를 이동한 뒤 저장 1건과
재열기 검증을 수행했다. 이후의 recovery와 Kiro 검토는 모두 제품 write 없이
진행했다.

Kiro는 첫 current-golden 검토에서 F10–F17을 제기했다. 그중 released claim의
신뢰도와 clean-checkout 재현성에 직접 영향을 주는 항목을 다음처럼 수정했다.

| ID | 조치 |
|---|---|
| F10 | 최종 GET 기반 복구 비교를 `reconstructionConsistency`로 명명하고 `derivedFromFinalGet:true`를 강제 |
| F11 | 원래 create/save 횟수를 assertion으로, recovery write 횟수를 측정값으로 분리 |
| F12 | legacy 24객체 evidence를 manifest·기본 gate·테스트 의존성에서 제거 |
| F13 | viewBox의 유한 범위뿐 아니라 골든 콘텐츠 박스와 축별 25% 이상 겹침을 강제 |
| F14 | `undefined` 비교를 안전하게 처리하고 구조화된 issue를 반환 |
| F16 | Wave 1 보고서의 정본을 current-golden canary로 변경하고 legacy 자료는 appendix로 이동 |
| F19 | probe/artifact identity와 reconstruction 필드 불일치를 구조화된 issue로 거부 |

동일 모델의 재검증은 legacy evidence 파일을 물리적으로 제거한 clean-checkout
simulation에서도 `pnpm contract:verify`, 20개 test file의 103개 test,
전체 workspace build와 골든 검증이 통과함을 확인했다. 56개 도구의 118개 evidence
pointer도 실제 claim까지 해석된다.

원본 PUT 로그가 최초 실행 실패 전에 영속화되지 않았기 때문에 claim은 정직하게
`recoveryMode:true`를 유지한다. Kiro는 현재 문구의 4개 released claim을 뒷받침하기에
충분하다고 판정했으며, raw-log 등급을 올리기 위한 추가 save는 PASS 조건이 아니라고
확인했다.

### 잔여 항목 집중 재검증

Codex가 F13과 F19의 낮은 심각도 잔여를 보강한 뒤 같은 Kiro Opus 5가 다시 검토했다.

- F13 residual: `CLOSED`
- F19: `CLOSED`
- final verdict: `PASS stands`
- open residual: 없음
- 추가 제품 write: 없음

이 PASS는 Wave 2 공통 draw 계열 진입만 허용한다. 사용자 지시와 P0.5 게이트에 따라
전체 도구 계약이 끝나기 전에는 blueprint/layout/P1으로 넘어가지 않는다.

## Wave 2 계획 검토

- reviewer: Kiro CLI
- model: `claude-opus-5`
- effort: `max`
- mode: read-only plan review
- verdict: `CONDITIONAL GO`

Kiro는 `drawElem` factory의 기본 type token `"dot"`을 강한 정적 신호로 보면서도,
원·점·선 저장 객체의 실제 `svgId`, `type`, geometry를 증명하는 근거는 아니라고
판정했다. 추천안은 factory를 선도입하지 않고 다음 두 seam을 분리하는 것이다.

1. `native-draw-object`: 사각형만 contracted, 원과 점/선은 구조화된 unknown
2. `canvas-pen-elements`: `contentsJson`이 아니라 `canvasOption.penElements`를
   대상으로 하는 별도 payload-level contract

외부 write 없는 공개 fixture GET, unknown descriptor, fail-closed validator와
테스트는 GO다. read-only harvest가 실제 wire field를 얻은 경우에만 contracted까지
올릴 수 있고, lifecycle canary 전 verified/released 승격은 NO-GO다. 펜 adapter,
미관찰 draw union, P1 blueprint/layout도 NO-GO다.

live canary는 원·점·선 wire를 추측해서 POST하지 않고, 현재 골든 59객체만으로 전용
프로젝트를 만든 뒤 UI에서 직접 그려 저장 결과에서 계약을 발견하는 방식으로
설계해야 한다. 새 프로젝트 1건과 저장 1회는 새 명시 승인이 필요하며 펜은 별도
Wave 2b로 분리한다.

## Wave 2 구현 1차 검토

- verdict: `CONDITIONAL PASS`
- local gates: 22 files / 112 tests, build, contract, golden, diff PASS
- clean-checkout: PASS
- manifest evidence pointer: 121 / 121
- hash 재계산 뒤 변조: 18 / 18 거부

Kiro는 factory·intent·adapter 증가 0, support state와 MCP/create-only 불변,
pen 분리와 구조화된 거절을 모두 통과시켰다. 다만 F20으로 read-only 후보 탐지가
미관찰 factory ID를 `svgId` allowlist처럼 사용해 fixture 31개 중 29개를 명시적으로
회계하지 않았다고 지적했다.

같은 수정 묶음의 낮은 심각도 항목은 새 후보 발견 시 evidence를 잃는 F21,
`unresolved` 자기 참조를 쓰는 F22, 후보 0개라고 과장한 보고서 F23이었다.

Codex는 factory ID allowlist를 제거하고 31개 전체를 다음처럼 재분류했다.

- released 도구 또는 group wrapper: 30
- catalog 수학 module residual: `NO01SC-12` 1
- 설명 불가능 residual: 0

설명 불가능 residual이 생기면 committed gate는 계속 실패하지만, 비식별 파생
candidate를 로컬 sanitized 경계에 먼저 보존한다. circle·point-line의 관찰 근거는
자기 참조 `#key=unresolved` 대신 `#key=drawObservation`으로 바꿨다. GET-only
capture를 다시 실행했으며 결과는 GET 2회, 제품 write 0이다.

## Wave 2 구현 2차 검토

- verdict: `CONDITIONAL PASS`
- F20–F23: `CLOSED`

Kiro는 31/31 회계, candidate 보존, 문서 수정과 pointer 교체를 확인했다. 이어서
새 회계 게이트의 변조 저항성을 점검해 F24–F26을 제기했다.

- F24: 문자열만 맞춘 가짜 catalog module로 residual을 세탁할 수 있음
- F25: residual을 삭제하고 known count를 재균형하면 열거 근거 없이 통과
- F26: circle·point-line pointer를 `#key=unresolved`로 되돌리는 회귀를 거부하지 않음

Codex는 validator가 committed catalog의 실제 math-palette module key 집합을
받아 membership을 강제하도록 수정했다. 각 공개 source에는 값 없는
`svgId + type` histogram을 기록하고, histogram에서 재계산한 residual signature와
상세 분류를 양방향 비교한다. circle·point-line은 `#key=drawObservation`을 반드시
포함하고 `#key=unresolved`를 포함할 수 없다. 공격자가 canonical hash를 다시
계산한 변조 테스트를 세 항목에 추가했다.

## Wave 2 구현 최종 재검토

- reviewer: Kiro CLI
- model: `claude-opus-5`
- effort: `max`
- verdict: `PASS`
- F24: `CLOSED`
- F25: `CLOSED`
- F26: `CLOSED`

Kiro는 22개 test file의 116개 test, 8개 workspace build, contract/golden/diff,
clean-checkout과 121/121 pointer를 독립 재실행했다. 가짜 module 세탁,
residual 삭제·재균형, pointer 자기참조 변조는 공격자가 canonical hash를 다시
계산한 뒤에도 모두 거부됐다. candidate 보존 경로도 catalog 인자 추가 후 정상
동작하며 raw 값과 식별자 누출이 없음을 확인했다.

F27 Low는 raw 공개 응답을 영속화하지 않는 설계에서 불가피한 자기일관성 한계다.
Kiro는 비차단으로 판정했고, 고정 날짜 GET-only capture 후 byte-diff 절차와 builder
결정성 테스트를 추가하도록 권고했다. 이 절차를 문서화하고 자동 테스트를 추가했다.

Wave 2 read-only 단계는 최종 PASS지만 원·점·선은 여전히 `captured`다. lifecycle
canary와 support 승격은 새 프로젝트 1건과 저장 1회의 별도 명시 승인 전에는
실행하지 않는다.
