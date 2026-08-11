# TeacherIntent 로컬 UI 브라우저 QA

- 생성 시각: 2026-08-11T00:42:09.490Z
- 결과: **PASS**
- 외부 MathCanvas 연결: 사용하지 않음
- `/api/creations` 요청: **0건**
- 로그인 창 요청: **0건**
- 범위: 로컬 교사용 UI의 구조화 입력 → 추천 → exact preview → 정답 → 반영표

| capability | 실제 문항 | 표시 정답 | intent 반영 행 | 로컬 캡처 | 판정 |
|---|---|---|---|---|---|
| multiplication-array-v1 | 한 묶음에 아이스크림이 4개씩 있습니다. 6묶음을 나타낸 식은 무엇인가요? | 4×6 | 4/4 | `.mathcanvas-contract-lab/previews/teacher-intent-local/multiplication.png` | PASS |
| division-grouping-v1 | 사탕 23개를 4개씩 묶으면 몇 묶음이고 몇 개가 남을까요? | 5묶음, 3개 | 4/4 | `.mathcanvas-contract-lab/previews/teacher-intent-local/division.png` | PASS |
| fraction-comparison-v1 | 3/4 ? 3/5 | 3/4 > 3/5 | 4/4 | `.mathcanvas-contract-lab/previews/teacher-intent-local/fraction.png` | PASS |

이 검사는 외부 저장·재열기 fresh canary를 대체하지 않습니다. MathCanvas 접근이
복구되기 전까지 생성 버튼은 누르지 않으며, 교사의 실제 사용 의향은 별도로 판단합니다.
