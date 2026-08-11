# 97개 무-family 성취기준 실행 계획

- 기준 성취기준: **97개**
- shared RenderRecipe/engine class: **24개**
- grade-band-safe concrete family track: **84개**
- 영역별 track: **수와 연산 28 · 변화와 관계 7 · 도형과 측정 41 · 자료와 가능성 8**
- Sol expected AssessmentTarget outline: **236개 / 97 standards**
- 실행 batch: **21개**
- 현재 no-family: **97개**
- 초기 집합 일치: **PASS**
- 누락된 현재 no-family: **0개**

- 최종 concrete family 계획 범위: **92-110개**
- 예상 Luna work item: **288-330회**

> 84개 track은 최종 ProblemFamily 수가 아닙니다. AssessmentTarget 완전 분해에서 학생의 결정, 수학적 불변량, 관찰 증거가 달라지면 같은 track 안에서도 concrete family를 분리합니다.

## 모델 역할

- 전체 계획·재계획: **gpt-5.6-sol / max**
- 반복 구현: **luna / max (operator-selected)**
- 재계획 승격: **gpt-5.6-sol / max**
- 현재 환경 주의: 현재 Codex sub-agent catalog에는 Luna라는 모델명이 노출되지 않는다. 반복 계약은 모델 독립적으로 고정하고, Luna가 제공되는 운영 환경에서 Luna max를 선택한다.

## 먼저 닫을 foundation

- 기본 learning-map 결속: **0/97**
- pilot 포함 learning-map 결속: **9/97**
- 추가 pinned record 필요: **88개**
- 규칙: FAMILY_TRACK 전에 각 standard의 pinned learning-map concept·representation·application·prerequisite record와 fixture hash가 존재해야 한다.
- bounded native discovery: **9-12개 묶음**

## 지금 선택된 작업

- offline: [2수04-02] · D01A · review-target-set-and-design-family
- live evidence: 없음

## 실행 상태

| 상태 | 성취기준 수 |
|---|---:|
| planned-no-family | 97 |
| offline-in-progress | 0 |
| live-evidence | 0 |
| complete | 0 |

## 배치

배치는 shared engine 생성·승격 checkpoint다. Luna의 실제 표준 순서는 아래 W001~W097이며 한 실행은 성취기준 한 개만 소유한다.

| batch | wave | 목적 | family track | 성취기준 |
|---|---:|---|---:|---:|
| B01 | 0 | 초기 수량·패턴·평면 합성·표 | 4 | 4 |
| B02 | 0 | 상황 연산·변화 규칙·도형 그리기·기호그래프 | 4 | 4 |
| B03 | 1 | 큰 수·계산 배열·도형 성질·꺾은선그래프 | 4 | 4 |
| B04 | 1 | 분수 생성·공변 관계·입체 성질·자료 탐구 | 4 | 6 |
| B05 | 1 | 수 범위·비율·합동·평균 | 4 | 4 |
| B06 | 2 | 배수·비례식·시간 단위·비율그래프 | 4 | 4 |
| B07 | 2 | 저학년 자릿값 연산·비례배분·시각·가능성 | 4 | 4 |
| B08 | 2 | 저학년 수 비교·선·입체 모양·자료 판단 | 4 | 4 |
| B09 | 2 | 역관계·곱셈구구·각·직접 비교 | 4 | 5 |
| B10 | 3 | 나눗셈 의미·계산·선 관계·쌓기나무 | 4 | 4 |
| B11 | 3 | 소수 위치기수·분수형·도형변환·원 성질 | 4 | 5 |
| B12 | 3 | 중학년 수 비교·어림·점 이동·저학년 단위 교환 | 4 | 4 |
| B13 | 3 | 중학년 자릿값 연산·세 수 연산·원 구성·저학년 길이 측정 | 4 | 4 |
| B14 | 4 | 소수 덧뺄셈·타당성·중학년 측정 | 4 | 4 |
| B15 | 4 | 분수 비교·유리수 비교·무게 측정·중학년 단위 교환 | 4 | 7 |
| B16 | 4 | 몫 표현·분수 곱셈·학년군별 복명수 연산 | 4 | 7 |
| B17 | 5 | 분수 나눗셈·소수 곱셈·중학년 도형 성질·합성 | 4 | 6 |
| B18 | 5 | 소수 나눗셈·소수 비교·둘레·넓이 단위 | 4 | 4 |
| B19 | 5 | 부피 단위·직사각형 넓이·다각형 넓이·원주율 | 4 | 4 |
| B20 | 6 | 공간 추론·전개도 | 4 | 5 |
| B21 | 6 | 원·겉넓이·부피·각의 합 | 4 | 4 |

## 24개 shared engine

| engine | class | native/contract 상태 |
|---|---|---|
| R01 | count-cardinality-board | NO01SC/NO04NT; cardinality state contract review |
| R02 | positional-place-board | NO04PD/NO04NT/NO03FM; place-value exchange contract |
| R03 | number-line-boundary | NO07NL discovery required |
| R04 | equation-card-rail | common.formula/NO04NT/CR07BS existing |
| R05 | place-value-operation | NO04PD existing tool; exchange semantic contract required |
| R06 | group-array-cycle | NO01SC existing; NO04NG/NO07PF partial discovery |
| R07 | fraction-same-whole | NO03FM existing; V2 semantic adapter required |
| R08 | pattern-rule | SM02PB/NO04NT existing |
| R09 | table-rule-ratio | DP02TG/common.formula/NO03FM existing |
| R10 | claim-evidence-choice | common rectangle/text/formula existing |
| R11 | geometry-2d-draw | common point-line/rectangle existing; circle contracted |
| R12 | polygon-property | common point-line existing; SM05PG/SM05RP discovery |
| R13 | solid-inspect-net | SM06PH/SM07SR discovery required |
| R14 | cube-grid-view | SM06UC/CR10CS discovery required |
| R15 | coordinate-transform | CR07CP discovery required |
| R16 | circle-semantic | SM07CS/native-circle-model-v1 semantic contract required |
| R17 | clock-time | SM02AD existing; calendar extension review |
| R18 | unit-measure | released ruler substrate; capacity/mass semantics discovery |
| R19 | unit-exchange | NO04NT/NO01SC existing; native-unit-conversion-v1 contract required |
| R20 | area-volume-tile | common rectangle existing; NO04NG/SM06UC partial discovery |
| R21 | decompose-rearrange | SM02PB existing; SM02TG/SM04PM discovery |
| R22 | data-table-graph | DP02TG/DP04BC existing; DP03PG/DP05LC/DP06RC discovery |
| R23 | mean-redistribute | NO01SC+DP02TG existing; DP07MC optional discovery |
| R24 | probability-model | NO03FM/common/DP02TG existing; NO07NL discovery if used |

## 84개 concrete family track

| ID | 영역 | 학생의 결정 | 불변량 | 증거 | RenderRecipe/native | 위험 | 성취기준 |
|---|---|---|---|---|---|---|---:|
| N01A | 수와 연산 | 센 마지막 수와 전체 수량을 수 기호 및 읽기와 대응한다. | 대상의 배열이나 세기 순서를 바꾸어도 cardinality가 같다. | 대상을 하나씩 대응해 세고 수 카드·읽기·쓰기를 일치시킨다. | R01 / NO01SC/NO04NT cardinality contract review | high | 1 |
| N01B | 수와 연산 | 큰 수의 자리별 값을 수 기호 및 읽기와 대응한다. | 각 자리의 값의 합이 원래 수와 같다. | 자리별 구성을 바꾸고 같은 수의 표기·읽기를 일치시킨다. | R02 / NO04PD/NO04NT exchange contract required | medium | 1 |
| N01C | 수와 연산 | 10분의 1·100분의 1·1000분의 1 자릿값을 소수 표기와 대응한다. | 각 소수 자리 단위의 합이 원래 수와 같다. | 소수 자리별 조각과 수 기호·읽기를 일치시킨다. | R02 / NO04PD/NO03FM decimal place contract required | medium | 2 |
| N02A12 | 수와 연산 | 두 수의 순서와 크기를 정하고 근거 자리를 고른다. | 수직선 순서와 가장 높은 서로 다른 자리의 값이 대소와 일치한다. | 수직선 위치 또는 자리 카드를 근거로 비교를 수정한다. | R02+R03 / NO07NL discovery required | medium | 1 |
| N02A34 | 수와 연산 | 큰 수의 순서와 크기를 정하고 비교 방법을 설명한다. | 가장 높은 서로 다른 자리의 값이 대소를 결정한다. | 자리값 근거와 수직선 위치를 연결해 설명한다. | R02+R03 / NO07NL/NO04PD contract review | medium | 1 |
| N02B | 수와 연산 | 소수의 같은 자리 단위를 맞추어 크기를 비교한다. | 가장 높은 서로 다른 소수 자리의 값이 대소를 결정한다. | 자리값 모형과 비교 기호·설명을 일치시킨다. | R02+R03 / NO04PD/NO07NL contract review | medium | 1 |
| N03 | 수와 연산 | 경계값의 포함 여부에 맞는 이상·이하·초과·미만을 선택한다. | 열린 경계와 닫힌 경계의 포함 집합이 표현과 일치한다. | 수직선 경계와 포함되는 수 카드를 함께 맞춘다. | R03 / number-line semantic discovery required | low | 1 |
| N04 | 수와 연산 | 목적과 기준 자리에 맞는 어림 방법과 결과를 정한다. | 정해진 자리 아래 처리 규칙과 결과 범위가 일치한다. | 기준 자리와 버려지는 부분을 표시하고 원값과 어림값을 비교한다. | R03 / place-value/static rail; no new live affordance initially | medium | 1 |
| N05A12 | 수와 연산 | 십과 일의 같은 자리끼리 계산하고 묶음 교환 시점을 정한다. | 교환 전후 전체 값과 연산 결과가 보존된다. | 십·일 묶음을 합치거나 가르며 받아올림·내림을 설명한다. | R05 / NO04PD exchange semantic contract required | high | 1 |
| N05A34 | 수와 연산 | 백·십·일의 같은 자리끼리 계산하고 묶음 교환 시점을 정한다. | 교환 전후 전체 값과 연산 결과가 보존된다. | 백·십·일 묶음과 식을 대응해 받아올림·내림을 설명한다. | R05 / NO04PD exchange semantic contract required | high | 1 |
| N05C | 수와 연산 | 소수점을 기준으로 같은 단위를 정렬하고 계산한다. | 같은 소수 단위끼리 계산하며 전체 값이 보존된다. | 소수 자릿값판과 세로식의 정렬·교환을 대응한다. | R05 / NO04PD decimal exchange semantic contract required | high | 1 |
| N06 | 수와 연산 | 상황의 합병·첨가·제거·비교 구조에 맞는 식을 고른다. | 부분-전체 또는 변화 전후 관계가 식과 일치한다. | 상황 카드와 수 모형을 연결하고 식을 바꾸어 확인한다. | R06 / counting/model recipe reuse; semantic grouping review | medium | 1 |
| N07 | 수와 연산 | 관련된 덧셈식·뺄셈식을 구성해 빠진 값을 찾는다. | 동일한 부분-전체 관계를 네 관련식이 보존한다. | 수 카드나 모형을 옮겨 역연산으로 결과를 검산한다. | R04 / card/balance recipe reuse | medium | 2 |
| N08 | 수와 연산 | 두 수의 반복 주기가 처음 함께 만나는 값을 찾는다. | 공배수는 두 수로 모두 나누어떨어지고 최소값은 양의 첫 교점이다. | 두 배수 열 또는 배열을 겹쳐 후보를 확인한다. | R06 / number-line/array recipe discovery | medium | 1 |
| N09 | 수와 연산 | 상황을 등분제 또는 포함제로 모델링하고 곱셈과 연결한다. | 피제수 = 제수 × 몫 + 나머지이며 상황의 단위가 일치한다. | 대상을 묶거나 나누고 대응 곱셈식으로 검산한다. | R06 / native-counting-model-v1 conditional-go | high | 1 |
| N10 | 수와 연산 | 적절한 부분몫을 선택해 피제수를 단계적으로 줄인다. | 누적 부분몫과 남은 양이 나눗셈 항등식을 보존한다. | 부분곱을 빼고 남은 값을 추적해 몫을 구성한다. | R05 / existing partial-quotients family engine extension | medium | 1 |
| N11 | 수와 연산 | 상황에 맞는 어림 수와 연산을 골라 결과 범위를 판단한다. | 어림 결과가 원 계산의 합리적 상·하한 또는 근삿값 범위에 있다. | 어림 전략과 정확값을 대조해 전략을 수정한다. | R04 / static/card recipe; no new native affordance | medium | 1 |
| N12 | 수와 연산 | 묶음 수와 묶음당 개수로 곱셈 사실을 구성한다. | 행 × 열 = 전체이며 교환한 식은 전체가 같아도 상황 의미가 다를 수 있다. | 배열·묶음과 식을 연결하고 빠진 곱을 채운다. | R06 / native-array-model-v1 captured; adapter discovery required | medium | 1 |
| N13A | 수와 연산 | 같은 전체를 같은 크기로 등분해 선택한 부분을 분수로 나타낸다. | 선택한 부분 수와 전체의 같은 크기 부분 수가 분수값을 결정한다. | 분수 모형을 구성하고 읽기·쓰기와 일치시킨다. | R07 / NO03FM V2 adapter required | medium | 1 |
| N13B | 수와 연산 | 같은 양을 진·가·대분수 표현 사이에서 바꾼다. | 표현을 바꾸어도 같은 전체에 대한 분수 양이 보존된다. | 두 분수 모형과 두 표기를 연결해 동치를 확인한다. | R07 / NO03FM V2 adapter required | medium | 1 |
| N14 | 수와 연산 | 같은 전체와 분수 단위를 확인해 두 분수의 크기를 비교한다. | 같은 분모에서는 분자, 단위분수에서는 분모가 크기 관계를 결정한다. | 같은 전체 모형과 수식을 나란히 놓고 비교 근거를 고친다. | R07 / native-fraction-model-v1 / existing fraction visual recipe | medium | 1 |
| N15 | 수와 연산 | 분수와 소수를 공통 단위로 바꾸어 동치와 대소를 판단한다. | 표현 변환 전후 유리수 값과 같은 전체가 보존된다. | 분수 모형·수직선·소수 표기를 연결해 비교한다. | R07+R02 / fraction model plus number-line recipe | high | 1 |
| N16 | 수와 연산 | 나눗셈 몫을 요구된 유리수 표현으로 바꾼다. | a ÷ b와 a/b 및 대응 소수의 값이 같다. | 등분 모형과 긴 나눗셈 또는 수직선을 대조한다. | R06+R07+R02 / fraction/counting plus decimal representation recipe | high | 2 |
| N17 | 수와 연산 | 한 양의 분수배를 분할 또는 확대하여 곱을 구한다. | 공통 전체와 단위분수 크기 아래 부분 수의 곱이 결과를 보존한다. | 영역 또는 띠 모형을 겹쳐 계산식과 연결한다. | R07 / native-fraction-model-v1 adapter required | high | 1 |
| N18 | 수와 연산 | 나누는 양이 몇 번 포함되는지 또는 어떻게 등분되는지 모델링한다. | 몫 × 제수 = 피제수이며 단위와 같은 전체가 일치한다. | 분수 띠를 반복 배치하거나 등분해 역곱셈으로 확인한다. | R07 / native-fraction-model-v1 plus grouping adapter | high | 1 |
| N19 | 수와 연산 | 정수 곱셈과 10의 거듭제곱 배율을 연결해 소수점을 정한다. | 인수의 배율 곱과 곱의 자릿값 배율이 일치한다. | 자리값 표와 부분곱을 대조해 소수점 위치를 검증한다. | R05 / place-value recipe; decimal exchange discovery | medium | 1 |
| N20 | 수와 연산 | 피제수와 제수를 같은 배율로 바꾸거나 자릿값 단위로 몫을 구성한다. | 두 수에 같은 10의 거듭제곱을 곱해도 몫은 보존된다. | 자리값 표·부분몫·역곱셈을 연결해 검산한다. | R05 / place-value/counting recipe; decimal adapter discovery | high | 1 |
| N05B | 수와 연산 | 세 수의 연산 순서와 중간값을 추적해 결과를 구한다. | 각 단계의 중간값이 원래 식의 연산 순서를 보존한다. | 중간 결과 카드를 배치하고 전체 계산을 역산해 확인한다. | R04 / card/equation-rail recipe | low | 1 |
| C01 | 변화와 관계 | 자신이 정한 반복 단위를 배열하고 규칙을 설명한다. | 전체 배열이 선택한 최소 반복 단위의 반복으로 생성된다. | 조각을 배치·수정하고 반복 단위 경계를 표시한다. | R08 / existing pattern-block recipe extension | medium | 1 |
| C02A | 변화와 관계 | 변하는 배열의 규칙을 찾아 수나 식으로 표현하고 다음 값을 예측한다. | 같은 변환 규칙이 모든 연속 항에 적용된다. | 항을 바꾸어 규칙식의 예측과 실제 배열을 대조한다. | R08 / table/card recipe; no new native affordance initially | medium | 1 |
| C02B | 변화와 관계 | 계산식 배열의 구조 변화를 찾아 계산 결과를 추측한다. | 피연산자 변화와 결과 변화 사이의 산술 관계가 모든 행에서 유지된다. | 식 카드의 변화를 표시하고 빈 결과를 예측·검산한다. | R04 / equation/card grid recipe | medium | 1 |
| C02C | 변화와 관계 | 두 양의 대응 관계를 표에서 찾아 기호식으로 나타낸다. | 모든 대응쌍이 같은 함수 규칙을 만족한다. | 표의 값을 바꾸고 식의 예측값이 대응쌍과 맞는지 확인한다. | R09 / table/equation recipe; semantic table edit discovery | high | 1 |
| C03 | 변화와 관계 | 기준량에 대한 비교량의 비를 세 표현으로 변환한다. | 분수·소수·백분율 표현이 같은 비 값을 보존한다. | 비 모형과 세 표현 카드를 연결하고 기준량을 확인한다. | R09 / ratio strip/grid recipe discovery | high | 1 |
| C04 | 변화와 관계 | 등가인 두 비를 구성하고 미지항을 구한다. | 두 비의 교차곱이 같고 같은 배율 관계가 유지된다. | 비 카드의 배율을 조정하고 교차곱으로 검산한다. | R09 / ratio/equality recipe reuse | medium | 1 |
| C05 | 변화와 관계 | 전체량을 주어진 비에 따라 두 부분으로 나눈다. | 부분의 합은 전체이고 부분 사이의 비는 주어진 비와 같다. | 전체 막대를 단위비만큼 나누고 합·비를 검산한다. | R09 / ratio strip construction discovery | medium | 1 |
| G01 | 도형과 측정 | 양끝의 유한성에 따라 선의 종류를 구별한다. | 끝점 수와 연장 가능 방향이 정의와 일치한다. | 끝점·화살표를 표시하고 분류 근거를 설명한다. | R11 / line/endpoint semantic discovery required | low | 1 |
| G02 | 도형과 측정 | 물체의 전체 모양을 기본 입체 모양과 대응하고 합성한다. | 회전·이동해도 기본 모양의 곡면·평면 구조가 보존된다. | 물체를 분류하고 기본 모양을 배치해 새 모양을 만든다. | R13 / solid object library/drag semantics discovery | high | 1 |
| G03A | 도형과 측정 | 생활 물체의 평면 모양을 찾고 기본 모양으로 합성한다. | 이동·회전해도 변·꼭짓점·곡선 구조가 보존된다. | 모양 조각을 선택·배치하고 구성 근거를 말한다. | R21 / shape drag/compose semantics discovery | high | 1 |
| G04A12 | 도형과 측정 | 변과 꼭짓점의 공통 성질로 삼각형과 사각형을 구별한다. | 분류 결과가 변·꼭짓점 수의 정의 성질과 일치한다. | 도형의 요소를 표시하고 공통점 카드를 선택한다. | R12 / common geometry primitives | medium | 1 |
| G04B34 | 도형과 측정 | 필요충분 성질을 검사해 도형을 분류하고 포함 관계를 설명한다. | 분류 결과가 각·평행·길이·변의 수 등 정의 성질과 일치한다. | 성질을 표시하고 반례와 비교해 분류를 수정한다. | R12 / SM05PG/SM05RP bounded discovery | high | 3 |
| G05 | 도형과 측정 | 직각과 비교해 예각·직각·둔각을 구별한다. | 각의 크기는 두 반직선 사이의 회전량이며 직각을 기준으로 한다. | 직각 도구를 겹치고 분류 근거를 표시한다. | R11 / angle overlay/rotation semantic discovery | medium | 1 |
| G06 | 도형과 측정 | 두 직선의 만남과 방향 관계로 수직 또는 평행을 판단한다. | 수직은 직각 교차, 평행은 같은 평면에서 만나지 않고 일정 거리를 유지한다. | 직각 표지 또는 평행 이동으로 관계를 확인한다. | R11 / line snap/angle semantics discovery | medium | 1 |
| G07 | 도형과 측정 | 이동·회전·뒤집기로 두 도형의 합동과 대응 요소를 판단한다. | 강체변환 뒤 대응 길이와 각 및 전체 모양이 일치한다. | 도형을 포개고 대응점·변·각을 표시한다. | R15+R11 / shape transform/overlay semantic discovery | medium | 1 |
| G08 | 도형과 측정 | 위치·방향 조건에 맞게 쌓기나무 모양을 구성하고 설명한다. | 각 큐브의 격자 좌표와 면 맞닿음 관계가 조건을 만족한다. | 큐브를 놓고 옮기며 위치 언어로 구성을 검증한다. | R14 / 3D cube placement/state discovery required | high | 1 |
| G09 | 도형과 측정 | 면·모서리·꼭짓점과 밑면 구조로 입체를 분류하고 성질을 설명한다. | 구성 요소의 수와 연결 관계가 해당 입체 정의를 만족한다. | 입체를 회전해 요소를 표시하고 반례와 구별한다. | R13 / 3D solid inspection semantics discovery | high | 3 |
| G10A | 도형과 측정 | 직육면체의 면 인접 관계를 겨냥도와 전개도에서 대응한다. | 면 인접성과 모서리 짝이 동일한 직육면체를 나타낸다. | 전개도에 대응 면·모서리를 표시하고 겨냥도와 대조한다. | R13 / SM06PH/SM07SR discovery required | high | 1 |
| G10B | 도형과 측정 | 전개도가 목표 각기둥 또는 원기둥으로 접히는지 판단한다. | 접은 뒤 면 인접·크기 관계가 맞고 겹침이나 누락이 없다. | 선택 전개도와 대응 면·모서리 근거를 함께 남긴다. | R13 / SM06PH/SM07SR discovery required | high | 2 |
| G11A | 도형과 측정 | 주어진 강체변환을 도형에 적용하고 변화를 설명한다. | 길이와 각은 보존되고 위치·방향·손잡이성은 변환 규칙을 따른다. | 변환 전후 도형의 대응점을 표시하고 결과를 비교한다. | R15 / CR07CP discovery required | high | 1 |
| G11B | 도형과 측정 | 방향과 거리를 누적해 이동한 점의 위치를 정한다. | 각 이동 벡터의 합이 시작점과 끝점의 변화를 나타낸다. | 이동 경로와 끝점을 표시하고 위치 언어로 설명한다. | R15 / CR07CP discovery required | high | 1 |
| G12A | 도형과 측정 | 원에서 중심·반지름·지름을 찾고 관계를 판단한다. | 모든 반지름은 같고 지름은 중심을 지나며 반지름의 두 배다. | 중심과 선분을 표시하고 길이 관계를 확인한다. | R16 / native-circle-model-v1 captured; handle contract required | medium | 1 |
| G13 | 도형과 측정 | 같은 속성끼리 직접 또는 간접 비교해 더 긴·많은·무거운·넓은 대상을 고른다. | 비교 대상과 속성이 같고 비교 관계의 추이성이 유지된다. | 대상을 맞대거나 공통 매개와 비교하고 근거를 표시한다. | R18 / drag/overlay plus container/weight proxy discovery | high | 1 |
| G14 | 도형과 측정 | 보이는 큐브와 지지 조건으로 숨은 큐브 수를 추론한다. | 각 위쪽 큐브 아래에는 연속된 지지 큐브가 있고 좌표 중복이 없다. | 층별 배치를 복원하고 전체 좌표를 세어 확인한다. | R14 / 3D cube layer projection discovery | high | 1 |
| G15 | 도형과 측정 | 입체에서 정사영을 만들거나 여러 정사영에서 가능한 입체를 추론한다. | 각 보기의 격자 점유가 같은 3차원 좌표 집합의 투영과 일치한다. | 입체와 세 투영을 오가며 불일치 칸을 수정한다. | R14 / 3D cube projection semantics discovery | high | 1 |
| G16 | 도형과 측정 | 주어진 조각으로 목표 영역을 겹침·틈 없이 구성한다. | 조각 넓이의 합이 목표 넓이와 같고 내부가 겹치지 않는다. | 조각을 이동·회전해 빈틈과 겹침을 제거하고 설명한다. | R21 / polygon drag/snap/collision semantics discovery | medium | 1 |
| G17 | 도형과 측정 | 분·시간·일·주·개월·년 사이의 관계로 같은 기간을 표현한다. | 정의된 단위 교환비 안에서 총 기간이 보존된다. | 달력·시간띠를 묶거나 풀어 두 표현을 일치시킨다. | R17 / calendar/time-strip recipe discovery | high | 1 |
| G18 | 도형과 측정 | 시침·분침·초침의 위치로 초 단위 시각을 읽는다. | 각 바늘의 주기와 눈금값이 같은 시각을 나타낸다. | 바늘을 맞추고 디지털 표기와 대조한다. | R17 / released clock contract extension review | medium | 1 |
| G19A12 | 도형과 측정 | m와 cm의 교환비로 길이 표현을 서로 바꾼다. | cm로 환산한 총길이가 교환 전후 같다. | 단위 묶음을 합치거나 풀고 두 표현을 대조한다. | R19 / native-unit-conversion-v1 semantic contract required | medium | 1 |
| G19B34 | 도형과 측정 | 속성별 단위 교환비로 큰 단위·작은 단위 표현을 바꾼다. | 기준 단위로 환산한 총량이 교환 전후 같다. | 단위 묶음과 동치식을 함께 구성한다. | R19 / native-unit-conversion-v1 semantic contract required | high | 4 |
| G20A12 | 도형과 측정 | 길이를 어림하고 기준 또는 실제 측정값과 비교한다. | 길이는 동일 단위의 반복 수로 나타나며 어림 오차가 설명 가능하다. | 어림값과 자로 잰 값을 나란히 놓고 양감을 수정한다. | R18 / released ruler substrate | medium | 1 |
| G20A34 | 도형과 측정 | 상황에 맞는 mm·km 단위를 골라 측정값 또는 어림값을 정한다. | 같은 길이를 동일 단위의 반복과 단위 교환으로 보존한다. | 어림과 실제 측정·환산값을 대조한다. | R18 / released ruler substrate plus scale extension | medium | 1 |
| G20B | 도형과 측정 | 적절한 들이 단위와 도구를 골라 측정값 또는 어림값을 정한다. | 들이가 동일 용량 단위의 반복으로 보존된다. | 어림한 양과 용기에 잰 양을 비교한다. | R18 / capacity measurement semantics discovery required | high | 1 |
| G20C | 도형과 측정 | 적절한 무게 단위와 도구를 골라 측정값 또는 어림값을 정한다. | 무게가 동일 질량 단위의 반복과 저울 균형으로 보존된다. | 어림한 무게와 저울로 잰 값을 비교한다. | R18 / mass measurement semantics discovery required | high | 1 |
| G21A12 | 도형과 측정 | 같은 길이 단위끼리 계산하고 필요한 단위 교환을 한다. | 기준 단위 총길이와 연산 결과가 교환 전후 보존된다. | 단위식과 결과를 연결해 계산을 검산한다. | R19+R04 / native-unit-conversion-v1 plus formula recipe | medium | 1 |
| G21B34 | 도형과 측정 | 속성별 기준 단위를 맞추고 필요한 교환 뒤 계산한다. | 기준 단위 총량과 연산 결과가 교환 전후 보존된다. | 변환식과 계산 결과를 함께 구성한다. | R19+R04 / unit exchange and operation semantic contracts | high | 3 |
| G22 | 도형과 측정 | 도형의 경계를 따라 필요한 변 길이를 모두 더한다. | 경계 선분 길이의 합이 둘레이고 내부 선분은 포함하지 않는다. | 경계 변을 한 번씩 표시하고 식과 대응시킨다. | R18+R11 / polygon edge/length semantic discovery | low | 1 |
| G23A | 도형과 측정 | 선형 단위 관계를 정사각형 단위 관계로 확장한다. | 한 변의 교환비 r에 대해 넓이는 r²배로 교환된다. | 단위 정사각형 배열을 구성해 교환 수를 센다. | R20 / rectangle/array semantic review | medium | 1 |
| G23B | 도형과 측정 | 선형 단위 관계를 정육면체 단위 관계로 확장한다. | 한 변의 교환비 r에 대해 부피는 r³배로 교환된다. | 단위 정육면체 층을 구성해 교환 수를 센다. | R20 / SM06UC cube-state discovery required | high | 1 |
| G24 | 도형과 측정 | 단위 정사각형 배열에서 가로×세로 공식을 구성한다. | 행 수 × 열 수가 겹침 없는 단위 넓이 개수와 같다. | 단위 정사각형을 배열하고 곱셈식과 대응한다. | R20 / array/grid semantic discovery | low | 1 |
| G25 | 도형과 측정 | 도형을 이미 아는 넓이 도형으로 분해·재배열해 공식을 추론한다. | 자르기·옮기기 전후 전체 넓이가 보존된다. | 조각을 이동해 직사각형 등으로 만들고 대응 식을 설명한다. | R21+R20 / polygon cut/drag/snap semantics discovery | high | 1 |
| G26 | 도형과 측정 | 여러 원의 원주와 지름을 측정해 두 양의 비를 비교한다. | 같은 측정 오차 범위에서 원주÷지름은 일정한 근삿값이다. | 원 크기를 바꾸고 측정표의 비가 수렴하는지 확인한다. | R16 / native-circle-model-v1 plus circumference measurement contract | high | 1 |
| G27 | 도형과 측정 | 반지름·지름·원주율 관계와 재배열로 원주와 넓이를 구한다. | 원주=지름×원주율, 넓이=반지름²×원주율 관계가 유지된다. | 원 조각 또는 길이 관계를 식과 대응해 검산한다. | R16+R20 / native-circle-model-v1 and sector rearrangement discovery | high | 1 |
| G28 | 도형과 측정 | 전개도 또는 면 쌍을 이용해 모든 겉면 넓이를 합한다. | 중복·누락 없이 여섯 면 넓이의 합이 겉넓이다. | 전개도 면을 표시하고 면별 넓이 식과 합을 연결한다. | R13+R20 / net face/area semantic discovery | medium | 1 |
| G29 | 도형과 측정 | 단위 정육면체의 층·행·열 구조로 부피를 구한다. | 가로×세로×높이가 겹침 없는 단위 부피 개수와 같다. | 층별 큐브 수를 구성하고 세 차원의 곱과 대응한다. | R14+R20 / 3D unit-cube layer semantics discovery | medium | 1 |
| G30 | 도형과 측정 | 각을 분해·재배열해 내각의 합을 추론하고 설명한다. | 삼각형 내각 합은 180°, 사각형은 삼각형 두 개로 나뉘어 360°다. | 각 조각을 직선각 또는 한 점 둘레에 모아 추론을 검증한다. | R21+R11 / angle piece cut/rotate/snap discovery | medium | 1 |
| G03B | 도형과 측정 | 삼각형·사각형·원의 핵심 형태 조건을 만족하도록 그린다. | 그린 경계의 변·꼭짓점·폐곡선 구조가 목표 모양과 일치한다. | 선을 추가·이동·지우며 목표 도형 조건을 확인한다. | R11 / line/circle drawing semantics discovery | high | 1 |
| G12B | 도형과 측정 | 주어진 중심과 반지름 조건에 맞게 원을 그린다. | 원 위 모든 점과 중심 사이의 거리가 선택한 반지름과 같다. | 중심과 반지름을 설정하고 원 위 표본점의 거리를 확인한다. | R16 / native-circle-model-v1 creation/handle contract required | medium | 1 |
| D01A | 자료와 가능성 | 범주별 개수를 보존하며 자료를 표의 맞는 칸에 정리한다. | 각 범주의 빈도와 전체 자료 수가 표현 전후 같다. | 자료를 하나씩 표식하고 완성된 표와 합계를 확인한다. | R22 / DP02TG table edit contract review | low | 1 |
| D01B | 자료와 가능성 | 범주별 개수를 보존하며 자료를 기호그래프로 나타낸다. | 기호 수와 각 범주의 자료 수 및 전체 합이 일치한다. | 기호를 배치하고 원자료·범주별 개수와 대조한다. | R22 / DP03PG/native-picture-graph-v1 semantic edit discovery | high | 1 |
| D02A | 자료와 가능성 | 순서 있는 자료를 점과 선으로 나타내고 변화를 해석한다. | 축·눈금과 모든 순서쌍이 원자료를 보존한다. | 점·선분을 수정하고 원자료 및 해석 문장과 대조한다. | R22 / DP05LC line-graph edit discovery required | high | 1 |
| D02B | 자료와 가능성 | 탐구 질문과 자료 성격에 맞는 그래프를 골라 구성하고 해석한다. | 표현 목적과 그래프 종류가 맞고 모든 자료값이 보존된다. | 그래프 선택 근거·완성 그래프·해석을 원자료와 대조한다. | R22 / DP04BC/DP05LC bounded comparison and edit discovery | high | 1 |
| D03 | 자료와 가능성 | 자료의 총량을 자료 수만큼 고르게 나누어 대표값을 해석한다. | 평균×자료 수가 원자료 합과 같다. | 양을 옮겨 모두 같게 만들고 계산 평균과 비교한다. | R23 / counting/bar transfer semantic discovery | medium | 1 |
| D04 | 자료와 가능성 | 부분-전체 비율을 띠 또는 원의 구간으로 나타내고 해석한다. | 모든 범주의 비율 합이 전체 100% 또는 360°와 같다. | 구간 크기와 백분율을 조정하고 원자료와 대조한다. | R22 / band/circle graph semantic edit discovery | high | 1 |
| D05 | 자료와 가능성 | 가능성을 0과 1 사이 수 또는 동등한 분수·소수로 나타낸다. | 가능한 경우 수 ÷ 전체 동등한 경우 수가 이론적 가능성과 같다. | 가능한 결과를 세고 가능성 수직선 위치와 연결한다. | R24+R03 / number-line plus outcome-set recipe discovery | medium | 1 |
| D06 | 자료와 가능성 | 자료와 가능성 증거를 비교해 예측 또는 행동을 선택한다. | 판단 근거가 제시된 자료의 경향·가능성과 모순되지 않는다. | 주장·근거 쌍을 선택하고 반대 자료가 주어지면 판단을 수정한다. | R24+R22 / claim-evidence shell plus graph/probability recipes | high | 1 |

## 97개 표준 작업 카드

| work | batch | 성취기준 | 학년군 | 영역 | track | engine | target 초안 | 역할 | 현재 동작 |
|---|---|---|---|---|---|---|---:|---|---|
| W001 | B01 | [2수04-02] | 1-2 | 자료와 가능성 | D01A | R22 | 2 | anchor | review-target-set-and-design-family |
| W002 | B01 | [2수02-02] | 1-2 | 변화와 관계 | C01 | R08 | 2 | anchor | review-target-set-and-design-family |
| W003 | B08 | [4수03-01] | 3-4 | 도형과 측정 | G01 | R11 | 2 | anchor | review-target-set-and-design-family |
| W004 | B08 | [2수03-01] | 1-2 | 도형과 측정 | G02 | R13 | 2 | anchor | review-target-set-and-design-family |
| W005 | B03 | [4수04-02] | 3-4 | 자료와 가능성 | D02A | R22 | 3 | anchor | review-target-set-and-design-family |
| W006 | B04 | [6수02-01] | 5-6 | 변화와 관계 | C02C | R09 | 3 | anchor | review-target-set-and-design-family |
| W007 | B01 | [2수01-01] | 1-2 | 수와 연산 | N01A | R01 | 3 | anchor | review-target-set-and-design-family |
| W008 | B02 | [4수02-01] | 3-4 | 변화와 관계 | C02A | R08 | 3 | anchor | review-target-set-and-design-family |
| W009 | B05 | [6수04-01] | 5-6 | 자료와 가능성 | D03 | R23 | 4 | anchor | review-target-set-and-design-family |
| W010 | B03 | [4수01-01] | 3-4 | 수와 연산 | N01B | R02 | 3 | anchor | review-target-set-and-design-family |
| W011 | B05 | [6수03-01] | 5-6 | 도형과 측정 | G07 | R15+R11 | 3 | anchor | review-target-set-and-design-family |
| W012 | B02 | [2수04-03] | 1-2 | 자료와 가능성 | D01B | R22 | 2 | anchor | review-target-set-and-design-family |
| W013 | B09 | [4수03-02] | 3-4 | 도형과 측정 | G05 | R11 | 2 | anchor | review-target-set-and-design-family |
| W014 | B05 | [6수01-02] | 5-6 | 수와 연산 | N03 | R03 | 3 | anchor | review-target-set-and-design-family |
| W015 | B10 | [2수03-02] | 1-2 | 도형과 측정 | G08 | R14 | 2 | anchor | review-target-set-and-design-family |
| W016 | B04 | [4수04-03] | 3-4 | 자료와 가능성 | D02B | R22 | 3 | anchor | review-target-set-and-design-family |
| W017 | B05 | [6수02-03] | 5-6 | 변화와 관계 | C03 | R09 | 2 | anchor | review-target-set-and-design-family |
| W018 | B03 | [4수02-02] | 3-4 | 변화와 관계 | C02B | R04 | 2 | anchor | review-target-set-and-design-family |
| W019 | B06 | [6수04-02] | 5-6 | 자료와 가능성 | D04 | R22 | 3 | anchor | review-target-set-and-design-family |
| W020 | B12 | [4수01-02] | 3-4 | 수와 연산 | N02A34 | R02+R03 | 3 | anchor | review-target-set-and-design-family |
| W021 | B04 | [6수03-03] | 5-6 | 도형과 측정 | G09 | R13 | 3 | anchor | review-target-set-and-design-family |
| W022 | B10 | [4수03-03] | 3-4 | 도형과 측정 | G06 | R11 | 2 | anchor | review-target-set-and-design-family |
| W023 | B12 | [6수01-03] | 5-6 | 수와 연산 | N04 | R03 | 3 | anchor | review-target-set-and-design-family |
| W024 | B01 | [2수03-03] | 1-2 | 도형과 측정 | G03A | R21 | 2 | anchor | review-target-set-and-design-family |
| W025 | B06 | [6수02-04] | 5-6 | 변화와 관계 | C04 | R09 | 3 | anchor | review-target-set-and-design-family |
| W026 | B08 | [2수01-03] | 1-2 | 수와 연산 | N02A12 | R02+R03 | 2 | anchor | review-target-set-and-design-family |
| W027 | B13 | [4수01-03] | 3-4 | 수와 연산 | N05A34 | R05 | 2 | anchor | review-target-set-and-design-family |
| W028 | B20 | [6수03-04] | 5-6 | 도형과 측정 | G10A | R13 | 2 | anchor | review-target-set-and-design-family |
| W029 | B11 | [4수03-04] | 3-4 | 도형과 측정 | G11A | R15 | 3 | anchor | review-target-set-and-design-family |
| W030 | B02 | [2수03-04] | 1-2 | 도형과 측정 | G03B | R11 | 2 | anchor | review-target-set-and-design-family |
| W031 | B07 | [6수02-05] | 5-6 | 변화와 관계 | C05 | R09 | 2 | anchor | review-target-set-and-design-family |
| W032 | B02 | [2수01-05] | 1-2 | 수와 연산 | N06 | R06 | 3 | anchor | review-target-set-and-design-family |
| W033 | B07 | [6수04-05] | 5-6 | 자료와 가능성 | D05 | R24+R03 | 2 | anchor | review-target-set-and-design-family |
| W034 | B04 | [6수03-05] | 5-6 | 도형과 측정 | G09 | R13 | 3 | extension | review-target-set-and-design-family |
| W035 | B12 | [4수03-05] | 3-4 | 도형과 측정 | G11B | R15 | 2 | anchor | review-target-set-and-design-family |
| W036 | B06 | [6수01-05] | 5-6 | 수와 연산 | N08 | R06 | 3 | anchor | review-target-set-and-design-family |
| W037 | B03 | [2수03-05] | 1-2 | 도형과 측정 | G04A12 | R12 | 2 | anchor | review-target-set-and-design-family |
| W038 | B07 | [2수01-06] | 1-2 | 수와 연산 | N05A12 | R05 | 2 | anchor | review-target-set-and-design-family |
| W039 | B08 | [6수04-06] | 5-6 | 자료와 가능성 | D06 | R24+R22 | 2 | anchor | review-target-set-and-design-family |
| W040 | B10 | [4수01-05] | 3-4 | 수와 연산 | N09 | R06 | 2 | anchor | review-target-set-and-design-family |
| W041 | B20 | [6수03-06] | 5-6 | 도형과 측정 | G10B | R13 | 2 | anchor | review-target-set-and-design-family |
| W042 | B11 | [4수03-06] | 3-4 | 도형과 측정 | G12A | R16 | 2 | anchor | review-target-set-and-design-family |
| W043 | B09 | [2수03-06] | 1-2 | 도형과 측정 | G13 | R18 | 4 | anchor | review-target-set-and-design-family |
| W044 | B09 | [2수01-07] | 1-2 | 수와 연산 | N07 | R04 | 2 | anchor | review-target-set-and-design-family |
| W045 | B10 | [4수01-07] | 3-4 | 수와 연산 | N10 | R05 | 2 | anchor | review-target-set-and-design-family |
| W046 | B04 | [6수03-07] | 5-6 | 도형과 측정 | G09 | R13 | 3 | extension | review-target-set-and-design-family |
| W047 | B13 | [4수03-07] | 3-4 | 도형과 측정 | G12B | R16 | 2 | anchor | review-target-set-and-design-family |
| W048 | B13 | [2수01-08] | 1-2 | 수와 연산 | N05B | R04 | 2 | anchor | review-target-set-and-design-family |
| W049 | B14 | [4수01-08] | 3-4 | 수와 연산 | N11 | R04 | 3 | anchor | review-target-set-and-design-family |
| W050 | B20 | [6수03-08] | 5-6 | 도형과 측정 | G10B | R13 | 2 | extension | review-target-set-and-design-family |
| W051 | B17 | [4수03-08] | 3-4 | 도형과 측정 | G04B34 | R12 | 2 | anchor | review-target-set-and-design-family |
| W052 | B16 | [6수01-09] | 5-6 | 수와 연산 | N17 | R07 | 2 | anchor | review-target-set-and-design-family |
| W053 | B09 | [2수01-09] | 1-2 | 수와 연산 | N07 | R04 | 2 | extension | review-target-set-and-design-family |
| W054 | B04 | [4수01-09] | 3-4 | 수와 연산 | N13A | R07 | 3 | anchor | review-target-set-and-design-family |
| W055 | B20 | [6수03-09] | 5-6 | 도형과 측정 | G14 | R14 | 2 | anchor | review-target-set-and-design-family |
| W056 | B17 | [4수03-10] | 3-4 | 도형과 측정 | G04B34 | R12 | 3 | extension | review-target-set-and-design-family |
| W057 | B16 | [6수01-10] | 5-6 | 수와 연산 | N16 | R06+R07+R02 | 2 | anchor | review-target-set-and-design-family |
| W058 | B06 | [2수03-09] | 1-2 | 도형과 측정 | G17 | R17 | 2 | anchor | review-target-set-and-design-family |
| W059 | B11 | [4수01-10] | 3-4 | 수와 연산 | N13B | R07 | 2 | anchor | review-target-set-and-design-family |
| W060 | B20 | [6수03-10] | 5-6 | 도형과 측정 | G15 | R14 | 2 | anchor | review-target-set-and-design-family |
| W061 | B17 | [4수03-11] | 3-4 | 도형과 측정 | G04B34 | R12 | 2 | extension | review-target-set-and-design-family |
| W062 | B17 | [6수01-11] | 5-6 | 수와 연산 | N18 | R07 | 3 | anchor | review-target-set-and-design-family |
| W063 | B12 | [2수03-11] | 1-2 | 도형과 측정 | G19A12 | R19 | 3 | anchor | review-target-set-and-design-family |
| W064 | B09 | [2수01-11] | 1-2 | 수와 연산 | N12 | R06 | 2 | anchor | review-target-set-and-design-family |
| W065 | B15 | [4수01-11] | 3-4 | 수와 연산 | N14 | R07 | 3 | anchor | review-target-set-and-design-family |
| W066 | B18 | [6수03-11] | 5-6 | 도형과 측정 | G22 | R18+R11 | 2 | anchor | review-target-set-and-design-family |
| W067 | B17 | [4수03-12] | 3-4 | 도형과 측정 | G16 | R21 | 3 | anchor | review-target-set-and-design-family |
| W068 | B15 | [6수01-12] | 5-6 | 수와 연산 | N15 | R07+R02 | 3 | anchor | review-target-set-and-design-family |
| W069 | B13 | [2수03-12] | 1-2 | 도형과 측정 | G20A12 | R18 | 2 | anchor | review-target-set-and-design-family |
| W070 | B11 | [4수01-12] | 3-4 | 수와 연산 | N01C | R02 | 2 | anchor | review-target-set-and-design-family |
| W071 | B18 | [6수03-12] | 5-6 | 도형과 측정 | G23A | R20 | 2 | anchor | review-target-set-and-design-family |
| W072 | B07 | [4수03-13] | 3-4 | 도형과 측정 | G18 | R17 | 2 | anchor | review-target-set-and-design-family |
| W073 | B17 | [6수01-13] | 5-6 | 수와 연산 | N19 | R05 | 3 | anchor | review-target-set-and-design-family |
| W074 | B16 | [2수03-13] | 1-2 | 도형과 측정 | G21A12 | R19+R04 | 2 | anchor | review-target-set-and-design-family |
| W075 | B11 | [4수01-13] | 3-4 | 수와 연산 | N01C | R02 | 2 | extension | review-target-set-and-design-family |
| W076 | B19 | [6수03-13] | 5-6 | 도형과 측정 | G24 | R20 | 3 | anchor | review-target-set-and-design-family |
| W077 | B16 | [4수03-14] | 3-4 | 도형과 측정 | G21B34 | R19+R04 | 2 | anchor | review-target-set-and-design-family |
| W078 | B16 | [6수01-14] | 5-6 | 수와 연산 | N16 | R06+R07+R02 | 2 | extension | review-target-set-and-design-family |
| W079 | B18 | [4수01-14] | 3-4 | 수와 연산 | N02B | R02+R03 | 2 | anchor | review-target-set-and-design-family |
| W080 | B19 | [6수03-14] | 5-6 | 도형과 측정 | G25 | R21+R20 | 5 | anchor | review-target-set-and-design-family |
| W081 | B14 | [4수03-15] | 3-4 | 도형과 측정 | G20A34 | R18 | 3 | anchor | review-target-set-and-design-family |
| W082 | B18 | [6수01-15] | 5-6 | 수와 연산 | N20 | R05 | 3 | anchor | review-target-set-and-design-family |
| W083 | B19 | [6수03-15] | 5-6 | 도형과 측정 | G26 | R16 | 3 | anchor | review-target-set-and-design-family |
| W084 | B15 | [4수03-16] | 3-4 | 도형과 측정 | G19B34 | R19 | 2 | anchor | review-target-set-and-design-family |
| W085 | B14 | [4수01-16] | 3-4 | 수와 연산 | N05C | R05 | 2 | anchor | review-target-set-and-design-family |
| W086 | B21 | [6수03-16] | 5-6 | 도형과 측정 | G27 | R16+R20 | 2 | anchor | review-target-set-and-design-family |
| W087 | B14 | [4수03-17] | 3-4 | 도형과 측정 | G20B | R18 | 3 | anchor | review-target-set-and-design-family |
| W088 | B21 | [6수03-17] | 5-6 | 도형과 측정 | G28 | R13+R20 | 2 | anchor | review-target-set-and-design-family |
| W089 | B15 | [4수03-18] | 3-4 | 도형과 측정 | G19B34 | R19 | 2 | extension | review-target-set-and-design-family |
| W090 | B19 | [6수03-18] | 5-6 | 도형과 측정 | G23B | R20 | 2 | anchor | review-target-set-and-design-family |
| W091 | B16 | [4수03-19] | 3-4 | 도형과 측정 | G21B34 | R19+R04 | 2 | extension | review-target-set-and-design-family |
| W092 | B21 | [6수03-19] | 5-6 | 도형과 측정 | G29 | R14+R20 | 3 | anchor | review-target-set-and-design-family |
| W093 | B15 | [4수03-20] | 3-4 | 도형과 측정 | G20C | R18 | 3 | anchor | review-target-set-and-design-family |
| W094 | B15 | [4수03-21] | 3-4 | 도형과 측정 | G19B34 | R19 | 3 | extension | review-target-set-and-design-family |
| W095 | B15 | [4수03-22] | 3-4 | 도형과 측정 | G19B34 | R19 | 2 | extension | review-target-set-and-design-family |
| W096 | B16 | [4수03-23] | 3-4 | 도형과 측정 | G21B34 | R19+R04 | 2 | extension | review-target-set-and-design-family |
| W097 | B21 | [4수03-25] | 3-4 | 도형과 측정 | G30 | R21+R11 | 2 | anchor | review-target-set-and-design-family |

## Family acceptance gate

1. official goal에 대응하는 reviewed-complete AssessmentTargetSet과 필수 target 누락 0
2. 각 target에 오개념 최소 1개와 pinned learning-map hash 결속
3. 학생 결정·오개념 충돌·불변량·화면 증거·수정 경로 명시
4. same input/seed는 same item/hash, 의미 조건 변경은 item/hash 동반 변경
5. 유한 envelope 전수 또는 경계와 property test
6. 가능한 상태가 12개 이상이면 최소 12개 정규화 문항
7. 상태 공간이 더 작지 않으면 최소 3개 구별 가능한 대안
8. resolved item에서 도출한 exact preview·정답·해설 일치
9. unsupported parameter silent ignore 0
10. resolve→compile→validator error 0
11. classroom Korean·text-fit·labeled-pool·overlap·cognitive predicate 통과
12. 기존 released blueprint·layout·payload hash 회귀 0
13. offline 통과 뒤에도 fresh evidence 전에는 offline-validated 유지
14. current hash initial/selected/manipulated/undo-or-reset/save/reopen canary
15. min/max와 실제 wrap/stack variant 포함
16. save/reopen mathematical semantic state 안정
17. targetCoverage와 familyVariety 분리
18. 단일 gradeBand와 domain을 지키는 CapabilityManifest

## Native discovery 묶음

- ND01 · 필수 · NO07NL number line
- ND02 · 필수 · NO04NG semantic array
- ND03 · 필수 · CR07CP coordinate plane
- ND04 · 필수 · SM07CS circle handles and measurement
- ND05 · 필수 · SM06UC cube state and views
- ND06 · 필수 · SM06PH/SM07SR solid inspection and net relation
- ND07 · 필수 · DP03PG/DP05LC/DP06RC graph editing
- ND08 · 필수 · unit exchange semantic state
- ND09 · 필수 · capacity and mass measurement representation
- ND10 · 조건부 · polygon and tangram tools
- ND11 · 조건부 · DP07MC mean tool
- ND12 · 조건부 · NO07PF factor and multiple tool

## 재계획 hard stop

- 97개 기준 집합의 누락·중복·외부 코드가 각각 0이어야 한다.
- AssessmentTargetSet reviewed-complete가 계획 archetype보다 우선한다.
- 학생의 수학적 결정, 불변량, 관찰 증거 중 하나라도 다르면 concrete ProblemFamily를 분리한다.
- 한 concrete family는 CapabilityManifest의 단일 gradeBand와 domain을 지킨다.
- pinned learning-map record와 fixture hash가 없으면 family 구현을 시작하지 않는다.
- 같은 MathCanvas 화면이나 같은 선택형 shell을 쓴다는 이유만으로 family를 합치지 않는다.
- 새 family 때문에 공통 planner, MCP schema, teacher-ui 활동별 분기, legacy 중앙 registry를 수정하지 않는다.
- 정답·해설·오개념·exact preview·compile·validator가 함께 통과하기 전 offline-validated로 올리지 않는다.
- 현재 해시의 create·조작·저장·재열기 증거 없이 live-released로 올리지 않는다.
- MathCanvas live 경로가 막혀도 offline queue를 계속 진행한다.
- Fable CLI나 외부 교사 검수를 실행 조건으로 두지 않는다.
