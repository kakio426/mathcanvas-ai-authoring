# Sol max 독립 검토 계약

이 문서는 `CURRICULUM_97_LUNA_LOOP_PROMPT.md`의 `SOL_REVIEW` 단계에서 사용하는
독립 검토자용 계약이다. Sol은 구현자가 아니며, 구현 파일을 수정하거나 Luna의
범위를 넓히지 않는다.

## 검토 대상

한 번에 정확히 한 standard와 한 operation만 검토한다.

- `TARGET_SET`: officialGoal, 학생 결정, 불변량, 관찰 증거, 오개념, target 완전성
- `FAMILY_TRACK`: learning-map 결속, family 경계, native affordance, 결정성, preview·정답·해설, 교육적 상호작용
- `SOL_REPLAN`: blocked 원인의 재계획 범위, target ownership, phase cursor, revision/hash 소비 조건
- `SOL_REPLAN_REQUEST`: 현재 scoped cursor에서 발견된 구현 불가능 조건을
  blocked-only preflight artifact와 candidate commit에 결속한다. 이 기록은 승인이나
  push 권한이 아니라 다음 `SOL_REPLAN`이 소비할 새 실패 identity다.
- `FAMILY_REVALIDATION`: stale family의 scoped fingerprint artifact와 implementation-file hash가 현재인지

현재 work item의 입력은 다음 파일에서 읽는다.

1. `reports/curriculum-execution/no-family-plan.json`
2. `scripts/curriculum/no-family-target-outlines.sol-draft.json`
3. `scripts/curriculum/sol-review-board.json`
4. 해당 standard의 공식 fixture와 변경 diff
5. `AGENTS.md`, `ELEMENTARY_2022_FULL_COVERAGE_PLAN.md`,
   `docs/PROBLEM_FAMILY_ARCHITECTURE.md`

## 승인 기준

다음 모두를 독립적으로 확인한다.

- officialGoal과 target outline의 의미가 일치한다.
- 각 target에 학생의 실제 수학적 결정, 불변량, 화면에서 관찰 가능한 증거가 있다.
- target 간 결정·불변량·증거가 다르면 하나의 family로 합치지 않는다.
- 최소 하나의 그럴듯한 오개념과 rejectable alternative가 있다.
- learning-map은 pinned hash와 함께 존재한다.
- native affordance가 수학적 상태를 바꾸며 generic drag/text로 대체되지 않는다.
- 구현이 기존 released hash와 공통 planner·MCP·teacher-ui 계약을 깨지 않는다.
- unsupported 조건을 조용히 무시하지 않는다.
- Luna가 제시한 테스트·preview·정답·해설·semantic state 증거가 서로 일치한다.
- exact preview는 compile-time RuleStateEnvelope와 조건부 rubric만 증명한다. 실제 학생
  `StudentRuleStateEvidence`·save/reopen은 별도 responseHash evidence 없이는 승인 근거로 삼지 않는다.

## 금지

- 구현 파일을 직접 수정하지 않는다.
- Sol 계획 초안을 근거로 불완전한 target set을 자동 승인하지 않는다.
- 화면이 아직 없는 것을 live evidence로 간주하지 않는다.
- `approved`를 사용하면서 findings 또는 evidenceRefs를 비워 두지 않는다.
- 한 번에 다음 standard까지 검토하지 않는다.

## 기록

검토 결과를 `scripts/curriculum/sol-review-board.json`의 `reviews`에 추가한다.

```json
{
  "reviewId": "W001-TARGET_SET-SOL",
  "workItemId": "W001",
  "standardCode": "[2수04-02]",
  "operation": "TARGET_SET",
  "reviewer": "gpt-5.6-sol / max",
  "decision": "approved",
  "attempt": 1,
  "candidateCommit": "0123456789abcdef0123456789abcdef01234567",
  "changedFiles": [
    "packages/curriculum/src/assessment-targets/data-table-2su04-02.ts",
    "packages/curriculum/src/assessment-targets.ts"
  ],
  "supersedesReviewId": null,
  "checkedAt": "2026-08-11T00:00:00.000Z",
  "evidenceRefs": [
    "scripts/curriculum/no-family-target-outlines.sol-draft.json",
    "reports/curriculum-execution/no-family-plan.json"
  ],
  "findings": [
    "target별 결정·불변량·관찰 증거가 officialGoal과 일치함"
  ]
}
```

`decision`은 `approved`, `changes-requested`, `blocked` 중 하나다.

`candidateCommit`은 Luna가 push하지 않은 local commit이어야 한다. Sol은 그 hash의
diff만 검토하고 `changedFiles`를 정확히 기록한다. 검토 기록을 추가한 뒤에는 board와
`node scripts/curriculum/build-no-family-plan.mjs --write`가 갱신한 파생 no-family
report만 별도 로컬 commit으로 함께 기록한다. 이 Sol commit도 push하지 않는다.
`FAMILY_TRACK` review는 `standardCode + operation + familyTrackId + scopeId`를 하나의
review scope로 사용한다. review record에 두 scope 필드가 없거나 candidate work item의
scope와 다르면 다른 family의 승인으로 재사용할 수 없다. pre-scope legacy record는
감사 가능한 과거 기록으로만 남긴다.
`FAMILY_REVALIDATION`도 별도 scoped review key를 사용한다. 첫 attempt의
`supersedesReviewId`는 null이어야 하며, legacy 무범위 FAMILY_TRACK과 연결할 때는
`supersedesFamilyTrackReviewId`를 별도로 기록한다. `artifactPath`와
`fingerprintSha256`가 현재 artifact·implementation hashes와 일치하지 않으면 승인하지 않는다.
artifact가 전역 파일 전체 hash를 잡아 무관한 표준 추가만으로 stale될 수 있으면
`changes-requested` 또는 `blocked`로 판정하고 semantic slice/module fingerprint와
재개 조건을 `SOL_REPLAN`으로 분리한다. 같은 `FAMILY_REVALIDATION` attempt를
반복 승인하지 않는다.
`FAMILY_REVALIDATION` 승인 후 파생 report는 registry, curriculum coverage,
execution, no-family 순서로 모두 재생성해야 한다. Sol post-approval commit은
해당 operation manifest에 열거된 파일만 포함하며, gate의 암묵적 전체
`reports/**` 허용을 전제로 삼지 않는다.
후보의 exact `changedFiles`에 operation manifest 밖의 파일이 섞였으면 파일을
숨기거나 목록에서 빼지 않는다. 그 후보는 `decision: "blocked"`로만 기록하고,
`findings`에 `SCOPE_VIOLATION`과 disallowed 파일을 명시한다. 이 blocked 기록은
실패 후보의 감사 증거일 뿐 승인·post-approval 커밋의 권한을 넓히지 않는다.
`changes-requested`나 `approved` 기록은 manifest 밖 파일을 포함할 수 없다.
`SOL_REPLAN`은 blocked standard의 재개 계약만 검토하며 별도 `operationWorkItemId`와
candidate/allowedFiles를 사용한다. 기존 `FAMILY_TRACK` attempt를 재사용하거나 A5로
기록하지 않는다.
`ENGINE_CORE`처럼 별도 승인 review가 없는 단계에서 새 schema·affordance·contract
hard-stop이 발견되면 이미 소비된 과거 blocker를 되살리지 않는다. Luna는 구현 파일을
더 고치지 않고 preflight artifact 하나만 candidate commit으로 만들며, Sol은 이를
`SOL_REPLAN_REQUEST` / `decision: "blocked"`로 검토한다. record에는
`operationWorkItemId`, `familyTrackId`, `scopeId`, `blockedOperation`,
`blockedContractRevision`, `blockerArtifactPath`, `blockerArtifactSha256`를
모두 기록한다. artifact와 record가 현재 generated sub-work cursor에 정확히
일치하지 않거나 candidate가 stale이면 재계획 trigger로 사용할 수 없다.
이 blocked request는 `approved` 값을 가질 수 없으며 상태·coverage·push를
승격하지 않는다. 다음 `SOL_REPLAN` review가
`supersedesBlockedReviewId`로 이 request ID를 정확히 소비한 뒤에는 historical
evidence가 되며 같은 ID로 재차 SOL_REPLAN을 열 수 없다.
새 operation을 처음 도입하는 bootstrap에서는 governance/replan candidate를 먼저
commit하고, 그 위에 preflight artifact만 담은 별도 candidate commit을 만든다.
artifact candidate 이후 request review 전에는 구현 파일을 더 변경하지 않는다.
Sol은 artifact candidate에 blocked request record를 결속한 뒤, 앞선 governance
candidate의 SOL_REPLAN review가 그 request ID를 소비하는지를 같은 tree에서
검증한다. `blockedContractRevision`은 hard-stop 당시 마지막으로 승인·소비된
revision이며, 아직 승인되지 않은 수정 candidate의 revision으로 바꾸지 않는다.
수정 요청 뒤에는 이전 승인 기록을 지우지 않고 `attempt`를 올린 새 record와 새
candidate commit을 만든다. 가장 높은 attempt가 현재 결정이며,
`pnpm curriculum:sol-review:verify`는 candidate hash·changed files·현재 branch 및
candidate 이후의 board/파생 report 파일만 존재하는지를 확인한다. candidate 이후
구현 파일이 바뀌면 승인 기록은 stale이며, 이전 approval을 재사용하지 않는다.

- `approved`: Luna가 다음 operation으로 진행할 수 있다.
- `changes-requested`: Luna는 지적된 허용 범위만 수정하고 같은 review를 다시 받는다.
- `blocked`: family 분리, 새 native affordance, schema 변경, 공식 목표 해석 불명확성 등은
  Sol 재계획으로 승격한다.

Sol review가 `approved`가 아니면 해당 standard는 `reviewed-complete`,
`offline-validated`, `live-released`가 될 수 없고 `main`에 push할 수 없다.
