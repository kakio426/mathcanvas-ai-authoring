# MathCanvas 인지적 요구 게이트

기술적으로 저장되는 활동과 수학적 지식을 성장시키는 활동을 구분한다. 활동의 이동·선택·그리기는 학생이 수학적 판단을 표현하고, 근거와 충돌시키고, 수정하는 수단이어야 한다.

## 출시 게이트

- `G0_MANIFEST_BOUND`: 출시 blueprint는 현재 내용 hash와 일치하는 인지적 요구 manifest를 가진다.
- `G1_DECISION_EXISTS`: 각 문항에 되돌릴 수 있는 수학적 선택 또는 구성이 있고 후보가 3개 이상이다.
- `G2_DISTRACTOR_SURPLUS`: 정답에 쓰이지 않는 후보가 하나 이상이며 오개념 근거가 후보 역할 또는 문항별 실행 predicate에 결속되어 있다.
- `G3_ANSWER_HIDDEN`: 정답은 지시문·완성식·고정 요소에 보이지 않고, 후보 집합에서만 다른 가능성과 함께 나타날 수 있다.
- `G4_NO_TRIVIAL_PATH`: 제공된 물체를 전부 옮기는 행동만으로는 활동을 끝낼 수 없다.
- `G5_PREDICTION_REGION`: 선택 전에 생각을 남길 빈 영역이 문항마다 있다.
- `G6_EXPLANATION_REGION`: 수학적 근거를 남길 빈 영역이 문항마다 있다.
- `G7_SELF_VERIFIABLE`: 답을 주지 않으면서 선택을 검사할 전체·단위·공통 출발선·균형·그래프 같은 불변량 표현이 있다.
- `G8_PER_ITEM_STRUGGLE`: 일부 문항이 아니라 모든 문항이 처음에는 미해결이고, 오답 선택과 수정이 가능하다.

## 교육 근거

공식 교육과정을 권위 원본으로 삼고 `DECK6/korean-elementary-learning-map`의 고정 커밋 `3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c`에서 topic ID, 선수 관계, 관찰 증거, 평가 질문을 보조 근거로 가져온다. 사용한 원문 레코드는 `fixtures/pedagogy/learning-map.used.json`에 최소 스냅샷으로 고정하고 manifest가 그 canonical SHA-256에 결속된다. 하네스는 출시 활동의 공식 성취기준이 `official-text-verified`인지, 관찰 증거와 평가 질문이 스냅샷 원문과 문자열 수준으로 일치하는지도 검사한다. 이 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인이 아니라는 한계를 manifest에 기록한다.

## 플랫폼 한계

현재 MathCanvas payload는 자동채점, 오답 피드백, 단계 순서, 학생이 실제로 글을 썼는지를 보장하지 않는다. 하네스가 보장하는 것은 수학적 결정·정답 미노출·자기검증·예측·설명 구조의 존재다. 실제 순서와 기록 여부는 지시문과 교사 운영에 의존한다.

## 교실 언어 및 묶음 배치 하네스

학생 화면에는 내부 설계 단계명을 그대로 내보내지 않는다. `먼저 예상`, `세어 확인`, `근거와 수정`, `수 카드 모음`, `검증`, `불변량`, `후보`는 학습자 라벨로 사용할 수 없다. 지시문은 대상과 행동을 함께 밝히고, 라벨은 학생이 그곳에 남길 수학적 작업을 짧게 이름 붙인다.

`language.classroom-korean` predicate는 지시문의 길이·행동 표현·종결형과 라벨 길이·금지 용어를 실행 시 검사한다. 모든 등록 blueprint에 이 predicate가 있어야 하며, `pnpm cognitive:verify`도 전체 학생용 고정 문구와 지시문에서 누락과 금지 용어를 차단한다. 세 단계 이상인 지시에는 번호를 붙이고 화면도 같은 위→아래 순서를 사용한다.

움직이는 선택물이 둘 이상인 묶음은 역할 이름이 아니라 manifest의 결정 대상·이동 가능 여부·공통 도구 종류로 찾는다. `visual.labeled-pool-row`는 컨테이너 안에서 각 행의 가운데·등간격, 행 사이 간격, 위쪽 라벨 관계를 검사한다. 독립 선택 컨테이너는 가장 큰 주 작업판과 같은 세로 flow group에 속해야 하며, reference 검증이 두 영역과 다음 문항 사이의 preset `minGap`을 강제한다. 선택 묶음이 주 작업판 자체를 함께 쓰는 경우에는 이 외부 간격 규칙을 적용하지 않는다.

`visual.text-fit` predicate는 고정 문구의 글자 종류와 글자 크기로 보수적인 너비를 계산해 선언 영역을 넘을 위험을 차단한다. 인접한 라벨도 겹침 검사에 포함한다. 둘 이상의 동종 이동 요소는 역할 이름이 무엇이든 선택 묶음으로 감지한다. `visual.labeled-pool-row` predicate는 이 묶음 전체와 라벨이 같은 시각적 컨테이너나 작업 패널 안에 있는지, 단일 행 또는 여러 행의 중심선과 간격이 고른지, 각 행이 컨테이너 가운데에 있는지, 라벨이 첫 행 위에서 묶음의 왼쪽과 맞는지를 검사한다. 화면을 바꾼 활동은 이 검사를 통과해도 새 canary를 확인하기 전까지 `verified` 상태를 유지한다.

`released` 활동은 `ACTIVITY_RELEASE_EVIDENCE`에 하나 이상의 읽을 수 있는 증거 파일이 있어야 하고, 해당 파일의 성공 결과가 현재 blueprint ID·content hash·layout preset hash를 함께 포함해야 한다. `pnpm cognitive:verify`는 누락·경로 오류·과거 화면 또는 다른 활동의 증거 재사용을 차단한다.

## 실행

`pnpm cognitive:verify`는 빌드된 blueprint, 출시 상태, manifest, runtime predicate를 함께 검사한다. 하나라도 불일치하면 활동은 `released`가 될 수 없다. `pnpm check`는 이 검사를 마지막 단계에서 실행한다.
