# 수식 행 시각 정렬

## 문제

도형의 `y` 좌표가 같아도 글꼴의 기준선과 글리프 여백이 다르면 `+`, `=`, 숫자가 서로 떠 보인다. 서로 다른 renderer나 font size를 섞으면 이 차이가 더 커진다.

## 채택 규칙

1. 빈칸·연산자·결과를 하나의 `equation rail` 순서로 선언한다.
2. 연산자는 모두 `common.formula`와 동일한 font size를 사용한다.
3. 모든 rail 요소의 bounds 중심선을 2px 이내로 맞춘다.
4. 인접 요소의 기하학적 간격 편차를 8px 이내로 제한한다.
5. `visual.equation-rail` runtime predicate가 1~4를 생성 직전에 검사한다.
6. `+`, `=`, 숫자 결과는 한 renderer(`common.formula`)에서 만들고, 글자별 절대 좌표가 아니라 rail 토큰의 `operandGap`, `operatorWidth`, `resultGap`으로 위치를 계산한다.
7. renderer 내부의 글꼴 기준선은 bounds 검사만으로 알 수 없으므로 headless canary 스크린샷에서 실제 잉크 경계의 수학축과 광학적 중심을 확인한다.
8. 광학 보정은 문항별 `y` 값이 아니라 해당 layout preset의 단일 `mathAxisOffset` 토큰에만 둔다. 글꼴이나 크기가 바뀌면 canary를 다시 통과해야 한다.

`visual.no-overlap` predicate는 예상 칸·수식·조작 영역·설명 칸처럼 겹치면 안 되는 주요 영역을 문항마다 검사한다. 분수 띠와 배경 lane처럼 의도적으로 겹치는 층은 검사 목록에서 명시적으로 제외한다.

## 검토한 대안

- 식 전체를 하나의 LaTeX 객체로 만들면 조판은 가장 안정적이지만 카드 drop 영역을 식의 빈칸과 정확히 겹치는 계약이 아직 없다.
- `+`, `=`를 작은 사각형 조합으로 그리면 기하학적으로 정확하지만 숫자와 글꼴 무게가 달라지고 객체 수가 늘어난다.
- 좌표를 눈대중으로 개별 보정하면 한 문항은 맞아도 글자 크기나 renderer 변경 때 다시 무너진다.

따라서 동일 수식 renderer + equation rail + 구조 predicate + 단 한 번의 광학 canary를 기본안으로 사용한다.
