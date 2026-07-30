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

## 실행

`pnpm cognitive:verify`는 빌드된 blueprint, 출시 상태, manifest, runtime predicate를 함께 검사한다. 하나라도 불일치하면 활동은 `released`가 될 수 없다. `pnpm check`는 이 검사를 마지막 단계에서 실행한다.
