# 정직한 미리보기 체크리스트

원본 요구사항: `HONEST_PREVIEW_PROMPT.md` (이 파일이 진행 기록, 저 파일이 사양).
순서대로 진행하고 각 항목의 `상태`를 직접 갱신할 것: `대기` → `진행 중` → `완료`
(보류 시 `보류: <사유>`). 저장소 루트의 기존 `CHECKLIST.md`는 다른 작업의 공식
대장이므로 건드리지 말 것.

## R1. 릴리스 위생 — core

- 상태: 완료
- 내용: `pnpm typecheck` 오류 5개를 동작 변경 없이 수정, README released 17→21.
- 완료 정의: `pnpm check` 녹색, 기존 354 테스트 무파손. 동작 변경이 필요한 오류는
  보류하고 사유 기록.

## R2. `수업 메모` 정직화 — core

- 상태: 완료
- 내용: `App.tsx` 612행 부근 라벨을 `수업 메모`로 변경, "아직 문항 내용에는 반영되지
  않습니다" 안내 추가. 필드·전송·검증은 유지 (숨김·제거 금지).
- 완료 정의: 입력 시점에 미반영 사실이 보이고 R5 반영 표와 카피가 모순 없음.

## R3. 공유 계약 확장 — core

- 상태: 완료
- 내용: `contract.ts`에 `ProblemPreview`, `TeacherAnswerPreview`,
  `InputReflection`(3상태) 추가, `PublicActivity` 확장. 카드 목록(201) 응답에는
  정답지·문항 미포함.
- 완료 정의: 서버·웹 동일 타입 사용, typecheck 녹색.

## R4. 런타임 문항 프로젝션 — core

- 상태: 완료
- 내용: `authoring-runtime`에 `projectProblemPreviews(resolved, answerKey)` 추가,
  `recommend()` 반환에 포함. item-scoped instruction emission 조인, 불가 시
  answer-explanation fallback. 문항 수만큼 엔트리 보장.
- 완료 정의: released 21종 전수 `problemPreviews.length === teacherAnswerKey.length
  === problemCount` 테스트 통과. fallback 사용 템플릿 목록이 테스트로 드러남.
- fallback 템플릿 기록: 21종 중 20종. 직접 문항 안내를 투영하는 유형은
  `number.division.quotient-remainder.claim-evidence-v1`이며, 나머지는 정답 해설
  fallback을 사용함. 전체 ID 목록은 `packages/authoring-runtime/src/problem-previews.test.ts`에
  회귀 테스트로 고정.

## R5. 서버 배관 + 반영 상태 계산 — core

- 상태: 완료
- 내용: `toPublicActivity()`에 problemPreviews·teacherAnswerKey 전달.
  `buildInputReflections()` 순수 함수 — applied(echo 일치) / reference-only(어려움
  선택·수업 메모) / needs-review(echo 불일치·caveats·unsupportedRequests).
- 완료 정의: 단위 테스트 4케이스(전부 일치·메모 있음·caveat·불일치) 통과, 존댓말 카피.

## R6. 미리보기 UI — core

- 상태: 완료
- 내용: 미리보기 화면에 `실제 문항` / `교사용 정답·해설`(기본 접힘) /
  `내 입력이 어떻게 쓰였나요`(3상태 배지, 색+텍스트) 섹션 추가. 기존
  preview-section·스타일 관례 준수.
- 완료 정의: 미리보기만으로 전 문항+정답 확인 가능, 승인·생성 흐름 무변경.

## R7. 교사 입력 로컬 로그 — scaffold

- 상태: 완료
- 내용: 유효 추천 요청마다 JSONL 1줄 append(`reports/teacher-input-log.jsonl` 등),
  `.gitignore` 추가, 로그 실패가 추천을 깨지 않게. 분석 도구는 만들지 않음.
- 완료 정의: 추천 1회당 1줄 확인, `git status`에 로그 미노출.

## 최종 QA

- 상태: 완료
- `pnpm check` 녹색 / 곱셈 배열 수동 시나리오(메모 있음·없음 각 1회) 통과 /
  승인·생성 성공 / 로그 2줄 확인. 결과를 여기에 기록.
- 2026-08-10 결과:
  - `pnpm check` PASS: 64개 테스트 파일, 361개 테스트(기존 354개 포함), 전체 빌드,
    native spatial·인지·시각·품질 감사 녹색.
  - 로컬 HTTP 곱셈 배열 시나리오 2회 PASS: 메모 있음/없음 모두 문항 2개와 정답·해설
    2개, 승인 토큰 발급. 메모 있음은 `참고용(미반영)`, 없음은 메모 행 생략.
  - 201 카드 요약에는 문항·정답지가 없고, 미리보기 응답에만 포함됨을 확인.
  - 실제 외부 MathCanvas 프로젝트 쓰기는 실행하지 않았고, 기존 모의 E2E 생성 테스트에서
    승인 후 create-only 생성 성공과 중복 생성 방지를 확인.
  - `reports/teacher-input-log.jsonl`이 정확히 2줄 증가했고 `.gitignore` 적용으로
    `git status`에 노출되지 않음을 확인.
