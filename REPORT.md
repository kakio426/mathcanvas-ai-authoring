# 구현·검증 보고서

검증일: 2026-07-29
현재 생성기 템플릿: `fraction.compare.unlike-denominators.visual-v1` `2.4.2`

## 결과

v2.3.0 결과물은 사용자 실화면에서 확인된 결함 때문에 FAIL로 보존한다.
v2.4.1은 기존 캔버스를 수정하지 않고 전부 새 캔버스로 만들었으며,
코드·생성 계약·실제 편집 화면 검사를 통과했다.

이번 보완은 사용자 요청대로 Claude 연결 없이 Codex 단독으로 수행했다.
점수는 임의로 다시 매기지 않는다. 아래 네 편집 화면을 사용자가 직접
확인한 뒤 결과물 승인 여부를 정한다.

## v2.4.1 최종 신규 캔버스

| 순서 | 문제 | 정답 | projectId | 편집 URL |
|---|---|---|---|---|
| 1/4 | `3/8 ? 3/5` | `3/8 < 3/5` | `UVtPNy` | `https://mathcanvas.vivasam.com/ko/view/UVtPNy` |
| 2/4 | `5/6 ? 3/5` | `5/6 > 3/5` | `9aF2Cs` | `https://mathcanvas.vivasam.com/ko/view/9aF2Cs` |
| 3/4 | `4/5 ? 4/7` | `4/5 > 4/7` | `dnfp6W` | `https://mathcanvas.vivasam.com/ko/view/dnfp6W` |
| 4/4 | `3/4 ? 3/5` | `3/4 > 3/5` | `ltGL20` | `https://mathcanvas.vivasam.com/ko/view/ltGL20` |

네 캔버스는 학생 입력과 선택 객체가 없는 초기 편집 상태로 보존했다.
학생 게시·배포는 실행하지 않았다.

## 이번에 고친 결함

### 1. 분수 표현

- 읽는 분수 4개는 각각 MathCanvas `math-latex`의
  `\frac{분자}{분모}` 한 객체다.
- 기존의 분자·가로선·분모 조립 객체는 0개다.
- validator는 수식 객체 누락, 잘못된 분수값, 카드 이탈, 조립 객체 재도입을
  `native-fraction-formula-invalid`로 차단한다.
- 학생이 옮기는 띠는 기존대로 `NO03FM` 네이티브 분수 모형이다.

### 2. 상자 안 중심 정렬

- v2.4.0 화면을 실제로 재보니 보이는 분수는 카드 중심에서 가로
  `13.92~18.92px`, 세로 `5.10px`, 기호는 가로 `9.22px`, 세로
  `5.65px` 치우쳐 있었다.
- v2.4.2 생성기는 한 자리 분수 수식 상자를 `50×108`, 두 자리 수가
  들어간 분수 수식 상자를 `76×108`, 비교 기호 수식 상자를 `52×76`으로
  잡고 MathLive 글리프 bearing을 반영한 가로 보정을 적용한다.
- validator는 수식·기호의 작성 상자 중심 오차가 1px을 넘으면 생성 전에
  차단한다.
- 브라우저 QA는 SVG 그룹이나 `math-field` 호스트가 아니라 Shadow DOM의
  `.ML__mfrac`, `.ML__base`, `.ML__latex` 실제 글리프 rect를 우선 측정한다.
- 위 v2.4.1 네 캔버스의 `0.078125px` 등 기존 수치는 `math-field` 호스트
  측정 기록이다. v2.4.2부터 이 수치를 최종 글리프 중심 증거로 재사용하지
  않는다.

### 3. 글쓰기 위치

- `3. 더 긴 띠와 까닭을 써요 →`와 실제 입력칸을 서로 다른 영역으로
  분리했다.
- 입력칸은 노란 바탕과 파란 테두리를 사용하며 내용은 빈 상태다.
- 안내와 빈칸 사이 실제 간격은 32px이다.
- 빈칸을 누르면 실제 `.text-edit`가 `contenteditable=true`로 바뀐다.

### 4. 화면 크기

- 생성 payload의 기본 배율을 `canvasOption.scale=2`로 고정했다.
- 현재 MathCanvas 계약에서 이는 표시 배율 120%다.
- `1710×895`, DPR 2에서 비교판 실제 폭은 1180px이다.
- 응답 패널을 위로 재배치해 하단 도구막대와 15.5px 떨어뜨렸다.

## 자동 검증

- TypeScript typecheck: PASS
- Vitest: 15개 파일, 105개 테스트 PASS
- 전체 workspace build: PASS
- `git diff --check`: PASS
- `pnpm audit --prod`: 알려진 production 취약점 0건
- `pnpm run doctor`: Node·빌드·Chrome·Codex·Claude Code PASS
- 생성 직전 네 payload의 validator 오류: 0건
- 생성 결과: 4/4 성공

## 실제 Chrome 화면 QA

최종 네 캔버스를 실제 교사 Chrome에서 각각 새로 불러왔다.

| 검사 | 결과 |
|---|---:|
| 화면 `1710×895`, DPR 2 | 4/4 PASS |
| 기본 표시 배율 120% | 4/4 PASS |
| 비교판 실제 폭 1180px | 4/4 PASS |
| `math-latex` 분수식 4개 | 4/4 PASS |
| 조립식 분수 조각 | 0개 |
| 분수식·기호 실제 중심 오차 1px 이하 | 24/24 PASS |
| 분수식·기호 카드 밖 잘림 | 0건 |
| 글쓰기 빈칸과 안내 분리 | 4/4 PASS |
| 학습 행 사이 교차 | 0건 |
| 도구막대와 활동 영역 교차 | 0건 |
| 초기 선택 객체 | 0개 |

근거:
`qa/live-remediation-2026-07-29/final-v241-centered/metrics.json`,
같은 폴더의 네 PNG와 `creation-and-validation.json`.

중심 정렬은 추가로 `1630×1122`, `1280×800`, `1024×768`에서도 모두
1px 이하를 통과했다. 다만 120% 고정 배율에서 `1280×800`과
`1024×768`은 MathCanvas 편집 도구막대가 활동 영역을 침범해 전체 화면
PASS로 기록하지 않는다. 이 제한은
`qa/live-remediation-2026-07-29/final-v241-centered-multiview/metrics.json`
에 남겼다.

## 학생 조작 QA

최종본을 변경하지 않기 위해 별도 v2.4.1 QA 캔버스 `6WdElg`에서 아래를
실제로 실행했다.

1. 첫째 띠를 첫째 비교 자리의 출발선에 맞춤
2. 둘째 띠를 둘째 비교 자리의 출발선에 맞춤
3. 알맞은 `<` 기호를 관계 칸에 놓음
4. 빈칸을 눌러 `3/5 띠가 3/8 띠보다 더 길어요.` 입력

띠 두 개는 목표 자리의 시작점에 맞았고, 기호는 관계 칸 중심에서 가로
`0.07421875px`, 세로 `0.19921875px` 오차로 놓였으며, 입력 문장은
보이는 입력 표면 안에 들어갔다. 근거는
`qa/live-remediation-2026-07-29/centered-qa2-direct-manipulation/`이다.

## 교육·문구 QA

- 공식 성취기준 `[6수01-07]`, 권장 5학년
- 교육부 원문 우선
- `DECK6/korean-elementary-learning-map`
  `3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c` 보조
- 같은 전체 폭과 같은 목표 출발선
- 분모가 다르고 크기가 같은 쌍 제외
- 준비 위치의 띠 끝은 실제 정답과 반대 인상을 주어 정렬을 요구함
- Humanizer 학생 문구 QA: A

학생 문구는 `시작점이 다른 두 띠를 출발선에 맞춰요.`,
`1. 띠를 옮겨요`, `같은 출발선에 맞춰요`, `2. 기호를 놓아요`,
`3. 더 긴 띠와 까닭을 써요 →`다. 한 문장에 행동 하나만 두고
제작자 용어와 번역투를 사용하지 않았다.

## 보안과 제품 경계

- Chrome 확장 프로그램과 Computer Use를 사용하지 않는 stdio 로컬 구조
- MathCanvas 고정 origin
- 새 프로젝트 `POST /api/project`만 허용
- 승인·세트·캔버스·payload 해시 결합
- 토큰·쿠키 비노출
- 기존 캔버스 수정·삭제 API 없음
- 이번 작업에서 기존 캔버스 수정·삭제 0건

## 보존한 실패 증거

- v2.3.0 실패 분석: `MATHCANVAS_MENU_AUDIT.md`
- 사용자 제보 화면:
  `qa/regressions/2026-07-29-student-input-and-native-fraction-menu/`
- 과거 Claude 점수: `CLAUDE_OPUS_5_REVIEW.md`

과거 PASS와 점수는 v2.4.1의 근거로 재사용하지 않는다.

## 여러 교사 배포 전 남은 게이트

- Windows 실기기 E2E
- macOS 깨끗한 사용자 계정 설치
- 서명 패키지·체크섬·제거·롤백
- MathCanvas 계약 변경 감시
- 3~5명 교사 비공개 파일럿

이 항목은 현재 네 활동지의 편집 화면 제작 완료와 별도의 제품 배포
게이트다.
