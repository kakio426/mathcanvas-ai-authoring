# MathCanvas Contract Lab

`contract-lab`은 MathCanvas 화면·네트워크 관찰을 제품 코드와 분리해 수행하는 P0 전용
조사 경계다. package, MCP tool 또는 runtime export가 아니다.

## Data boundary

- raw 기본 경로: `.mathcanvas-contract-lab/raw/`
- sanitized 임시 경로: `.mathcanvas-contract-lab/sanitized/`
- 커밋 가능한 정본: `research/mathcanvas/`
- `.mathcanvas-contract-lab/` 전체는 gitignore 대상이다.
- 일반 Chrome profile, 임의 CDP endpoint, 사용자 홈 전체를 입력으로 사용하지 않는다.

## Sanitize a bounded raw capture

```sh
node scripts/contract-lab/sanitize.mjs \
  --input .mathcanvas-contract-lab/raw/palette.raw.json \
  --output .mathcanvas-contract-lab/sanitized/palette.sanitized.json
```

입력과 출력은 각각 기본 root 내부 파일이어야 한다. 테스트처럼 별도 root가 필요한
경우에만 `--raw-root`, `--output-root`를 명시한다.

sanitizer는 인증·세션·token 계열 key를 제거하고, 이메일·Bearer·JWT·URL query·
불안정 timestamp를 정규화한 뒤 secret scan을 다시 수행한다. scan이 실패하면
non-zero로 종료하며 출력하지 않는다.

## Validate a committed catalog

```sh
node scripts/contract-lab/validate-catalog.mjs \
  --input research/mathcanvas/tool-catalog.snapshot.json
```

검사는 stable key/tool ID 중복, category와 module key의 unknown 사유, 근거,
deep-probe 우선순위, P0 support state 상한, count, 결정적 palette fingerprint,
민감정보를 확인한다.

## Capture and build the live palette catalog

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

node scripts/contract-lab/build-catalog.mjs

node scripts/contract-lab/build-control-matrix.mjs

node scripts/contract-lab/validate-control-matrix.mjs

node scripts/contract-lab/capture-bundle.mjs

node scripts/contract-lab/extract-bundle-contract.mjs

pnpm contract:verify
```

`capture-toolbar.mjs`는 공식 `GET /api/canvas/toolbar` 응답만 raw 경계에
저장한다. `build-catalog.mjs`는 API의 category/module ID와 로그인 화면의
도구 설정 modal 및 하단 공통 toolbar가 서로 일치하는지 확인한 뒤에만
비식별 snapshot을 만든다.

`control-contract.matrix.json`은 화면 버튼별 MCP 명령 목록이 아니다. 각 수학
도구를 기존 추천→승인→새 프로젝트 생성 흐름 안의 adapter로 연결할지, viewport/
lifecycle operation으로 다룰지, create-only 정책 때문에 제외할지를 빠짐없이
기록한다.

`capture-bundle.mjs`는 화면에서 실제 로드된 main bundle만 raw 경계에 저장하고
SHA-256을 남긴다. `extract-bundle-contract.mjs`는 원본 코드를 커밋하지 않고,
46개 module별 variant ID와 선택 후 나타나는 sub-toolbar option label만 추출한
파생 snapshot을 만든다. 이 자료만으로 native 저장 계약을 확정하거나 지원 상태를
올리지는 않는다.

## Wave 1 current-golden canary

live canary는 사용자에게 새 프로젝트 1건과 저장 1건을 명시적으로 승인받은 경우에만
실행한다. 승인 플래그가 없으면 브라우저를 열기 전에 실패한다.

```sh
pnpm contract:probe:wave1:canary --approve-create-and-save
node scripts/contract-lab/validate-wave1-canary.mjs
```

이미 승인된 canary의 저장이 끝난 뒤 증거 assertion만 실패했다면 새 프로젝트나
추가 저장을 하지 않고 정확한 run ID로 read-only recovery만 수행한다.

```sh
pnpm contract:recover:wave1:canary --run-id 20260729T103957Z
node scripts/contract-lab/validate-wave1-canary.mjs
```

canary는 현재 P0 골든 전체 59개 객체에 제목 prefix만 추가한다. 정확한 payload
POST 1회와 새 canary 대상 PUT 1회만 통과시키며 thumbnail upload와 외부 분석 POST를
포함한 나머지 write는 차단한다. PUT 전에 분수 1개 이동과 MathCanvas가 추가하는
정확한 editor hydration 패턴을 검증한다.

왕복 수치는 소수점 12자리로 정규화하며 허용 오차는 `1e-12`다. 프로젝트 ID, job ID,
편집 URL, owner, token은 정본에 기록하지 않는다. 결과 정본은
`research/mathcanvas/wave1-current-golden-canary.roundtrip.json`이고 재계산 입력은
`wave1-current-golden-canary.artifacts.json`이다. validator는 골든 hash, 59개 객체,
도구별 수, 저장 mutation, 최종 GET, DOM 존재와 실제 가시성을 다시 계산한다.
recovery의 `reconstructionConsistency`는 최종 GET 기반 재구성의 자기 일관성
검사이며 독립 PUT→GET 측정이 아니다. raw log가 없는 원래 create/save 횟수는
`assertedOriginal*`, recovery 실행에서 실제 관찰한 write 수는 `measuredRecovery*`
필드로 구분한다.

## Wave 2 common draw read-only observation

Wave 2의 첫 단계는 공개 fixture endpoint 2개를 정확히 `GET`만 하며 raw 응답을
파일로 저장하지 않는다. 객체 값 대신 `svgId`, `type`, 필드 이름과 타입만 집계하고
source path의 프로젝트 ID를 제거한다.

```sh
pnpm contract:probe:wave2:read-only
node scripts/contract-lab/validate-common-draw-contract.mjs
```

현재 관찰의 31개 객체는 released/wrapper 30개와 catalog 수학 module
`NO01SC-12` 1개로 모두 분류됐다. 설명 불가능 residual은 0개이고
`canvasOption.penElements`는 모두 비었다. 원·점·선의 wire object는 발견되지
않았으므로 이를 `drawElem`의 다른 type이라고 추측하지 않는다. 정본
`research/mathcanvas/common-draw-contract.observations.json`은 원·점/선·펜의
unknown field와 사유를 보존하고 canonical SHA-256, 식별 필드 blocklist, 구조 검사를
통과해야 한다.

각 source는 값 없는 `svgId + type` histogram을 함께 기록한다. validator는 이
histogram에서 residual 집합을 다시 만들고, catalog에 실제 존재하는 math-palette
module만 `catalog-math-module`로 인정한다. 숫자만 재균형하거나 가짜 module
evidence 문자열을 넣어 설명 불가능 residual을 숨길 수 없다.

설명 불가능 residual이 새로 발견되면 committed evidence 검증은 실패한다. 이때
필드 이름·타입만 담은 파생 관찰은
`.mathcanvas-contract-lab/sanitized/common-draw-contract.candidates.json`에 먼저
보존하고 종료하므로, 후보를 분석하기 위해 같은 GET을 조용히 반복하지 않는다.

raw 공개 응답을 저장하지 않으므로 committed JSON만으로 원본 완전성을 증명할 수는
없다. 완전성 검증은 같은 고정 날짜로 GET-only capture를 임시 경로에 재현하고
byte 비교한다.

```sh
WAVE2_REPRO_DIR="$(mktemp -d)"
node scripts/contract-lab/capture-common-draw-contract.mjs \
  --observation-date 2026-07-29 \
  --research-root "$WAVE2_REPRO_DIR" \
  --output "$WAVE2_REPRO_DIR/common-draw-contract.observations.json"
cmp \
  research/mathcanvas/common-draw-contract.observations.json \
  "$WAVE2_REPRO_DIR/common-draw-contract.observations.json"
```

이 절차도 고정된 공개 endpoint에 대한 GET 2회뿐이며 제품 write는 없다. builder의
고정 입력 byte 안정성은 자동 테스트로 별도 강제한다.

이 read-only 단계에서는 원·점·선 factory를 추가하지 않았고 사각형만
`contracted`였다. 이후 아래 승인 canary에서 실제 wire를 확보했지만, compiler가
직접 생성한 lifecycle은 아직 검증하지 않았으므로 factory와 released adapter는
계속 추가하지 않는다.

## Wave 2 approved common draw canary

실행 전 Kiro Opus 5의 safety PASS가 필요하다. 실행기는 골든 59개만 POST하고 화면의
점/선·원 버튼으로 신규 객체를 만든다. 저장 wire의 `svgId`, `type`, 필드와 타입은
PUT에서 처음 기록하며 사전에 단정하지 않는다.

```sh
pnpm contract:probe:wave2:canary --approve-create-and-save
node scripts/contract-lab/validate-wave1-canary.mjs \
  --input research/mathcanvas/wave2-common-draw-canary.roundtrip.json \
  --artifacts research/mathcanvas/wave2-common-draw-canary.artifacts.json \
  --create-checkpoint research/mathcanvas/wave2-common-draw-canary.create-checkpoint.json
```

신규 객체는 1~4개, 이동은 그중 1개, 저장은 1회만 허용한다. 기존 교사 프로젝트
GET과 canary 이외의 write는 차단한다. POST 뒤 실패하면 private state의 정확한
canary ID로만 재개하며 새 POST를 만들지 않는다. save가 한 번이라도 시도됐으면
서버 상태를 먼저 확인한다. 저장이 반영된 경우 재개를 거부하고, 미반영된 시도만
제출 payload와 정확히 같은 서버 상태를 확인한 뒤 저장을 재개한다.

```sh
pnpm contract:probe:wave2:canary \
  --approve-create-and-save \
  --resume-run-id YYYYMMDDTHHMMSSZ
```

승인된 run `20260729T190211Z`는 59→62 객체, `drawElem|dot`,
`drawElem|line`, `drawElem|circle`, POST→GET/PUT→GET 예상 밖 차이 0,
전용 create 1회와 PUT 200 저장 1회로 통과했다. 이 증거는 두 도구를
`contracted`까지 올리지만 authored-object lifecycle이 아니므로
`verified`/`released`로 올리지 않는다.

## Wave 3 pen offline contract and prepared canary

펜은 `contentsJson` factory가 아니라 `canvasOption.penElements`에 저장되므로
공통 draw 객체와 별도 계약군으로 유지한다. 아래 명령은 gitignored main bundle을
읽어 정적 계약을 다시 만들 뿐 네트워크나 제품 write를 사용하지 않는다.

```sh
pnpm contract:probe:wave3:static
pnpm contract:verify
```

정적 계약은 UI 생성 field `id`, `d`, `stroke`, `strokeWidth`, `isColor`,
`M` 시작/`L` 추가 path 규칙, 퇴화 획 제거, `#pen-board path` 렌더,
`outermost` 좌표계, 지우개 동작을 특정 bundle SHA에 결속한다. 서버 생성·저장·
재열기 동작은 정적 코드만으로 확정하지 않는다. 따라서 `common.pen`은 계속
`captured`, 제품 validator는 빈 `penElements`만 허용하며 factory, adapter,
public MCP를 추가하지 않는다.

live canary 실행기는 준비돼 있지만 이 오프라인 단계에서는 실행하지 않는다.
실행 전에는 Kiro Opus 5 안전 검토와 아래 범위의 새 사용자 승인이 모두 필요하다.

> 제품 생성 검증에서는 차단되는 비어 있지 않은 펜 payload를 계약 조사기가 직접
> 전송하여, 새 AI-CONTRACT-PROBE-W3-* 프로젝트 1건 생성(POST 1회)과 그 프로젝트
> 저장 1회(PUT 1회)를 승인한다.

실제 제목 prefix도 공통 canary prefix 계약에 맞춘 `AI-CONTRACT-PROBE-W3-*`다.
승인 후 명령은 다음과 같으며 플래그가 없으면 브라우저를 열기 전에 실패한다.

```sh
pnpm contract:probe:wave3:canary --approve-create-and-save
node scripts/contract-lab/validate-wave3-pen-canary.mjs
```

canary는 골든 59객체에 authored 펜 2개만 overlay하고, 화면에서 펜 1개를 그린 뒤
지우개로 authored 펜 정확히 1개만 제거한다. 최종 `2 → 3 → 2` 획, POST 1회,
canary PUT 1회, canary GET 최대 3회만 허용한다. 기존 교사 프로젝트 read/write,
thumbnail과 외부 write는 차단한다. 원본 `d` 문자열이 필요한 비교자료는
`.mathcanvas-contract-lab/sanitized/`에만 저장하고, 커밋 가능한 evidence에는
field/type, 점 수, 길이, bounding box와 hash만 기록한다.

2xx 생성 응답에 유효한 project ID가 없으면 private orphan marker를 남기고 수동
확인 전 재실행 POST를 거부한다.

서버가 비어 있지 않은 authored 펜을 거절하거나 생성 뒤 제거하는 경우도 유효한
부정 결과다. 이때 저장을 시도하지 않고 create checkpoint, 비식별 요약,
`authoredCreatePersistence:false`를 정본에 남긴 뒤 non-zero로 종료한다. 성공·부정
결과 모두 `validate-wave3-pen-canary.mjs`가 hash, ID/path 요약과 write 경계를
독립 재계산한다.

## Exit behavior

- 성공: `PASS ...`, exit code 0
- 잘못된 경로·JSON·schema·secret: `ERROR ...`, exit code 1

P0의 live 화면 capture는 `capture-page.mjs`이며 MathCanvas 제품 MCP와 같은
profile lock을 공유한다. MCP 서버가 실행 중이면
두 프로세스가 profile을 동시에 열지 않고 `contract-lab-profile-in-use`로 멈춘다.
