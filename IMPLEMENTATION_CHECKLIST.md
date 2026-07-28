# 구현 체크리스트

| ID | 요구 사항 | 상태 | 증거 |
|---|---|---|---|
| R1 | 대화만으로 추천·승인·생성·상태 확인 | 완료 | MCP 도구 4개, `server.test.ts` |
| R2 | Codex·Claude Code 공용 로컬 서버 | 완료 | stdio MCP 서버, 양쪽 설치 스크립트 |
| R3 | Chrome은 얇은 로그인 브리지 | 완료 | MV3 service worker |
| R4 | 토큰은 브라우저 페이지 안에만 유지 | 완료 | MAIN world 함수, 보안 정적 테스트 |
| R5 | 항상 새 캔버스만 생성 | 완료 | `POST /api/project`만 허용 |
| R6 | 교사 명시 승인 뒤 쓰기 | 완료 | `teacherConfirmed: true`, 승인 해시 |
| R7 | 성공 시 새 편집 탭 표시 | 완료 | `chrome.tabs.create(... active: true)` |
| R8 | Windows·macOS 설치 | 완료 | `install.ps1`, `install.command` |
| R9 | 로그인 화면까지 친절한 안내 | 완료 | `ONBOARDING_KO.md`, 확장 옵션 |
| R10 | 공식 2022 교육과정 우선 | 완료 | NCIC 출처와 `[6수01-07]` record |
| R11 | DECK6는 고정 버전 보조 자료 | 완료 | SHA 고정, 오분류 caveat |
| R12 | 시각적·직접 조작 분수 비교 | 완료 | 같은 전체·출발선 분수 띠 템플릿 |
| R13 | 수학·교육·레이아웃·계약 검증 | 완료 | validator와 단위 테스트 |
| R14 | 계약 불일치 시 안전 중단 | 완료 | preflight와 `contract-mismatch` |
| R15 | 중복 생성 방지 | 완료 | 결정적 marker, 영속 job, 제목 재조정, 결과 캐시 |

## 배포 전 남은 검증

- 실제 확장 프로그램을 Chrome에 불러오고 로그인된 계정으로 새 프로젝트 1건 생성
- 생성된 편집 화면에서 분수 띠 드래그·기호 배치 확인
- MathCanvas 허가 범위를 여러 교사 배포 조건까지 문서화
- Windows 실제 기기 설치 스모크 테스트
