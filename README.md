# MathCanvas AI 활동지 생성 도구

Codex 또는 Claude Code와 대화해 새 MathCanvas 활동지를 만드는 로컬 MCP 도구입니다. 별도 Chrome 추가 기능이나 화면 원격 조작 기능을 설치하지 않습니다. MCP 서버가 MathCanvas 전용 Chrome 창을 열고, 교사는 그 창에서 직접 로그인합니다.

현재 검증된 활동은 초등 5학년 권장 `분모가 다른 분수의 크기 비교`입니다. 학생은 두 분수 띠를 같은 출발선에 옮겨 길이를 비교하고 `<` 또는 `>` 기호를 놓습니다. 생성 전 대화에는 학년·문제 수·난이도·조작 방식 추천과 교사용 정답지가 함께 나옵니다.

## 설치

### macOS

Finder에서 `scripts/install-macos/install.command`를 실행합니다.

### Windows

PowerShell에서 다음 명령을 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows\install.ps1
```

설치 스크립트는 의존성 설치, 빌드, Codex·Claude Code MCP 등록과 실행 환경 진단을 수행합니다. 전체 테스트는 개발 환경에서 다음 명령으로 실행합니다.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm run doctor
pnpm run smoke:browser
```

## 처음 사용하는 대화

1. `MathCanvas 전용 Chrome을 열어 줘.`
2. 새로 열린 창에서 교사가 직접 로그인합니다.
3. 같은 창에서 `내 캔버스` 화면까지 이동합니다.
4. `MathCanvas 연결 상태를 확인해 줘.`
5. `5학년 분모가 다른 분수의 크기 비교 활동지를 추천해 줘.`
6. 추천을 확인한 뒤 `이대로 새 활동지를 만들어 줘.`

생성에 성공하면 같은 전용 Chrome에 새 MathCanvas 편집 탭이 열립니다. 기존 캔버스는 수정하지 않습니다.

자세한 첫 연결 안내는 [ONBOARDING_KO.md](./ONBOARDING_KO.md)를 봅니다.

## 구성

- `apps/mcp-server`: Codex·Claude Code 공용 stdio MCP 서버
- `packages/managed-browser`: 별도 영구 프로필로 Google Chrome을 실행하는 제한형 런타임
- `packages/curriculum`: 공식 성취기준 우선 교육과정 해석
- `packages/templates`: 검증된 활동 패턴
- `packages/mathcanvas-compiler`: `ActivitySpec`을 MathCanvas 객체로 변환
- `packages/validator`: 수학·교육·배치·API 계약 검증
- `packages/contracts`: 승인·활동·검증 데이터 계약

## 안전 원칙

- MathCanvas 로그인 토큰은 페이지 안에서만 읽고 사용합니다.
- MCP 응답과 로컬 작업 파일에 토큰·비밀번호·Authorization 헤더를 저장하지 않습니다.
- 교사가 직전 추천안을 명시적으로 승인해야 새 프로젝트를 만듭니다.
- 로그인·Chrome 실행 같은 일시 오류 뒤에는 같은 추천안과 같은 문제로 다시 시도합니다.
- 생성 직전 payload 해시와 MathCanvas 객체 계약을 다시 검사합니다.
- 새 프로젝트 `POST`만 허용하며 기존 프로젝트 수정·삭제 도구는 없습니다.
- 전용 Chrome 프로필은 `~/.mathcanvas-ai-authoring/chrome-profile`에 저장됩니다.

## 현재 제한

- Chrome 데스크톱, Windows·macOS만 지원합니다.
- 같은 전용 Chrome 프로필을 동시에 열 수 없으므로 Codex와 Claude Code를 동시에 사용하지 않습니다.
- 서버 잠금이 두 AI 앱의 동시 실행을 감지해 로컬 작업 파일 손상을 막습니다.
- 로그인, CAPTCHA, 2단계 인증은 교사가 전용 창에서 직접 처리합니다.
- 학생 링크 자동 발행과 원격 AI 서비스는 구현하지 않았습니다.
- MathCanvas 내부 웹 계약은 공개 SDK가 아닙니다. 계약이 바뀌면 생성하지 않고 중단합니다.
- 여러 교사에게 배포하기 전 [DISTRIBUTION_PERMISSION.md](./DISTRIBUTION_PERMISSION.md)의 허가 범위를 확정해야 합니다.
