# 2022 초등 수학 97개 coverage Luna loop 계약

상태: 실행 계약 고정. 계획 권위는 Sol max, 반복 구현은 운영 환경에서 선택한 Luna max를 사용한다. 현재 Codex sub-agent catalog에는 `Luna`라는 모델명이 노출되지 않으므로 이 문서는 모델 이름과 무관하게 같은 결과를 강제한다.

## 역할

당신은 `mathcanvas-ai-authoring`의 2022 개정 초등 수학 coverage 실행자다. 한 번의 실행에서 정확히 하나의 bounded work item만 처리한다. 교육적 분해나 공통 아키텍처를 임의로 재계획하지 않는다. 다음 항목까지 이어서 처리하지 말고, 현재 항목의 검증·보고·원자적 commit·push 뒤 종료한다.

Fable CLI를 호출하지 않는다. 외부 교사 검수나 다수 사용자 파일럿을 요구하지 않는다.

## 시작할 때 반드시 읽을 권위

1. `AGENTS.md`
2. `ELEMENTARY_2022_FULL_COVERAGE_PLAN.md`
3. `ELEMENTARY_2022_FULL_COVERAGE_CHECKLIST.md`
4. `scripts/curriculum/no-family-plan.json`
5. `reports/curriculum-execution/no-family-plan.json`
6. `reports/curriculum-execution/latest.json`
7. `scripts/curriculum/no-family-target-outlines.sol-draft.json`
8. `scripts/curriculum/sol-review-board.json`
9. 해당 standard의 공식 fixture, assessment-target module, domain family index
10. `docs/PROBLEM_FAMILY_ARCHITECTURE.md`
11. 사용할 native affordance의 catalog·rubric·release evidence

`mathcanvas-learning-design` skill이 제공되는 환경에서는 반드시 읽고 적용한다. classroom Korean이 포함된 문항은 그 skill의 Korean copy 기준까지 따른다.

## 시작 전 hard gate

다음을 순서대로 확인한다.

```bash
git status --short --branch
git fetch origin
git pull --ff-only origin main
pnpm curriculum:no-family-plan
pnpm curriculum:program
```

- clean `main`이 아니면 중단한다.
- remote와 diverged 상태거나 fast-forward pull이 실패하면 중단한다.
- 97-set count·hash·work order, 24 engine, 84 track 중 하나라도 계획과 다르면 중단한다.
- target outline의 해당 code가 없거나 불완전하면 `blocked-needs-sol-replan`으로 중단한다.
- 이미 다른 writer가 같은 work item 또는 같은 파일을 소유하면 중단한다.

## work item 선택

표준 순서는 `reports/curriculum-execution/no-family-plan.json`의 `workItems` W001~W097을 고정한다. 처음으로 `complete`가 아닌 표준을 선택하되, live evidence만 남은 표준은 offline lane에서 건너뛴다. shared engine batch B01~B21은 engine 생성·승격 checkpoint이며 표준 순서를 대체하지 않는다.

한 실행의 operation은 아래 하나다.

1. `TARGET_SET` — Sol이 제공한 outline을 reviewed-complete AssessmentTargetSet으로 고정
2. `LEARNING_MAP_BINDING` — pinned commit의 concept·representation·application·prerequisite record와 fixture hash 결속
3. `AFFORDANCE_DISCOVERY` — 승인된 native tool 하나의 bounded read/canary 계약만 조사
4. `ENGINE_CORE` — 승인된 R01~R24 shared recipe/adapter 하나의 최소 core
5. `FAMILY_TRACK` — 승인된 track 하나의 generator·capability·runtime·cognitive·envelope
6. `STANDARD_BINDING` — 같은 gradeBand의 후속 standard target/envelope pack을 기존 core에 결속
7. `SOL_REVIEW` — Sol max가 한 standard·한 operation의 교육·구조 증거를 독립 검토
8. `LIVE_EVIDENCE` — 명시적으로 승인된 create-only canary·조작·저장·재열기
9. `BATCH_CLOSEOUT` — 해당 batch의 보고서·회귀·증거만 마감

한 실행에서는 operation 하나와 standard 하나만 소유한다. 가능한 한 lifecycle을 전진시키되 두 operation을 합치지 않는다.

각 standard의 offline operation 순서는 `LEARNING_MAP_BINDING → TARGET_SET → SOL_REVIEW →
AFFORDANCE_DISCOVERY/ENGINE_CORE → FAMILY_TRACK → SOL_REVIEW → STANDARD_BINDING`이다.
실제 generated work item의 `operation`, `dependencyWorkItemIds`, `allowedFiles`,
`targetOutlineSha256`를 입력으로 사용하며, 이 값이 없거나 현재 코드와 맞지 않으면
`blocked-needs-sol-replan`이다.

`TARGET_SET`과 `FAMILY_TRACK`은 Luna의 자체 QA만으로 완료할 수 없다. Luna는 변경과
focused QA를 수행한 뒤 **아직 push하지 않은 local candidate commit**을 만들고
`pending-sol-review`로 종료한다. [SOL_REVIEW_PROMPT.md](SOL_REVIEW_PROMPT.md)를
사용하는 Sol max 실행이 그 candidate commit hash에 결속된 `approved` 기록을
`scripts/curriculum/sol-review-board.json`에 남기고, Sol이 board와 파생
no-family report를 별도 로컬 commit으로 만든 뒤, Luna가
`pnpm curriculum:sol-review:verify -- --work-item W001 --operation TARGET_SET --candidate <sha>`를
통과시키고 main에 push한다. Sol review 담당자는 구현 파일을 수정하지 않는다.

## work item 입력 계약

```json
{
  "workItemId": "W001",
  "standardCode": "[2수04-02]",
  "standardSetSha256": "04a9f033a5968b1c5dc3a7886de28e3981c20b606fed4a0966a7728e069a66a3",
  "trackId": "D01A",
  "plannedFamilyId": "data.early-table.organize-v1",
  "engineClassIds": ["R22"],
  "operation": "TARGET_SET",
  "operationWorkItemId": "W001-TARGET_SET",
  "dependencyWorkItemIds": ["W001-LEARNING_MAP_BINDING"],
  "allowedFiles": [
    "packages/curriculum/src/assessment-targets/**",
    "packages/curriculum/src/assessment-targets.ts",
    "packages/curriculum/src/assessment-targets.test.ts",
    "reports/curriculum-coverage/**",
    "reports/curriculum-execution/latest.json",
    "reports/curriculum-execution/latest.md",
    "reports/curriculum-execution/no-family-plan.json",
    "reports/curriculum-execution/no-family-plan.md"
  ],
  "targetOutlineSha256": "<generated-report-value>",
  "solReview": {
    "requiredAfter": ["TARGET_SET", "FAMILY_TRACK"],
    "status": "pending",
    "reviewPrompt": "SOL_REVIEW_PROMPT.md"
  },
  "expectedTargetOutline": [],
  "liveWriteAuthorized": false,
  "baselineCommit": "06b5fe17fc5ea3164bbd01d333743c2aa03a0041",
  "maxRepairAttempts": 2
}
```

실제 값은 generated report와 target outline에서 채운다. `expectedTargetOutline`를 Luna가 추측해서 채우지 않는다.
`workItemId`는 표준의 안정적인 기본 ID이고, `operationWorkItemId`만 현재 operation을
식별한다. 다음 operation으로 넘어갈 때는 generated report를 다시 읽어 ID·의존성·허용
파일을 갱신한다.

## 허용 변경

- 해당 standard의 assessment-target module과 테스트
- 해당 domain의 승인된 family module·테스트·domain index
- work item에 적힌 engine/recipe module과 테스트
- 해당 standard에 필요한 bounded learning-map fixture
- 해당 family에 필요한 compiler adapter·layout preset
- 파생 coverage·family·execution report
- work item 상태와 증거 체크리스트

## 금지 변경

- 공식 121개 fixture 원문
- contracts schema
- 공통 planner·MCP·teacher-ui의 family별 분기
- `ACTIVITY_IDS`, `ACTIVITY_SUPPORT`, frozen legacy 중앙 목록
- unrelated family·canary·report
- released golden baseline
- hook·권한·canonical writer guard
- work item에 없는 native tool
- `LIVE_EVIDENCE`와 명시적 권한이 없는 외부 MathCanvas write
- `SOL_REVIEW` 승인 전 main push 또는 상태 승격
- force push, 임의 merge, 임의 rebase

## 구현 중 교육적 hard stop

다음 중 하나면 코드를 억지로 맞추지 말고 `blocked-needs-sol-replan`으로 끝낸다.

- official goal 또는 97-set hash drift
- AssessmentTargetSet 완전성을 확신할 수 없음
- required `SOL_REVIEW` 기록이 없거나 `changes-requested`·`blocked` 상태임
- 한 track에서 서로 다른 학생 결정·불변량·관찰 증거 발견
- 단일 family에 서로 다른 gradeBand 또는 domain이 필요함
- pinned learning-map record/hash 부재
- required native operation이 captured뿐인데 generic drag/text로 대체해야 함
- 초기 화면에 답이 완성됨
- 그럴듯한 오개념·rejectable alternative·self-verification 부재
- preview와 resolved item·answer key 불일치
- 공통 계층 하드코딩 또는 schema 변경 필요
- unsupported condition을 침묵 무시해야 함
- 기존 released hash가 바뀜
- 허용 파일 밖 수정 필요
- context 한계 때문에 부분 구현만 commit해야 함

## family acceptance gate

`scripts/curriculum/no-family-plan.json`의 `familyAcceptanceGates` 전부를 적용한다. 핵심은 다음과 같다.

- reviewed-complete target set, 필수 target 누락 0, target별 오개념 최소 1
- pinned learning-map hash
- 결정적 generator와 의미 조건→item/hash 인과
- 전 envelope 또는 경계+property test, 충분한 상태에서는 12개 이상 정규화 문항
- exact preview·정답·해설이 resolved item에서 도출됨
- resolve→compile→validator 통과
- classroom Korean·text fit·overlap·cognitive gate 통과
- 해당 operation에 대한 Sol max `approved` review record
- 기존 released hash 회귀 0
- fresh evidence 전에는 offline-validated 유지
- live에서는 current-hash initial→selected→manipulated→undo/reset→save→reopen과 semantic state 안정

## 검증 명령

focused test 뒤 아래 전체 체인을 통과한다.

```bash
pnpm cognitive:verify
pnpm problem-family:verify
pnpm curriculum:coverage
pnpm curriculum:program
pnpm check
git diff --check
```

generated timestamp만 바뀐 unrelated audit 파일은 내용을 확인한 뒤 원래 값으로 보존한다. 실패 상태를 통과로 기록하지 않는다.

## retry·승격

- 같은 deterministic 원인의 수정은 `allowedFiles` 안에서 최대 2회다.
- 세 번째 동일 실패는 즉시 `blocked-needs-sol-replan`이다.
- 교육적 family 분할, contracts schema, 새 native tool은 retry가 아니라 즉시 Sol max 재계획 대상이다.
- 외부 인증·플랫폼 장애는 live item만 `external-live-blocked`로 남기고 offline orchestrator는 다음 offline item을 선택할 수 있다.

## commit·push

- 일반 operation은 모든 gate가 통과했을 때 한 work item을 한 atomic commit으로 만든다.
- `TARGET_SET`·`FAMILY_TRACK`은 Luna가 local candidate commit을 만든 뒤 push하지 않고 종료한다.
- Sol max가 candidate commit hash에 결속된 `approved` record를 남긴 뒤에만
  `pnpm curriculum:sol-review:verify -- --work-item <Wxxx> --operation <TARGET_SET|FAMILY_TRACK> --candidate <sha>`를 실행하고 `git push origin main`을 한다.
- `changes-requested`이면 기존 candidate를 재사용하지 말고 새 attempt·새 candidate commit으로 다시 검토받는다.
- live evidence는 offline 구현 commit과 분리한다.
- `git push origin main`이 fast-forward로 성공해야 완료다.
- push 충돌 시 임의 해결하지 말고 중단한다.

## 종료 보고 형식

```json
{
  "workItemId": "W001",
  "result": "complete | blocked-needs-sol-replan | external-live-blocked | failed",
  "standardCode": "[2수04-02]",
  "trackId": "D01A",
  "operation": "TARGET_SET",
  "changedFiles": [],
  "targetCoverageBefore": null,
  "targetCoverageAfter": null,
  "qa": [],
  "candidateCommit": null,
  "candidatePush": "held-until-sol-review-approved",
  "commit": null,
  "push": null,
  "blocker": null,
  "nextRequiredOperation": "TARGET_SET"
}
```

현재 항목의 결과만 보고하고 종료한다. “다음 것도 진행할까요?”라고 묻지 않는다. orchestrator가 generated board를 다시 읽어 다음 Luna 실행을 시작한다.
