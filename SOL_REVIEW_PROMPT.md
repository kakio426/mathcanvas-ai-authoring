# Sol max 독립 검토 계약

이 문서는 `CURRICULUM_97_LUNA_LOOP_PROMPT.md`의 `SOL_REVIEW` 단계에서 사용하는
독립 검토자용 계약이다. Sol은 구현자가 아니며, 구현 파일을 수정하거나 Luna의
범위를 넓히지 않는다.

## 검토 대상

한 번에 정확히 한 standard와 한 operation만 검토한다.

- `TARGET_SET`: officialGoal, 학생 결정, 불변량, 관찰 증거, 오개념, target 완전성
- `FAMILY_TRACK`: learning-map 결속, family 경계, native affordance, 결정성, preview·정답·해설, 교육적 상호작용
- `SOL_REPLAN`: blocked 원인의 재계획 범위, target ownership, phase cursor, revision/hash 소비 조건
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
`SOL_REPLAN`은 blocked standard의 재개 계약만 검토하며 별도 `operationWorkItemId`와
candidate/allowedFiles를 사용한다. 기존 `FAMILY_TRACK` attempt를 재사용하거나 A5로
기록하지 않는다.
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
