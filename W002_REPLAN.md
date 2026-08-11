# W002 `[2수02-02]` 재계획 — 반복·변화 규칙 배열

상태: **Sol max 재계획 검토 대기**

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

W002의 두 초안 target을 다음 세 개의 reviewed target으로 분해한다.

| 새 target slice | 학생의 실제 결정 | 소유 family |
|---|---|---|
| repeat rule 구성·선언 | 물체·무늬의 반복 단위 성분과 순서를 직접 정하고 선언 | repeat-rule-construction |
| repeat 배열 구성·수정 | 선언한 반복 단위로 다음 항을 만들고 어긋난 항을 교체 | repeat-arrangement-repair |
| change rule 구성·적용·수정 | 수열의 시작값·간격·방향을 직접 정하고, 그 관계로 다음 수를 만들며 어긋난 수를 수정 | change-rule-construction |

각 family는 `source.assessmentTargetIds`에 자기 slice만 넣는다. 한 family가 세 slice를 모두 등록하는
방식은 금지한다. TargetSet 재검토가 이 분해를 승인하기 전에는 어떤 family도 W002 완료를 주장하지 않는다.

새 partial-coverage aggregation schema는 만들지 않는다. 현재 registry의 target union을 그대로
사용하되, 각 family가 자기 target slice만 `source.assessmentTargetIds`에 등록하도록 고정한다.
repeat-only family가 change target을 등록하거나, change family가 repeat target을 등록하는 것은
검토·coverage gate에서 거부한다.

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
2. `W002-REPLAN-TARGET_SET` — 세 target slice의 statement·invariant·observable evidence·misconception과
   pinned learning-map 결속을 갱신하고 target-outline hash를 재생성한다.
3. `W002-REPLAN-AFFORDANCE_DISCOVERY` — 수 변화 family에 필요한 number/state native affordance가
   현재 catalog에 있는지 bounded read/canary로 확인한다. 없으면 새 native tool을 family 안에 몰래 추가하지 않고
   `ENGINE_CORE` 재계획으로 멈춘다.
4. `W002-ENGINE_CORE` — 기존 numeric `construct`나 select-one의 `correctValuePath`를 재사용하지 않는
   별도 `construct-rule` decision과 `cognitive.rule-state-contract` predicate를 만든다.
   가능한 경우 기존 fill-from-pool·SM02PB·NO04NT native 조작을 재사용하고, 공통 compiler schema를
   바꾸지 않는다. predicate·cognitive schema·공통 adapter 변경이 더 필요하면 이 단계에서 다시 막고
   Sol 재계획을 받는다.
5. `W002-REPEAT_RULE_CONSTRUCTION` — `pattern.repeat-unit.construct-v1`로 SM02PB rule lane에서 학생이 성분·순서를 직접 구성하고,
   저장된 rule state가 이후 item·answer·preview를 결정하게 한다.
6. `W002-REPEAT_ARRANGEMENT_REPAIR` — `pattern.declared-repeat.repair-v1`로 이미 선언된 repeat rule을 적용하고, 별도의 잘못된 항을
   실제로 교체한 전후 상태를 저장·검증한다.
7. `W002-CHANGE_RULE_CONSTRUCTION` — `pattern.change-rule.construct-v1`로 시작값·간격·방향이
   화면에서 관찰되는 native number/state 조작으로 rule state를 구성·선언하고, 같은 state로
   수를 이어 놓고 간격·방향 오개념을 수정한다. 이 단계에서 구성과 수정이 서로 다른 결정으로
   드러나면 즉시 별도 family로 split하고 Sol 재계획을 연다.
8. 각 family의 `FAMILY_TRACK` Sol 승인 후에만 W002를 `offline-validated` 후보로 계산한다.

이 재계획과 별도로 **검증 상태 정합성 작업**을 먼저 승인한다. 현재 W002는 Sol board에서
`blocked`인데 `reports/curriculum-coverage/latest.json`과
`reports/curriculum-execution/latest.json`은 registry의 `supportState`만 읽어
`offline-validated`로 표시한다. 파생 report는 최신 `FAMILY_TRACK` review decision을 함께 읽어
`blocked` family를 offline/live target coverage에서 제외해야 한다. board가 `approved`가 아니면
family stage는 `mapped`/`generatable` 이하로만 표시하고, target coverage의 offline numerator도
올리지 않는다. 이 수정은 W002 family 구현에 섞지 않고 별도 loop/report gate 작업으로 테스트한다.

각 family의 native/core 계약이 공통 compiler schema 변경을 요구하면 해당 단계는 즉시 종료하고,
새 `ENGINE_CORE` work item과 Sol 재계획을 만든다. 기존 W002 후보에 schema 변경을 섞지 않는다.

## 4. 구현 불변량

- 규칙은 보기 카드 하나를 고르는 것으로 끝나지 않는다. 학생이 만든 rule state(반복 단위 또는 시작값·간격·방향)가
  저장되어야 하며, 그 state가 배열·정답·해설·exact preview의 원천이어야 한다.
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
- exact preview는 rule lane, 초기 상태, repair 위치, continuation target, 학생이 저장한 rule state를
  모두 표시하고 resolved item·answer key와 같은 projector에서 나온다.

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
