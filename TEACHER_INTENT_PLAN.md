# MathCanvas 교사용 AI — 완료된 하위 계획 (1인 제품 기준)

작성: 2026-08-10, 실행 상태 갱신: 2026-08-11.

> **완료 기록:** 이 문서는 Honest Preview와 legacy TeacherIntent 3종 구현 기록이다. 다음 작업을 지시하는 master plan이 아니다. 전 범위 계획 Phase 1에서 세 종류를 공통 `ProblemParameters`로 호환 이관했고, 현재 우선순위는 Phase 2 대표 격자다. 장기 실행은 `ELEMENTARY_2022_FULL_COVERAGE_PLAN.md`, 진행 증거는 `ELEMENTARY_2022_FULL_COVERAGE_CHECKLIST.md`를 따른다.

## 진행 상태 (2026-08-11)

- 기존 혼합 작업 분리와 Honest Preview 기준선 정리는 완료했다.
- canonical ProblemFamily registry는 29개 전체를 감싸며, 플래너·MCP·교사용
  서버·반영표·웹 폼은 개별 TeacherIntent kind를 분기하지 않는다. 신규 family는
  영역 index의 native module만 등록한다.
- 구조화 TeacherIntent는 3종이다: 곱셈 배열, **몇 개씩 묶는 포함제 나눗셈**,
  공통 분자가 같은 분수 비교. 세 종류 모두 요청→실제 문항→정답→exact preview→
  반영표→hash가 같은 의미값으로 결속된다.
- `pnpm teacher-intent:verify` PASS. 전 범위 Phase 1까지 합친 최신 `pnpm check`는
  71개 테스트 파일·440/440, 빌드, 인지·시각·품질 감사(P0/P1 0)를 통과했다.
- 로컬 teacher-ui HTTP 경로에서 3종 모두 카드→exact preview→정답→반영표→승인
  토큰 발급까지 확인했다. `/api/creations`는 호출하지 않았다.
- `pnpm teacher-intent:ui-verify`로 세 capability의 실제 브라우저 화면을 반복 검증한다.
  문항·표시 정답·intent 반영 4행을 대조하고 생성·로그인 API 호출이 있으면 실패한다.
  육안 검수에서 발견한 raw `\\times` 노출은 교사용 화면에서 `×`로 표시되도록 수정했다.
- 로컬 compose/preview의 기술·육안 확인은 완료했다. 남은 것은 제작자의 실제 수업
  사용 의향 판단과 fresh canary다. 2026-08-11 제작자 확인 기준 외부 MathCanvas 접근이
  차단되어 fresh canary는 실행 불가 상태다. 당일 로그인 사전 확인은 프로젝트 생성
  전에 중단했으며 외부 쓰기는 0건이다.

**전체 대비 위치**: 현재는 "공통 ProblemFamily 기반 + 맞춤 사례 3개"다. parameter
coverage는 released 21종 중 3종이고, 맞춤 범위는 첫 문항이다. 제품 내부 자유문장 파서와
대화식 부분 수정은 없으므로 "교사가 무엇이든 프롬프트로 만든다"는 단계가 아니다.
MCP를 호출하는 외부 AI가 설명이 붙은 공통 스키마로 자연어를 구조화하며, 지원하지
않는 조건은 확인 질문으로 멈춘다. fresh canary 전까지 새 맞춤 산출물의 공식 릴리스를
주장하지 않는다. 외부 접근이 복구되기 전에는 canary를 반복 시도하지 않는다.

### 외부 MathCanvas 차단 중의 진행 원칙 (2026-08-11)

- 공식 release 증거와 실제 저장·재열기 통과를 추정하거나 로컬 결과로 대체하지 않는다.
- 로컬 자동 QA는 `TeacherIntent → resolved → approval hash → compiler payload → validator`
  경계까지 실행한다. 세 capability 모두 payload hash 결속과 `canCreate: true`를 요구한다.
- 이 경계 검사를 추가하며 나눗셈 맞춤 문항의 기존 `canCreate: false`를 발견해 수정했다.
  canonical 이야기 생성기를 계약으로 공유하고, 등록 맥락 4종·허용 조합 612개·언어
  변조 차단을 회귀 테스트로 고정했다.
- 외부 접근이 복구되면 새 코드를 더 만들기 전에 세 capability fresh canary를 먼저
  실행한다. 생성은 각 1회만 허용하고 초기 화면·핵심 조작·되돌리기·재열기 증거를 남긴다.

기준 사실: Honest Preview R1~R7 구현·자동 QA 완료(`HONEST_PREVIEW_CHECKLIST.md`,
`pnpm check` 361/361). 브라우저 실측으로 핵심 시나리오 재현 확인(수업 메모 미반영이
`참고용(미반영)`으로 정직하게 표시, caveats의 `확인 필요` 승격, 정답·해설 노출).
미리보기 hash 불변은 21종 전수 테스트로 고정. 정확한 문항 직접 투영은 곱셈·
나눗셈·분수 3종이고, 18종은 정답 해설 fallback이다.

## 제품 방향 선언 (개정)

- 목표 사용자는 **제작자 본인 한 명**이다. 여러 교사 배포용 완성도가 아니라,
  **본인이 매일 수업 준비에 안정적으로 쓰는 교사용 AI**를 먼저 완성한다.
- 외부 교사 파일럿은 하지 않는다. 그 기능(의도 축 선택·검증 데이터)은
  **본인의 실제 요청**이 대신한다: 실사용 중 아쉬운 요청이 생길 때마다 그것을
  회귀 테스트로 추가한다. 목표 사용자가 1명이면 그 1명의 요청이 가장 정확한
  검증 자료다.
- 기준 문장: *내 의도를 생성 가능한 수학적 조건으로 번역하고, 그 반영 결과를
  승인 전에 보여 주며, 같은 요청은 같은 결과로 재현된다.*
- 불변 원칙: AI가 raw 좌표·임의 payload를 만들지 않는다. 자연어는 허용된
  구조화 파라미터로만 컴파일되고, 기존 안전 게이트(승인 토큰, hash 결속,
  fail-closed, create-only)를 그대로 통과한다.

## 검증 역할 분담 (모든 단계 공통)

**자동화가 맡는 것** (기능 묶음마다):
- 대표 요청 fixture + 회귀 테스트
- 요청값 → 실제 문항 → 정답 → 반영 상태 자동 대조
- 고정 seed 재현성과 activitySpecHash 결속 검사
- 지원하지 않는 입력의 명시적 거절(침묵 무시 금지) 검사
- 전체 테스트·빌드·화면 캡처 → **한 장짜리 QA 보고서**
- 로컬 브라우저 3종 화면 검증: `pnpm teacher-intent:ui-verify`

**사람(제작자)이 확인하는 것** (기능 묶음마다 세 가지만):
1. 내가 요청한 수와 맥락이 실제 문제에 들어갔는가?
2. 정답과 오답 보기가 수학적으로 맞는가?
3. 내가 실제 수업에서 쓰고 싶은가?

## 골든 케이스 (TeacherIntent의 기준 사례, 고정)

> "아이스크림이 한 묶음에 4개씩 있고 6묶음입니다. 4와 6의 뜻을 바꾸어 생각하는
> 학생을 위한 곱셈 활동을 만들어 주세요."

- 대상 템플릿: `number.multiplication.group-array-meaning-v1` (곱셈 배열).
- 구조화 계약: `itemsPerGroup: 4`, `groupCount: 6`,
  `contextObjectId: "ice-cream"`, `misconceptionId: "groups-size-order"`.
  역할이 없는 `specificNumbers: [4, 6]` 형태는 두 수의 뜻을 다시 모호하게 하므로
  사용하지 않는다.
- 통과 정의: 실제 문항에 아이스크림·4·6이 등장하고, 순서 오개념(6×4)이 보기로
  구성되며, 반영 상태 표에 `반영됨`으로 표시된다. 같은 고정 seed·같은 intent는
  같은 approval view/hash를 만들고, 같은 seed에서 intent만 바꾸면 요청한 문항 값과
  hash가 함께 달라져야 한다(무작위 seed 차이를 인과 증거로 사용하지 않음).
- 이 사례를 골든 테스트로 저장소에 고정하고, 이후 모든 확장은 이 테스트를
  깨지 않아야 한다.

## 실행 순서

### 1. Honest Preview 마무리 — 커밋 분리 + 브라우저 캡처 (지금)

진행 기록(2026-08-10): 커밋 분리 완료.

- `4fb9c45 chore: restore typecheck baseline`
- `e25b3c0 feat: add honest teacher preview`
- `8b33b16 feat: add R5 native tool discovery slices`

**커밋 분리** — 작업 트리에 두 작업이 섞여 있어 자동 처리는 위험. 소유권 확정 결과:

| 커밋 | 파일 |
|---|---|
| **Honest Preview** | `apps/teacher-ui/src/server/main.ts`, `shared/contract.ts`, `web/App.tsx`, `web/styles.css`, `server/input-reflections.{ts,test.ts}`(신규), `server/teacher-input-log.{ts,test.ts}`(신규), `packages/authoring-runtime/src/service.ts`, `problem-previews.test.ts`(신규), `.gitignore`(teacher-input-log 1줄), `README.md`(17→21), `HONEST_PREVIEW_PROMPT.md`, `HONEST_PREVIEW_CHECKLIST.md` |
| **R5/HTML30 (별도)** | `PLAN.md`(HTML30 delta), `package.json`(r5 스크립트), `packages/contracts/src/index.ts`, `packages/templates/src/index.ts`, `r5-*` 신규 파일 전부, `research/*`, `scripts/*` 신규 |
| **R1 typecheck 위생(분리 완료)** | `eduitit-html30-release-v2.test.ts`, `compile-eduitit-html30-v2.test.ts`, `eduitit-html30-v2.ts`, `mathcanvas-harness-guard.d.mts`, `peer-overlap.d.mts`, `README.md` |
| **계획 문서** | `TEACHER_INTENT_PLAN.md` — 둘 중 어느 커밋과도 무관, docs 커밋 |

**브라우저 캡처** — fallback 활동(곱셈 배열 등) 1개에서 answer-explanation 문항의
보조 안내 문구가 렌더되는지 캡처 1장. + 실서비스 MathCanvas 생성 1회(로그인 필요,
제작자 직접): 승인→생성→열어서 미리보기와 일치 확인.

**완료 기준**: 독립 커밋 2~3개, 캡처 존재, 실생성 1회 성공.

### 2. 곱셈 TeacherIntent 세로 단면 구현

- 진입점: **MCP 먼저** — recommend 도구에 구조화 선택 파라미터
  (`itemsPerGroup`, `groupCount`, `contextObjectId`(등록 목록 내),
  `misconceptionId`) 추가.
  외부 AI(Codex/Claude)가 자연어를 구조화하므로 파서는 만들지 않는다.
  웹 UI는 세부 설정에 같은 값의 구조화 입력을 노출(자연어 파싱 아님).
- 요청 3상태 처리: 특정 수·오개념을 명명한 조건은 '필수' — 지킬 수 없으면
  **"빼고 만들까요, 취소할까요?" 확인 질문으로 차단**. 장식 맥락은 '미반영 가능'
  으로 계속 진행. 반영 상태 표가 성능 계기판.
- **포함 사항(중요)**: 곱셈 배열은 현재 fallback 템플릿이라 미리보기가 정답 해설
  요약이다. 골든 케이스 확인이 "화면 한 번"으로 끝나려면 이 세로 단면에
  **곱셈 배열의 per-item 문항 projection 등록**(answerKey처럼 blueprint별 함수)을
  포함해 미리보기에 실제 문항 문구가 나오게 한다.
- 착수 시 `TEACHER_INTENT_PROMPT.md` 핸드오프 문서를 별도 작성(Honest Preview와
  같은 사양+체크리스트 방식).
- **완료 기준**: 골든 케이스 통과 정의 전부 + 기존 게이트·감사 녹색.

### 3. 자동 QA 보고서 생성

- 위 '자동화가 맡는 것' 목록을 실행하고 결과를 한 장(md)으로 생성하는 스크립트.
- **완료 기준**: 명령 1회로 보고서가 나오고, 골든 케이스의 요청→문항→정답→반영
  상태 대조가 표로 담긴다.

### 4. 제작자 골든 사례 확인 (기술 경로 완료, 주관 평가 대기)

- 화면에서 곱셈·나눗셈·분수 세 사례를 실행하고 세 가지 질문(수·맥락 / 수학적
  정오 / 수업에 쓰고 싶은가)에 답한다. 통과하면 이 기능 묶음을 닫는다.

### 5. 활동 2~3종 확장으로 "데모 아님" 증명 (오프라인 완료)

체크리스트 완료 표시가 아니라 다음 도약이 전체 진도를 올린다. 후보 둘 중
**확장(구조 일반화)을 먼저** 한다:

- **2번째 활동**: `number.division.quotient-remainder.claim-evidence-v1`.
  `사탕 23개를 4개씩 묶기`로 구현했다. `4명에게 똑같이 나누기`는 등분제라서
  같은 요청이 아니며, 이를 4개씩 묶기로 침묵 변환하지 않도록 명시 차단한다.
- **3번째 활동**: `fraction.compare.unlike-denominators.visual-v1`.
  공통 분자와 서로 다른 분모를 구조화해 `분모가 크면 분수도 크다`는 오개념을
  실제로 진단할 수 있는 쌍만 허용한다.
- **완료 정의**: 중앙 소비자(플래너·MCP·교사용 서버·반영표·웹 폼)에 kind별 분기가
  없다. 향후 capability 추가는 contracts registry/스키마와 활동별 생성·투영 모듈,
  테스트만 추가하며 중앙 소비자는 고치지 않는다. 이 불변은 아키텍처 테스트로 고정했다.
- **자연어 번역 계층은 만들지 않는다(유지)**: MCP 스키마에 각 숫자의 의미,
  허용 맥락, 비지원 조건 설명을 넣었다. 정적 문장→JSON 예시는 번역 모델의 실제
  성공률 증거로 과장하지 않는다. 제품 내 파서는 MCP 실사용이 불편할 때만 재검토한다.

### 6. 실사용 주도 확장

- 매일 실제 수업 준비에 사용. 아쉬운 요청이 생기면: ① 그 요청을 fixture로 저장
  ② 회귀 테스트 추가 ③ 필요한 최소 기능(새 축, 부분 수정, 다른 활동으로 확장)
  구현 ④ QA 보고서 재생성 ⑤ 화면 1회 확인.
- 부분 수정(문항 단위 재생성, draft 파라미터 수정)도 이 루프에서 **실제로 필요해
  졌을 때** 만든다 — 미리 만들지 않는다.

## 이연 게이트 (지금 안 하지만, 조건이 바뀌면 부활)

- **다른 교사에게 배포하는 순간**: 수업 메모 로그의 보관 기간·수집 동의·익명화·
  회수 방식 정의(현재는 본인 로컬 전용 + gitignore라 문제 없음), 번들 설치본,
  서면 배포 범위 합의, E2E·접근성 자동화.
- 30개 3학년 시리즈 lifecycle 검증·released 연결: 실사용에서 3학년 coverage가
  실제로 아쉬워질 때.

## 하지 않기로 한 것

- 외부 교사 파일럿·온보딩·배포 준비 (1인 제품 완성 전).
- 범용 자연어 의도 스키마, 웹 메모 필드의 LLM 파싱.
- 실사용 요구가 없는 기능의 선제 구현.
- 안전·품질 게이트 완화. 수업 메모 필드 제거(본인 요청 기록 = 검증 자료).
