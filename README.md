# MathCanvas AI 활동지 생성 도구

Codex 또는 Claude Code와 대화해 새 MathCanvas 활동지를 만드는 로컬 MCP 도구입니다. 별도 Chrome 추가 기능이나 화면 원격 조작 기능을 설치하지 않습니다. 교사는 처음 한 번만 전용 Chrome에서 로그인하고, 이후 생성과 검증은 같은 프로필의 headless Chrome에서 실행됩니다.

분수·수 감각·등식·시각과 시간·길이·자료 해석·자릿값에 더해 반복 규칙, 곱셈의 의미, 가능성 비교까지 17종 활동이 현재 화면의 headless canary를 통과해 `released` 상태입니다. 열일곱 활동 모두 구조 생성과 수학적 판단·오개념 갈등·자기검증·교실 언어·텍스트 배치 게이트를 통과해야 하며, 현재 해시와 결속된 canary가 없으면 실제 생성을 막습니다.

- 분수 크기 비교 (`released`): 2~6문제, 쉬움·보통·어려움, 분모 관계 혼합·서로소·배수
- 동치분수 (`released`): 2~6문제, 기준 띠 1개와 분수 띠 6개를 예상·선택·비교·설명
- 10 만들기 (`released`): 2~5문제, 카드 6장 중 합이 10인 두 쌍을 예상·구성·10칸 확인·다른 방법과 까닭 기록
- 등호 양쪽의 값 맞추기 (`released`): 3~4학년 권장, 2~4문제, `a+b=c+□`의 수 카드 선택·18칸 끝점 비교·설명과 수정
- 접시저울로 합 찾기 (`released`): 4학년 권장, 2~4문제, 먼저 예상·오개념 카드 선택·저울 기울기 확인·설명과 수정
- 짧은바늘 위치 판단 (`released`): 2학년 권장, 2~4문제, 위치 예상·긴바늘 조작·짧은바늘 연동 확인·설명과 수정
- 걸린 시간 (`released`): 2학년 권장, 2~4문제, 시간 예상·시 경계를 넘는 긴바늘 조작·60진법 확인·설명과 수정
- 같은 분모 분수 덧셈 (`released`): 4학년 권장, 2~4문제, 합 선택·두 분수 띠 이어 붙이기·같은 단위 확인·설명과 수정
- 1을 넘는 같은 분모 분수 덧셈 (`released`): 4학년 권장, 2~4문제, 가분수 합 선택·두 분수 띠 이어 붙이기·1의 금을 넘는 길이 확인·설명과 수정
- 공통 단위로 더하는 분모가 다른 분수의 덧셈 (`released`): 5학년 권장, 2~3문제, 오개념 답 선택·서로 다른 분수 띠 이어 붙이기·공통 단위 자의 칸 경계 확인·통분 방법 설명과 수정
- 공통 단위로 빼는 분모가 다른 분수의 뺄셈 (`released`): 5학년 권장, 2~3문제, 오개념 답 선택·빼는 분수 띠를 오른쪽 끝에 맞춰 덮기·남은 공통 단위 칸 확인·통분 방법 설명과 수정
- 막대그래프 눈금 한 칸의 값 (`released`): 4학년 권장, 2~3문제, 기준 막대에서 한 칸의 값 결정·다른 막대 해석·설명과 수정
- 1 cm 단위 반복 길이 재기 (`released`): 2학년 권장, 2~3문제, 눈금값과 길이 구별·1 cm 막대 반복·설명과 수정
- 십 모형 10개와 100칸의 자릿값 (`released`): 2학년 권장, 2~3문제, 오개념 수 선택·서로 다른 묶음판 10칸 채우기·10줄 100칸 확인·자릿값 설명과 수정
- 가장 짧은 반복 단위 찾기 (`released`): 2학년 권장, 2~3문제, 반복 단위 길이 선택·패턴 블록으로 다음 무늬 완성·설명과 수정
- 묶음 배열과 곱셈식 연결 (`released`): 2학년 권장, 2~3문제, 곱셈식 선택·한 묶음 수와 묶음 수 확인·두 수의 뜻 설명과 수정
- 두 주머니 가능성 비교 (`released`): 6학년 권장, 2~4문제, 전체 공과 빨강 공 수 확인·관계 선택·같은 전체의 띠 비교·설명과 수정

등록되지 않은 속성이나 검증 범위 밖 값은 임의로 생성하지 않고, 가장 가까운 안전한 기본안을 제안합니다.

현재 품질과 경쟁 서비스 대비 강점·공백은
[인터랙티브 수학 활동 품질 점수표](./reports/INTERACTIVE_MATH_QUALITY_SCORECARD.md)에
증거 기준으로 기록합니다.

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

1. 프로젝트 폴더에서 `pnpm mathcanvas:login`을 실행합니다.
2. 새로 열린 전용 Chrome에서 교사가 직접 로그인합니다.
3. 같은 창에서 `내 캔버스` 화면까지 이동합니다.
4. `MathCanvas 연결 상태를 확인해 줘.`
5. `5학년 분모가 다른 분수의 크기 비교 활동지를 추천해 줘.`
6. 추천을 확인한 뒤 `이대로 새 활동지를 만들어 줘.`

생성에 성공하면 MathCanvas 편집 링크를 반환합니다. 사용자 화면을 자동으로 전환하지 않으며 기존 캔버스는 수정하지 않습니다.

자세한 첫 연결 안내는 [ONBOARDING_KO.md](./ONBOARDING_KO.md)를 봅니다.

## 교사용 수업 준비 화면

### macOS 앱으로 실행

이 Mac에는 `/Applications/MathCanvas 수업 준비.app`을 설치할 수 있습니다. 설치 후에는 터미널을 열지 않고 응용 프로그램에서 `MathCanvas 수업 준비`를 더블클릭합니다. 실행 중에는 메뉴 막대의 `M`에서 화면을 다시 열거나 앱을 종료할 수 있습니다.

소스에서 앱을 처음 만들거나 업데이트한 뒤 다시 설치할 때만 다음 명령을 사용합니다.

```bash
pnpm mathcanvas:app:macos:install
```

현재 macOS 시험판은 이 프로젝트 폴더와 로컬 Node.js를 사용합니다. 프로젝트 폴더를 이동하거나 지운 뒤에는 앱을 다시 설치해야 합니다. 배포판에서는 Node 실행 환경을 함께 묶을 예정입니다.

### 터미널에서 실행

앱을 설치하지 않은 개발 환경에서는 다음 명령으로도 실행할 수 있습니다.

```bash
pnpm mathcanvas:ui
```

브라우저에 `수업 준비 책상`이 열립니다. 가르칠 내용과 학생이 어려워하는 점을 적고 학년·문항 수·생각의 깊이를 고르면, 검증된 활동의 학습 흐름을 먼저 보여줍니다. 교사가 내용을 확인하고 `네, 만들게요`를 누른 뒤에만 새 MathCanvas 활동을 만듭니다. 내부 추천안 번호나 해시 같은 기술 정보는 화면에 표시하거나 브라우저에 저장하지 않습니다.

## 구성

- `apps/mcp-server`: Codex·Claude Code 공용 stdio MCP 서버
- `apps/teacher-ui`: 교사가 자연어와 세 가지 선택으로 활동을 준비하는 로컬 화면
- `packages/authoring-runtime`: MCP와 교사용 화면이 함께 사용하는 생성 서비스와 로컬 상태 경계
- `packages/managed-browser`: 별도 영구 프로필로 Google Chrome을 실행하는 제한형 런타임
- `packages/curriculum`: 공식 성취기준 우선 교육과정 해석
- `packages/templates`: 등록된 blueprint와 유한 variation envelope
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
- 연결 확인은 사용자 창을 앞으로 가져오지 않습니다. 로그인 창은 교사가 명시적으로 열기를 요청할 때만 엽니다.
- 여러 교사에게 배포하기 전 [DISTRIBUTION_PERMISSION.md](./DISTRIBUTION_PERMISSION.md)의 허가 범위를 확정해야 합니다.
