# P0.5 Wave 1 — current-golden canary 검증

## 현재 판정 대상

분수 모형(`NO03FM`), 텍스트, 수식, 사각형의 released 기준선을 현재 P0 골든과
동일한 59객체 합성 canary에서 검증했다. 사용자 승인 범위는 새 프로젝트 1건과 저장
1건이었고 기존 교사 프로젝트에는 쓰지 않았다.

## current-golden 결과

골든 payload hash `fa0b8e75…`에
`AI-CONTRACT-PROBE-20260729T103957Z` 제목 prefix만 overlay했다. 분수 1개를
이동하고 저장한 뒤 최종 GET과 화면 렌더를 재검증했다.

| 항목 | 결과 |
|---|---:|
| 제출·최종 재열기 객체 | 59 / 59 |
| 분수 모형 | 8 / 8 / 8 |
| 수식 | 12 / 12 / 12 |
| 사각형 | 20 / 20 / 20 |
| 텍스트 | 19 / 19 / 19 |
| playground | 4 |
| visible SVG | 60 |
| DOM 존재·실제 가시 객체 | 59 / 59 |
| 분수 이동 | `x +103.68`, `y +34.56` |
| recovery 실행의 제품 write | 0 |

MathCanvas editor가 저장 시 추가하는 기본값은 사각형 `isEyeOn:false` 20개, 텍스트
빈 `parent.editSnapshots` 19개, 대상 분수 포인터 좌표,
`canvasOption.isCaptured/viewBox`다. validator는 이 정확한 패턴만 허용한다.
정규화 뒤 콘텐츠 변화는 분수 1개의 `x/y`뿐이다. viewBox는 원래 골든 canvas와
교차하는 유한한 범위여야 하고 최종 화면에서 59개 객체가 모두 보여야 한다.

## Recovery 한계

최초 2xx PUT과 최종 재열기 뒤 live probe가 이전 24객체 probe 문구를 하드코딩한
렌더 assertion에서 실패했다. 그 시점에는 원본 PUT body와 status를 evidence 파일로
영속화하지 못했다. 승인 범위를 넘겨 저장을 반복하지 않고 동일 canary를 GET으로만
재열어 recovery evidence를 만들었다.

따라서 `reconstructionConsistency`는 최종 GET으로부터 복구한 sparse save body의
자기 일관성 검사이며 독립적인 PUT→GET 측정이 아니다. 독립적으로 확인되는 보존
필드는 `categoryId`, `isNoteworthy`, `isShowMenuOnActivity`, `studyLevel`이다.
원래 create/save 횟수 1/1은 assertion이며 측정값이 아니다. 이 때문에 released
claim은 `recoveryMode:true`를 유지하며, raw write log가 있는 live evidence로
표현을 올리지 않는다.

## 구조 변경

- support history의 index fallback을 제거하고 단계별 evidence ID를 명시했다.
- 서로 다른 support 단계나 도구가 released evidence ID를 재사용하면 실패한다.
- 56개 도구의 118개 claim pointer를 실제 JSON claim까지 해석한다.
- adapter 의미 입력에서 좌표와 크기를 제거하고 별도 placement 계약으로 분리했다.
- legacy teacher-project payload는 gitignore 처리했고 current-golden synthetic
  evidence만 released manifest가 참조한다.

## Appendix — 폐기된 24객체 read-only preflight

초기에는 이미 승인·생성된 creator-owned 프로젝트를 전면 write 차단 상태로 열어
24개 객체의 제출·재열기와 client-only 이동을 확인했다. 도구 수는 분수 관련 4,
수식 4, 사각형 8, 텍스트 8이었고 서버 원본은 불변이었다.

이 자료는 probe 장치의 preflight일 뿐 현재 59객체 컴파일러 산출물의 released
lifecycle 근거가 아니다. 비공개 교사 payload를 포함한 legacy JSON은 커밋 대상에서
제외했고 manifest와 기본 validator도 더 이상 참조하지 않는다.
