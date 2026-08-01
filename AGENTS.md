# MathCanvas 활동 설계 규칙

- blueprint를 만들거나 고칠 때 `/Users/yubyeongju/.codex/skills/mathcanvas-learning-design/SKILL.md`를 따른다.
- 상호작용 자체를 학습으로 간주하지 않는다. 학생이 수학적 판단을 내리고, 오개념 기반 대안과 갈등하고, 불변량으로 확인하고, 근거를 설명하고, 수정할 수 있어야 한다.
- 공식 성취기준과 `DECK6/korean-elementary-learning-map`의 고정 topic·선수학습·관찰 증거·평가 질문을 manifest에 연결한다.
- 정답이 처음부터 보이거나 모든 제공물을 명백한 칸에 옮기기만 하면 되는 활동은 출시하지 않는다.
- 신규·변경 blueprint는 인지적 요구 manifest와 runtime predicate가 필요하다.
- 학생 화면에는 `먼저 예상`, `세어 확인`, `근거와 수정`, `수 카드 모음`, `검증`, `불변량`, `후보` 같은 내부 설계 용어를 쓰지 않는다. 대상과 행동이 드러나는 교실 문장으로 바꾼다.
- 모든 학생 지시문은 `language.classroom-korean`과 `visual.text-fit` predicate로 보호한다. 둘 이상의 동종 이동 요소로 이루어진 선택 묶음은 역할 이름과 무관하게 `visual.labeled-pool-row` predicate를 요구하며, 전용 컨테이너 안의 단일 행 또는 여러 행이 각각 가운데·등간격인지와 위쪽 라벨 관계를 검사한다. 선택 묶음이 주 작업판 밖의 독립 컨테이너라면 두 영역은 같은 세로 flow group에 속해야 하고 preset `minGap`을 만족해야 한다.
- 세 단계 이상이면 번호를 붙이고 화면도 같은 위→아래 순서로 배치한다.
- 묶음 라벨은 가능하면 행 위에 두고 첫 요소와 왼쪽을 맞춘다. 묶음 전체는 같은 시각적 컨테이너나 작업 패널 안에서 가운데에 놓는다.
- `pnpm cognitive:verify`와 `pnpm check`가 통과하기 전에는 support state를 `released`로 바꾸지 않는다.
- 학생 화면을 바꾼 뒤에는 새 canary를 확인하기 전까지 support state를 `verified`로 유지한다.
- MathCanvas가 제공하지 않는 자동채점·단계 강제·오답 피드백을 있다고 주장하지 않는다.
