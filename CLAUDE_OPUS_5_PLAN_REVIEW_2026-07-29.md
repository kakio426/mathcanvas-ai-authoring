# Claude Opus 5 계획 독립 심사

## 심사 정보

- 심사일: 2026-07-29
- 실행 도구: Kiro CLI
- 모델: `claude-opus-5`
- effort: `high`
- 권한: 읽기 전용
- 심사 대상:
  - `PLAN.md`
  - `IMPLEMENTATION_PROMPT.md`
  - `packages/contracts/src/schemas.ts`
  - `packages/mathcanvas-compiler/src/index.ts`
  - `packages/mathcanvas-compiler/src/native-objects.ts`
  - `packages/validator/src/index.ts`
  - `packages/templates/src/index.ts`
  - `packages/planner/src/index.ts`
  - `packages/managed-browser/src/page-operations.ts`

## 최종 판정

**조건부 No-Go, 종합 5.0/10**

현재 계획은 하드코딩을 제거하는 메커니즘보다 하드코딩을 다른 폴더와 레지스트리로
옮기는 메커니즘에 가깝다. 안전 경계는 강하지만, 활동 양식이 고정되지 않아야 한다는
사용자의 비타협 조건을 아직 충족하지 못한다.

| 평가축 | 점수 | 핵심 판단 |
|---|---:|---|
| 안전성 | 8/10 | 새 프로젝트 전용, 승인·payload 해시, fail-closed는 유지 가치가 높음 |
| 교육 품질 | 6/10 | 교육 요구는 좋지만 활동별 validator가 늘어날 위험 |
| 확장성 | 4/10 | ToolAdapter는 타당하나 활동 추가 비용이 여전히 코드에 비례 |
| 저작 유연성 | 3/10 | 교사 표면은 여전히 고정 양식 선택기에 가까움 |
| 실행 가능성 | 4/10 | 전 도구 심층 조사와 대규모 리팩터가 하나의 직렬 작업으로 묶임 |

## 치명적 발견

### F1. 실제 양식 하드코딩의 중심은 절대 좌표다

현재 활동은 `x`, `y`, `width`, `height`, `top`, `commonStartX` 같은 매직넘버로
구성된다. ActivitySpec을 일반화해도 활동마다 절대 좌표를 작성한다면
`새 활동 = 새 손코딩 기하 함수`가 된다.

필수 대응:

- 저작 문서에서 절대 좌표 사용 금지
- `canvas`, `band`, `row`, `stack`, `grid`, `slot`, `anchor`로 구성된 결정적 layout 대수
- 절대 좌표는 resolver의 `ResolvedActivity` 출력에서만 생성
- 겹침·이탈·최소 간격·최소 조작 크기는 resolver 출력에 대한 일반 검증으로 전환

### F2. 템플릿별 validator는 하드코딩을 파일로 흩트릴 뿐이다

현재 validator는 분수 역할명, 문자열 ID 조립 규약, 특정 성취기준과 목표 문구를 직접 안다.
이를 “템플릿별 validator” 파일로 분리하면 활동 수만큼 validator가 계속 늘어난다.

필수 대응:

- 문자열 조립 ID 금지, 명시적 ref 사용
- 닫힌 `InteractionConstraint` 어휘 도입
- 활동별 validator 금지
- 수학 문항 생성기는 자체 불변조건만 제공
- 활동이 늘어도 공통 validator 코드는 늘지 않게 적합성 테스트로 강제

### F3. 현재 교사 표면은 고정 양식 카탈로그다

검증된 템플릿만 노출하고 문제 수·난이도 정도만 바꾸면 내부 구현이 일반화돼도
교사는 고정 양식만 선택하게 된다.

필수 대응:

- T0: 추천된 blueprint 선택
- T1: blueprint가 선언한 knob 조정
- T2: blueprint가 허용한 variation point 교체
- T3: 완전 자유 조합은 개발자 내부 전용

T1과 T2가 있어야 교사가 코드 변경 없이 교구 표현, 응답 방식과 허용된 배치 변형을
바꿀 수 있다.

### F4. 첫 활동이 모두 분수라 추상화가 분수에 과적합한다

분수 크기 비교, 동치분수, 수직선에 분수 나타내기는 모두 같은 길이 표상 계열이다.
이 세 활동만으로 공통 어휘를 확정하면 십 배열판, 가르기·모으기, 접시저울에서
재설계될 가능성이 크다.

필수 대응:

- 첫 적합성 게이트에 비분수 활동 1건 포함
- 권장 활동: `10 가르기·모으기`
- `aggregate-equals` 같은 일반 제약이 분수 외 활동과 향후 접시저울에도 적용되는지 확인

### F5. 라이브 계약 검사가 제작자가 통제하지 않는 공개 프로젝트에 의존한다

현재 public project 두 건이 변경되거나 삭제되면 전체 생성이 fail-closed로 막힐 수 있다.

필수 대응:

- 제작자 소유 `AI-CONTRACT-PROBE-*` 프로젝트를 1차 probe로 사용
- public project는 2차 fallback
- `contract-probe-unavailable`과 `contract-mismatch`를 구분
- 활동이 실제 요구하는 ToolContract probe만 실행

### F6. 팔레트 해시는 생성 게이트가 될 수 없다

무관한 도구가 하나 추가돼도 전체 팔레트 해시가 달라진다. 팔레트 해시는 조사
메타데이터로만 사용하고 생성 게이트에서는 제외해야 한다.

### F7. 현재 계획은 한 번에 실행하기 너무 크다

전 팔레트 심층 조사, 신규 앱·패키지, v1/v2 병존, 추상화 리팩터, 세 활동과 canary를
단일 실행 지시에 넣은 것은 중간 교정 지점이 부족하다.

## 채택 권장 대안

### 결론

**검증된 primitive 기반 recipe DSL을 중심으로 하고, 선언형 scene graph와 닫힌
constraint 어휘를 결정적인 형태로 제한 채택한다.**

완전 자유 생성은 안전성 때문에 기각한다. 코드 정의 템플릿 레지스트리만으로는
유연성이 부족하다. 범용 제약 해결기는 과설계다.

### 핵심 불변조건

> 새 활동 blueprint를 추가할 때 `contracts/vocabulary`, `compiler/resolve`,
> `validator/layers`는 한 줄도 변경되지 않아야 한다.

> 새 도구를 추가할 때 공통 validator는 변경되지 않아야 한다.

이 조건을 아키텍처 적합성 테스트로 강제한다.

## 하드코딩 판별 규칙

어떤 코드나 상수의 개수가 무엇에 비례하는지 확인한다.

| 비례 대상 | 판정 |
|---|---|
| 지원 도구 수 | 정당한 코드 |
| 수학 개념 수 | 정당한 코드 |
| layout·constraint 어휘 크기 | 정당한 코드 |
| 보편 안전 불변조건 | 정당한 코드 |
| 활동·양식 수 | 금지할 하드코딩 |

정당하게 코드로 남는 것은 네 종류다.

1. ToolAdapter의 MathCanvas native 계약
2. ItemGenerator의 도메인 수학
3. LayoutBlock·InteractionConstraint의 일반 semantics
4. 보안·무결성 로직

활동별 지시문·교육 메타데이터는 데이터로 두고, 활동별 좌표·배치 함수·validator는
만들지 않는다.

## 최소 성장형 구조

신규 패키지를 처음부터 만들지 않는다. 기존 패키지 안의 디렉터리로 시작한다.

```text
packages/contracts/src/
  vocabulary/
    layout.ts
    constraint.ts
    blueprint.ts
    resolved.ts
  catalog/

packages/mathcanvas-compiler/src/
  adapters/
  resolve/

packages/validator/src/
  layers/

packages/templates/src/
  blueprints/
  item-generators/

scripts/contract-lab/
```

다음 조건 중 둘 이상을 만족할 때만 별도 패키지로 승격한다.

1. 호스트 패키지 밖의 실제 소비자가 둘 이상
2. 의존 방향 위반 발생
3. 독립 버전 또는 배포 경계가 실제로 필요

## 네 가지 핵심 primitive

### ToolAdapter

MathCanvas native 필드를 아는 유일한 코드다.

- `parameterSchema`
- `compile`
- `validateNative`
- `footprint`
- `supportedInteractions`
- `contractVersion`

### LayoutBlock

결정적 배치 대수다.

- `canvas`
- `band`
- `row`
- `stack`
- `grid`
- `slot`
- `anchor`

blueprint에는 절대 좌표를 둘 수 없다.

### InteractionConstraint

닫힌 제약 어휘다. 각 제약은 다음을 제공한다.

- generic validator
- answer-key contribution
- `requiresStudentAction`

초기 후보:

- `align-edge-to`
- `place-in`
- `select-one-of`
- `order-by`
- `partition-into`
- `match-pairs`
- `aggregate-equals`

### ItemGenerator

도메인 수학이 코드로 남는 유일한 활동 관련 지점이다.

- 결정적 문항 생성
- 출력 schema
- 수학 불변조건
- 중복·난이도·경계 검사

## ActivityBlueprint

활동은 코드 모듈이 아니라 버전·해시가 붙은 선언 데이터다.

- 교육과정 ref
- 학습 목표와 오개념
- item generator ref
- LayoutBlock scene graph
- semantic object와 tool ref
- constraint 목록
- knob
- variation point
- `answerKey: derived`
- 출시 상태

blueprint와 seed, knob, variation 선택을 resolve하면 `ResolvedActivity`가 나온다.
절대 좌표는 이 단계에서 처음 등장하고, 컴파일러와 승인 해시의 입력이 된다.

## Blueprint가 JSON 하드코딩으로 퇴화하지 않는 규칙

1. blueprint에 절대 좌표 금지
2. 문자열 조립 참조 금지
3. raw payload, arbitrary record, script, inline SVG 탈출구 금지
4. 정답 직접 기입 금지, 엔진에서 도출
5. 문항 나열 금지, item generator 참조만 허용
6. 새 primitive는 최소 두 blueprint에서 재사용 가능해야 함
7. blueprint 크기 상한을 적합성 지표로 사용
8. 반복 조합은 재사용 composite로 승격
9. blueprint 안에 조건문 금지
10. blueprint version·hash와 승인 hash 연결

가장 중요한 자동 검사는 `새 blueprint 추가 시 core diff 0줄`이다.

## 교사 저작 계층

### T0 추천

현재처럼 학년·단원·목표를 기준으로 blueprint를 추천한다.

### T1 knob

문제 수, 난이도, 허용 교구 변형처럼 blueprint가 선언한 범위 안에서만 조정한다.

- scene 구조와 tool ref는 변경할 수 없음
- knob 조합을 출시 시점에 전수 검증
- knob 변경 시 재승인

### T2 variation point

blueprint가 열어 둔 슬롯 안에서만 표현을 교체한다.

예:

- 분수 띠 ↔ 분수 수직선
- 기호 놓기 ↔ 수 카드 배열
- 허용된 layout composite 교체

안전 조건:

- 허용 집합 밖 선택 금지
- slot capability와 adapter capability 일치
- released 도구만 사용
- knob × variation 조합 봉투 사전 검증
- 봉투 밖 조합 생성 차단

### T3 자유 조합

개발자 전용으로 유지한다.

## 수정된 실행 순서

### P0. 기준선과 얕은 전수 조사

1. 기존 `pnpm check`
2. 고정 seed payload와 hash golden
3. 전체 팔레트의 존재·이름·toolId·module key·변형 목록 조사
4. 조사 안전 경계와 redaction

전 도구 심층 조사를 직렬 선행 조건으로 두지 않는다.

### P1. 무손실 primitive 추출

1. 기존 native factory를 ToolAdapter로 이동
2. LayoutBlock resolver 도입
3. 초기 constraint 도입
4. 기존 분수 활동을 blueprint로 이전
5. golden payload 동일성 또는 명시적 변경+canary

### P2. 아키텍처 적합성 게이트

1. 동치분수를 blueprint 데이터로 추가
2. core diff 0줄 확인
3. `10 가르기·모으기` 비분수 활동 추가
4. 일반 constraint와 layout이 두 표상 계열을 모두 표현하는지 확인
5. 실패 시 기능을 더 추가하지 않고 어휘를 수정

### P3. 교사 유연성

1. T1 knob 연결
2. T2 variation point 연결
3. 유한 조합 봉투 사전 검증
4. 미검증 조합 생성 차단
5. released 활동 canary와 문서화

## 즉시 Go/No-Go 기준

다음이 남아 있으면 구현 No-Go다.

- “템플릿별 validator” 결정
- layout 추상화 부재
- 첫 적합성 활동이 모두 분수
- 교사 T1/T2 부재
- 전 팔레트 심층 조사가 모든 구현의 직렬 선행 조건

P1에서 P2로 넘어가는 조건:

- 고정 seed golden 통과
- 기존 테스트 전부 통과
- core에 blueprint ID·교육과정 코드 literal 없음
- blueprint 절대 좌표 0
- 공통 validator LOC가 증가하지 않음

P2의 가장 중요한 조건:

- 동치분수 blueprint 추가에 따른 core diff 0줄
- 비분수 활동도 같은 layout·constraint 어휘 사용
- 정답지와 제약 엔진 도출 결과 일치
- 학생이 수행할 미충족 제약이 최소 하나 존재

## 최종 권고

현재 `PLAN.md`와 `IMPLEMENTATION_PROMPT.md`를 그대로 구현하지 않는다.

안전 경계는 유지한다. 활동 시스템은 코드 템플릿 레지스트리가 아니라 다음 네 요소로
재설계한다.

1. 결정적 layout 대수
2. 닫힌 interaction constraint 어휘
3. blueprint-as-data
4. 교사 T1/T2 변형 지점

전체 팔레트는 먼저 얕게 전수 조사해 범위를 고정하고, 심층 생명주기 조사는 각 구현
묶음의 진입 조건으로 수행한다. 첫 적합성 묶음에는 반드시 비분수 활동을 포함한다.
