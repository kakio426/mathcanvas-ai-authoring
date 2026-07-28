# 처음 연결하기

설치 뒤에는 대화와 MathCanvas 로그인만 하면 됩니다. 개발자 모드, 추가 기능 설치, 연결 코드 입력은 없습니다.

## 1. 설치하기

### macOS

1. Finder에서 프로젝트의 `scripts/install-macos/install.command`를 엽니다.
2. macOS가 막으면 파일을 Control-클릭하고 `열기`를 누릅니다.
3. 설치 완료 문구가 나올 때까지 기다립니다.

### Windows

1. 프로젝트 폴더에서 PowerShell을 엽니다.
2. 다음 명령을 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows\install.ps1
```

설치 중 Codex 또는 Claude Code가 발견되면 `mathcanvas-ai` MCP가 자동 등록됩니다.

## 2. AI 앱 다시 열기

설치할 때 Codex나 Claude Code가 켜져 있었다면 종료한 뒤 다시 엽니다. 두 앱을 동시에 실행하지 않습니다.

## 3. MathCanvas 전용 창 열기

대화창에 다음처럼 말합니다.

```text
MathCanvas 전용 Chrome을 열어 줘.
```

새 Chrome 창이 열리고 MathCanvas 화면으로 이동합니다. 이 창은 평소 사용하는 Chrome과 데이터가 섞이지 않는 MathCanvas 전용 창입니다.

## 4. 교사가 직접 로그인하기

새로 열린 창에서 다음 순서로 진행합니다.

1. 비바샘 계정으로 로그인합니다.
2. 로그인 뒤 MathCanvas로 돌아옵니다.
3. 주소가 `https://mathcanvas.vivasam.com/ko/myCanvas`인 `내 캔버스` 화면까지 들어갑니다.

편집기 안으로 들어갈 필요는 없습니다. `내 캔버스` 목록이 보이면 준비가 끝난 것입니다. 로그인 정보는 AI 대화창에 입력하지 않습니다.

## 5. 연결 확인하기

대화창으로 돌아와 다음처럼 말합니다.

```text
MathCanvas 연결 상태를 확인해 줘.
```

`새 활동지를 만들 준비가 됐습니다`라는 안내가 나오면 연결이 끝난 것입니다.

## 6. 첫 활동지 만들기

```text
5학년 분모가 다른 분수의 크기 비교 활동지를 추천해 줘.
```

AI가 학년, 문제 수, 난이도, 조작 방식과 교사용 정답지를 보여 줍니다. 원하는 조건과 다르면 생성 전에 바꿔 달라고 말합니다.

조건이 맞을 때만 다음처럼 승인합니다.

```text
이대로 새 활동지를 만들어 줘.
```

완료되면 MathCanvas 전용 Chrome에 새 편집 탭이 열립니다. 기존 캔버스는 바뀌지 않습니다.

## 문제 해결

프로젝트 폴더에서 `pnpm run doctor`를 실행합니다.

- `browser-launch-failed`: Google Chrome이 설치되어 있는지 확인합니다. 이미 열려 있는 MathCanvas 전용 창을 닫고 다시 요청합니다.
- `login-required`: 전용 창에서 로그인한 뒤 `내 캔버스`까지 이동합니다.
- `contract-mismatch`: MathCanvas 내부 형식이 바뀐 상태입니다. 생성은 중단되며 도구 업데이트가 필요합니다.
- Codex·Claude Code에서 도구가 안 보임: 설치 스크립트를 다시 실행한 뒤 AI 앱을 재시작합니다.
- 전용 창을 닫음: 다시 `MathCanvas 전용 Chrome을 열어 줘`라고 말하면 저장된 로그인 세션으로 다시 열립니다.
