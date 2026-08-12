# W002 `[2수02-02]` 재계획 — 반복·변화 규칙 배열 (v15)

## v15 change-rule source/state lifecycle hard-stop

`W002-SOL_REPLAN_REQUEST-change-rule-SOL-A2`는 v14 ENGINE_CORE 후보
`8265abf`가 native shell을 resolve·compile하지만 학생이 실제로
`startValue`·`stepMagnitude`·`direction`을 기록하고 네 항·수정 항을
완성할 원천과 write semantics는 증명하지 못함을 기록한다. v15
review는 `W002-SOL-REPLAN-SOL-A37`을 supersede하고 이 A2 request를
`supersedesBlockedReviewId`로 소비해야 한다. target 3개·outline hash·기존
repeat-rule/repeat-repair approval/evidence는 변경하지 않는다.

v15의 observable-change envelope은 다음 네 개의 유효 상태로 유한하다.

| state ID | 시작값 | 변화량 | 방향 code→의미 | 네 항 | wrong index/value → repair |
|---|---:|---:|---|---|---|
| `inc-1-by-1` | 1 | 1 | `1→increase` | `1,2,3,4` | `2/8 → 3` |
| `inc-3-by-2` | 3 | 2 | `1→increase` | `3,5,7,9` | `2/4 → 7` |
| `dec-8-by-1` | 8 | 1 | `2→decrease` | `8,7,6,5` | `2/2 → 6` |
| `dec-6-by-2` | 6 | 2 | `2→decrease` | `6,4,2,0` | `2/9 → 2` |

모든 원천은 released `NO04NT` 0–9 수 카드다. 방향은 잠긴 legend
`1=늘어남`, `2=줄어듦`과 `enum-map-v1`로 의미를 보이게 고정한다.
유효 state 마다 start·step·direction 선택 3개, sequence 위치별 4개,
repair 1개를 별도 physical role로 제공한다. 즉 4 state ×
8 action = 32 source role이며, 각 constraint의 source pool은 해당 필드/위치의
4 role로 제한한다. pool 사이 role은 겹치지 않고
`move-once-no-clone`이며, 선택한 state의 8 source를 동시에 사용해도
다른 source를 재사용하지 않는다.

각 source는 `ruleStateKey`를 갖고 제어 constraint는
`phase=rule-selection`, `writesStatePath=studentChangeRuleState`, exact
`stateField`·`stateIndex`, `sourceValueProperty=value`, 필드별 decoder를 쓴다.
세 제어는 같은 `ruleStateKey`에서 와야 한다. sequence constraint는
`phase=apply-declared-change`, `writesStatePath=constructedSequenceState`, exact
`writesStateIndex`, `sourceValueProperty=value`, selected state key 일치를 강제한다.
repair constraint는 `phase=repair-declared-change`,
`writesStatePath=repairedChangeSequenceState`,
`writesStateIndexPath=misalignedTermIndex`, `mappingPath` 일치를 강제한다.

정답 누출 검사는 locked non-source emission 전체에서
`startValue`·`stepMagnitude`·`direction`을 **순서와 무관하게** 집계한다.
구조화 property와 visible text 모두를 검사하고, 동일 상태의 6개 field
순열을 나눈 locked emission 반례가 모두 차단되어야 한다.
layout/native 증거는 32 source·8 target의 동시 가시성, `NO04NT`
0–9 exact source ID/value, number-card rendered bounds, disjoint pool containment을 다룬다.

v15 거버넌스 승인 전·후에도 change-rule state는
`completedOperations=[]`, `nextOperation=ENGINE_CORE`로 남는다. 새 pending
artifact는 authority 파일만 결속하며 `8265abf`를 completion evidence로
재사용하지 않는다. v15 승인 후 위 계약을 구현한 새 bounded
ENGINE_CORE candidate와 별도 completion transition이 필요하다.

상태: **Sol max 재계획 후보 — reviewer transaction window 승인 대기**

## v14 frozen candidate reviewer transaction window

`W002-FAMILY_TRACK-repeat-repair-SOL-A3`의 frozen candidate `2f3ce90`과 reviewer
commit `0bf29be` 사이에는 별도로 승인된 W002 governance 작업이 있다. 기존
`verify-sol-review-gate`는 `candidate..HEAD` 누적 diff 전체를 A3 post-approval
transaction으로 해석해, A35에서 정식 승인된 `W002_REPLAN.md`까지 FAMILY_TRACK 범위
위반으로 오인한다. v14는 request
`W002-SOL_REPLAN_REQUEST-change-rule-SOL-A1`만 소비해 이 transaction 경계를 고친다.

게이트는 exact review record가 최초 등장한 descendant commit을 reviewer commit으로
식별하고, 그 한 commit의 diff만 operation의 postApproval manifest와 대조한다. 동시에
candidate에서 reviewer parent까지 candidate implementation 파일이 바뀌면 거부하고,
현재 HEAD에서도 `reviewCandidateIsCurrent`가 false면 거부한다. 최초 reviewer commit의
record와 현재 board record가 다르면 감사 기록 변조로 거부한다.

이 보정은 `W002_REPLAN.md`를 FAMILY_TRACK postApproval scope에 추가하지 않으며, 중간
commit을 모두 무시하지도 않는다. repeat-rule/repeat-repair family source와 승인,
[2수02-02] offline 2/3·live 0/3, 세 target·outline hash·세 scope, repeat evidence는
그대로 보존한다. v14 승인 후 A3 gate를 exact frozen candidate로 다시 실행해 PASS한
뒤에만 change-rule ENGINE_CORE를 재개한다. 이번 governance 후보에는 change-rule
schema·validator·layout·family 구현을 섞지 않는다.

clean replay는 `W002-FAMILY_TRACK-repeat-repair-SOL-A4`와 reviewer commit
`7f034a9cb6eae7fbefa05c63804e18ecc0b98ea1`로 고정했다. 이 commit은 board와 파생
no-family JSON/Markdown 세 파일만 포함한다. gate는 frozen candidate `2f3ce90`에 대해
`reviewerCommit=7f034a9`, `postApproval=3 files`로 통과해야 한다. 과거 A3 transaction의
범위 오류를 전역 FAMILY_TRACK manifest 확장으로 숨기지 않고 A4가 최신 승인 identity를
대체한다.

## v13 change-rule ENGINE_CORE 분리

`W002-FAMILY_TRACK-repeat-repair-SOL-A2`에서 repeat-repair family 자체의 교육·수학·
native·preview 검토는 통과했지만, 승인 후 다음 cursor인
`pattern.change-rule.construct-v1 / ENGINE_CORE`에 고유 계약과 artifact가 없어 파생
transaction이 fail-closed했다. v13은 이 blocker만 소비하며 repeat-repair frozen family,
v12 completion artifact와 state evidence, repeat-rule v10 compatibility evidence, A3의
3-target source·outline hash, 세 review scope를 수정하지 않는다.

새 review는 `W002-SOL_REPLAN-SOL-A34`를 `supersedesReviewId`로,
`W002-FAMILY_TRACK-repeat-repair-SOL-A2`를 `supersedesBlockedReviewId`로 소비해야 한다.
v13 승인 전에는 repeat-repair를 offline-validated로 승격하지 않으며 [2수02-02] offline
coverage는 1/3, live coverage는 0/3으로 유지한다. 승인 뒤에도 repeat-repair family는 같은
frozen candidate로 새 scoped FAMILY_TRACK review를 통과해야 2/3으로 올라간다.

change-rule은 repeat의 조각 순서나 repair 계약을 상속하지 않는다. 학생 결정은
`startValue`·`stepMagnitude`·`direction(increase|decrease)`을 직접 정하는 것이고,
불변량은 모든 인접 항의 차가 선언한 signed step과 같다는 것이다. 관찰 증거는 다음과
같이 분리한다.

1. 초기 `studentChangeRuleState`는 비어 있고, 학생이 세 field를 모두 선언한다.
2. 최소 네 항의 `constructedSequenceState`에서 각 인접 차를 선언 상태와 대조한다.
3. `misalignedTermIndex`의 항만 `replace-with-declared-transition-value`로 바꾸며 다른 항은
   보존한다.
4. 정답은 한 고정 수열이 아니라 학생이 선언한 상태에 종속된 conditional rubric이다.

`engineCoreContractsByFamilyTrack`은 `contractKind=declared-repeat-repair`와
`contractKind=observable-change`를 fail-closed로 분기한다. change-rule ref가 없거나 repair
ref로 fallback하거나 runtime predicate/binding의 state path가 다르면 builder가 거부한다.
pending artifact는 v13 authority 세 파일의 현재 SHA만 결속하고 구현 완료를 주장하지
않는다. completion artifact는 별도 `completionImplementationFiles`의 schema·validator·
cognitive audit·전용 `w002-change-rule-v1` layout과 native bounds 증거가 모두 current일 때만
`implemented-verified-pending-family-track`을 허용한다.

v13의 `ENGINE_CORE` allowed/postApproval scope에는 change-rule 전용 layout source/test만
추가한다. family generator, registry family source, exact preview, response/save/reopen,
teacher UI, live MathCanvas canary는 이번 재계획 범위가 아니다. 공통 compiler payload나
새 native tool이 필요하다고 드러나면 범위를 조용히 넓히지 않고 새 SOL_REPLAN으로
hard-stop한다.

## v12 FAMILY_TRACK post-approval 파생 체인 보정

`W002-FAMILY_TRACK-repeat-repair-SOL-A1`은 family의 교육·수학·native·preview
검토 때문이 아니라, 승인 뒤 가장 먼저 갱신해야 하는
`reports/problem-family-registry/**`가 `FAMILY_TRACK` post-approval manifest에서
빠져 있어 `blocked` 되었다. 이 보정은 새 수학 계약이 아니므로 revision을 v13으로
올리지 않는다. `W002-SOL-REPLAN-v12`, A3의 세 target, 아래 세 review scope,
repeat-rule compatibility evidence와 repeat-repair ENGINE_CORE completion evidence를
그대로 보존한다.

새 SOL_REPLAN review는 `W002-SOL_REPLAN-SOL-A31`을 `supersedesReviewId`로,
`W002-FAMILY_TRACK-repeat-repair-SOL-A1`을 `supersedesBlockedReviewId`로 소비해야
한다. 승인 뒤 파생 파일은 반드시 다음 순서로 갱신한다.

1. problem-family registry
2. curriculum coverage
3. curriculum execution
4. no-family plan

`operationPolicy.postApprovalDerivedReportChainByOperation.FAMILY_TRACK`이 이 순서와
각 exact JSON/Markdown 경로·명령을 소유하며 builder는 모든 경로가 FAMILY_TRACK의
allowedFiles와 postApprovalFiles 양쪽에 포함됐는지 fail-closed 검증한다. 이
governance 승인은 family 자체를 승인하지 않는다. 같은 frozen family candidate를 새
scoped FAMILY_TRACK attempt로 다시 검토해 승인한 뒤에만 registry가
`offline-validated`, coverage가 2/3, execution이 두 offline family, no-family cursor가
`pattern.change-rule.construct-v1 / ENGINE_CORE`로 순서대로 전진할 수 있다.

v12는 A30이 승인한 lifecycle v11과 `b95c143`의 bounded ENGINE_CORE 구현을
바꾸지 않는다. 새 preflight request
`W002-SOL_REPLAN_REQUEST-repeat-repair-SOL-A3`는 A2를 supersede하며, v12
SOL_REPLAN 후보 A31은 A30과 A3를 각각 `supersedesReviewId`와
`supersedesBlockedReviewId`로 정확히 소비해야 한다. cognitive schema·validator·layout·
positive fixture 10개 구현 파일과 v11 artifact 본문은 이 governance 후보에서 수정하지
않는다.

학생 상태 계약은 초기 `studentRuleState`와 학생 선택 결과인
`declaredRuleState`를 분리한다. rule-selection constraint는 indexed slot별로
`declaredRuleState`에 값을 쓰고, continuation·explanation·repair는 그 출력만 읽는다.
`declaredRuleState`를 item 초기 값에 미리 넣는 것은 금지한다. repair 후 상태는 고정된
정답 목록 중 하나가 아니라 `declaredRuleState[repairRuleStateIndex]`를 사용한
조건부 mapping(`replace-at-declared-rule-index`)으로 검증해야 한다.

v12는 마지막 승인 revision v11의 repeat-repair ENGINE_CORE contract와 repeat-rule
compatibility evidence를 보존한다. A3 TARGET_SET의 세 target·outline hash·learning-map
결속도 바꾸지 않는다. request A3의 `blockedContractRevision`은 v11이고 새 권위 계약은
`W002-SOL-REPLAN-v12`다.

request 소비 review가 승인·소비되기 전에는 W002 repeat-repair cursor를
`ENGINE_CORE`에서 전진시키지 않는다. 이 문서의 v12는 계약·거버넌스 승인이지
repeat-repair family 구현, exact preview, response/save/reopen, live canary 또는
release 승인이 아니다.

v9에서 확인한 공통 seam은 9개의 repeat-rule physical source와 rule slot 2개·
continuation target 4개를 동시에 요구했지만, 기존 blueprint constraint schema는
source를 8개로 제한하고 wave16 preset은 188×188 target을 2개만 제공했다. 이 역사적
문제를 source 8개 축소나 wave16 재사용으로 숨기지 않고 v9에서 해소했다. v11의
repeat-repair는 여기에 독립 misaligned item과 replacement target을 추가하므로
선택된 값별 4개 복제가 필요하고, 12-source 계약을 별도로 소유한다.

v11이 허용하는 공통 변경은 다음뿐이다: declarative/resolved constraint source 상한을
명시적 12로 대칭 확장하고 9-source repeat-rule 회귀와 12-source repair 회귀를 함께
유지한다; architecture baseline을 갱신한다; wave16을 수정하지 않고 repeat-rule
compatibility와 `w002-repeat-repair-v1` 전용 preset·registry·containment/resolve
테스트를 추가한다. family generator·teacher UI·response/save-reopen은 여전히 이
재계획 범위 밖이다.

## v12 completion status와 상태 전이 계약

- 차단 근거: `reports/curriculum-execution/subwork-state/W002-FAMILY_TRACK-repeat-repair-completion-preflight-v12.json`
  및 request review `W002-SOL_REPLAN_REQUEST-repeat-repair-SOL-A3`.
- request artifact SHA-256: `f87dbc15eab0a8be30582d9a37962092c68e67cc6249f7f8e23739984f27e90f`.
- 재계획 revision: `W002-SOL-REPLAN-v12`, `replanTargetSetRequired=false`.
- request의 blocked revision: `W002-SOL-REPLAN-v11`.
- repair artifact 경로는 기존
  `reports/curriculum-execution/subwork-state/W002-FAMILY_TRACK-repeat-repair-engine-core-v11.json`을
  유지한다. `pendingStatus=planned-pending-engine-core`,
  `pendingContractRevision=W002-SOL-REPLAN-v11`,
  `completionStatus=implemented-verified-pending-family-track`,
  `completionContractRevision=W002-SOL-REPLAN-v12`를 서로 다른 권위 값으로 둔다.
- repeat-repair가 `ENGINE_CORE` 미완료일 때는 completion evidence를 금지하고, artifact는
  pending status·v11 revision·정확한 10개 implementation file current SHA를 가져야 한다.
  pending artifact는 어떤 경우에도 완료 evidence로 인정하지 않는다.
- 완료 전이는 artifact를 completion status·v12 revision으로 승격한 뒤 그 파일의 현재
  whole-file SHA를 `completionEvidenceByOperation.ENGINE_CORE`에 결속해야 한다. builder는
  operation/work item/standard/family/scope/revision/status, implementation file 집합과 각
  current SHA, whole-file SHA를 모두 exact 검사한다.
- v12 governance 승인만으로 W002 state를 완료 처리하지 않는다. 승인 뒤에도
  repeat-repair는 `completedOperations=[]`, `nextOperation=ENGINE_CORE`, evidence 없음이다.
  별도 bounded state transition이 위 증거를 기록한 뒤에만
  `completedOperations=[ENGINE_CORE]`, `nextOperation=FAMILY_TRACK`이 된다.
- status projection은 active `nextFamilySubWork`에서 operationWorkItemId와 완료 prefix를
  도출한다. repeat-repair FAMILY_TRACK의 exact identity는
  `W002-FAMILY_TRACK-repeat-repair-FAMILY_TRACK`, 완료 prefix는 `[ENGINE_CORE]`이다.
  repeat-rule v10 compatibility artifact와 state evidence는 별도로 그대로 보존한다.

## v11 hard-stop과 재진입 계약 (historical authority)

- 차단 근거: `reports/curriculum-execution/subwork-state/W002-FAMILY_TRACK-repeat-repair-lifecycle-preflight-v11.json`
  및 request review `W002-SOL_REPLAN_REQUEST-repeat-repair-SOL-A2`.
- request artifact SHA-256: `7f43d1df43f0615711ce05903c3802b4077e8ba4d5b4512ea1b2ef6d970f30e1`.
- 재계획 revision: `W002-SOL-REPLAN-v11`, `replanTargetSetRequired=false`.
- request의 blocked revision: `W002-SOL-REPLAN-v10` (소비할 마지막 승인 revision).
- constraint capacity: `maxSources=12`, repeat-repair `requiredSources=12`; 두 schema가
  같은 상한을 사용하고 12는 통과·13은 거부해야 한다.
- layout capacity: repeat-rule compatibility는 tokenSet
  `w002-repeat-rule-construction-v1`·source 9를 보존하고, repeat-repair는
  `w002-repeat-repair-v1`·source 12·rule slot 2·continuation 4·misaligned 1·repair
  target 1·bank 1을 사용한다. 각 target 최소 188×188, 모두 동시에 보이며 native
  rendered bounds를 containment 검사한다.
- v11 승인 후 순서: repeat-rule v10 compatibility evidence를 보존한 채 repeat-repair
  `ENGINE_CORE` 계약·전용 preset의 구현 후보를 만들고, artifact/current SHA를 독립
  검증한 뒤에만 repeat-repair FAMILY_TRACK으로 진입한다. v9 artifact를 repair evidence로
  기록하거나 덮어쓰지 않는다.

## v8 이전 governance의 위치

아래 v6/v7/v8 절은 왜 학생 구성 상태·completion evidence·용량 계약이 필요했는지에 대한
역사적 근거다. 현재 권위 revision과 실행 순서는 이 문서의 v12 절과
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
현재 v10에서 역사 자료로만 취급한다.

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
v10의 승인·소비는 TARGET_SET을 다시 열지 않고 repeat-repair `ENGINE_CORE`로 재개한다.
v10 후보는 target source, target IDs, outline hash, coverage 분모를 변경하지 않는다.
그중 하나라도 바꿔야 하면 현재 v10 후보에 섞지 말고 새 `SOL_REPLAN` 후 별도
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
요구하면 이 v10 범위를 초과한 것으로 간주하고 즉시 다시 SOL_REPLAN으로 멈춘다.
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

## v10 재계획 — repeat-repair ENGINE_CORE 계약 분리

현재 v10 후보는 `SOL_REPLAN_REQUEST` preflight를 먼저 소비해야 한다. 기존
repeat-rule A2 blocker는 v9 A23이 이미 소비했으므로 새 repeat-repair blocker
artifact `W002-FAMILY_TRACK-repeat-repair-engine-core-preflight-v10.json`과
별도 blocked request record 없이는 v10을 재계획으로 승인하지 않는다. 이 문서의
v10 repair 계약은 아직 구현 완료를 뜻하지 않는다.

v9 승인으로 완료된 것은 `pattern.repeat-unit.construct-v1`의 ENGINE_CORE와
FAMILY_TRACK뿐이다. 현재 `trackContracts.C01.engineCoreContract`가 세 concrete
sub-work에 하나의 repeat-rule 계약과 하나의 artifact identity를 투영하고 있어,
`pattern.declared-repeat.repair-v1`에 이를 재사용하면 builder가
`workItemId`·`familyTrackId`·`scopeId`를 맞출 수 없고, 맞추도록 덮어쓰면 승인된
repeat-rule evidence를 훼손한다. 따라서 repeat-repair는 새 계약·새 artifact·새
native layout을 가져야 한다.

v10의 governance 변경은 다음을 허용한다.

1. `engineCoreContractsByFamilyTrack`로 concrete sub-work별 계약을 선택한다. 현재
   repeat-rule v9 계약과 artifact는 그대로 보존하고, repeat-repair는 v10 계약을
   별도로 추가한다. 계약 ref가 없거나 다른 family의 ref로 fallback하는 것은
   fail-closed다. change-rule 계약은 아직 없으므로 그 cursor는 다시 ENGINE_CORE
   재계획이 필요하다.
2. repeat-repair 계약은 선언된 `studentRuleState`를 기준으로 **초기 배열의 독립된
   misaligned item → bank로 제거 → 빈 repair target에 replacement 배치 → 다음
   배열과 rule state 대조**의 전후 상태를 요구한다. `beforeStatePath`와
   `afterStatePath`가 서로 달라야 하고, remove/place-in·replacement
   fill-from-pool constraint가 같은 item의 role/state에 결속되어야 한다.
3. `w002-repeat-repair-v1` 전용 layout preset은 misaligned item, repair bank,
   repair target과 rule/continuation lane을 동시에 표시하고 모든 native rendered
   bounds를 landing surface 안에 둔다. 기존 `wave16`과 `w002-repeat-rule` preset은
   수정·재사용하지 않는다.
4. repeat-repair artifact는
   `reports/curriculum-execution/subwork-state/W002-FAMILY_TRACK-repeat-repair-engine-core-v10.json`
   고유 identity를 사용하며, 구현 파일 SHA·artifact SHA·standard/family/scope/
   operation을 builder가 모두 검증한다. repeat-rule v9 artifact를 repair evidence로
   제출하면 즉시 거부한다.
5. 이 v10은 repair core 계약·validator·전용 layout seam만 연다. family generator,
   exact preview, response/save/reopen, live canary와 release는 ENGINE_CORE 승인
   범위가 아니며 이후 `FAMILY_TRACK`에서 별도 증거를 제출한다. 공통 compiler
   payload나 planner/MCP/teacher-ui를 바꿔야 하면 이 candidate를 중단하고 새
   SOL_REPLAN으로 되돌린다.

## v10 capacity correction — 12 physical sources

repeat-repair는 rule slot 2개, continuation 4개, 독립 repair target 1개를
`move-once-no-clone`으로 동시에 구성한다. 따라서 선택된 두 의미값 중 repair
index의 값은 `1 + 4 / 2 + 1 = 4`개가 필요하다. 3값×3복제의 9 source는 이
상태를 만들 수 없으므로 권위 계약을 3값×4복제의 **12 source**로 고정한다.

- repair override: `constraintCapacity.requiredSources=12`, `sourceRoles=12`,
  `minimumCopiesPerDistinctValue=4`.
- builder·Zod·validator·pedagogy audit는 continuation 수와 repair target 수를
  포함한 copy capacity를 fail-closed로 계산한다.
- 기존 repeat-rule v9 compatibility artifact는 덮어쓰지 않는다. repair 전용
  `w002-repeat-repair-v1` layout, 실제 native bounds, generator, response/save/reopen
  증거는 다음 ENGINE_CORE/FAMILY_TRACK에서 별도로 검토한다.

## A26 상태 lifecycle 및 request 소비 경계

A25 검토에서 초기 규칙 선택 상태와 repair 시 선언된 규칙 상태를 같은 관찰값으로
동시에 요구하는 모순이 발견됐다. 따라서 v10 권위 계약에는
`empty-selection-then-declared-repair` lifecycle을 명시한다. 하나의
`studentRuleState` 경로를 사용하되 `rule-selection → remove-misaligned →
place-replacement` phase 순서를 고정하고, 초기 상태는 empty, repair 단계의 선언
상태는 `validRuleStateExamples`에 결속된 cardinality 2 결과로 구분한다. 이 문서는
phase를 선언할 뿐이며 validator·audit가 실제 phase별 응답과 positive resolved
fixture를 통과하기 전에는 repair 구현 완료를 주장하지 않는다.

또한 preflight `SOL_REPLAN_REQUEST`는 **승인된** SOL_REPLAN이 fully bound되고
실제로 소비될 때만 historical로 전환된다. `changes-requested`, `blocked`, 승인 전
또는 아직 소비되지 않은 approved record는 request를 계속 노출한다. A25의
changes-requested 상태에서 request가 사라지는 것은 금지하며, 이후 승인된 A26이
request를 소비하고 repeat-repair ENGINE_CORE cursor로 재개하는 전후 상태를
회귀 테스트로 고정한다.

이번 A26은 이 권위·상태 머신·builder 검증만 변경한다. cognitive schema,
validator/pedagogy audit, native repair layout, 12-source positive resolved
fixture는 A26 승인 후 별도 ENGINE_CORE 후보에서 구현·검토한다.

## v11 재계획 — 학생 선언 상태와 조건부 repair 결속

v11의 권위 변경은 v10의 12-source·전용 layout capacity를 유지하면서 phase의
실제 데이터 흐름을 고정한다.

- `stateLifecycle.selectionPhase`는 `rule-selection`이고,
  `selectionOutputStatePath`는 `declaredRuleState`여야 한다.
- 각 `construct-rule-slot-*` constraint는 `phase=rule-selection`,
  `writesRuleStatePath=declaredRuleState`, `ruleStateIndex=0/1`을 가져야 하며,
  두 write의 결과가 valid declared state와 정확히 일치해야 한다.
- 초기 `studentRuleState`는 빈 배열이어야 한다. declared output을 item 값에 미리
  넣고 selection evidence가 없는 fixture는 승인하지 않는다.
- `application.ruleStatePath`, continuation/explanation path, repair의
  `declaredRuleStatePath`는 모두 `declaredRuleState`로 동일해야 한다.
- `repair.afterStateDerivation`은 `replace-at-declared-rule-index`이며,
  `declaredRuleStatePath`·`repairRuleStateIndex`와 일치하고
  `requiresConditionalMapping=true`여야 한다. 모든 valid declared state에 대해
  수정 후 상태가 해당 index 값으로 계산되는 mapping과, mismatch·다른 index 변경·
  replacement value 불일치 negative fixture를 요구한다.
- v11 artifact 경로는
  `reports/curriculum-execution/subwork-state/W002-FAMILY_TRACK-repeat-repair-engine-core-v11.json`이며,
  승인 전에는 `planned-pending-engine-core` 상태다. v10 artifact를 덮어쓰거나
  repeat-rule compatibility evidence를 재사용하지 않는다.
