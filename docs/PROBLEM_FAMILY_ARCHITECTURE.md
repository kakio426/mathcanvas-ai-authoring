# ProblemFamily 확장 아키텍처

## 현재 위치

Phase 1은 기존 활동별 중앙 분기를 없애기 위한 공통 실행 경계다. 현재 등록된
30개 family는 canonical `ProblemFamilyManifest`로 정확히 한 번씩 조회되고,
그중 21개는 기존 release evidence를 보존한 `live-released` 상태다. 첫 native
family는 `[2수04-01]`의 reviewed target 4개 중 3개만 다루는
`offline-validated` 상태다. 따라서 이 숫자는 교육과정 완전 커버리지가 아니다.
전체 121개 target set이 완성되기 전에는 전역 `targetCoverage`도 산정하지 않는다.

기존 29개는 결과를 바꾸지 않기 위해 `legacy-blueprint-adapter`로 감쌌다. 신규
문제군은 `native-render-recipe`와 `ProblemFamilyNativeModule` 경로만 사용한다.

## 단일 등록 단위

신규 문제군 모듈은 다음 다섯 항목을 함께 내보낸다.

1. `source`: 공식 성취기준, canonical FamilyId, generator·blueprint binding,
   lifecycle과 release evidence의 원천
2. `capability`: 지원 수·맥락·문항 수·난이도, 교사용 field 정의, 기본
   `ProblemParameters`, 미지원 조건 처리 정책
3. `runtime`: 결정적 prepare 함수, 정답·exact preview, 실제 적용
   `ProblemParameters` projector, 감사용 variation 문항 생성 경계
4. `cognitiveManifest`: 학생의 판단·오개념 갈등·확인·수정 경로와 고정
   learning-map 결속
5. `variationEnvelope`: 지원하는 전체 유한 파라미터 공간과 기본값

이 항목들을 `ProblemFamilyNativeModule` 하나로 묶어 해당 교육과정 영역 index에
등록한다.

```text
problem-families/domains/
  number-operations/
  change-relationships/
  geometry-measurement/
  data-probability/
```

새 문제군 때문에 공통 planner, MCP schema, teacher-ui form, template registry,
generator·variation·cognitive 중앙 registry의 family별 목록, `ACTIVITY_IDS`,
`ACTIVITY_SUPPORT`를 수정하지 않는다. planner는
`requestedFamilyId` 또는 성취기준·조작 route로 manifest를 찾고, MCP는 generic
`ProblemParameters` envelope를 받으며, teacher-ui는 capability field를 그대로
폼으로 투영한다. runtime과 세 감사 registry는 영역 index의 native module을 자동
합친다.

## legacy strangler 경계

다음 자료는 기존 29개 결과를 보존하기 위한 frozen input이다.

- `packages/contracts/src/catalog/activity-support.ts`
- `packages/templates/src/problem-families/legacy-manipulations.ts`
- 기존 `templates/src/registry.ts`, `item-generators/registry.ts`,
  `variations/registry.ts`, `cognitive/registry.ts`의 legacy 수동 목록

신규 문제군은 이 목록에 추가하지 않는다. canonical registry가 legacy 자료를 읽어
manifest로 투영할 뿐, contracts 패키지가 상위 templates 패키지를 역참조하지는
않는다. 이 의존 방향 때문에 과거 `ACTIVITY_*` export를 새 registry의 원천이라고
부르지 않는다.

## fail-closed 검증

- family/activity/template ID, generator ID·version, blueprint hash, 교육과정 binding,
  support state, variation envelope, cognitive manifest가 source와 runtime 사이에서
  다르면 시작 시 실패한다.
- native family가 reviewed target을 하나도 선언하지 않거나 다른 공식 성취기준의
  target을 연결하면 시작 시 실패한다.
- capability가 맞춤 파라미터를 선언하면 실제 생성 결과에서 값을 다시 읽는
  projector가 반드시 있어야 한다.
- 지원하지 않는 family·field·value와 서로 충돌하는 legacy/new 요청은 확인 필요
  오류로 멈춘다. 입력값을 그대로 echo해서 `반영됨`으로 표시하지 않는다.
- 공식 성취기준→manifest→runtime blueprint→release evidence hash 조인이 끊기면
  커버리지 보고서 생성이 실패한다.
- `released` 21개의 blueprint/layout/compiled payload hash는
  `fixtures/golden/problem-family-released-v1.json`과 대조한다.

## 신규 문제군 완료 기준

영역 index에 등록됐다는 사실만으로 출시하지 않는다. Phase 2 이후 각 문제군은
reviewed AssessmentTarget, 결정적 문항·정답·해설, 오개념 구별, exact preview,
compiler·validator 통과, MathCanvas 저장·재열기와 현재 hash에 결속된 evidence를
모두 갖춰야 `live-released`가 된다.

주요 자동 검증:

```bash
pnpm exec vitest run packages/templates/src/problem-families/registry.test.ts
pnpm exec vitest run tests/problem-family-released-baseline.test.ts
pnpm curriculum:coverage
pnpm check
```
