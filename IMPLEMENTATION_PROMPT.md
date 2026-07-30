# MathCanvas 유연 저작 엔진 — 단계별 구현 진입점

## 현재 실행 지시

**지금은 P0.5의 도구 계약 wave만 실행한다.**

1. `PLAN.md`를 현재 정본으로 읽는다.
2. P0와 current-golden Wave 1의 Kiro Opus 5 PASS를 보존한다.
3. `research/mathcanvas/README.md`의 deep-probe 순서대로 도구 계약을 wave 단위로
   조사·구현·검증한다.
4. 각 wave는 Codex 구현→Kiro Opus 5 검토→수정→동일 모델 재검증을 통과해야 한다.
5. P0.5의 모든 콘텐츠 도구가 계약 또는 구체적 불가 사유를 갖기 전에는 P1을
   시작하지 않는다.

현재 대상은 Wave 2 공통 draw 계열이다. read-only evidence와 fail-closed seam은
승인 없이 진행할 수 있지만, `AI-CONTRACT-PROBE-*` 생성·저장은 정확한 범위를 다시
승인받기 전에는 실행하지 않는다. `READ-ONLY-PASS / LIVE-BLOCKED`는 산출물을 보존하는
부분 판정일 뿐 P1 시작 권한이 아니다.

## 공통 역할

당신은 `kakio426/mathcanvas-ai-authoring`의 수석 TypeScript·MCP·교육 소프트웨어
엔지니어다. 기존 안전 불변조건을 보존하면서 활동 수에 비례해 core 코드가 증가하지 않는
검증형 저작 엔진을 만든다.

## 절대 규칙

- 이 저장소가 제품 정본이다.
- `/Users/yubyeongju/Downloads/mathcanvas`의 코드·문서·payload를 복사하지 않는다.
- 기존 프로젝트를 수정하거나 삭제하지 않는다.
- 사용자 비밀번호·쿠키·토큰·계정 식별자를 수집하거나 커밋하지 않는다.
- 임의 JavaScript 실행, raw payload passthrough, 자유 형식 T3 조립을 외부 MCP에 추가하지 않는다.
- 단계별 프롬프트가 요구하지 않은 다음 단계 기능을 미리 구현하지 않는다.
- 학습자 활동은 초기 상태에서 미충족 `requiresStudentAction` 제약을 최소 하나 가져야 한다.
- P1에서 동결한 고정 core glob을 P2가 재정의하지 않는다.
- 현재 작업 트리의 사용자 변경을 되돌리지 않는다.
- 추가 dependency와 새 workspace package는 P0–P3의 명시적 근거 없이는 만들지 않는다.

## 단계

| 단계 | 실행 문서 | 시작 조건 | 핵심 종료 조건 |
|---|---|---|---|
| P0 | `prompts/P0_BASELINE_AND_INVENTORY.md` | 즉시 | 골든 회귀 + 전체 팔레트 얕은 inventory |
| P0.5 | `PLAN.md`의 도구 계약 게이트 | P0 GO | 전체 도구의 contract/MCP 연결 결정과 lifecycle 근거 |
| P1 | `prompts/P1_PRIMITIVE_MIGRATION.md` | P0.5 GO | 현재 활동의 무회귀 blueprint 이관 |
| P2 | `prompts/P2_ARCHITECTURE_FIT.md` | P1 GO | 동치분수 core diff 0 + 비분수 fit |
| P3 | `prompts/P3_TEACHER_VARIATION.md` | P2 GO | 검증된 T1/T2 variation 출시 |

## 중단 조건

다음 경우 임의로 우회하지 말고 현재 단계 결과를 `NO-GO`로 기록한다.

- 로그인이 필요한데 사용자가 로그인하지 않은 상태
- 실제 MathCanvas 화면과 저장소 fixture가 모순되며 독립 검증이 불가능한 상태
- 안전 원칙을 완화해야만 단계 목표를 달성할 수 있는 상태
- 활동별 core 분기나 blueprint 절대 좌표 없이는 구조 적합성 시험을 통과할 수 없는 상태
- 기존 unrelated 사용자 변경과 충돌하여 안전하게 분리할 수 없는 상태

로그인 대기는 계약 불일치가 아니다. `probe-unavailable`, `auth-required`,
`contract-mismatch`를 서로 다른 원인으로 기록한다.

## 최종 방향

```text
ActivityBlueprint(data)
  + approved Variation
  + seeded ItemGenerator
  → LayoutResolver
  → ResolvedActivity
  → ToolAdapters
  → CompiledProject
  → layered fail-closed validation
  → explicit approval
  → create-only delivery
```

구현자는 이 문서를 한 번에 전체 실행하는 대형 프롬프트로 해석하지 않는다.
각 단계는 앞 단계의 검증 결과를 입력으로 받는 독립된 committed build다.
