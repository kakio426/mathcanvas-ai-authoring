# 2026-07-29 v2.3.0 실서비스 QA

## 현재 기준

- 최종 초기 상태: `final-v230/`
- 전체 조작 검증: `opus-remediation-v230/`
- 사용자 실패 원본: `../regressions/user-reported-1630x1122/`
- v2.2.2와 최초 Opus 5 ITERATE 증거:
  `../_archive/2026-07-29-opus5-initial-iterate/`
- 더 오래된 중간본: `../_archive/2026-07-29-remediation-iterations/`

## 최종 신규 캔버스

| 순서 | 문제 | projectId | 편집 URL |
|---|---|---|---|
| 1/4 | `3/8 ? 3/5` | `XNJTuV` | `https://mathcanvas.vivasam.com/ko/view/XNJTuV` |
| 2/4 | `5/6 ? 3/5` | `feeTES` | `https://mathcanvas.vivasam.com/ko/view/feeTES` |
| 3/4 | `4/5 ? 4/7` | `QiiLPy` | `https://mathcanvas.vivasam.com/ko/view/QiiLPy` |
| 4/4 | `3/4 ? 3/5` | `8HejZu` | `https://mathcanvas.vivasam.com/ko/view/8HejZu` |

배치: `batch-c591e3bc-a4da-4056-82f6-744aaaa840c4`

최종 네 캔버스는 `1630×1122`, `1280×800`, `1024×768`에서 새로
불러온 초기 상태로 모두 통과했습니다. 각 `canvas-N/metrics.json`과
세 장의 `*-before.png`가 근거입니다.

## 전체 조작 검증

`opus-remediation-v230/`의 네 캔버스 모두에서 다음을 확인했습니다.

- 정확한 `1630×1122` viewport와 새로 불러온 레이아웃
- 준비 위치의 띠 끝점이 실제 정답과 반대 인상
- 두 띠를 공통 출발선의 각 목표 칸으로 이동
- 알맞은 관계 기호를 관계 칸으로 이동
- 조작 뒤 띠·고정 문구 교차 0건
- 기호·양쪽 분수 카드 교차 0건
- 정확한 까닭 문장 입력과 입력 표면 containment

각 `metrics.json`, `user-reported-1630x1122-before.png`,
`user-reported-1630x1122-after-manipulation.png`가 근거입니다.

## 시각 확인

자동 rect 검사와 별도로 최종 네 문제의 `1630×1122`, 첫 문제의
`1024×768`, 대표 조작 완료 화면을 눈으로 확인했습니다. 분수 중심,
띠·패널, 출발선 안내, 기호와 입력 영역에서 잘림·삐져나옴·의도하지 않은
겹침을 찾지 못했습니다.
