# 2022 개정 초등 수학 전 범위 생성 체크리스트

기준 문서: `ELEMENTARY_2022_FULL_COVERAGE_PLAN.md`  
현재 실행 범위: Phase 0 완료, Phase 1 미착수  
상태 표기: `[ ]` 미착수, `[-]` 진행 중, `[x]` 완료, `[!]` 차단

## P0-A — 계획 보정

- [x] `targetCoverage`와 `familyVariety`를 분리한다.
- [x] CI의 외부 다운로드 의존을 제거한다.
- [x] Phase 1을 strangler 이관 방식으로 바꾼다.
- [x] canonical FamilyId와 단일 등록 지점 인수 기준을 명시한다.
- [x] 기존 release evidence의 실제 hash 검증을 보존한다.
- [x] Phase 3 처리량 재산정 checkpoint를 추가한다.
- [x] Phase 4를 Phase 2 이후 Phase 3과 병행하도록 바꾼다.
- [x] 커버리지 100%를 Phase 3 전체 종료 기준으로 이동한다.

## P0-B — 공식 성취기준 fixture

- [x] 교육부 공식 URL·파일 SHA-256·검토일 manifest를 추가한다.
- [x] `[2수]` 공식 레코드를 추가한다.
- [x] `[4수]` 공식 레코드를 추가한다.
- [x] `[6수]` 공식 레코드를 추가한다.
- [x] 원문 전체를 저장소에 재배포하지 않는지 확인한다.
- [x] schema·코드 형식·중복·학년군·영역 검사를 추가한다.
- [x] 공식 원문 해시 재대조를 수동 명령으로 분리한다.

완료 기준:

- [x] 모든 fixture 레코드가 `official-text-verified`다.
- [x] 중복 코드 0건, 학년군·영역 불일치 0건이다.
- [x] 공식 fixture 검사 테스트가 통과한다.

## P0-C — catalog diff와 커버리지

- [x] official fixture와 현재 `teacherCurriculumCatalog` 코드 차이를 계산한다.
- [x] 공식 문구·영역·학년군 차이를 계산한다.
- [x] `OfficialStandard`별 `mapped / generatable / offline-validated / live-released` 상태를 계산한다.
- [x] `targetCoverage`와 `familyVariety`를 별도 필드로 둔다.
- [x] 1~6학년 교과서 단원의 unknown·orphan code를 검사한다.
- [x] `getElementaryCurriculumCoverage()`가 검증된 공식 분모를 사용한다.
- [x] `pnpm curriculum:coverage`를 추가한다.
- [x] `reports/curriculum-coverage/latest.md`와 기계 판독 JSON을 생성한다.

완료 기준:

- [x] 공식 분모와 현재 분자가 학년군·영역별 숫자로 출력된다.
- [x] 단순 단원 연결과 성취기준 완전 커버리지가 구분된다.
- [x] 지원하지 않는 성취기준을 지원한다고 표시하지 않는다.

## P0-D — 문서·QA

- [x] `docs/ARCHITECTURE.md`의 과거 3종 설명을 현재 상태로 고친다.
- [x] README의 커버리지 표현을 새 보고서와 동기화한다.
- [x] 관련 단위 테스트를 통과한다.
- [x] `pnpm curriculum:coverage`를 통과한다.
- [x] coverage metric 계약 변경 이유를 기록하고 architecture baseline을 검토 재동결한다.
- [x] `pnpm check` 전체를 통과한다.
- [x] plan과 checklist를 다시 읽고 Phase 0 누락이 없는지 대조한다.

## Phase 0 증거 — 2026-08-11

- 공식 분모: 121개 (`[2수]` 29, `[4수]` 47, `[6수]` 45)
- HWP/PDF 대조: 코드 121/121 일치, 목표 117개 공백 정규화 일치, 형식 차이 4개는 manifest에 채택 원문 기록
- 원본 재대조: 교육부 archive, archive 내부 수학 HWP, NCIC PDF SHA-256 모두 PASS
- catalog diff: 누락 0, fixture 밖 0, 문구 0, 학년군 0, 영역 0
- 현재 상태: mapped 98, offline-validated 5, live-released reach 18
- `targetCoverage`: AssessmentTarget registry 전까지 `unavailable`
- 단원 인덱스: 71개, unknown 0, orphan official standard 0, released 활동 reach 16개 단원
- architecture baseline: 32 files, `a8a237bda09a8b0c48b8c252ec7b7ea57ad94210e7b2c184dcda5d351ac90a9c`
- 전체 QA: 68 test files, 416/416 tests, build, curriculum coverage, native/contract/cognitive/visual/quality audit PASS
- Fable CLI 최종 검토: `PASS`, P0 0건. P1 두 건(legacy 상태 하드코딩, 보고 시각 명명)은 canonical support 파생과 `authorityReviewedAt`으로 검토 직후 해소

## Phase 0 이후 금지

다음 항목은 Phase 0 완료 보고 전에는 착수하지 않는다.

- 새 blueprint
- 새 TeacherIntent
- 기존 3종의 UI polish
- 부분 수정 기능
- 다수 교사 배포 기능
