# Claude Opus 5 수정 계획 재심사

## 심사 정보

- 심사일: 2026-07-29
- 실행 도구: Kiro CLI
- 모델: `claude-opus-5`
- effort: `high`
- 권한: 읽기 전용
- 대상: 현재 `PLAN.md`, `IMPLEMENTATION_PROMPT.md`, P0–P3 프롬프트,
  이전 Opus 5 심사 문서와 실제 저장소 결합 지점

## 최초 재심사 판정

**CONDITIONAL GO — 8.0/10**

Opus 5는 P0가 제품 리팩터를 몰래 시작하지 않고 즉시 실행 가능하다고 판정했다.
F1–F7의 핵심 대안도 대부분 문서의 강제 조건과 단계 gate에 반영됐다고 확인했다.

다만 P1 진입 전에 해결할 네 가지 문서 blocker와 여섯 가지 개선점을 제시했다.

## Blocker와 반영 결과

| 재심사 발견 | 반영 결과 |
|---|---|
| P1의 “payload 동등”이 좌표 하드코딩 제거와 충돌 | 의미·역할·조작·검증의 필수 동등성과 resolver 좌표/hash의 명시적 변경 허용을 분리했다. 좌표 변경은 공유 layout token, 시각 회귀, 골든 diff 승인, canary를 요구한다. |
| primitive 두 활동 사용 규칙이 비분수 활동에서 교착 가능 | P1 baseline foundation 규칙과 제한적 `provisional` 규칙을 분리했다. P2 안에서는 core를 고치지 않고 P1 재진입·baseline 재동결 후 다시 시작한다. |
| 학생이 수행할 초기 미충족 제약이 누락 | `requiresStudentAction`을 vocabulary, blueprint, acceptance, envelope, release gate 전체에 추가했다. |
| core diff 0의 측정 경계가 미정 | 고정 core glob을 `PLAN.md`에 선언하고 P1 종료 시 path/SHA-256 manifest로 동결하도록 했다. P2는 이를 재정의할 수 없다. |

## Non-blocking 개선 반영

- creator-owned probe 1차, public project 2차 fallback으로 runtime gate를 P2에서 교체한다.
- P2의 general predicate bug-fix 예외를 없애고 P1 재진입 절차로 통일했다.
- P2 실패 iteration 보고서, P1 전체 재검증, core baseline 재동결, P2 재시작 루프를 명시했다.
- P3 조합 상한을 blueprint당 256개, 전체 1,024개로 정하고 전수 검증만 허용했다.
- P0 live capture를 기존 `playwright-core`, 전용 profile, 제품과 같은 lock,
  사용자 직접 로그인, 읽기 전용 관찰로 고정했다.
- 인증 대기 시 `P0-OFFLINE-READY / LIVE-BLOCKED` 부분 판정을 허용하되 P1 진입은 금지했다.
- blueprint 선언 노드 64개, 중첩 8단계 제한과 반복 composite 승격 규칙을 추가했다.

## 최종 사용 판정

- **P0: 실행 가능**
- **P1–P3: 앞 단계 Go 조건과 수정된 stage gate를 통과한 경우에만 실행 가능**
- 정본: `PLAN.md`
- 즉시 실행 프롬프트: `prompts/P0_BASELINE_AND_INVENTORY.md`
