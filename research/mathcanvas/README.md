# MathCanvas 도구 계약 조사

## 현재 판정

이 디렉터리는 실제 로그인된 MathCanvas 화면, 공식 toolbar API, 화면에서 로드된
main bundle을 서로 대조한 비식별 조사 정본이다. 현재 조사는 `captured` 단계이며,
native 생성·저장·재열기 lifecycle을 통과하지 않은 도구를 제품 지원으로 선언하지
않는다.

2026-07-29 관찰 결과는 다음과 같다.

| 표면 | 항목 수 | 의미 |
|---|---:|---|
| 수학 팔레트 | 46 | 공식 API와 도구 설정 modal에 모두 보이는 module |
| 하단 공통 toolbar | 10 | 콘텐츠 도구 6개와 편집 동작 4개 |
| 왼쪽 탐색 제어 | 6 | 도구 설정, 패널 접기, category 4개 |
| 오른쪽 viewport 제어 | 6 | 새로고침, 전체 화면, 그리드, 확대, 축소, 이동 |
| 상단 lifecycle 제어 | 6 | 캡처, 설정, 저장, 활동 만들기, URL 복사, 나가기 |
| 전체 contract matrix | 74 | tool 56개 + editor control 18개 |

수학 팔레트 46개에서는 304개 variant factory와 66개 sub-toolbar option을
정적으로 확인했다. bundle component registry에는 `DI01DICE`도 존재하지만 공식
toolbar API와 로그인된 도구 설정 modal에는 노출되지 않았다. 이 항목은 지원 도구로
추측하지 않고 `bundle-only-not-palette-visible`로 별도 조정 기록한다.

## 정본 파일

- `tool-catalog.snapshot.json`: 화면/API에서 보이는 46개 수학 module과 하단 10개
- `bundle-contract.snapshot.json`: 304개 variant, 66개 option, factory/class shape,
  bundle-only module, 공통 factory unknown
- `control-contract.matrix.json`: 각 항목을 `tool-adapter`,
  `managed-browser-operation`, `internal-editor-action`,
  `excluded-by-policy` 중 하나로 연결한 결정
- `pen-contract.static.json`: 특정 main bundle SHA에서 추출한 펜의 저장 위치,
  field shape, path/퇴화 규칙, 렌더·좌표·지우개 정적 계약과 lifecycle unknown
- `wave1-current-golden-canary.roundtrip.json`: 현재 59객체 골든에서 만든 전용
  `AI-CONTRACT-PROBE-*` canary의 생성·분수 이동·저장·재열기 결과
- `wave1-current-golden-canary.artifacts.json`: validator가 골든 결속, 도구 수,
  편집기 재수화 기본값, 저장 후 수치 차이, 59개 객체의 실제 가시 렌더를 재계산하는
  합성 payload projection

이 JSON들은 제품 runtime의 feature flag나 전역 생성 gate가 아니다. 제품은 별도의
typed manifest와 released adapter registry를 사용하며, research 경로는 테스트의
drift 확인과 사람의 증거 추적에만 사용한다.

## 재현 절차

전용 Chrome과 사용자 직접 로그인을 사용한다. 일반 Chrome profile, 임의 CDP
endpoint, 기존 프로젝트의 저장·수정·삭제는 사용하지 않는다.

```sh
node scripts/contract-lab/capture-toolbar.mjs

node scripts/contract-lab/capture-page.mjs \
  --latest-owned-project \
  --open-tool-settings \
  --output .mathcanvas-contract-lab/raw/tool-settings.raw.json \
  --screenshot .mathcanvas-contract-lab/raw/tool-settings.raw.png

node scripts/contract-lab/sanitize.mjs \
  --input .mathcanvas-contract-lab/raw/tool-settings.raw.json \
  --output .mathcanvas-contract-lab/sanitized/tool-settings.sanitized.json

node scripts/contract-lab/build-catalog.mjs --date 2026-07-29
node scripts/contract-lab/capture-bundle.mjs
node scripts/contract-lab/extract-bundle-contract.mjs
node scripts/contract-lab/extract-pen-contract.mjs
node scripts/contract-lab/build-control-matrix.mjs
pnpm contract:probe:wave1:canary --approve-create-and-save
pnpm contract:recover:wave1:canary --run-id <approved-run-id>
pnpm contract:verify
```

bundle snapshot은 raw main bundle의 SHA-256을 확인한 뒤 파생한다. 같은 raw와 catalog로
재실행하면 byte-identical JSON이 나와야 한다. bundle registry key는 팔레트 module과
bundle-only module의 합으로 모두 설명되어야 하며, 조정되지 않은 key가 하나라도
있으면 검증이 실패한다.

## raw와 sanitized 경계

- raw: `.mathcanvas-contract-lab/raw/`
- 임시 sanitized: `.mathcanvas-contract-lab/sanitized/`
- 커밋 가능한 파생 정본: `research/mathcanvas/`

`.mathcanvas-contract-lab/` 전체는 gitignore 대상이다. raw DOM, screenshot, main
bundle, cookie, local storage, token, 계정 식별자, 비공개 프로젝트 내용은 커밋하지
않는다. source path는 `<creator-owned-project>`로 대체한다.

## 근거 한계

- 46개 module과 이름/ID/category는 API와 DOM을 교차 확인했다.
- 304개 variant와 66개 option은 특정 bundle SHA의 정적 근거다. 실제 저장 계약이나
  교사에게 보이는 모든 조건부 option을 의미하지 않는다.
- 공통 도구 중 `circleElem`, `pointElem`, `straightElem`이라는 독립 factory ID는
  발견되지 않았다. `drawElem` 공유 여부를 추측하지 않고 structured unknown으로
  남겼다.
- `DI01DICE`는 bundle에만 있고 팔레트에 없으므로 released 대상이 아니다.
- 팔레트 fingerprint 변경은 재조사 신호이지 모든 프로젝트 생성을 막는 전역 gate가
  아니다.
- 기존 24객체 creator-owned read-only probe는 local preflight로만 남기고 정본에서
  제외했다. 교사 프로젝트 payload를 커밋하지 않는다.
- 현재 정본은 골든 payload hash `fa0b8e75…`에 제목만 canary prefix로 overlay한
  59객체 합성 프로젝트다. 분수 1개 이동 뒤 저장·재열기에서 59/59 객체가 모두
  보이고 도구 수 8/12/20/19가 보존됐다.
- MathCanvas 편집기는 저장하면서 사각형 20개의 `isEyeOn:false`, 텍스트 19개의 빈
  `parent.editSnapshots`, 이동 대상의 포인터 좌표를 재수화하고
  `canvasOption.isCaptured/viewBox`를 기록한다. validator는 이 정확한 패턴만 별도
  lifecycle metadata로 허용하며, 정규화 뒤 콘텐츠 변화는 분수 1개의 `x/y`뿐이어야
  한다.
- 최초 2xx PUT 직후 구형 문구를 찾던 렌더 assertion이 실패해 raw operation log가
  정본 파일로 기록되지 않았다. 현재 증거는 같은 canary의 최종 GET과 실제 save
  계약에서 저장 body를 재구성한 read-only recovery이며, 이 한계를 evidence에
  명시한다. `reconstructionConsistency`는 독립 PUT→GET 측정이 아니며, 원래
  create/save 1/1 횟수도 측정값이 아니라 승인 흐름과 실행 경로에 기반한 assertion
  으로 표시한다.

## MCP 연결 원칙

화면 버튼마다 MCP 명령을 만들지 않는다. 콘텐츠 도구는 내부 adapter registry에서
의미 입력을 native 객체로 컴파일하고, 공개 MCP는 기존의 추천→명시적 승인→새
프로젝트 생성 흐름만 유지한다.

실행 취소·다시 실행·선택·지우개는 기존 프로젝트를 편집하는 명령으로 공개하지
않는다. 확대·축소·이동은 미리보기/검증용 viewport operation이다. 저장은 별도 UI
클릭 API가 아니라 승인된 `POST /api/project` 성공으로 처리한다.

## deep-probe 순서

다음 단계는 새 활동이나 layout DSL이 아니다. 아래 계약군을 차례로 생성→렌더→필요한
조작→저장→재열기→왕복 비교하며, 매 wave 뒤 Kiro Opus 5 검증을 통과해야 한다.

1. 현재 released 기준선: 분수 모형, 텍스트, 수식, 사각형
2. 공통 draw 계열: 펜, 점/선, 원과 공통 factory unknown
3. 수와 연산 16개 module
4. 변화와 관계 6개 module
5. 도형과 측정의 2D module과 3D module
6. 자료와 가능성 12개 module
7. viewport/lifecycle operation의 안전 경계

live write 검증은 사용자 승인으로 만든 전용 canary 프로젝트에만 수행하고 기존
프로젝트는 수정하지 않는다.

### Wave 2 완료 상태

- 공개 fixture endpoint 2개를 GET-only로 읽었고 제품 write는 0건이다.
- 공개 fixture의 31개 객체를 전수 회계했다. released/wrapper 30개와 catalog의
  수 세기 모형 `NO01SC-12` 1개이며 설명 불가능 residual은 0개다.
- 두 fixture의 `canvasOption.penElements`는 모두 빈 배열이었다.
- `circleElem`, `pointElem`, `straightElem`은 정적 registry와 공개 fixture 양쪽에서
  저장 객체 계약을 얻지 못했다.
- `angleElem` factory는 존재하지만 하단 `점 / 선`과의 관계는 확인되지 않았다.
- 승인된 전용 canary `20260729T190211Z`에서 59→62 객체와
  `drawElem|dot`, `drawElem|line`, `drawElem|circle`을 관찰했다.
- POST→GET과 PUT→GET 예상 밖 차이는 0이고 기존 교사 프로젝트 read/write는 0건이다.
- 따라서 `common.circle`과 `common.point-line`은 `contracted`다. compiler authored
  lifecycle을 검증하지 않았으므로 `verified`/`released`는 아니다.
- 미확정 factory와 adapter는 만들지 않았고 fail-closed 제품 경계를 유지한다.

정본 evidence는 `common-draw-contract.observations.json`이다. 원·점·선 lifecycle
결과는 `wave2-common-draw-canary.*.json`에 분리했다. 펜은 저장 위치가
`canvasOption.penElements`로 다르므로 같은 evidence로 묶어 승격하지 않는다.

### Wave 3 현재 상태

- gitignored main bundle에서 펜 정적 계약을 결정적으로 추출했다.
- 펜은 `contentsJson` factory가 아니라 `canvasOption.penElements`의 path list다.
- UI 생성/재열기 field, ID, `M`/`L` path, 퇴화 획, `#pen-board`, `outermost`,
  지우개와 module/tag 비참여를 특정 bundle SHA에 결속했다.
- authored POST, 서버 정규화, `strokeWidth` wire type, `isColor` 보존,
  실제 coordinate space identity는 아직 unknown이다.
- `common.pen`은 `captured`, `empty-array-only`를 유지하고 factory/adapter/MCP는 없다.
- 승인 전 실패하는 live canary 실행기는 준비했지만 제품 write는 실행하지 않았다.

live canary는 Kiro Opus 5 안전 PASS와 새 프로젝트 POST 1회·해당 canary PUT 1회의
별도 사용자 승인 뒤에만 실행한다. 원본 SVG `d`는 gitignored private 경계에만
남기고 커밋 evidence에는 요약과 hash만 기록한다.
