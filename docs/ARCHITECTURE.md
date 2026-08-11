# 아키텍처

## 한 줄 구조

교사의 요청을 로컬 MCP 서버가 canonical ProblemFamily와 검증된 파라미터로 바꾸고, 등록된 runtime binding이 ActivitySpec을 생성하며, 같은 서버의 제한형 브라우저 런타임이 별도 영구 프로필의 Google Chrome 안에서 승인된 새 프로젝트만 생성합니다.

```mermaid
flowchart LR
  T["교사"] --> A["Codex 또는 Claude Code"]
  A --> M["로컬 stdio MCP 서버"]
  M --> R["공식 성취기준·ProblemFamily 선택"]
  R --> F["ProblemParameters 검증"]
  F --> S["ActivitySpec"]
  S --> V["컴파일·검증·교사 승인 해시"]
  V --> B["관리형 Chrome 런타임"]
  B --> P["MathCanvas 페이지 컨텍스트"]
  P --> N["새 프로젝트 POST"]
  N --> W["새 편집 탭"]
```

## 브라우저 수명 주기

1. `mathcanvas_open_workspace`가 설치된 Google Chrome을 headed 모드로 실행합니다.
2. 일반 Chrome 기본 프로필이 아닌 `~/.mathcanvas-ai-authoring/chrome-profile`을 사용합니다.
3. 첫 실행에는 교사가 직접 로그인하고 `내 캔버스`까지 이동합니다.
4. 로그인 쿠키와 로컬 저장소는 전용 프로필에 남아 다음 실행에도 사용됩니다.
5. MCP 서버가 종료되면 자신이 실행한 Chrome을 닫습니다. 다음 대화에서 같은 전용 프로필을 다시 엽니다.

연결 상태 확인은 기존 창을 앞으로 가져오지 않습니다. 로그인 화면을 여는 동작은 교사가 `mathcanvas_open_workspace`를 명시적으로 요청했을 때만 수행합니다. 자동 release canary는 완전한 headless 모드로 실행합니다.

## 신뢰 경계

1. AI 경계: 교사 요청, 추천 요약, `ActivitySpec` 해시, 검증 결과와 프로젝트 ID만 다룹니다.
2. 로컬 MCP 경계: stdio만 사용합니다. 로컬 HTTP 서버, 공개 포트, 연결 코드는 없습니다.
3. 브라우저 경계: MathCanvas 토큰은 `page.evaluate`로 실행되는 함수의 지역 변수에서만 읽고 사용합니다. 함수 결과에는 토큰이 없습니다.
4. 외부 쓰기 경계: 교사 승인 해시, payload 해시, validator, 최신 MathCanvas 계약 검사가 모두 맞을 때 `POST /api/project` 한 번만 시도합니다.
5. 도구 표면: 일반 웹 탐색이나 임의 스크립트 실행 도구를 MCP에 노출하지 않습니다. MathCanvas 홈 열기, 연결 확인, 정해진 생성 작업만 제공합니다.

## 코어 모듈

- 엄격한 Zod 스키마와 버전
- 공식 교육과정 우선 resolver
- 네 영역별 canonical ProblemFamily manifest·capability·runtime registry
- 활동별 blueprint와 결정적 item generator
- 활동별 유한 variation envelope(현재 21종·93조합)
- MathCanvas 네이티브 객체 컴파일러
- 수학·교수학습·배치·상호작용·계약 validator
- MCP 도구 6개
- `playwright-core` 기반 관리형 Chrome 런타임
- 원자적 추천 초안·생성 작업 저장과 중복 생성 방지

추천 초안은 `drafts.json`, 생성 작업은 `creation-jobs.json`에 인증 정보 없이 저장합니다. 외부 쓰기 전에 작업을 저장하고, 고유 프로젝트 제목 조회로 불확실한 재시도를 조정합니다. 로그인·Chrome 실행 같은 일시 오류는 실패 기록을 보존한 채 같은 추천안으로 새 작업을 만들어 재시도합니다. 상태 파일을 읽을 수 없으면 덮어쓰지 않고 `.corrupt-*` 백업으로 옮긴 뒤 빈 상태로 다시 시작합니다.

## P3 출시 경계

- 등록 활동 29종 중 21종이 현재 blueprint·layout hash에 결속된 canary를 갖춘 `released` 상태이며, released 21종의 93개 variation을 전수 컴파일·검증합니다.
- 2022 개정 초등 수학 공식 분모는 HWP·PDF를 교차 확인한 121개 성취기준입니다. 카탈로그 매핑은 121/121이지만, released 활동이 닿는 성취기준은 18/121입니다.
- 18/121은 활동 reach일 뿐 성취기준의 모든 평가 목표를 다룬다는 뜻이 아닙니다. `AssessmentTarget` 스키마는 생겼지만 공식 성취기준별 reviewed target 분해 전이므로 target coverage는 산정하지 않습니다.
- 29개는 canonical FamilyId로 조회되며, 신규 family는 영역 index의 `source + capability + runtime` 단일 모듈로 등록합니다. 기존 29개의 수동 목록은 legacy adapter 전용으로 봉인했습니다.
- 최신 분모·학년군·영역·단원별 상태는 `reports/curriculum-coverage/latest.md`가 기계 판독 JSON과 함께 고정합니다.
- 고정 값이나 알 수 없는 key를 바꾸려 하면 fail-closed로 중단합니다.
- 승인 해시는 blueprint 내용, generator 버전, seed, variation을 포함한 canonical binding에 연결됩니다.
- public MCP는 6개를 유지하며 raw payload, 좌표, 내부 tool ID를 노출하지 않습니다.

## 동시 실행

Codex와 Claude Code는 같은 stdio MCP 명령을 등록할 수 있지만 하나의 전용 Chrome 프로필은 동시에 한 프로세스만 열 수 있습니다. v0.2는 한 번에 한 AI 앱을 쓰는 단일 사용자 구조입니다. `server.lock`이 살아 있는 프로세스를 확인해 두 번째 서버를 시작 전에 차단합니다.

## 확장 경계

신규 ProblemFamily는 공통 planner·MCP·teacher-ui·template/generator registry를
수정하지 않고 해당 영역 index에만 등록합니다. 기존 활동의 frozen adapter와 신규
native module의 경계, fail-closed 조건과 추가 절차는
[`PROBLEM_FAMILY_ARCHITECTURE.md`](./PROBLEM_FAMILY_ARCHITECTURE.md)에 고정합니다.

`RemoteRecommendationProvider`, `AdditionalTemplateProvider`, `StudentActivityPublisher`, `DesktopDistributionChannel`은 미래 기능의 인터페이스만 선언합니다. 현재 버전에는 가짜 원격 호출이나 학생 배포 기능이 없습니다.
