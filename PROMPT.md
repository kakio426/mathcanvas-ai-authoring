# MathCanvas 네이티브 affordance와 공간 계약 구현 프롬프트

먼저 `PLAN.md`의 확인된 결정을 읽고, `CHECKLIST.md`를 R1부터 순서대로 진행하며 각 항목의 상태를 그 파일에서 갱신한다.

## 역할과 목표

당신은 MathCanvas 저작 엔진과 초등 수학 학습 활동을 함께 책임지는 수석 TypeScript 엔지니어이자 학습 설계자다. 현재 `verified` 상태인 나머지 있는 나눗셈 활동을 대상으로, MathCanvas를 정적 그림판처럼 쓰지 않고 학생의 수학적 판단을 실제 네이티브 조작으로 드러내는 구조를 만든다.

핵심 목표는 다음 두 가지를 동시에 달성하는 것이다.

1. 학생이 예상한 뒤 같은 수씩 묶어 나머지를 확인하고, 근거를 설명하고, 답을 고칠 수 있어야 한다.
2. 네이티브 요소가 기존 고정 상자보다 크거나 선택 핸들을 펼쳐도 겹침·잘림·과도한 축소가 생기지 않아야 한다.

기존 상자에 도구를 억지로 축소해 넣지 않는다. 도구의 실제 affordance와 공간 계약을 먼저 확인하고, 그 결과를 수용하는 배치 variant를 선택한다.

## 배경

- 저장소: `/Users/yubyeongju/Documents/mathcanvas-ai/mathcanvas-ai-authoring`
- 시작 기준선: `main == origin/main == ca5247f12b4a6461cc3d4272d7534df32804924c`
- 대상 활동: `number.division.quotient-remainder.claim-evidence-v1`
- 대상 활동 상태: `verified`
- 현 활동은 정적 점과 펜을 사용해 학생이 묶음을 표시한다. 예상→확인→설명·수정의 인지 흐름은 있지만 MathCanvas 네이티브 수학 요소 활용은 부족하다.
- `NO01SC`(수 세기 모형), `NO01NR`(수 구슬), `NO07IC`(셈돌), `NO04NG`(배열표)는 현재 `captured` 수준이다. `NO04NT`(수 카드)는 `released`다.
- `LayoutPreset`과 `resolveLayout`은 고정 token, `itemPitch`, `canvasBaseHeight`를 사용한다. `ResolvedEmission`에는 `bounds`와 선택적 `renderedBounds`만 있고 선택·조작·재열기 상태의 공간 계약은 없다.
- 기존 visual audit은 초기 `renderedBounds`, 컨테이너 포함, 일부 드롭 후 위치를 검사하지만 선택 핸들, 도구 로컬 UI, undo/reset, task-relevant movement envelope, 재열기 drift를 완전히 모델링하지 않는다.
- 각도 활동이 공통 claim-evidence preset 대신 전용 preset을 사용하는 선례가 있다.
- 2026-08-07의 transient MathCanvas 렌더 증거는 실제 클라이언트 화면과 일회성 카드 이동만 확인했고 persistent lifecycle을 검증하지 못했다. 이를 release 증거로 승격하지 않는다.

`PLAN.md`의 장기 아키텍처와 안전 원칙은 계속 유효하다. 이 문서는 그 계획을 대체하지 않고, 네이티브 affordance·공간 계약·나눗셈 재설계 범위에서 더 최근에 확정된 집중 실행 지시다. 둘이 이 범위에서 충돌하면 이 문서의 좁고 구체적인 결정이 우선한다.

## 대상 사용자

- 학습자: 초등 3–4학년, 한국어, 교실 노트북 또는 유사한 화면에서 MathCanvas 활동을 수행하는 학생
- 운영자: 활동을 생성하고 수업에 사용하는 교사
- 구현 검토자: MathCanvas 도구 계약, 학습 설계, 시각 품질을 검토하는 저장소 유지보수자

## 플랫폼과 환경

- TypeScript 모노레포와 현재 package 경계를 유지한다.
- 제품 런타임에 새 Python 경로나 새 workspace package를 만들지 않는다.
- MathCanvas 조사는 `scripts/contract-lab/`의 비제품 경계에서 수행한다.
- 실제 화면 검증은 `packages/managed-browser`의 전용 headless 프로필만 사용한다.
- 사용자의 Chrome, 일반 Chrome 프로필, 현재 화면, 포커스, 임의 CDP endpoint를 사용하지 않는다.
- 현재 품질 기준 viewport는 1280×800이다. 캔버스 단위는 실제 CSS px로 환산해 글자와 조작 크기를 판정한다.
- 외부 MathCanvas write는 기존 create-only·명시 승인·fail-closed 규칙을 유지한다.

## 이번 버전의 범위

- `mathcanvas-learning-design` 스킬에 native-before-layout 및 공간 계약 규칙 추가
- 네이티브 경계 용어와 최소 normative contract 정의
- 관측 evidence와 normative contract 분리
- 신규·변경 활동에 적용되는 report-only + ratchet 하네스 도입
- 나눗셈 후보 도구의 교육적·기술적 deep probe
- 후보가 적합하고 기존 구조 안에서 release 가능한 경우에만 도구 계약 승격
- 선택된 도구를 수용하는 deterministic preset variant와 세로 flow
- 나눗셈 활동의 native workbench 재설계
- 정적 variation 검사와 작은 background canary suite
- 실제 증거가 모두 갖춰진 경우에만 `verified → released`

## 비목표

- 범용 constraint solver 또는 완전 동적 auto-layout 엔진
- 모든 MathCanvas 도구의 공간 계약 완성
- 기존 released 활동 전체를 한 번에 hard gate로 전환
- 활동 ID별 core resolver/validator 분기
- MathCanvas가 제공하지 않는 자동채점, 단계 강제, 자동 오답 피드백
- `NO04NT` 수 카드가 나눗셈의 핵심 수학 상태를 바꾼다고 주장하는 것
- captured-only 도구를 장식 목적으로 추가하는 것
- 학생 개인정보 수집 또는 원본 인증·쿠키·토큰의 저장소 기록
- 기존 MathCanvas 프로젝트 수정·삭제

## 핵심 학습 흐름

화면과 지시문은 다음 순서를 위에서 아래로 일치시킨다.

1. 학생은 카드를 옮기기 전에 몫과 나머지를 예상한다.
2. 학생은 네이티브 수학 도구로 같은 수씩 묶음을 만들고 남는 양을 확인한다.
3. 학생은 묶음 수, 묶음마다 들어간 수, 남은 수를 근거로 설명한다.
4. 학생은 처음 선택과 실제 구성을 비교해 답을 고칠 수 있다.

학생에게 `먼저 예상`, `세어 확인`, `근거와 수정`, `검증`, `불변량`, `후보`, `수 카드 모음` 같은 내부 용어를 보여 주지 않는다. 대상과 행동을 이름 붙인 짧은 교실 문장을 사용한다.

학습 설계가 답해야 할 문장은 다음과 같다.

> 학생은 주어진 전체를 같은 수씩 몇 묶음으로 만들 수 있는지와 몇 개가 남는지를 결정해야 한다.

오개념 갈등은 적어도 다음을 포함한다.

- 나머지가 묶는 수와 같아도 된다고 생각함
- 전체 수를 묶음 수로 착각함
- 몫과 나머지의 순서를 바꿈
- 같은 수씩 묶지 않고 임의 크기로 나눔

자기검증 불변량은 `묶음 수 × 묶음마다의 수 + 남은 수 = 전체 수`이며, 남은 수는 묶는 수보다 작아야 한다. 이 식을 잠긴 정답으로 미리 보여 주지 말고 학생이 만든 네이티브 구성에서 세어 확인할 수 있게 한다.

## 아키텍처 백본

### 데이터 모델

#### `NativeSpatialContract` `[core]`

도구+variant 버전에 대한 normative 공간 계약이다. 정확한 이름은 기존 vocabulary와 조화시킬 수 있지만 책임은 유지한다.

- `toolKey` 또는 `nativeModuleKey`
- `variantId` 또는 명시적 variant matcher
- `toolVersionFingerprint`
- `minInteractiveSize` — 캔버스 단위의 최소 조작 크기
- `reserveBounds` — authoring anchor 기준 로컬 경계
- `roundTripStable`
- `roundTripTolerance`
- `derivedFromEvidenceIds`

`reserveBounds`는 다음 정의로 계산한다.

- `visualBox`: 평상시 실제로 그려지는 외곽
- `chromeBox`: 선택 상태의 tool-local handle·label·menu를 포함한 외곽. 전역 편집기 UI는 제외한다.
- `taskEnvelope`: 활동이 명시적으로 요구하는 정상 조작 상태들의 유계 범위
- `reserveBox`: `visualBox ∪ chromeBox ∪ bounded taskEnvelope`에 필요한 내부 여백을 더한 배치 예약 영역

`minGap`은 `reserveBox` 바깥에서 한 번만 적용한다. chrome 여백과 `minGap`을 중복 계산하지 않는다.

자유 드래그 전체를 `taskEnvelope`로 저장하지 않는다. 정상 활동 상태를 유계로 정의할 수 없으면 `unbounded` 또는 동등한 명시적 상태로 실패시키고, 컨테이너 clamp가 실제 MathCanvas 계약으로 확인되지 않는 한 모든 학생 행동에서 overlap 0이라고 주장하지 않는다.

#### `NativeSpatialEvidence` `[core]`

관측 자료는 contract와 별도 research artifact로 둔다.

- immutable evidence ID와 관측 시각
- tool/variant 및 MathCanvas bundle/factory fingerprint
- viewport, DPR, font hash, asset hash, harness version
- initial, selected, core-manipulated, undo/reset, reopened 관측값
- 실제 저장 payload의 수학 상태 전후 차이
- non-pointer 조작 경로 관측 결과
- 원본 민감정보를 제거한 측정·캡처 경로

관측 배열 자체를 normative contract 필드로 복사하지 않는다. 재측정이 계약 값을 바꾸지 않으면 contract hash를 흔들지 않는다. evidence artifact는 별도 content hash로 결속하고, tool version이 바뀌어 contract가 stale하면 fail-closed한다.

재열기 외곽이 초기 외곽과 tolerance 이상 다르면 상자를 키워 수용하지 않는다. serialization 또는 native contract 결함으로 실패시킨다.

#### `LayoutVariantProfile` `[core]`

- content-only selector 조건
- explicit variant ID: 예 `horizontal`, `stacked`, `multi-row`
- variant별 고정 `itemPitch`, `canvasBaseHeight`, token set
- 수용 가능한 `reserveBox` 최대값
- 허용된다면 width가 엄격히 감소하는 단 하나의 fallback variant

selector는 문항의 의미 값만 읽는다. 렌더 결과나 growth 결과를 다시 읽어 variant를 반복 선택하지 않는다.

### 모듈 경계와 계약

1. `scripts/contract-lab/` `[core for selected tools]`
   - headless deep probe와 sanitized evidence 생성만 담당한다.
   - 제품 runtime에 export하지 않는다.
2. `packages/contracts/src/catalog/` 또는 기존 도구 계약 경계 `[core]`
   - normative spatial contract, support evidence, version staleness를 소유한다.
3. `packages/mathcanvas-compiler/src/adapters/` `[core]`
   - 의미 입력과 placement를 실제 native object 및 `renderedBounds`/reserve lookup으로 연결한다.
4. `packages/mathcanvas-compiler/src/layout-presets/`와 `resolve/` `[core]`
   - content-only variant selection, 순수 sizing, fit validation, 누적 vertical flow를 담당한다.
5. `packages/templates/src/`와 `packages/curriculum/src/` `[core]`
   - 나눗셈의 학습 목표, 문항 variation, 오개념, 역할, 교실 문구와 layout profile ref를 소유한다.
6. `scripts/visual-audit/`, `scripts/quality-audit/`, cognitive harness `[core]`
   - gate 의미와 report-only/ratchet/hard 전환을 소유한다.
7. 기존 released 활동의 미측정 도구 baseline `[scaffold]`
   - 초기에는 report-only가 허용되지만, 신규 위반을 허용하지 않는 실제 ratchet seam을 가져야 한다.
8. 전체 도구 쌍의 pairwise interference catalog `[scaffold]`
   - 이번에는 나눗셈 화면에서 실제로 공존하는 선택된 workbench 도구와 `NO04NT` 조합만 core로 검증한다.

### 상태와 데이터 흐름

```text
meaningful activity values
  → content-only layout variant selection
  → NativeSpatialContract lookup
  → pure sizing
  → fit validation
  → reserveBox-based vertical flow
  → resolved emissions
  → native adapters
  → static audits
  → headless observation evidence
  → release evidence binding
```

selection은 content만 읽고, growth는 이미 선택된 variant와 size만 읽는다. 서로를 다시 호출하지 않는다.

### real-vs-stub

- 나눗셈에서 선택된 핵심 도구의 contract, adapter, layout, audit, canary는 실제 구현한다. stub을 허용하지 않는다.
- 기존 released 활동 전체의 spatial evidence 백필은 scaffold다. baseline과 ratchet은 실제로 동작해야 하지만 모든 과거 도구의 deep probe를 이번에 끝내지 않는다.
- 범용 auto-layout은 만들지 않는다. 향후 반복 사례가 생기면 현재 `LayoutVariantProfile` seam에 붙인다.

### 확장 지점

- 다른 native 도구 family의 `NativeSpatialContract` 추가
- 같은 family의 새 `LayoutVariantProfile` 추가
- report-only gate의 개별 hard 승격

새 확장 지점은 활동 이름별 switch를 추가하지 않고 descriptor/profile 등록으로 연결되어야 한다.

## 기능 요구사항

### R1. 학습 설계 스킬에 native affordance 규칙 추가 `[core]`

`/Users/yubyeongju/.codex/skills/mathcanvas-learning-design/SKILL.md`에 다음 규칙을 기존 workflow와 binary rejection rules에 자연스럽게 통합한다.

- native affordance mapping before layout
- 학습목표에 가장 구체적이며 `released`인 도구 우선
- primitive fallback의 사유와 한계 기록
- native 도구가 장식이 아니라 학생 조작으로 수학 상태를 바꾼다는 evidence
- 신규·변경 활동에서 spatial contract 없는 native 배치 금지
- overflow 순서: explicit alternate preset → wrap/stack → 검증된 최소 크기 안의 scale
- 문항별 임의 좌표 보정 금지
- initial/selected/core-manipulated/undo-reset/save-reopen 실제 화면 확인

스킬 문구는 특정 나눗셈 도구 이름에 결합하지 않는다.

### R2. 경계 vocabulary와 contract/evidence 분리 `[core]`

`visualBox`, `chromeBox`, `taskEnvelope`, `reserveBox`를 문서와 타입에서 한 의미로 정의한다. 각 gate가 어떤 box를 사용하는지 표로 고정한다. normative contract와 환경 의존 evidence를 별도 schema/fixture로 만들고, tool version staleness와 roundtrip tolerance를 fail-closed로 검사한다.

### R3. affordance·spatial gate와 ratchet `[core]`

기존 predicate 및 audit 구조와 조화되는 최소 gate를 구현한다.

- native candidates reviewed
- semantic native preferred
- primary mathematical state changed
- primitive fallback bounded
- native reserve box fit
- native minimum interaction size
- native vertical flow fit
- native label clearance
- native state change and roundtrip

신규·변경 활동에서 발생한 새 위반은 즉시 실패한다. 기존 released 활동의 이미 존재하는 위반만 baseline report-only로 남길 수 있다. waiver는 `(activity, gate)` 키, 담당자, 사유, 만료일을 갖는다.

gate별 hard 승격 조건은 다음과 같다.

- 모든 released 활동에서 실행됨
- 신규 회귀 0
- 남은 위반이 모두 유효한 waiver를 가짐
- 동일 입력에서 연속 3회 green이고 flake가 없음
- 수동 표본에서 false positive 0

### R4. 나눗셈 후보 rubric과 headless deep probe `[core]`

후보를 미리 고정 순위로 가정하지 않는다. 다음 rubric으로 `NO01SC`, `NO01NR`, `NO07IC`, `NO04NG`를 평가한다.

1. 학생이 묶음을 직접 만들 수 있는가
2. 같은 수씩 묶는 조건이 조작 또는 표현으로 분명한가
3. 나머지가 별도의 셀 수 있는 잔여물로 드러나는가
4. 조작 전후 native payload의 수학 상태가 달라지는가
5. 선택·핵심 조작·undo/reset·저장·재열기가 안정적인가
6. 최소·최대 필요한 variant가 1280×800 품질 하한을 만족하는가
7. non-pointer 경로가 있는가. 없다면 플랫폼 한계를 정확히 기록하는가

각 후보의 최소·대표·최대 variant를 background에서 생성→선택→핵심 조작→undo/reset→저장→재열기한다. 원본 민감정보는 로컬에만 두고 sanitized evidence만 저장소에 둔다.

### R5. 도구 release GO/NO-GO `[core]`

선정 후보가 `captured-only`이면 probe 성공만으로 활동에 넣지 않는다. 기존 support state를 `captured → contracted → verified → released` 순서로 통과시킬 수 있는지 평가한다.

- 기존 package와 adapter registry 안에서 contract, lifecycle, spatial bounds, persistence, 현재 필수 품질 gate를 완료할 수 있으면 좁은 도구 release slice로 진행한다.
- 새 workspace package, 범용 solver, 검증되지 않은 raw passthrough가 필요하거나 핵심 나머지 조작이 성립하지 않으면 중단하고 현행 점+펜 활동 유지로 돌아간다.
- 모든 후보가 탈락하면 native 장식을 추가하지 않는다. 활동은 `verified`를 유지하고 탈락 근거를 보고한다.

이 checkpoint에서 범위가 도구 release 프로그램으로 크게 확장되면 사용자에게 결과와 비용을 보고하고 다음 변경 전에 확인받는다.

### R6. deterministic layout variant와 flow `[core]`

완전 auto-layout 없이 다음 단일 패스를 구현한다.

1. content-only selection
2. selected variant + spatial contract sizing
3. fit validation
4. reserveBox-based cumulative vertical flow

`itemPitch`는 variant별 상수다. `workbench → explanation/revision → item panel → canvas`의 위치는 선택된 variant 안에서 누적 계산하되 다음 item origin을 다시 selection 입력으로 쓰지 않는다.

가로 fit 실패 시 명시된 단조 fallback을 최대 한 번만 허용한다. fallback은 required width를 엄격히 줄여야 한다. 그래도 맞지 않으면 자동 축소나 fixpoint 반복 없이 hard error를 낸다.

도구 기하가 공통 claim-evidence와 다르면 각도 선례처럼 나눗셈 전용 또는 도구 family 전용 preset을 만든다. core resolver에 활동 ID 분기를 추가하지 않는다.

### R7. 나눗셈 활동 재설계 `[core]`

선정·released된 도구가 있을 때만 native workbench로 바꾼다.

- 처음 선택은 정답과 오개념 기반 대안을 함께 제공한다.
- 핵심 네이티브 조작은 묶음과 나머지의 수학 상태를 실제로 바꾼다.
- locked text나 그림에 정답을 노출하지 않는다.
- `NO04NT`는 몫·나머지를 기록하거나 수정하는 보조 affordance로만 사용하며 primary state-change gate를 대신하지 않는다.
- 네이티브 workbench, 라벨, 수 카드, 설명 영역은 각자의 visible container 안에 있고 shared vertical flow의 `minGap`을 지킨다.
- 세 단계 이상 지시는 번호를 붙이고 화면 순서와 맞춘다.
- 교실 문장은 한 문장에 한 행동을 쓰며, 학생이 만질 대상과 확인할 표현을 명시한다.
- 예측과 설명을 위한 실제 쓰기 공간을 유지한다.
- 문항마다 처음 상태가 미해결이고 오답 선택 후 수정 가능하다.

### R8. 정적 검증과 필요한 테스트 `[core]`

- 선택 도구의 최소·최대 variant와 활동 variation 전체를 컴파일한다.
- 초기 visualBox, selected reserveBox, task-relevant post-manipulation state, undo/reset, target fit, label clearance, text fit, minGap, canvas/container bounds를 검사한다.
- 두 native 도구가 한 화면에 공존하면 z-order, local menu, handle, movement 충돌을 확인한다.
- empty/error/unsupported variant는 fail-closed하고 원인을 구분한다.
- 관련 package 단위 테스트와 targeted audit만 먼저 실행한다.
- 마지막 release 단계에서 `pnpm cognitive:verify`와 `pnpm check`를 각각 한 번 실행한다.

### R9. background canary suite `[core]`

오프라인 검증이 통과한 뒤 사용자의 화면을 빼앗지 않는 background canary를 실행한다. 가능하면 하나의 fresh project에 다음 4–6개 관측 케이스를 묶는다.

- 최소 variant
- 최대 variant
- wrap/stack 경로를 실제로 발생시키는 케이스
- 기존 released known-good 대조 활동
- 선택 전·선택 후·핵심 조작 후·undo/reset 후·실제 save/reopen 후

동일 저장 결과를 두 번 재열어 normalized measurement hash가 tolerance 내에서 같은지 확인한다. 플랫폼 제약으로 한 프로젝트에 suite를 담을 수 없다면 필요한 최소 프로젝트 수와 이유를 기록하고 임의로 범위를 넓히지 않는다.

canary는 현재 blueprint hash, layout preset hash, native spatial contract hash, tool version, font/asset/harness fingerprint에 결속한다. 실제 glyph ink, 겹침, 정렬, 글자 크기, 교실 용어를 캡처에서 직접 확인한다.

### R10. release와 인계 `[core]`

- fresh persistent canary가 없거나 hash가 stale하면 `verified`를 유지한다.
- 모든 P0/P1이 0이고 인지·시각·품질 gate가 통과한 경우에만 `released`로 올린다.
- Claude Opus 5의 기존 wave 검토 원칙을 따라 외부 write 전 안전 검토와 최종 diff·증거 검토를 수행한다.
- 의미 있는 단위가 완성되고 관련 검증이 green일 때만 `main`에 의도적으로 commit·push한다.
- 다른 사용자 변경이나 관련 없는 dirty file을 커밋하지 않는다.
- 결과 보고에는 선택·탈락 도구 근거, 수학 상태 전후 evidence, 실제 캡처, 테스트, 남은 플랫폼 한계를 포함한다.

## 콘텐츠와 데이터 요구사항

- 공식 2022 개정 교육과정 성취기준을 권위 원본으로 유지한다.
- 고정 learning-map commit의 나눗셈 topic, prerequisite, evidence, assessment prompt를 현재 manifest와 대조한다.
- 학습-map은 보조 ontology임을 유지하며 공식 승인으로 표현하지 않는다.
- 후보별 rubric 결과와 탈락 사유를 evidence에 기록한다.
- 정답·학생 개인정보·인증정보를 연구 artifact에 넣지 않는다.
- 네이티브 공간 evidence는 tool version과 환경 fingerprint 없이는 유효하지 않다.

## 시각 및 UX 방향

- 기존 MathCanvas 학생 화면의 차분한 교육용 스타일을 유지한다.
- 네이티브 조작판의 실제 크기를 먼저 확보하고 남는 공간에 텍스트를 배치한다.
- 폭이 부족하면 축소보다 wrap 또는 stacked preset을 우선한다.
- 라벨은 해당 요소 묶음 위에 두고 첫 행의 왼쪽과 맞춘다.
- 여러 행은 같은 중심축과 균일한 가로·세로 간격을 쓴다.
- 설명과 예상 라벨은 쓰기 상자 안의 머리말 정책을 유지한다.
- 1280×800에서 학년대별 글자 하한, 24px blocking 조작 하한, 쓰기 영역, drop slack, 문제 간 간격을 통과한다.
- bounds 검사는 실제 한글 glyph 잉크 확인을 대신하지 않는다.

## 기술 제약

- 기존 `renderedBounds`를 제거하거나 의미를 바꾸지 않는다. spatial contract는 호환 확장으로 추가한다.
- schema·adapter·audit 이름은 기존 코드 관례를 따르되 이 문서의 책임 분리를 보존한다.
- 활동 이름별 core switch, raw payload escape hatch, 새 dependency, 새 workspace package를 만들지 않는다.
- per-item `x`/`y` 미세조정으로 겹침을 숨기지 않는다.
- screenshot pixel equality를 hard gate로 쓰지 않는다. 수치 tolerance와 normalized structural measurements를 사용한다.
- evidence의 volatile 관측값과 normative contract hash를 섞지 않는다.
- tool/factory/bundle fingerprint가 바뀌면 관련 spatial contract를 stale로 처리한다.
- 현재 writing-quality transform 및 released 활동의 기존 동작을 보존한다.

## 개인정보와 안전 제약

- 토큰, 쿠키, 계정 ID, 비공개 프로젝트 원문을 저장소에 커밋하지 않는다.
- sanitizer를 통과한 bounded evidence만 기록한다.
- 기존 MathCanvas 프로젝트를 수정하거나 삭제하지 않는다.
- 새 프로젝트 생성과 저장은 기존 명시 승인·create-only 경계를 따른다.
- 사용자의 Chrome·화면·포커스를 제어하지 않는다.
- MathCanvas가 보장하지 않는 자동채점, 단계 순서, 글쓰기 수행, keyboard 지원을 주장하지 않는다.

## 핵심 단위별 완료 정의

### Spatial contract `[core]`

- 네 경계 용어가 타입·문서·gate에서 동일하다.
- selected chrome과 내부 여백이 `reserveBox`에 한 번만 반영된다.
- free drag, unsupported variant, stale version, roundtrip drift가 fail-closed한다.
- evidence 없이 `roundTripStable: true`를 선언할 수 없다.

### Gate와 ratchet `[core]`

- 변경된 활동의 새 위반은 report-only 기간에도 실패한다.
- 기존 부채만 baseline으로 식별된다.
- waiver에 owner·reason·expiry가 없으면 유효하지 않다.
- gate별 box semantics와 hard 승격 조건이 테스트된다.

### Candidate probe와 tool decision `[core]`

- 모든 후보가 같은 rubric으로 비교된다.
- 최소·대표·최대, 선택, 조작, undo/reset, save/reopen가 관측된다.
- 나머지의 독립적 가시성과 payload state change가 확인되지 않으면 탈락한다.
- captured-only 도구는 release lifecycle 없이 활동에 들어가지 않는다.
- 모두 탈락했을 때 현행 유지가 정상적인 완료 결과로 처리된다.

### Layout pipeline `[core]`

- selection/sizing/fit/growth가 순환 없는 순수 단계로 나뉜다.
- `itemPitch`는 variant 상수다.
- 단조 fallback은 최대 한 번이고 width 감소가 테스트된다.
- max reserveBox에서도 다음 블록·다음 문항과 겹치지 않는다.
- 적합하지 않은 경우 임의 scale이나 좌표 보정 없이 실패한다.

### Division activity `[core]`

- 예상→네이티브 구성→근거 설명→수정이 화면과 지시문에 드러난다.
- 네이티브 조작 전후 수학 상태가 다르다.
- 나머지를 실제로 세어 확인할 수 있다.
- 정답 누출, 명백한 단일 경로, 장식용 native 사용이 없다.
- 모든 문항이 초기 미해결이며 오개념 기반 오답과 수정 경로가 있다.
- 실제 글쓰기 공간과 교실 용어가 유지된다.

### Canary와 release `[core]`

- 최소·최대·wrap·대조군이 background에서 관측된다.
- 실제 save/load 경계를 통과하고 두 번 재열기 측정이 안정적이다.
- initial/selected/manipulated/undo-reset/reopened 캡처와 측정이 있다.
- 현재 code/contract/tool/environment hashes와 결속된다.
- 실제 캡처에서 겹침·정렬·글자 크기·교실 용어 P0/P1이 0이다.

## 수용 기준

- [ ] 후보 선택 근거가 동일한 교육·기술 rubric으로 기록되어 있다.
- [ ] 핵심 네이티브 조작이 좌표만이 아니라 저장 가능한 수학 상태를 바꾼다.
- [ ] `visualBox`, `chromeBox`, `taskEnvelope`, `reserveBox`가 서로 구분된다.
- [ ] initial/selected/core-manipulated/undo-reset/reopened 정상 상태가 컨테이너와 캔버스 안에 있고 보호 영역과 겹치지 않는다.
- [ ] free-drag 전체에 대한 거짓 overlap 보장을 하지 않는다.
- [ ] reopen drift가 tolerance를 넘으면 layout으로 흡수하지 않고 실패한다.
- [ ] 1280×800에서 글자, 조작 크기, 쓰기 영역, drop slack, `minGap` 하한을 통과한다.
- [ ] max variation/variant에서 임의 downscale과 per-item 좌표 수정이 없다.
- [ ] `NO04NT`는 기록 affordance로만 설명된다.
- [ ] captured-only 도구는 완전한 release lifecycle 없이 사용되지 않는다.
- [ ] 신규 위반 ratchet과 gate별 hard 승격 조건이 동작한다.
- [ ] background canary 증거가 현재 hashes와 결속된다.
- [ ] `pnpm cognitive:verify`와 `pnpm check`가 통과한다.
- [ ] 최종 support state가 증거 수준과 일치한다.

## QA 경로

1. 시작 시 git 상태와 기준 commit을 확인하고 관련 없는 변경을 보존한다.
2. R1–R3은 schema·unit test·report-only audit만 실행한다.
3. R4는 headless contract-lab probe만 실행하고 evidence를 sanitize한다.
4. R5 checkpoint에서 도구 release 진행 또는 현행 유지 fallback을 결정한다.
5. R6–R8은 관련 compiler/template/validator 테스트와 targeted visual/quality audit를 실행한다.
6. 대상 활동을 `verified`로 유지한 채 background canary suite를 실행한다.
7. 실제 preview를 열어 glyph ink, 선택 chrome, 겹침, 정렬, 크기, 교실 문구를 확인한다.
8. `pnpm cognitive:verify`를 실행한다.
9. `pnpm check`를 한 번 실행한다.
10. Opus 5의 최종 diff·evidence 검토에서 P0/P1이 없을 때만 release·commit·push한다.

테스트 수를 늘리는 것이 목표가 아니다. 각 경계에 정상 1개와 필요한 실패 사례만 추가하고, 같은 validator의 변조 조합을 반복하지 않는다.

## 위험 검토 반영 내역

- 하나의 `stateBounds` 객체에 계약과 관측을 혼합 → `NativeSpatialContract`와 immutable evidence 분리 (관측 hash churn 및 순환 방지)
- reopened bounds를 layout 입력으로 수용 → tolerance 초과 drift는 serialization 결함으로 실패 (잘못된 레이아웃 보정 방지)
- 모든 자유 조작에서 overlap 0 주장 → task-relevant bounded envelope만 gate, 나머지는 clamp 증거 또는 명시적 한계 (달성 불가능한 GO 기준 제거)
- selector가 layout 결과를 재입력하고 growth가 `itemPitch` 변경 → content-only selection, variant 상수 pitch, 단일 누적 flow (결정성 확보)
- 조건 없는 report-only → 변경분 ratchet, waiver 만료, 연속 green·FP 0 조건의 gate별 hard 전환 (영구 보고 전용화 방지)
- 단일 대표 canary → 최소·최대·wrap·대조군의 4–6 case suite와 두 번 reopen measurement (커버리지와 flake 판별)
- 후보 도구 고정 우선순위 → 묶음 생성·동일 크기·나머지 가시성·payload state change rubric (학습목표 불일치 방지)
- captured-only 승자 사용 → full tool release 또는 현행 유지의 명시적 GO/NO-GO (범위 폭증과 장식용 native 방지)
- `NO04NT`를 핵심 조작처럼 취급 → 기록 affordance로 제한 (primary state-change 허위 통과 방지)
- 모든 기존 도구에 bounds profile 즉시 요구 → 신규·변경 활동은 hard, 기존 released는 baseline+ratchet (초기 충족 불가능 gate 방지)

## 열린 질문과 가정

### 열린 질문

- 네 후보 중 어느 도구가 같은 수씩 묶기와 나머지의 독립적 표현을 실제로 지원하는지는 R4 probe 전에는 알 수 없다.
- 선정 도구가 captured-only일 때 좁은 release slice가 현재 작업 범위 안에 들어오는지는 R5에서 결정한다. 범위가 크게 확장되면 사용자 확인을 받는다.
- 4–6개 canary case를 한 fresh project에 담을 수 있는지는 실제 MathCanvas payload 제약을 확인해야 한다.

### 가정

- 현재 `PLAN.md`의 create-only, fail-closed, package 경계, support evidence 상태 모델은 유지한다.
- `ca5247f` 이후 관련 없는 사용자 변경이 생기면 덮어쓰지 않고 현재 상태에 맞춰 구현한다.
- non-pointer 핵심 조작이 플랫폼에 없으면 그 사실을 evidence와 제한 사항에 기록하며 지원한다고 주장하지 않는다.
- 모든 후보가 탈락하는 경우 현행 점+펜 활동을 `verified`로 유지하는 것도 성공적인 fail-closed 결과다.
- 범용 auto-layout은 최소 두 개 이상의 실제 도구 family에서 같은 요구가 반복될 때 별도 계획으로 검토한다.

