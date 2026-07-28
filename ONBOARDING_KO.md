# 처음 연결하기

처음 한 번만 설치와 Chrome 연결을 하면 됩니다. 교사는 MathCanvas 비밀번호나 로그인 코드를 이 도구에 입력하지 않습니다.

## 1. 설치 파일 실행

### macOS

Finder에서 `scripts/install-macos/install.command`를 실행합니다. macOS가 처음 실행을 막으면 파일을 Control-클릭한 뒤 `열기`를 누릅니다.

### Windows

PowerShell을 열고 프로젝트 폴더에서 다음 명령을 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows\install.ps1
```

설치가 끝나면 화면에 두 값이 나옵니다.

- Chrome 확장 프로그램 폴더
- 64자리 로컬 연결 코드

연결 코드는 MathCanvas 로그인 정보가 아닙니다. 이 컴퓨터의 확장 프로그램과 로컬 서버를 서로 확인하는 값입니다.

## 2. Chrome 확장 프로그램 불러오기

1. Chrome 주소창에 `chrome://extensions`를 입력합니다.
2. 오른쪽 위 `개발자 모드`를 켭니다.
3. `압축해제된 확장 프로그램을 로드합니다`를 누릅니다.
4. 설치 결과에 나온 `apps/chrome-extension/dist` 폴더를 고릅니다.
5. `MathCanvas AI 연결 도구` 카드에서 `세부정보`를 누릅니다.
6. `확장 프로그램 옵션`을 열고 설치 결과의 64자리 연결 코드를 붙여 넣습니다.
7. `연결 코드 저장`을 누릅니다.

## 3. MathCanvas 로그인 화면 준비

1. Chrome에서 [MathCanvas 내 캔버스](https://mathcanvas.vivasam.com/ko/myCanvas)를 엽니다.
2. 비바샘 계정으로 직접 로그인합니다.
3. 로그인 뒤 `내 캔버스` 화면이 보이는 탭을 열어 둡니다.

편집기 안으로 들어갈 필요는 없습니다. 로그인된 `내 캔버스` 화면까지만 열면 됩니다.

## 4. Codex 또는 Claude Code에서 확인

설치 중 AI 앱이 켜져 있었다면 한 번 종료하고 다시 엽니다. Codex와 Claude Code는 동시에 실행하지 않습니다.

대화창에 다음처럼 말합니다.

```text
MathCanvas 연결 상태를 확인해 줘.
```

준비되지 않았다면 AI가 다음 중 하나를 알려 줍니다.

- 확장 프로그램 연결 코드가 없음
- MathCanvas 탭이 없음
- 로그인이 필요함
- MathCanvas 계약이 현재 도구와 달라짐

`새 활동지를 만들 준비가 됐습니다`가 나오면 연결이 끝난 것입니다.

## 5. 첫 활동지 만들기

```text
5학년 분모가 다른 분수의 크기 비교 활동지를 추천해 줘.
```

AI가 추천한 학년, 문제 수, 난이도, 조작 방식과 교사용 정답지를 확인합니다. 조건을 바꾸고 싶으면 생성 전에 말합니다. 조건이 맞을 때만 다음처럼 승인합니다.

```text
이대로 새 활동지를 만들어 줘.
```

생성에 성공하면 Chrome에 새 MathCanvas 편집 탭이 열립니다. 기존 캔버스는 바뀌지 않습니다.

## 문제 해결

프로젝트 폴더에서 `pnpm run doctor`를 실행합니다. 연결 코드는 화면에 다시 표시하지 않으며, 파일 형식과 빌드 상태만 검사합니다.

- `포트 사용 중` 오류: Codex와 Claude Code 중 하나를 종료한 뒤 다시 시도합니다.
- `login-required`: Chrome의 MathCanvas 탭에서 다시 로그인합니다.
- `contract-mismatch`: 생성을 중단한 상태입니다. 화면 클릭 자동화로 우회하지 말고 도구 업데이트를 기다립니다.
- 확장 프로그램을 다시 빌드했다면 `chrome://extensions`에서 카드의 새로고침 아이콘을 누릅니다.
