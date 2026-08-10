# 곱셈 TeacherIntent v1 체크리스트

원본 사양: `TEACHER_INTENT_PROMPT.md`. 순서대로 진행하고 상태를 `대기` → `진행 중`
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

- 상태: 대기
- [ ] 판별 가능한 `MultiplicationArrayTeacherIntent` 스키마·타입 추가.
- [ ] 숫자 범위, 서로 다름, 곱 42 이하, 맥락/오개념 allowlist를 한 곳에서 export.
- [ ] generation request와 recommendation에 선택적 echo 추가.
- [ ] 유효·경계·잘못된 조합 단위 테스트.
- [ ] intent 없는 기존 계약 호환 확인.

## R2. 플래너와 템플릿 컴파일 — core

- 상태: 대기
- [ ] intent를 곱셈 배열 recommendation에만 전달.
- [ ] 다른 manipulation 조합과 미지원 조건을 silent fallback 없이 차단.
- [ ] 첫 문항에 items-per-group, group-count, context 적용.
- [ ] `groups-size-order` 역순 보기를 항상 포함.
- [ ] resolved item·정답지·approval view가 같은 값을 사용.
- [ ] 기존 intent 없는 seeded fixture 무파손.

## R3. 정확한 미리보기와 반영 상태 — core

- 상태: 대기
- [ ] registry에 template별 exact problem preview seam 추가.
- [ ] 곱셈 배열의 실제 `questionText`를 per-item preview로 투영.
- [ ] 21종 길이 보장 유지, fallback 목록에서 곱셈 배열 제거.
- [ ] 반영 표에 네 의미 필드와 첫 문항 맞춤 설명 추가.
- [ ] echo/실제 값 불일치는 `needs-review`, intent 없으면 행 생략.

## R4. MCP와 웹 구조화 입력 — core

- 상태: 대기
- [ ] MCP recommend 도구에 선택적 `teacherIntent` 객체·설명 추가.
- [ ] MCP 골든 호출과 invalid/기존 호출 테스트.
- [ ] 웹 곱셈 활동에만 구조화 세부 설정 노출.
- [ ] 네 필드 partial 입력을 클라이언트와 서버에서 차단.
- [ ] 기존 수업 메모의 `참고용(미반영)` 의미 유지.
- [ ] 승인 토큰·create 도구 표면 무변경 확인.

## R5. 결정적 골든 QA — core

- 상태: 대기
- [ ] 같은 seed+같은 intent의 item/approval/hash 동일성.
- [ ] 같은 seed에서 items-per-group 변경 시 문항/hash 변경.
- [ ] 같은 seed에서 group-count 변경 시 문항/hash 변경.
- [ ] 정답·total·역순 distractor 검사.
- [ ] 범위 밖/같은 수/미등록 맥락/다른 manipulation 명시 실패.
- [ ] intent 없는 전체 회귀 테스트.

## R6. 1인용 자동 QA 보고서 — scaffold

- 상태: 대기
- [ ] 실제 fixture를 실행하는 단일 명령 추가.
- [ ] 요청→실제 문항→정답→역순 보기→반영 상태 표 생성.
- [ ] deterministic/hash와 invalid 입력 검사 결과 포함.
- [ ] 외부 MathCanvas 쓰기 없음 확인.
- [ ] 생성 경로·재실행 명령 기록.

## 최종 QA와 사람 확인

- 상태: 대기
- [ ] 변경 패키지 집중 테스트.
- [ ] `pnpm typecheck`.
- [ ] `pnpm test`.
- [ ] `pnpm check`.
- [ ] MCP in-memory 골든 호출.
- [ ] teacher-ui 로컬 HTTP 골든 요청/미리보기.
- [ ] 인지 계약·교실 한국어·text-fit·공간 감사 결과 기록.
- [ ] fresh canary 실행 여부를 자동 게이트와 분리해 기록.
- [ ] 제작자 화면 확인 3문항: 수·맥락 / 수학적 정오 / 실제 사용 의향.
- [ ] 외부 실생성은 미실행 또는 제작자 실행 결과를 명시.

## 완료 기록

- 구현 커밋:
- 테스트 수:
- QA 보고서 경로:
- fallback 활동 수 변화:
- 남은 수동 확인:
- 알려진 제한:
