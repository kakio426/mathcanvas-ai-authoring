# 구현·검증 보고서

검증일: 2026-07-29

## 최종 결과

확장 프로그램과 Computer Use 없이, Codex·Claude Code가 공용으로 사용할 수 있는 로컬 stdio MCP 방식으로 구현했습니다. 교사는 별도 영구 프로필의 Chrome에서 직접 로그인하고, 대화에서 추천안을 승인하면 요청한 문제 수만큼 한 문제짜리 새 MathCanvas 캔버스를 만듭니다.

이번 실서비스 검증에서는 `5학년 · 4문제 · 보통 · 분수 띠를 같은 출발선에 직접 옮기기` 조건으로 다음 네 캔버스를 만들었습니다.

| 순서 | 문제 | projectId | 편집 URL |
|---|---|---|---|
| 1/4 | `3/4 ? 3/5` | `j6Skz3` | `https://mathcanvas.vivasam.com/ko/view/j6Skz3` |
| 2/4 | `2/7 ? 1/2` | `vNnQ8d` | `https://mathcanvas.vivasam.com/ko/view/vNnQ8d` |
| 3/4 | `5/6 ? 3/5` | `bKJknc` | `https://mathcanvas.vivasam.com/ko/view/bKJknc` |
| 4/4 | `5/8 ? 3/7` | `tMY4rn` | `https://mathcanvas.vivasam.com/ko/view/tMY4rn` |

배치 ID는 `batch-4926742a-ad86-47d5-8728-35d190558aa3`이며 네 항목 모두 `succeeded`입니다. 기존 프로젝트를 수정하거나 삭제하지 않았고, 학생 링크나 활동 게시도 만들지 않았습니다.

## 자동 검증

- TypeScript typecheck: 통과
- Vitest: 15개 파일, 87개 테스트 통과
- 전체 workspace production build: 통과
- `pnpm audit --prod`: 알려진 production 취약점 없음
- macOS 설치 스크립트 zsh 구문: 통과
- 실제 Google Chrome 150 관리형 런타임: 통과
- localStorage 토큰 없이 쿠키만 있는 로그인 세션: 통과
- 공개 기준 프로젝트의 분모 1~12 및 기본 객체 계약: 통과
- 배치 부분 실패·재시작·상태 변조·동시 중복 호출 회귀 테스트: 통과
- security-audit run 2: 유효한 MEDIUM 이상 취약점 0건

Windows PowerShell 실행기는 이 Mac에 없어 Windows 실기기 설치 검증은 남아 있습니다.

## 실서비스 렌더·조작 QA

최종 1/4 캔버스를 현재 MathCanvas 편집기에서 직접 확인했습니다.

| 항목 | 결과 |
|---|---|
| 실제 새 프로젝트 POST와 projectId | 4/4 성공 |
| 제목 번호 | `1/4`부터 `4/4`까지 확인 |
| 최종 객체 수 | 캔버스당 24개 |
| 분수 띠/이동 그룹 | 각각 2개 |
| 분수 띠 선택 후 보이는 resize 손잡이 | 0개 |
| 왼쪽 띠 출발선 정렬 오차 | 0.58px |
| 오른쪽 띠 출발선 정렬 오차 | 0.58px |
| `<`·`>` 기호 드래그 | 성공 |
| 비교 까닭 한 줄 입력 | 성공 |
| 초기 띠–자리 라벨 겹침 | 0건 |
| 1024×768 화면 밖 객체 | 0/24 |

네이티브 분수 객체는 단독 선택 시 조각 수를 바꾸는 `resize` 손잡이를 항상 표시합니다. 이를 숨기는 척하지 않고, 각 띠를 MathCanvas의 `group-element`로 감싸 이동 그룹으로 만들었습니다. 실제 편집 화면에서 그룹 선택 후 `resize` 0개, 회전 손잡이 없음, 드래그 이동 성공을 확인했습니다.

학생용 `/viewer/{id}`는 활동을 게시하지 않은 프로젝트에서는 빈 화면입니다. 사용자가 요청하지 않은 학생 링크 발행·게시를 실행하지 않았으므로 학생 모드는 검증 범위에서 제외했습니다. 이 도구의 현재 완료 지점은 “교사가 편집 중인 새 캔버스 화면”입니다.

대표 증거:

- `qa/live-2026-07-29/final-1-editor-1280x720.png`
- `qa/live-2026-07-29/final-1-manipulated-1280x720.png`
- `qa/live-2026-07-29/final-1-editor-1024x768.png`
- `qa/live-2026-07-29/final-4-editor-1280x720.png`
- `qa/live-2026-07-29/probe-v4-group-selected.png`

## 교육·활동지 QA

- 공식 성취기준 `[6수01-07]`과 5~6학년군 확인
- 권장 학년 5학년
- 교육부 원문 우선, `DECK6/korean-elementary-learning-map` 고정 커밋 보조
- 같은 전체 폭 `640`과 같은 출발선 사용
- 분모가 서로 다르고 크기가 같은 쌍은 제외
- 보통 난이도 시각 차이 15~27% 적용
- `1280×800`, `16:10`, 한 캔버스 한 문제
- 학생 행동: 띠 두 개 정렬 → 비교 기호 놓기 → 비교한 까닭 한 줄 쓰기
- Humanizer 학생 문구 QA: A
- Middle of Math 내용 감사: 오류 0건
- 자동 채점, 오답 피드백, 응답 수집, 학생 배포 기능을 있는 것처럼 표시하지 않음

## 보안 결과

보안 감사 산출물은 `/Users/yubyeongju/security-audit-skill/mathcanvas-ai-authoring/run-2/`에 있습니다. `findings.json`은 스키마 검증을 통과했으며 결과는 0건입니다.

핵심 방어는 다음과 같습니다.

- stdio-only, 수신 포트 없음
- MathCanvas 고정 origin
- 새 프로젝트 `POST /api/project`만 허용
- 세트·캔버스·payload 해시와 교사 승인 결합
- 토큰·쿠키는 페이지 컨텍스트 밖으로 반환하지 않음
- 성공 항목을 보존하는 영속 배치
- 같은 draft의 동시 생성 직렬화
- 두 MCP 프로세스의 동일 프로필 사용 차단
- 상태 파일 원자적 저장과 손상 파일 격리

## 아직 남은 배포 게이트

- Windows 실기기에서 설치·Codex·Claude Code E2E
- macOS 새 사용자 계정의 깨끗한 설치
- 서명된 설치 패키지, 버전 태그, 체크섬, 제거·롤백
- MathCanvas 내부 계약 변경 감시와 업데이트 절차
- 3~5명 교사 비공개 파일럿
- 다른 학년·주제의 검증된 템플릿

학생 게시, 답 판정, 교사 대시보드는 현재 요구 범위가 아니므로 결함 목록에 넣지 않습니다. 이후 사용자가 제품 범위를 넓힐 때 별도 계획으로 다룹니다.
