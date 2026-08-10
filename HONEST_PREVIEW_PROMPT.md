# 정직한 미리보기 (Honest Preview) — 구현 핸드오프

> 빌더 시작 안내: 먼저 `AGENTS.md`를 읽고 저장소 규칙을 따르세요. 그다음
> `HONEST_PREVIEW_CHECKLIST.md`를 순서대로(R1→R7) 진행하며 각 항목의 상태 칸을
> 직접 갱신하세요. 이 문서가 요구사항의 원본이고, 체크리스트가 진행 기록입니다.
> 저장소 루트의 기존 `PROMPT.md`/`CHECKLIST.md`는 다른 작업의 산출물이므로 수정하지 마세요.

## 역할과 목표

당신은 MathCanvas 교사용 저작도구의 시니어 구현 담당입니다. 이번 작업의 목표는
**"교사가 입력한 것의 운명을 승인 전에 정직하게 보여주는 것"**입니다. 생성 능력을
늘리는 작업이 아닙니다. 이미 런타임이 만들고 있는 정보(실제 문항, 교사용 정답지,
미지원 사유)를 교사 화면까지 배관하고, 반영되지 않는 입력에는 반영되지 않는다고
말하게 만드는 작업입니다.

## 배경 (왜 이 작업인가)

검증된 사실: 교사용 웹 UI에서 `우리 반 상황` 500자 입력과 `학생이 어려워하는 지점`
선택은 prompt 문자열로 합쳐져 플래너에 전달되지만, 주요 경로에서 플래너는 이미 확정된
`manipulation`·성취기준으로 템플릿을 결정하므로 **이 자유 입력은 생성 결과에 영향을
주지 않습니다**. 같은 조건에서 구체적 요청("아이스크림 묶음으로 4와 6을 써 주세요")과
빈 요청의 recommendation·plan이 byte 단위로 동일했습니다. 입력창이 약속하는 것과
생성기가 수행하는 것의 격차가 현재 제품의 최대 신뢰 문제입니다.

동시에, 런타임 `MathCanvasAuthoringService.recommend()`는 이미
`teacherAnswerKey: TeacherAnswer[]`(문항 번호·정답·해설)와
`recommendation.caveats`/`unsupportedRequests`를 반환하는데, teacher-ui 서버의
`toPublicActivity()`가 이를 전부 버립니다. 즉 이번 작업 대부분은 **노출·계약 수준**입니다.

## 대상 사용자

초등 교사. 기술 배경 없음. 승인 버튼을 누르기 전에 "내일 수업에서 학생이 실제로 볼
문제가 무엇이고, 정답이 무엇이고, 내가 적은 것 중 무엇이 반영됐는지"를 알고 싶어 함.

## 플랫폼과 환경

- pnpm workspace 모노레포. Node 20+, TypeScript, React(teacher-ui web), vitest.
- 실행: 저장소 규칙(`AGENTS.md`, `README.md`) 준수. 검증 명령: `pnpm check`
  (build + typecheck + test), `pnpm test`.
- 주요 파일:
  - `apps/teacher-ui/src/shared/contract.ts` — 웹↔서버 공유 계약 (`PublicActivity`,
    `PreviewResponse`)
  - `apps/teacher-ui/src/server/main.ts` — `toPublicActivity()`(145행 부근),
    `POST /api/recommendations`(330행 부근), 미리보기 `POST /api/recommendations/:cardId`
    (423행 부근), 생성 `POST /api/creations`(437행 부근)
  - `apps/teacher-ui/src/server/session.ts` — 세션 카드 저장(`addCard`)
  - `apps/teacher-ui/src/web/App.tsx` — `우리 반 상황` textarea(612행 부근),
    미리보기 화면(649–705행 부근)
  - `packages/authoring-runtime/src/service.ts` — `recommend()`(472행 부근),
    `TeacherAnswer`, `RecommendationSummary`, `projectLearnerFacingInstructions()`(151행 부근)
  - `packages/templates/src/registry.ts` — `buildRegisteredTeacherAnswerKey()`(1262행 부근)
  - `packages/contracts/src/vocabulary/resolved.ts` — `ResolvedActivity`
    (`items[].order`, `emissions[].itemId/role/instructionalIntent`)

## 이번 버전의 범위

1. `pnpm check`를 녹색으로 (typecheck 5개 오류, README released 수치 17→21).
2. `우리 반 상황` 입력의 정직화: `수업 메모`로 개명 + "아직 문항 내용에는 반영되지
   않습니다" 명시. **필드는 유지**(제거·숨김 금지 — 파일럿 텔레메트리 수집원임).
3. 미리보기(승인 화면)에 실제 문항 내용과 교사용 정답·해설 노출.
4. 미리보기에 입력별 반영 상태 표: `반영됨 / 참고용(미반영) / 확인 필요` 3상태.
5. 교사 입력 로컬 로그(JSONL) — 파일럿에서 TeacherIntent 축 우선순위를 고르기 위한 데이터.

## 비목표 (건드리지 말 것)

- 자연어 파싱·TeacherIntent 번역 계층 (다음 단계 작업).
- draft 수정·문항 단위 재생성 (다음 단계 작업).
- planner(`packages/planner`)·템플릿 생성 로직·blueprint 내용 변경.
- 승인 토큰·activitySpecHash·fail-closed·create-only 등 안전 장치의 의미 변경.
  (참고: `activitySpecHash`는 `projectRegisteredApprovalView(resolved)`에서 계산되며
  이번 작업은 `resolved`를 바꾸지 않으므로 hash는 자연히 불변이어야 함. 변하면 버그.)
- MCP 도구 표면 변경. 난이도 UI 추가. 30개 시리즈 릴리스 작업.
- MathCanvas 실제 렌더 화면 캡처 미리보기 (이번 범위는 문항 텍스트·정답 수준).

## 핵심 사용자 흐름 (완성 후)

1. 교사가 단원→성취기준→활동→학생 어려움을 고르고, 선택적으로 `수업 메모`를 적는다.
   메모 입력란에는 "아직 문항 내용에는 반영되지 않습니다"가 보인다.
2. 추천을 받고 미리보기를 연다. 기존 정보(제목·흐름·안내) 아래에:
   - **실제 문항** 섹션: 문항 번호별로 학생이 보게 될 문제 내용.
   - **교사용 정답·해설** 섹션: 기본 접힘(`<details>`), 펼치면 문항별 정답+해설.
   - **내 입력이 어떻게 쓰였나요** 표: 입력 항목별 3상태 배지 + 한 줄 설명.
3. 교사는 표에서 수업 메모가 `참고용(미반영)`임을 보고, 실제 문항을 확인한 뒤 승인한다.
4. 생성 흐름은 기존과 동일 (승인 토큰, create-only).

## 기능 요구사항 (의존 순서, 깊이 태그 포함)

### R1. 릴리스 위생 — `core`

- `pnpm typecheck`의 기존 오류 5개를 **동작 변경 없이** 수정. 타입 수정으로 해결이
  안 되고 동작 변경이 필요해 보이면 그 항목은 건드리지 말고 체크리스트에 사유를 기록.
- `README.md`의 released 활동 수 17종 표기를 실제 21종으로 수정 (주변 서술과 모순이
  없는지 함께 확인).
- **완료 정의**: `pnpm check` 녹색. 기존 354개 테스트 전부 통과. 스냅샷·hash 관련
  테스트 무변경.

### R2. `수업 메모` 정직화 — `core`

- `apps/teacher-ui/src/web/App.tsx` 612–614행 부근:
  - 라벨 `우리 반 상황 더하기 <em>선택</em>` → `수업 메모 <em>선택</em>`.
  - 안내문에 명시 추가: **"적어 주신 내용은 기록으로 남지만, 아직 문항 내용에는
    반영되지 않습니다."** (기존 존댓말·교사 친화 톤 유지)
  - placeholder는 메모 용도에 맞게 수정 (예: "예) 계산은 되는데 이유 설명을 어려워해요 —
    다음 버전에서 문항 반영에 활용할 예정입니다" 수준. 최종 카피는 톤만 맞으면 재량).
- 필드·전송·서버 검증(500자 제한 등)은 그대로 유지.
- `학생이 어려워하는 지점` 단계(596행 부근)의 카피는 유지하되, 반영 상태는 R5의 표에서
  정직하게 표시된다 (여기서 UI 카피를 과장하지 않도록만 점검).
- **완료 정의**: 화면에서 미반영 사실이 입력 시점에 보인다. 카피가 반영 상태 표(R5)와
  모순되지 않는다.

### R3. 공유 계약 확장 — `core`

`apps/teacher-ui/src/shared/contract.ts`에 추가:

```ts
export interface ProblemPreview {
  problemNumber: number;
  /** 학생에게 보이는 문항 내용. 도출 불가 시 정답 해설 기반 요약으로 대체 */
  statements: string[];
  statementSource: "learner-instructions" | "answer-explanation";
}

export interface TeacherAnswerPreview {
  problemNumber: number;
  answer: string;
  explanation: string;
}

export type InputReflectionStatus = "applied" | "reference-only" | "needs-review";

export interface InputReflection {
  inputLabel: string;   // 예: "수업 메모", "문항 수"
  value: string;        // 교사가 고르거나 적은 값 (메모는 앞 80자 요약)
  status: InputReflectionStatus;
  note: string;         // 한 줄 설명, 존댓말
}
```

- `PublicActivity`에 `problemPreviews: ProblemPreview[]`,
  `teacherAnswerKey: TeacherAnswerPreview[]`, `inputReflections: InputReflection[]` 추가.
- `POST /api/recommendations`의 201 카드 요약 응답은 지금처럼 부분 필드만 반환하므로
  **정답지·문항은 카드 목록 응답에 포함하지 않는다** (미리보기 응답에서만 노출).
- **완료 정의**: 서버·웹 양쪽이 같은 타입을 쓰고 typecheck 녹색. status enum은 향후
  `blocked` 추가가 쉬운 구조(단순 string union이면 충분).

### R4. 런타임에 문항 미리보기 프로젝션 추가 — `core`

`packages/authoring-runtime/src/service.ts`:

- `recommend()` 반환의 `activitySummary`에 `problemPreviews`를 추가하거나 최상위
  필드로 추가 (일관성 있게 하나 선택).
- 구현: `resolved`에 접근 가능한 이 계층에서
  `projectProblemPreviews(resolved, teacherAnswerKey)` 순수 함수를 만들 것.
  - 1차 시도: `projectLearnerFacingInstructions()`(151행 부근)와 같은 방식으로
    item-scoped instruction emission(role `instruction-predict|verify|explain`,
    `emission.itemId` 보유)을 `resolved.items[].order`와 조인해 문항별 statements 구성.
    emission에서 어떤 필드가 실제 표시 텍스트인지는 기존
    `projectLearnerFacingInstructions` 구현을 읽고 동일한 소스를 쓸 것 (추측 금지).
  - fallback: 어떤 blueprint에서 item-scoped 텍스트를 도출할 수 없으면 해당 문항은
    `teacherAnswerKey`의 `explanation`을 statement로 쓰고
    `statementSource: "answer-explanation"`으로 표시. **어떤 경우에도 문항 수만큼의
    엔트리가 반드시 존재해야 한다** (빈 미리보기 금지).
- **완료 정의**: released 21종 전 템플릿에 대해 `problemPreviews.length ===
  teacherAnswerKey.length === problemCount`를 확인하는 vitest 테스트 존재.
  fallback을 쓰는 템플릿이 있으면 테스트에서 명시적으로 드러나야 함(스킵·묵살 금지).
  기존 recommend 소비자(MCP 등) 무파손.

### R5. 서버 배관 + 반영 상태 계산 — `core`

`apps/teacher-ui/src/server/main.ts`:

- `toPublicActivity()`에서 R4의 `problemPreviews`와 `result.teacherAnswerKey`를
  `PublicActivity`로 전달. 세션 카드에는 지금처럼 `activity` 전체가 저장되므로
  미리보기 엔드포인트는 자동으로 새 필드를 반환하게 된다 — 이를 확인.
- `buildInputReflections()` 순수 함수 신설 (테스트 가능하게 분리). 입력:
  교사가 보낸 값들 + `result.recommendation`. 출력 규칙:
  - 학년·단원·성취기준·활동 유형·문항 수: 요청값과 recommendation echo
    (`recommendedGrade`, `standardCode`, `problemCount`)가 일치하면 `applied`,
    불일치하면 `needs-review`(불일치 내용을 note에).
  - `학생이 어려워하는 지점` 선택: `reference-only`, note 예: "활동 추천 카드에는
    표시되지만, 문항의 수·보기 조건으로는 아직 전달되지 않습니다."
  - `수업 메모`(있을 때만): `reference-only`, note 예: "기록으로 남겨 두었습니다.
    아직 문항 내용에는 반영되지 않습니다."
  - `result.recommendation.caveats`·`unsupportedRequests`의 각 항목:
    `needs-review` 엔트리로 추가 (원문을 note에).
- **완료 정의**: `buildInputReflections` 단위 테스트 — 최소 (a) 전부 일치 케이스,
  (b) 메모 있음 케이스, (c) caveat 존재 케이스, (d) echo 불일치 케이스. 존댓말 카피.

### R6. 미리보기 UI — `core`

`apps/teacher-ui/src/web/App.tsx` 미리보기 화면(649–705행 부근)에 기존
`preview-section` 패턴을 따라 섹션 추가 (기존 01~03 다음 번호로):

- **실제 문항**: 문항 번호별 statements 목록. `statementSource === "answer-explanation"`
  이면 "문항 화면 문구는 생성 후 활동에서 확인할 수 있어요" 류의 보조 문구 표시.
- **교사용 정답·해설**: `<details>` 기본 접힘. summary는 "교사용 정답 보기" 수준.
  문항 번호·정답·해설 표시.
- **내 입력이 어떻게 쓰였나요**: `inputReflections` 표. 3상태를 색+텍스트 배지로
  (색만으로 구분 금지 — 접근성). `applied`=반영됨, `reference-only`=참고용(미반영),
  `needs-review`=확인 필요. `needs-review`가 하나라도 있으면 표를 접지 않고 펼쳐서 표시.
- 스타일은 `apps/teacher-ui/src/web/styles.css`의 기존 클래스 관례를 따라 추가.
  aria 라벨·heading 구조는 기존 섹션과 동일 수준.
- **완료 정의**: 미리보기만 보고 전 문항+정답 확인이 가능하다. 반영 상태 표가 항상
  렌더된다(메모 없으면 메모 행만 생략). 기존 승인 다이얼로그·생성 흐름 무변경.

### R7. 교사 입력 로컬 로그 — `scaffold` (실제 파일 기록은 진짜로, 분석 도구는 없음)

- `POST /api/recommendations`가 유효 요청을 처리할 때마다 저장소 로컬 JSONL 파일에
  한 줄 append: `{ at, unitId, standardCode, activityId, learningNeedId,
  problemCount, contextNote, supported }`.
- 위치는 저장소 안 데이터 디렉터리(기존 관례가 있으면 따르고, 없으면
  `reports/teacher-input-log.jsonl`). **`.gitignore`에 추가** — 교실 상황이 담기므로
  커밋 금지.
- 로그 실패가 추천 흐름을 깨면 안 됨 (try/catch 후 무시, 단 조용한 삼킴이더라도
  주석으로 의도 명시).
- 분석 스크립트·대시보드는 만들지 않는다.
- **완료 정의**: 추천 1회당 1줄 기록되는 테스트 또는 수동 확인 절차 기록.
  gitignore 반영 확인.

## 콘텐츠·카피 요구사항

- 모든 신규 사용자 카피는 한국어 존댓말, 기존 화면의 교사 친화 톤("~해 주세요",
  "~살펴보세요")과 일치시킬 것. 기술 용어(템플릿, constraint, hash) 노출 금지.
- 정직성 원칙: 반영 안 되는 것을 "곧 됩니다"라고 약속하지 말 것. "아직 반영되지
  않습니다"가 기준 문장.

## 기술 제약

- planner·templates의 생성 로직, `resolved` 구조, `activitySpecHash` 계산에 영향을
  주는 변경 금지. R4는 읽기 전용 프로젝션만 추가한다.
- 승인 흐름(POST /api/recommendations/:cardId → previewed → 승인 토큰 → POST
  /api/creations)의 순서·검증 로직 무변경.
- 세션 카드에 저장되는 데이터가 커지므로(`problemPreviews` 등) `MAX` 상한이나 메모리
  가정이 있는 코드가 있는지 `session.ts`를 확인하고, 있으면 준수.
- 새 외부 의존성 추가 금지.

## 프라이버시·안전 제약

- 정답지는 미리보기 응답에서만 노출 (교사 로컬 서버이므로 학생 노출 경로는 없지만,
  카드 목록 요약 응답에는 넣지 않는다).
- R7 로그는 로컬 전용, gitignore 필수, 원격 전송 없음.
- 학생 이름 수집을 유도하지 말 것 (메모 placeholder에 이름 예시 넣지 않기).

## 인수 기준 (전체)

1. `pnpm check` 녹색 (build + typecheck + test).
2. 곱셈 배열 활동으로 수동 시나리오: 추천 → 미리보기에서 **문항 수만큼의 실제 문항
   내용과 문항별 정답·해설**이 보이고, `수업 메모`를 적었다면 반영 상태 표에
   `참고용(미반영)`으로 표시된다.
3. 같은 시나리오에서 승인·생성이 기존과 동일하게 성공한다 (안전 장치 무변경 증명).
4. 입력 시점(작성 폼)과 미리보기(반영 상태 표) 양쪽에서 메모 미반영 사실이 보인다.
5. 신규 순수 함수(`projectProblemPreviews`, `buildInputReflections`)에 vitest 테스트가
   있고, released 21종 전수 커버 테스트(R4)가 통과한다.

## QA 경로

1. `pnpm check` 실행, 전부 녹색 확인.
2. teacher-ui 로컬 실행(저장소 문서의 실행 방법 준수) 후 수동 시나리오:
   3~4학년 곱셈 단원 → 성취기준 → 곱셈 배열 활동 → 어려움 선택 → 메모
   "아이스크림 묶음으로 4와 6을 써 주세요" 입력 → 추천 → 미리보기 검사
   (문항·정답·반영 표) → 승인까지. 결과를 체크리스트에 기록.
3. 메모 없이 같은 흐름 반복 — 반영 표에서 메모 행이 생략되는지 확인.
4. `reports/teacher-input-log.jsonl`(또는 선택한 경로)에 2줄 기록 확인, `git status`에
   로그 파일이 나타나지 않는지 확인.

## 열린 질문과 가정

- **가정 A**: item-scoped instruction emission으로 문항별 텍스트를 도출할 수 있는
  템플릿이 다수다. 아닌 템플릿은 R4 fallback으로 처리하며, 그 목록이 테스트에 드러난다.
  fallback 비율이 21종 중 절반을 넘으면 구현을 멈추지 말고 체크리스트에 기록만 남길 것
  (다음 단계 설계에 필요한 정보다).
- **가정 B**: typecheck 5개 오류는 타입 수준 수정으로 해결 가능하다. 아니면 해당 항목만
  보류하고 사유 기록 (R1 참고).
- **가정 C**: 카드 요약 응답(201)에 새 필드를 넣지 않아도 웹 흐름이 성립한다
  (미리보기 응답이 전체 `activity`를 반환하므로). 웹 코드가 카드 요약 단계에서 새 필드를
  기대하지 않게 구현할 것.
- **열린 질문**: `학생이 어려워하는 지점`의 상태 표기를 `reference-only`로 두는 카피가
  교사에게 충분히 이해되는지는 파일럿에서 확인한다. 이번에는 위 카피 초안대로 구현.
