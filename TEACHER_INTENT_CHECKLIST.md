# TeacherIntent capability 체크리스트

원본 곱셈 사양: `TEACHER_INTENT_PROMPT.md`. R1~R6은 첫 세로 단면 기록이고,
R7~R10은 2026-08-11 공통화·확장 기록이다. 상태를 `대기` → `진행 중`
→ `완료`로 갱신한다. 보류할 때는 이유와 다음 행동을 기록한다. 기존 `CHECKLIST.md`와
Honest Preview 체크리스트는 수정하지 않는다.

## 사전 상태

- 상태: 완료
- 기존 작업 분리 커밋:
  - `4fb9c45 chore: restore typecheck baseline`
  - `e25b3c0 feat: add honest teacher preview`
  - `8b33b16 feat: add R5 native tool discovery slices`
  - `64b1d64 docs: define solo TeacherIntent roadmap`
- 기준선: Honest Preview 당시 `pnpm check` 64개 파일·361개 테스트 통과.
- 범위 밖: 외부 MathCanvas 실제 쓰기, 외부 교사 파일럿, 범용 자연어 파서.

## R1. 공유 계약과 검증기 — core

- 상태: 완료
- [x] 판별 가능한 `MultiplicationArrayTeacherIntent` 스키마·타입 추가.
- [x] 숫자 범위, 서로 다름, 곱 42 이하, 맥락/오개념 allowlist를 한 곳에서 export.
- [x] generation request와 recommendation에 선택적 echo 추가.
- [x] 유효·경계·잘못된 조합 단위 테스트.
- [x] intent 없는 기존 계약 호환 확인.

## R2. 플래너와 템플릿 컴파일 — core

- 상태: 완료
- [x] intent를 곱셈 배열 recommendation에만 전달.
- [x] 다른 manipulation 조합과 미지원 조건을 silent fallback 없이 차단.
- [x] 첫 문항에 items-per-group, group-count, context 적용.
- [x] `groups-size-order` 역순 보기를 항상 포함.
- [x] resolved item·정답지·approval view가 같은 값을 사용.
- [x] 기존 intent 없는 seeded fixture 무파손.

## R3. 정확한 미리보기와 반영 상태 — core

- 상태: 완료
- [x] registry에 template별 exact problem preview seam 추가.
- [x] 곱셈 배열의 실제 `questionText`를 per-item preview로 투영.
- [x] 21종 길이 보장 유지, fallback 목록에서 곱셈 배열 제거.
- [x] 반영 표에 네 의미 필드와 첫 문항 맞춤 설명 추가.
- [x] echo/실제 값 불일치는 `needs-review`, intent 없으면 행 생략.

## R4. MCP와 웹 구조화 입력 — core

- 상태: 완료
- [x] MCP recommend 도구에 선택적 `teacherIntent` 객체·설명 추가.
- [x] MCP 골든 호출과 invalid/기존 호출 테스트.
- [x] 웹 곱셈 활동에만 구조화 세부 설정 노출.
- [x] 네 필드 partial 입력을 클라이언트와 서버에서 차단.
- [x] 기존 수업 메모의 `참고용(미반영)` 의미 유지.
- [x] 승인 토큰·create 도구 표면 무변경 확인.

## R5. 결정적 골든 QA — core

- 상태: 완료
- [x] 같은 seed+같은 intent의 item/approval/hash 동일성.
- [x] 같은 seed에서 items-per-group 변경 시 문항/hash 변경.
- [x] 같은 seed에서 group-count 변경 시 문항/hash 변경.
- [x] 정답·total·역순 distractor 검사.
- [x] 범위 밖/같은 수/미등록 맥락/다른 manipulation 명시 실패.
- [x] intent 없는 전체 회귀 테스트.

## R6. 1인용 자동 QA 보고서 — scaffold

- 상태: 완료
- [x] 실제 fixture를 실행하는 단일 명령 추가: `pnpm teacher-intent:verify`.
- [x] 요청→실제 문항→정답→역순 보기→반영 상태 표 생성.
- [x] deterministic/hash와 invalid 입력 검사 결과 포함.
- [x] 외부 MathCanvas 쓰기 없음 확인.
- [x] 생성 경로·재실행 명령 기록.

## R7. 공통 capability registry — core

- 상태: 완료
- [x] 판별 가능한 TeacherIntent 3종 union과 단일 capability registry 추가.
- [x] route·template·kind 중복, 기본값, UI 필드 coverage를 모듈 로드 시 검증.
- [x] 플래너·MCP·교사용 서버·반영표·웹 폼의 kind별 분기 제거.
- [x] 중앙 소비자에 3개 kind 리터럴이 다시 생기면 실패하는 아키텍처 테스트 추가.
- [x] 교사용 curriculum API가 registry의 3종만 정확한 경로에 노출하는 테스트 추가.

## R8. 나눗셈 포함제 TeacherIntent — core

- 상태: 완료
- [x] `totalCount`, `groupSize`, 사물 맥락, 몫·나머지 오개념 계약 추가.
- [x] 23개를 4개씩 묶는 문항·수 세기 모형·정답 5묶음 3개 결속.
- [x] 몫/나머지 바꾸기와 나머지가 나누는 수 이상인 오답 보기 포함.
- [x] 실제 `questionText` exact preview와 적용값 projector 등록.
- [x] `4명에게 똑같이 나누기`를 `4개씩 묶기`로 침묵 변환하지 않도록 차단.
- [x] TeacherIntent 전용 generator provenance `1.7.0` 기록.

## R9. 분수 비교 TeacherIntent — core

- 상태: 완료
- [x] 공통 분자와 서로 다른 두 분모의 진분수 계약 추가.
- [x] 시각 차이 범위 0.15~0.27을 유지해 너무 쉽거나 구별 어려운 쌍 차단.
- [x] 첫 분수 쌍·정답 관계·분모 오개념 표식을 같은 resolved item에 결속.
- [x] `3/4 ? 3/5` exact preview와 실제 적용값 projector 등록.
- [x] TeacherIntent 전용 generator provenance `1.1.0` 기록.

## R10. capability 3종 QA — scaffold

- 상태: 완료
- [x] 세 종류 모두 동일 입력 재현성과 조건 변경→문항/hash 변경 검사.
- [x] recommendation echo·실제 적용값·exact preview·정답·반영표 대조.
- [x] MCP 스키마에 필드 의미·허용 맥락·비지원 의미 설명 노출.
- [x] 자동 보고서를 곱셈 단일 표에서 capability 3종 매트릭스로 확장.
- [x] 보고서가 교사용 AI 전체 완료가 아님을 명시.

## 최종 QA와 사람 확인

- 상태: 자동 QA 완료, 제작자 화면 확인 대기
- [x] 변경 패키지 집중 테스트: 9개 파일·65개 테스트 통과.
- [x] `pnpm typecheck`: 전체 `pnpm check` 안에서 통과.
- [x] `pnpm test`: 66개 파일·402/402 통과.
- [x] `pnpm check`: 빌드와 모든 감사 포함 통과.
- [x] MCP in-memory 골든 호출: 실제 첫 문항과 충돌 오류 코드 확인.
- [x] teacher-ui 로컬 HTTP 3종 요청/미리보기: exact 문항·정답·모든 반영 행·승인 토큰 확인.
- [x] 로컬 HTTP 검증에서 `/api/creations` 미호출, 외부 쓰기 0건 확인.
- [x] 인지 계약·교실 한국어·text-fit·공간 감사: P0/P1 0, 시각 점수 100.
- [x] fresh canary 실행 여부를 자동 게이트와 분리해 기록: **미실행**.
- [ ] 제작자 화면 확인 3문항: 수·맥락 / 수학적 정오 / 실제 사용 의향.
- [x] 외부 실생성: **미실행**. 별도 승인 전에는 수행하지 않는다.

## 완료 기록

- 기존 곱셈 구현 커밋: `14a9958 feat: compile multiplication TeacherIntent`,
  `632cff5 feat: expose TeacherIntent in teacher preview`.
- 공통화·확장 커밋: `938239e feat: generalize TeacherIntent capabilities`,
  `cecd2d2 feat: expose TeacherIntent capability forms`.
- 테스트 수: 전체 66개 파일·402개 테스트, 집중 10개 파일·90개 테스트.
- QA 보고서 경로: `reports/teacher-intent/latest.md`.
- fallback 활동 수 변화: 20종 → 18종(곱셈·분수 exact preview 등록, 나눗셈 유지).
- 남은 수동 확인: 교사용 compose/preview에서 3개 capability, fresh canary, 원할 때만 외부
  실생성 1회.
- 알려진 제한: released 21종 중 3종의 첫 문항만 맞춤, 범용 자연어 파서·부분 수정
  없음. 새 TeacherIntent 산출물의 공식 release 근거는 fresh canary 전까지 주장하지 않는다.
