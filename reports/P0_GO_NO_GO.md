# P0 GO — 기준선, 골든 회귀, 전체 팔레트 조사

## 판정

**P0 GO**

기준선, 고정 seed 골든, 격리된 contract-lab, 로그인된 live inventory, 비식별
snapshot, 조사 문서, 자동 검증이 완료됐다. 이 판정은 P0.5의 contract-family
deep-probe 진입 자격만 의미한다. blueprint/layout/새 활동 단계의 진입 권한은 아니다.

Kiro CLI `claude-opus-5`의 첫 독립 검토는 `CONDITIONAL PASS`였고, 지적된 inventory
reconciliation, count validator, support-history 강제, drift test, 문서 누락을
수정했다. 동일 모델 재검증에서 P0 PASS를 받았고, current-golden Wave 1도 별도의
수정·재검증 루프를 거쳐 최종 PASS를 받았다.

## 기준선

| 항목 | 값 |
|---|---|
| 기준 commit | `164d77bdd709484cc523ee5a35938be51dc2a73b` |
| branch | `main` |
| Node | `v26.4.0` |
| pnpm | `9.15.9` |
| OS | Darwin 25.5.0 arm64 |
| 시작 검증 | 15 test files, 74 tests PASS, typecheck/build PASS |
| 현재 검증 | 22 test files, 117 tests PASS, typecheck/build PASS |

시작 시 존재하던 계획·검토 문서는 사용자 작업으로 보존했다. 외부 비교 경로
`/Users/yubyeongju/Downloads/mathcanvas`의 코드·문서·payload는 복사하지 않았다.

## 골든 회귀

- fixture: `fixtures/golden/fraction-comparison.p0-v1.json`
- seed: `p0-fraction-comparison-seed-v1`
- activity spec hash:
  `44ef3788e83023bbac099a122693a3ca30d1eed5e0ece55333461808e3417783`
- approval hash:
  `b4a4604ec75f9cfb5dbc979713e92f1ab85c40e82d2cbc5e37c8142a8f3ffbca`
- payload hash:
  `fa0b8e750338ef3a083b22e64e1fc820fa680b8bfd8fb20781e31a661bace861`
- validation: `canCreate: true`, issue 없음

tool manifest와 adapter registry 리팩터 뒤에도 fixture를 갱신하지 않은 상태에서
`pnpm golden:verify`가 통과했다. `moduleArr`, payload hash, approval hash가 유지됐다.

## live inventory

관찰 날짜는 2026-07-29이고 origin은 `https://mathcanvas.vivasam.com`이다. 전용
Chrome profile에서 사용자가 직접 로그인했다. 기존 creator-owned 프로젝트는 도구
설정 modal과 화면 구조를 읽는 데만 사용했으며 PUT/PATCH/DELETE와 프로젝트 생성
POST는 route에서 차단했다.

| 근거 | 결과 |
|---|---|
| 공식 `GET /api/canvas/toolbar` | 4 category, 46 visible math module |
| 로그인 도구 설정 modal | 46개 이름과 category 교차 확인 |
| 하단 공통 toolbar | 10개 도구/동작 |
| main bundle | 46 module 모두 component registry와 factory 연결 |
| visible module variant | 304개, factory 누락 0 |
| sub-toolbar option | 66개 |
| control matrix | tool 56개 + editor control 18개 = 74개 |

snapshot ID는 `mathcanvas-palette-2026-07-29`, category는 5개(수학 4개와 하단
공통 1개), tool은 56개다. palette fingerprint는
`d476f912c1ac934e69e2960c64f7a05e70ee4eb6e08443ea0a37af4d6b8c4edd`다.

bundle registry의 47번째 key `DI01DICE`는 공식 toolbar API와 로그인된 도구 설정
modal에 없다. 이를 visible 지원 항목으로 추측하지 않고
`bundle-only-not-palette-visible` 1개, variant 2개, option 3개로 조정 기록했다.

## unknown과 제한

- `circleElem`, `pointElem`, `straightElem` 독립 factory ID는 bundle factory
  registry에서 확인되지 않았다. `drawElem` 공유 여부는 deep-probe 전까지 unknown이다.
- 46개 수학 module 중 현재 released adapter는 `NO03FM` 하나다.
- 하단에서는 텍스트, 수식, 사각형만 released다.
- 나머지는 `captured`이며 adapter registry가 호출을 fail-closed로 거부한다.
- 304 variant와 66 option은 정적 bundle 근거다. 실제 native 저장·재열기 계약은
  canary lifecycle 검증 전까지 확정하지 않는다.

## 데이터 보호

- raw/screenshot/bundle: `.mathcanvas-contract-lab/`에만 존재하고 gitignore됨
- 커밋 정본: 비식별 `research/mathcanvas/*.json`
- cookie, authorization, token, session, password 계열 key redaction
- 이메일, timestamp, URL query, 프로젝트 ID redaction
- tracked `research/`와 `fixtures/golden/`의 제한된 민감 pattern scan 결과 0건
- `git diff --check` PASS
- product runtime은 research JSON을 읽지 않으며 테스트가 manifest drift만 비교함

## 실행한 검증

```text
pnpm install --frozen-lockfile                    PASS
pnpm check                                        PASS
  typecheck                                       PASS
  vitest: 22 files / 117 tests                   PASS
  workspace build                                 PASS
pnpm golden:verify                                PASS, 3 tests
pnpm contract:verify                              PASS
  catalog: 5 categories / 56 tools               PASS
  bundle: 46 tools / 304 variants / 66 options   PASS
  control matrix: 56 tools / 18 controls         PASS
git diff --check                                  PASS
tracked evidence secret scan                      PASS, 0 matches
```

## Go 조건별 증거

| 조건 | 판정 | 증거 |
|---|---|---|
| 기존 typecheck/test/build | PASS | `pnpm check` |
| 고정 seed 골든 재현 | PASS | `pnpm golden:verify` |
| 모든 visible tool 분류 | PASS | catalog 56개, matrix 74개 |
| bundle delta 조정 | PASS | 46 visible + `DI01DICE` non-palette 1개 |
| unknown의 구조화된 사유 | PASS | 공통 factory missing 3개와 limitation |
| 민감정보 없는 snapshot | PASS | sanitizer, secret scan, gitignore |
| 조사 코드의 제품/MCP 격리 | PASS | public export/MCP surface 테스트 |
| MCP 버튼별 API 미증가 | PASS | 기존 public MCP 5개 유지 |
| support state 순차 강제 | PASS | support history와 released evidence 검증 |

## 다음 단계

P0.5에서는 새 활동을 만들지 않는다. current released 기준선과 공통 draw 계열부터
contract-family 단위로 생성→렌더→조작→저장→재열기→왕복 비교를 수행한다. live write는
사용자 승인으로 만든 전용 canary 프로젝트에서만 수행하고 기존 프로젝트는 수정하지
않는다.

각 wave는 Codex 구현→Kiro Opus 5 검증→지적 수정→동일 모델 재검증을 반복한다.
P0.5 전체가 PASS가 되기 전에는 P1 blueprint/layout 단계로 넘어가지 않는다.

Wave 1 current-golden canary는 Kiro Opus 5 최종 PASS로 닫혔다. 다음 대상은 펜,
점/선, 원과 독립 factory 미확정 항목을 포함한 Wave 2 공통 draw 계열이다. 지우개는
새 콘텐츠 adapter가 아니라 create-only 정책상 공개하지 않는 내부 편집 동작으로
유지한다.
