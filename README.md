# MathCanvas AI Authoring

교사가 Codex 또는 Claude Code와 대화해 검증된 MathCanvas 활동지를 만드는
로컬 제작 도구입니다. Chrome 확장 프로그램과 Computer Use를 쓰지 않으며,
로컬 stdio MCP 서버와 전용 Chrome 프로필을 사용합니다.

현재 검증된 템플릿은 초등 5학년 `[6수01-07]`의
`분모가 다른 분수의 크기 비교`입니다. 템플릿 버전은 `2.3.0`입니다.

## 사용 흐름

1. Codex 또는 Claude Code에서 MathCanvas 전용 Chrome을 열어 달라고 말합니다.
2. 열린 Chrome에서 교사가 직접 로그인하고 `내 캔버스`까지 들어갑니다.
3. 학년·문제 수·난이도·조작 방식을 말합니다.
4. AI 추천안을 확인한 뒤 새 활동지 생성을 승인합니다.
5. 생성이 끝나면 첫 번째 MathCanvas 편집 화면이 열리고, 대화에는 전체
   편집 URL이 순서대로 표시됩니다.

문제 수가 4개면 한 문제짜리 새 캔버스 4개를 만듭니다. 기존 캔버스는
수정하거나 삭제하지 않습니다. 자세한 첫 연결 안내는
[ONBOARDING_KO.md](./ONBOARDING_KO.md)를 봅니다.

## 현재 활동 구조

- 한 캔버스 한 문제, `1280×800`, `16:10`
- 시작점이 일부러 어긋난 두 분수 띠
- 학생 행동: 두 띠를 같은 출발선으로 이동 → 관계 기호 이동 → 까닭 한 줄 입력
- 준비 위치의 띠 끝점은 실제 정답과 반대 인상을 주어, 정렬하지 않고는
  정답을 알 수 없게 설계
- 자동 채점·오답 피드백·학생 응답 수집은 현재 범위에 포함하지 않음

## 구성

- `apps/mcp-server`: Codex·Claude Code 공용 stdio MCP 서버
- `packages/managed-browser`: 전용 Chrome 프로필을 쓰는 제한형 런타임
- `packages/curriculum`: 공식 성취기준 우선 교육과정 해석
- `packages/templates`: 검증된 활동 패턴
- `packages/mathcanvas-compiler`: MathCanvas 네이티브 객체 컴파일
- `packages/validator`: 수학·교육·레이아웃·API 계약 검증
- `packages/contracts`: 승인·활동·검증 데이터 계약

## 안전 원칙

- MathCanvas 토큰과 쿠키는 페이지 컨텍스트 밖으로 반환하거나 저장하지 않습니다.
- 교사가 직전 추천안을 명시적으로 승인해야 새 캔버스를 만듭니다.
- 생성 직전 payload 해시와 객체 계약을 다시 검사합니다.
- 새 프로젝트 `POST`만 허용하며 수정·삭제 도구는 없습니다.
- 일부 생성 실패 뒤에는 성공 항목을 보존하고 빠진 항목만 다시 시도합니다.

## 현재 제한

- Windows·macOS 데스크톱 Chrome만 지원하며 모바일은 지원하지 않습니다.
- 로그인·CAPTCHA·2단계 인증은 교사가 직접 처리합니다.
- MathCanvas 내부 웹 계약은 공개 SDK가 아니므로 계약이 바뀌면 안전하게 중단합니다.
- 학생 링크 자동 발행, 자동 채점, 응답 분석, 교사 대시보드는 구현하지 않았습니다.
- 여러 교사 배포 전 Windows 실기기와 깨끗한 사용자 계정 설치 검증이 남아 있습니다.

검증 결과와 현재 편집 URL은 [REPORT.md](./REPORT.md)를 봅니다.
