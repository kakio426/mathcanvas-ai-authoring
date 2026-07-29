# MathCanvas 계약

검증일: 2026-07-29

계약 버전: `2.0.0`

이 문서는 공개 SDK 설명이 아니라, 허가받은 범위에서 현재 MathCanvas 웹 앱과 공개 프로젝트 fixture를 관찰해 고정한 내부 호환 계약입니다.

## 허용된 외부 쓰기

- 메서드: `POST`
- 경로: `/api/project`
- 목적: 새 프로젝트 생성
- 기존 프로젝트용 `PUT`, `PATCH`, `DELETE`: 제품 코드에 없음

생성 payload의 최상위 필드는 다음으로 제한합니다.

- `projectTitle`
- `categoryId`
- `contentsJson`
- `canvasOption`
- `isShowMenuOnActivity`
- `isNoteworthy`
- `tags`
- `studyLevel`

`categoryId`는 `수와 연산`의 현재 ID `rJa0d46MAy`를 사용합니다. 생성 전에 관리형 Chrome 런타임이 `/api/project-category`에서 이름과 ID가 함께 맞는지 확인합니다.

같은 origin의 공개 기준 프로젝트 2개에서 분모 1~12 전체의 `svgId`, `count`, `divider`, 전체 폭, 조각 폭과 이동 필드를 확인합니다. 단위 3분의 1과 온전한 3분의 3은 `width`, `cx`, 양쪽 내부 좌표까지 대조합니다. 같은 검사에서 `input-text`, `math-latex`, `drawElem`의 핵심 필드와 `moduleArr.Unit01.NO03FM`도 확인합니다. 일반 창 열기는 로그인 상태만 읽고, 명시적인 연결 확인과 외부 쓰기 직전에는 이 전체 계약을 매번 새로 검사합니다. 검사에 실패하면 새 프로젝트를 만들지 않습니다.

분모별 ID는 `fixtures/mathcanvas/fraction-svg-map.json`, 관찰한 최소 객체 필드는 `fixtures/mathcanvas/native-object-contract.json`에 개인정보와 객체 ID를 제거해 보관합니다. 현재 공개 객체에서 `math-latex.fill`은 `transparent`, `math-latex.isMoveRotateHandler`는 `false`입니다. 번들 URL·SHA-256·route 대조 결과는 `fixtures/mathcanvas/bundle-observation.json`에 기록합니다. 학생 이동 가능 여부는 `lockIds` 포함 여부와 함께 검사합니다. `drawElem` 사각형은 `width`·`height`가 아니라 `point1`·`point2`·`coordinates`를 실제 도형 크기 계약으로 사용합니다.

프로젝트 제목에는 `1/N`부터 `N/N`까지 순서를 넣고, 끝에는 승인된 `CanvasActivitySpec`에서 만든 12자리 고유 표식을 붙입니다. 생성 직전 `GET /api/project`로 같은 제목을 조회하므로, 브라우저 재시도나 불확실한 5xx 응답 뒤 이미 만들어진 프로젝트가 있으면 새 POST 대신 기존 프로젝트 ID를 사용합니다. 현재 웹 앱의 `내 캔버스` 화면은 `offset=1`을 첫 페이지로 사용하며 `sortCondition=createdAt`, `sortOrder=desc`로 조회합니다. 런타임도 같은 1-기반 계약을 사용합니다.

현재 웹 앱의 프로젝트 편집 route는 `view/:id`, 학생용 열람 route는 별도 `viewer/:id`입니다. 앱 자체도 새 프로젝트 POST 성공 뒤 응답의 `projectId`를 route 이름 `view`의 `id`로 넘깁니다. 게시하지 않은 프로젝트의 `viewer/:id`는 빈 화면이므로 이 도구가 학생 활동을 게시하거나 링크를 만든다고 표시하지 않습니다. 배치 생성 중에는 편집 route로 이동하지 않고, 모든 항목이 성공한 뒤 첫 프로젝트의 `/ko/view/{projectId}`를 같은 관리 탭에 엽니다. 전체 편집 URL은 MCP 응답에 순서대로 반환합니다.

## 로그인 사전 검사

MathCanvas 페이지 컨텍스트에서 `/api/auth/me`를 호출합니다. 토큰이 없거나 401·403이면 `login-required`로 멈춥니다. 검사 결과에는 토큰을 넣지 않습니다.

## 분수 띠 객체

공개 기준 프로젝트 `P_yK4Aa6XomJ`에서 확인한 분모 1~12의 `NO03FM` SVG ID를 고정 fixture로 관리합니다. 분수 띠는 다음 관계를 만족해야 합니다.

- `count = numerator`
- `divider = denominator`
- `perWidth = wholeWidth / denominator`
- `width = perWidth × numerator`
- 비교하는 두 띠의 `wholeWidth`와 출발선 X가 같음

지원하지 않는 SVG ID, 크기 관계, lock 구조가 나오면 validator가 쓰기를 막습니다.

새 활동 캔버스는 `1280×800`의 `16:10` 한 화면이며 문제를 정확히 하나만 포함합니다. 주황색 왼쪽 띠, 하늘색 오른쪽 띠, 눈에 보이는 빨간 `출발선`, 시각 안내 칸, 이동 가능한 `<`·`>` 기호, 학생이 한 줄로 입력할 수 있는 비교 이유 칸을 둡니다. 분수 띠는 잠기지 않지만 크기 조절·회전 핸들을 노출하지 않습니다. `NO03FM` 객체는 자체 `getFocus()`가 조각 수를 바꾸는 `resize`를 항상 만들기 때문에, 띠마다 한 항목짜리 `group-element`를 만들고 `groupId`로 묶습니다. 실제 편집기에서 그룹 선택 시 `resize` 0개, 회전 핸들 없음, 드래그 이동 성공을 확인했습니다. validator는 띠의 `groupId`, 그룹의 `ids`, `viewBox`, 잠금·핸들 플래그를 모두 검사합니다. 안내 칸은 `visual-guide-only`이며 확인되지 않은 스냅·정답 판정 동작을 약속하지 않습니다.

## 무결성과 실패 정책

- `ActivitySetSpec`, `CanvasActivitySpec`, compiled payload, 승인 영수증에 SHA-256 해시를 사용합니다.
- 페이지 컨텍스트가 브라우저 쪽에서 payload 해시를 다시 계산합니다.
- 배치와 항목별 작업 ID는 한 번만 등록하며 같은 payload의 중복 대기·완료를 거부하고 재시작 가능한 로컬 스냅샷에 저장합니다.
- API 응답에 유효한 `projectId`가 없으면 성공으로 처리하지 않습니다.
- 계약 불일치 시 UI 자동화로 우회하지 않습니다.

관찰 근거 메타데이터는 `fixtures/mathcanvas/contract-metadata.json`에 보관합니다.
