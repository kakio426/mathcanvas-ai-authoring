# [SUPERSEDED] MathCanvas AI Authoring 지원 범위 확장 계획

> 이 문서는 초기 계획을 보존한 기록이다. 활동 양식 하드코딩 위험을 해소한
> 현재 정본은 `PLAN.md`다. 구현 기준으로 사용하지 않는다.

## Interview Summary

- 목표는 현재 `분모가 다른 분수의 크기 비교` 한 종류에 집중된 GitHub 버전을, MathCanvas의 다양한 교구와 수업 활동을 안전하게 지원하는 범용 저작 도구로 확장하는 것이다.
- `kakio426/mathcanvas-ai-authoring`이 사용자가 직접 만든 정본이며, 모든 제품 결정과 구현은 이 저장소를 기준으로 한다.
- 구현보다 먼저 MathCanvas 화면, 도구 목록, 네이티브 객체 계약, 조작 방식, 저장·재열기 동작을 체계적으로 분석해야 한다.
- `/Users/yubyeongju/Downloads/mathcanvas`는 사용자가 만든 코드가 아닌 외부 비교 자료다. 코드나 문서를 제품 코드로 복사·이식하지 않고, 조사 누락을 줄이기 위한 참고 목록으로만 사용한다. 모든 사실은 실제 화면과 API 응답으로 독립 검증한다.
- 계획 경로는 `ask-deep + ask-educator → ask-risk → ask-architecture`이며, 이번 단계에서는 구현하지 않는다.
- 별도 제품 화면을 디자인하는 작업이 아니라 MathCanvas 화면의 객체 계약을 실측하는 작업이므로 `ask-visual`의 스타일 선택 인터뷰는 제외한다.

## Confirmed Decisions

### Scope

- 화면·도구 분석을 독립적인 선행 단계로 둔다.
- 현재 MathCanvas 화면에 존재하는 도구를 영역 구분 없이 전수 조사한다.
- 도구 이름만 수집하지 않고 각 도구의 생성, 렌더링, 선택, 이동·변형, 저장, 재열기 계약을 조사한다.
- 도구별 분석 완료 기준은 `팔레트 생성 → 기본 객체 캡처 → 속성 변경 → 이동·회전·크기 변경 → 고유 조작 → 저장 → 재열기 → 복사·삭제 → API 왕복 비교` 전체 주기다.
- 현재 GitHub 버전의 안전 원칙인 전용 Chrome, 사용자 직접 로그인, 명시적 승인, 새 프로젝트 생성 전용, fail-closed 검증은 확장의 기본선으로 유지한다.
- 다운로드 버전의 범용 브라우저 스크립트 실행 및 기존 프로젝트 `PUT` 방식을 제품 표면에 그대로 도입하지 않는다.

### Implementation order

- 전체 도구 인벤토리를 먼저 완성하고 공통 객체 계약을 분류한 뒤 구현한다.
- 첫 구현 묶음은 다음 순서로 진행한다.
  1. 분수 모형·분수 수직선·수 카드
  2. 수 세기 모형·십 배열판·연결 모형·수 모형
  3. 접시저울·모양추·대수 막대·대수 블록
- 각 묶음은 얕은 렌더링 지원이 아니라 전체 주기를 검증한 뒤 다음 묶음으로 넘어간다.

### Product shape

- 내부에는 모든 검증된 도구를 조합할 수 있는 범용 교구 컴파일러를 둔다.
- 외부 MCP 표면에는 교육적으로 검증된 활동 템플릿을 우선 노출한다.
- 범용 컴파일러와 활동 템플릿은 같은 버전형 객체 계약과 validator를 사용한다.
- 교사의 기본 흐름은 `학년·단원·학습 목표 입력 → 활동과 교구 추천 → 문제·조작·교사용 정답지 미리보기 → 명시적 승인 → 새 캔버스 생성`이다.
- 자유 교구 조합은 내부 컴파일러에서 지원하되, 계약과 안전성이 충분히 검증되기 전에는 외부 고급 MCP 도구로 공개하지 않는다.

### Analysis permission and safety

- 전용 Chrome의 제작자 계정으로 분석용 새 캔버스를 여러 개 생성할 수 있다.
- 분석 과정에서 도구 조작, 저장·재열기, 네트워크 요청과 API 객체의 전후 차이를 관찰할 수 있다.
- 기존 사용자 캔버스는 분석 대상으로 수정하지 않는다.
- “전체 도구”는 조사 시작일의 전체 팔레트 항목, 각 항목의 옵션 변형, 공통 편집 동작으로 정의하고 하나의 버전형 계약 스냅샷으로 고정한다.
- 분석 프로젝트는 가능한 경우 전용 분석 계정을 사용한다. 같은 제작자 계정을 사용해야 하면 `AI-CONTRACT-YYYYMMDD-도구명-번호` 제목으로 격리하고, 자동 프로젝트 삭제 기능 없이 조사 종료 후 목록을 확인해 수동 정리한다.
- Git에는 정규화한 필드 스키마, 전후 diff와 최소 synthetic fixture만 저장한다. 원본 응답과 전체 화면 캡처는 Git에서 제외한 로컬 비공개 조사 폴더에 둔다.
- 지원 상태는 `discovered → captured → contracted → compiled → lifecycle-verified → activity-verified → released`로 구분하며, 외부 MCP에는 `released`만 노출한다.
- 제작자 로컬 조사와 구현은 현재 허가 범위에서 진행하되, 다교사 파일럿은 자동화·내부 API·배포 인원이 명시된 서면 확인 후 진행하고 공개 배포는 별도 승인을 받기 전까지 보류한다.

### Research and production split

- 로그인 세션과 실제 화면 캡처는 기존 TypeScript 관리형 Chrome 경계 안에서 수행한다.
- Python은 인증 정보나 쓰기 권한을 받지 않는 오프라인 조사 도구로만 사용한다. 정규화, JSON diff, 필드 빈도 분석, schema 후보 생성과 빠른 객체 프로토타이핑을 담당할 수 있다.
- `/Users/yubyeongju/Downloads/mathcanvas`의 외부 Python 빌더와 문서는 조사 가설로만 사용한다. 출처·라이선스를 확인하지 않은 코드를 복사·번역·기계 이식하지 않으며, 실제 화면·저장·재열기에서 독립적으로 확인되지 않은 필드는 제품 계약에 채택하지 않는다.
- 배포되는 MCP 서버, 컴파일러, 템플릿, validator, 상태 저장과 브라우저 런타임은 TypeScript로 유지한다.
- Python 로컬 HTTP 서버, 브라우저 콘솔에 붙여 넣는 자유형 JavaScript, 기존 프로젝트 `PUT` 방식은 도입하지 않는다.

### Education brief

- 학습자는 한국의 초등학교 1~6학년 학생이며, 직접 사용자는 수업 자료를 만드는 교사다.
- 활동 템플릿은 2022 개정 교육과정의 성취기준을 기본 근거로 삼는다.
- 도구 계약은 교육과정과 무관하게 전체를 조사하되, 외부에 노출하는 활동에는 학년군·성취기준·학습 목표를 연결한다.
- 템플릿은 교구 이름이 아니라 학습 목표와 대표 오개념을 기준으로 분류한다.
- 하나의 활동은 필요한 경우 1~3개 교구를 결합하고, 학생이 수행할 조작과 조작을 통해 관찰할 수학적 관계를 명시한다.
- 첫 세 구현 묶음의 검증 활동은 다음과 같다.
  1. 분수 크기 비교, 동치분수, 수직선에 분수 나타내기
  2. 10 가르기·모으기, 세 자리 수 자릿값, 받아올림·받아내림, 곱셈의 묶음
  3. 등식의 성질, 미지수 표현, 대응 관계와 규칙
- 학생에게는 조작 지시와 사고 발문을 제공하고, 교사에게는 활동 의도·대표 오개념·관찰 포인트·정답지를 제공한다.
- 이번 확장은 저작 기능까지만 다루며 학생 개인정보, 수행 로그, 자동 진단 데이터는 수집하지 않는다.

## Assumptions

- MathCanvas의 내부 객체 계약은 비공개이며 언제든 바뀔 수 있으므로, 캡처 결과에는 관찰 날짜와 계약 버전을 붙여야 한다.
- 다운로드 버전에 기록된 수와 연산 16종, 변화와 관계 4종은 출발 목록이며 실제 현재 화면과 일치하는지 확인해야 한다.
- 도구별 화면 분석 결과는 재현 가능한 fixture와 스크린샷 또는 구조화된 관찰 기록으로 저장해야 한다.

## Open Questions

- 구현을 막는 미해결 질문은 없다.
- 분석 시작 시점에 MathCanvas 화면에서 확인되는 실제 팔레트 수와 도구별 옵션 수는 조사 결과로 확정한다.
- 이번 committed 구현 범위는 전체 도구 인벤토리·분석 기반·첫 구현 묶음의 정식 출시까지로 두고, 두 번째·세 번째 묶음은 동일한 경계를 사용하는 scaffold와 후속 release gate로 남긴다.

## Non-Goals

- 분석이 끝나기 전에 다운로드 버전의 `builder.py`를 기계적으로 TypeScript로 옮기지 않는다.
- 검증되지 않은 도구를 “지원됨”으로 표시하지 않는다.
- 기존 사용자 프로젝트의 수정·삭제 기능을 확장 범위에 넣지 않는다.
- MathCanvas 로그인 우회, 비밀번호 자동 입력, 토큰 저장을 도입하지 않는다.
- 객체 계약과 활동 템플릿이 검증되기 전에는 범용 자유 조합 도구를 외부 MCP에 공개하지 않는다.
- 학생 계정, 학생 응답, 수행 시간, 조작 로그를 저장하거나 분석하지 않는다.

## Risk Ledger

| 위험 | 영향 | 현재 대응 | 상태 |
|---|---|---|---|
| 비공개 MathCanvas 계약 변경 | 잘못된 프로젝트 생성 또는 렌더 중단 | 날짜·버전형 계약, 생성 직전 실시간 검사, fail-closed | 확정 |
| 전체 조사 범위가 계속 변함 | 완료 시점을 정의할 수 없음 | 기준 날짜의 전체 팔레트 스냅샷으로 범위 고정 | 확정 |
| 조사 증거에 독점 자산·인증 정보 포함 | 배포·보안 문제 | 최소·정규화 fixture, 비밀정보 차단 | 확정 |
| 분석 프로젝트가 제작자 캔버스를 오염 | 운영 혼선과 삭제 부담 | 전용 계정 또는 제목 접두사로 격리, 수동 정리 | 확정 |
| “생성됨”을 “수업에 쓸 수 있음”으로 오판 | 교육 품질 저하 | 7단계 지원 상태와 외부 공개 게이트 분리 | 확정 |
| 지원 범위 확장으로 validator가 느슨해짐 | 기존 안전성 후퇴 | 도구별 스키마·불변조건·회귀 테스트 유지 | 기본 원칙 확정 |
| 허가 범위를 넘는 배포 | 법적·파트너십 위험 | 제작자 로컬 검증과 다교사·공개 배포 게이트 분리 | 확정 |

## Change Log

- 일부 교구 우선 조사 → 전체 팔레트 전수 조사 후 우선 묶음 구현 (addresses: 공통 계약 재설계 위험)
- 렌더 성공 중심 → 전체 생명주기 검증 (addresses: 저장·재열기·조작 불일치)
- 교구별 템플릿 → 학습 목표·오개념별 템플릿 (addresses: 교육적 목표 불명확)
- 범용 기능 즉시 노출 → 내부 범용 컴파일러와 외부 검증 템플릿 분리 (addresses: 안전성·품질 저하)
- 교육 기능 확장 → 저작 기능만 확장하고 학생 데이터는 제외 (addresses: 개인정보·범위 팽창)
- Python 범용 빌더로 전환 → Python은 오프라인 조사, TypeScript는 배포 제품으로 역할 분리 (addresses: 빠른 역공학과 제품 안전성의 충돌)

## Architectural Backbone

### Data model

- `ContractSnapshot`: 조사 날짜, MathCanvas 화면 지문, 팔레트 해시, 도구 목록과 정규화 fixture 참조를 보관하는 버전형 조사 단위다.
- `ToolDescriptor`: 도구 ID, 영역, module key, 변형, 속성 컨트롤, 지원 상호작용, 네이티브 `svgId`, canvasOption 의존성을 설명한다.
- `ToolContract`: 의미 있는 입력 파라미터 스키마, 네이티브 객체 불변조건, 좌표·footprint 규칙, 지원 조작과 정규화 fixture를 연결한다.
- `SupportEvidence`: 일곱 단계별 필수 증거를 보관하며 지원 상태는 이 증거에서 계산한다. 상태 문자열을 임의로 올리지 않는다.
- `ActivityTemplateDefinition`: 템플릿 ID·버전, 학년군, 성취기준, 학습 목표, 대표 오개념, 필요한 도구 계약 최소 버전, 문제·난이도 범위와 출시 상태를 가진다.
- `ActivitySpecV2`: 템플릿 참조, 교육 설계, 문제, 의미 객체, 상호작용 규칙, 배치, provenance를 담는 일반 활동 명세다. 도구별 파라미터는 레지스트리의 스키마가 다시 검증한다.
- `ToolAdapter`: `parameterSchema`, `compile`, `validateSemantic`, `validateNative`, `footprint`, `supportedInteractions` 계약을 구현하고 의미 객체를 MathCanvas 네이티브 객체로 바꾼다.
- 기존 분수 전용 ActivitySpec은 legacy v1로 보존하고, 신규 추천은 v2를 생성한다. 기존 분수 비교 활동은 v2 템플릿으로 이전한 뒤 결과와 안전성을 회귀 검증한다.

### Module seams

- `apps/contract-lab`: 개발자 전용 조사 CLI다. 프로덕션 MCP에 등록하지 않고, 정해진 MathCanvas origin과 분석 프로젝트만 다룬다.
- `packages/contract-observer`: 팔레트 발견, 캡처 정규화, 전후 diff, 민감정보 차단, 스냅샷 생성을 담당한다.
- `packages/tool-catalog`: `ContractSnapshot`, `ToolDescriptor`, `ToolContract`, `SupportEvidence`와 지원 행렬의 단일 소스다.
- `packages/contracts`: 도구에 종속되지 않는 v2 활동·추천·승인·생성 작업 스키마와 legacy v1 호환 경계를 담당한다.
- `packages/mathcanvas-compiler`: 도구 어댑터 레지스트리를 통해 의미 객체를 네이티브 객체로 컴파일한다. 템플릿별 조건을 하드코딩하지 않는다.
- `packages/templates`: 템플릿별 독립 폴더와 레지스트리를 사용하며, 교육 논리와 결정적 문제 생성을 담당한다.
- `packages/validator`: 공통 스키마·보안·배치 검증, 도구 어댑터 검증, 템플릿별 수학·교육 검증을 층으로 나눈다.
- `packages/planner`: 템플릿 메타데이터와 matcher 레지스트리로 추천하며 특정 템플릿 함수를 직접 호출하지 않는다.
- `packages/managed-browser`: 프로덕션 생성 경계와 실시간 계약 fingerprint 검사를 유지한다. 조사 기능은 별도 내부 인터페이스 뒤에서만 저수준 런타임을 재사용한다.
- `apps/mcp-server`: 기존 승인·생성 흐름을 유지하고 `released` 활동 목록을 읽는 도구만 추가한다. 범용 객체 생성이나 자유형 브라우저 도구는 노출하지 않는다.

### State and data flow

- 조사 흐름: `관리형 Chrome 화면 관찰 → 로컬 raw 캡처 → Python/TypeScript 오프라인 정규화·diff → sanitized ContractSnapshot → ToolContract → adapter fixture/test → SupportEvidence 승급`.
- 제품 흐름: `교사 요청 → planner/template registry → Recommendation → ActivitySpecV2 → adapter compiler → CompiledProject → layered validator → 교사 승인 해시 → 실시간 계약 확인 → 새 프로젝트 POST`.
- 원본 조사 자료의 단일 소스는 Git에서 제외된 `.mathcanvas-contract-lab/`이고, 제품 코드가 신뢰하는 단일 소스는 Git에 커밋된 sanitized snapshot과 tool contract다.
- 지원 목록은 코드에 손으로 중복 작성하지 않고 `SupportEvidence`와 출시 템플릿에서 생성한다.

### Real vs scaffold

- `core`: 전체 팔레트 인벤토리, contract-lab 안전 경계, 스냅샷·정규화·상태 모델, ActivitySpecV2, 도구 레지스트리와 어댑터 경계, 계층형 validator, 기존 분수 회귀 호환, 첫 구현 묶음 3개 도구와 3개 활동, MCP 출시 목록, 보안·설치·테스트.
- `scaffold`: 두 번째 묶음과 세 번째 묶음의 catalog 항목, adapter 등록 위치, 템플릿 등록 위치와 release gate. 가짜 지원이나 placeholder 활동은 외부에 노출하지 않는다.

### Extension points

- 두 번째·세 번째 교구 묶음은 새 `ToolAdapter`와 템플릿을 등록하는 방식으로 추가한다.
- 도형·측정, 자료·가능성 등 후속 영역은 새로운 tool contract와 curriculum record를 같은 registry에 연결한다.
- MathCanvas 계약 변경은 기존 fixture를 덮어쓰지 않고 새 `ContractSnapshot`과 계약 버전을 추가해 비교·마이그레이션한다.

### Depth tags and definition of done

- `[core] Contract lab`: 임의 JavaScript 실행 없이 전체 팔레트를 발견하고, 민감정보가 없는 정규화 결과와 재현 가능한 diff를 만든다.
- `[core] Tool catalog`: 모든 발견 도구가 근거와 상태를 가지며, 누락·중복·증거 없는 승급이 테스트에서 실패한다.
- `[core] ActivitySpecV2/registry`: 단일 템플릿 literal 의존성을 제거하고, 잘못된 도구 파라미터·버전·상호작용을 컴파일 전에 거부한다.
- `[core] First tool wave`: 분수 모형, 수직선, 수 카드의 필요한 변형이 실제 화면과 저장·재열기 계약을 통과한다.
- `[core] First activity wave`: 분수 크기 비교, 동치분수, 수직선에 분수 나타내기가 교육과정·수학·배치·조작·정답지 검증을 통과한다.
- `[core] Safety and browser`: 기존 새 프로젝트 전용, 승인 해시, payload 해시, origin 제한, fail-closed 동작이 유지되고 실제 인증 캔버스 1건씩 검증된다.
- `[scaffold] Later waves`: 등록 seam과 상태 행렬은 실제이나 구현되지 않은 도구는 `released`가 아니며 외부 MCP에서 보이지 않는다.

## Implementation Prompt

현재 `IMPLEMENTATION_PROMPT.md`는 Opus 5 심사 결과 **No-Go** 상태다. 구현에 사용하지 않는다.
`CLAUDE_OPUS_5_PLAN_REVIEW_2026-07-29.md`의 대안을 반영해 P0~P3 단계별 프롬프트로
다시 작성한 뒤 각 단계의 Go 조건을 별도로 통과해야 한다.
