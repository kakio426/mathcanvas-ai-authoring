# 구현·검증 보고서

검증일: 2026-07-29
현재 템플릿: `fraction.compare.unlike-denominators.visual-v1` `2.3.0`

## 결과

확장 프로그램과 Computer Use 없이 Codex·Claude Code가 함께 쓸 수 있는
로컬 stdio MCP 방식으로 구현했습니다. 사용자 제보 실패 화면은
`qa/regressions/user-reported-1630x1122/`에 영구 회귀 증거로 보존했고,
기존 캔버스는 수정하거나 삭제하지 않았습니다.

적용 하네스는 프로젝트 전용 `eduitit-mathmon-lesson`의
화면·조작·회귀 계약, `middleofmath-content-review`, `design-review`,
`humanizer`, `ask-ship`, `chrome:control-chrome`입니다. 매스몬 표지·보상
자산 계약은 범위가 달라 적용하지 않았습니다.

## 최종 신규 캔버스

| 순서 | 문제 | 정답 | projectId | 편집 URL |
|---|---|---|---|---|
| 1/4 | `3/8 ? 3/5` | `3/8 < 3/5` | `XNJTuV` | `https://mathcanvas.vivasam.com/ko/view/XNJTuV` |
| 2/4 | `5/6 ? 3/5` | `5/6 > 3/5` | `feeTES` | `https://mathcanvas.vivasam.com/ko/view/feeTES` |
| 3/4 | `4/5 ? 4/7` | `4/5 > 4/7` | `QiiLPy` | `https://mathcanvas.vivasam.com/ko/view/QiiLPy` |
| 4/4 | `3/4 ? 3/5` | `3/4 > 3/5` | `8HejZu` | `https://mathcanvas.vivasam.com/ko/view/8HejZu` |

배치 `batch-c591e3bc-a4da-4056-82f6-744aaaa840c4`의 네 항목이 모두
성공했습니다. 최종 4개는 교사에게 넘길 초기 상태를 보존한 읽기 전용
검증본이며, 학생 게시나 배포는 하지 않았습니다.

## v2.3.0 핵심 보완

- 준비 상자의 두 띠가 실제 대소 관계와 반대 끝점 단서를 보이게 해,
  같은 출발선으로 옮기지 않고는 정답을 판단할 수 없게 했습니다.
- 분수 분자·가로선·분모를 같은 중심축에 배치했습니다.
- 출발선 안내와 `출발선` 이름의 겹침을 없앴습니다.
- 입력 라벨과 입력 객체 사이에 실제 간격을 뒀습니다.
- QA가 화면 크기를 바꾼 뒤 편집기를 다시 불러오고, 정확한 viewport와
  새 레이아웃을 확인하도록 고쳤습니다.
- 입력값은 실제 `.text-edit`만 읽어 DOM 잡음을 제거했습니다.

## 자동 검증

- TypeScript typecheck: PASS
- Vitest: 15개 파일, 100개 테스트 PASS
- 전체 workspace build: PASS
- validator가 정답 노출 준비 위치, 분수 중심 불일치, 고정 라벨 겹침,
  입력 간격 부족, 캔버스 이탈을 fail-closed로 차단
- `pnpm audit --prod`: 알려진 production 취약점 0건
- `pnpm run doctor`: Node·빌드·Chrome·Codex·Claude Code 전부 PASS
- `pnpm run smoke:browser`: 실제 관리형 Chrome에서 MathCanvas
  `login-required` 안전 상태 PASS

## 텍스트 넘침·요소 겹침 QA

최종 네 캔버스를 실제 MathCanvas 편집기에서 각각 새로 불러왔습니다.

| 화면 | 확인 수 | 결과 |
|---|---:|---|
| 사용자 제보 크기 `1630×1122`, DPR 1 | 4 | PASS |
| 기준 크기 `1280×800`, DPR 1 | 4 | PASS |
| 태블릿 가로 `1024×768`, DPR 1 | 4 | PASS |

총 12개 초기 화면에서 필수 객체 누락, 페이지 넘침, 작업 영역 이탈,
패널·행 교차, 자식 객체 이탈, 도구 모음 충돌은 0건입니다. 분수 조립
객체의 중심축, 준비 위치의 반대 끝점 단서, 고정 라벨 분리, 입력 간격도
모두 통과했습니다.

근거: `qa/live-remediation-2026-07-29/final-v230/`

## 실제 조작 QA

최종본과 같은 v2.3.0 계약으로 새 검증 캔버스 4개를 만들고, 네 문제
모두에서 전체 조작을 실행했습니다.

| 검사 | 결과 |
|---|---|
| 조작 viewport가 정확히 `1630×1122` | 4/4 PASS |
| 새로 불러온 `1630×1122` 레이아웃 | 4/4 PASS |
| 준비 위치가 정답과 반대 끝점 단서 | 4/4 PASS |
| 첫째·둘째 띠를 공통 출발선으로 이동 | 4/4 PASS |
| 알맞은 기호를 관계 칸으로 이동 | 4/4 PASS |
| 이동한 띠와 고정 문구 교차 | 0건 |
| 기호와 양쪽 분수 카드 교차 | 0건 |
| 수학적으로 맞는 까닭 입력·containment | 4/4 PASS |

근거: `qa/live-remediation-2026-07-29/opus-remediation-v230/`

## 교육·문구 QA

- 공식 성취기준 `[6수01-07]`, 권장 5학년
- 교육부 원문 우선, `DECK6/korean-elementary-learning-map`
  `3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c`는 보조
- 같은 전체 폭과 같은 목표 출발선
- 분모가 다르고 크기가 같은 쌍 제외
- Middle of Math 내용 감사: 문제·정답 오류 0건
- Humanizer 학생 문구 QA: A

학생 문구는 `시작점이 다른 두 띠를 출발선에 맞춰요.`,
`1. 띠를 옮겨요`, `같은 출발선에 맞춰요`, `2. 기호를 놓아요`,
`3. 까닭을 써요`, `어느 띠가 더 긴지 한 줄로 써요.`입니다.

## 보안과 제품 경계

- stdio-only, 수신 포트 없음
- MathCanvas 고정 origin
- 새 프로젝트 `POST /api/project`만 허용
- 승인·세트·캔버스·payload 해시 결합
- 토큰·쿠키 비노출
- 부분 실패 재개와 동시 생성 직렬화
- 기존 캔버스 수정·삭제 API 없음

## 남은 배포 게이트

Windows 실기기, macOS 깨끗한 계정, 서명 패키지·체크섬·롤백,
계약 변경 감시와 비공개 교사 파일럿은 여러 교사 배포 전에 필요합니다.
학생 미리보기·게시·자동 채점·교사 대시보드는 현재 편집 화면 제작 범위가
아닙니다.

## 독립 심사

Claude Opus 5 재심 결과는 **PASS**, 기술 **92/100**, 활동지
**90/100**입니다. 미해결 P0·P1은 각각 0건이며 최초 지적 7건은 모두
RESOLVED로 판정됐습니다.

독립 Codex 재심도 **PASS**, 기술 **92/100**, 활동지 **89/100**,
미해결 P0·P1 0건입니다.

남은 P2는 Windows에서 현재 QA 스크립트를 그대로 재현할 수 없는 점,
목표 안내와 출발선 이름이 겹치지는 않지만 세로 여유가 작은 점,
`1024×768`에서 띠 안 단위분수 글자가 작은 점입니다. 자세한 Opus 5
결과는 `CLAUDE_OPUS_5_REVIEW.md`에 있습니다.
