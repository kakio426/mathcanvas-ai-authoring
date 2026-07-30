# P0.5 Wave 3 — 펜 오프라인 계약

## 현재 판정

**OFFLINE PASS / LIVE APPROVAL REQUIRED**

Kiro CLI `claude-opus-5`가 계획을 `W3_PLAN_VERDICT: READY`로 확정한 뒤
Codex가 정적 계약, fail-closed 저장 경계, 실행 전용 canary를 구현했다.
같은 Opus 5의 사후 재검토는 `W3_IMPLEMENTATION_VERDICT: PASS`,
`OFFLINE_GO: YES`, `LIVE_CANARY_SAFETY: APPROVED`다. 이는 구현 안전 판정이며
사용자 계정에 쓰는 실행 권한은 아니다. live canary는 실행하지 않았다.

`common.pen`의 지원 상태는 계속 `captured`, 제품 계약은 `empty-array-only`다.
서버 lifecycle 증거 없이 factory, adapter, `NativeToolIntent`, public MCP를
추가하지 않았다.

## 특정 bundle에서 확인한 계약

| 항목 | 정적 근거 |
|---|---|
| payload 위치 | `canvasOption.penElements` |
| UI 생성 field | `id`, `d`, `stroke`, `strokeWidth`, `isColor` |
| 재열기 read field | `id`, `d`, `stroke`, `strokeWidth` |
| ID | `p` + `crypto.randomUUID()` |
| path | `M`으로 시작하고 pointer move마다 `L` 추가 |
| 퇴화 획 | 숫자 token 4개 미만, 모든 점 동일, 유한하지 않거나 길이 0이면 거부 |
| 렌더 | `#pen-board path` |
| 좌표 | `outermost` SVG user space |
| module/tag | 참여하지 않음 |
| lock | 펜/지우개 handler에서 참여하지 않음 |
| 지우개 | 내부 편집 동작으로 pen path 제거 |
| 공통 factory | `P6t`/`contentsJson` factory가 아닌 store path list |

bundle SHA-256은
`bf2c027b6a146b038f1c49b20fb06464c7154d8da42f95977d491c18ff366584`이며,
파생 정본은 `research/mathcanvas/pen-contract.static.json`이다. 원본 bundle
코드는 커밋하지 않는다.

## 아직 모르는 것

- 비어 있지 않은 authored `penElements`가 POST 뒤 보존되는가
- 서버가 field, ID, path를 정규화하거나 제거하는가
- `strokeWidth`의 실제 저장 JSON type은 무엇인가
- `isColor`가 생성·저장·재열기에서 보존되는가
- 실제 렌더에서 `pen-board`와 `outermost` viewBox가 같은가

이 항목들은 정적 분석으로 승격하지 않고 한 번의 승인된 canary에서만 관찰한다.

## 구현한 안전 경계

- 승인 플래그가 없으면 Playwright 실행 전에 종료한다.
- 골든 payload hash와 59개 `contentsJson`을 고정하고 authored 펜 2개만 overlay한다.
- UI가 실제 생성하는 `isColor:false`는 두 획에서 고정하고, 숫자와 문자열
  `strokeWidth`만 달리해 한 번에 한 변수의 서버 동작을 관찰한다.
- 초기 2개 렌더, UI 펜 1개 추가, authored 펜 정확히 1개 삭제, 최종 2개를 강제한다.
- `contentsJson`의 객체 집합과 내용은 바뀌지 않아야 한다.
- POST 1회와 canary PUT 1회만 허용하고 canary GET은 최대 3회다.
- 기존 교사 프로젝트 read/write, thumbnail, 외부 write를 차단한다.
- 생성·저장 checkpoint와 동일 run 전용 recovery state를 사용한다.
- 2xx 생성 응답에 유효한 project ID가 없으면 orphan marker를 남겨 수동 확인 전
  두 번째 POST를 차단한다.
- `d` 원문은 gitignored private artifact에만 두고 정본에는 요약과 hash만 남긴다.
- 제품 validator의 비어 있지 않은 `penElements` 거부는 그대로 유지한다.

## live 승인 경계

다음 문장과 같은 범위의 사용자 승인이 있어야 실행할 수 있다.

> 제품 생성 검증에서는 차단되는 비어 있지 않은 펜 payload를 계약 조사기가 직접
> 전송하여, 새 AI-CONTRACT-PROBE-W3-* 프로젝트 1건 생성(POST 1회)과 그 프로젝트
> 저장 1회(PUT 1회)를 승인한다.

Kiro Opus 5 구현 안전성은 PASS다. 실제 제목 prefix도 공통 canary prefix 계약에
맞춰 `AI-CONTRACT-PROBE-W3-*`를 사용한다.

```text
pnpm contract:probe:wave3:canary --approve-create-and-save
```

이 보고서 단계에서는 위 명령을 실행하지 않았다.

서버가 authored 펜을 POST에서 거절하거나 생성 뒤 보존하지 않는 경우에도 그 결과를
버리지 않는다. 저장 없이 create checkpoint와 비식별 요약을 기록하고
`authoredCreatePersistence:false`로 종료한다. 성공·부정 결과 모두 별도 Wave 3
validator가 정본 hash, pen ID/path hash와 write boundary를 재계산한다.

## 테스트 예산

새 dependency와 workspace package는 없다. 기존 테스트 하나에 정적 계약의
결정성·bundle hash·원문 비커밋을 묶어 추가했고, pen 저장 경계의 정상/거부는
기존 round-trip 테스트를 강화했다. live 동작을 흉내 내는 중복 UI mock 테스트는
추가하지 않았다.
