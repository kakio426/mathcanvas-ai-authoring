# 아키텍처

## 한 줄 구조

교사의 대화를 로컬 MCP 서버가 활동 세트 명세로 바꾸고, 문제별 명세를 각각 검증한 뒤 제한형 브라우저 런타임이 별도 영구 프로필의 Google Chrome 안에서 새 프로젝트를 하나씩 생성합니다.

```mermaid
flowchart LR
  T["교사"] --> A["Codex 또는 Claude Code"]
  A --> M["로컬 stdio MCP 서버"]
  M --> R["교육과정 추천"]
  R --> S["ActivitySetSpec"]
  S --> C["CanvasActivitySpec N개"]
  C --> V["개별 컴파일·검증"]
  V --> H["교사 승인 setHash"]
  H --> B["CreationBatch"]
  B --> P["관리형 Chrome 런타임"]
  P --> X["MathCanvas 페이지 컨텍스트"]
  X --> N["새 프로젝트 POST N회"]
  N --> W["첫 편집 화면 + 전체 URL"]
```

## 브라우저 수명 주기

1. `mathcanvas_open_workspace`가 설치된 Google Chrome을 headed 모드로 실행합니다.
2. 일반 Chrome 기본 프로필이 아닌 `~/.mathcanvas-ai-authoring/chrome-profile`을 사용합니다.
3. 첫 실행에는 교사가 직접 로그인하고 `내 캔버스`까지 이동합니다.
4. 로그인 쿠키와 로컬 저장소는 전용 프로필에 남아 다음 실행에도 사용됩니다.
5. MCP 서버가 종료되면 자신이 실행한 Chrome을 닫습니다. 다음 대화에서 같은 전용 프로필을 다시 엽니다.

## 신뢰 경계

1. AI 경계: 교사 요청, 추천 요약, `ActivitySetSpec` 해시, 항목별 검증 결과와 프로젝트 ID만 다룹니다.
2. 로컬 MCP 경계: stdio만 사용합니다. 로컬 HTTP 서버, 공개 포트, 연결 코드는 없습니다.
3. 브라우저 경계: MathCanvas 토큰은 `page.evaluate`로 실행되는 함수의 지역 변수에서만 읽고 사용합니다. 함수 결과에는 토큰이 없습니다.
4. 외부 쓰기 경계: 교사 승인 세트 해시, 항목별 payload 해시, validator, 최신 MathCanvas 계약 검사가 모두 맞을 때 문제별 `POST /api/project`를 순서대로 시도합니다.
5. 도구 표면: 일반 웹 탐색이나 임의 스크립트 실행 도구를 MCP에 노출하지 않습니다. MathCanvas 홈 열기, 연결 확인, 정해진 생성 작업만 제공합니다.

## 코어 모듈

- 엄격한 Zod 스키마와 버전
- 공식 교육과정 우선 resolver
- 검증된 분수 비교 템플릿
- 결정적 문제 생성
- MathCanvas 네이티브 객체 컴파일러
- 수학·교수학습·배치·상호작용·계약 validator
- MCP 도구 5개
- `playwright-core` 기반 관리형 Chrome 런타임
- 원자적 추천 초안·`CreationBatch` 저장, 항목별 재개와 중복 생성 방지

추천 초안과 배치는 `drafts.json`, 항목별 생성 작업은 `creation-jobs.json`에 인증 정보 없이 저장합니다. 외부 쓰기 전에 각 작업을 저장하고, 고유 프로젝트 제목 조회로 불확실한 재시도를 조정합니다. 로그인·Chrome 실행 같은 일시 오류가 나면 성공한 항목은 보존하고 실패한 번호부터 다시 시도합니다. 상태 파일을 읽을 수 없으면 덮어쓰지 않고 `.corrupt-*` 백업으로 옮긴 뒤 빈 상태로 다시 시작합니다.

## 동시 실행

Codex와 Claude Code는 같은 stdio MCP 명령을 등록할 수 있지만 하나의 전용 Chrome 프로필은 동시에 한 프로세스만 열 수 있습니다. v0.3은 한 번에 한 AI 앱을 쓰는 단일 사용자 구조입니다. `server.lock`이 살아 있는 프로세스를 확인해 두 번째 서버를 시작 전에 차단합니다.

## 확장 경계

`RemoteRecommendationProvider`, `AdditionalTemplateProvider`, `StudentActivityPublisher`, `DesktopDistributionChannel`은 미래 기능의 인터페이스만 선언합니다. 현재 버전에는 가짜 원격 호출이나 학생 배포 기능이 없습니다.
