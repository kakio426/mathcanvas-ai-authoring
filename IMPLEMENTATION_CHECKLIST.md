# 구현 체크리스트

| ID | 요구 사항 | 상태 | 증거 |
|---|---|---|---|
| R1 | 대화만으로 추천·승인·새 캔버스 생성 | 구현 | MCP 도구와 배치 서비스 |
| R2 | Codex·Claude Code 공용 로컬 서버 | 구현 | stdio MCP |
| R3 | 확장 프로그램·Computer Use 미사용 | 구현 | 관리형 Chrome 런타임 |
| R4 | 토큰·쿠키를 페이지 밖에 저장하지 않음 | 구현 | 페이지 컨텍스트·보안 테스트 |
| R5 | 새 프로젝트만 생성 | 구현 | `POST /api/project`, 수정·삭제 도구 없음 |
| R6 | 교사 승인과 해시 일치 뒤 쓰기 | 구현 | `teacherConfirmed`, `setHash` |
| R7 | 성공 시 편집 화면 표시 | 구현 | 첫 editor URL 활성화 |
| R8 | 부분 실패 재개·중복 방지 | 구현 | 영속 `CreationBatch` |
| R9 | 공식 2022 교육과정 우선 | 구현 | `[6수01-07]`, DECK6 고정 SHA는 보조 |
| R10 | 한 문제 한 캔버스, 16:10 | 구현·실검증 | v2.3.0 최종 4개 |
| R11 | 띠 2개·기호·까닭 직접 조작 | 구현·실검증 | `opus-remediation-v230` 4개 전체 |
| R12 | 준비 위치가 정답을 미리 드러내지 않음 | 구현·실검증 | 반대 끝점 단서 validator·실화면 assertion |
| R13 | 분수 카드 중심 정렬 | 구현·실검증 | 분자·선·분모 중심축 자동 측정 |
| R14 | 출발 안내·출발선 이름 분리 | 구현·실검증 | 고정 라벨 교차 0 |
| R15 | 입력 라벨·입력 객체 간격 | 구현·실검증 | 최소 gap validator·실화면 assertion |
| R16 | viewport 변경 뒤 새 레이아웃 검증 | 구현·실검증 | reload·exact viewport·fresh layout |
| R17 | 사용자 실패 화면 영구 회귀 | 등록 | `qa/regressions/user-reported-1630x1122/` |
| R18 | 세 화면 크기 초기 QA | 통과 | 최종 4개 × 3 화면 |
| R19 | 수학·교육·Humanizer QA | 통과 | REPORT |
| R20 | 전체 타입·테스트·빌드 | 통과 | 15개 파일·100개 테스트 |

## 현재 심사

- [x] 최초 Claude Opus 5 심사: ITERATE, 기술 74·활동 66
- [x] 최초 심사의 P0 1건·P1 6건 코드와 증거 보완
- [x] Claude Opus 5 재심: PASS, 기술 92·활동 90, P0/P1 0건
- [x] 독립 Codex 재심: PASS, 기술 92·활동 89, P0/P1 0건

## 여러 교사 배포 전

- [ ] Windows 실기기 설치·Codex·Claude Code E2E
- [ ] macOS 깨끗한 사용자 계정 설치
- [ ] 서명 설치 패키지·체크섬·제거·롤백
- [ ] MathCanvas 계약 변경 감시
- [ ] 3~5명 교사 비공개 파일럿
