# P2 architecture diff

## 기준

- P1 frozen core: 17 files
- manifest:
  `afeefc8c756541f89e9e9bec99a6d20849777037b32003822ebff907e3e5e800`
- P2에서 baseline glob과 파일을 바꾸지 않았다.

## 활동별 변화

| 항목 | P1 | 동치분수 후 | 10 만들기 후 |
|---|---:|---:|---:|
| frozen core files | 17 | 17 | 17 |
| frozen core hash | `afeefc8c…` | 동일 | 동일 |
| blueprints | 1 | 2 | 3 |
| item generators | 1 | 2 | 3 |
| native adapters | 5 | 5 | 5 |
| layout presets | 1 | 1 | 2 |
| registered predicate kinds | 7 | 9 | 12 |

동치분수는 기존 `NO03FM`, `place-in`, 같은 전체 geometry, P1 layout preset을
재사용했다. 10 만들기는 Wave 4B에서 이미 released된 `NO04NT-01`~`10`과
`common.text`, `common.rectangle`만 사용했다. 새 native adapter는 만들지 않았고,
기존 number-card validator handler를 lifecycle fixture에 맞춰 활성화했다.

## core literal 검사

architecture denylist에 P2의 blueprint ID, 제목, 성취기준, 역할명을 추가했다.
`pnpm architecture:verify`는 같은 17파일·같은 hash로 통과한다.

## 허용 축 변경

- `packages/templates/src/blueprints/**`: 활동 선언 2개
- `packages/templates/src/item-generators/**`: deterministic generator 2개
- `packages/validator/src/predicates/**`: 재사용 수학 규칙 5개
- `packages/validator/src/native/**`: 기존 number-card 계약 검증 활성화
- `packages/mathcanvas-compiler/src/layout-presets/**`: 카드 크기용 preset 1개
- curriculum/template registry: blueprint-derived identity와 verified 등록

compiler core, resolver core, validator layer dispatch에는 활동별 분기와 literal이 없다.

## Opus 5 conditional 보완

- 승인 view를 blueprint별 projector가 아닌 `ResolvedActivity` 기반 범용 view로 교체
- 교사용 정답만 활동 registry hook으로 분리
- 단일 support catalog를 planner와 template registry가 함께 읽고 `verified` 외부 생성을 차단
- runtime 검사를 생성 payload의 required module 범위로 제한
- creator-owned `AI-CONTRACT-PROBE-*`를 우선 검사하고 공개 분수 fixture는 fallback으로만 사용
- `auth-required`, `contract-probe-unavailable`, `contract-mismatch` 원인을 분리
- 실제 수 카드 UI에서 0~9 ↔ `NO04NT-01`~`10`을 대조한 증거를 adapter 계약에 연결

이 변경도 frozen core 17파일에는 영향을 주지 않았다.
