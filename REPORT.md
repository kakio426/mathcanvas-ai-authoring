# 구현·검증 보고서

검증일: 2026-07-28

## 구현 결과

- TypeScript·pnpm 모노레포
- Codex·Claude Code 공용 stdio MCP 서버
- 인증된 loopback 브리지
- Manifest V3 Chrome 확장 프로그램
- 공식 교육과정 우선 추천기
- 버전이 있는 `ActivitySpec`
- 분모가 다른 분수 비교 템플릿
- MathCanvas 네이티브 객체 컴파일러
- fail-closed validator
- macOS·Windows 설치와 한국어 온보딩

## 자동 검증

- TypeScript typecheck: 통과
- Vitest: 13개 파일, 62개 테스트 통과
- 전체 workspace production build: 통과
- 의존성 감사: 알려진 취약점 없음
- 모의 전체 흐름: 연결 → 추천 → 교사 승인 → 작업 claim → 생성 성공 결과 → 편집 URL 확인 통과
- 보안 정적 검사: Chrome 권한 제한, MathCanvas 쓰기 POST 1개, PUT·PATCH·DELETE 없음
- 중복 승인·재시작: 같은 payload와 job ID 재사용, 원자적 작업 스냅샷 복구 확인
- 브라우저 재조정: 고유 제목의 기존 결과가 있으면 POST 없이 프로젝트 ID 재사용 확인
- 네이티브 계약: 분수 띠 좌표·반올림과 전체 compiled payload 변조 차단 확인
- 교차 런타임 해시: Node와 Chrome 구현이 같은 비ASCII 고정 벡터 SHA-256을 만드는지 확인
- 공개 객체 계약: 익명화 fixture로 `math-latex`, `input-text`, `drawElem`, 분수 띠 필드 대조
- 브리지 보관 한도: 진행 중 작업은 보존하고 완료·실패·만료 작업은 최근 500건으로 제한
- 계약 호출 절감: 일반 전체 검사는 6시간 캐시, 실패는 15분 백오프, 실제 외부 쓰기 직전에는 전체 재검사

## 교육 QA

- 공식 `[6수01-07]` 목표와 5~6학년군 확인
- 같은 전체 폭과 같은 출발선 강제
- 분수 관계를 교차곱으로 검증
- 분모가 서로 다르고 크기가 같은 쌍은 제외
- 두 분수 띠의 길이 차이가 전체의 8% 미만이면 생성 차단
- 순서만 바꾼 같은 분수 비교와 겹치는 지시문 영역 차단
- 두 조작 지시문과 놓기 칸 라벨을 네이티브 객체로 컴파일
- 추천·생성 응답에 교사용 정답지 포함
- 학생 문구 Humanizer 검사 통과

## 독립 모델 심사

- 모델: `claude-opus-5`
- 1차 55점 → 2차 82점 → 3차 보수적 최종 확인 점수 85점
- 비공개 GitHub 게시: GO
- 제작자 본인 계정 1건 스모크: CONDITIONAL GO
- 세부 근거: `CLAUDE_OPUS_5_REVIEW.md`

## 현재 증거가 아닌 항목

로그인된 실서비스에 외부 쓰기를 실행하지 않았습니다. 확장 프로그램을 아직 사용자의 Chrome에 설치·연결하지 않았기 때문입니다. 따라서 다음 항목은 완료로 주장하지 않습니다.

- 실제 MathCanvas 프로젝트 ID
- 실제 새 편집 탭 스크린샷
- 실제 학생 모드에서의 드롭 동작
- Windows 실기기 설치

실서비스 스모크는 교사가 [ONBOARDING_KO.md](./ONBOARDING_KO.md)를 따라 확장 프로그램을 연결한 뒤, 승인된 계정으로 새 프로젝트 한 건을 만들며 확인합니다.
