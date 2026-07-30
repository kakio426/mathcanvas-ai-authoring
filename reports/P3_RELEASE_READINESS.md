# P3 RELEASE READINESS — 교수학습 품질 재검증

## 판정

**구조 생성 3종 / variation 54조합 / 인지적 품질 3종 / 실서비스 생성·광학 검증 PASS**

| 활동 | 지원 variation | 조합 | 구조 생성 | 인지적 품질 |
|---|---|---:|---|---|
| 분모가 다른 분수 비교 | 문제 수 2~6 × 난이도 3 × 분모 관계 3 | 45 | PASS | PASS — 재설계·하네스 통과 |
| 동치분수 | 문제 수 2~6, 난이도 보통 고정 | 5 | PASS | PASS — 6개 후보 중 예상·선택·띠 끝점 검증·설명 |
| 수 카드로 10 만들기 | 문제 수 2~5, 난이도 보통 고정 | 4 | PASS | PASS — 카드 6장 중 해 2쌍 구성·열 칸 검증·설명·수정 |

검증 범위 밖 key와 값, 고정 난이도 변경은 fail-closed로 거부하고 가장 가까운 T0 기본안을 제안한다.

기존 PASS는 payload·레이아웃·실서비스 저장 계약의 판정이었다. `드래그가 필요함`과 `수학적 판단이 필요함`을 구분하는 검사를 추가해 교수학습 출시 판정을 다시 수행했다. 세 활동 모두 예측·판단 또는 구성·불변량 검증·설명·수정 계약을 통과해 `released` 상태다.

## 불변 조건

- P1 frozen core: 17 files, diff 0
- P0 golden: 59객체 실서비스 canary에서 복원한 역사적 payload로 고정
- P3 golden: 인지적 재설계 결과로 승인 갱신
- P0 golden file SHA-256: `923adf18627f259f3b47f025036270396a350574b01cb23f8054a5b3e3186968`
- P3 golden file SHA-256: `113749b5644f3932537f70f5ba17d0417f0aad804026b7b06e8e4bd411aed6e9`
- P0와 P3 기본 분수 활동: compiled payload 동일
- P3 승인 binding은 `select-one` 판별자 추가로 갱신됐지만 학생용 compiled payload hash는 유지
- 승인 binding: blueprint 내용 hash, generator 버전, seed, variation 포함
- public MCP: 기존 5개 유지
- 외부 입력: `denominatorRelation`만 추가
- raw payload, 절대 좌표, 내부 tool ID, 임의 T3 생성은 미노출
- 테스트 예산: 133~140개. 핵심 반례는 허용하되 과도한 증식은 차단
- 새 dependency와 lockfile 변경 없음

P0 activity spec과 approval hash는 역사적 `projectFractionComparisonApprovalView`로만 재현한다. 현재 제품 승인 경로는 blueprint·generator·seed·variation을 포함하는 `projectRegisteredApprovalView`를 사용한다.

## 실서비스 canary

`research/mathcanvas/p3-release-canary.json`의 2026-07-30 관찰에서:

- 3/3 생성 성공
- 활동별 새 프로젝트 요청 정확히 1회
- 기존 프로젝트 쓰기 0회
- 활동별 편집 경로 반환
- 인증 정보와 실제 프로젝트 ID는 비식별 처리

canary는 사용자 창을 열거나 앞으로 가져오지 않는 headless 모드로 실행한다.

재설계한 10 만들기는 `research/mathcanvas/w3-equation-rail-optical.json`의 별도 headless canary에서:

- 현재 blueprint hash와 payload hash 결속
- 새 프로젝트 요청 1회, 기존 프로젝트 쓰기 0회
- 수식 레일 중심 편차 0px, 인접 간격 32px × 4
- `+`, `=`, `10` 모두 실제 MathCanvas 수식 renderer에서 한 줄로 읽힘

## 다음 단계

P3는 수와 연산 영역의 재사용 가능한 authoring 경계만 증명했다. 학습지도 근거, 수학적 결정, 오개념 기반 선택지, 정답 미노출, 자기검증, 설명·수정 구조는 현재 실행 가능한 게이트다. 다음 wave에서는 같은 게이트를 다른 수학 영역의 blueprint로 확장한다.

`NO07NL` 수직선 deep probe는 P3 release blocker가 아니며, 해당 표현을 쓰는 후속 영역 활동에서 필요한 시점에 수행한다.
