# TeacherIntent capability 3종 — 자동 QA

- 생성 시각: 2026-08-10T15:19:57.100Z
- 결과: **PASS**
- capability 수: **3**
- 고정 seed: `teacher-intent-capability-fixed-seed`
- 외부 MathCanvas 쓰기: 실행하지 않음
- fresh canary: 실행하지 않음(자동 검증과 별도)

## 요청 → 실제 결과

| capability | exact preview | 정답 | 실제 의미 증거 | 반영표 | 판정 |
|---|---|---|---|---|---|
| 곱셈 배열 | 한 묶음에 아이스크림이 4개씩 있습니다. 6묶음을 나타낸 식은 무엇인가요? | 4×6 | 4개씩 × 6묶음, 전체 24, 역순 보기 6×4 | 4/4 반영 | PASS |
| 나눗셈 묶기 | 사탕 23개를 4개씩 묶으면 몇 묶음이고 몇 개가 남을까요? | 5묶음, 3개 | 23개를 4개씩 묶기, 5묶음과 3개, 몫·나머지 오개념 보기 | 4/4 반영 | PASS |
| 분수 비교 | 3/4 ? 3/5 | 3/4 > 3/5 | 3/4와 3/5, 관계 >, 분모 크기만 보는 오개념 표식 | 4/4 반영 | PASS |

## 공통 파이프라인 검사

| capability | 검사 | 판정 |
|---|---|---|
| 곱셈 배열 | schema | PASS |
| 곱셈 배열 | recommendation | PASS |
| 곱셈 배열 | applied | PASS |
| 곱셈 배열 | exactPreview | PASS |
| 곱셈 배열 | answer | PASS |
| 곱셈 배열 | domain | PASS |
| 곱셈 배열 | reflection | PASS |
| 곱셈 배열 | deterministic | PASS |
| 곱셈 배열 | causal | PASS |
| 곱셈 배열 | conflict | PASS |
| 나눗셈 묶기 | schema | PASS |
| 나눗셈 묶기 | recommendation | PASS |
| 나눗셈 묶기 | applied | PASS |
| 나눗셈 묶기 | exactPreview | PASS |
| 나눗셈 묶기 | answer | PASS |
| 나눗셈 묶기 | domain | PASS |
| 나눗셈 묶기 | reflection | PASS |
| 나눗셈 묶기 | deterministic | PASS |
| 나눗셈 묶기 | causal | PASS |
| 나눗셈 묶기 | conflict | PASS |
| 분수 비교 | schema | PASS |
| 분수 비교 | recommendation | PASS |
| 분수 비교 | applied | PASS |
| 분수 비교 | exactPreview | PASS |
| 분수 비교 | answer | PASS |
| 분수 비교 | domain | PASS |
| 분수 비교 | reflection | PASS |
| 분수 비교 | deterministic | PASS |
| 분수 비교 | causal | PASS |
| 분수 비교 | conflict | PASS |

## 경계값 차단

| 검사 | 판정 |
|---|---|
| multiplicationEqualNumbersRejected | PASS |
| divisionNoRemainderRejected | PASS |
| fractionSameDenominatorRejected | PASS |
| divisionEqualSharingPromptRejected | PASS |

## 현재 범위와 남은 일

- 구현됨: 구조화된 TeacherIntent 3종, 첫 문항 exact preview, 실제 적용값 대조,
  동일 입력 재현성, 조건 변경에 따른 문항/hash 변경, route 충돌 차단.
- 구현되지 않음: 제품 내부 자유문장 파서, 대화식 부분 수정, 나머지 18개 released
  활동의 TeacherIntent, 외부 MathCanvas fresh canary.
- 따라서 이 보고서의 PASS는 **TeacherIntent 공통 기반 + 3개 capability**의 오프라인
  통과를 뜻하며, 교사용 AI 전체 완성을 뜻하지 않습니다.

자동 검사는 외부 프로젝트를 만들지 않습니다. 실제 생성과 fresh canary는 제작자가 원할
때 별도로 실행합니다.
