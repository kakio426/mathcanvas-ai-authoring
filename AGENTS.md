# MathCanvas 활동 설계 규칙

- blueprint를 만들거나 고칠 때 `/Users/yubyeongju/.codex/skills/mathcanvas-learning-design/SKILL.md`를 따른다.
- 상호작용 자체를 학습으로 간주하지 않는다. 학생이 수학적 판단을 내리고, 오개념 기반 대안과 갈등하고, 불변량으로 확인하고, 근거를 설명하고, 수정할 수 있어야 한다.
- 위 학습 순환은 기본 규칙이다. Eduitit HTML30 기본 연습은 승인된 예외 계약에 따라
  `문제 → 큰 native 조작 → 필요한 경우의 짧은 답`만 화면에 두며, 완성된 native
  수학 상태를 확인 근거로 사용한다. 이 예외에 별도 예상·처음 답·수정·까닭 쓰기 칸,
  상단 ①②③ 안내, 펜 입력을 다시 넣지 않는다.
- 공식 성취기준과 `DECK6/korean-elementary-learning-map`의 고정 topic·선수학습·관찰 증거·평가 질문을 manifest에 연결한다.
- 2022 초등 전 범위 신규 family 작업은 `scripts/curriculum/no-family-plan.json`,
  `reports/curriculum-execution/no-family-plan.json`,
  `CURRICULUM_97_LUNA_LOOP_PROMPT.md`, `SOL_REVIEW_PROMPT.md`,
  `scripts/curriculum/sol-review-board.json`을 권위로 사용한다. 한 실행은 standard 하나와
  operation 하나만 소유하고, 서로 다른 gradeBand·학생 결정·불변량·관찰 증거를
  한 concrete family로 합치지 않는다. Luna는 자체 QA를 수행하고, `TARGET_SET`·
  `FAMILY_TRACK`은 Sol max의 독립 `SOL_REVIEW` 승인 없이는 상태 승격·main push를
  하지 않는다. 해당 operation은 push하지 않은 candidate commit hash에 결속하며,
  `pnpm curriculum:sol-review:verify` 통과 후에만 push한다. planning drift는 Sol max
  재계획으로 중단하며 Fable CLI를 호출하지 않는다.
- 정답이 처음부터 보이거나 모든 제공물을 명백한 칸에 옮기기만 하면 되는 활동은 출시하지 않는다.
- 신규·변경 blueprint는 인지적 요구 manifest와 runtime predicate가 필요하다.
- 학생 화면에는 `먼저 예상`, `세어 확인`, `근거와 수정`, `수 카드 모음`, `검증`, `불변량`, `후보` 같은 내부 설계 용어를 쓰지 않는다. 대상과 행동이 드러나는 교실 문장으로 바꾼다.
- 모든 학생 지시문은 `language.classroom-korean`과 `visual.text-fit` predicate로 보호한다. 둘 이상의 동종 이동 요소로 이루어진 선택 묶음은 역할 이름과 무관하게 `visual.labeled-pool-row` predicate를 요구하며, 전용 컨테이너 안의 단일 행 또는 여러 행이 각각 가운데·등간격인지와 위쪽 라벨 관계를 검사한다. 선택 묶음이 주 작업판 밖의 독립 컨테이너라면 두 영역은 같은 세로 flow group에 속해야 하고 preset `minGap`을 만족해야 한다.
- 세 단계 이상이면 번호를 붙이고 화면도 같은 위→아래 순서로 배치한다.
- 묶음 라벨은 가능하면 행 위에 두고 첫 요소와 왼쪽을 맞춘다. 묶음 전체는 같은 시각적 컨테이너나 작업 패널 안에서 가운데에 놓는다.
- `pnpm cognitive:verify`와 `pnpm check`가 통과하기 전에는 support state를 `released`로 바꾸지 않는다.
- 학생 화면을 바꾼 뒤에는 새 canary를 확인하기 전까지 support state를 `verified`로 유지한다.
- 저장소의 `.githooks/pre-commit`과 `.githooks/pre-push`를 끄거나 우회하지 않는다.
  `pnpm hooks:install`로 `core.hooksPath=.githooks`를 설치한다. 학생 문구·blueprint·native
  조작·compiler·validator를 바꾸는 커밋은 정적 학습설계 하네스가, push는 전체
  `pnpm check`와 현재 97개 live attestation이 차단 경계가 된다.
- 97개 포트폴리오는 97/97 성취기준, 237/237 질문, 7개 화면 계열, 23개 엔진 계열,
  조작형 성취기준 수, 초등 문장, native 최소 크기를 하나의 content SHA로 묶는다.
  어느 한 계열만 남기거나 한 활동을 깊게 만드는 대신 나머지 범위를 줄이는 변경은
  release readiness에서 fail-closed한다.
- MathCanvas가 제공하지 않는 자동채점·단계 강제·오답 피드백을 있다고 주장하지 않는다.
- Eduitit HTML30의 MathCanvas 프로젝트 생성·수정과 수업꾸러미 링크 승격은
  canonical harness가 발급한 release attestation을 소비하는 단일 writer로만 수행한다.
  새 프로젝트는 `html30:v2:live:create`, 재열기 캡처는
  `html30:v2:live:capture` 경로만 사용하고, 저장 payload의
  `canvasOption.scale=3`(실제 MathCanvas 100%)을 필수로 검증한다.
  `scripts/contract-lab/create-eduitit-html30-projects.mjs`,
  `scripts/prompt-harness/sync-eduitit-html30-links.mjs`, 직접 `/api/project` 쓰기를 실행해
  하네스를 우회하지 않는다. `.codex/hooks.json`의 PreToolUse 차단을 끄거나 피해 가는
  명령을 만들지 않는다.
- 97개 시연 프로젝트의 생성·갱신은 `portfolio:live:sync`만 사용한다. 명령은
  `pnpm portfolio:live:sync -- --execute-live --attestation-sha <현재 content SHA>` 형식이며,
  97개 exact 재열기·화면 크기·영역 포함과 최소 1개 실제 조작 저장·재열기 증거가 없는
  live report는 `portfolio:live:verify`와 pre-push에서 거부한다.
- 수업꾸러미 링크는 Sol P0/P1/P2 0, 30/30 재열기, 현재 payload·layout·스크린샷
  SHA를 묶은 attestation을 소비하는 `html30:v2:links:sync`로만 반영한다.
