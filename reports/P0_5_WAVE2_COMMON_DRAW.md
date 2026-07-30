# P0.5 Wave 2 — 공통 draw 계약

## 현재 판정

**LIVE PASS / CONTRACTED**

승인된 전용 canary에서 점·선·원을 UI로 직접 만들고 저장·재열기까지 확인했다.
따라서 `common.point-line`과 `common.circle`은 `captured → contracted`로 올렸다.
다만 compiler가 만든 payload의 lifecycle을 검증한 것은 아니므로 adapter를 만들거나
`verified`/`released`로 올리지 않았다. pen과 P1도 아직 시작하지 않는다.

## live canary 결과

| 항목 | 결과 |
|---|---|
| run ID | `20260729T190211Z` |
| 객체 수 | 59 → 62 |
| 신규 wire | `drawElem|dot`, `drawElem|line`, `drawElem|circle` |
| 공통 field shape | 50개 필드와 타입 일치 |
| 권위 geometry | `point1`, `point2`, `coordinates` |
| POST→GET | 예상 밖 차이 0 |
| PUT→GET | 예상 밖 차이 0 |
| 이동 | 원 1개 약 58.996px, 점·선 0px |
| transform attribute 변화 | 0개 |
| create/save | create-checkpoint의 POST 1회(201) + 재개 run의 PUT 1회(200) |
| 기존 교사 프로젝트 read/write | 0회 |
| 차단 write | thumbnail POST 1회, 외부 beacon POST 2회 |
| tags | 제출 3개 → 저장 객체에서 유도한 module index 1개 |
| 신규 adapter/factory | 0개 |
| released adapter | 기존 4개 불변 |

세 객체 모두 `x`, `y`, `_x`, `_y`, `cx`, `cy`는 0으로 유지됐고 실제 모양과
배치는 두 점 geometry에 저장됐다. 점은 `point2=[0,0]`, 선과 원은 서로 다른
`point1`/`point2`를 사용했다. 저장 시 MathCanvas가 tags를 `contentsJson`과
`canvasOption.moduleArr`에서 module index로 다시 만드는 동작도 artifact에서
재계산해 허용했다.

## 구현한 경계

- `native-draw-object`
  - 사각형, 원, 점/선은 모두 관찰된 wire descriptor가 `contracted`다.
  - 원은 `wireTypes: ["circle"]`, 점/선은 `wireTypes: ["dot", "line"]`이다.
  - session에서 관찰한 stroke/fill 기본값은 계약 증거로 기록하되 factory는 만들지 않았다.
- `canvas-pen-elements`
  - `contentsJson` 객체 adapter와 분리된 `canvasOption.penElements` 경계다.
  - 현재 관찰된 빈 배열만 허용한다.
  - 비어 있지 않으면 생성 전 validator가 `unsupported-pen-elements`를 반환한다.
- manifest
  - 원·점/선에 `captured`, `contracted` 이력을 별도 증거로 연결했다.
  - `assertReleasedTool`은 두 도구를 계속 fail-closed한다.
- contract-lab
  - 기존 Wave 1 validator CLI를 재사용해 Wave 2 evidence/artifact를 재계산한다.
  - 원래 POST의 run ID·payload hash·201 응답도 create-checkpoint hash로 결속한다.
  - 골든 결속, 두 번의 왕복, 50-field wire shape, geometry, 렌더 ID, 이동,
    write boundary, redaction을 검증한다.
  - 변조된 wire type을 `wireContract` issue로 거부한다.

## anti-stub 결과

- `makeCircleObject`, `makePointObject`, `makeLineObject`,
  `makePenElement` 없음
- `NativeToolIntent` 4종 불변
- `REGISTERED_TOOL_ADAPTERS` 4개 불변
- 관찰하지 않은 native fixture 없음
- 활동 ID 분기, 절대 좌표, raw payload escape hatch 없음
- public MCP 5개 불변

## 상태 승격 경계

이번 canary의 최종 저장은 중단된 동일 run을 재개해 수행했다. POST 횟수와 201 응답은
재개 실행에서 다시 측정한 값이 아니라 create 직후 남긴 checkpoint의 측정값이며,
validator가 해당 checkpoint 전체 hash를 evidence에 결속한다.

이번 canary는 **MathCanvas 편집기가 만든 객체**의 wire 형식을 증명한다. 우리 compiler가
직접 만든 dot/line/circle payload의 `create → render → save → reopen`은 증명하지 않는다.
따라서 현재 정확한 상태는 `contracted`이며 다음은 별도 authored-object canary다.

- `verified`: compiler가 생성한 최소 dot/line/circle payload가 렌더·저장·재열기된다.
- `released`: 검증된 adapter가 실제 compiler/registry 소비 경로에 연결되고 제품
  표면에서 fail-closed 조건을 통과한다.

authored-object canary는 현재 승인에 포함되지 않는다. 실행한다면 새 프로젝트/저장
범위를 다시 명시적으로 승인받아야 한다. 다음 계획 wave는 payload 위치가 다른 pen
계약이며, 외부 write 전까지는 오프라인 분석과 안전 설계만 진행한다.

## 검증 명령

```text
pnpm check                                        PASS
  typecheck                                       PASS
  vitest: 22 files / 121 tests                   PASS
  workspace build: 8 projects                    PASS
pnpm contract:verify                              PASS
  Wave 1 + Wave 2 committed evidence             PASS
pnpm golden:verify                                PASS
git diff --check                                  PASS
```
