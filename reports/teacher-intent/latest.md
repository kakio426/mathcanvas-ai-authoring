# 곱셈 TeacherIntent v1 — 자동 QA

- 생성 시각: 2026-08-10T13:54:31.900Z
- 결과: **PASS**
- 고정 seed: `teacher-intent-fixed-seed`
- 외부 MathCanvas 쓰기: 실행하지 않음
- fresh canary: 실행하지 않음(자동 검증과 별도)

## 요청 → 실제 결과

| 확인 항목 | 요청 | 실제 결과 | 판정 |
|---|---|---|---|
| 한 묶음의 수 | 4개씩 | 4개씩 | PASS |
| 묶음 수 | 6묶음 | 6묶음 | PASS |
| 사물 맥락 | 아이스크림 | 한 묶음에 아이스크림이 4개씩 있습니다. 6묶음을 나타낸 식은 무엇인가요? | PASS |
| 정답 | 4×6 | 4×6 | PASS |
| 순서 오개념 보기 | 6×4 | 6×4, 4×5, 4×6, 4+6, 6×6 | PASS |
| 전체 수 | 24 | 24 | PASS |
| 승인 전 실제 문항 | exact preview | learner-instructions | PASS |
| 반영 상태 | 4개 필드 모두 반영됨 | 한 묶음의 수:applied, 묶음 수:applied, 사물 맥락:applied, 확인할 오개념:applied | PASS |

## 재현성과 안전 차단

| 검사 | 판정 |
|---|---|
| 같은 seed + 같은 intent → 같은 resolved/hash | PASS |
| 같은 seed + 한 묶음의 수 변경 → 문항/hash 함께 변경 | PASS |
| 같은 seed + 묶음 수 변경 → 문항/hash 함께 변경 | PASS |
| 같은 두 수 거부 | PASS |
| 범위 밖 수 거부 | PASS |
| partial intent 거부 | PASS |
| 미등록 맥락 거부 | PASS |
| 다른 활동과의 조합 거부 | PASS |

## 제작자 화면 확인

- [ ] 요청한 수와 맥락이 화면의 첫 문제에 들어갔는가?
- [ ] 정답 4×6과 오답 6×4가 수학적으로 맞는가?
- [ ] 이 활동을 실제 수업에서 쓰고 싶은가?

자동 검사는 외부 프로젝트를 만들지 않습니다. 실제 생성과 fresh canary는 제작자가 원할
때 별도로 실행합니다.
