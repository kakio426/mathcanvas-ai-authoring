# W002 `[2수02-02]` 재계획 — 반복·변화 규칙 배열 (v4)

상태: **Sol max 재계획 검토 대기 — ENGINE_CORE 범위 확장**

이번 v4는 v3의 세 target 분해와 A3 TARGET_SET 승인을 바꾸지 않는다. A3에서 승인된
3-target source·adapter 결속·target-outline hash는 이미 현재 저장소에 설치되어 소비된
상태이며, 이 후보는 재계획 계약·sub-work·ENGINE_CORE 허용 범위만 고정한다.
따라서 v4를 소비하기 위해 새 TARGET_SET을 만들지 않는다.

v3 AFFORDANCE_DISCOVERY에서 `SM02PB`의 정적 variant·기존 배치 canary는
확인했지만 학생이 만든 반복 단위의 의미 상태를 저장·검증하는 native 계약은
찾지 못했다. 따라서 다음 `ENGINE_CORE`는 기존 `select-one`/numeric
`construct`를 재사용하지 않고, 공통 cognitive contract를 확장하는 범위로
Sol의 재승인을 받는다. 이 재계획은 target 문구를 바꾸지 않으므로 A3
TARGET_SET을 다시 소비하지 않는다(`replanTargetSetRequired=false`).

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

W002의 두 초안 target을 다음 세 개의 reviewed target으로 분해한다. 이 문서의 재계획 계약 revision은
`W002-SOL-REPLAN-v4`이며, A3 TARGET_SET이 이미 승인한 target-outline hash를 유지한 채
이 revision을 소비한다. Sol이 승인한 뒤에만 `ENGINE_CORE`가 이 revision과
core 허용 파일 범위에 결속되어 시작된다.
명시적으로 소비해야 한다.

| 새 target slice | 학생의 실제 결정 | 소유 family |
|---|---|---|
| repeat rule 구성·선언 | 물체·무늬의 반복 단위 성분과 순서를 직접 정하고 선언 | `pattern.repeat-unit.construct-v1` |
| repeat 배열 구성·수정 | 선언한 반복 단위로 다음 항을 만들고 어긋난 항을 교체 | `pattern.declared-repeat.repair-v1` |
| change rule 구성·적용·수정 | 수열의 시작값·간격·방향을 직접 구성·선언하고, 그 관계로 다음 수를 만들며 어긋난 수를 수정 | `pattern.change-rule.construct-v1` |

각 family는 `source.assessmentTargetIds`에 자기 slice만 넣는다. 한 family가 세 slice를 모두 등록하는
방식은 금지한다. TargetSet 재검토가 이 분해를 승인하기 전에는 어떤 family도 W002 완료를 주장하지 않는다.
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
slice 결속을 이미 승인했고, v4 직전 상태에서 소비되었다. `replanTargetSetRequired=false`이므로
v4의 승인·소비는 TARGET_SET을 다시 열지 않고 `ENGINE_CORE`로 재개한다.
v4 후보는 target source, target IDs, outline hash, coverage 분모를 변경하지 않는다.
그중 하나라도 바꿔야 하면 현재 v4 후보에 섞지 말고 새 `SOL_REPLAN` 후 별도
`TARGET_SET` 후보를 만든다.

## 3. 재개 작업 순서

한 번에 한 standard·한 operation만 소유한다. 각 `TARGET_SET`·`FAMILY_TRACK` 뒤에는 Sol review를 거친다.
다만 W002는 세 concrete family를 독립적으로 승인해야 하므로 review key를 표준+operation에서
`standardCode + operation + familyTrackId/scopeId`로 확장하는 orchestrator 작업이 먼저다.

1. `W002-ORCHESTRATOR-GATE` — blocked item을 `nextReplanWork`로 보존하면서 다음 독립 표준을
   `nextOfflineWork`로 선택한다. blocked family는 모든 offline/live numerator와 전역 완료에서 제외한다.
   동시에 familyTrackId/scopeId가 review·candidate·allowedFiles에 결속되는지 검증한다.
   이 단계의 generated operation은 `SOL_REPLAN`·`W002-SOL_REPLAN`이며, 기존
   `FAMILY_TRACK` review attempt를 재사용하거나 A5로 세지 않는다. 허용 파일은 이 문서,
   no-family plan/target outline, board와 파생 execution report로 제한한다.
2. `W002-REPLAN-TARGET_SET` — v4에서는 실행하지 않는다. A3 승인·소비가 이미 세 target
   slice의 statement·invariant·observable evidence·misconception·pinned learning-map
   결속과 outline hash를 고정했다. target 변경이 필요할 때만 새 SOL_REPLAN과
   `supersedesReplanReviewId`·`replanContractRevision`·`targetOutlineSha256`를 가진
   별도 TARGET_SET 후보를 만든다.
3. `W002-REPLAN-AFFORDANCE_DISCOVERY` — 수 변화 family에 필요한 number/state native affordance가
   현재 catalog에 있는지 bounded read/canary로 확인한다. 없으면 새 native tool을 family 안에 몰래 추가하지 않고
   `ENGINE_CORE` 재계획으로 멈춘다.
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

### v4 ENGINE_CORE 범위

이번 AFFORDANCE_DISCOVERY의 결과는 새 native 도구를 추가하는 것이 아니라,
기존 `SM02PB` 배치 위에 학생이 만든 규칙을 의미 상태로 보존하는 공통 core가
필요하다는 것이다. 승인된 ENGINE_CORE 후보는 다음 네 가지를 함께 계약한다.

1. `CognitiveDemandManifest.decision`에 별도 `construct-rule` 결정을 추가한다.
   `correctValuePath` 하나를 고르는 선택형 결정이나 기존 숫자 구성 결정으로
   우회하지 않는다.
2. `cognitive.rule-state-contract` validator predicate를 추가한다. 최소 두 개의
   유효한 ordered variant-list와 하나 이상의 surplus/rejectable state를 검증하고,
   continuation·explanation이 같은 rule-state path를 읽는지 확인한다.
3. templates cognitive registry와 계약 테스트를 결속한다. 이 단계에서는 특정
   family의 generator·layout·released registry를 승격하지 않고, 다음 FAMILY_TRACK이
   소비할 수 있는 공통 manifest/validator seam만 만든다.
4. 공통 compiler payload와 `activitySpecHash`는 변경하지 않는다. 학생의 선언은
   별도 `StudentRuleStateEvidence`/`responseHash`로 다루며, save/reopen 증거는
   FAMILY_TRACK 또는 LIVE_EVIDENCE에서 별도로 수집한다.

ENGINE_CORE가 소비할 계약은 다음 JSON shape로 고정한다. 실제 family가 어떤
role 이름을 쓰더라도 키·의미·path 결속은 이 shape를 바꾸지 않는다.

```json
{
  "decision": {
    "mode": "construct-rule",
    "ruleStatePath": "ruleState",
    "variantRoles": ["rule-variant-1", "rule-variant-2"],
    "variantProperty": "orderedValues",
    "validRuleStatesPath": "validRuleStates",
    "surplusPath": "surplusRuleStates",
    "minimumValidStates": 2,
    "minimumSurplus": 1
  },
  "runtimePredicate": {
    "kind": "cognitive.rule-state-contract",
    "parameters": {
      "mode": "construct-rule",
      "ruleStatePath": "ruleState",
      "validRuleStatesPath": "validRuleStates",
      "surplusPath": "surplusRuleStates",
      "variantRoles": ["rule-variant-1", "rule-variant-2"],
      "variantProperty": "orderedValues",
      "continuationRuleStatePath": "ruleState",
      "explanationRuleStatePath": "ruleState",
      "predictionRole": "prediction-box",
      "explanationRole": "explanation-box",
      "verificationRoles": ["rule-lane", "continuation-lane"],
      "minimumValidStates": 2,
      "minimumSurplus": 1
    }
  }
}
```

`continuationRuleStatePath`와 `explanationRuleStatePath`는 반드시
`ruleStatePath`와 같아야 한다. `validRuleStatesPath`에는 순서가 있는 유효
규칙 상태가 두 개 이상, `surplusPath`에는 화면에서 거부할 수 있는 상태가
하나 이상 있어야 한다. 이 계약은 compile-time envelope를 검증하는 것이며,
학생이 실제로 만든 상태와 `responseHash`는 FAMILY_TRACK/LIVE_EVIDENCE의
별도 lifecycle 증거다.

ENGINE_CORE 후보에서 위 seam이 공통 compiler·planner·MCP·teacher-ui 변경을
요구하면 이 v4 범위를 초과한 것으로 간주하고 즉시 다시 SOL_REPLAN으로 멈춘다.
그 경우 `pattern.repeat-unit.construct-v1` 구현을 partial release로 올리지 않는다.

## 4. 구현 불변량

- 규칙은 보기 카드 하나를 고르는 것으로 끝나지 않는다. compile-time RuleStateEnvelope에는 허용된
  반복 단위 또는 시작값·간격·방향의 envelope와 정답 조건이 들어가고, 학생이 만든 실제 rule state는
  조작 후 StudentRuleStateEvidence로 저장되어 배열·정답·해설의 조건부 rubric과 대조된다.
- `activitySpecHash`는 compile-time resolved spec의 hash이며 학생 조작으로 바뀌지 않는다. 학생이
  선언한 규칙은 별도 `RuleStateEnvelope`로 표현하고, 조작 후에는
  `StudentRuleStateEvidence`와 `responseHash`로 저장·검증한다. preview·answer는 컴파일된 envelope를
  표시하거나 학생 응답을 읽는 조건부 rubric/projector로 정의하며, 학생의 선언 상태 변화가
  `activitySpecHash`를 바꾼다고 주장하지 않는다.
- `construct-rule` decision은 기존 numeric `construct`나 select-one의 `correctValuePath`를 재사용하지 않는다.
  최소 두 개의 서로 유효한 rule state와 surplus/distractor 상태를 저장하고, 학생의 선언 결과가 이후 배열을 결정한다.
- 초기 화면은 완성 정답을 노출하지 않는다. 학생이 규칙을 정한 뒤에만 continuation과 repair answer가 결정된다.
- repair는 선언된 rule과 독립된 실제 오답 상태를 제공하고, 수정 전·후 semantic state가 서로 달라야 한다.
- repeat와 change는 화면 객체·수학적 관계·오개념·검증 불변량이 다르면 같은 family로 합치지 않는다.
- contexts는 시작값만 바꾸는 표면 variation이 아니라 정답 rule state·배열·오개념 상태가 실제로 달라야 한다.
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
- repeat/ change 각각 최소 두 개의 서로 다른 rule state와 두 개의 rejectable misconception state가 있다.
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
