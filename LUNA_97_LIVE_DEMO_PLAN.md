# Luna 97개 실제 MathCanvas 완성 계획

## 0. 목적과 마감

- 마감: **2026-08-14 23:00 KST**
- 최종 결과: 담당자 앞에서 실제 MathCanvas 계정으로 97개 프로젝트를 열고, 학년·영역·화면·엔진별 시연을 즉시 전환할 수 있다.
- 진행률의 유일한 분자: `actualLiveReopenedStandardCount`.
- 정적 compile, unit test, review 승인, report row는 진행률로 세지 않는다.
- 현재 실제 진행률 기준선: 새 attestation 기준 `2/97`까지 생성·재열기 후 W003 geometry 실제 렌더링에서 중단. 이전 대표 7개 실행은 진행률에서 제외한다.

## 1. Inherited Project Gates

다음 규칙은 약화하거나 우회하지 않는다.

1. `/Users/yubyeongju/.codex/skills/mathcanvas-learning-design/SKILL.md`
2. `AGENTS.md`
3. `core.hooksPath=.githooks`
4. 직접 `/api/project` 쓰기 금지
5. canonical writer와 현재 content attestation 사용
6. `pnpm cognitive:verify`, `pnpm check`, visual/quality P0/P1 0
7. 학생 화면에는 내부 코드·설계 용어를 노출하지 않으며, 한 문장에 한 행동을 쓴다.
8. native 도구는 실제 화면 크기·선택 chrome·조작·저장·재열기를 증명한다.

오늘 sprint에서는 기존 W001/W002 curriculum governance를 **동결**한다. 이 sprint의 목표는 curriculum state machine 확장이 아니라 실제 97개 시연 완성이다.

## 2. Confirmed Decisions

### 학습자와 운영자

- 학습자: 2022 개정 교육과정 초등학생, 1~6학년 수준.
- 운영자: MathCanvas 담당자 앞에서 시연하는 교사/기획자.
- 문장: 교사가 그대로 읽어도 초등학생이 즉시 행동할 수 있는 한국어.
- 핵심 학습 흔적: 화면에 남는 선택 또는 조작 상태. 지원되지 않는 자동채점·단계 강제·저장 기능을 주장하지 않는다.

### 범위

- 성취기준: 97/97
- target outline 문항: 237/237
- renderer: 7/7
  - geometry 36
  - number-card 23
  - place-value 12
  - table-graph 10
  - fraction 8
  - pattern 6
  - clock 2
- engine class: 23/23
- 실제 프로젝트: 97개
- 실제 full interaction save/reopen: renderer 7/7
- 실제 engine scenario evidence: 23/23

### Non-Goals

- W001/W002 재계획 문서 추가
- Sol review board 또는 no-family 상태 머신 확장
- 자동채점 신설
- MathCanvas가 지원하지 않는 response persistence 구현 주장
- 97개를 서로 완전히 다른 UI로 만드는 것
- 대표 7개만 만들고 완료로 처리하는 것
- 하나의 성취기준을 완벽하게 만들기 위해 나머지 96개를 멈추는 것

## 3. 오늘의 권위 데이터 모델

### `LiveDemoCase` (`core`)

각 97개에 반드시 저장한다.

- `workItemId`
- `standardCode`
- `targetOutlineKeys`
- `rendererKind`
- `engineClassIds`
- `projectId`
- `editorUrl`
- `staticAttestationSha256`
- `payloadHash`
- `reopenedPayloadHash`
- `allTargetObjectsAttached`
- `learnerCopyVisible`
- `nativeObjectsRendered`
- `nativeObjectsUsable`
- `noOverflow`
- `screenshotPath`
- `status: pending | passed | failed`
- `failureCodes[]`

### `InteractionEvidence` (`core`)

- `rendererKind`
- `engineClassId`
- `projectId`
- `initialStateHash`
- `manipulatedStateHash`
- `saveStatus`
- `reopenedStateHash`
- `actualMathStateChanged`
- `screenshotBefore`
- `screenshotAfter`

### `FailureCluster` (`core`)

- `rendererKind`
- `failureCode`
- `affectedWorkItemIds[]`
- `rootCauseFile`
- `attempt` (최대 2)
- `sharedFix`
- `status`

### `SprintState` (`core`)

- `sprintId: luna-97-live-demo-2026-08-14`
- `activeStage`
- `actualLiveReopenedStandardCount`
- `actualAttachedTargetCount`
- `rendererPassCount`
- `engineEvidenceCount`
- `interactionSaveReopenCount`
- `failureClusters[]`
- `lastCommand`
- `updatedAt`

권위 파일은 `reports/portfolio-scale/luna-97-sprint/latest.json` 하나다. Board, commit 수, 정적 row 수는 진행률 소스가 아니다.

## 4. Module Seams

1. **Static compiler** (`core`): 97개 payload와 current attestation을 만든다.
2. **Resumable live runner** (`core`): 실제 계정 create/update, exact reopen, DOM/크기 검사, screenshot을 수행한다. 한 항목 실패로 전체를 중단하지 않고 97개 끝까지 스캔한다.
3. **Renderer probes** (`core`): geometry/number/place/table/fraction/pattern/clock의 실제 렌더링과 학생 조작을 renderer별로 검사한다.
4. **Interaction runner** (`core`): 7 renderer와 23 engine class의 실제 조작·저장·재열기 증거를 수집한다.
5. **Demo catalog** (`core`): 97개 전체 링크와 12개 대표 시연 시나리오를 한 화면에서 연다.
6. **Sprint guard** (`core`): Luna가 frozen governance, 대표 모드, 직접 writer, evidence 없는 commit/push를 실행하지 못하게 한다.

stub은 두지 않는다. 자동채점·학생 분석·운영 대시보드는 이번 범위 밖이다.

## 5. Hook으로 강제하는 실행 계약

### 새 권위 파일

- `scripts/portfolio-scale/luna-97-sprint-plan.json`
- `reports/portfolio-scale/luna-97-sprint/latest.json`
- `scripts/hooks/luna-97-sprint-guard.mjs`

### PreToolUse 차단

아래 명령은 sprint 완료 전 항상 거부한다.

- `--representative`
- 직접 `/api/project` POST/PUT/PATCH/DELETE
- `portfolio:demo:create`
- `curriculum:sol-review:*`
- `curriculum:no-family-plan:update`
- W001/W002 replan·board 갱신 명령
- final gate 이전 `git push`
- sprint state에 기록되지 않은 live writer

### pre-commit 차단

- frozen governance 파일 변경
- `luna-97-sprint/latest.json` 없이 learner-facing source 변경
- 실패 standard 하나만 고치는 전용 좌표·문구 patch
- 같은 failure cluster attempt 3 이상
- 실제 project ID, URL, reopen hash, screenshot이 없는 `passed`

### pre-push 차단

다음이 모두 아니면 main push를 거부한다.

- 97/97 actual create or update
- 97/97 exact reopen
- 237/237 target objects attached
- 97/97 native rendered and usable
- 97/97 overflow 0
- 7/7 renderer interaction save/reopen
- 23/23 engine evidence
- 97/97 screenshots
- current static attestation SHA 일치
- `pnpm check` PASS
- final live run 2회 연속 PASS

## 6. Breadth-First 실행 순서

### Stage 0 — 11:30~12:10: sprint guard와 resumable runner

1. 기존 writer를 항목별 `try/catch`로 바꿔 실패해도 97개를 끝까지 돈다.
2. 매 항목 직후 checkpoint를 원자 저장한다.
3. `--resume`는 passed project를 current hash로 재확인한 뒤 건너뛴다.
4. actual DOM은 `attached`와 `visible`을 구분하고, SVG `<g>` 자체의 CSS visibility가 아니라 실제 자식 도형의 union bounds를 측정한다.
5. hook에 sprint state와 frozen path를 연결한다.

Exit gate:

- 대표 모드가 차단된다.
- 실패 1개가 있어도 97개 결과와 failure cluster가 남는다.
- auth 401이면 어떤 프로젝트도 쓰지 않고 login stage로 돌아간다.

### Stage 1 — 12:10~13:10: 7 renderer actual canary

각 renderer의 최소·최대 변형을 실제 계정에서 연다.

- table-graph: 2개
- pattern: 2개
- geometry: 3개
- number-card: 3개
- place-value: 2개
- fraction: 2개
- clock: 2개

현재 첫 blocker는 W003 geometry의 `drawElem line` 실제 렌더링이다. geometry shared adapter를 먼저 고치되 W003 전용 patch는 금지한다.

Exit gate: 7/7 renderer에서 실제 native object가 보이고, 최소 1회 조작 가능하다.

### Stage 2 — 13:10~14:00: 97개 fail-soft full scan

97개를 실제 생성/갱신하고 끝까지 재열기한다. 중간 수정하지 않는다. 모든 실패를 아래 키로 묶는다.

- `auth`
- `api-write`
- `round-trip`
- `not-rendered`
- `too-small`
- `overflow`
- `copy`
- `interaction`
- `save-reopen`

Exit gate: 97개 모두 `passed` 또는 명시적 failure cluster에 포함된다. 미분류 실패 0.

### Stage 3 — 14:00~17:30: renderer cluster 수정

우선순위는 영향 수가 큰 순서다.

1. geometry 36
2. number-card 23
3. place-value 12
4. table-graph 10
5. fraction 8
6. pattern 6
7. clock 2

한 cluster 처리 절차:

1. root cause 1개를 재현한다.
2. shared adapter/preset/compiler를 한 번 수정한다.
3. 해당 renderer 전체를 실제 재실행한다.
4. 실패하면 두 번째이자 마지막 shared 수정 또는 이미 released인 더 단순한 native 표현으로 교체한다.
5. 세 번째 schema/replan을 만들지 않는다.

Exit gate: actual live reopen 97/97, native rendered/usable 97/97.

### Stage 4 — 17:30~19:30: 237문항과 23 engine 실제 증거

1. 237개 target item의 질문·선택·native 증거 영역 DOM attached를 검사한다.
2. 23 engine class 각각 최소 1개 project를 연다.
3. 7 renderer 각각 실제 학생 조작→저장→내 캔버스 이동→재열기를 수행한다.
4. 조작 전후 mathematical state hash가 같으면 실패다.

Exit gate: 237/237, 23/23, 7/7.

### Stage 5 — 19:30~21:00: 담당자용 demo catalog

실제 project ID만 소비하는 시연 화면을 만든다.

- 전체 97개 검색/필터: 학년, 영역, renderer, engine
- 12개 대표 시연 순서
  - 저학년 수와 연산 2
  - 규칙 2
  - 도형 2
  - 측정 2
  - 분수 1
  - 자료/그래프 2
  - 시계 1
- 각 항목에 학생 질문, 시연 행동, 확인할 수학 근거, project 링크 표시
- “열기” 클릭 한 번으로 실제 MathCanvas project로 이동
- 내부 코드 R22/D01A/Wxxx는 화면에서 숨김

Exit gate: 담당자 앞에서 12개 시나리오를 순서대로 열 수 있고, 전체 97개도 검색 가능하다.

### Stage 6 — 21:00~22:30: 최종 두 번의 release run

중간 review는 없다. 다음을 두 번 연속 실행한다.

1. static current attestation
2. 97/97 exact reopen
3. 237/237 DOM
4. 7/7 interaction save/reopen
5. 23/23 engine evidence
6. screenshot/current hash
7. `pnpm check`

두 실행 사이 source 변경이 있으면 횟수는 다시 0부터 센다.

### Stage 7 — 22:30~23:00: 최종 handoff

- main commit/push
- worktree clean
- 97개 링크 manifest
- 12개 demo script
- current attestation SHA
- 실패 0인 final report
- 실제 시연 시작 명령 1개

## 7. 실패 처리 규칙

1. 한 항목 때문에 전체 scan을 멈추지 않는다.
2. 같은 renderer의 동일 증상은 한 cluster로 처리한다.
3. standard 전용 좌표 patch는 금지한다.
4. 한 cluster의 code attempt는 2회다.
5. 2회 실패 시 새 governance를 만들지 않고 검증된 native tool/layout으로 교체한다.
6. 수정 후 static test보다 해당 renderer actual live를 먼저 확인한다.
7. progress 보고는 `실제 재열기 N/97`만 사용한다.
8. Luna는 10개 처리마다 실제 숫자와 failure cluster만 보고한다. 승인·커밋 수는 보고하지 않는다.

## 8. Risk Ledger

| 위험 | 방지책 | 차단 여부 |
|---|---|---|
| 일반 Chrome과 전용 profile 로그인 불일치 | 시작 시 `/api/auth/me=200`과 persistent cookie/token 확인 | P0 |
| 첫 실패에서 batch 중단 | fail-soft 97 scan + atomic checkpoint | P0 |
| 정적 payload는 있으나 실제 DOM 미렌더링 | actual child union bounds + screenshot | P0 |
| 긴 canvas의 offscreen SVG를 invisible로 오판 | `attached`와 viewport visibility 분리, item별 scroll 측정 | P0 |
| 한 표준에 재집착 | renderer cluster + attempt 2 hard cap | P0 |
| representative 7을 완료로 오인 | hook에서 `--representative` 금지 | P0 |
| live report가 source와 stale | content attestation SHA exact equality | P0 |
| 자동채점·저장 과장 | 실제 network PUT/readback이 없는 기능은 demo 설명에서 제외 | P0 |
| 97개가 같은 화면처럼 보임 | 7 renderer/23 engine/12 scenario catalog를 실제 링크로 제시 | P1 |
| 검수 루프 재발 | final review 1회, review artifact 신설 금지 | P0 |

## 9. Definition of Done

다음 JSON 등식이 모두 참일 때만 “시연 가능”이라고 말한다.

```text
actualLiveCreatedOrUpdated == 97
actualLiveExactReopen == 97
actualTargetObjectsAttached == 237
actualNativeRenderedAndUsable == 97
overflowFailureCount == 0
elementaryCopyFailureCount == 0
rendererInteractionSaveReopen == 7
engineClassEvidence == 23
screenshotCount == 97
demoScenarioCount >= 12
consecutiveGreenReleaseRuns == 2
fullCheckPassed == true
worktreeClean == true
originMainEqualsHead == true
```

하나라도 거짓이면 진행 중이며, 완료·시연 가능·97% 같은 표현을 쓰지 않는다.

## 10. Luna 실행 지시

1. 이 파일을 세션 첫 입력으로 읽는다.
2. Stage 0 hook과 resumable runner가 없으면 다른 source를 수정하지 않는다.
3. `scripts/portfolio-scale/luna-97-sprint-plan.json`의 `activeStage` 밖 작업을 하지 않는다.
4. W001/W002 governance 파일을 수정하지 않는다.
5. review를 요청하지 않고 actual live failure를 수집·cluster·수정한다.
6. 한 renderer를 두 번 실패하면 새 schema 대신 released native fallback을 사용한다.
7. 10개마다 `actualLiveReopenedStandardCount/97`을 보고한다.
8. 최종 두 번 연속 green 전 commit/push하지 않는다.
9. 최종 보고에는 97개 URL manifest와 12개 시연 순서를 포함한다.
