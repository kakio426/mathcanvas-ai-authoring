# MathCanvas AI 활동지 생성 도구

Codex 또는 Claude Code와 대화해 검증된 새 MathCanvas 프로젝트를 만드는 로컬 도구입니다. 로그인 정보는 Chrome 페이지 안에서만 사용하며, 기존 프로젝트는 수정하지 않습니다.

현재 검증된 활동은 초등 5학년 권장 `분모가 다른 분수의 크기 비교` 한 종류입니다. 분수 띠를 같은 출발선에 옮겨 길이를 비교한 뒤 `<` 또는 `>` 기호를 놓는 활동을 만들고, 대화에는 교사용 정답지도 함께 보여 줍니다. 대표 문제는 [최종 활동지 예시](./examples/FINAL_ACTIVITY_SAMPLE.md)에서 볼 수 있습니다.

## 빠른 설치

- macOS: `scripts/install-macos/install.command`를 실행합니다.
- Windows: PowerShell에서 `scripts\install-windows\install.ps1`을 실행합니다.
- 설치 뒤 [ONBOARDING_KO.md](./ONBOARDING_KO.md)의 Chrome 설정을 마칩니다.

개발 환경에서는 다음 명령을 사용합니다.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm pairing-code
pnpm run doctor
```

## 대화 사용 예

1. `MathCanvas 연결 상태를 확인해 줘.`
2. `5학년 분모가 다른 분수의 크기 비교 활동지를 추천해 줘.`
3. AI가 보여 준 학년, 문제 수, 난이도, 조작 방식과 교사용 정답지를 확인합니다.
4. 조건이 맞으면 `이대로 새 활동지를 만들어 줘.`라고 승인합니다.
5. 생성이 끝나면 Chrome에 새 MathCanvas 편집 탭이 열립니다.

추천 단계에서는 MathCanvas에 아무것도 만들지 않고, 재시작 복구용 초안만 이 컴퓨터에 저장합니다. 새 프로젝트 생성은 교사가 직전 추천안을 명시적으로 승인한 뒤에만 실행됩니다.

## 구성

- `apps/mcp-server`: Codex·Claude Code 공용 MCP 서버
- `apps/chrome-extension`: 로그인된 MathCanvas 탭과 로컬 서버를 잇는 얇은 브리지
- `packages/curriculum`: 공식 성취기준 우선 교육과정 해석
- `packages/templates`: 검증된 활동 패턴
- `packages/mathcanvas-compiler`: `ActivitySpec`을 MathCanvas 객체로 변환
- `packages/validator`: 수학·교육·배치·API 계약 검증
- `packages/bridge-protocol`: 인증된 로컬 작업 큐와 중복 생성 방지

자세한 설계는 [ARCHITECTURE.md](./docs/ARCHITECTURE.md), 보안 경계는 [SECURITY.md](./docs/SECURITY.md), 검증 현황은 [REPORT.md](./REPORT.md)를 봅니다. 독립 평가 점수와 남은 실서비스 확인 항목은 [Claude Opus 5 심사](./CLAUDE_OPUS_5_REVIEW.md)에 정리했습니다.

## 현재 제한

- Chrome 데스크톱, Windows·macOS만 지원합니다.
- 한 컴퓨터에서 Codex와 Claude Code가 같은 로컬 포트를 사용하므로 동시에 실행하지 않습니다.
- 학생 링크 자동 발행, Chrome 웹 스토어 배포, 원격 AI 서비스는 아직 구현하지 않았습니다.
- MathCanvas 내부 웹 계약은 공개 SDK가 아닙니다. 계약 사전 검사가 실패하면 프로젝트를 만들지 않습니다.
- 추천 초안과 작업 상태는 인증 정보 없이 로컬에 저장되어 앱이 재시작되어도 같은 승인을 이어갑니다. 새 추천을 다시 승인하면 새 캔버스를 만듭니다.
- 여러 교사에게 배포하기 전 [DISTRIBUTION_PERMISSION.md](./DISTRIBUTION_PERMISSION.md)의 허가 증빙과 배포 조건을 확정해야 합니다.
