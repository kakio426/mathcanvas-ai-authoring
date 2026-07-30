# P2 GO — Opus 5 재검증 PASS

## 후보 판정

**기계 검증 PASS / Kiro Opus 5 최종 `P2_VERDICT PASS`, `P3_GO GO`**

P1의 동결 core를 수정하지 않고 다음 두 활동을 추가했다.

1. `[6수01-06]` 동치분수: 두 분수 띠를 같은 전체·출발선에서 맞춘다.
2. `[2수01-04]` 10 가르기·모으기: 두 수 카드를 목표 칸에 놓아 10을 만든다.

둘 다 seed 재현, 수학적 참값, 시각 객체와 의미 값 일치, 초기 미충족 학생 조작,
native payload 안전 검증을 통과한다. 동치·범위·중복·표현 변화·시각 모델,
10의 합·중복 조합·수 카드 의미·native 필드·목표 geometry 변조를 같은 P2 검사
1개 안에서 거부한다. 전체 테스트 수는 늘리지 않았다.

## 지원 상태

- 동치분수 blueprint: `verified`, P3 전 외부 추천 미노출
- 10 만들기 blueprint: `verified`, P3 전 외부 추천 미노출
- planner는 두 의도를 서로 구분하지만 `verified`이면 draft를 만들지 않는다.
- template registry도 `released`가 아니면 직접 준비 호출을 차단한다.
- `NO03FM`: 기존 released lifecycle 사용
- `NO04NT-01`~`NO04NT-10`: Wave 4B 생성·렌더·저장·재열기 released 근거 사용
- P2 live write: 0회
- 숫자 대응 재확인은 기존 creator-owned probe UI를 읽기만 했고 쓰기는 0회다.

## 하드코딩 방지 결과

- blueprint 절대 좌표 0
- raw payload escape 0
- frozen core 활동 분기 0
- frozen core diff 0
- active internal schema 1 (`ResolvedActivity`)
- template definition의 id/version/standard는 blueprint에서 파생
- 범용 approval view는 blueprint별 projector 없이 모든 resolved 활동에 적용
- 교사용 정답은 registry hook으로 활동별 데이터만 분리

## runtime 계약과 숫자 대응

- 생성 payload에서 `NO03FM`, `NO04NT`, `input-text`, `math-latex`, `drawElem`을 추출해
  필요한 모듈만 검사한다.
- creator-owned `AI-CONTRACT-PROBE-*` 프로젝트를 우선 사용한다.
- 공개 분수 fixture는 `NO03FM` 계열 fallback으로만 사용한다.
- 인증 필요, probe 부재, 실제 계약 불일치를 별도 코드로 반환한다.
- `research/mathcanvas/wave4-number-card-digit-mapping.ui.json`은 실제 MathCanvas
  수 카드 메뉴에서 보이는 0~9와 SVG DOM id를 행·열별로 대조해 고정한다.

## 검증

```text
pnpm typecheck             PASS
pnpm test                  PASS, 23 files / 132 tests
pnpm build                 PASS
pnpm golden:verify         PASS, 기존 3 hashes 동일
pnpm contract:verify       PASS, 46 tools / 304 variants
pnpm architecture:verify   PASS, 17 files / P1 hash 동일
pnpm-lock.yaml             unchanged
```

P3 진입이 승인되었다.

## Opus 5 두 번째 conditional 보완

두 번째 검토의 P3 차단 4건을 기존 테스트 수 안에서 수정했다.

- `통분하여 분모가 다른 분수의 크기를 비교`는 released 분수 비교로 우선 라우팅
- 숫자 UI mapping JSON을 Wave 4 verifier, contract manifest evidence, 기존 contract-lab
  검사와 연결하여 코드·증거가 갈라지면 실패
- 동치분수 3문제 이상이면 factor 3, 확대 방향, 축약 방향을 매 seed에 결정적으로 포함
- NO04NT probe 부재 시 public 분수 fixture를 사용하지 않고
  `contract-probe-unavailable`을 반환하는 분기와 auth 500 분기를 기존 검사 안에서 확인
- 일시적인 `contract-probe-unavailable`은 같은 승인안으로 재시도 가능

기존 분수 전용 projector는 P0의 3개 legacy hash를 보존하는 골든 경계로만 남는다.
현재 서비스 승인 view의 재현성과 3활동 정답 경로는 단일 P2 구조 검사에서 별도로 고정한다.

최종 재검증 값:

```text
P2_VERDICT PASS
CORE_DIFF 0
GOLDEN PASS
ACTIVITY_COUNT 3
ADAPTER_DELTA 0
TEST_COUNT 132
BLOCKERS NONE
P3_GO GO
```
