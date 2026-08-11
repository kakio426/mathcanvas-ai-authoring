# W002 `[2수02-02]` 재계획 — 반복·변화 규칙 배열 (v9)

상태: **Sol max 재계획 검토 대기 — CONTRACT_CAPACITY·LAYOUT_CAPACITY hard-stop 해소**

v9는 A2 `W002-FAMILY_TRACK-repeat-rule-SOL-A2`의 preflight blocked를 소비하는
최소 재계획이다. A3 TARGET_SET의 세 target·outline hash·learning-map 결속은 바꾸지
않고, repeat-rule cursor를 `AFFORDANCE_DISCOVERY` 완료·`ENGINE_CORE` 대기로 되감는다.
v8 completion artifact는 역사 자료로만 남기며 v9 evidence로 재사용하지 않는다.
v9 승인·소비 전에는 W002를 FAMILY_TRACK으로 전진시키지 않는다.

이번 hard-stop은 두 공통 seam을 동시에 다룬다. 승인된 core는 9개의 physical source
role과 rule slot 2개·continuation target 4개를 동시에 요구하지만, 기존 blueprint
constraint schema는 source를 8개로 제한하고 wave16 preset은 188×188 target을 2개만
제공한다. source를 8개로 줄이거나 기존 wave16을 억지로 재사용하는 것은 capacity·
observability 계약을 위조하므로 금지한다.

v9가 허용하는 공통 변경은 다음뿐이다: declarative/resolved constraint source 상한을
명시적 12로 대칭 확장하고 9-source 회귀를 추가한다; architecture baseline을 갱신한다;
wave16을 수정하지 않고 `w002-repeat-rule-construction-v1` 전용 preset·registry·
containment/resolve 테스트를 추가한다. family generator·teacher UI·response/save-reopen은
여전히 이 재계획 범위 밖이다.

## v9 hard-stop과 재진입 계약

- 차단 근거: `reports/curriculum-execution/subwork-state/W002-FAMILY_TRACK-repeat-rule-preflight-blocker.json`
  및 review `W002-FAMILY_TRACK-repeat-rule-SOL-A2`.
- 재계획 revision: `W002-SOL-REPLAN-v9`, `replanTargetSetRequired=false`.
- constraint capacity: `maxSources=12`, `requiredSources=9`; 두 schema가 같은 상한을 사용하고
  9는 통과·13은 거부해야 한다.
- layout capacity: tokenSet `w002-repeat-rule-construction-v1`; source 9, rule slot 2,
  continuation 4; 각 target 최소 188×188, 모두 동시에 보이며 native rendered bounds를
  containment 검사한다.
- v9 승인 후 순서: `ENGINE_CORE` 공통 seam·전용 preset 구현 → 새 v9 artifact/current SHA
  검증 → repeat-rule FAMILY_TRACK 재진입. v8 artifact를 상태 cursor에 다시 기록하지 않는다.

## v8 이전 governance의 위치

아래 v6/v7/v8 절은 왜 학생 구성 상태·completion evidence·용량 계약이 필요했는지에 대한
역사적 근거다. 현재 권위 revision과 실행 순서는 이 문서의 v9 절과
`scripts/curriculum/no-family-plan.json#trackContracts.C01`을 따른다.

이번 v7은 v3의 세 target 분해와 A3 TARGET_SET 승인을 바꾸지 않는다. A3에서 승인된
3-target source·adapter 결속·target-outline hash는 현재 저장소에 설치되어 소비된
상태이며, 이 후보는 재계획 계약·sub-work·ENGINE_CORE 허용 범위만 고정한다.
따라서 v7을 소비하기 위해 새 TARGET_SET을 만들지 않는다. 다만 기존 v6
`construct-rule` 계약은 실제 학생 선택을 보장하지 못했으므로, v7 승인 전에는
어떤 FAMILY_TRACK 후보도 유효한 구현으로 취급하지 않는다.

v3 AFFORDANCE_DISCOVERY에서 `SM02PB`의 정적 variant·기존 배치 canary는
확인했지만 학생이 만든 반복 단위의 의미 상태를 저장·검증하는 native 계약은
찾지 못했다. 따라서 다음 `ENGINE_CORE`는 기존 `select-one`/numeric
`construct`를 재사용하지 않고, 공통 cognitive contract를 확장하는 범위로
Sol의 재승인을 받는다. 첫 후보가 드러낸 고정 정답·가짜 입력 문제도
ENGINE_CORE의 명시적 차단 조건으로 포함한다. 이 재계획은 target 문구를
바꾸지 않으므로 A3 TARGET_SET을 다시 소비하지 않는다
(`replanTargetSetRequired=false`).

## 0. v6 ENGINE_CORE 후보의 독립 검토 결과와 v7의 hard-stop

후보 `e1d2c30`은 `pnpm check`(81 files / 501 tests)를 통과했지만 Sol 독립
검토에서 **CHANGES_REQUESTED** 되었다. ENGINE_CORE는 당시 formal board
review operation이 아니었으므로 이 후보에 가짜 board record를 만들지 않았고,
승인되지 않은 코드는 revert했다. 이 결과는 기술 녹색을 교육적 승인으로 오인하지
않도록 v7의 선행 조건으로 고정한다.

1. `validRuleStates`가 `[A,B]`와 `[B,A]`로 미리 고정되고 answer key가 `[A,B]`
   하나를 고르도록 되어 있어, 학생이 바구니에서 임의의 두 조각과 순서를 정하는
   target을 실제로 수행하지 않는다.
2. `continuation-lane`은 잠긴 문구뿐이고, 학생이 구성한 규칙을 눈에 보이는
   다음 배열에 적용·대조하는 target representation이 없다.
3. 잠긴 `common.text`를 학생 설명 입력처럼 서술했지만 입력·저장·재열기 증거가
   없으므로 교사 답안과 학생 response를 연결할 수 없다.
4. raw predicate에 `answerMode`·`stateConstruction`·`application`만 넣어도
   legacy branch가 통과하는 fail-open 경로가 남아 있었다. manifest schema만이
   아니라 runtime validator도 부분 계약을 거부해야 한다.
5. 권위 contract의 variant 3개로는 두 개의 distinct valid state와 두 개의
   distinct duplicate surplus state를 동시에 보장할 수 없고, rule slot 2개와
   continuation 4개를 clone 없이 동시에 채울 물리 조각도 부족하다.

별도의 과거 family 후보 `f195e3a`는 공통 audit script를 FAMILY_TRACK에 섞은
`SCOPE_VIOLATION`으로 blocked 보존된 기록이며, e1 ENGINE_CORE 후보와 동일한
사건으로 합치지 않는다. operation manifest 밖의 exact changedFiles는 승인·
post-approval 권한을 넓히지 않으며, 이 전역 예외의 동일한 키워드·승인 불가·
post-approval 불가 조건은 `SOL_REVIEW_PROMPT.md`에 고정한다.

따라서 v7의 완료 정의는 “고정된 예시 두 개를 통과시킨다”가 아니라
**임의로 선택 가능한 ordered state의 구조·눈에 보이는 적용·조건부 rubric을
공통 계약과 family 테스트가 함께 증명한다**이다.

## 1. 재계획을 여는 이유

W002 `FAMILY_TRACK` A1–A4 후보는 기술 게이트(`pnpm check`, 77 files / 462 tests)를 통과했지만,
Sol 검토 `W002-FAMILY_TRACK-SOL-A4`에서 `blocked` 되었다.

- Sol review: `c945aacb110890b70425b6f812153cca6a29f77d`
- 마지막 후보: `4a44f242443294204eae9503d7d7963e49cb480b`
- 후보는 push하지 않았고, 현재 family는 offline-validated/released가 아니다.
- 같은 원인의 A5 재시도는 루프 계약상 금지한다.

차단의 본질은 테스트 실패가 아니라 범위·교육 계약이다.

1. repeat-only 후보가 repeat/change를 모두 포함하는 두 target을 등록해 partial 구현을 전체 coverage처럼 주장했다.
2. pre-authored 정답 카드를 고르는 방식이라 “학생이 규칙을 스스로 정하고 선언”하는 결정이 저장되지 않는다.
3. repair와 continuation의 상태·증거가 선언된 규칙과 결속되지 않았다.
4. 수 변화(change) 관계를 학생이 볼 수 있는 수·상태 affordance로 증명하지 못했다.
5. unsupported scope와 exact preview가 partial family의 실제 경계를 fail-closed로 표현하지 못했다.

## 2. 권고하는 구조 결정

기본안은 **AssessmentTarget을 rule-kind별 concrete target으로 다시 분해하고, family가 자기 target만 등록하는 방식**이다.
이 방식은 새 partial-coverage 집계 스키마를 먼저 도입하지 않아도 현재 coverage join이 과대 주장을 막는다.

W002의 두 초안 target은 A3에서 다음 세 개의 reviewed target으로 이미 분해·승인·소비되었다.
기존 v8 문단의 재계획 계약 revision은 `W002-SOL-REPLAN-v8`이었다. A3 TARGET_SET이
승인한 target-outline hash와 source 결속은 그대로 유지되지만, v8 completion evidence는
현재 v9에서 역사 자료로만 취급한다.

## v8 governance amendment — ENGINE_CORE completion evidence (historical)

v7의 ENGINE_CORE artifact는 다음 권위 계약으로 고정한다.

```json
{
  "artifactPath": "reports/curriculum-execution/subwork-state/W002-FAMILY_TRACK-repeat-rule-engine-core.json",
  "status": "implemented-verified-pending-family-track",
  "implementationFiles": [
    "packages/contracts/src/catalog/cognitive-demand.ts",
    "packages/contracts/src/catalog/cognitive-demand.test.ts",
    "packages/validator/src/predicates/registry.ts",
    "packages/validator/src/validator.test.ts",
    "packages/templates/src/cognitive/registry.ts",
    "packages/templates/src/cognitive/registry.test.ts",
    "scripts/pedagogy/check-cognitive-demand.mjs"
  ]
}
```

repeat-rule phase-state는 `completionEvidenceByOperation.ENGINE_CORE`에 artifact 경로와
artifact 파일 SHA-256을 기록한다. builder는 ENGINE_CORE가 completedOperations에 들어간
순간 다음을 fail-closed로 확인한다: artifact의 schemaVersion·operation·workItemId·
operationWorkItemId·standardCode·familyTrackId·scopeId·replanContractRevision·status가
계획과 정확히 일치하는지, artifact implementationFiles 집합이 위 권위 목록과 같은지,
artifact SHA와 각 구현 파일 SHA가 현재 작업 트리와 일치하는지. `nextOperation=ENGINE_CORE`
상태에서는 completion evidence를 미리 기록할 수 없다. 이 검증을 통과하지 못하면
FAMILY_TRACK으로의 전이는 생성되지 않는다.

| 새 target slice | 학생의 실제 결정 | 소유 family |
|---|---|---|
| repeat rule 구성·선언 | 물체·무늬의 반복 단위 성분과 순서를 직접 정하고 선언 | `pattern.repeat-unit.construct-v1` |
| repeat 배열 구성·수정 | 선언한 반복 단위로 다음 항을 만들고 어긋난 항을 교체 | `pattern.declared-repeat.repair-v1` |
| change rule 구성·적용·수정 | 수열의 시작값·간격·방향을 직접 구성·선언하고, 그 관계로 다음 수를 만들며 어긋난 수를 수정 | `pattern.change-rule.construct-v1` |

각 family는 `source.assessmentTargetIds`에 자기 slice만 넣는다. 한 family가 세 slice를 모두 등록하는
방식은 금지한다. A3 승인 기록과 현재 source가 이 소유권을 고정하며, 어떤 family도
자기 `FAMILY_TRACK` 승인 전에는 W002 완료를 주장하지 않는다.
세 concrete sub-work는 `reports/curriculum-execution/subwork-state/W002.json`의 phase cursor를 사용한다.
각 cursor는 자신의 `operationSequence`에서 아직 완료하지 않은 정확히 하나의 `nextOperation`만 가리키며,
`AFFORDANCE_DISCOVERY → ENGINE_CORE → FAMILY_TRACK → SOL_REVIEW`를 건너뛰거나 같은 단계를 반복할 수 없다.
첫 단계의 의존성은 `W002-SOL_REPLAN`과 새 `W002-SOL_REVIEW-TARGET_SET`이고, 후속 family는 필요한 선행
sub-work의 scoped review ID까지 의존성에 기록한다.

새 partial-coverage aggregation schema는 만들지 않는다. 현재 registry의 target union을 그대로
사용하되, 각 family가 자기 target slice만 `source.assessmentTargetIds`에 등록하도록 고정한다.
repeat-only family가 change target을 등록하거나, change family가 repeat target을 등록하는 것은
검토·coverage gate에서 거부한다.

### TARGET_SET 경계

A3 `W002-TARGET_SET-SOL-A3`는 세 target slice·outline hash·adapter의 자기
slice 결속을 이미 승인했고, v7 직전 상태에서 소비되었다. `replanTargetSetRequired=false`이므로
v9의 승인·소비는 TARGET_SET을 다시 열지 않고 `ENGINE_CORE`로 재개한다.
v9 후보는 target source, target IDs, outline hash, coverage 분모를 변경하지 않는다.
그중 하나라도 바꿔야 하면 현재 v9 후보에 섞지 말고 새 `SOL_REPLAN` 후 별도
`TARGET_SET` 후보를 만든다.

## 3. 재개 작업 순서

한 번에 한 standard·한 operation만 소유한다. 각 `TARGET_SET`·`FAMILY_TRACK` 뒤에는 Sol review를 거친다.
다만 W002는 세 concrete family를 독립적으로 승인해야 하므로 review key를 표준+operation에서
`standardCode + operation + familyTrackId/scopeId`로 확장하는 orchestrator 작업이 먼저다.

1. `W002-ORCHESTRATOR-GATE` — 완료된 단계다. blocked item을 `nextReplanWork`로 보존하고
   다음 독립 표준을 `nextOfflineWork`로 선택하며, familyTrackId/scopeId를 review·candidate·allowedFiles에
   결속한다. 이 단계의 generated operation은 `SOL_REPLAN`·`W002-SOL_REPLAN`이며, 기존
   `FAMILY_TRACK` review attempt를 재사용하거나 A5로 세지 않는다.
2. `W002-REPLAN-TARGET_SET` — v7에서는 실행하지 않는다. A3 승인·소비가 이미 세 target
   slice의 statement·invariant·observable evidence·misconception·pinned learning-map
   결속과 outline hash를 고정했다. target 변경이 필요할 때만 새 SOL_REPLAN과
   `supersedesReplanReviewId`·`replanContractRevision`·`targetOutlineSha256`를 가진
   별도 TARGET_SET 후보를 만든다.
3. `W002-REPLAN-AFFORDANCE_DISCOVERY` — 첫 repeat sub-work에서 완료됐다. `SM02PB` 정적
   variant·기존 배치 canary는 확인했지만 학생이 만든 반복 단위의 의미 상태를 저장·검증하는
   native 계약은 찾지 못했으므로, 그 결과가 이 v7 `ENGINE_CORE` 재계획의 근거다.
4. `W002-ENGINE_CORE` — 기존 numeric `construct`나 select-one의 `correctValuePath`를 재사용하지 않는
   별도 `construct-rule` decision과 `cognitive.rule-state-contract` predicate를 만든다.
   가능한 경우 기존 fill-from-pool·SM02PB·NO04NT native 조작을 재사용하고, 공통 compiler schema를
   바꾸지 않는다. predicate·cognitive schema·공통 adapter 변경이 더 필요하면 이 단계에서 다시 막고
   Sol 재계획을 받는다.
5. `W002-REPEAT_RULE_CONSTRUCTION` — `pattern.repeat-unit.construct-v1`로 SM02PB rule lane에서 학생이 성분·순서를 직접 구성하고,
   compile-time RuleStateEnvelope가 item·answer·exact preview의 조건을 결정하며, 학생의 실제 저장 rule state는
   조작 후 response evidence에서만 확인한다.
6. `W002-REPEAT_ARRANGEMENT_REPAIR` — `pattern.declared-repeat.repair-v1`로 이미 선언된 repeat rule을 적용하고, 별도의 잘못된 항을
   실제로 교체한 전후 상태를 저장·검증한다.
7. `W002-CHANGE_RULE_CONSTRUCTION` — `pattern.change-rule.construct-v1`로 시작값·간격·방향이
   화면에서 관찰되는 native number/state 조작으로 rule state를 구성·선언하고, 같은 state로
   수를 이어 놓고 간격·방향 오개념을 수정한다. 이 단계에서 구성과 수정이 서로 다른 결정으로
   드러나면 즉시 별도 family로 split하고 Sol 재계획을 연다.
8. 각 family의 `FAMILY_TRACK` Sol 승인 후에만 W002를 `offline-validated` 후보로 계산한다.

각 offline 단계가 끝나면 Luna는 해당 candidate에 phase-state JSON과 파생 report를 함께 기록하고,
다음 실행은 report가 계산한 `nextFamilySubWork`/`operationWorkItemId`만 사용한다. cursor가 없거나
sequence의 앞부분과 정확히 일치하지 않으면 구현을 계속하지 않고 `blocked-needs-sol-replan`으로 멈춘다.
FAMILY_TRACK review가 `changes-requested`이면 cursor는 해당 구현 단계로 되돌아가고, 같은
`SOL_REVIEW`를 반복하지 않는다. `blocked`이면 새 SOL_REPLAN으로 승격한다.

이 재계획과 별도로 **검증 상태 정합성 작업**을 먼저 승인한다. 현재 W002는 Sol board에서
`blocked`인데 `reports/curriculum-coverage/latest.json`과
`reports/curriculum-execution/latest.json`은 registry의 `supportState`만 읽어
`offline-validated`로 표시한다. 파생 report는 최신 `FAMILY_TRACK` review decision을 함께 읽어
`blocked` family를 offline/live target coverage에서 제외해야 한다. board가 `approved`가 아니면
family stage는 `mapped`/`generatable` 이하로만 표시하고, target coverage의 offline numerator도
올리지 않는다. 이 수정은 W002 family 구현에 섞지 않고 별도 loop/report gate 작업으로 테스트한다.

각 family의 native/core 계약이 공통 compiler schema 변경을 요구하면 해당 단계는 즉시 종료하고,
새 `ENGINE_CORE` work item과 Sol 재계획을 만든다. 기존 W002 후보에 schema 변경을 섞지 않는다.

### v7 ENGINE_CORE 범위 (historical core contract)

이번 AFFORDANCE_DISCOVERY의 결과는 새 native 도구를 추가하는 것이 아니라,
기존 `SM02PB` 배치 위에 **학생이 만든 규칙을 임의 상태로 보존하고 눈에 보이는
다음 배열에 적용하는** 공통 core가 필요하다는 것이다. 승인 전 ENGINE_CORE
후보는 다음 다섯 가지를 함께 계약한다.

1. `CognitiveDemandManifest.decision`에 `construct-rule`을 유지하되
   `constructionMode: "student-constructed"`와 `answerMode: "conditional-rubric"`를
   추가한다. `correctValuePath` 하나를 고르는 select-one이나 고정 정답 문자열은
   이 target의 증거로 인정하지 않는다.
2. `stateConstruction.kind: "ordered-distinct-subset-from-pool"`을 추가한다.
   `ruleSlotRoles` 두 칸은 처음 비어 있고, 실제 variant pool의 **세 semantic
   값과 각 3개 copy(총 9개 physical role)** 중 서로 다른 두 값을 어떤 순서로든
   선택할 수 있어야 한다. `sourceUseMode: "move-once-no-clone"`으로 복제를
   가정하지 않으며, `validRuleStatesPath`와
   `surplusPath`는 정답 목록이 아니라 각각 **가능 상태 예시**와 **거부 상태 예시**다.
3. `application`을 추가한다. `ruleStatePath`와 같은 학생 상태가 최소 네 개의
   `continuationTargetRoles`에 반복 적용되고, 화면에서 선택한 두 조각과 다음
   배열의 대응을 직접 비교할 수 있어야 한다. 잠긴 안내문만으로는 이 조건을
   충족할 수 없다.
4. `cognitive.rule-state-contract`와 공통 audit script를 함께 확장한다. validator는
   초기 상태가 empty인지, 모든 ordered distinct 선택이 pool 수량으로 가능한지,
   valid/surplus가 sample envelope인지, application target과 상태 path가 결속되는지
   fail-closed로 확인한다. 각 valid state를 rule slot에 한 번 소비한 뒤 period를
   반복한 continuation까지 pool에서 구성할 수 있어야 하며, continuation constraint는
   `ruleStateIndex: index % period`를 가져야 한다. 이 공통 audit script 변경은
   ENGINE_CORE 허용 파일이다.
5. 공통 compiler payload와 `activitySpecHash`는 변경하지 않는다. 학생의 선택 상태와
   다음 배열의 대응은 별도 response evidence가 있는 경우에만 조건부 rubric으로
   평가한다. save/reopen 증거가 없으면 teacher-only preview에서 그 사실을 명시한다.

ENGINE_CORE가 소비할 계약은 다음 JSON shape로 고정한다. 실제 family가 어떤
role 이름을 쓰더라도 키·의미·path 결속은 이 shape를 바꾸지 않는다.

```json
{
  "decision": {
    "mode": "construct-rule",
    "constructionMode": "student-constructed",
    "answerMode": "conditional-rubric",
    "ruleStatePath": "studentRuleState",
    "decisionConstraintId": "construct-rule-slot",
    "variantRoles": [
      "rule-variant-1", "rule-variant-2", "rule-variant-3",
      "rule-variant-4", "rule-variant-5", "rule-variant-6",
      "rule-variant-7", "rule-variant-8", "rule-variant-9"
    ],
    "ruleSlotRoles": ["rule-slot-1", "rule-slot-2"],
    "variantProperty": "orderedValues",
    "validRuleStatesPath": "validRuleStateExamples",
    "surplusPath": "surplusRuleStateExamples",
    "minimumValidStates": 2,
    "minimumSurplus": 2,
    "stateConstruction": {
      "kind": "ordered-distinct-subset-from-pool",
      "sourceRoles": [
        "rule-variant-1", "rule-variant-2", "rule-variant-3",
        "rule-variant-4", "rule-variant-5", "rule-variant-6",
        "rule-variant-7", "rule-variant-8", "rule-variant-9"
      ],
      "slotRoles": ["rule-slot-1", "rule-slot-2"],
      "slotCount": 2,
      "minimumDistinctValues": 2,
      "minimumDistinctPoolValues": 3,
      "minimumCopiesPerDistinctValue": 3,
      "sourceUseMode": "move-once-no-clone",
      "allowsAnyOrderedSelection": true,
      "initialState": "empty"
    },
    "application": {
      "ruleStatePath": "studentRuleState",
      "continuationTargetRoles": [
        "continuation-slot-1", "continuation-slot-2",
        "continuation-slot-3", "continuation-slot-4"
      ],
      "period": 2,
      "minimumTargetCount": 4,
      "requiresVisibleComparison": true,
      "requiresSimultaneousRuleAndContinuation": true,
      "ruleStateIndexMode": "index-mod-period",
      "evidenceMode": "student-state-dependent"
    },
    "distractors": [
      {
        "predicateKind": "cognitive.rule-state-contract",
        "misconception": "같은 조각만 고르거나 두 조각의 순서를 중간에 바꾼다."
      },
      {
        "predicateKind": "cognitive.rule-state-contract",
        "misconception": "선택한 규칙과 무관하게 마지막 조각만 반복한다."
      }
    ]
  },
  "runtimePredicate": {
    "kind": "cognitive.rule-state-contract",
    "parameters": {
      "mode": "construct-rule",
      "constructionMode": "student-constructed",
      "answerMode": "conditional-rubric",
      "ruleStatePath": "studentRuleState",
      "decisionConstraintId": "construct-rule-slot",
      "validRuleStatesPath": "validRuleStateExamples",
      "surplusPath": "surplusRuleStateExamples",
      "variantRoles": [
        "rule-variant-1", "rule-variant-2", "rule-variant-3",
        "rule-variant-4", "rule-variant-5", "rule-variant-6",
        "rule-variant-7", "rule-variant-8", "rule-variant-9"
      ],
      "ruleSlotRoles": ["rule-slot-1", "rule-slot-2"],
      "variantProperty": "orderedValues",
      "continuationRuleStatePath": "studentRuleState",
      "explanationRuleStatePath": "studentRuleState",
      "predictionRole": "prediction-box",
      "explanationRole": "teacher-rubric",
      "studentInputRoles": [],
      "verificationRoles": [
        "rule-slot-1", "rule-slot-2", "continuation-slot-1",
        "continuation-slot-2", "continuation-slot-3", "continuation-slot-4"
      ],
      "minimumValidStates": 2,
      "minimumSurplus": 2,
      "stateConstruction": {
        "kind": "ordered-distinct-subset-from-pool",
        "sourceRoles": [
          "rule-variant-1", "rule-variant-2", "rule-variant-3",
          "rule-variant-4", "rule-variant-5", "rule-variant-6",
          "rule-variant-7", "rule-variant-8", "rule-variant-9"
        ],
        "slotRoles": ["rule-slot-1", "rule-slot-2"],
        "slotCount": 2,
        "minimumDistinctValues": 2,
        "minimumDistinctPoolValues": 3,
        "minimumCopiesPerDistinctValue": 3,
        "sourceUseMode": "move-once-no-clone",
        "allowsAnyOrderedSelection": true,
        "initialState": "empty"
      },
      "application": {
        "ruleStatePath": "studentRuleState",
        "continuationTargetRoles": [
          "continuation-slot-1", "continuation-slot-2",
          "continuation-slot-3", "continuation-slot-4"
        ],
        "period": 2,
        "minimumTargetCount": 4,
        "requiresVisibleComparison": true,
        "requiresSimultaneousRuleAndContinuation": true,
        "ruleStateIndexMode": "index-mod-period",
        "evidenceMode": "student-state-dependent"
      },
      "distractors": [
        {
          "predicateKind": "cognitive.rule-state-contract",
          "misconception": "같은 조각만 고르거나 두 조각의 순서를 중간에 바꾼다."
        },
        {
          "predicateKind": "cognitive.rule-state-contract",
          "misconception": "선택한 규칙과 무관하게 마지막 조각만 반복한다."
        }
      ]
    }
  },
  "binding": {
    "manifestDecisionMode": "construct-rule",
    "predicateKind": "cognitive.rule-state-contract",
    "decisionConstraintId": "construct-rule-slot",
    "ruleSlotRoles": ["rule-slot-1", "rule-slot-2"],
    "studentRuleStatePath": "studentRuleState",
    "applicationRuleStatePath": "studentRuleState",
    "answerMode": "conditional-rubric"
  }
}
```

`decisionConstraintId`는 `${decisionConstraintId}-${index + 1}:${itemId}` 규칙 슬롯 constraint의
공통 prefix이고, `ruleSlotRoles`의 순서가 학생이 구성하는 ordered state의 슬롯 순서다.
각 슬롯은 모든 variant source를 가진, 처음에는 충족되지 않은 `fill-from-pool` constraint와
정확히 결속되어야 한다. `studentRuleState`는 초기에는 빈 상태이고, 학생이 pool에서 고른
서로 다른 두 값을 어느 순서로 배치했는지가 실제 상태다. `validRuleStateExamplesPath`와
`surplusRuleStateExamplesPath`는 여러 가능한 상태를 설명하는 compile-time envelope일 뿐,
특정 두 값이나 하나의 정답을 잠그는 목록이 아니다. 모든 variant 수량과 ordered state의
조합 가능성은 family item에서 다시 확인한다.

`application.continuationTargetRoles`는 최소 네 개의 눈에 보이는 native target을 요구한다.
선택한 두 조각과 이 target들의 대응을 같은 `studentRuleState` path로 비교할 수 있어야 하며,
잠긴 `common.text`를 입력창이나 설명 evidence로 간주하지 않는다. 학생 입력·저장·재열기
경로가 구현되지 않은 단계에서는 `studentInputRoles: []`과 teacher-only conditional rubric을
명시하고, preview/answer가 미래 응답을 증명한다고 말하지 않는다.

ENGINE_CORE 후보에서 위 seam이 공통 compiler·planner·MCP·teacher-ui 변경을
요구하면 이 v9 범위를 초과한 것으로 간주하고 즉시 다시 SOL_REPLAN으로 멈춘다.
그 경우 `pattern.repeat-unit.construct-v1` 구현을 partial release로 올리지 않는다.

## 4. 구현 불변량

- 규칙은 보기 카드 하나를 고르는 것으로 끝나지 않는다. compile-time RuleStateEnvelope에는
  **가능한 ordered state의 생성 규칙**과 예시·거부 경계가 들어가고, 특정 블록 순서 하나를
  정답으로 고정하지 않는다. 학생이 만든 실제 rule state는 조작 후 StudentRuleStateEvidence로
  저장되어 다음 배열·조건부 rubric과 대조된다.
- `activitySpecHash`는 compile-time resolved spec의 hash이며 학생 조작으로 바뀌지 않는다. 학생이
  선언한 규칙은 별도 `RuleStateEnvelope`로 표현하고, 조작 후에는
  `StudentRuleStateEvidence`와 `responseHash`로 저장·검증한다. preview·answer는 컴파일된 envelope를
  표시하거나 학생 응답을 읽는 조건부 rubric/projector로 정의하며, 학생의 선언 상태 변화가
  `activitySpecHash`를 바꾼다고 주장하지 않는다.
- `construct-rule` decision은 기존 numeric `construct`나 select-one의 `correctValuePath`를 재사용하지 않는다.
  학생이 3 semantic 값 × 3 physical copy pool에서 고른 임의의 서로 다른 두 값과 순서가
  rule state가 되며, 초기 화면에는 empty slot만 있다. clone/reuse를 가정하지 않고
  rule slot 2개와 period 2의 continuation 4개를 동시에 채울 수 있는 multiset이어야 한다.
- 초기 화면은 완성 정답을 노출하지 않는다. 학생이 규칙을 정한 뒤에만 continuation target이
  그 state를 반복 적용하도록 평가된다. compile-time 예시는 answer key가 아니다.
- repair는 선언된 rule과 독립된 실제 오답 상태를 제공하고, 수정 전·후 semantic state가 서로 달라야 한다.
- repeat와 change는 화면 객체·수학적 관계·오개념·검증 불변량이 다르면 같은 family로 합치지 않는다.
- contexts는 시작값만 바꾸는 표면 variation이 아니라 pool 구성·가능 state·continuation 배열·오개념
  경계가 실제로 달라야 한다. 어느 context도 하나의 선결정 정답을 가리키지 않는다.
- unsupported repeat-3, change 밖의 수 표현, 미등록 객체·도구 요청은 조용히 fallback하지 않고
  `clarification-required`/unsupported 결과로 반환한다.
- exact preview는 compile-time RuleStateEnvelope, rule lane, 초기 상태, repair 위치, continuation target과
  조건부 rubric을 표시한다. 학생이 실제로 저장한 StudentRuleStateEvidence는 조작·save/reopen 뒤에만
  responseHash와 함께 표시되며, 승인 전 preview가 미래의 학생 상태를 증명한다고 주장하지 않는다.

## 5. 최소 테스트·승인 기준

- 같은 seed와 같은 compile-time envelope는 같은 `activitySpecHash`·item·answer를 만들고,
  같은 학생 선언 상태는 같은 `responseHash`를 만든다. 선언 상태를 바꾸면
  `StudentRuleStateEvidence`·`responseHash`·save/reopen 결과가 함께 바뀌며,
  `activitySpecHash`는 유지된다.
- pre-authored correct card 선택만으로 정답이 결정되는 경로가 없다.
- repeat/ change 각각 임의 선택을 허용하는 state-construction domain, 최소 두 개의 예시 state와
  두 개의 rejectable misconception state가 있다. 예시 state가 가능한 전체 선택을 대신하지 않는다.
  권위 repeat contract는 9 physical source role, 최소 3 distinct pool values, 각 3 copy,
  `move-once-no-clone`이며 `continuationTargetRoles.length === minimumTargetCount`,
  `length % period === 0`, `minimumCopiesPerDistinctValue >= 1 + length / period`를
  만족해야 valid state와 continuation 전체 multiset의 capacity를 검증할 수 있다.
- repeat family는 최소 네 개의 visible continuation target을 같은 studentRuleState에 결속하고,
  초기 empty → 학생 선택 → 적용 결과의 세 상태를 preview와 interaction contract에서 구분한다.
- repair 전후 semantic state와 최종 배열의 불변량을 테스트하며, 모든 native rendered bounds가 target 안에 들어간다.
- preview·answer·explanation·cognitive manifest가 동일한 role/state를 가리킨다.
- family source의 target IDs가 자신이 실제로 증명한 slice와 일치한다.
- Sol board의 최신 `blocked`/`changes-requested` decision이 coverage·execution report에서
  `offline-validated`·`live-released`로 승격되지 않는다.
- `pnpm cognitive:verify`, `pnpm problem-family:verify`, `pnpm curriculum:no-family-plan`,
  `pnpm curriculum:program`, `pnpm check`, `git diff --check`가 모두 통과한다.
- W002의 현재 hash live evidence(create → select → manipulate → undo/reset → save → reopen)는
  offline family 승인과 별도로 수행한다.

## 6. 루프 진행 정책

W002가 `blocked`인 동안 이를 성공으로 건너뛰지 않는다. 실행 보고서는 W002를 `blocked-needs-sol-replan`
큐에 남기고, Sol이 재계획을 승인한 뒤에만 W002 work item을 재생성한다. 97개 전체 loop가 W002 하나 때문에
멈추지 않게 하려면 `build-no-family-plan`에 다음을 별도 계획 작업으로 추가한다.

- blocked work item 목록과 blocker/replan 문서 hash를 report에 기록한다.
- `nextOfflineWork`는 blocked item을 숨기지 않고 `nextReplanWork`와 독립적인 다음 pending standard를
  구분해 표시한다.
- blocked item이 존재하는 동안 전역 완료·target coverage 100%를 산정하지 않는다.
- 다음 standard를 병행할 때도 single-writer와 표준별 allowedFiles를 유지하며, W002 재계획 문서와
  board를 임의로 덮어쓰지 않는다.

이 루프 변경은 W002 family 구현에 섞지 않고 별도 Sol 승인 계획/작업으로 처리한다.

### 독립 review scope 계약

orchestrator gate가 먼저 다음을 지원해야 한다.

- `W002-FAMILY_TRACK-repeat-rule` — `familyTrackId=pattern.repeat-unit.construct-v1`
- `W002-FAMILY_TRACK-repeat-repair` — `familyTrackId=pattern.declared-repeat.repair-v1`
- `W002-FAMILY_TRACK-change-rule` — `familyTrackId=pattern.change-rule.construct-v1`

각 review record와 candidate gate는 `standardCode`, `operation`, `familyTrackId`, `scopeId`,
candidate commit, changedFiles를 모두 비교한다. 표준+operation만으로 최신 review를 찾거나
한 family의 승인 기록을 다른 family에 재사용하지 않는다. 이 scope 계약과 `nextReplanWork`/
`nextOfflineWork` 분리가 승인되기 전에는 W002 family 후보를 만들지 않는다.

## 7. 금지 사항

- A4 후보 재사용 또는 A5 동일 수정
- repeat-only family가 두 기존 target을 모두 등록하는 것
- 수 변화 관계를 숫자 없는 pattern-block variant 순서로 설명하는 것
- 새 compiler/schema/native tool을 FAMILY_TRACK 안에서 조용히 추가하는 것
- Sol 승인 전 board/report 상태 승격 또는 main push
- W002를 숨긴 채 다음 표준만 완료한 것으로 보고하는 것
