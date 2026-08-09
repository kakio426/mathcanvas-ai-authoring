# Eduitit HTML 30 · MathCanvas 구현 프롬프트

- harness: eduitit-html30-mathcanvas-prompt:v2
- series: vivasam-2026-middleofmath-30
- source manifest SHA-256: 8e64368ba3fc316b037b2afbd2bad1a3ed2ed718b4a68ef94b8948691af04b59
- harness content SHA-256: bf70146de87a050b98a62c47699881a017ef1e0710c8f44806da135c93db381a
- source of truth: Eduitit에 배포된 실제 `*-slides.html` 30개
- 상태: 설계용 prompt pack. actual canary·save/reopen 전 release 금지.

## 01 · 그림 하나에 숨은 수

- lessonId: `g3s2-pictograph-legend`
- catalogEntryId: `grade3-basic-practice-ppt-01`
- HTML SHA-256: `edf8fae0ee2fe18ab0f5a269a3e727e7196fe78b39138692ff44c0338439e7c3`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 1
- lessonId: g3s2-pictograph-legend
- title: 그림 하나에 숨은 수
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-pictograph-legend/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-pictograph-legend/a9359d040467/g3s2-pictograph-legend-slides.html
- HTML SHA-256: edf8fae0ee2fe18ab0f5a269a3e727e7196fe78b39138692ff44c0338439e7c3
- grade/semester/unit: 3학년 2학기 6. 그림그래프
- standardCodes: [4수04-01]
- domain / official learning goal: 자료와 가능성 / 자료를 수집하여 그림그래프나 막대그래프로 나타내고 해석할 수 있다.
- learningMapTopicId: kr.mt.math.data-probability.g3-4.s4-04-01.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.29 (printed folio 23) > [4수04-01]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 3차시 · 그림그래프로 나타내고 해석해 볼까요? · pp.137-141
- source usage: 그림 수에 범례를 적용해 실제 수량과 차이를 해석한다.
- catalogEntryId: grade3-basic-practice-ppt-01
- catalog snapshot SHA-256: 8f4ecc96b76929678a4c17229e35c0702b252a937545b748956fb41459cd8892
- catalog availability: blocked
- blueprintFamily: picture-graph-interpretation-v1@1.0.0 · 범례 단위와 그림 수를 곱해 실제 수량의 차이를 해석하는 판단을 공유한다.
- variationPreset: picture-graph-count-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 그림 수와 범례 중 무엇을 먼저 적용해 실제 수량을 비교할지 결정한다.
- affordanceFamily: native-picture-graph-v1@1.0.0 · support=captured
- affordance operation: 범례와 그림의 개수를 연결해 실제 수량을 읽고 비교한다.
- candidateToolKeys: DP03PG
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=DP03PG, research/mathcanvas/graph-tool-contract.observations.json#tool=DP03PG
- layoutFamily: one-screen-data-workbench-v1@1.0.0 · 범례·그림그래프 native 영역과 수량 해석·설명 영역을 한 화면에 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 그림그래프 | 네 개를 셌는데 왜 답이 다를까요? | 범례 | 1개 = 5권 | 책 | 별 4개 | 생각 A | 별이 4개니까 4권이에요. | 생각 B | 별 하나가 5권이니 20권이에요. | Q | 두 생각은 어디까지 같고, 어디서 달라졌을까요?
  교사 메모: 4분 중 앞 2분. 두 생각을 소리 내어 읽게 하고 손을 들어 봅니다. 정답을 알려주지 말고 '어디까지는 같았나요?'만 확인합니다.
- 03 02 범례의 힘 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 그림그래프 | 별은 똑같이 4개인데 | 범례 | 1개 = 1권 | 1 | 2 | 3 | 4 | 4 × 1 = 4 권 | 몇 권일까요? | 범례 | 1개 = 5권 | 5 | 10 | 15 | 20 | 4 × 5 = 20 권 | 몇 권일까요? | Q | 달라진 것은 별의 개수가 아니라, 별 하나의 값이에요.
  교사 메모: 4분 중 뒤 2분. 별 개수는 그대로 두고 범례만 바꿔 봅니다. 학생이 예상한 뒤 확인하기를 눌러 뛰어 세기를 함께 소리 내어 셉니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 범례 적용 | 그림 네 개를 20권으로 읽는 까닭 | 범례 | 1개 = 5권 | 책 | 뛰어 세기 | 5 | 10 | 15 | 20 | 4 × 5 = 20 권 | 별 4개 × 한 개의 값 = ? | 그림 수 × 한 그림의 값 | = 실제 수량
  교사 메모: 6분. 별을 함께 세고, 5씩 뛰어 세기를 손뼉과 함께 소리 냅니다. 확인하기를 누른 뒤 곱셈식으로 정리합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 거꾸로 · 실제 수량 → 그림 수 | 25권을 나타내려면 별을 어떻게 채울까요? | 범례 | 1개 = 5권 | 빈칸은 6개 · 다 채우지 않아도 돼요 | 위 칸 | 15권 | 아래 칸 | 25권 | 5 × 5 = 25 | 질문 1 | 아래 칸에 별을 몇 개? | 별 5개 | 질문 2 | 위 칸보다 몇 개 더? | 2개 더
  교사 메모: 5분. 학생이 학습지 빈칸에 별을 직접 그립니다. 6칸 중 몇 칸을 채울지 스스로 정하게 하고, 확인하기로 맞춰 봅니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 공원 A·B · 네모 1개 = 10그루 | 어디에서 생각이 갈렸을까요? | 생각 A | 네모가 모두 5개라서 5그루예요. | 다시 볼 단계 | 03 | 범례 적용 | 그림 수를 그대로 답으로 썼어요. 네모 하나가 10그루라는 값을 곱해야 해요. | 생각 B | A만 계산해서 3×10=30그루예요. | 다시 볼 단계 | 01 | 행 고르기 | 범례는 잘 적용했어요. 물음이 ‘모두’였으니 B의 행도 함께 세어야 해요. | Q | 각 생각에서 네 단계 중 어디를 다시 보아야 할까요?
  교사 메모: 3분. 두 생각이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 고르게 합니다. 확인하기로 단계를 맞춰 봅니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 02 · 같은 묶음은 곱셈으로

- lessonId: `g3s1-multiplication-groups-model`
- catalogEntryId: `grade3-basic-practice-ppt-02`
- HTML SHA-256: `fd4236cda9a0e1b2236ad9a9566345030843a4747847a7ae6c94e012a1dc8b9d`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 2
- lessonId: g3s1-multiplication-groups-model
- title: 같은 묶음은 곱셈으로
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-multiplication-groups-model/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-multiplication-groups-model/20973ac52f65/g3s1-multiplication-groups-model-slides.html
- HTML SHA-256: fd4236cda9a0e1b2236ad9a9566345030843a4747847a7ae6c94e012a1dc8b9d
- grade/semester/unit: 3학년 1학기 4. 곱셈
- standardCodes: [4수01-04]
- domain / official learning goal: 수와 연산 / 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-04.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-04]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 1차시 단원 도입~2차시 전 · 두 자리 수의 곱셈 전 선수 개념 확인 · pp.86-89
- source usage: 한 묶음 수와 묶음 수를 곱으로 나타내는 감각을 도입 전 진단·복습에 활용한다.
- catalogEntryId: grade3-basic-practice-ppt-02
- catalog snapshot SHA-256: 4a78eb818fd4191e281c5d56152f3395cf32b04a0c25d1ef5d912f2f02bb9e9c
- catalog availability: blocked
- blueprintFamily: discrete-array-meaning-v1@1.0.0 · 행·열 또는 같은 묶음 구조를 곱셈식과 연결하는 판단을 공유한다.
- variationPreset: array-group-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 같은 수씩 묶인 배열을 어떤 곱셈식으로 나타낼지 결정한다.
- affordanceFamily: native-array-model-v1@1.0.0 · support=captured
- affordance operation: 배열의 행·열 구조를 바꾸거나 선택해 전체 수를 확인한다.
- candidateToolKeys: NO04NG
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NG, research/mathcanvas/division-native-semantic-probe.json#candidate=NO04NG
- layoutFamily: one-screen-array-workbench-v1@1.0.0 · 배열·묶음 native 모형과 예상·설명 영역을 한 화면에 함께 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 곱셈 | 두 답은 어디에서 달라졌을까요? | 연필이 한 봉지에 3자루씩 | 4봉지 있어요. | 4줄 · 한 줄에 3개 | 풀이 A | 3 + 4 = 7 | 풀이 B | 3 × 4 = 12 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 두 풀이를 소리 내어 읽고 배열 그림과 비교합니다. 정답을 말해주지 말고 '어디까지 근거가 있나요?'만 확인합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 곱셈 | 봉지 수만 바뀌면 답도 바뀔까요? | 3자루씩 · 4봉지 | 3 × 4 = 12 자루 | 3자루씩 · 5봉지 | 3 × 5 = 15 자루 | Q | 달라진 것은 한 봉지의 수가 아니라, 봉지의 개수예요.
  교사 메모: 4분 중 뒤 2분. 한 봉지의 수는 그대로 두고 봉지 수만 바꿔 봅니다. 확인하기를 누르기 전 학생이 먼저 답을 예측하게 합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 곱셈식 | 보이는 정보로 답을 확인해요 | 연필 3자루씩 든 봉지가 4개 있어요. 연필 수를 나타내는 식과 답은 무엇일까요? | 뛰어 세기 | 3 6 9 12 | 3 × 4 = 12 | 3 × 4 = 12 | 3 + 4 = 7 | 4 | 핵심 이유 | 한 묶음의 수 × 묶음 수 = 전체 수
  교사 메모: 6분. 배열을 함께 세고, 3씩 뛰어 세기를 손뼉과 함께 소리 냅니다. 확인하기를 눌러 정답 선택지와 곱셈식을 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 귤이 한 접시에 4개씩 5접시 있습니다. 귤은 모두 몇 개일까요? | × 5줄 | 4 × 5 = ? | 4 × 5 = 20 개 | 01 | 주어진 정보 표시하기 | 02 | 핵심 관계식 쓰기 | 03 | 계산하고 답의 뜻 나타내기 | 04 | 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 한 묶음의 수 × 묶음 수 = 전체 수
  교사 메모: 5분. 같은 귤 문제를 다시 보며 네 단계를 학습지에 순서대로 적게 합니다. 확인하기로 최종 식과 답을 맞춰봅니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 연필 3자루씩 4봉지 | 어느 단계에서 달라졌을까요? | 확인 기준 · 한 묶음의 수 × 묶음 수 = 전체 수 | 검토할 답 · 3+4=7 | 3×4 대신 3+4=7로 계산했습니다. | 다시 볼 단계 | 03 | 곱셈식으로 나타내기 | 검토할 답 · 4 | 4봉지의 묶음 수 4를 연필 전체 수로 사용했습니다. | 다시 볼 단계 | 03 | 곱셈식으로 나타내기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다. 확인하기로 단계를 맞춰봅니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 03 · 줄과 칸으로 전체 수 찾기

- lessonId: `g3s1-multiplication-array-transfer`
- catalogEntryId: `grade3-basic-practice-ppt-03`
- HTML SHA-256: `ef7d601ad9279cdb7a36be9e5968a7a85190ca799f4c7bcc4cf3f30eae6bdc54`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 3
- lessonId: g3s1-multiplication-array-transfer
- title: 줄과 칸으로 전체 수 찾기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-multiplication-array-transfer/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-multiplication-array-transfer/581348f0ccd1/g3s1-multiplication-array-transfer-slides.html
- HTML SHA-256: ef7d601ad9279cdb7a36be9e5968a7a85190ca799f4c7bcc4cf3f30eae6bdc54
- grade/semester/unit: 3학년 1학기 4. 곱셈
- standardCodes: [4수01-04]
- domain / official learning goal: 수와 연산 / 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-04.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-04]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 1차시 단원 도입~2차시 전 · 두 자리 수의 곱셈 전 선수 개념 확인 · pp.86-89
- source usage: 배열을 곱셈식으로 읽는 감각을 확인한 뒤 자릿값 곱셈으로 이어 간다.
- catalogEntryId: grade3-basic-practice-ppt-03
- catalog snapshot SHA-256: e064e0fb21f44115dbffac59fc6009aaa89d4820143d51847b768b5cdf69fee3
- catalog availability: blocked
- blueprintFamily: discrete-array-meaning-v1@1.0.0 · 행·열 또는 같은 묶음 구조를 곱셈식과 연결하는 판단을 공유한다.
- variationPreset: array-row-column-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 줄과 칸 중 어느 구조로 전체를 빠르게 확인할지 결정한다.
- affordanceFamily: native-array-model-v1@1.0.0 · support=captured
- affordance operation: 배열의 행·열 구조를 바꾸거나 선택해 전체 수를 확인한다.
- candidateToolKeys: NO04NG
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NG, research/mathcanvas/division-native-semantic-probe.json#candidate=NO04NG
- layoutFamily: one-screen-array-workbench-v1@1.0.0 · 배열·묶음 native 모형과 예상·설명 영역을 한 화면에 함께 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 곱셈 | 두 답은 어디에서 달라졌을까요? | 붙임 딱지를 한 줄에 5장씩 | 6줄 붙였어요. | 6줄 · 한 줄에 5장 | 풀이 A | 30장 | 풀이 B | 11장 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 두 풀이를 소리 내어 읽고 배열 그림과 비교합니다. 정답을 말해주지 말고 '어디까지 근거가 있나요?'만 확인합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 곱셈 | 줄 수만 바뀌면 답도 바뀔까요? | 한 줄에 5장씩 · 5줄 | 5 × 5 = 25 장 | 한 줄에 5장씩 · 6줄 | 5 × 6 = 30 장 | Q | 달라진 것은 한 줄의 수가 아니라, 줄의 개수예요.
  교사 메모: 4분 중 뒤 2분. 한 줄의 수는 그대로 두고 줄 수만 바꿔 봅니다. 확인하기를 누르기 전 학생이 먼저 답을 예측하게 합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 곱셈식 | 보이는 정보로 답을 확인해요 | 붙임 딱지를 한 줄에 5장씩 6줄 붙였어요. 붙임 딱지는 모두 몇 장일까요? | 뛰어 세기 | 5 10 15 20 25 30 | 30장 | 30장 | 11장 | 6장 | 핵심 이유 | 한 묶음의 수 × 묶음 수 = 전체 수
  교사 메모: 6분. 배열을 함께 세고, 5씩 뛰어 세기를 손뼉과 함께 소리 냅니다. 확인하기를 눌러 정답 선택지와 곱셈식을 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 바둑돌을 한 줄에 6개씩 7줄 놓았습니다. 모두 몇 개일까요? | × 7줄 | 6 × 7 = ? | 6 × 7 = 42 개 | 01 | 주어진 정보 표시하기 | 02 | 핵심 관계식 쓰기 | 03 | 계산하고 답의 뜻 나타내기 | 04 | 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 한 묶음의 수 × 묶음 수 = 전체 수
  교사 메모: 5분. 같은 바둑돌 문제를 다시 보며 네 단계를 학습지에 순서대로 적게 합니다. 확인하기로 최종 식과 답을 맞춰봅니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 붙임 딱지 5장씩 6줄 | 어느 단계에서 달라졌을까요? | 확인 기준 · 한 묶음의 수 × 묶음 수 = 전체 수 | 검토할 답 · 11장 | 5×6 대신 5+6=11로 계산했습니다. | 다시 볼 단계 | 03 | 곱셈식으로 나타내기 | 검토할 답 · 6장 | 6줄의 묶음 수 6을 붙임 딱지 전체 수로 사용했습니다. | 다시 볼 단계 | 03 | 곱셈식으로 나타내기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다. 확인하기로 단계를 맞춰봅니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 04 · 34×2를 두 부분으로

- lessonId: `g3s1-multiplication-place-value-model`
- catalogEntryId: `grade3-basic-practice-ppt-04`
- HTML SHA-256: `82628737a0fc1c8164ad931a1d1810b029d601eb36209c77549f9d0d0245177f`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 4
- lessonId: g3s1-multiplication-place-value-model
- title: 34×2를 두 부분으로
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-multiplication-place-value-model/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-multiplication-place-value-model/72059dcce98d/g3s1-multiplication-place-value-model-slides.html
- HTML SHA-256: 82628737a0fc1c8164ad931a1d1810b029d601eb36209c77549f9d0d0245177f
- grade/semester/unit: 3학년 1학기 4. 곱셈
- standardCodes: [4수01-04]
- domain / official learning goal: 수와 연산 / 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-04.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-04]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 3차시 · (몇십몇)×(몇)을 구해 볼까요?(1) · pp.90-91
- source usage: 받아올림이 없는 두 자리 수를 십과 일로 나누어 부분곱을 만든다.
- catalogEntryId: grade3-basic-practice-ppt-04
- catalog snapshot SHA-256: a6a06836acfad8cd2a69ed8d10baf59be24971ccc90b10acbd2340baef2c476d
- catalog availability: blocked
- blueprintFamily: place-value-distributive-product-v1@1.0.0 · 두 자리 수를 자릿값에 따라 나누어 부분곱을 구성하는 판단을 공유한다.
- variationPreset: place-value-distributive-product-04-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 34를 30과 4로 나누어 부분곱을 만들지 결정한다.
- affordanceFamily: native-place-value-model-v1@1.0.0 · support=contracted
- affordance operation: 자릿값 모형의 묶음을 교환하거나 자리별 개수를 비교한다.
- candidateToolKeys: NO04PD
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04PD, research/mathcanvas/wave14-place-value-release-canary.json#tool=NO04PD
- layoutFamily: one-screen-choice-workbench-v1@1.0.0 · 예상 선택, native 확인, 설명, 수정의 네 구역을 한 화면 세로 흐름으로 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 곱셈 | 두 답은 어디에서 달라졌을까요? | 23×3을 자릿값에 맞게 | 나누어 계산해요. | 3줄 · 한 줄에 20+3(23) | 풀이 A | 2×3=6 → 3×3=9 → 6+9=15 | 풀이 B | 20×3=60 → 3×3=9 → 60+9=69 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 두 풀이를 소리 내어 읽고 자릿값 배열과 비교합니다. 정답을 말해주지 말고 '어디까지 근거가 있나요?'만 확인합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 곱셈 | 십의 자리 수만 바뀌면 답도 바뀔까요? | 십의 자리 1 · 일의 자리 3 → 13×3 | 10×3=30 → 3×3=9 → 39 | 십의 자리 2 · 일의 자리 3 → 23×3 | 20×3=60 → 3×3=9 → 69 | Q | 달라진 것은 일의 자리가 아니라, 십의 자리예요.
  교사 메모: 4분 중 뒤 2분. 일의 자리는 그대로 두고 십의 자리 수만 바꿔 봅니다. 확인하기를 누르기 전 학생이 먼저 답을 예측하게 합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 부분곱 더하기 | 보이는 정보로 답을 확인해요 | 23×3을 자릿값에 맞게 나누어 계산한 식은 어느 것일까요? | 20×3=60 → 3×3=9 → 60+9=69 | 20×3=60 → 3×3=9 → 60+9=69 | 2×3=6 → 3×3=9 → 6+9=15 | 23+3=26 | 핵심 이유 | 십의 자리 값과 일의 자리 값을 각각 곱한 뒤 더한다
  교사 메모: 6분. 자릿값 배열을 함께 세고, 20×3과 3×3을 각각 짚어 확인합니다. 확인하기를 눌러 정답 선택지와 식을 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 34×2를 30과 4로 나누어 계산해 보세요. | × 2 | 30×2=? · 4×2=? | 30×2=60 → 4×2=8 → 68 | 01 | 주어진 정보 표시하기 | 02 | 핵심 관계식 쓰기 | 03 | 계산하고 답의 뜻 나타내기 | 04 | 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 십의 자리 값과 일의 자리 값을 각각 곱한 뒤 두 부분곱을 더한다.
  교사 메모: 5분. 같은 34×2 문제를 다시 보며 네 단계를 학습지에 순서대로 적게 합니다. 확인하기로 최종 식과 답을 맞춰봅니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 23×3 | 어느 단계에서 달라졌을까요? | 확인 기준 · 십의 자리 값과 일의 자리 값을 각각 곱한 뒤 더한다 | 검토할 답 · 15 | 20×3=60을 2×3=6으로 줄여서 십의 자리 값을 빠뜨렸습니다. | 다시 볼 단계 | 01 | 십과 일로 나누기 | 검토할 답 · 26 | 23×3을 나누어 곱하지 않고 23+3=26으로 나타냈습니다. | 다시 볼 단계 | 02 | 부분마다 곱하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다. 확인하기로 단계를 맞춰봅니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 05 · 상자 수를 자릿값으로 곱하기

- lessonId: `g3s1-multiplication-place-value-context`
- catalogEntryId: `grade3-basic-practice-ppt-05`
- HTML SHA-256: `440a171b11e75f0067ad5f08fb7ea9daabafa94956ac5517abb0db415b25e57d`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 5
- lessonId: g3s1-multiplication-place-value-context
- title: 상자 수를 자릿값으로 곱하기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-multiplication-place-value-context/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-multiplication-place-value-context/e92e990b8497/g3s1-multiplication-place-value-context-slides.html
- HTML SHA-256: 440a171b11e75f0067ad5f08fb7ea9daabafa94956ac5517abb0db415b25e57d
- grade/semester/unit: 3학년 1학기 4. 곱셈
- standardCodes: [4수01-04]
- domain / official learning goal: 수와 연산 / 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-04.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-04]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 3차시 · (몇십몇)×(몇)을 구해 볼까요?(1) · pp.90-91
- source usage: 자릿값을 보존해 만든 부분곱을 더하는 원리를 생활 맥락에 적용한다.
- catalogEntryId: grade3-basic-practice-ppt-05
- catalog snapshot SHA-256: 4cd8364f5142364dc371d880568886a76cf8f4634a5251f506b23ae1ae4e53a8
- catalog availability: blocked
- blueprintFamily: place-value-distributive-product-v1@1.0.0 · 두 자리 수를 자릿값에 따라 나누어 부분곱을 구성하는 판단을 공유한다.
- variationPreset: place-value-distributive-product-05-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 상자 수를 자릿값에 따라 나누어 곱셈 순서를 정한다.
- affordanceFamily: native-place-value-model-v1@1.0.0 · support=contracted
- affordance operation: 자릿값 모형의 묶음을 교환하거나 자리별 개수를 비교한다.
- candidateToolKeys: NO04PD
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04PD, research/mathcanvas/wave14-place-value-release-canary.json#tool=NO04PD
- layoutFamily: one-screen-choice-workbench-v1@1.0.0 · 예상 선택, native 확인, 설명, 수정의 네 구역을 한 화면 세로 흐름으로 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 곱셈 | 두 답은 어디에서 달라졌을까요? | 공책이 42권씩 든 상자가 | 2개 있어요. | 2상자 · 한 상자에 40+2(42) | 풀이 A | 84권 | 풀이 B | 8권 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 두 풀이를 소리 내어 읽고 자릿값 배열과 비교합니다. 정답을 말해주지 말고 '어디까지 근거가 있나요?'만 확인합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 곱셈 | 십의 자리 수만 바뀌면 답도 바뀔까요? | 십의 자리 3 · 일의 자리 2 → 32×2 | 30×2=60 → 2×2=4 → 64 | 십의 자리 4 · 일의 자리 2 → 42×2 | 40×2=80 → 2×2=4 → 84 | Q | 달라진 것은 일의 자리가 아니라, 십의 자리예요.
  교사 메모: 4분 중 뒤 2분. 일의 자리는 그대로 두고 십의 자리 수만 바꿔 봅니다. 확인하기를 누르기 전 학생이 먼저 답을 예측하게 합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 부분곱 더하기 | 보이는 정보로 답을 확인해요 | 공책이 42권씩 든 상자가 2개 있어요. 공책은 모두 몇 권일까요? | 40×2=80 → 2×2=4 → 80+4=84 | 40×2=80 → 2×2=4 → 80+4=84 | 8권 | 44권 | 핵심 이유 | 십의 자리 값과 일의 자리 값을 각각 곱한 뒤 더한다
  교사 메모: 6분. 자릿값 배열을 함께 세고, 40×2와 2×2를 각각 짚어 확인합니다. 확인하기를 눌러 정답 선택지와 식을 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 공이 31개씩 든 상자가 3개 있습니다. 공은 모두 몇 개일까요? | × 3상자 | 30×3=? · 1×3=? | 30×3=90 → 1×3=3 → 93 | 01 | 주어진 정보 표시하기 | 02 | 핵심 관계식 쓰기 | 03 | 계산하고 답의 뜻 나타내기 | 04 | 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 십의 자리 값과 일의 자리 값을 각각 곱한 뒤 두 부분곱을 더한다.
  교사 메모: 5분. 같은 공 31×3 문제를 다시 보며 네 단계를 학습지에 순서대로 적게 합니다. 확인하기로 최종 식과 답을 맞춰봅니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 42×2 | 어느 단계에서 달라졌을까요? | 확인 기준 · 십의 자리 값과 일의 자리 값을 각각 곱한 뒤 더한다 | 검토할 답 · 8권 | 42×2를 4×2=8로 줄여 계산했습니다. | 다시 볼 단계 | 01 | 십과 일로 나누기 | 검토할 답 · 44권 | 42×2 대신 42+2=44로 계산했습니다. | 다시 볼 단계 | 02 | 부분마다 곱하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다. 확인하기로 단계를 맞춰봅니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 06 · 18개를 똑같이 나누면

- lessonId: `g3s1-division-equal-sharing`
- catalogEntryId: `grade3-basic-practice-ppt-06`
- HTML SHA-256: `6291e262936ebdcb2a732aa5afdec4da005ec7c30d7760c6564dc2b6f9e35984`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 6
- lessonId: g3s1-division-equal-sharing
- title: 18개를 똑같이 나누면
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-division-equal-sharing/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-division-equal-sharing/3f26a9cabdbe/g3s1-division-equal-sharing-slides.html
- HTML SHA-256: 6291e262936ebdcb2a732aa5afdec4da005ec7c30d7760c6564dc2b6f9e35984
- grade/semester/unit: 3학년 1학기 3. 나눗셈
- standardCodes: [4수01-05]
- domain / official learning goal: 수와 연산 / 나눗셈이 이루어지는 실생활 상황과 연결하여 나눗셈의 의미를 알고, 곱셈과 나눗셈의 관계를 이해한다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-05.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-05]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 2차시 · 똑같이 나누어 볼까요? · pp.62-65
- source usage: 전체를 같은 수의 묶음에 똑같이 나누며 한 묶음의 수를 구한다.
- catalogEntryId: grade3-basic-practice-ppt-06
- catalog snapshot SHA-256: 38de55df311f7d5871b6f0232c8ac7a0794b58ec787909e3c863c6253d8db30e
- catalog availability: blocked
- blueprintFamily: equal-group-division-v1@1.0.0 · 전체를 같은 수씩 묶어 몫과 남은 수의 의미를 확인하는 판단을 공유한다.
- variationPreset: equal-group-division-06-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 18개를 같은 수씩 나눌 때 한 묶음의 크기와 묶음 수 중 무엇을 구할지 결정한다.
- affordanceFamily: native-counting-model-v1@1.0.0 · support=contracted
- affordance operation: 낱개를 같은 수씩 묶고 묶음과 남은 낱개의 수를 확인한다.
- candidateToolKeys: NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO01SC, research/mathcanvas/division-counting-group-canary.json#claim=released:NO01SC
- layoutFamily: one-screen-division-workbench-v1@1.0.0 · 묶음·잔여 native 조작과 식 설명 rail을 한 화면에 고정한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 나눗셈 | 두 답은 어디에서 달라졌을까요? | 쿠키 12개를 3명에게 | 똑같이 나누어 줘요. | 전체 12개 · 3명에게 | 풀이 A | 3개 | 풀이 B | 4개 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 두 풀이를 소리 내어 읽고 원 배열과 비교합니다. 정답을 말해주지 말고 '어디까지 근거가 있나요?'만 확인합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 나눗셈 | 묶음 수만 바뀌면 몫도 바뀔까요? | 쿠키 12개 · 3명에게 | 12 ÷ 3 = 4 개 | 쿠키 12개 · 6명에게 | 12 ÷ 6 = 2 개 | Q | 달라진 것은 전체 수가 아니라, 나누는 사람 수예요.
  교사 메모: 4분 중 뒤 2분. 쿠키 12개는 그대로 두고 나누는 사람 수만 바꿔 봅니다. 확인하기를 누르기 전 학생이 먼저 답을 예측하게 합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 나눗셈식 | 보이는 정보로 답을 확인해요 | 쿠키 12개를 3명에게 똑같이 나누어 줘요. 한 사람은 몇 개씩 받을까요? | 1명 | 2명 | 3명 | 한 명씩 | 1 → 1 → 1 → 1 | 4개 | 4개 | 3개 | 9개 | 핵심 이유 | 전체 ÷ 묶음 수 = 한 묶음의 수
  교사 메모: 6분. 원 12개를 함께 세고, 3명에게 하나씩 나누어 봅니다. 확인하기를 눌러 정답 선택지와 나눗셈식을 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 쿠키 18개를 6명에게 똑같이 나누면 한 명은 몇 개씩 받을까요? | 전체 18개 ÷ 6명 | 18 ÷ 6 = ? | 18 ÷ 6 = 3 개 | 01 | 주어진 정보 표시하기 | 02 | 핵심 관계식 쓰기 | 03 | 계산하고 답의 뜻 나타내기 | 04 | 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 전체 ÷ 묶음 수 = 한 묶음의 수
  교사 메모: 5분. 같은 쿠키 18÷6 문제를 다시 보며 네 단계를 학습지에 순서대로 적게 합니다. 확인하기로 최종 식과 답을 맞춰봅니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 쿠키 12개 3명 | 어느 단계에서 달라졌을까요? | 확인 기준 · 전체 ÷ 묶음 수 = 한 묶음의 수 | 검토할 답 · 3개 | 12÷3의 몫 대신 나누는 수 3을 답으로 놓았습니다. | 다시 볼 단계 | 03 | 하나씩 똑같이 나누기 | 검토할 답 · 9개 | 12÷3 대신 12-3=9로 계산했습니다. | 다시 볼 단계 | 03 | 하나씩 똑같이 나누기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다. 확인하기로 단계를 맞춰봅니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 07 · 곱셈의 빈칸으로 몫 찾기

- lessonId: `g3s1-division-missing-factor`
- catalogEntryId: `grade3-basic-practice-ppt-07`
- HTML SHA-256: `7cf39d45811dff4c76d08beac185a4d557ed54718e5ef2312ad82676bdd060ab`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 7
- lessonId: g3s1-division-missing-factor
- title: 곱셈의 빈칸으로 몫 찾기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-division-missing-factor/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-division-missing-factor/7413b7506694/g3s1-division-missing-factor-slides.html
- HTML SHA-256: 7cf39d45811dff4c76d08beac185a4d557ed54718e5ef2312ad82676bdd060ab
- grade/semester/unit: 3학년 1학기 3. 나눗셈
- standardCodes: [4수01-05], [4수01-06]
- domain / official learning goal: 수와 연산 / 나눗셈이 이루어지는 실생활 상황과 연결하여 나눗셈의 의미를 알고, 곱셈과 나눗셈의 관계를 이해한다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-05.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-05]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 6차시 · 나눗셈의 몫을 곱셈식으로 구해 볼까요? · pp.77-79
- source usage: 곱셈식의 빈 요인을 찾아 몫을 구하고 관련 나눗셈식으로 확인한다.
- catalogEntryId: grade3-basic-practice-ppt-07
- catalog snapshot SHA-256: 32cd5629b8124adbdaf0c154b2b75a0e2dea0e0142f761b1d61d80f662cb6149
- catalog availability: blocked
- blueprintFamily: equal-group-division-v1@1.0.0 · 전체를 같은 수씩 묶어 몫과 남은 수의 의미를 확인하는 판단을 공유한다.
- variationPreset: equal-group-division-07-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 곱셈의 빈칸에 들어갈 수가 묶음 수인지 한 묶음의 수인지 결정한다.
- affordanceFamily: native-counting-model-v1@1.0.0 · support=contracted
- affordance operation: 낱개를 같은 수씩 묶고 묶음과 남은 낱개의 수를 확인한다.
- candidateToolKeys: NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO01SC, research/mathcanvas/division-counting-group-canary.json#claim=released:NO01SC
- layoutFamily: one-screen-division-workbench-v1@1.0.0 · 묶음·잔여 native 조작과 식 설명 rail을 한 화면에 고정한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 나눗셈 | 두 답은 어디에서 달라졌을까요? | 색연필 20자루를 상자 5개에 같은 수씩 담은 모습이에요. | 전체 20자루 · 상자 5개 | 풀이 A | 4자루 | 풀이 B | 5자루 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 두 풀이를 소리 내어 읽고 배열과 비교합니다. 정답을 말해주지 말고 근거만 확인합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 나눗셈 | 묶음 수만 바뀌면 몫도 바뀔까요? | 색연필 20자루 · 5상자 | 20÷5=4 | 색연필 20자루 · 4상자 | 20÷4=5 | Q | 달라진 것은 전체 수가 아니라, 나누는 상자 수예요.
  교사 메모: 4분 중 뒤 2분. 상자 수만 바꿔 봅니다. 확인하기 전 학생이 먼저 예측하게 합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 나눗셈식 | 보이는 정보로 답을 확인해요 | 색연필 20자루를 상자 5개에 같은 수씩 담았어요. 5×□=20에서 □에 알맞은 수는 무엇일까요? | 4자루 | 4자루 | 5자루 | 15자루 | 핵심 이유 | 전체 ÷ 묶음 수 = 한 묶음의 수
  교사 메모: 6분. 배열을 함께 세고, 5줄로 나눠 봅니다. 확인하기를 눌러 정답과 나눗셈식을 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 연결된 식과 까닭을 남겨요 | 다시 볼 문제 | 7×□=35에서 □에 알맞은 수를 찾고 나눗셈식으로 나타내세요. | 7×□=35 | 35÷7=? | 35÷7=5 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 전체 ÷ 묶음 수 = 한 묶음의 수
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 색연필 20자루 5상자 | 어느 단계에서 달라졌을까요? | 확인 기준 · 전체 ÷ 묶음 수 = 한 묶음의 수 | 검토할 답 · 5자루 | 5×□=20에서 찾아야 할 다른 요인 4 대신 알려진 요인 5를 빈칸에 놓았습니다. | 다시 볼 단계 | 03 | 하나씩 똑같이 나누기 | 검토할 답 · 15자루 | 5×□=20의 빈칸 대신 20-5=15로 계산했습니다. | 다시 볼 단계 | 03 | 하나씩 똑같이 나누기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 08 · 한 곱셈식에서 두 나눗셈식

- lessonId: `g3s1-division-fact-family`
- catalogEntryId: `grade3-basic-practice-ppt-08`
- HTML SHA-256: `817fd859a12c5816a96d7d838e7c6c549988a8953e4215701f92d059cbca7b71`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 8
- lessonId: g3s1-division-fact-family
- title: 한 곱셈식에서 두 나눗셈식
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-division-fact-family/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-division-fact-family/4b67b320b570/g3s1-division-fact-family-slides.html
- HTML SHA-256: 817fd859a12c5816a96d7d838e7c6c549988a8953e4215701f92d059cbca7b71
- grade/semester/unit: 3학년 1학기 3. 나눗셈
- standardCodes: [4수01-05]
- domain / official learning goal: 수와 연산 / 나눗셈이 이루어지는 실생활 상황과 연결하여 나눗셈의 의미를 알고, 곱셈과 나눗셈의 관계를 이해한다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-05.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-05]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 5차시 · 곱셈과 나눗셈의 관계를 알아볼까요? · pp.74-76
- source usage: 하나의 곱셈식에서 관련된 두 나눗셈식을 만든다.
- catalogEntryId: grade3-basic-practice-ppt-08
- catalog snapshot SHA-256: a5bc8c60e92b245508695c7899ca60532e26247e8da47d4594f1711ad8f20131
- catalog availability: blocked
- blueprintFamily: equal-group-division-v1@1.0.0 · 전체를 같은 수씩 묶어 몫과 남은 수의 의미를 확인하는 판단을 공유한다.
- variationPreset: equal-group-division-08-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 한 곱셈식에서 만들 수 있는 두 나눗셈식을 골라 관계를 확인한다.
- affordanceFamily: native-counting-model-v1@1.0.0 · support=contracted
- affordance operation: 낱개를 같은 수씩 묶고 묶음과 남은 낱개의 수를 확인한다.
- candidateToolKeys: NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO01SC, research/mathcanvas/division-counting-group-canary.json#claim=released:NO01SC
- layoutFamily: one-screen-division-workbench-v1@1.0.0 · 묶음·잔여 native 조작과 식 설명 rail을 한 화면에 고정한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 나눗셈 | 두 답은 어디에서 달라졌을까요? | 4×6=24예요. | 4×6=24 | 4×6=24 · 한 줄 6개 → 24÷4=? | 두 요인 4와 6 | 풀이 A | 6 | 풀이 B | 4 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 곱셈식을 함께 읽고 두 풀이를 비교합니다. 정답을 말해주지 말고 근거만 확인합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 나눗셈 | 24÷4와 24÷6, 같은 곱셈에서 나올까요? | 24÷4 = ? | 4×6=24 | 한 줄(6개)씩 4줄 → 24÷4=6 | 24÷4=6 | 24÷6 = ? | 4×6=24 | 한 칸(4개)씩 6칸 → 24÷6=4 | 24÷6=4 | Q | 곱셈식의 어느 수로 나누었나요?
  교사 메모: 4분 중 뒤 2분. 같은 곱셈식에서 두 나눗셈을 모두 만들어 봅니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 세 수 관계 | 보이는 정보로 답을 확인해요 | 4×6=24예요. 24÷4의 몫은 얼마일까요? | 4×6=24 | 한 줄 6개 · 4줄 = 24 | 4줄로 나누면 | 24÷4=? 24÷4=6 | 6개씩 나누면 | 24÷6=4 | 6 | 6 | 4 | 20 | 핵심 이유 | 곱셈식의 전체를 한 요인으로 나누면 다른 요인이 된다.
  교사 메모: 6분. 곱셈식을 함께 읽고 24÷4를 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 연결된 식과 까닭을 남겨요 | 다시 볼 문제 | 8×4=32를 이용해 나눗셈식 두 개를 만드세요. | 8×4=32 | 8×4=32 · 한 줄 8개 → 32÷8=4 · 4줄 → 32÷4=8 | 32÷8=? · 32÷4=? | 32÷8=4 · 32÷4=8 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 곱셈식의 전체를 한 요인으로 나누면 다른 요인이 된다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 4×6=24 | 어느 단계에서 달라졌을까요? | 확인 기준 · 곱셈식의 전체를 한 요인으로 나누면 다른 요인이 된다. | 검토할 답 · 4 | 4×6=24에서 24÷4의 몫 6 대신 나누는 수 4를 골랐습니다. | 다시 볼 단계 | 03 | 전체를 한 요인으로 나누기 | 검토할 답 · 20 | 24÷4 대신 24-4=20으로 계산했습니다. | 다시 볼 단계 | 03 | 전체를 한 요인으로 나누기 | 01 곱셈식의 전체 찾기 | 02 두 요인 찾기 | 03 전체를 한 요인으로 나누기 | 04 남은 요인을 몫으로 확인하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 09 · 몇 묶음인지 곱셈으로 확인하기

- lessonId: `g3s1-division-group-count`
- catalogEntryId: `grade3-basic-practice-ppt-09`
- HTML SHA-256: `08a915a48aad87b7af7220a84e263ca42f75595ec1b4d0fb945c3cf430a27389`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 9
- lessonId: g3s1-division-group-count
- title: 몇 묶음인지 곱셈으로 확인하기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-division-group-count/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-division-group-count/0dfdfbcc6252/g3s1-division-group-count-slides.html
- HTML SHA-256: 08a915a48aad87b7af7220a84e263ca42f75595ec1b4d0fb945c3cf430a27389
- grade/semester/unit: 3학년 1학기 3. 나눗셈
- standardCodes: [4수01-05], [4수01-06]
- domain / official learning goal: 수와 연산 / 나눗셈이 이루어지는 실생활 상황과 연결하여 나눗셈의 의미를 알고, 곱셈과 나눗셈의 관계를 이해한다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-05.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-05]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 6차시 · 나눗셈의 몫을 곱셈식으로 구해 볼까요? · pp.77-79
- source usage: 몇 묶음인지 묻는 몫을 곱셈 사실로 확인한다.
- catalogEntryId: grade3-basic-practice-ppt-09
- catalog snapshot SHA-256: 42d8128dc1e98753a673b476476a9fd20b0659887b9aa92ff162a64a4afce21d
- catalog availability: blocked
- blueprintFamily: equal-group-division-v1@1.0.0 · 전체를 같은 수씩 묶어 몫과 남은 수의 의미를 확인하는 판단을 공유한다.
- variationPreset: equal-group-division-09-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 몇 묶음인지와 한 묶음의 수를 곱셈으로 확인할지 결정한다.
- affordanceFamily: native-counting-model-v1@1.0.0 · support=contracted
- affordance operation: 낱개를 같은 수씩 묶고 묶음과 남은 낱개의 수를 확인한다.
- candidateToolKeys: NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO01SC, research/mathcanvas/division-counting-group-canary.json#claim=released:NO01SC
- layoutFamily: one-screen-division-workbench-v1@1.0.0 · 묶음·잔여 native 조작과 식 설명 rail을 한 화면에 고정한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 나눗셈 | 두 답은 어디에서 달라졌을까요? | 붙임 딱지 35장을 5장씩 한 묶음으로 만들어요. | 5×□=35 | ● ● ● ● ● ● ● ● | ● ● ● ● ● ● | ● ● ● ● ● ● ● | ● ● ● ● ● | ● ● ● ● ● ● ● ● ● | 35장을 5장씩 묶는 방법을 먼저 생각해 보세요 | 5개씩 묶어 세어 보세요 | 전체 35 · 한 묶음 5 | 풀이 A | 7 | 풀이 B | 5 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 붙임 딱지 상황을 읽고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 나눗셈 | 묶음의 크기가 바뀌면 묶음 수도 바뀔까요? | 35÷5 = ? | 5×7=35 | 5개씩 7묶음 | 35÷5=7 | 35÷7 = ? | 7×5=35 | 7개씩 5묶음 | 35÷7=5 | Q | 달라진 것은 전체 수가 아니라, 어떤 수로 나누는가예요.
  교사 메모: 4분 중 뒤 2분. 묶음 크기를 바꿔 몫이 바뀌는지 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 세 수 관계 | 보이는 정보로 답을 확인해요 | 붙임 딱지 35장을 5장씩 한 묶음으로 만들어요. 몇 묶음이 되는지 곱셈을 떠올려 구해 보세요. | 5×□=35 | ● ● ● ● ● ● ● ● | ● ● ● ● ● ● | ● ● ● ● ● ● ● | ● ● ● ● ● | ● ● ● ● ● ● ● ● ● | 아직 묶지 않은 35장 · 5장씩 직접 묶어 보세요 | 5×□=35 · ?묶음 5×7=35 · 7묶음 | 7 | 7 | 5 | 30 | 핵심 이유 | 곱셈식의 전체를 한 요인으로 나누면 다른 요인이 된다.
  교사 메모: 6분. 붙임 딱지 상황을 곱셈식으로 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 붙임 딱지 42장을 6장씩 묶으면 몇 묶음일까요? | 6×□=42 | 6장씩 7묶음 = 42장 | 42÷6=? | 42÷6=7 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 곱셈식의 전체를 한 요인으로 나누면 다른 요인이 된다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 35÷5=7 | 어느 단계에서 달라졌을까요? | 확인 기준 · 곱셈식의 전체를 한 요인으로 나누면 다른 요인이 된다. | 검토할 답 · 5 | 7×5=35에서 35÷5의 몫 7 대신 나누는 수 5를 골랐습니다. | 다시 볼 단계 | 03 | 전체를 한 요인으로 나누기 | 검토할 답 · 30 | 35÷5 대신 35-5=30으로 계산했습니다. | 다시 볼 단계 | 03 | 전체를 한 요인으로 나누기 | 01 곱셈식의 전체 찾기 | 02 두 요인 찾기 | 03 전체를 한 요인으로 나누기 | 04 남은 요인을 몫으로 확인하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 10 · 분수의 첫 조건, 똑같이

- lessonId: `g3s1-fraction-equal-parts`
- catalogEntryId: `grade3-basic-practice-ppt-10`
- HTML SHA-256: `a3a3f6882ff0e9fd4ad92124c8c36a030935d6f71487f134480c9344044d5b6c`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 10
- lessonId: g3s1-fraction-equal-parts
- title: 분수의 첫 조건, 똑같이
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-fraction-equal-parts/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-fraction-equal-parts/1cf03d48ea3b/g3s1-fraction-equal-parts-slides.html
- HTML SHA-256: a3a3f6882ff0e9fd4ad92124c8c36a030935d6f71487f134480c9344044d5b6c
- grade/semester/unit: 3학년 1학기 6. 분수와 소수
- standardCodes: [4수01-09]
- domain / official learning goal: 수와 연산 / 양의 등분할을 통하여 분수의 필요성을 인식하고, 분수를 이해하고 읽고 쓸 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-09.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-09]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 2차시 · 똑같이 나누어 볼까요? · pp.132-133
- source usage: 조각 수뿐 아니라 전체가 같은 크기로 등분되었는지 판단한다.
- catalogEntryId: grade3-basic-practice-ppt-10
- catalog snapshot SHA-256: eaf7bd42c43d325fcfbd5af1778f3c27ee055e6544bec5372772c8e3e27ff556
- catalog availability: blocked
- blueprintFamily: fraction-part-whole-v1@1.0.0 · 같은 전체를 똑같이 나눈 조각과 부분의 수를 분수로 연결하는 판단을 공유한다.
- variationPreset: fraction-part-whole-10-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 분수로 나타내려는 전체를 똑같이 나누었는지 결정한다.
- affordanceFamily: native-fraction-model-v1@1.0.0 · support=contracted
- affordance operation: 같은 전체를 일정한 조각으로 나누고 색칠한 조각 수를 비교한다.
- candidateToolKeys: NO03FM
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO03FM, research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:NO03FM
- layoutFamily: one-screen-fraction-workbench-v1@1.0.0 · 분수 native 모형의 전체·조각 reserve를 먼저 확보하고 설명 영역을 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 분수와 소수 | 두 답은 어디에서 달라졌을까요? | 색칠한 한 조각이 전체의 1 4 인 그림은 어느 것일까요? | 가 | 나 | 다 | 1번째 조각을 색칠했어요 | 풀이 A | 나 그림 | 풀이 B | 가 그림 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 가,나,다 세 그림을 비교하며 어느 것이 1/4인지 살핍니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 분수와 소수 | 조각의 크기를 맞추면 무엇이 달라질까요? | 민지의 종이띠 · 크기가 다른 6조각 | 크기가 달라 1 6 이 아니에요 | 고친 종이띠 · 크기가 같은 6조각 | 이제 1 6 이 맞아요 | Q | 달라진 것은 조각의 개수가 아니라, 조각의 크기예요.
  교사 메모: 4분 중 뒤 2분. 크기가 다른 조각을 똑같은 크기로 고쳐 봅니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 크기 비교 | 보이는 정보로 답을 확인해요 | 색칠한 한 조각이 전체의 1 4 인 그림은 어느 것일까요? | 가 | 나 | 다 | 가 그림 | 가 그림 | 나 그림 | 다 그림 | 핵심 이유 | 분수로 나타내려면 전체를 똑같은 크기로 나누어야 한다.
  교사 메모: 6분. 세 그림을 함께 비교하며 똑같은 크기인지 살핍니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 분수와 까닭을 남겨요 | 다시 볼 문제 | 같은 길이의 종이띠를 똑같이 5조각으로 나눴습니다. 한 조각은 전체의 얼마일까요? | 1 5 ? | 1 5 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 분수로 나타내려면 전체를 똑같은 크기로 나누어야 한다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 가·나·다 그림 | 어느 단계에서 달라졌을까요? | 확인 기준 · 분수로 나타내려면 전체를 똑같은 크기로 나누어야 한다. | 검토할 답 · 나 그림 | 네 조각 조건만 적용해 너비가 1,2,1,2인 나 그림을 1 4 로 판단했습니다. | 다시 볼 단계 | 03 | 조각 크기가 같은지 비교하기 | 검토할 답 · 다 그림 | 전체가 같은 너비 3조각인 다 그림을 골라 1 3 구조를 1 4 로 판단했습니다. | 다시 볼 단계 | 02 | 전체 조각 수 세기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 11 · 같지 않은 조각을 고쳐 나누기

- lessonId: `g3s1-fraction-fix-partition`
- catalogEntryId: `grade3-basic-practice-ppt-11`
- HTML SHA-256: `2f2f0acd4b06437a074b3a6f76fec2ee118cebf9ebd22118d2644007d1a84bba`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 11
- lessonId: g3s1-fraction-fix-partition
- title: 같지 않은 조각을 고쳐 나누기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-fraction-fix-partition/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-fraction-fix-partition/c21572bfdfcd/g3s1-fraction-fix-partition-slides.html
- HTML SHA-256: 2f2f0acd4b06437a074b3a6f76fec2ee118cebf9ebd22118d2644007d1a84bba
- grade/semester/unit: 3학년 1학기 6. 분수와 소수
- standardCodes: [4수01-09]
- domain / official learning goal: 수와 연산 / 양의 등분할을 통하여 분수의 필요성을 인식하고, 분수를 이해하고 읽고 쓸 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-09.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-09]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 2차시 · 똑같이 나누어 볼까요? · pp.132-133
- source usage: 잘못 나눈 그림을 고치며 등분할 조건을 설명한다.
- catalogEntryId: grade3-basic-practice-ppt-11
- catalog snapshot SHA-256: 3801a871e459e4f388ee2b5d584bc753a6e5425049b7718ab28a60cc322a6d44
- catalog availability: blocked
- blueprintFamily: fraction-part-whole-v1@1.0.0 · 같은 전체를 똑같이 나눈 조각과 부분의 수를 분수로 연결하는 판단을 공유한다.
- variationPreset: fraction-part-whole-11-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 같지 않은 조각을 어떻게 다시 나누어 분수의 전체를 만들지 결정한다.
- affordanceFamily: native-fraction-model-v1@1.0.0 · support=contracted
- affordance operation: 같은 전체를 일정한 조각으로 나누고 색칠한 조각 수를 비교한다.
- candidateToolKeys: NO03FM
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO03FM, research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:NO03FM
- layoutFamily: one-screen-fraction-workbench-v1@1.0.0 · 분수 native 모형의 전체·조각 reserve를 먼저 확보하고 설명 영역을 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 분수와 소수 | 두 답은 어디에서 달라졌을까요? | 민지는 종이띠를 1 6 씩 나누었다고 말했어요. | 조각 크기가 서로 달라요 | 풀이 A | 똑같은 크기 6조각으로 다시 나눠요 | 풀이 B | 지금처럼 크기가 달라도 6조각이면 돼요 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 민지의 종이띠를 보고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 분수와 소수 | 조각의 개수만 맞으면 될까요? | 지금 상태 · 크기가 다른 6조각 | 6조각이지만 1 6 이 아니에요 | 고친 상태 · 크기가 같은 6조각 | 이제 1 6 이 맞아요 | Q | 달라진 것은 조각의 개수가 아니라, 조각의 크기예요.
  교사 메모: 4분 중 뒤 2분. 조각 개수는 그대로 두고 크기만 맞춰봅니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 크기 비교 | 보이는 정보로 답을 확인해요 | 민지는 종이띠를 1 6 씩 나누었다고 말했어요. 그림을 보고 바르게 고쳐 말한 것은 어느 것일까요? | 똑같은 크기 6조각으로 다시 나눠요 | 똑같은 크기 6조각으로 다시 나눠요 | 지금처럼 크기가 달라도 6조각이면 돼요 | 똑같은 크기 5조각으로 다시 나눠요 | 핵심 이유 | 분수로 나타내려면 전체를 똑같은 크기로 나누어야 한다.
  교사 메모: 6분. 민지의 종이띠를 함께 보며 조각 크기를 비교합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 판단과 고치는 방법을 남겨요 | 다시 볼 문제 | 크기가 다른 5조각 중 한 조각을 1 5 이라고 할 수 있을까요? 까닭과 고치는 방법을 말하세요. | 1 5 인가요? | 아니요 · 크기를 맞춰야 1 5 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 분수로 나타내려면 전체를 똑같은 크기로 나누어야 한다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 민지의 종이띠 1 6 | 어느 단계에서 달라졌을까요? | 확인 기준 · 분수로 나타내려면 전체를 똑같은 크기로 나누어야 한다. | 검토할 답 · 지금처럼 크기가 달라도 6조각이면 돼요 | 여섯 조각 조건만 적용해 너비가 1,1,2,1,1,1인 상태도 1 6 이라고 판단했습니다. | 다시 볼 단계 | 03 | 조각 크기가 같은지 비교하기 | 검토할 답 · 똑같은 크기 5조각으로 다시 나눠요 | 똑같은 크기 5조각으로 다시 나누면 1 5 인데 이를 1 6 의 고침으로 판단했습니다. | 다시 볼 단계 | 02 | 전체 조각 수 세기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 12 · 전체와 부분을 분수로 읽기

- lessonId: `g3s1-fraction-part-whole`
- catalogEntryId: `grade3-basic-practice-ppt-12`
- HTML SHA-256: `78e5743ab25e05bad1db05ad07bb00cb0e689acba53e664d3d91d1b634901fbb`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 12
- lessonId: g3s1-fraction-part-whole
- title: 전체와 부분을 분수로 읽기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-fraction-part-whole/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-fraction-part-whole/7e578ddb6892/g3s1-fraction-part-whole-slides.html
- HTML SHA-256: 78e5743ab25e05bad1db05ad07bb00cb0e689acba53e664d3d91d1b634901fbb
- grade/semester/unit: 3학년 1학기 6. 분수와 소수
- standardCodes: [4수01-09]
- domain / official learning goal: 수와 연산 / 양의 등분할을 통하여 분수의 필요성을 인식하고, 분수를 이해하고 읽고 쓸 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-09.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-09]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 3차시 · 분수를 알아볼까요?(1) · pp.134-137
- source usage: 전체 조각 수와 고른 조각 수를 분모·분자와 연결한다.
- catalogEntryId: grade3-basic-practice-ppt-12
- catalog snapshot SHA-256: 051d6e4ab2e835202de0170136f0aeb13dd0a6e96e3adf350eae02b4c75237f1
- catalog availability: blocked
- blueprintFamily: fraction-part-whole-v1@1.0.0 · 같은 전체를 똑같이 나눈 조각과 부분의 수를 분수로 연결하는 판단을 공유한다.
- variationPreset: fraction-part-whole-12-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 전체와 그중 색칠한 부분을 어떤 분수로 읽을지 결정한다.
- affordanceFamily: native-fraction-model-v1@1.0.0 · support=contracted
- affordance operation: 같은 전체를 일정한 조각으로 나누고 색칠한 조각 수를 비교한다.
- candidateToolKeys: NO03FM
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO03FM, research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:NO03FM
- layoutFamily: one-screen-fraction-workbench-v1@1.0.0 · 분수 native 모형의 전체·조각 reserve를 먼저 확보하고 설명 영역을 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 분수와 소수 | 두 답은 어디에서 달라졌을까요? | 전체 5조각 중 2조각을 색칠했어요. 색칠한 부분은 얼마일까요? | 전체 5칸 · 색칠 2칸 | 풀이 A | 5 2 | 풀이 B | 2 5 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 5칸 중 2칸 색칠을 함께 세고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 분수와 소수 | 분자와 분모, 무엇이 위로 갈까요? | 색칠 2 / 전체 5 | 2 5 (맞는 순서) | 전체 5 / 색칠 2 | 5 2 (틀린 순서) | Q | 달라진 것은 조각 수가 아니라, 분자·분모의 자리예요.
  교사 메모: 4분 중 뒤 2분. 분자·분모의 자리를 바꿔보며 차이를 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 분모 정하기 | 보이는 정보로 답을 확인해요 | 전체 5조각 중 2조각을 색칠했어요. 색칠한 부분은 얼마일까요? | 2 5 | 2 5 | 5 2 | 2 3 | 핵심 이유 | 전체 조각 수는 분모, 고른 조각 수는 분자에 쓴다.
  교사 메모: 6분. 5칸 중 2칸을 함께 세고 분수로 나타냅니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 분수와 까닭을 남겨요 | 다시 볼 문제 | 전체 7조각 중 3조각을 색칠했습니다. 색칠한 부분을 분수로 나타내세요. | 3 7 ? | 3 7 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 전체 조각 수는 분모, 고른 조각 수는 분자에 쓴다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 전체5 색칠2 | 어느 단계에서 달라졌을까요? | 확인 기준 · 전체 조각 수는 분모, 고른 조각 수는 분자에 쓴다. | 검토할 답 · 5 2 | 색칠한 수와 전체 수인 2 5 를 전체 수와 색칠한 수인 5 2 로 뒤집었습니다. | 다시 볼 단계 | 03 | 전체 수를 분모에 쓰기 | 검토할 답 · 2 3 | 전체 5조각 중 2조각을 색칠해 남은 5-2=3을 분모로 사용했습니다. | 다시 볼 단계 | 03 | 전체 수를 분모에 쓰기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 13 · 피자에서 분모와 분자 찾기

- lessonId: `g3s1-fraction-pizza-context`
- catalogEntryId: `grade3-basic-practice-ppt-13`
- HTML SHA-256: `8df631401525de8eb7c4fcf2a5c1a783b6e30556a44def12c9c90440a5253a4a`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 13
- lessonId: g3s1-fraction-pizza-context
- title: 피자에서 분모와 분자 찾기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-fraction-pizza-context/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-fraction-pizza-context/ffe34a7b1391/g3s1-fraction-pizza-context-slides.html
- HTML SHA-256: 8df631401525de8eb7c4fcf2a5c1a783b6e30556a44def12c9c90440a5253a4a
- grade/semester/unit: 3학년 1학기 6. 분수와 소수
- standardCodes: [4수01-09]
- domain / official learning goal: 수와 연산 / 양의 등분할을 통하여 분수의 필요성을 인식하고, 분수를 이해하고 읽고 쓸 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-09.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-09]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 3차시 · 분수를 알아볼까요?(1) · pp.134-137
- source usage: 생활 그림에서 분수를 쓰고 읽으며 분모와 분자의 뜻을 말한다.
- catalogEntryId: grade3-basic-practice-ppt-13
- catalog snapshot SHA-256: 75fd0417bb48d147fca374e9c341369cdcc22a6d9bf4c7037de296ecb24b1300
- catalog availability: blocked
- blueprintFamily: fraction-part-whole-v1@1.0.0 · 같은 전체를 똑같이 나눈 조각과 부분의 수를 분수로 연결하는 판단을 공유한다.
- variationPreset: fraction-part-whole-13-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 피자 전체 조각 수와 선택한 조각 수를 분모·분자로 정한다.
- affordanceFamily: native-fraction-model-v1@1.0.0 · support=contracted
- affordance operation: 같은 전체를 일정한 조각으로 나누고 색칠한 조각 수를 비교한다.
- candidateToolKeys: NO03FM
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO03FM, research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:NO03FM
- layoutFamily: one-screen-fraction-workbench-v1@1.0.0 · 분수 native 모형의 전체·조각 reserve를 먼저 확보하고 설명 영역을 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 분수와 소수 | 두 답은 어디에서 달라졌을까요? | 피자 한 판을 똑같이 8조각으로 나누어 3조각을 먹었어요. | 전체 8칸 · 먹은 3칸 | 풀이 A | 3 8 | 풀이 B | 8 3 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 피자 8조각 중 3조각을 함께 세고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 분수와 소수 | 분자와 분모, 무엇이 위로 갈까요? | 먹은 3 / 전체 8 | 3 8 (맞는 순서) | 전체 8 / 먹은 3 | 8 3 (틀린 순서) | Q | 달라진 것은 조각 수가 아니라, 분자·분모의 자리예요.
  교사 메모: 4분 중 뒤 2분. 분자·분모의 자리를 바꿔보며 차이를 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 분모 정하기 | 보이는 정보로 답을 확인해요 | 피자 한 판을 똑같이 8조각으로 나누어 3조각을 먹었어요. 먹은 양을 분수로 나타내면 얼마일까요? | 3 8 | 3 8 | 8 3 | 3 5 | 핵심 이유 | 전체 조각 수는 분모, 고른 조각 수는 분자에 쓴다.
  교사 메모: 6분. 8조각 중 3조각을 함께 세고 분수로 나타냅니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 분수와 까닭을 남겨요 | 다시 볼 문제 | 피자 한 판을 똑같이 10조각으로 나누어 4조각을 먹었습니다. 먹은 양은 얼마일까요? | 4 10 ? | 4 10 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 전체 조각 수는 분모, 고른 조각 수는 분자에 쓴다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 전체8 먹은3 | 어느 단계에서 달라졌을까요? | 확인 기준 · 전체 조각 수는 분모, 고른 조각 수는 분자에 쓴다. | 검토할 답 · 8 3 | 먹은 수와 전체 수인 3 8 을 전체 수와 먹은 수인 8 3 으로 뒤집었습니다. | 다시 볼 단계 | 03 | 전체 수를 분모에 쓰기 | 검토할 답 · 3 5 | 전체 8조각 중 3조각을 먹어 남은 8-3=5를 분모로 사용했습니다. | 다시 볼 단계 | 03 | 전체 수를 분모에 쓰기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 14 · 연필에는 cm, 문에는 m

- lessonId: `g3s1-length-centimeter-meter`
- catalogEntryId: `grade3-basic-practice-ppt-14`
- HTML SHA-256: `c5cf817920b835668cc2c61473ca3a6b2b4f2ede1a5a9d36ff864fd9d41dee83`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 14
- lessonId: g3s1-length-centimeter-meter
- title: 연필에는 cm, 문에는 m
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-length-centimeter-meter/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-length-centimeter-meter/57fe6e1c935d/g3s1-length-centimeter-meter-slides.html
- HTML SHA-256: c5cf817920b835668cc2c61473ca3a6b2b4f2ede1a5a9d36ff864fd9d41dee83
- grade/semester/unit: 3학년 1학기 5. 길이와 시간
- standardCodes: [4수03-15]
- domain / official learning goal: 도형과 측정 / 길이 단위 1mm와 1km를 알고, 이를 이용하여 길이를 측정하고 어림하며 수학의 유용성을 인식할 수 있다.
- learningMapTopicId: kr.mt.math.geometry-measurement.g3-4.s4-03-15.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.27 (printed folio 21) > [4수03-15]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 2~5차시 전·사이 · 길이 단위 선택 선수 개념 진단 · pp.110-117
- source usage: cm와 m의 선수 감각을 확인하고 mm와 km 학습으로 이어 간다.
- catalogEntryId: grade3-basic-practice-ppt-14
- catalog snapshot SHA-256: 5de4092883bded8407de7ed93538158f3844fbe7f3d18347214f5377cb20bea0
- catalog availability: blocked
- blueprintFamily: length-unit-selection-v1@1.0.0 · 대상의 크기에 맞는 길이 단위를 고르고 단위의 의미를 설명하는 판단을 공유한다.
- variationPreset: length-unit-selection-14-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 연필과 문에 알맞은 길이 단위를 선택한다.
- affordanceFamily: native-unit-conversion-v1@1.0.0 · support=captured
- affordance operation: 큰 단위와 작은 단위의 묶음을 교환해 같은 양을 두 방식으로 나타낸다.
- candidateToolKeys: NO04NT, NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NT, research/mathcanvas/module-variant-contract.static.json#tool=NO04NT
- layoutFamily: one-screen-measurement-rail-v1@1.0.0 · 단위 선택·변환과 측정 근거를 가로 rail과 세로 설명 흐름으로 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 5. 길이와 시간 | 두 답은 어디에서 달라졌을까요? | 연필 한 자루의 길이로 알맞은 것은 무엇일까요? | 연필 ? | 연필 | 약 15 ? | 손에 쥐는 크기 · 알맞은 단위는? | 실제 크기를 어림해요 | 풀이 A | 약 15m | 풀이 B | 약 15cm | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 연필 길이를 어림하고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 5. 길이와 시간 | 교실 문의 높이는 어떤 단위가 맞을까요? | 연필 · 작은 물건 | 연필 ? | 약 15cm | 손에 쥐는 크기 → cm | 작은 물건 → cm (15cm) | 교실 문 · 큰 물건 | 교실 문 ? | 1m | 1m | 약 2m | 사람 키보다 큰 것 → m | 큰 물건 → m (2m) | Q | 물건의 크기에 따라 알맞은 단위가 달라져요.
  교사 메모: 4분 중 뒤 2분. 물건 크기를 바꿔 단위가 바뀌는지 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 단위 고르기 | 보이는 정보로 답을 확인해요 | 연필 한 자루의 길이로 알맞은 것은 무엇일까요? | 연필 ? | 연필 | 연필 길이는? 연필 약 15cm | 자 눈금 | 5cm | 10cm | 15cm | 20cm | 연필은 자 한 개 길이 안에 들어와요 · mm는 너무 작고, m는 너무 커요 | 약 15cm | 약 15cm | 약 15m | 약 15mm | 핵심 이유 | 작은 두께는 mm, 생활 물건은 cm·m, 먼 거리는 km가 알맞다.
  교사 메모: 6분. 연필의 실제 크기를 어림하고 알맞은 단위를 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 단위 선택과 까닭을 남겨요 | 다시 볼 문제 | 지우개의 길이와 복도의 길이에 알맞은 단위를 각각 고르세요. | 지우개 ? | 복도 ? | 지우개 | 약 5cm | 복도 | 약 20m | 작은 것은 cm · 건물 크기는 m | 단위는? | 지우개 cm · 복도 m | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 작은 두께는 mm, 생활 물건은 cm·m, 먼 거리는 km가 알맞다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 연필 15cm | 어느 단계에서 달라졌을까요? | 확인 기준 · 작은 두께는 mm, 생활 물건은 cm·m, 먼 거리는 km가 알맞다. | 검토할 답 · 약 15m | 15cm의 단위를 m로 바꾸어 약 15m로 판단했습니다. | 다시 볼 단계 | 03 | mm·cm·m·km 중 고르기 | 검토할 답 · 약 15mm | 15cm의 단위를 mm로 바꾸어 약 15mm로 판단했습니다. | 다시 볼 단계 | 03 | mm·cm·m·km 중 고르기 | 01 재려는 대상 확인하기 | 02 길이의 크기 어림하기 | 03 mm·cm·m·km 중 고르기 | 04 수와 단위를 함께 말하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 15 · 크기에 맞는 길이 단위

- lessonId: `g3s1-length-real-world-units`
- catalogEntryId: `grade3-basic-practice-ppt-15`
- HTML SHA-256: `7fb7e1bb7fdf64539c093302246ea1c84c3cdeda6077658c9f00093c3a4ec73b`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 15
- lessonId: g3s1-length-real-world-units
- title: 크기에 맞는 길이 단위
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-length-real-world-units/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-length-real-world-units/7da27cb1a1a4/g3s1-length-real-world-units-slides.html
- HTML SHA-256: 7fb7e1bb7fdf64539c093302246ea1c84c3cdeda6077658c9f00093c3a4ec73b
- grade/semester/unit: 3학년 1학기 5. 길이와 시간
- standardCodes: [4수03-15]
- domain / official learning goal: 도형과 측정 / 길이 단위 1mm와 1km를 알고, 이를 이용하여 길이를 측정하고 어림하며 수학의 유용성을 인식할 수 있다.
- learningMapTopicId: kr.mt.math.geometry-measurement.g3-4.s4-03-15.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.27 (printed folio 21) > [4수03-15]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 2~5차시 · 길이 단위 학습 종합 적용 · pp.110-117
- source usage: mm, cm, m, km 중 대상 크기에 알맞은 단위를 고르는 종합 적용에 활용한다.
- catalogEntryId: grade3-basic-practice-ppt-15
- catalog snapshot SHA-256: 851e6105ac84e9f5f6e506be5ba9fe80303c2fd4b54eecf04dc0d048f23b88d0
- catalog availability: blocked
- blueprintFamily: length-unit-selection-v1@1.0.0 · 대상의 크기에 맞는 길이 단위를 고르고 단위의 의미를 설명하는 판단을 공유한다.
- variationPreset: length-unit-selection-15-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 각 대상의 크기에 맞는 길이 단위를 고르고 어림값을 비교한다.
- affordanceFamily: native-unit-conversion-v1@1.0.0 · support=captured
- affordance operation: 큰 단위와 작은 단위의 묶음을 교환해 같은 양을 두 방식으로 나타낸다.
- candidateToolKeys: NO04NT, NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NT, research/mathcanvas/module-variant-contract.static.json#tool=NO04NT
- layoutFamily: one-screen-measurement-rail-v1@1.0.0 · 단위 선택·변환과 측정 근거를 가로 rail과 세로 설명 흐름으로 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 5. 길이와 시간 | 두 답은 어디에서 달라졌을까요? | 교실 문의 높이로 알맞은 것은 무엇일까요? | 교실 문 ? | 1m | 1m | 약 2 ? | 사람 키보다 큰 물건 · 알맞은 단위는? | 실제 크기를 어림해요 | 풀이 A | 약 2m | 풀이 B | 약 2km | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 교실 문 높이를 어림하고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 5. 길이와 시간 | 연필의 길이는 어떤 단위가 맞을까요? | 교실 문 · 큰 물건 | 교실 문 ? | 1m | 1m | 약 2m | 사람 키보다 큰 것 → m | 큰 물건 → m (2m) | 연필 · 작은 물건 | 연필 ? | 약 15cm | 손에 쥐는 크기 → cm | 작은 물건 → cm (15cm) | Q | 물건의 크기에 따라 알맞은 단위가 달라요.
  교사 메모: 4분 중 뒤 2분. 물건 크기를 바꿔 단위가 바뀌는지 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 단위 고르기 | 보이는 정보로 답을 확인해요 | 교실 문의 높이로 알맞은 것은 무엇일까요? | 교실 문 ? | 교실 문 | 1m | 1m | 1m 두 개 | 1m 막대 2개 높이 = ? 1m 막대 2개 높이 = 약 2m | 약 2m | 약 2m | 약 2km | 약 2cm | 핵심 이유 | 작은 두께는 mm, 생활 물건은 cm·m, 먼 거리는 km가 알맞다.
  교사 메모: 6분. 교실 문의 실제 크기를 어림하고 알맞은 단위를 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 단위 선택과 까닭을 남겨요 | 다시 볼 문제 | 단추의 두께와 두 도시 사이 거리에 알맞은 단위를 각각 고르세요. | 단추 ? | 두 도시 거리 ? | 단추 두께 | 약 2mm | 두 도시 거리 | 약 5km | 아주 작은 것은 mm · 아주 먼 것은 km | 단위는? | 단추 mm · 거리 km | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 작은 두께는 mm, 생활 물건은 cm·m, 먼 거리는 km가 알맞다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 교실문 2m | 어느 단계에서 달라졌을까요? | 확인 기준 · 작은 두께는 mm, 생활 물건은 cm·m, 먼 거리는 km가 알맞다. | 검토할 답 · 약 2km | 약 2m의 단위를 km로 바꾸어 약 2km로 판단했습니다. | 다시 볼 단계 | 03 | mm·cm·m·km 중 고르기 | 검토할 답 · 약 2cm | 약 2m의 단위를 cm로 바꾸어 약 2cm로 판단했습니다. | 다시 볼 단계 | 03 | mm·cm·m·km 중 고르기 | 01 재려는 대상 확인하기 | 02 길이의 크기 어림하기 | 03 mm·cm·m·km 중 고르기 | 04 수와 단위를 함께 말하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 16 · m·cm, km·m 연결하기

- lessonId: `g3s1-length-unit-conversion`
- catalogEntryId: `grade3-basic-practice-ppt-16`
- HTML SHA-256: `c7e5b1a50a5ab2a75b0fc7ddd5941ca949ec5fe54fa9e237b3a11725be0ad02b`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 16
- lessonId: g3s1-length-unit-conversion
- title: m·cm, km·m 연결하기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-length-unit-conversion/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s1-length-unit-conversion/087e32ac99e2/g3s1-length-unit-conversion-slides.html
- HTML SHA-256: c7e5b1a50a5ab2a75b0fc7ddd5941ca949ec5fe54fa9e237b3a11725be0ad02b
- grade/semester/unit: 3학년 1학기 5. 길이와 시간
- standardCodes: [4수03-16]
- domain / official learning goal: 도형과 측정 / 1cm와 1mm, 1km와 1m의 관계를 이해하고, 길이를 ‘몇 cm 몇 mm’와 ‘몇 mm’, ‘몇 km 몇 m’와 ‘몇 m’로 다양하게 표현할 수 있다.
- learningMapTopicId: kr.mt.math.geometry-measurement.g3-4.s4-03-16.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.27 (printed folio 21) > [4수03-16]
- unit authority: visang-grade-3-semester-1@2022 개정 · 2026년 학습 · 397690b480149e0d302b28282263e79d7f5b912f75b52300a23289fb4b1c7817 · HTML line 1418 > 목차 > 3학년 1학기
- textbook lesson: 4차시 전후 · m보다 큰 단위는 무엇일까요? · pp.114-115
- source usage: 1m=100cm를 복습하면서 1km=1000m 관계로 연결한다.
- catalogEntryId: grade3-basic-practice-ppt-16
- catalog snapshot SHA-256: b643e520fb514d527a0404405de31df2a5284697a06c3c5bb3e6730d6a4dc816
- catalog availability: blocked
- blueprintFamily: length-unit-conversion-v1@1.0.0 · cm·mm 또는 km·m 묶음을 교환해 같은 길이를 다른 방식으로 나타내는 판단을 공유한다.
- variationPreset: length-unit-conversion-16-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: m·cm 또는 km·m를 작은 단위 묶음으로 바꾸어 같은 길이를 나타낸다.
- affordanceFamily: native-unit-conversion-v1@1.0.0 · support=captured
- affordance operation: 큰 단위와 작은 단위의 묶음을 교환해 같은 양을 두 방식으로 나타낸다.
- candidateToolKeys: NO04NT, NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NT, research/mathcanvas/module-variant-contract.static.json#tool=NO04NT
- layoutFamily: one-screen-measurement-rail-v1@1.0.0 · 단위 선택·변환과 측정 근거를 가로 rail과 세로 설명 흐름으로 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 5. 길이와 시간 | 두 답은 어디에서 달라졌을까요? | 1m는 몇 cm일까요? | 1m = ?cm | 10cm 막대 10개 · 모두 몇 cm? | 길이 관계를 확인해요 | 풀이 A | 10cm | 풀이 B | 100cm | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 1m를 cm로 바꾸며 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 5. 길이와 시간 | 먼 거리도 같은 방법이 통할까요? | 1m = ?cm | 1m = 100cm | 10cm 막대 10개 = 100cm = 1m | 1m=100cm | 1km = ?m | 1km = 1000m | 100m 막대 10개 = 1000m = 1km | 1km=1000m | Q | 달라진 것은 방법이 아니라, 기준이 되는 배수예요.
  교사 메모: 4분 중 뒤 2분. 같은 방법이 km에도 통하는지 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 배수 적용 | 보이는 정보로 답을 확인해요 | 1m는 몇 cm일까요? | 1m = ?cm | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100 | 막대 하나 = 10cm | 10cm짜리 10개 = ?cm 10cm짜리 10개 = 100cm = 1m | 100cm | 100cm | 10cm | 1000cm | 핵심 이유 | 1m=100cm, 1km=1000m의 관계를 사용한다.
  교사 메모: 6분. 1m=100cm 관계를 함께 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 3m와 4km를 각각 더 작은 단위로 바꾸세요. | 1m = 100cm | 1km = 1000m | 1m 막대 3개 · 1km 막대 4개 | 3m=?cm · 4km=?m | 3m=300cm · 4km=4000m | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 1m=100cm, 1km=1000m의 관계를 사용한다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 1m=100cm | 어느 단계에서 달라졌을까요? | 확인 기준 · 1m=100cm, 1km=1000m의 관계를 사용한다. | 검토할 답 · 10cm | 1m=100cm 대신 1m=10cm로 변환했습니다. | 다시 볼 단계 | 01 | 바꿀 단위 관계 쓰기 | 검토할 답 · 1000cm | 1m=100cm 대신 1m=1000cm로 변환했습니다. | 다시 볼 단계 | 01 | 바꿀 단위 관계 쓰기 | 01 바꿀 단위 관계 쓰기 | 02 몇 배인지 확인하기 | 03 수에 배수를 적용하기 | 04 바뀐 단위로 검산하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 17 · 자릿값을 살려 먼저 곱하기

- lessonId: `g3s2-multiplication-place-value`
- catalogEntryId: `grade3-basic-practice-ppt-17`
- HTML SHA-256: `e93abe0d049db57fe2ad97ea3c643669e8fe3595a5783016d39057a6f3dfb366`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 17
- lessonId: g3s2-multiplication-place-value
- title: 자릿값을 살려 먼저 곱하기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-multiplication-place-value/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-multiplication-place-value/adaac21fbf05/g3s2-multiplication-place-value-slides.html
- HTML SHA-256: e93abe0d049db57fe2ad97ea3c643669e8fe3595a5783016d39057a6f3dfb366
- grade/semester/unit: 3학년 2학기 1. 곱셈
- standardCodes: [4수01-04]
- domain / official learning goal: 수와 연산 / 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-04.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-04]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 2~4차시 · (세 자리 수)×(한 자리 수) · pp.10-17
- source usage: 세 자리 수를 백, 십, 일로 나누어 각 부분곱의 자릿값을 보존한다.
- catalogEntryId: grade3-basic-practice-ppt-17
- catalog snapshot SHA-256: 5e59179147888e2c1ba549083fef9fbbdcf630c1de5417a007299da709137f98
- catalog availability: blocked
- blueprintFamily: place-value-distributive-product-v1@1.0.0 · 두 자리 수를 자릿값에 따라 나누어 부분곱을 구성하는 판단을 공유한다.
- variationPreset: place-value-distributive-product-17-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 두 자리 수를 자릿값에 따라 나누어 먼저 계산할 부분을 정한다.
- affordanceFamily: native-place-value-model-v1@1.0.0 · support=contracted
- affordance operation: 자릿값 모형의 묶음을 교환하거나 자리별 개수를 비교한다.
- candidateToolKeys: NO04PD
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04PD, research/mathcanvas/wave14-place-value-release-canary.json#tool=NO04PD
- layoutFamily: one-screen-choice-workbench-v1@1.0.0 · 예상 선택, native 확인, 설명, 수정의 네 구역을 한 화면 세로 흐름으로 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 1. 곱셈 | 두 답은 어디에서 달라졌을까요? | 24×3을 계산하려고 해요. 먼저 20×3은 얼마일까요? | 십의 자리 2 · 일의 자리 4 | 풀이 A | 60 | 풀이 B | 6 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 24를 20과 4로 나누고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 1. 곱셈 | 자릿수가 늘어도 같은 방법이 통할까요? | 24×3 · 20×3=? | 20×3=60 | 324×3 · 300×3=? | 324 → 300+20+4 | 300×3=900 | Q | 달라진 것은 방법이 아니라, 자리 수가 늘어난 것뿐이에요.
  교사 메모: 4분 중 뒤 2분. 자리 수가 늘어난 324×3에도 같은 방법을 적용해봅니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 부분곱 기록 | 보이는 정보로 답을 확인해요 | 24×3을 계산하려고 해요. 먼저 20×3은 얼마일까요? | 60 | 60 | 6 | 23 | 핵심 이유 | 자릿값을 그대로 살려 각 부분을 곱한다.
  교사 메모: 6분. 24를 20과 4로 나누어 각각 곱해봅니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 241×3에서 200, 40, 1을 각각 곱한 뒤 답을 구하세요. | 200×3, 40×3, 1×3 | 합은? | 600+120+3=723 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 자릿값을 그대로 살려 각 부분을 곱한다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 24×3 | 어느 단계에서 달라졌을까요? | 확인 기준 · 자릿값을 그대로 살려 각 부분을 곱한다. | 검토할 답 · 6 | 20을 2로 읽고 2×3=6으로 계산했습니다. | 다시 볼 단계 | 01 | 수의 자릿값 나누기 | 검토할 답 · 23 | 20×3 대신 20+3=23으로 바꾸었습니다. | 다시 볼 단계 | 02 | 각 자릿값에 곱하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 18 · 부분곱을 빠짐없이 더하기

- lessonId: `g3s2-multiplication-combine`
- catalogEntryId: `grade3-basic-practice-ppt-18`
- HTML SHA-256: `61061ec04f33360a25e84d145bec59e5d12aed6d19098f7adb062699bec85be4`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 18
- lessonId: g3s2-multiplication-combine
- title: 부분곱을 빠짐없이 더하기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-multiplication-combine/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-multiplication-combine/77302ccac363/g3s2-multiplication-combine-slides.html
- HTML SHA-256: 61061ec04f33360a25e84d145bec59e5d12aed6d19098f7adb062699bec85be4
- grade/semester/unit: 3학년 2학기 1. 곱셈
- standardCodes: [4수01-04]
- domain / official learning goal: 수와 연산 / 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-04.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-04]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 2~4차시 · (세 자리 수)×(한 자리 수) · pp.10-17
- source usage: 여러 받아올림 경우에 공통으로 필요한 부분곱 합치기를 점검한다.
- catalogEntryId: grade3-basic-practice-ppt-18
- catalog snapshot SHA-256: eeb1b1b036720f953e190d3cfbdc0890a71bd40e0b5af89d08ddbf0bbc79e73a
- catalog availability: blocked
- blueprintFamily: place-value-distributive-product-v1@1.0.0 · 두 자리 수를 자릿값에 따라 나누어 부분곱을 구성하는 판단을 공유한다.
- variationPreset: place-value-distributive-product-18-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 부분곱을 어떤 순서로 더해 전체 곱을 완성할지 결정한다.
- affordanceFamily: native-place-value-model-v1@1.0.0 · support=contracted
- affordance operation: 자릿값 모형의 묶음을 교환하거나 자리별 개수를 비교한다.
- candidateToolKeys: NO04PD
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04PD, research/mathcanvas/wave14-place-value-release-canary.json#tool=NO04PD
- layoutFamily: one-screen-choice-workbench-v1@1.0.0 · 예상 선택, native 확인, 설명, 수정의 네 구역을 한 화면 세로 흐름으로 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 1. 곱셈 | 두 답은 어디에서 달라졌을까요? | 20×3은 60이고 4×3은 12예요. 두 결과를 합치면 얼마일까요? | 60+12 | 60 | 12 | 60 + 12 | 두 부분곱을 더해요 | 풀이 A | 612 | 풀이 B | 72 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 두 부분곱을 합쳐보고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 1. 곱셈 | 자리 수가 늘어도 같은 방법이 통할까요? | 60+12=? | 60+12 | 60 | 12 | 부분곱 2개 | 72 | 600+120+21=? | 600+120+21 | 600 | 120 | 21 | 부분곱 3개 — 방법은 같음 | 741 | Q | 달라진 것은 방법이 아니라, 더하는 부분곱의 개수예요.
  교사 메모: 4분 중 뒤 2분. 세 부분곱이 있는 경우로 확장해봅니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 부분곱 더하기 | 보이는 정보로 답을 확인해요 | 20×3은 60이고 4×3은 12예요. 두 결과를 합치면 얼마일까요? | 60+12 | 20×3 = 60 | 4×3 = 12 | → | 60+12 | ? 72 | 72 | 72 | 612 | 27 | 핵심 이유 | 각 자리에서 만든 부분곱은 이어 붙이지 않고 더한다.
  교사 메모: 6분. 두 부분곱을 더해 원래 곱셈 결과를 만들어봅니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 213×3의 세 부분곱을 구해 합치세요. | 200×3, 10×3, 3×3 | 600 | 30 | 9 | 600 + 30 + 9 | 합은? | 600+30+9=639 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 각 자리에서 만든 부분곱은 이어 붙이지 않고 더한다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 60+12 | 어느 단계에서 달라졌을까요? | 확인 기준 · 각 자리에서 만든 부분곱은 이어 붙이지 않고 더한다. | 검토할 답 · 612 | 부분곱 60과 12를 덧셈하지 않고 6|12=612로 이어 썼습니다. | 다시 볼 단계 | 03 | 부분곱 모두 더하기 | 검토할 답 · 27 | 60+12 대신 24+3=27을 답으로 사용했습니다. | 다시 볼 단계 | 01 | 각 부분곱 확인하기 | 01 각 부분곱 확인하기 | 02 같은 전체의 부분인지 확인하기 | 03 부분곱 모두 더하기 | 04 원래 곱셈으로 검산하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 19 · 두 자리 수를 나누어 곱하기

- lessonId: `g3s2-multiplication-two-digit`
- catalogEntryId: `grade3-basic-practice-ppt-19`
- HTML SHA-256: `07e5db55d4d438740499f2b2d9cb57f84863b2db1777e57f964d4a8d8049891e`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 19
- lessonId: g3s2-multiplication-two-digit
- title: 두 자리 수를 나누어 곱하기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-multiplication-two-digit/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-multiplication-two-digit/038c15141faa/g3s2-multiplication-two-digit-slides.html
- HTML SHA-256: 07e5db55d4d438740499f2b2d9cb57f84863b2db1777e57f964d4a8d8049891e
- grade/semester/unit: 3학년 2학기 1. 곱셈
- standardCodes: [4수01-04]
- domain / official learning goal: 수와 연산 / 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-04.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-04]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 7~8차시 · (몇십몇)×(몇십몇) · pp.22-25
- source usage: 두 번째 수를 십과 일로 나누어 두 부분곱을 만든 뒤 더한다.
- catalogEntryId: grade3-basic-practice-ppt-19
- catalog snapshot SHA-256: d8fbb25200272734c1d3fcd29feea4fc0c5d6683840f67d11d708282b9d2ac12
- catalog availability: blocked
- blueprintFamily: place-value-distributive-product-v1@1.0.0 · 두 자리 수를 자릿값에 따라 나누어 부분곱을 구성하는 판단을 공유한다.
- variationPreset: place-value-distributive-product-19-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 두 자리 수를 나누어 곱셈의 부분곱을 구성한다.
- affordanceFamily: native-place-value-model-v1@1.0.0 · support=contracted
- affordance operation: 자릿값 모형의 묶음을 교환하거나 자리별 개수를 비교한다.
- candidateToolKeys: NO04PD
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04PD, research/mathcanvas/wave14-place-value-release-canary.json#tool=NO04PD
- layoutFamily: one-screen-choice-workbench-v1@1.0.0 · 예상 선택, native 확인, 설명, 수정의 네 구역을 한 화면 세로 흐름으로 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 1. 곱셈 | 두 답은 어디에서 달라졌을까요? | 23×12에서 23×10은 230, 23×2는 46이에요. 답은 얼마일까요? | 230+46 | 230 | 46 | 230 + 46 | 두 부분곱을 더해요 | 풀이 A | 276 | 풀이 B | 2346 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 23×10과 23×2를 각각 구하고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 1. 곱셈 | 두 자리 수 곱셈도 부분곱을 더할까요? | 230+46=? | 230+46 | 230 | 46 | 23×10 과 23×2 를 이어 붙이기 | 276 | 320+128=? | 320+128 | 320 | 128 | 부분곱 두 개는 그대로, 길이만 달라짐 | 448 | Q | 달라진 것은 방법이 아니라, 곱해지는 두 자리 수예요.
  교사 메모: 4분 중 뒤 2분. 다른 두 자리 수 곱셈에도 같은 방법을 적용해봅니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 부분곱 더하기 | 보이는 정보로 답을 확인해요 | 23×12에서 23×10은 230, 23×2는 46이에요. 답은 얼마일까요? | 230+46 | 23×10 | 230 | 23×2 | 46 | 가로 23 · 세로 12를 10과 2로 나눔 | + | 230+46 | ? 276 | 276 | 276 | 2346 | 253 | 핵심 이유 | 두 자리 수를 십과 일로 나누어 두 부분곱을 빠짐없이 구한다.
  교사 메모: 6분. 23×10과 23×2를 각각 구해 더해봅니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 32×14를 32×10과 32×4로 나누어 계산하세요. | 32×10, 32×4 | 320 | 128 | 320 + 128 | 합은? | 320+128=448 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 두 자리 수를 십과 일로 나누어 두 부분곱을 빠짐없이 구한다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 23×12 | 어느 단계에서 달라졌을까요? | 확인 기준 · 두 자리 수를 십과 일로 나누어 두 부분곱을 빠짐없이 구한다. | 검토할 답 · 2346 | 230+46을 계산하지 않고 230의 0을 버린 뒤 23|46=2346으로 적었습니다. | 다시 볼 단계 | 03 | 두 부분곱 더하기 | 검토할 답 · 253 | 23×12 대신 23+230=253으로 계산했습니다. | 다시 볼 단계 | 02 | 첫 수에 각각 곱하기 | 01 두 번째 수를 십과 일로 나누기 | 02 첫 수에 각각 곱하기 | 03 두 부분곱 더하기 | 04 어림으로 크기 확인하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 20 · 나눗셈이 묻는 두 가지

- lessonId: `g3s2-division-meaning`
- catalogEntryId: `grade3-basic-practice-ppt-20`
- HTML SHA-256: `ba840ff67b7073a4cb8173b8125fe57a8cc82d8f86450460c599856fa5aa42c1`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 20
- lessonId: g3s2-division-meaning
- title: 나눗셈이 묻는 두 가지
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-division-meaning/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-division-meaning/abe2596991c3/g3s2-division-meaning-slides.html
- HTML SHA-256: ba840ff67b7073a4cb8173b8125fe57a8cc82d8f86450460c599856fa5aa42c1
- grade/semester/unit: 3학년 2학기 2. 나눗셈
- standardCodes: [4수01-05]
- domain / official learning goal: 수와 연산 / 나눗셈이 이루어지는 실생활 상황과 연결하여 나눗셈의 의미를 알고, 곱셈과 나눗셈의 관계를 이해한다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-05.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-05]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 1차시 단원 도입~2차시 전 · 두 자리 수 나눗셈 전 뜻 진단 · pp.32-35
- source usage: 계산 절차 전에 한 묶음의 수와 묶음 수라는 나눗셈의 두 뜻을 진단한다.
- catalogEntryId: grade3-basic-practice-ppt-20
- catalog snapshot SHA-256: 3c98890d223ebc7aad7a871ab8c3eaf709174f7f61e80a2ed786f985a9ed297e
- catalog availability: blocked
- blueprintFamily: division-remainder-meaning-v1@1.0.0 · 곱셈과 나눗셈의 관계로 몫·나머지와 처음 수를 되짚는 판단을 공유한다.
- variationPreset: division-remainder-meaning-20-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 나눗셈에서 묶음의 크기를 묻는지 묶음 수를 묻는지 구분한다.
- affordanceFamily: native-counting-model-v1@1.0.0 · support=contracted
- affordance operation: 낱개를 같은 수씩 묶고 묶음과 남은 낱개의 수를 확인한다.
- candidateToolKeys: NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO01SC, research/mathcanvas/division-counting-group-canary.json#claim=released:NO01SC
- layoutFamily: one-screen-division-workbench-v1@1.0.0 · 묶음·잔여 native 조작과 식 설명 rail을 한 화면에 고정한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 2. 나눗셈 | 두 답은 어디에서 달라졌을까요? | 24개를 6개씩 묶으면 몇 묶음일까요? | 전체 24개 · 6개씩 묶기 | 풀이 A | 6묶음 | 풀이 B | 4묶음 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 24개를 6개씩 묶어보고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 2. 나눗셈 | 묶음 크기가 바뀌면 묶음 수도 바뀔까요? | 24÷6 = ? | 24÷6=4 | 24÷4 = ? | 24÷4=6 | Q | 달라진 것은 전체 수가 아니라, 한 묶음의 크기예요.
  교사 메모: 4분 중 뒤 2분. 묶음 크기를 바꿔 묶음 수가 바뀌는지 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 구하는 것 말하기 | 보이는 정보로 답을 확인해요 | 24개를 6개씩 묶으면 몇 묶음일까요? | 4묶음 | 4묶음 | 6묶음 | 18묶음 | 핵심 이유 | 나눗셈은 한 묶음의 수나 묶음 수를 구하는 식이다.
  교사 메모: 6분. 24개를 6개씩 묶어보며 묶음 수를 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 구슬 28개를 7개씩 묶으면 몇 묶음일까요? | 28÷7=? | 28÷7=4 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 나눗셈은 한 묶음의 수나 묶음 수를 구하는 식이다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 24÷6 | 어느 단계에서 달라졌을까요? | 확인 기준 · 나눗셈은 한 묶음의 수나 묶음 수를 구하는 식이다. | 검토할 답 · 6묶음 | 24÷6에서 나누는 수 6을 몫으로 선택했습니다. | 다시 볼 단계 | 03 | 무엇을 구하는지 말하기 | 검토할 답 · 18묶음 | 24÷6 대신 24-6=18을 계산했습니다. | 다시 볼 단계 | 03 | 무엇을 구하는지 말하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 21 · 먼저 나누고 남은 수 찾기

- lessonId: `g3s2-division-remainder`
- catalogEntryId: `grade3-basic-practice-ppt-21`
- HTML SHA-256: `7a70b72ad06995675ac477348857feaaf2f4504db30338bc40b6d893d444fec4`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 21
- lessonId: g3s2-division-remainder
- title: 먼저 나누고 남은 수 찾기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-division-remainder/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-division-remainder/f154e104ad4d/g3s2-division-remainder-slides.html
- HTML SHA-256: 7a70b72ad06995675ac477348857feaaf2f4504db30338bc40b6d893d444fec4
- grade/semester/unit: 3학년 2학기 2. 나눗셈
- standardCodes: [4수01-06]
- domain / official learning goal: 수와 연산 / 나누는 수가 한 자리 수인 나눗셈의 계산 원리를 이해하고 그 계산을 할 수 있으며, 나눗셈에서 몫과 나머지의 의미를 안다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-06.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-06]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 4~7차시 · 나머지가 없는·있는 (몇십몇)÷(몇) · pp.38-47
- source usage: 나머지가 없는 계산에서 10개씩 먼저 나누는 방법을 확인한 뒤, 남은 수도 다시 나누어 몫과 최종 나머지를 구별한다.
- catalogEntryId: grade3-basic-practice-ppt-21
- catalog snapshot SHA-256: 53ba450dc9da60bc6c5e4f2d3f97394f11fdf7b2e66d4bfe83885780d338fe4d
- catalog availability: blocked
- blueprintFamily: division-remainder-meaning-v1@1.0.0 · 곱셈과 나눗셈의 관계로 몫·나머지와 처음 수를 되짚는 판단을 공유한다.
- variationPreset: division-remainder-build-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 먼저 만들 수 있는 같은 묶음 수와 남는 수를 정한다.
- affordanceFamily: native-counting-model-v1@1.0.0 · support=contracted
- affordance operation: 낱개를 같은 수씩 묶고 묶음과 남은 낱개의 수를 확인한다.
- candidateToolKeys: NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO01SC, research/mathcanvas/division-counting-group-canary.json#claim=released:NO01SC
- layoutFamily: one-screen-division-workbench-v1@1.0.0 · 묶음·잔여 native 조작과 식 설명 rail을 한 화면에 고정한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 2. 나눗셈 | 어느 풀이가 나눗셈을 끝까지 한 걸까요? | 풀이 A 4명에게 10개씩 주고 | 12개가 남았다고 썼어요. 52−40=12 | 풀이 B 남은 12개도 4명에게 | 똑같이 다시 나눴어요. 12÷4=3 | 먼저 고른 뒤, ‘남은 수가 4보다 크거나 같은가?’를 근거로 말해 보세요.
  교사 메모: 4분. 두 풀이를 같은 크기로 제시하고 먼저 예상과 근거를 말하게 합니다.
- 03 02 수학적 확인 (early-mathematical-confirmation-source) · HTML static normalized text: 02 · 수학적 확인 · 4분 | 2. 나눗셈 | 12개도 다시 나눌 수 있을까요? | 먼저 나누기 | 4×10=40 | → | 아직 나눌 수 | 52−40=12 | → | 다시 나누기 | 12÷4=3 | 10개와 3개를 합치면 한 사람 몫은 몇 개일까요? | 10+3=13이므로 52÷4=13입니다.
  교사 메모: 예상을 들은 뒤 확인하기 버튼으로 계산을 공개합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 2. 나눗셈 | 먼저 예상 → 계산으로 확인 | 56개를 4명에게 똑같이 나누면? | 4×10=40 → 56−40=16 → 16÷4=? 16÷4=4 | 14개 | 14개 | 16개 | 10개 | 10+4=14이므로 56÷4=14
  교사 메모: 6분. 보기의 강조 없이 먼저 고르게 한 뒤 계산으로 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 2. 나눗셈 | 활동지 2번을 혼자 끝까지 풀어요 | 도움을 받지 않고 활동지 2번의 빈칸을 채워요. | 활동지 계산 · 17개를 5명에게 다시 나누기 | 중간에 남은 수와 마지막에 남은 수를 구별하세요. | 활동지에 ① 17÷5 ② 전체 몫 ③ 최종 나머지를 써 보세요. | 17−15=2 · 17÷5=3…2 | 67÷5=13…2 | 2<5이므로 2가 최종 나머지예요. | 01 10개씩 먼저 나누기 | 02 아직 나눌 수 구하기 | 03 남은 수도 다시 나누기 | 04 몫을 합치고 남은 수 확인하기
  교사 메모: 5분. 도움을 받지 않고 활동지 2번의 중간 수, 이어 계산, 최종 몫과 나머지를 혼자 완성하게 합니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 2. 나눗셈 | 활동지 오류는 어느 단계부터 고칠까요? | 선택 · 02 아직 나눌 수 구하기 · 03 남은 수도 다시 나누기 | 검토할 풀이 A 52÷4=10…12 | 남은 12개를 더 나누지 않고 멈췄어요. | 03 · 남은 수도 다시 나누기 | 검토할 풀이 B 52−40=2 | 52−40=12에서 십의 자리 1을 빠뜨렸어요. | 02 · 아직 나눌 수 구하기 | 각 풀이에서 가장 먼저 고쳐야 할 단계를 골라 보세요.
  교사 메모: 3분. 답을 고치는 대신 가장 먼저 틀린 단계를 찾게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 22 · 몫과 나머지로 처음 수 확인하기

- lessonId: `g3s2-division-remainder-check`
- catalogEntryId: `grade3-basic-practice-ppt-22`
- HTML SHA-256: `1048d1d8a2660f6e015eaa7a7d7707f6ef2328b439973431f14fda85ffe057c9`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 22
- lessonId: g3s2-division-remainder-check
- title: 몫과 나머지로 처음 수 확인하기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-division-remainder-check/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-division-remainder-check/cd44b7ffb91c/g3s2-division-remainder-check-slides.html
- HTML SHA-256: 1048d1d8a2660f6e015eaa7a7d7707f6ef2328b439973431f14fda85ffe057c9
- grade/semester/unit: 3학년 2학기 2. 나눗셈
- standardCodes: [4수01-06]
- domain / official learning goal: 수와 연산 / 나누는 수가 한 자리 수인 나눗셈의 계산 원리를 이해하고 그 계산을 할 수 있으며, 나눗셈에서 몫과 나머지의 의미를 안다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-06.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-06]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 6~7차시 · 나머지가 있는 (몇십몇)÷(몇) · pp.42-47
- source usage: 나누는 수×몫+나머지로 결과를 검산하고 나머지의 뜻을 확인한다.
- catalogEntryId: grade3-basic-practice-ppt-22
- catalog snapshot SHA-256: 2008ecf167175b785949ad5757a74017e5fa68c0a1c653754d3934e904b7bce8
- catalog availability: blocked
- blueprintFamily: division-remainder-meaning-v1@1.0.0 · 곱셈과 나눗셈의 관계로 몫·나머지와 처음 수를 되짚는 판단을 공유한다.
- variationPreset: division-remainder-reconstruct-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 몫과 나머지로 나누기 전의 처음 수를 되돌릴지 결정한다.
- affordanceFamily: native-counting-model-v1@1.0.0 · support=contracted
- affordance operation: 낱개를 같은 수씩 묶고 묶음과 남은 낱개의 수를 확인한다.
- candidateToolKeys: NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO01SC, research/mathcanvas/division-counting-group-canary.json#claim=released:NO01SC
- layoutFamily: one-screen-division-workbench-v1@1.0.0 · 묶음·잔여 native 조작과 식 설명 rail을 한 화면에 고정한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 2. 나눗셈 | 두 답은 어디에서 달라졌을까요? | 29÷4의 몫이 7, 나머지가 1인지 확인하는 식은 무엇일까요? | 4×7+1 | 4개씩 7묶음 + 나머지 1 = ? | 나누는 수×몫+나머지 | 풀이 A | 4×7-1=27 | 풀이 B | 4×7+1=29 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 29÷4의 몫과 나머지를 곱셈으로 확인하고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 2. 나눗셈 | 나머지가 있어도 검산이 통할까요? | 4×7+1=? | 4×7+1 | 4개씩 7묶음 + 나머지 1 = 29 | 29 (맞음) | 6×7+5=? | 6×7+5 | 6개씩 7묶음 + 나머지 5 = 47 | 47 (맞음) | Q | 달라진 것은 방법이 아니라, 나누는 수와 나머지예요.
  교사 메모: 4분 중 뒤 2분. 나머지가 다른 문제로 같은 방법이 통하는지 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 처음 수 비교 | 보이는 정보로 답을 확인해요 | 29÷4의 몫이 7, 나머지가 1인지 확인하는 식은 무엇일까요? | 4×7+1 | 4개씩 | 7묶음 | 나머지 1 | 4×7+1 = ? 4×7+1 = 29 | 4×7+1=29 | 4×7+1=29 | 4×7-1=27 | 4+7+1=12 | 핵심 이유 | 나누는 수 × 몫 + 나머지 = 처음 수
  교사 메모: 6분. 29÷4의 몫과 나머지를 곱셈으로 검산합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 38÷6=6…2가 맞는지 곱셈으로 확인하세요. | 6×6+2 | 6개씩 6묶음 + 나머지 2 = 38 | 6×6+2=? | 6×6+2=38 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 나누는 수 × 몫 + 나머지 = 처음 수
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 4×7+1=29 | 어느 단계에서 달라졌을까요? | 확인 기준 · 나누는 수 × 몫 + 나머지 = 처음 수 | 검토할 답 · 4×7-1=27 | 4×7+1=29 대신 4×7-1=27로 확인했습니다. | 다시 볼 단계 | 02 | 나머지 더하기 | 검토할 답 · 4+7+1=12 | 4×7+1을 4+7+1=12로 바꾸었습니다. | 다시 볼 단계 | 01 | 나누는 수와 몫 곱하기 | 01 나누는 수와 몫 곱하기 | 02 나머지 더하기 | 03 처음 수와 비교하기 | 04 나머지의 크기 확인하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 23 · 원의 중심과 반지름 찾기

- lessonId: `g3s2-circle-parts`
- catalogEntryId: `grade3-basic-practice-ppt-23`
- HTML SHA-256: `1cce88148be4deca5e204f6f59906e46b0674e9679dbed40d8630225a4d4ef40`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 23
- lessonId: g3s2-circle-parts
- title: 원의 중심과 반지름 찾기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-circle-parts/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-circle-parts/275ac3fe9f24/g3s2-circle-parts-slides.html
- HTML SHA-256: 1cce88148be4deca5e204f6f59906e46b0674e9679dbed40d8630225a4d4ef40
- grade/semester/unit: 3학년 2학기 3. 원
- standardCodes: [4수03-06]
- domain / official learning goal: 도형과 측정 / 원의 중심, 반지름, 지름을 이해하고, 그 성질을 안다.
- learningMapTopicId: kr.mt.math.geometry-measurement.g3-4.s4-03-06.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.26 (printed folio 20) > [4수03-06]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 2~3차시 · 원의 중심, 반지름, 지름을 알아볼까요? · pp.64-67
- source usage: 중심과 원 위의 점을 직접 짚으며 반지름을 정의한다.
- catalogEntryId: grade3-basic-practice-ppt-23
- catalog snapshot SHA-256: 8ed8ebe9a29b0b29c61b5c2c7829c7e370793f75d2f0b56bb7d23d037ab85386
- catalog availability: blocked
- blueprintFamily: circle-components-v1@1.0.0 · 원의 중심·반지름·지름 관계를 native 원 모형으로 확인하는 판단을 공유한다.
- variationPreset: circle-components-23-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 원에서 중심과 반지름을 나타내는 점·선을 선택한다.
- affordanceFamily: native-circle-model-v1@1.0.0 · support=captured
- affordance operation: 원의 중심에서 원 위 점까지 선을 조작해 반지름·지름을 확인한다.
- candidateToolKeys: SM07CS
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=SM07CS
- layoutFamily: one-screen-circle-workbench-v1@1.0.0 · 원 native 요소의 중심·반지름·지름 reserve를 중심으로 설명과 수정 영역을 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 원 | 두 답은 어디에서 달라졌을까요? | 원의 중심에서 원 위까지 그은 선분을 무엇이라고 할까요? | O A | 중심과 원 위의 한 점을 이었어요 | 풀이 A | 반지름 | 풀이 B | 지름 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 중심에서 원 위까지 그은 선분을 보고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 원 | 선분을 반대편까지 늘이면 무엇이 될까요? | 중심 → 한 점 (반지름) | O A | 이름: 반지름 | 한 점 → 반대편 점 (지름) | O A B | 이름: 지름 | Q | 달라진 것은 원이 아니라, 선분이 지나는 범위예요.
  교사 메모: 4분 중 뒤 2분. 선분을 원 반대편까지 늘여 지름과 비교합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 선분 긋기 | 보이는 정보로 답을 확인해요 | 원의 중심에서 원 위까지 그은 선분을 무엇이라고 할까요? | O A | 반지름 | 반지름 | 지름 | 둘레 | 핵심 이유 | 원의 중심과 원 위의 한 점을 이은 선분이 반지름이다.
  교사 메모: 6분. 원의 중심과 원 위의 점을 이은 선분을 함께 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 이름과 근거를 남겨요 | 다시 볼 문제 | 점 O가 원의 중심이고 A가 원 위의 점일 때 선분 OA의 이름은 무엇일까요? | O A | OA=? | 반지름 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 원의 중심과 원 위의 한 점을 이은 선분이 반지름이다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 선분 OA | 어느 단계에서 달라졌을까요? | 확인 기준 · 원의 중심과 원 위의 한 점을 이은 선분이 반지름이다. | 검토할 답 · 지름 | 중심→원 위 한 점인 선분을 지름으로 판단했습니다. | 다시 볼 단계 | 04 | 선분을 반지름으로 말하기 | 검토할 답 · 둘레 | 중심과 원 위를 잇는 선분을 원의 둘레로 판단했습니다. | 다시 볼 단계 | 04 | 선분을 반지름으로 말하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 24 · 반지름 두 개가 만드는 지름

- lessonId: `g3s2-circle-diameter`
- catalogEntryId: `grade3-basic-practice-ppt-24`
- HTML SHA-256: `123c01b8fcd1274e877af8851d89068ecad77efaabb716596132d8196c3ac0c8`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 24
- lessonId: g3s2-circle-diameter
- title: 반지름 두 개가 만드는 지름
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-circle-diameter/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-circle-diameter/4180daf033e8/g3s2-circle-diameter-slides.html
- HTML SHA-256: 123c01b8fcd1274e877af8851d89068ecad77efaabb716596132d8196c3ac0c8
- grade/semester/unit: 3학년 2학기 3. 원
- standardCodes: [4수03-06]
- domain / official learning goal: 도형과 측정 / 원의 중심, 반지름, 지름을 이해하고, 그 성질을 안다.
- learningMapTopicId: kr.mt.math.geometry-measurement.g3-4.s4-03-06.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.26 (printed folio 20) > [4수03-06]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 4차시 · 원의 성질을 알아볼까요? · pp.68-69
- source usage: 중심을 지나는 지름이 반지름 두 개의 길이라는 성질을 확인한다.
- catalogEntryId: grade3-basic-practice-ppt-24
- catalog snapshot SHA-256: c163d94c52771b5841b7c5994e3d72b84e9a913268d047828ca9bf575b7a99da
- catalog availability: blocked
- blueprintFamily: circle-components-v1@1.0.0 · 원의 중심·반지름·지름 관계를 native 원 모형으로 확인하는 판단을 공유한다.
- variationPreset: circle-components-24-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 중심을 지나 반지름 두 개가 이어지는 선분을 지름으로 판단한다.
- affordanceFamily: native-circle-model-v1@1.0.0 · support=captured
- affordance operation: 원의 중심에서 원 위 점까지 선을 조작해 반지름·지름을 확인한다.
- candidateToolKeys: SM07CS
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=SM07CS
- layoutFamily: one-screen-circle-workbench-v1@1.0.0 · 원 native 요소의 중심·반지름·지름 reserve를 중심으로 설명과 수정 영역을 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 원 | 두 답은 어디에서 달라졌을까요? | 반지름이 4cm인 원의 지름은 얼마일까요? | O A B | 지름은 중심을 지나요 | 풀이 A | 4cm | 풀이 B | 8cm | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 반지름 4cm인 원의 지름을 구하고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 3. 원 | 반지름이 바뀌면 지름도 바뀔까요? | 반지름 4cm → 지름? | O A B | 지름=8cm | 반지름 6cm → 지름? | O A B | 지름=12cm | Q | 달라진 것은 방법이 아니라, 반지름의 길이예요.
  교사 메모: 4분 중 뒤 2분. 반지름 크기를 바꿔 지름이 바뀌는지 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 두 배 관계 | 보이는 정보로 답을 확인해요 | 반지름이 4cm인 원의 지름은 얼마일까요? | O A B | 8cm | 8cm | 4cm | 16cm | 핵심 이유 | 지름은 중심을 지나며 반지름의 2배이다.
  교사 메모: 6분. 반지름 4cm를 두 배 하여 지름을 구합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 반지름이 7cm인 원의 지름은 몇 cm일까요? | 7×2 | 7×2=? | 7×2=14cm | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 지름은 중심을 지나며 반지름의 2배이다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 반지름4cm | 어느 단계에서 달라졌을까요? | 확인 기준 · 지름은 중심을 지나며 반지름의 2배이다. | 검토할 답 · 4cm | 지름을 반지름과 같은 4cm라고 판단했습니다. | 다시 볼 단계 | 03 | 반지름 두 개로 나누어 보기 | 검토할 답 · 16cm | 4+4=8 대신 4×4=16cm로 계산했습니다. | 다시 볼 단계 | 04 | 두 배 관계 계산하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 25 · 색칠한 부분을 분수로

- lessonId: `g3s2-fraction-part-whole`
- catalogEntryId: `grade3-basic-practice-ppt-25`
- HTML SHA-256: `093bc8724b0aa5af3b8447be00f6be93d63ebab1e7b91a7e612a11cda6c5cef9`
- catalog alignment: `needs-review` · unit-title-mismatch:분수->분수와 소수

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 25
- lessonId: g3s2-fraction-part-whole
- title: 색칠한 부분을 분수로
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-fraction-part-whole/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-fraction-part-whole/00a610968113/g3s2-fraction-part-whole-slides.html
- HTML SHA-256: 093bc8724b0aa5af3b8447be00f6be93d63ebab1e7b91a7e612a11cda6c5cef9
- grade/semester/unit: 3학년 2학기 4. 분수와 소수
- standardCodes: [4수01-09]
- domain / official learning goal: 수와 연산 / 양의 등분할을 통하여 분수의 필요성을 인식하고, 분수를 이해하고 읽고 쓸 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-09.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-09]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 2차시 · 분수로 나타내어 볼까요? · pp.80-81
- source usage: 등분된 전체에서 주어진 부분을 분수로 나타낸다.
- catalogEntryId: grade3-basic-practice-ppt-25
- catalog snapshot SHA-256: 4a49754e041a9dfd49470f5bfd56bc4d2789818f64fc06339e5c02c4acfc179c
- catalog availability: blocked
- blueprintFamily: fraction-part-whole-v1@1.0.0 · 같은 전체를 똑같이 나눈 조각과 부분의 수를 분수로 연결하는 판단을 공유한다.
- variationPreset: fraction-part-whole-25-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 같은 전체를 나눈 조각 중 색칠한 부분을 분수로 나타낸다.
- affordanceFamily: native-fraction-model-v1@1.0.0 · support=contracted
- affordance operation: 같은 전체를 일정한 조각으로 나누고 색칠한 조각 수를 비교한다.
- candidateToolKeys: NO03FM
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO03FM, research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:NO03FM
- layoutFamily: one-screen-fraction-workbench-v1@1.0.0 · 분수 native 모형의 전체·조각 reserve를 먼저 확보하고 설명 영역을 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 검토가 필요하다: unit-title-mismatch:분수->분수와 소수. 이 불일치를 해소하기 전 compile/release하지 않는다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 분수와 소수 | 두 답은 어디에서 달라졌을까요? | 막대 전체를 4칸으로 똑같이 나누고 3칸을 색칠했어요. 알맞은 분수는 무엇일까요? | 전체 4칸 · 색칠 3칸 | 풀이 A | 3 4 | 풀이 B | 4 3 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 4칸 중 3칸 색칠을 함께 세고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 분수와 소수 | 분자와 분모, 무엇이 위로 갈까요? | 색칠 3 / 전체 4 | 3 4 (맞는 순서) | 전체 4 / 색칠 3 | 4 3 (틀린 순서) | Q | 달라진 것은 조각 수가 아니라, 분자·분모의 자리예요.
  교사 메모: 4분 중 뒤 2분. 분자·분모의 자리를 바꿔보며 차이를 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 색칠 칸 세기 | 보이는 정보로 답을 확인해요 | 막대 전체를 4칸으로 똑같이 나누고 3칸을 색칠했어요. 알맞은 분수는 무엇일까요? | 3 4 | 3 4 | 4 3 | 3 1 | 핵심 이유 | 전체 조각 수를 분모에, 색칠한 조각 수를 분자에 쓴다.
  교사 메모: 6분. 4칸 중 3칸을 함께 세고 분수로 나타냅니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 분수와 까닭을 남겨요 | 다시 볼 문제 | 전체를 똑같이 10칸으로 나누고 6칸을 색칠했습니다. 색칠한 부분은 얼마일까요? | 6 10 ? | 6 10 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 전체 조각 수를 분모에, 색칠한 조각 수를 분자에 쓴다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 전체4 색칠3 | 어느 단계에서 달라졌을까요? | 확인 기준 · 전체 조각 수를 분모에, 색칠한 조각 수를 분자에 쓴다. | 검토할 답 · 4 3 | 색칠 3, 전체 4를 전체 4/색칠 3인 4 3 으로 바꾸었습니다. | 다시 볼 단계 | 04 | 분자와 분모에 놓기 | 검토할 답 · 3 1 | 전체 한 막대를 분모 1로 취급하여 색칠 3칸을 3 1 로 적었습니다. | 다시 볼 단계 | 02 | 전체 조각 수 세기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 26 · 가분수를 대분수로 바꾸기

- lessonId: `g3s2-fraction-convert`
- catalogEntryId: `grade3-basic-practice-ppt-26`
- HTML SHA-256: `f4df78c29fbf85be22258c0e8628c33cca18f77e3811f4b14e54fb4888eef16e`
- catalog alignment: `needs-review` · unit-title-mismatch:분수->분수와 소수

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 26
- lessonId: g3s2-fraction-convert
- title: 가분수를 대분수로 바꾸기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-fraction-convert/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-fraction-convert/ec55af46d704/g3s2-fraction-convert-slides.html
- HTML SHA-256: f4df78c29fbf85be22258c0e8628c33cca18f77e3811f4b14e54fb4888eef16e
- grade/semester/unit: 3학년 2학기 4. 분수와 소수
- standardCodes: [4수01-10]
- domain / official learning goal: 수와 연산 / 단위분수, 진분수, 가분수, 대분수를 알고, 그 관계를 이해한다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-10.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-10]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 6차시 · 대분수를 알아볼까요? · pp.88-89
- source usage: 가분수 개념을 이어 분모만큼 묶어 대분수로 바꾼다.
- catalogEntryId: grade3-basic-practice-ppt-26
- catalog snapshot SHA-256: fd05758dfc00806b728f014022a020f1cb860ebe82fc05357d355bef3dcc2c97
- catalog availability: blocked
- blueprintFamily: fraction-type-conversion-v1@1.0.0 · 가분수와 대분수가 같은 양을 나타내는지 전체 단위로 확인하는 판단을 공유한다.
- variationPreset: fraction-type-conversion-26-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 가분수의 몇 개 전체와 남은 단위분수를 대분수로 바꾼다.
- affordanceFamily: native-fraction-model-v1@1.0.0 · support=contracted
- affordance operation: 같은 전체를 일정한 조각으로 나누고 색칠한 조각 수를 비교한다.
- candidateToolKeys: NO03FM
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO03FM, research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:NO03FM
- layoutFamily: one-screen-fraction-workbench-v1@1.0.0 · 분수 native 모형의 전체·조각 reserve를 먼저 확보하고 설명 영역을 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 검토가 필요하다: unit-title-mismatch:분수->분수와 소수. 이 불일치를 해소하기 전 compile/release하지 않는다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 분수와 소수 | 두 답은 어디에서 달라졌을까요? | 7 3 을 대분수로 나타내면 무엇일까요? | 7÷3=2…1 | 몫과 나머지로 확인해요 | 풀이 A | 1과 2 3 | 풀이 B | 2와 1 3 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 7/3을 대분수로 바꾸고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 분수와 소수 | 분모가 달라도 같은 방법이 통할까요? | 7 3 = ? | 7÷3=2…1 | 2와 1 3 | 11 4 = ? | 11÷4=2…3 | 2와 3 4 | Q | 달라진 것은 방법이 아니라, 분모와 분자의 크기예요.
  교사 메모: 4분 중 뒤 2분. 다른 가분수로 같은 방법이 통하는지 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 남은 수 확인 | 보이는 정보로 답을 확인해요 | 7 3 을 대분수로 나타내면 무엇일까요? | 7÷3=2…1 | 2와 1 3 | 2와 1 3 | 1과 2 3 | 3과 1 3 | 핵심 이유 | 분모만큼 묶인 수는 자연수, 남은 수는 분자가 된다.
  교사 메모: 6분. 7/3을 3개씩 묶어 대분수로 바꿉니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 묶은 과정과 대분수를 남겨요 | 다시 볼 문제 | 11 4 를 대분수로 바꾸세요. | 11÷4 | 11 4 =? | 2와 3 4 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 분모만큼 묶인 수는 자연수, 남은 수는 분자가 된다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 7 3 | 어느 단계에서 달라졌을까요? | 확인 기준 · 분모만큼 묶인 수는 자연수, 남은 수는 분자가 된다. | 검토할 답 · 1과 2 3 | 7÷3=2…1에서 몫 2와 나머지 1을 바꾸어 1과 2 3 으로 적었습니다. | 다시 볼 단계 | 04 | 자연수와 분수로 나타내기 | 검토할 답 · 3과 1 3 | 7÷3=2…1의 몫 2에 1을 더해 3과 1 3 으로 나타냈습니다. | 다시 볼 단계 | 04 | 자연수와 분수로 나타내기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 27 · 분모가 같은 분수 비교하기

- lessonId: `g3s2-fraction-compare`
- catalogEntryId: `grade3-basic-practice-ppt-27`
- HTML SHA-256: `0cb665473bc63153362226ac83b289e544c43bbddbf4a3ec8f4ca5ae10d928c1`
- catalog alignment: `needs-review` · unit-title-mismatch:분수->분수와 소수

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 27
- lessonId: g3s2-fraction-compare
- title: 분모가 같은 분수 비교하기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-fraction-compare/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-fraction-compare/1e4ee6728969/g3s2-fraction-compare-slides.html
- HTML SHA-256: 0cb665473bc63153362226ac83b289e544c43bbddbf4a3ec8f4ca5ae10d928c1
- grade/semester/unit: 3학년 2학기 4. 분수와 소수
- standardCodes: [4수01-11]
- domain / official learning goal: 수와 연산 / 분모가 같은 분수끼리, 단위분수끼리 크기를 비교하고 그 방법을 설명할 수 있다.
- learningMapTopicId: kr.mt.math.number-operations.g3-4.s4-01-11.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.23 (printed folio 17) > [4수01-11]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 7차시 · 분모가 같은 분수의 크기를 비교해 볼까요? · pp.90-91
- source usage: 한 조각의 크기가 같을 때 분자와 전체 양의 관계로 비교한다.
- catalogEntryId: grade3-basic-practice-ppt-27
- catalog snapshot SHA-256: e0e27385f8459fc40fa5b9937cd8794eb4465886878699bb332ae3f209db2ac2
- catalog availability: blocked
- blueprintFamily: fraction-same-denominator-comparison-v1@1.0.0 · 같은 단위분수 조각의 개수를 비교해 분수의 크기를 설명하는 판단을 공유한다.
- variationPreset: fraction-same-denominator-comparison-27-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 분모가 같은 두 분수에서 어느 조각 수가 더 큰지 결정한다.
- affordanceFamily: native-fraction-model-v1@1.0.0 · support=contracted
- affordance operation: 같은 전체를 일정한 조각으로 나누고 색칠한 조각 수를 비교한다.
- candidateToolKeys: NO03FM
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO03FM, research/mathcanvas/wave1-current-golden-canary.roundtrip.json#claim=released:NO03FM
- layoutFamily: one-screen-fraction-workbench-v1@1.0.0 · 분수 native 모형의 전체·조각 reserve를 먼저 확보하고 설명 영역을 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 검토가 필요하다: unit-title-mismatch:분수->분수와 소수. 이 불일치를 해소하기 전 compile/release하지 않는다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 분수와 소수 | 두 답은 어디에서 달라졌을까요? | 2 5 와 4 5 중 더 큰 분수는 무엇일까요? | 분모가 같은 5로 같아요 | 풀이 A | 4 5 | 풀이 B | 2 5 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 2/5와 4/5를 비교하고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 4. 분수와 소수 | 분자가 클수록 분수도 클까요? | 2 5 vs 4 5 | 4 5 가 더 커요 | 3 8 vs 7 8 | 7 8 이 더 커요 | Q | 달라진 것은 분모가 아니라, 비교하는 분자의 크기예요.
  교사 메모: 4분 중 뒤 2분. 분자를 바꿔가며 크기 비교를 반복합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 분자 비교 | 보이는 정보로 답을 확인해요 | 2 5 와 4 5 중 더 큰 분수는 무엇일까요? | 4 5 | 4 5 | 2 5 | 두 분수는 같아요 | 핵심 이유 | 분모가 같으면 분자가 큰 분수가 더 크다.
  교사 메모: 6분. 분모가 같은 두 분수의 분자를 비교합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 비교 결과와 까닭을 남겨요 | 다시 볼 문제 | 3 8 과 7 8 중 더 큰 분수는 무엇일까요? | 비교하면? | 7 8 이 더 커요 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 분모가 같으면 분자가 큰 분수가 더 크다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 2 5 vs 4 5 | 어느 단계에서 달라졌을까요? | 확인 기준 · 분모가 같으면 분자가 큰 분수가 더 크다. | 검토할 답 · 2 5 | 분모 5가 같을 때 2 4 5 로 판단했습니다. | 다시 볼 단계 | 03 | 분자 비교하기 | 검토할 답 · 두 분수는 같아요 | 분모 5=5만 확인해 2 5 = 4 5 로 판단했습니다. | 다시 볼 단계 | 03 | 분자 비교하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 28 · L를 mL로 정확히 바꾸기

- lessonId: `g3s2-capacity-unit`
- catalogEntryId: `grade3-basic-practice-ppt-28`
- HTML SHA-256: `8450d3d9e29073107e53b956caab568509603970c4d5da7661be43a9de38e600`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 28
- lessonId: g3s2-capacity-unit
- title: L를 mL로 정확히 바꾸기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-capacity-unit/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-capacity-unit/e2711b706a60/g3s2-capacity-unit-slides.html
- HTML SHA-256: 8450d3d9e29073107e53b956caab568509603970c4d5da7661be43a9de38e600
- grade/semester/unit: 3학년 2학기 5. 들이와 무게
- standardCodes: [4수03-18]
- domain / official learning goal: 도형과 측정 / 1L와 1mL의 관계를 이해하고, 들이를 ‘몇 L 몇 mL’와 ‘몇 mL’로 표현할 수 있다.
- learningMapTopicId: kr.mt.math.geometry-measurement.g3-4.s4-03-18.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.27 (printed folio 21) > [4수03-18]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 2차시 · 들이를 비교하고 들이의 단위를 알아볼까요? · pp.108-110
- source usage: 1L=1000mL를 사용해 혼합 단위와 단일 단위를 연결한다.
- catalogEntryId: grade3-basic-practice-ppt-28
- catalog snapshot SHA-256: 5bb043a55d638ff151fc2cd4dfd6065bde75f1dc22de1272ff4aa44fe23c414d
- catalog availability: blocked
- blueprintFamily: capacity-unit-conversion-v1@1.0.0 · L와 mL의 단위 관계를 묶음 교환으로 확인하는 판단을 공유한다.
- variationPreset: capacity-unit-conversion-28-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: L와 mL 사이의 묶음 관계로 같은 들이를 나타낸다.
- affordanceFamily: native-unit-conversion-v1@1.0.0 · support=captured
- affordance operation: 큰 단위와 작은 단위의 묶음을 교환해 같은 양을 두 방식으로 나타낸다.
- candidateToolKeys: NO04NT, NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NT, research/mathcanvas/module-variant-contract.static.json#tool=NO04NT
- layoutFamily: one-screen-unit-conversion-v1@1.0.0 · 큰 단위와 작은 단위의 native 묶음, 등가 식, 설명 영역을 한 화면에 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 5. 들이와 무게 | 두 답은 어디에서 달라졌을까요? | 1L는 몇 mL일까요? | 1L = ?mL | 1L = 100mL 컵 10개 = ?mL | 들이 단위 관계를 확인해요 | 풀이 A | 100mL | 풀이 B | 1000mL | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 1L를 mL로 바꾸고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 5. 들이와 무게 | 혼합 단위도 같은 방법이 통할까요? | 1L = ?mL | 1L = 1000mL | 1L = 100mL 컵 10개 = 1000mL | 1L=1000mL | 2L 300mL = ?mL | 2L 300mL = 2300mL | 1000 + 1000 + 300 = 2300mL | 2000+300=2300mL | Q | 달라진 것은 방법이 아니라, 더해지는 mL의 크기예요.
  교사 메모: 4분 중 뒤 2분. 혼합 단위로 확장해봅니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · mL 더하기 | 보이는 정보로 답을 확인해요 | 1L는 몇 mL일까요? | 1L = ?mL | 1L 물통 | = | 100mL 컵 10개 = ?mL 100mL 컵 10개 = 1000mL | 1000mL | 1000mL | 100mL | 10mL | 핵심 이유 | 1L=1000mL이므로 L 수에 1000을 곱한 뒤 남은 mL를 더해요.
  교사 메모: 6분. 1L=1000mL 관계를 함께 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 2L 250mL를 mL로 바꾸세요. | 1L = 1000mL | 2L = 2000mL | 1000 + 1000 + 250 = 2250mL | 2000+250=? | 2250mL | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 1L와 1000mL는 같은 들이입니다. 몇 L 몇 mL를 mL로 나타낼 때는 L 수에 1000을 곱하고 남은 mL를 더합니다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 1L=1000mL | 어느 단계에서 달라졌을까요? | 확인 기준 · 1L와 1000mL는 같은 들이입니다. 몇 L 몇 mL를 mL로 나타낼 때는 L 수에 1000을 곱하고 남은 mL를 더합니다. | 검토할 답 · 100mL | 1L=1000mL 대신 1L=100mL로 변환했습니다. | 다시 볼 단계 | 01 | 1L=1000mL 쓰기 | 검토할 답 · 10mL | 1L=1000mL 대신 1L=10mL로 변환했습니다. | 다시 볼 단계 | 01 | 1L=1000mL 쓰기 | 01 1L=1000mL 쓰기 | 02 L 수에 1000 곱하기 | 03 남은 mL 더하기 | 04 단위를 붙여 확인하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 29 · kg을 g으로 정확히 바꾸기

- lessonId: `g3s2-weight-unit`
- catalogEntryId: `grade3-basic-practice-ppt-29`
- HTML SHA-256: `48bbeec0554171c0cd872a218032a15144eddbe28bbd619fd57e169025800055`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 29
- lessonId: g3s2-weight-unit
- title: kg을 g으로 정확히 바꾸기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-weight-unit/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-weight-unit/527375efee7a/g3s2-weight-unit-slides.html
- HTML SHA-256: 48bbeec0554171c0cd872a218032a15144eddbe28bbd619fd57e169025800055
- grade/semester/unit: 3학년 2학기 5. 들이와 무게
- standardCodes: [4수03-21]
- domain / official learning goal: 도형과 측정 / 1kg과 1g의 관계를 이해하고, 무게를 ‘몇 kg 몇 g’과 ‘몇 g’으로 표현할 수 있다.
- learningMapTopicId: kr.mt.math.geometry-measurement.g3-4.s4-03-21.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.27 (printed folio 21) > [4수03-21]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 6차시 · 무게의 단위를 알아볼까요? · pp.118-120
- source usage: 1kg=1000g을 사용해 몇 kg 몇 g을 g으로 바꾼다.
- catalogEntryId: grade3-basic-practice-ppt-29
- catalog snapshot SHA-256: 86676f9c4519dac3ac5f8b2cf3c0baba573614f71d3bc0916804735eb2ae2841
- catalog availability: blocked
- blueprintFamily: mass-unit-conversion-v1@1.0.0 · kg과 g의 단위 관계를 묶음 교환으로 확인하는 판단을 공유한다.
- variationPreset: mass-unit-conversion-29-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: kg과 g 사이의 묶음 관계로 같은 무게를 나타낸다.
- affordanceFamily: native-unit-conversion-v1@1.0.0 · support=captured
- affordance operation: 큰 단위와 작은 단위의 묶음을 교환해 같은 양을 두 방식으로 나타낸다.
- candidateToolKeys: NO04NT, NO01SC
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=NO04NT, research/mathcanvas/module-variant-contract.static.json#tool=NO04NT
- layoutFamily: one-screen-unit-conversion-v1@1.0.0 · 큰 단위와 작은 단위의 native 묶음, 등가 식, 설명 영역을 한 화면에 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 5. 들이와 무게 | 두 답은 어디에서 달라졌을까요? | 2kg 300g과 같은 무게는 무엇일까요? | 2kg 300g = ?g | 1000 + 1000 + 300 = ?g | 무게 단위 관계를 확인해요 | 풀이 A | 2300g | 풀이 B | 2030g | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 2kg 300g을 g으로 바꾸고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 5. 들이와 무게 | 다른 무게도 같은 방법이 통할까요? | 2kg 300g = ?g | 2kg 300g = 2300g | 1000g + 1000g + 300g = 2300g | 2000+300=2300g | 3kg 50g = ?g | 3kg 50g = 3050g | 1000g 세 개 + 50g = 3050g | 3000+50=3050g | Q | 달라진 것은 방법이 아니라, 더해지는 g의 크기예요.
  교사 메모: 4분 중 뒤 2분. 다른 혼합 무게로 같은 방법이 통하는지 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · g 더하기 | 보이는 정보로 답을 확인해요 | 2kg 300g과 같은 무게는 무엇일까요? | 2kg 300g = ?g | 1kg = 1000g | 1kg = 1000g | 300g | 1000+1000+300 = ?g 1000+1000+300 = 2300g | 2300g | 2300g | 2030g | 300g | 핵심 이유 | 1kg과 1000g은 같은 무게입니다. 몇 kg 몇 g을 g으로 나타낼 때는 kg 수에 1000을 곱하고 남은 g을 더합니다.
  교사 메모: 6분. 2kg 300g을 g으로 바꾸며 확인합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | 3kg 40g을 g으로 바꾸세요. | 1kg = 1000g | 3kg = 3000g | 1000×3 + 40 = 3040g | 3000+40=? | 3040g | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 1kg과 1000g은 같은 무게입니다. 몇 kg 몇 g을 g으로 나타낼 때는 kg 수에 1000을 곱하고 남은 g을 더합니다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 2kg300g | 어느 단계에서 달라졌을까요? | 확인 기준 · 1kg과 1000g은 같은 무게입니다. 몇 kg 몇 g을 g으로 나타낼 때는 kg 수에 1000을 곱하고 남은 g을 더합니다. | 검토할 답 · 2030g | 2×1000+300=2300 대신 2|030=2030g으로 적었습니다. | 다시 볼 단계 | 02 | kg을 g으로 바꾸기 | 검토할 답 · 300g | 2×1000+300에서 2×1000을 빠뜨려 300g으로 계산했습니다. | 다시 볼 단계 | 02 | kg을 g으로 바꾸기 | 01 1kg=1000g 쓰기 | 02 kg을 g으로 바꾸기 | 03 남은 g 더하기 | 04 원래 혼합 단위와 비교하기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```

## 30 · 그림그래프의 실제 차이 구하기

- lessonId: `g3s2-pictograph-compare`
- catalogEntryId: `grade3-basic-practice-ppt-30`
- HTML SHA-256: `01851ac7e536b8a552f8e2db3009f6d62a39aa7f8c44e614306321e61ffdf952`
- catalog alignment: `exact`

```text
당신은 실제 Eduitit 수업꾸러미 HTML을 근거로 MathCanvas native-first 한 화면 활동을 구현한다.

[변경 불가 source binding]
- sequence: 30
- lessonId: g3s2-pictograph-compare
- title: 그림그래프의 실제 차이 구하기
- package manifest: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-pictograph-compare/manifest.json
- deployed HTML asset: eduitit:edu_materials/static/edu_materials/lesson_bundles/g3s2-pictograph-compare/347b6419bc4b/g3s2-pictograph-compare-slides.html
- HTML SHA-256: 01851ac7e536b8a552f8e2db3009f6d62a39aa7f8c44e614306321e61ffdf952
- grade/semester/unit: 3학년 2학기 6. 그림그래프
- standardCodes: [4수04-01]
- domain / official learning goal: 자료와 가능성 / 자료를 수집하여 그림그래프나 막대그래프로 나타내고 해석할 수 있다.
- learningMapTopicId: kr.mt.math.data-probability.g3-4.s4-04-01.representation
- standard authority: kr-ncic-2022-elementary-math@교육부 고시 제2022-33호 · ba7c7c63ad31ba0fd32e5eb8148d696dd73288acce111495c593298112f8f840 · PDF physical p.29 (printed folio 23) > [4수04-01]
- unit authority: visang-grade-3-semester-2@2022 개정 · 2026년 학습 · e3edf0ae9263be8276e0ee38d82f80d91a9bfb0be779aadcda6f88b6c8cca014 · HTML line 1418 > 목차 > 3학년 2학기
- textbook lesson: 3차시 · 그림그래프로 나타내고 해석해 볼까요? · pp.137-141
- source usage: 그림 개수의 차이가 아니라 범례를 적용한 실제 수량 차이를 구한다.
- catalogEntryId: grade3-basic-practice-ppt-30
- catalog snapshot SHA-256: 3e545c74dd0f5c875e5cdaab00ad4dd68e5f296b9b062964bd0ae4b4d24b7019
- catalog availability: blocked
- blueprintFamily: picture-graph-interpretation-v1@1.0.0 · 범례 단위와 그림 수를 곱해 실제 수량의 차이를 해석하는 판단을 공유한다.
- variationPreset: picture-graph-difference-basic-v1@1.0.0 · 30개 기본 연습의 한 화면 변형: 두 그림그래프 행의 실제 수량을 범례로 바꾸어 차이를 결정한다.
- affordanceFamily: native-picture-graph-v1@1.0.0 · support=captured
- affordance operation: 범례와 그림의 개수를 연결해 실제 수량을 읽고 비교한다.
- candidateToolKeys: DP03PG
- native evidenceIds: research/mathcanvas/tool-catalog.snapshot.json#tool=DP03PG, research/mathcanvas/graph-tool-contract.observations.json#tool=DP03PG
- layoutFamily: one-screen-data-workbench-v1@1.0.0 · 범례·그림그래프 native 영역과 수량 해석·설명 영역을 한 화면에 배치한다.
- legacy catalog phaseSequence (learner UI에 사용하지 않음): prediction → mathematical-confirmation → explanation → revision
- 현재 catalog binding은 Eduitit HTML metadata와 exact이다.

[실제 HTML에서 추출한 수업 근거]
- 02 02 동기 유발 (prediction-conflict) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 그림그래프 | 두 답은 어디에서 달라졌을까요? | ● 한 개는 과일 2개를 나타냅니다. 사과는 배보다 몇 개 더 많을까요? | 범례 | 1개 = 2 | 사과 | 배 | 범례 1개=2 · 사과3개 · 배2개 | 풀이 A | 1개 | 풀이 B | 2개 | Q | 어느 풀이가 보이는 자료와 맞는지 근거를 말해 보세요.
  교사 메모: 4분 중 앞 2분. 사과·배 그림 수를 세고 두 풀이를 비교합니다.
- 03 02 조건 바꾸기 (condition-change) · HTML static normalized text: 02 · 동기 유발 · 4분 | 6. 그림그래프 | 범례 값이 바뀌면 실제 차이도 바뀔까요? | 범례 1개=2 · 그림차 1개 | 1×2 | 실제 차이 2개 | 범례 1개=5 · 그림차 1개 | 1×5 | 실제 차이 5개 | Q | 달라진 것은 그림 차이가 아니라, 범례가 나타내는 값이에요.
  교사 메모: 4분 중 뒤 2분. 범례 값을 바꿔 실제 차이가 달라지는지 확인합니다.
- 06 05 활동1 함께 (mathematical-confirmation-source) · HTML static normalized text: 05 · 활동 1 · 함께 보기 · 6분 | 생각 도구 03 · 실제 수량 변환 | 보이는 정보로 답을 확인해요 | ● 한 개는 과일 2개를 나타냅니다. 사과는 배보다 몇 개 더 많을까요? | 범례 | 1개 = 2 | 사과 | 배 | 2개 | 2개 | 1개 | 4개 | 핵심 이유 | 그림 수의 차이에 범례 값을 적용해야 실제 수량 차이가 된다.
  교사 메모: 6분. 범례를 적용해 사과·배의 실제 수량을 비교합니다.
- 09 08 활동3 혼자 (independent-transfer) · HTML static normalized text: 08 · 활동 3 · 혼자 적용 · 5분 | 생각 도구 01 → 04 전체 적용 | 풀이와 한 문장으로 남겨요 | 다시 볼 문제 | ■ 한 개가 4명을 나타냅니다. A반은 ■ 5개, B반은 ■ 2개일 때 몇 명 차이일까요? | 범례 | 1개=4명 | (5-2)×4=? | 3×4=12명 | 01 주어진 정보 표시하기 | 02 핵심 관계식 쓰기 | 03 계산하고 답의 뜻 나타내기 | 04 사용한 관계로 까닭 쓰기 | 확인할 핵심 관계 | 그림 수의 차이에 범례 값을 적용해야 실제 수량 차이가 된다.
  교사 메모: 5분. 같은 문제를 다시 보며 네 단계를 순서대로 적습니다.
- 10 09 생각 나누기 (misconception-revision) · HTML static normalized text: 09 · 생각 나누기 · 3분 | 사과3·배2 | 어느 단계에서 달라졌을까요? | 확인 기준 · 그림 수의 차이에 범례 값을 적용해야 실제 수량 차이가 된다. | 검토할 답 · 1개 | 그림 차 (3-2)×2=2 대신 그림 차 3-2=1개만 답했습니다. | 다시 볼 단계 | 03 | 각 행을 실제 수량으로 바꾸기 | 검토할 답 · 4개 | (3-2)×2=2에 다시 ×2를 하여 4개로 계산했습니다. | 다시 볼 단계 | 03 | 각 행을 실제 수량으로 바꾸기 | Q | 각 답에서 가장 먼저 고쳐야 할 단계를 찾아보세요.
  교사 메모: 3분. 두 답이 틀렸다고 말하지 않고, 네 단계 중 어디를 다시 볼지 학생이 먼저 고르게 합니다.

[설계 과제]
1. 학생이 반드시 결정해야 하는 수학적 판단을 한 문장으로 먼저 쓴다.
2. HTML의 생각 차이와 확인 장면은 교사용 설계 근거로만 쓰고, 학생 화면에는 한 문제만 남긴다.
3. layout보다 먼저 MathCanvas native affordance를 고른다. catalog 후보는 출발점일 뿐이며 support/evidence가 부족하면 bounded probe blocker를 남긴다.
4. 1280×800 학생 화면에 정확히 1문제만 만들고 스크롤이나 캔버스 패닝 없이 끝낸다.
5. 학생 화면은 문제 → 큰 native 작업판 → 꼭 필요할 때만 작은 답 영역 순서로 만든다.
6. ①②③ 상단 안내, 예상 답, 처음 고른 답, 답 수정, 필기·까닭 칸을 만들지 않는다.
7. 도구는 생성기가 미리 꺼내 놓는다. 학생에게 왼쪽 메뉴에서 도구를 찾게 하거나 Shift 키를 쓰게 하지 않는다.
8. 함께 움직여야 하는 숫자·단위·상자·기호는 저장 전에 canonical native group으로 묶고 학생은 한 덩어리로 옮긴다.
9. native 조작은 좌표 이동만이 아니라 배열, 묶음 membership, 같은 전체의 분할, 중심·반지름 관계, 단위 조합, 범례와 실제 수량 중 하나의 primary mathematical state를 바꾸어야 한다.
10. 작업판 안내는 최대 2문장이고, 대상·보이는 조작·놓을 곳을 초등학생이 바로 알 수 있게 쓴다.

[한 화면·글자·공간 계약]
- viewport 1280×800, 실제 MathCanvas 100%, persisted canvasOption.scale=3, fixed chrome guard 8 CSS px, no scroll.
- 최종 화면의 제목/문제는 28 CSS px 이상, 안내·보기·라벨은 22 CSS px 이상이어야 한다.
- 문제 영역은 10~18%, native 작업판은 72% 이상, 작은 답 영역은 최대 10%만 사용한다.
- composition 활동은 실제 native reserve를 먼저 재고 source tray를 위쪽 또는 왼쪽에 배치한다. 어느 방향이든 construction area가 더 크고 모든 drag 경로가 workbench 안에 있어야 한다.
- native visualBox/chromeBox/taskEnvelope/reserveBox의 initial·selected·manipulated 최대값을 먼저 읽고 24 CSS px 여유를 둔다. 임의 좌표 nudge로 맞추지 않는다.
- 모든 학생 요소의 visual/interaction bounds는 자기 작업 공간 안에 완전히 포함되어야 한다.
- 실제 glyph, 겹침, 잘림, 중앙 정렬은 fresh background canary와 Sol 시각 검토 전까지 통과로 표시하지 않는다.

[추가 교사 프롬프트]
{{teacherContext}}
- 비어 있어도 된다. 입력 시 500자 이하의 비식별 수업 맥락만 반영한다.
- 학년·학기·단원·성취기준·수학적 불변량·native tool support·raw payload·좌표·release 상태는 바꾸지 않는다.

[출력 및 완료 조건]
- source binding, mathematical decision, native state transition, preplaced movable units, group membership, 작업 공간 이름·목적, one-screen layout intent, predicates, evidence plan, blockers를 구조화해 제시한다.
- 초기 화면에 정답을 완성해 두지 않는다. 학생의 조작이 수학 상태를 바꾸고 그 결과가 화면에서 확인되어야 한다.
- 이 prompt는 design-only다. current catalog availability가 blocked이므로 canonical compile 경로에 넣지 않는다.
- learningMapTopicId는 보조 ontology이며 official standard authority를 대신하지 않는다.
- offline tests가 통과해도 fresh canary와 실제 save/reopen 전에는 released로 올리지 않는다.
- 현재 package manifest schema 5, HTML 12 slides를 근거로 하되 수업 슬라이드 자체를 재설계하지 않는다.
```
