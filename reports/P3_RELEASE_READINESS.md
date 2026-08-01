# P3 RELEASE READINESS — 교수학습 품질 재검증

## 판정

**구조 생성 3종 / variation 54조합 / 인지적 품질 3종 PASS / 새 화면 실서비스 canary 3/3 PASS**

| 활동 | 지원 variation | 조합 | 구조 생성 | 인지적 품질 |
|---|---|---:|---|---|
| 분모가 다른 분수 비교 | 문제 수 2~6 × 난이도 3 × 분모 관계 3 | 45 | PASS | PASS — 재설계·하네스 통과 |
| 동치분수 | 문제 수 2~6, 난이도 보통 고정 | 5 | PASS | PASS — 6개 후보 중 예상·선택·띠 끝점 검증·설명 |
| 수 카드로 10 만들기 | 문제 수 2~5, 난이도 보통 고정 | 4 | PASS | PASS — 카드 6장 중 해 2쌍 구성·열 칸 검증·설명·수정 |

검증 범위 밖 key와 값, 고정 난이도 변경은 fail-closed로 거부하고 가장 가까운 T0 기본안을 제안한다.

`드래그가 필요함`과 `수학적 판단이 필요함`을 구분하는 검사에 교실 언어·텍스트 맞춤·선택 묶음 정렬 검사를 추가했다. 세 활동은 오프라인 하네스와 현재 blueprint·layout hash에 결속된 fresh canary를 모두 통과해 `released` 상태다.

P3 이후 Wave 5A에서 `[4수02-03]` 등호 양쪽의 값 맞추기 활동이 별도 blueprint·generator·18칸 자기검증 모형과 단일 활동 canary를 통과해 네 번째 `released` 활동으로 추가되었다. P3의 3종·54조합 수치는 이 보고서의 당시 승인 범위를 그대로 나타낸다.

## 불변 조건

- P1 frozen core: 17 files, diff 0
- P0 golden: 59객체 실서비스 canary에서 복원한 역사적 payload로 고정
- P3 golden: 인지적 재설계 결과로 승인 갱신
- P0 golden file SHA-256: `923adf18627f259f3b47f025036270396a350574b01cb23f8054a5b3e3186968`
- P3 golden file SHA-256: `9364379fb11a2153fb85e66167f4ee3097809aaa9ae9111a2e4ca383b14d8a62`
- P0는 역사적 화면, P3는 교실 언어·선택 묶음·겹침 수정 화면이므로 compiled payload가 서로 다름
- P3 승인 binding과 학생용 payload hash는 현재 blueprint·layout 변경에 맞춰 갱신
- 승인 binding: blueprint 내용 hash, generator 버전, seed, variation 포함
- public MCP: 기존 5개 유지
- 외부 입력: `denominatorRelation`만 추가
- raw payload, 절대 좌표, 내부 tool ID, 임의 T3 생성은 미노출
- 테스트 예산: 133~140개. 핵심 반례는 허용하되 과도한 증식은 차단
- 새 dependency와 lockfile 변경 없음

P0 activity spec과 approval hash는 역사적 `projectFractionComparisonApprovalView`로만 재현한다. 현재 제품 승인 경로는 blueprint·generator·seed·variation을 포함하는 `projectRegisteredApprovalView`를 사용한다.

## 실서비스 canary

`research/mathcanvas/p3-release-canary.json`의 2026-07-31T06:02:40.471Z 관찰은 현재 화면과 해시가 일치하는 출시 증거다.

- 3/3 생성 성공
- 활동별 새 프로젝트 요청 정확히 1회
- 기존 프로젝트 쓰기 0회
- 활동별 편집 경로 반환
- 현재 blueprint·layout hash 결속
- 인증 정보와 실제 프로젝트 ID는 비식별 처리

canary는 사용자 창을 열거나 앞으로 가져오지 않는 headless 모드로 실행한다.

이전 10 만들기 2.0.0은 `research/mathcanvas/w3-equation-rail-optical.json`의 별도 headless canary에서:

- 당시 blueprint hash와 payload hash 결속
- 새 프로젝트 요청 1회, 기존 프로젝트 쓰기 0회
- 수식 레일 중심 편차 0px, 인접 간격 32px × 4
- `+`, `=`, `10` 모두 실제 MathCanvas 수식 renderer에서 한 줄로 읽힘

현재 2.1.0은 과거 광학 증거가 아니라 최신 P3 canary의 현재 blueprint·layout hash 결속으로 출시했다.

## 다음 단계

P3는 수와 연산 영역의 재사용 가능한 authoring 경계만 증명했다. 학습지도 근거, 수학적 결정, 오개념 기반 선택지, 정답 미노출, 자기검증, 설명·수정 구조는 현재 실행 가능한 게이트다. 다음 wave에서는 같은 게이트를 다른 수학 영역의 blueprint로 확장한다.

`NO07NL` 수직선 deep probe는 P3 release blocker가 아니며, 해당 표현을 쓰는 후속 영역 활동에서 필요한 시점에 수행한다.
