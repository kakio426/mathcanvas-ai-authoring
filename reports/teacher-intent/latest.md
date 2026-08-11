# TeacherIntent capability 3종 — 자동 QA

- 생성 시각: 2026-08-11T00:31:17.881Z
- 결과: **PASS**
- capability 수: **3**
- 고정 seed: `teacher-intent-capability-fixed-seed`
- 외부 MathCanvas 쓰기: 실행하지 않음(프로젝트 생성 0건)
- fresh canary: **BLOCKED** — 2026-08-11 제작자 확인 기준 외부 MathCanvas 접근 차단

## 요청 → 실제 결과

| capability | exact preview | 정답 | 실제 의미 증거 | 반영표 | payload hash | validator | 판정 |
|---|---|---|---|---|---|---|---|
| 곱셈 배열 | 한 묶음에 아이스크림이 4개씩 있습니다. 6묶음을 나타낸 식은 무엇인가요? | 4×6 | 4개씩 × 6묶음, 전체 24, 역순 보기 6×4 | 4/4 반영 | `99df75330306…` | PASS | PASS |
| 나눗셈 묶기 | 사탕 23개를 4개씩 묶으면 몇 묶음이고 몇 개가 남을까요? | 5묶음, 3개 | 23개를 4개씩 묶기, 5묶음과 3개, 몫·나머지 오개념 보기 | 4/4 반영 | `0b28b79f897b…` | PASS | PASS |
| 분수 비교 | 3/4 ? 3/5 | 3/4 > 3/5 | 3/4와 3/5, 관계 >, 분모 크기만 보는 오개념 표식 | 4/4 반영 | `9101c9838ae1…` | PASS | PASS |

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
| 곱셈 배열 | compiledPayload | PASS |
| 곱셈 배열 | creationGate | PASS |
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
| 나눗셈 묶기 | compiledPayload | PASS |
| 나눗셈 묶기 | creationGate | PASS |
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
| 분수 비교 | compiledPayload | PASS |
| 분수 비교 | creationGate | PASS |

## 경계값 차단

| 검사 | 판정 |
|---|---|
| multiplicationEqualNumbersRejected | PASS |
| divisionNoRemainderRejected | PASS |
| fractionSameDenominatorRejected | PASS |
| divisionEqualSharingPromptRejected | PASS |

## 현재 범위와 남은 일

- 구현됨: 구조화된 TeacherIntent 3종, 첫 문항 exact preview, 실제 적용값 대조,
  동일 입력 재현성, 조건 변경에 따른 문항/hash 변경, route 충돌 차단,
  실제 compiler payload와 생성 전 validator 통과.
- 구현되지 않음: 제품 내부 자유문장 파서, 대화식 부분 수정, 나머지 18개 released
  활동의 TeacherIntent, 외부 MathCanvas fresh canary.
- 따라서 이 보고서의 PASS는 **TeacherIntent 공통 기반 + 3개 capability**의 오프라인
  통과를 뜻하며, 교사용 AI 전체 완성을 뜻하지 않습니다.

자동 검사는 외부 프로젝트를 만들지 않습니다. 현재 외부 MathCanvas 접근 차단 때문에
fresh canary는 실행할 수 없으며, 접근이 복구된 뒤 별도 실행해야 합니다.
