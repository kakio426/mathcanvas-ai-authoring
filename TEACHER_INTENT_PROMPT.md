# 곱셈 TeacherIntent v1 — 구현 핸드오프

> 기록 상태(2026-08-11): 이 문서는 완료된 곱셈 v1의 원 사양이다. 현재 공통화·
> 나눗셈·분수 확장 상태는 `TEACHER_INTENT_PLAN.md`와
> `TEACHER_INTENT_CHECKLIST.md`의 R7~R10을 기준으로 한다. 새 Codex 핸드오프를
> 요구하지 않는다. 다음 실행 순서는 `ELEMENTARY_2022_FULL_COVERAGE_PLAN.md`를 따른다.

> 빌더 시작 안내: 먼저 `AGENTS.md`와 `TEACHER_INTENT_PLAN.md`를 끝까지 읽으세요.
> 그다음 `TEACHER_INTENT_CHECKLIST.md`를 R1부터 순서대로 진행하고 상태와 검증 결과를
> 직접 갱신하세요. 이 문서가 구현 사양이고 체크리스트가 진행 기록입니다. 저장소의
> 기존 `PROMPT.md`, `CHECKLIST.md`, Honest Preview 문서는 다른 범위이므로 수정하지 마세요.

## 역할과 목표

당신은 MathCanvas 교사용 저작도구의 시니어 TypeScript 구현 담당입니다. 이번 작업은
범용 자연어 AI를 만드는 일이 아니라, 곱셈 배열 활동 한 종에서 교사의 의미 있는 요청을
검증된 구조로 컴파일하는 **TeacherIntent v1 세로 단면**입니다.

완성 문장:

> 교사가 `한 묶음에 4개`, `6묶음`, `아이스크림`, `두 수의 뜻을 바꾸는 오개념`을
> 지정하면 실제 첫 문항과 오답 보기에 그 조건이 나타나고, 승인 전 화면에서 반영 여부를
> 확인할 수 있으며, 같은 seed와 같은 intent는 같은 결과와 hash를 만든다.

## 사용자와 제품 전제

- 현재 목표 사용자는 제작자 본인 한 명이다. 외부 교사 파일럿·배포 준비는 하지 않는다.
- 외부 AI(Codex/Claude)가 자연어를 구조화하므로 이 버전에서 자연어 파서는 만들지 않는다.
- 웹 UI도 자유 메모를 파싱하지 않고, 곱셈 활동을 골랐을 때 명시적 구조화 입력만 제공한다.
- 기존 Honest Preview, 승인 토큰, `activitySpecHash`, create-only, fail-closed 품질 게이트는
  그대로 유지한다.
- AI가 raw MathCanvas 좌표나 임의 payload를 만들게 하지 않는다.

## 골든 케이스

자연어 의도:

> 아이스크림이 한 묶음에 4개씩 있고 6묶음입니다. 4와 6의 뜻을 바꾸어 생각하는
> 학생을 위한 곱셈 활동을 만들어 주세요.

구조화 입력:

```ts
{
  kind: "multiplication-array-v1",
  itemsPerGroup: 4,
  groupCount: 6,
  contextObjectId: "ice-cream",
  misconceptionId: "groups-size-order"
}
```

기대 결과:

- 첫 문항에 `아이스크림`, `한 묶음에 4개씩`, `6묶음`의 의미가 학생용 한국어로 보인다.
- 정답은 `4×6`, 순서 오개념 보기는 `6×4`다.
- 교사 반영 상태에는 네 의미 필드가 모두 `반영됨`으로 표시된다.
- 같은 고정 seed·같은 intent는 같은 approval view와 hash를 만든다.
- 같은 seed에서 `itemsPerGroup` 또는 `groupCount`만 바꾸면 실제 문항 값과 hash가 함께
  바뀐다. 서로 다른 무작위 seed만 비교해 인과를 주장하지 않는다.

## 현재 코드 구조와 확인된 연결점

- MCP 도구: `apps/mcp-server/src/server.ts`의 `mathcanvas_recommend_activity`.
- 런타임: `packages/authoring-runtime/src/service.ts`의
  `MathCanvasAuthoringService.recommend()`.
- 요청·추천 계약: `packages/contracts/src/schemas.ts`의 `generationRequestSchema`,
  `recommendationSchema`.
- 플래너: `packages/planner/src/index.ts`의 곱셈 배열 후보 선택과 recommendation 생성.
- 생성기: `packages/templates/src/item-generators/multiplication-array-meaning.ts`.
- 템플릿 준비·교사용 정답: `packages/templates/src/registry.ts`.
- 곱셈 blueprint: `packages/templates/src/blueprints/multiplication-array-meaning.ts`.
- Honest Preview 프로젝션: `packages/authoring-runtime/src/service.ts`와
  `problem-previews.test.ts`.
- 웹 공유 계약·서버·화면: `apps/teacher-ui/src/shared/contract.ts`,
  `server/main.ts`, `server/input-reflections.ts`, `web/App.tsx`.

런타임은 이미 정답지를 만들고, Honest Preview는 21종 모두 문항 수만큼 미리보기를
보장한다. 다만 곱셈 배열은 현재 정답 해설 fallback이므로 이번 작업에서 정확한 문항
프로젝션을 등록해야 한다.

## 범위

1. 곱셈 배열 전용 TeacherIntent 계약과 안전한 capability 검증.
2. MCP 추천 도구와 웹 세부 설정의 구조화 입력.
3. 플래너→추천→템플릿 생성기로 검증된 intent 전달.
4. 첫 문항에 요청값 적용, 순서 오개념 보기를 강제 포함.
5. 곱셈 배열의 정확한 per-item 학생 문항 미리보기.
6. Honest Preview 반영 상태에 intent 필드별 결과 표시.
7. 고정 seed 골든 테스트와 한 명이 읽을 수 있는 자동 QA 보고서.

## 비목표

- 범용 TeacherIntent 스키마, 자연어/LLM 파서, 자유 메모 자동 반영.
- 다른 활동 유형으로 intent 확장.
- 문항 단위 대화 수정·재생성.
- 새 이미지 자산 생성. `ice-cream`은 검증 가능한 학생용 텍스트 맥락이다.
- 문제 수·난이도 지원 범위 확대.
- released 상태나 인지·텍스트·공간 감사 기준 완화.
- 외부 MathCanvas 프로젝트에 실제 쓰기, 배포·로그인 자동화.

## 의미 계약과 capability

### 공개 타입

`teacherIntent`는 선택적이지만, 제공할 때는 아래 네 필드가 모두 필요한 판별 가능한
객체다. 역할 없는 `specificNumbers: [4, 6]` 형태는 금지한다.

```ts
type MultiplicationArrayTeacherIntent = {
  kind: "multiplication-array-v1";
  itemsPerGroup: number;
  groupCount: number;
  contextObjectId: "ice-cream" | "pencil" | "baduk-stone" | "sticker";
  misconceptionId: "groups-size-order";
};
```

### v1 허용 범위

- `itemsPerGroup`: 정수 2~6.
- `groupCount`: 정수 2~7.
- `itemsPerGroup !== groupCount` — 역순 보기가 실제로 구별되어야 한다.
- 곱이 42 이하.
- `contextObjectId`: 위 등록 목록만.
- `misconceptionId`: `groups-size-order`만.
- intent는 곱셈 배열 manipulation/template에서만 허용한다.

계약의 숫자 범위와 맥락 ID는 한 곳에서 export해 MCP·런타임·웹이 공유해야 한다.
레이어별로 같은 enum/range를 복사하지 않는다.

### 미지원 입력 처리

- 필수 의미 조건(두 수의 역할, 오개념)을 조용히 버리거나 임의 보정하지 않는다.
- partial 객체, 범위 밖 수, 같은 두 수, 미등록 맥락, 다른 활동과의 조합은 추천을
  생성하지 않고 명시적으로 실패한다.
- 가능한 한 런타임 오류 코드를 `teacher-intent-confirmation-required`로 통일하고,
  메시지는 교사에게 다음 행동을 알려 준다. 예:
  `이 조건은 현재 곱셈 배열 활동에서 정확히 지킬 수 없습니다. 조건을 빼고 만들거나 취소해 주세요.`
- MCP 스키마 자체에서 막히는 malformed 입력도 성공 응답이나 silent fallback이 되면 안 된다.

## 구현 요구사항

### R1. 공유 계약과 검증기 — `core`

- contracts에 `MultiplicationArrayTeacherIntent` 스키마·타입·상수(범위와 등록 ID)를 추가.
- `generationRequestSchema`와 `recommendationSchema`가 선택적 `teacherIntent`를 엄격히
  검증하고 echo하도록 확장.
- 숫자 역할, 범위, 서로 다름, 곱 상한, 맥락/오개념 allowlist를 단위 테스트로 고정.
- 기존 intent 없는 요청의 직렬화·추천 결과는 호환성을 유지한다.

완료 정의: 유효 골든 객체는 통과하고, 경계값과 잘못된 조합은 모두 실패하며,
기존 contract/planner 테스트가 깨지지 않는다.

### R2. 플래너와 템플릿 컴파일 — `core`

- 플래너는 검증된 intent를 곱셈 배열 recommendation에만 전달한다.
- intent가 있는데 다른 manipulation이 강제되면 confirmation-required로 차단한다.
- 곱셈 item generator는 intent가 있으면 **첫 문항**에 정확히 적용한다. 두 번째 이후
  문항은 기존 seed 기반 구성을 유지한다. 이 규칙을 코드와 UI 설명에서 숨기지 않는다.
- 맥락 ID→교실 한국어 매핑은 템플릿 계층의 한 등록표에서 관리한다.
- 골든 문장은 `아이스크림이 한 묶음에 4개씩 있습니다. 6묶음을 나타낸 식은 무엇인가요?`
  수준으로 짧고 자연스럽게 쓴다.
- `groups-size-order`이면 정답 `itemsPerGroup × groupCount`와 역순 오답
  `groupCount × itemsPerGroup`이 후보에 항상 한 번씩 존재해야 한다.
- 정답 계산, array 표현, teacher answer key, 승인 projection/hash가 모두 같은 resolved
  값을 사용해야 한다. 화면용 문자열만 사후 교체하는 방식은 금지한다.

학습 불변:

- 학생의 핵심 결정은 상황에 맞는 `묶음마다 수 × 묶음 수` 식 선택이다.
- 역순 보기는 우연한 distractor가 아니라 명시된 오개념 증거다.
- 배열 표현은 수식의 의미를 확인하는 불변량이며, 선택→설명→수정 가능성을 보존한다.

완료 정의: 골든 intent의 resolved 첫 item, 후보, 정답지, approval view가 같은 4·6·맥락을
가리키고 기존 intent 없는 seeded fixture는 회귀하지 않는다.

### R3. 정확한 문항 미리보기와 반영 상태 — `core`

- answerKey처럼 blueprint/template별 exact problem projection을 등록할 수 있는 작은 seam을
  추가하고 곱셈 배열 projector를 구현한다. 런타임이 blueprint 내부를 이름 추측으로
  파싱하는 범용 휴리스틱을 늘리지 않는다.
- 곱셈 배열 미리보기는 실제 item의 `questionText`를 문항별로 반환하고
  `statementSource: "learner-instructions"`로 표시한다.
- 21종 전수 길이 보장은 유지하고 fallback 명시 테스트에서 곱셈 배열을 제거한다.
- 웹 반영 상태 표에 `묶음마다 수`, `묶음 수`, `사물 맥락`, `오개념`을 각각 표시한다.
  recommendation echo와 실제 생성값이 모두 일치할 때만 `applied`다. 없거나 불일치하면
  `needs-review`; intent를 안 보낸 기존 흐름에서는 해당 행을 만들지 않는다.
- 첫 문항만 맞춤이라는 사실을 미리보기의 한 줄 설명에 표시한다.

완료 정의: 골든 케이스 승인 화면만 보고 실제 첫 문항·정답·역순 보기를 확인할 수 있고,
곱셈 배열은 더 이상 answer-explanation fallback으로 분류되지 않는다.

### R4. MCP와 웹 구조화 입력 — `core`

- MCP `mathcanvas_recommend_activity`에 선택적 `teacherIntent` 객체를 추가하고 contracts의
  허용 값과 설명을 그대로 반영한다.
- 도구 설명에 숫자의 의미와 "첫 문항 맞춤"을 명시한다.
- MCP 응답 recommendation/activity summary에서 적용된 intent를 확인할 수 있게 한다.
- MCP create 도구와 승인 토큰 흐름은 변경하지 않는다.
- 웹은 곱셈 배열 활동을 선택했을 때만 선택적 세부 설정을 노출한다. 자연어 파싱 대신
  두 숫자 입력, 맥락 select, 고정 오개념 select를 사용한다.
- 네 필드를 일부만 채우면 추천 전 클라이언트/서버에서 명확히 안내하고 차단한다.
- 기존 수업 메모는 계속 `참고용(미반영)`이며 intent 입력을 대신하지 않는다.

완료 정의: MCP와 웹 모두 골든 구조를 보낼 수 있고, 기존 필드만 사용한 흐름도 정상이다.

### R5. 결정적 골든 QA — `core`

고정 seed를 순수 준비 경로에 주입한 테스트를 작성한다.

1. 같은 seed + 같은 intent → 동일 item, approval view, `activitySpecHash`.
2. 같은 seed + `itemsPerGroup`만 변경 → 첫 문항과 hash 모두 변경.
3. 같은 seed + `groupCount`만 변경 → 첫 문항과 hash 모두 변경.
4. 역순 오답 존재, 정답 정확, total 정확.
5. 범위 밖/같은 수/미등록 맥락/다른 manipulation 조합은 silent fallback 없이 실패.
6. intent 없는 기존 추천·생성 테스트 통과.

골든 케이스 테스트는 무작위 UUID를 비교하지 말고, 같은 seed의 resolved 결과를 직접
비교한다.

### R6. 1인용 자동 QA 보고서 — `scaffold`

- 저장소 관례에 맞는 한 명령으로 골든 fixture를 실행해 짧은 Markdown 보고서를 만든다.
- 보고서에는 요청값, 실제 첫 문항, 정답, 역순 오답 존재, 네 필드 반영 상태,
  deterministic/hash 검사, 미지원 입력 검사 결과를 한 표로 담는다.
- 보고서는 실제 외부 MathCanvas 쓰기를 수행하지 않는다.
- 생성 파일 경로와 재생성 명령을 README 또는 체크리스트에 기록한다.
- 스크립트가 실패 검사를 통과시키기 위해 예외를 삼키거나 정적 PASS 문구만 쓰면 안 된다.

완료 정의: 명령 종료 코드가 검증 결과를 반영하고, 제작자가 보고서 한 장만 읽고 아래
세 질문을 판단할 수 있다.

1. 요청한 수와 맥락이 실제 문제에 들어갔는가?
2. 정답과 오답 보기가 수학적으로 맞는가?
3. 화면에서 확인할 정보가 충분한가?

## 콘텐츠·UI 기준

- 한국어는 짧고 학생 행동을 분명히 한다. 개발 용어(`intent`, `projection`, `hash`)를
  교사·학생 화면에 노출하지 않는다.
- `×`를 학생 표시용으로 사용하고 코드 내부 canonical answer 관례가 다르면 기존 방식을
  따른다.
- 반영 상태는 색뿐 아니라 `반영됨`/`확인 필요` 텍스트로 구분한다.
- 숫자·레이블이 기존 blueprint의 공간/텍스트 적합성 범위를 벗어나지 않게 한다.
- 새 맥락이 핵심 결정을 장식으로 흐리지 않게 한다. 아이스크림 그림 자산은 만들지 않는다.

## 안전·개인정보·권한

- 구조화 intent에는 학생 이름·개인정보를 넣지 않는다.
- 기존 수업 메모 로그의 로컬·gitignored 성격을 유지한다.
- 실제 외부 MathCanvas 생성은 이 핸드오프의 자동 QA에 포함하지 않는다.
- 승인 토큰이 resolved approval view/hash에 결속되는 의미를 바꾸지 않는다.

## 검증 명령과 증거

최소 검증:

```bash
pnpm typecheck
pnpm test
pnpm check
```

추가로 변경한 패키지의 집중 테스트, MCP in-memory 도구 호출, teacher-ui 로컬 HTTP
골든 요청을 실행한다. learner-facing blueprint/문구가 바뀌므로 `AGENTS.md`에 지정된
인지 계약·교실 한국어·text-fit·공간 감사와 fresh canary 요구를 따른다. 실제 외부
렌더를 못 하면 자동 게이트 통과와 "fresh canary 미실행"을 분리해 보고하고 released
검증 완료라고 과장하지 않는다.

## 커밋 원칙

- 기존 커밋 `4fb9c45`, `e25b3c0`, `8b33b16`, `64b1d64`를 수정·squash하지 않는다.
- 관련 없는 사용자 변경을 되돌리지 않는다.
- 가능하면 계약/컴파일, UI/미리보기, QA 문서를 의미 단위 커밋으로 나눈다.
- 체크리스트와 보고서는 실제 상태만 기록한다.

## 최종 인수 기준

- 골든 케이스의 네 요청값이 resolved 첫 문항·정답·역순 오답·미리보기·반영 표에 일치.
- 같은 seed의 인과 테스트와 hash 결속 통과.
- 미지원 필수 조건은 명시적으로 차단, silent fallback 0건.
- 곱셈 배열 exact preview 등록, 21종 전체 preview 길이 무파손.
- MCP·웹 기존 흐름 호환, 승인/create-only 안전장치 무파손.
- `pnpm check` 녹색과 골든 QA 보고서 생성.
- 남은 사람 확인은 제작자의 화면 1회와 (원할 때만) 외부 실생성 1회로 명확히 분리.
