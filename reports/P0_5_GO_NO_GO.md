# P0.5 GO — 도구 계약과 MCP 연결 게이트

## 판정

**P0.5 GO**

이 판정은 비고정형 `ActivityBlueprint`로 현재 분수 활동을 이관하는 P1 진입만
허용한다. 46개 수학 module 전체를 제품에서 곧바로 생성할 수 있다는 뜻은 아니다.
실제 생성 범위는 lifecycle 근거가 있는 `released` variant만 허용하고 나머지는
adapter registry가 계속 fail-closed로 거부한다.

## 완료 범위

- 화면의 수학 module 46개, 공통 도구 10개, 편집 제어 18개를 중복 없이 분류했다.
- 수학 module 46개와 variant 304개를 constructor cluster, shape family, option,
  native variant ID가 있는 데이터 descriptor로 정규화했다.
- 모든 항목에 `tool-adapter`, `managed-browser-operation`,
  `internal-editor-action`, `excluded-by-policy` 중 하나의 연결 결정을 기록했다.
- 공개 MCP는 기존 추천→승인→새 프로젝트 생성 흐름을 유지하며 버튼별 API를
  추가하지 않았다.
- `captured → contracted → verified → released` 근거가 없으면 제품 adapter에서
  사용할 수 없다.
- 실제 release 범위는 분수 모형 `NO03FM` 12개와 숫자 카드
  `NO04NT-01`~`NO04NT-10`, 검증된 공통 native object로 제한된다.

## Wave 결과

| Wave | 결과 | 핵심 근거 |
|---|---|---|
| 1 | PASS | current-golden 생성·저장·재열기 |
| 2 | PASS | 공통 draw 계약과 승인 canary |
| 3 | PASS | 펜 정적 계약과 비어 있는 배열만 허용하는 fail-closed seam |
| 4A | PASS | 46 module / 304 variant / 79 cluster 정적 계약 |
| 4B | PASS | 숫자 카드 10개 생성·렌더·저장·재열기, ID·svgId 보존 |

Wave 4B의 연결 Chrome은 HTTP method 횟수를 계측하지 못했다. 이 한계를 숨기지 않고
`originalWriteCountMeasured: false`로 기록했으며, 빈 새 프로젝트에서 UI 생성 1회와
저장 1회만 수행했다. 기존 교사 프로젝트는 읽거나 수정하지 않았다.

## Go 조건별 판정

| 조건 | 판정 |
|---|---|
| 보이는 항목 전체의 contract matrix와 연결 결정 | PASS |
| 46개 module의 native descriptor 또는 구조화된 unknown | PASS |
| 미등록·미검증 도구 fail-closed | PASS |
| support state 순차 강제와 evidence pointer 해석 | PASS |
| 공개 MCP surface 불변 | PASS |
| 승인된 새 canary만 live write | PASS |
| 고정 seed 골든 무회귀 | PASS |
| 근거 파일 변조 검증 | PASS |

## 검증

```text
pnpm typecheck          PASS
pnpm test               PASS, 22 files / 124 tests
pnpm contract:verify    PASS
pnpm build              PASS
git diff --check        PASS
```

P1은 활동별 좌표·문항을 compiler에 하드코딩하지 않는다. 현재 분수 비교 활동을
`TeacherIntent → ActivityBlueprint → ItemGenerator(seed) → LayoutResolver →
ResolvedActivity → ToolAdapter` 경로로 먼저 이관하고 기존 golden payload를 그대로
유지해야 한다.
