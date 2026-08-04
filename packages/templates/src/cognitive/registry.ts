import {
  cognitiveDemandManifestSchema,
  defineCognitiveDemandManifest,
  type ActivityBlueprint,
  type CognitiveDemandManifest
} from "@mathcanvas/contracts";
import {
  claimEvidenceActivityProfiles,
  factorPairActivityProfile,
  partialOperationActivityProfiles
} from "@mathcanvas/curriculum";
import { claimEvidenceBlueprints } from "../blueprints/claim-evidence.js";
import { factorPairArrayBlueprint } from "../blueprints/factor-pair-array.js";
import { partialOperationDecompositionBlueprints } from "../blueprints/partial-operation-decomposition.js";

const claimEvidenceManifests = Object.fromEntries(
  claimEvidenceBlueprints.map((blueprint) => {
    const profile = claimEvidenceActivityProfiles.find(
      (candidate) => candidate.activityId === blueprint.id
    );
    if (!profile) {
      throw new Error(`claim-evidence-profile-missing:${blueprint.id}`);
    }
    const candidateRoles = [
      "position-card-1",
      "position-card-2",
      "position-card-3",
      "position-card-4",
      "position-card-5"
    ].slice(0, profile.presentation?.candidateCount ?? 5);
    return [
      blueprint.id,
      defineCognitiveDemandManifest({
        schemaVersion: "1.0.0",
        blueprintId: blueprint.id,
        blueprintVersion: blueprint.version,
        blueprintContentHash: blueprint.contentHash,
        mathematicalDecision:
          `학생은 단원 핵심 상황에 대한 서로 다른 ${candidateRoles.length}개 주장 중 하나를 근거를 보기 전에 선택한다.`,
        misconceptionConflict: profile.misconceptionConflict,
        learningMap: {
          repository: "DECK6/korean-elementary-learning-map",
          commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
          usageSnapshotSha256:
            "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
          standardCode: profile.standardCode,
          topicIds: [profile.learningMapTopicId],
          prerequisiteTopicIds: [],
          observableEvidence: [
            `${profile.standardCode} ${profile.learningMapModule} - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.`,
            `자신의 표현물에서 ${profile.domain} 내용과 근거가 드러나는 부분을 찾아 설명한다.`
          ],
          assessmentPrompt:
            `'${profile.learningMapModule}'에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라.`,
          caveat:
            `학습지도 저장소는 표현과 선수 관계 설계의 보조 자료이며 공식 교육과정 ${profile.standardCode} 원문을 대신하지 않는다.`
        },
        decision: {
          mode: "select-one",
          constraintId: "select-mathematical-claim",
          candidateRoles,
          candidateProperty: "text",
          correctValuePath: "correctValueText",
          distractors: [
            {
              predicateKind: "cognitive.release-contract",
              misconception: profile.misconceptionConflict
            }
          ]
        },
        prediction: { regionRole: "prediction-box" },
        verification: {
          kind:
            profile.domain === "도형과 측정"
              ? "coordinate-or-graph"
              : "countable-unit-model",
          roles: ["array-panel", "group-label", "array-text"],
          invariant: profile.verificationInvariant
        },
        explanation: { regionRole: "explanation-box" },
        revisionPath:
          `${candidateRoles.length}개 생각 카드는 계속 움직일 수 있으며, 검증 근거와 맞지 않으면 처음 선택을 고치고 달라진 생각을 기록한다.`,
        limitations: {
          autoGrading: "none-by-design",
          phaseOrder: "teacher-guided"
        }
      })
    ];
  })
) as Readonly<Record<string, CognitiveDemandManifest>>;

const factorPairArrayManifest = defineCognitiveDemandManifest({
  schemaVersion: "1.0.0",
  blueprintId: factorPairArrayBlueprint.id,
  blueprintVersion: factorPairArrayBlueprint.version,
  blueprintContentHash: factorPairArrayBlueprint.contentHash,
  mathematicalDecision:
    "학생은 여덟 수 카드 중 두 장을 골라 목표 수를 만드는 약수쌍을 구성하고, 다른 약수쌍도 찾는다.",
  misconceptionConflict: factorPairActivityProfile.misconceptionConflict,
  learningMap: {
    repository: "DECK6/korean-elementary-learning-map",
    commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
    usageSnapshotSha256:
      "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
    standardCode: factorPairActivityProfile.standardCode,
    topicIds: [factorPairActivityProfile.learningMapTopicId],
    prerequisiteTopicIds: [
      factorPairActivityProfile.learningMapPrerequisiteTopicId
    ],
    observableEvidence: [
      "[6수01-04] 약수와 배수 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
      "자신의 표현물에서 수와 연산 내용과 근거가 드러나는 부분을 찾아 설명한다."
    ],
    assessmentPrompt:
      "'약수와 배수'에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라.",
    caveat:
      "학습지도 저장소는 표현과 선수 관계 설계의 보조 자료이며 공식 교육과정 [6수01-04] 원문을 대신하지 않는다."
  },
  decision: {
    mode: "construct",
    slotRoles: ["factor-slot-1", "factor-slot-2"],
    pieceRoles: Array.from(
      { length: 8 },
      (_, index) => `factor-card-${index + 1}`
    ),
    pieceProperty: "value",
    totalPath: "targetTotal",
    solutionSetPath: "solutionPairs",
    surplusPath: "surplusValues",
    minimumSolutions: 2,
    minimumSurplus: 4,
    distractors: [
      {
        predicateKind: "values.product-construction-solution-set",
        misconception: factorPairActivityProfile.misconceptionConflict
      }
    ]
  },
  prediction: { regionRole: "prediction-box" },
  verification: {
    kind: "countable-unit-model",
    roles: ["array-panel", "array-label", "array-grid"],
    invariant: factorPairActivityProfile.verificationInvariant
  },
  explanation: { regionRole: "explanation-box" },
  revisionPath:
    "모든 수 카드는 계속 움직일 수 있고, 격자에 남는 칸이 생기면 두 수를 바꾸어 다른 직사각형 배열을 다시 만들 수 있다.",
  limitations: {
    autoGrading: "none-by-design",
    phaseOrder: "teacher-guided"
  }
});

const partialOperationManifests = Object.fromEntries(
  partialOperationDecompositionBlueprints.map((blueprint) => {
    const profile = partialOperationActivityProfiles.find(
      (candidate) => candidate.activityId === blueprint.id
    );
    if (!profile) {
      throw new Error(
        `partial-operation-profile-missing:${blueprint.id}`
      );
    }
    return [
      blueprint.id,
      defineCognitiveDemandManifest({
        schemaVersion: "1.0.0",
        blueprintId: blueprint.id,
        blueprintVersion: blueprint.version,
        blueprintContentHash: blueprint.contentHash,
        mathematicalDecision:
          profile.operationKind === "multiply"
            ? "학생은 여덟 식 카드 중 두 장을 골라 전체 곱을 만드는 부분곱의 합을 구성하고, 다른 분해 방법도 찾는다."
            : "학생은 여덟 식 카드 중 두 장을 골라 전체 몫을 만드는 부분몫의 합을 구성하고, 다른 분해 방법도 찾는다.",
        misconceptionConflict: profile.misconceptionConflict,
        learningMap: {
          repository: "DECK6/korean-elementary-learning-map",
          commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
          usageSnapshotSha256:
            "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
          standardCode: profile.standardCode,
          topicIds: [profile.learningMapTopicId],
          prerequisiteTopicIds: [
            profile.learningMapPrerequisiteTopicId
          ],
          observableEvidence: [
            profile.operationKind === "multiply"
              ? "[4수01-04] 세 자리 수 범위의 곱셈 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다."
              : "[4수01-06] 세 자리 수 범위의 나눗셈 - 표현과 연결을 말·글·표·그림·소리·움직임 중 알맞은 방식으로 표현한다.",
            "자신의 표현물에서 수와 연산 내용과 근거가 드러나는 부분을 찾아 설명한다."
          ],
          assessmentPrompt:
            profile.operationKind === "multiply"
              ? "'세 자리 수 범위의 곱셈'에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라."
              : "'세 자리 수 범위의 나눗셈'에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라.",
          caveat:
            `학습지도 저장소는 표현과 선수 관계 설계의 보조 자료이며 공식 교육과정 ${profile.standardCode} 원문을 대신하지 않는다.`
        },
        decision: {
          mode: "construct",
          slotRoles: ["expression-slot-1", "expression-slot-2"],
          pieceRoles: Array.from(
            { length: 8 },
            (_, index) => `expression-card-${index + 1}`
          ),
          pieceProperty: "value",
          totalPath: "targetResult",
          solutionSetPath: "solutionPairs",
          surplusPath: "surplusValues",
          minimumSolutions: 2,
          minimumSurplus: 4,
          distractors: [
            {
              predicateKind: "values.partial-operation-card-set",
              misconception: profile.misconceptionConflict
            }
          ]
        },
        prediction: { regionRole: "prediction-box" },
        verification: {
          kind: "countable-unit-model",
          roles: [
            "model-panel",
            "model-label",
            "model-instruction",
            "model-workspace"
          ],
          invariant: profile.verificationInvariant
        },
        explanation: { regionRole: "explanation-box" },
        revisionPath:
          "모든 식 카드는 계속 움직일 수 있고, 두 부분이 원래 전체를 만들지 못하면 다른 두 장으로 바꾸어 모형과 설명을 다시 고칠 수 있다.",
        limitations: {
          autoGrading: "none-by-design",
          phaseOrder: "teacher-guided"
        }
      })
    ];
  })
) as Readonly<Record<string, CognitiveDemandManifest>>;

const manifests: Readonly<Record<string, CognitiveDemandManifest>> = {
  ...claimEvidenceManifests,
  ...partialOperationManifests,
  [factorPairArrayBlueprint.id]: factorPairArrayManifest,
  "fraction.compare.unlike-denominators.visual-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId:
        "fraction.compare.unlike-denominators.visual-v1",
      blueprintVersion: "1.1.0",
      blueprintContentHash:
        "6b73ee591d8b1e9b45292182e032c7e096741471df6aeb481b8b2c7d89a007d0",
      mathematicalDecision:
        "학생은 두 분수를 같은 전체에서 비교하여 <, =, > 중 어떤 관계인지 결정한다.",
      misconceptionConflict:
        "분모가 큰 분수가 항상 크다는 생각이나 색칠한 조각 수만 비교하는 생각을 같은 전체의 띠 길이와 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[6수01-07]",
        topicIds: [
          "kr.mt.math.number-operations.g5-6.s6-01-07.representation"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.number-operations.g5-6.s6-01-07.concept"
        ],
        observableEvidence: [
          "자신의 표현물에서 수와 연산 내용과 근거가 드러나는 부분을 찾아 설명한다."
        ],
        assessmentPrompt:
          "'분수의 덧셈과 뺄셈'에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-relation",
        candidateRoles: [
          "less-symbol",
          "equal-symbol",
          "greater-symbol"
        ],
        candidateProperty: "text",
        correctValuePath: "correctRelation",
        distractors: [
          {
            role: "equal-symbol",
            misconception:
              "두 띠의 길이가 비슷해 보이면 정확한 비교 없이 같다고 판단한다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "same-whole-length",
        roles: ["left-strip", "right-strip", "start-line"],
        invariant:
          "두 분수 띠는 같은 전체 길이와 같은 출발선에서 비교한다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "세 관계 기호는 계속 움직일 수 있으며 학생은 띠를 맞댄 결과에 따라 예측과 선택을 고칠 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "fraction.equivalent.same-whole.visual-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId: "fraction.equivalent.same-whole.visual-v1",
      blueprintVersion: "2.1.0",
      blueprintContentHash:
        "1223118b4590fb5a45153e87b7205d899a09149f078ebfcd4131e4fe2ba2bf1f",
      mathematicalDecision:
        "학생은 기준 분수와 값이 같은 후보 하나를 여섯 개의 분수 띠 중에서 선택한다.",
      misconceptionConflict:
        "분자나 분모만 바꾸거나 둘에 같은 수를 더해도 같은 분수가 된다는 생각을, 같은 전체와 출발선에서 비교한 띠의 서로 다른 끝점과 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[6수01-06]",
        topicIds: [
          "kr.mt.math.number-operations.g5-6.s6-01-06.representation"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.number-operations.g5-6.s6-01-06.concept"
        ],
        observableEvidence: [
          "자신의 표현물에서 수와 연산 내용과 근거가 드러나는 부분을 찾아 설명한다."
        ],
        assessmentPrompt:
          "'분수의 덧셈과 뺄셈'에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-equivalent-strip",
        candidateRoles: [
          "candidate-strip-1",
          "candidate-strip-2",
          "candidate-strip-3",
          "candidate-strip-4",
          "candidate-strip-5",
          "candidate-strip-6"
        ],
        candidateProperty: "fraction",
        correctValuePath: "correctCandidate",
        distractors: [
          {
            predicateKind:
              "ratio.one-side-change-distractor",
            misconception:
              "분자 또는 분모 한쪽만 바꾸어도 같은 크기가 유지된다고 생각한다."
          },
          {
            predicateKind:
              "ratio.additive-change-distractor",
            misconception:
              "분자와 분모를 같은 수만큼 더하거나 빼면 같은 분수가 된다고 생각한다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "same-whole-length",
        roles: [
          "reference-strip",
          "target-lane-surface",
          "start-line"
        ],
        invariant:
          "기준 띠와 선택 띠는 같은 전체 길이와 같은 출발선에서 끝점을 비교한다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "여섯 후보는 계속 움직일 수 있으며, 학생은 띠의 끝점이 다르면 선택과 예상을 고친 뒤 다른 후보를 다시 검증할 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "relation.equal-sign.balanced-equation.cards-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId:
        "relation.equal-sign.balanced-equation.cards-v1",
      blueprintVersion: "1.0.0",
      blueprintContentHash:
        "eebf43825fa9503331d4cde53cd0fd789b78ce115f078b44cd89af0f278bbbb7",
      mathematicalDecision:
        "학생은 a+b=c+□에서 등호 양쪽의 값을 같게 하는 수 카드 한 장을 선택한다.",
      misconceptionConflict:
        "등호를 계산 결과가 뒤에 나온다는 표시로 보거나, 눈에 보이는 수를 그대로 고르는 생각을 왼쪽과 오른쪽 단위 칸의 서로 다른 끝점과 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[4수02-03]",
        topicIds: [
          "kr.mt.math.change-relationships.g3-4.s4-02-03.representation",
          "kr.mt.math.change-relationships.g3-4.s4-02-03.application"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.change-relationships.g3-4.s4-02-03.concept"
        ],
        observableEvidence: [
          "자신의 표현물에서 변화와 관계 내용과 근거가 드러나는 부분을 찾아 설명한다."
        ],
        assessmentPrompt:
          "'등호와 동치 관계'에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [4수02-03] 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-answer-card",
        candidateRoles: [
          "piece-card-1",
          "piece-card-2",
          "piece-card-3",
          "piece-card-4",
          "piece-card-5",
          "piece-card-6"
        ],
        candidateProperty: "value",
        correctValuePath: "solution",
        distractors: [
          {
            predicateKind:
              "values.balanced-equation-distractors",
            misconception:
              "등호 왼쪽의 계산 결과를 그대로 빈칸에 넣어야 한다고 생각한다."
          },
          {
            predicateKind:
              "values.balanced-equation-distractors",
            misconception:
              "등호 오른쪽에 이미 보이는 수를 한 번 더 고르면 양쪽이 같다고 생각한다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "countable-unit-model",
        roles: [
          "top-cell-1",
          "top-cell-18",
          "bottom-cell-1",
          "bottom-cell-18"
        ],
        invariant:
          "같은 크기와 같은 출발선의 두 줄은 등호 양쪽의 값이 같을 때 같은 칸에서 끝난다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "여섯 수 카드는 계속 움직일 수 있으며, 학생은 두 줄의 끝이 다르면 카드를 바꾸고 처음 예상과 달라진 까닭을 기록할 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "relation.equal-sign.balance-scale.sum-card-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId:
        "relation.equal-sign.balance-scale.sum-card-v1",
      blueprintVersion: "1.0.0",
      blueprintContentHash:
        "b96bd4498a69677e0e2c8f3f97f7c4aaf1600991672e667e4fbdd3a6483f6ff0",
      mathematicalDecision:
        "학생은 왼쪽 접시의 두 수를 더한 값과 같은 수 카드 한 장을 오른쪽 접시에 놓는다.",
      misconceptionConflict:
        "보이는 두 수 중 하나만 고르거나, 두 수의 차를 고르거나, 계산에서 1만큼 틀린 값을 고르는 생각을 저울의 실제 기울기와 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[4수02-03]",
        topicIds: [
          "kr.mt.math.change-relationships.g3-4.s4-02-03.representation",
          "kr.mt.math.change-relationships.g3-4.s4-02-03.application"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.change-relationships.g3-4.s4-02-03.concept"
        ],
        observableEvidence: [
          "자신의 표현물에서 변화와 관계 내용과 근거가 드러나는 부분을 찾아 설명한다."
        ],
        assessmentPrompt:
          "'등호와 동치 관계'에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [4수02-03] 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-balance-card",
        candidateRoles: [
          "piece-card-1",
          "piece-card-2",
          "piece-card-3",
          "piece-card-4",
          "piece-card-5"
        ],
        candidateProperty: "value",
        correctValuePath: "correctResult",
        distractors: [
          {
            predicateKind:
              "values.balance-card-distractors",
            misconception:
              "두 수를 더하지 않고 한 수를 그대로 고르거나 두 수의 차를 고른다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "balance",
        roles: ["balance-scale"],
        invariant:
          "왼쪽 접시의 두 수를 더한 값과 오른쪽 수 카드의 값이 같을 때만 저울이 수평이 된다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "다섯 수 카드는 계속 움직일 수 있으며, 학생은 저울이 기울면 카드를 바꾸고 처음 예상과 달라진 까닭을 기록할 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "measure.time.clock.hour-hand-boundary-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId:
        "measure.time.clock.hour-hand-boundary-v1",
      blueprintVersion: "1.0.0",
      blueprintContentHash:
        "e9c07031546265bcc669b2852e895d4314b90c75292de9f114373ffd46569691",
      mathematicalDecision:
        "학생은 긴바늘이 50분이나 55분까지 움직일 때 짧은바늘이 두 숫자 사이 어디쯤 있는지 결정한다.",
      misconceptionConflict:
        "짧은바늘은 정각 사이에는 한 숫자 위에 멈춰 있거나 다음 숫자로 먼저 이동한다는 생각을, 기어식 시계에서 두 바늘이 함께 움직이는 모습과 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[2수03-07]",
        topicIds: [
          "kr.mt.math.geometry-measurement.g1-2.s2-03-07.representation"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.geometry-measurement.g1-2.s2-03-07.concept"
        ],
        observableEvidence: [
          "자신의 표현물에서 도형과 측정 내용과 근거가 드러나는 부분을 찾아 설명한다."
        ],
        assessmentPrompt:
          "'시각과 시간'에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [2수03-07] 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-hour-hand-position",
        candidateRoles: [
          "position-card-1",
          "position-card-2",
          "position-card-3",
          "position-card-4",
          "position-card-5"
        ],
        candidateProperty: "text",
        correctValuePath: "correctPositionText",
        distractors: [
          {
            predicateKind:
              "values.clock-boundary-distractors",
            misconception:
              "정각 사이에도 짧은바늘은 현재 시를 가리키는 숫자 위에 멈춰 있다고 생각한다."
          },
          {
            predicateKind:
              "values.clock-boundary-distractors",
            misconception:
              "두 숫자 사이라는 점만 보고 어느 숫자에 더 가까운지 판단하지 않거나, 분침이 가리킨 숫자를 짧은바늘의 위치로 읽는다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "linked-time-hands",
        roles: ["clock"],
        invariant:
          "긴바늘이 한 바퀴 움직이는 동안 짧은바늘은 현재 시 숫자에서 다음 시 숫자까지 끊기지 않고 함께 움직인다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "다섯 가지 위치 말은 계속 움직일 수 있으며, 학생은 기어식 시계에서 짧은바늘의 실제 움직임을 본 뒤 선택을 고치고 까닭을 다시 쓸 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "measure.time.elapsed.clock-pair-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId: "measure.time.elapsed.clock-pair-v1",
      blueprintVersion: "1.0.0",
      blueprintContentHash:
        "6833430a0a16ba7ec4e9d089020c3eb23ea2d731aa57aa92333d50f8646a8e9d",
      mathematicalDecision:
        "학생은 시 경계를 지나는 시작 시각과 끝 시각 사이에 몇 분이 걸렸는지 결정한다.",
      misconceptionConflict:
        "끝 분에서 시작 분을 그대로 빼거나, 1시간을 100분처럼 빌리거나, 시가 바뀌면 무조건 60분이라고 보는 생각을 기어식 시계의 연속된 움직임과 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[2수03-08]",
        topicIds: [
          "kr.mt.math.geometry-measurement.g1-2.s2-03-08.application"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.geometry-measurement.g1-2.s2-03-08.representation",
          "kr.mt.math.geometry-measurement.g1-2.s2-03-07.application"
        ],
        observableEvidence: [
          "[2수03-08] 시각과 시간 - 적용과 설명을 수행하는 순서와 주의할 점을 말한 뒤 과제를 끝까지 실행한다.",
          "수행 과정과 결과를 기록하고, [2수03-08] 시각과 시간 - 적용과 설명의 다음 시도에서 바꿀 점을 한 가지 제시한다."
        ],
        assessmentPrompt:
          "'시각과 시간'에 관한 생활 또는 탐구 문제를 제시하고, 학생이 풀이 전략, 계산 또는 표현, 답의 타당성을 차례로 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [2수03-08] 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-elapsed-time",
        candidateRoles: [
          "position-card-1",
          "position-card-2",
          "position-card-3",
          "position-card-4",
          "position-card-5"
        ],
        candidateProperty: "text",
        correctValuePath: "correctResultText",
        distractors: [
          {
            predicateKind: "values.elapsed-time-distractors",
            misconception:
              "끝 시각의 분과 시작 시각의 분만 빼면 걸린 시간을 구할 수 있다고 생각한다."
          },
          {
            predicateKind: "values.elapsed-time-distractors",
            misconception:
              "시가 한 번 바뀌면 항상 60분이거나, 1시간을 100분처럼 빌릴 수 있다고 생각한다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "elapsed-time-clock-pair",
        roles: ["clock-start", "clock-end"],
        invariant:
          "시작 시계의 긴바늘을 시계가 가는 쪽으로 60칸 움직일 때 1시간이 지나며, 끝 시각까지 움직인 눈금의 합이 걸린 분이다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "다섯 시간 카드는 계속 움직일 수 있으며, 학생은 시작 시계를 끝 시각까지 돌린 뒤 선택을 고치고 1시간과 1분의 관계로 까닭을 다시 쓸 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "fraction.add.same-denominator.strips-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId: "fraction.add.same-denominator.strips-v1",
      blueprintVersion: "1.0.0",
      blueprintContentHash:
        "bd1e4b55fad240d4147c5b6c04880b30eb65afe540a035a5d48611bc729e04fb",
      mathematicalDecision:
        "학생은 분모가 같은 두 진분수의 합을 먼저 결정하고, 분수 띠를 이어 붙인 결과와 비교한다.",
      misconceptionConflict:
        "분자와 분모를 모두 더하거나 큰 덧수만 남기거나 맞닿은 경계를 한 조각으로 또 세는 생각을, 같은 크기의 단위 조각이 유지된 두 띠의 연속된 길이와 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[4수01-15]",
        topicIds: [
          "kr.mt.math.number-operations.g3-4.s4-01-15.application"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.number-operations.g3-4.s4-01-15.representation",
          "kr.mt.math.number-operations.g3-4.s4-01-15.concept"
        ],
        observableEvidence: [
          "[4수01-15] 분수의 덧셈과 뺄셈 - 적용과 설명을 수행하는 순서와 주의할 점을 말한 뒤 과제를 끝까지 실행한다.",
          "수행 과정과 결과를 기록하고, [4수01-15] 분수의 덧셈과 뺄셈 - 적용과 설명의 다음 시도에서 바꿀 점을 한 가지 제시한다."
        ],
        assessmentPrompt:
          "'분수의 덧셈과 뺄셈'에 관한 생활 또는 탐구 문제를 제시하고, 학생이 풀이 전략, 계산 또는 표현, 답의 타당성을 차례로 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [4수01-15] 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-fraction-sum",
        candidateRoles: [
          "position-card-1",
          "position-card-2",
          "position-card-3",
          "position-card-4",
          "position-card-5"
        ],
        candidateProperty: "text",
        correctValuePath: "correctResultLatex",
        distractors: [
          {
            predicateKind:
              "values.same-denominator-sum-distractors",
            misconception:
              "분모가 같은 분수를 더할 때 분자뿐 아니라 분모도 함께 더해야 한다고 생각한다."
          },
          {
            predicateKind:
              "values.same-denominator-sum-distractors",
            misconception:
              "큰 덧수만 남기거나 맞닿은 경계를 한 번 더 세거나 분자를 빼서 합을 구한다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "same-whole-length",
        roles: [
          "left-strip",
          "right-strip",
          "join-lane",
          "start-line"
        ],
        invariant:
          "같은 전체를 같은 수로 나눈 단위 조각의 크기는 바뀌지 않으며, 두 띠를 빈틈없이 이어 붙이면 색칠한 조각 수만 더해진다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "다섯 답 카드와 두 분수 띠는 계속 움직일 수 있으며, 학생은 이어 붙인 띠의 단위 조각과 끝점을 본 뒤 선택을 고치고 분모가 그대로인 까닭을 다시 쓸 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "fraction.add.same-denominator.improper-sum-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId:
        "fraction.add.same-denominator.improper-sum-v1",
      blueprintVersion: "1.0.0",
      blueprintContentHash:
        "e040f891032e2f438422c96e135e62faeddff07815501694764f3240e0805f9c",
      mathematicalDecision:
        "학생은 분모가 같은 두 진분수의 합이 1을 넘는 가분수가 되는지 결정하고, 두 띠의 이어진 길이와 비교한다.",
      misconceptionConflict:
        "분모까지 더하거나 합을 1에서 멈추거나 1을 넘은 부분만 답으로 읽는 생각을, 1의 금을 지나도 같은 단위 조각이 이어지는 두 띠의 길이와 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[4수01-15]",
        topicIds: [
          "kr.mt.math.number-operations.g3-4.s4-01-15.application"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.number-operations.g3-4.s4-01-15.representation",
          "kr.mt.math.number-operations.g3-4.s4-01-15.concept"
        ],
        observableEvidence: [
          "[4수01-15] 분수의 덧셈과 뺄셈 - 적용과 설명을 수행하는 순서와 주의할 점을 말한 뒤 과제를 끝까지 실행한다.",
          "수행 과정과 결과를 기록하고, [4수01-15] 분수의 덧셈과 뺄셈 - 적용과 설명의 다음 시도에서 바꿀 점을 한 가지 제시한다."
        ],
        assessmentPrompt:
          "'분수의 덧셈과 뺄셈'에 관한 생활 또는 탐구 문제를 제시하고, 학생이 풀이 전략, 계산 또는 표현, 답의 타당성을 차례로 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [4수01-15] 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-improper-sum",
        candidateRoles: [
          "position-card-1",
          "position-card-2",
          "position-card-3",
          "position-card-4",
          "position-card-5"
        ],
        candidateProperty: "text",
        correctValuePath: "correctResultLatex",
        distractors: [
          {
            predicateKind: "values.improper-sum-distractors",
            misconception:
              "분모가 같은 분수를 더할 때 분자와 분모를 모두 더하거나 합을 1에서 멈춘다."
          },
          {
            predicateKind: "values.improper-sum-distractors",
            misconception:
              "두 띠가 1의 금을 넘으면 넘은 부분만 합으로 읽거나 더 큰 덧수만 남긴다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "same-whole-length",
        roles: [
          "left-strip",
          "right-strip",
          "join-lane",
          "one-whole-boundary",
          "start-line"
        ],
        invariant:
          "1의 금을 넘어도 전체를 같은 수로 나눈 단위 조각의 크기는 그대로이며, 이어 붙인 조각 수가 합의 분자가 된다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "다섯 답 카드와 두 분수 띠는 계속 움직일 수 있으며, 학생은 1의 금을 지난 띠의 끝점을 확인한 뒤 선택을 고치고 분자가 분모보다 커질 수 있는 까닭을 다시 쓸 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "fraction.add.unlike-denominators.common-unit-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId:
        "fraction.add.unlike-denominators.common-unit-v1",
      blueprintVersion: "1.0.0",
      blueprintContentHash:
        "55ce5573df8fa6fa63d5d1dd2541e3e37ff2844fc497dc62cb9c84063569f5d9",
      mathematicalDecision:
        "학생은 분모가 다른 두 진분수의 합을 같은 크기의 칸으로 바꾸어 몇 칸인지 먼저 결정한다.",
      misconceptionConflict:
        "분자와 분모를 각각 더하거나 분모만 통분하고 분자는 그대로 두거나 큰 부분만 답으로 읽는 생각을, 공통 단위 자의 칸 경계와 이어 붙인 두 띠의 끝점에 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[6수01-08]",
        topicIds: [
          "kr.mt.math.number-operations.g5-6.s6-01-08.application"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.number-operations.g5-6.s6-01-08.representation",
          "kr.mt.math.number-operations.g5-6.s6-01-08.concept"
        ],
        observableEvidence: [
          "[6수01-08] 분수의 덧셈과 뺄셈 - 적용과 설명을 수행하는 순서와 주의할 점을 말한 뒤 과제를 끝까지 실행한다.",
          "수행 과정과 결과를 기록하고, [6수01-08] 분수의 덧셈과 뺄셈 - 적용과 설명의 다음 시도에서 바꿀 점을 한 가지 제시한다."
        ],
        assessmentPrompt:
          "'분수의 덧셈과 뺄셈'에 관한 생활 또는 탐구 문제를 제시하고, 학생이 풀이 전략, 계산 또는 표현, 답의 타당성을 차례로 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [6수01-08] 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-common-unit-sum",
        candidateRoles: [
          "position-card-1",
          "position-card-2",
          "position-card-3",
          "position-card-4",
          "position-card-5"
        ],
        candidateProperty: "text",
        correctValuePath: "correctResultLatex",
        distractors: [
          {
            predicateKind:
              "values.unlike-denominator-sum-distractors",
            misconception:
              "분모가 다른 분수를 더할 때 분자끼리, 분모끼리 각각 더하거나 분모만 통분한다."
          },
          {
            predicateKind:
              "values.unlike-denominator-sum-distractors",
            misconception:
              "같은 칸으로 바꾼 뒤 큰 부분만 남기거나 덧셈을 곱셈처럼 계산한다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "common-unit-cells",
        roles: [
          "left-strip",
          "right-strip",
          "join-lane",
          "unit-ruler",
          "start-line"
        ],
        invariant:
          "두 분수를 같은 크기의 칸으로 바꾸면 이어 붙인 칸 수가 합의 분자가 되고, 한 칸의 크기는 두 분모가 함께 나누어지는 공통 분모로 정해진다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "다섯 답 카드와 두 분수 띠는 계속 움직일 수 있으며, 학생은 이어 붙인 띠의 끝점과 공통 단위 자의 칸 경계를 본 뒤 선택을 고치고 두 분모가 같은 칸 수로 바뀌는 까닭을 다시 쓸 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "fraction.subtract.unlike-denominators.common-unit-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId:
        "fraction.subtract.unlike-denominators.common-unit-v1",
      blueprintVersion: "1.0.0",
      blueprintContentHash:
        "e655d2d643d32a7eba0cd46d4e919876cc0017b705221b8241c2a6e5cec17de9",
      mathematicalDecision:
        "학생은 분모가 다른 두 진분수의 차를 같은 크기의 칸으로 바꾸어 몇 칸이 남는지 먼저 결정한다.",
      misconceptionConflict:
        "한쪽 분수만 통분하거나 덮은 양을 답으로 읽거나 빼기를 생략하거나 분모를 더하는 생각을, 오른쪽 끝을 맞춰 덮고 남은 부분의 칸 경계와 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[6수01-08]",
        topicIds: [
          "kr.mt.math.number-operations.g5-6.s6-01-08.application"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.number-operations.g5-6.s6-01-08.representation",
          "kr.mt.math.number-operations.g5-6.s6-01-08.concept"
        ],
        observableEvidence: [
          "[6수01-08] 분수의 덧셈과 뺄셈 - 적용과 설명을 수행하는 순서와 주의할 점을 말한 뒤 과제를 끝까지 실행한다.",
          "수행 과정과 결과를 기록하고, [6수01-08] 분수의 덧셈과 뺄셈 - 적용과 설명의 다음 시도에서 바꿀 점을 한 가지 제시한다."
        ],
        assessmentPrompt:
          "'분수의 덧셈과 뺄셈'에 관한 생활 또는 탐구 문제를 제시하고, 학생이 풀이 전략, 계산 또는 표현, 답의 타당성을 차례로 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [6수01-08] 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-common-unit-difference",
        candidateRoles: [
          "position-card-1",
          "position-card-2",
          "position-card-3",
          "position-card-4",
          "position-card-5"
        ],
        candidateProperty: "text",
        correctValuePath: "correctResultLatex",
        distractors: [
          {
            predicateKind:
              "values.unlike-denominator-difference-distractors",
            misconception:
              "분모가 다른 분수를 뺄 때 한쪽만 통분하거나 덮은 양을 차로 읽는다."
          },
          {
            predicateKind:
              "values.unlike-denominator-difference-distractors",
            misconception:
              "빼기를 생략해 처음 양을 그대로 남기거나 분모를 두 분모의 합으로 쓴다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "common-unit-remainder",
        roles: [
          "left-strip",
          "right-strip",
          "join-lane",
          "unit-ruler",
          "start-line"
        ],
        invariant:
          "두 분수를 같은 크기의 칸으로 바꾼 뒤 빼는 띠의 오른쪽 끝을 처음 띠의 끝에 맞추면, 덮이지 않고 남은 앞부분의 칸 수가 차의 분자가 된다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "다섯 답 카드와 두 분수 띠는 계속 움직일 수 있으며, 학생은 덮이지 않고 남은 띠의 끝점과 공통 단위 자의 칸 경계를 본 뒤 선택을 고치고 남은 칸 수의 까닭을 다시 쓸 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "data.bar-graph.scale-unit.read-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId: "data.bar-graph.scale-unit.read-v1",
      blueprintVersion: "1.0.0",
      blueprintContentHash:
        "9bcc0d94a1e2ac589e1b9fecb8dc375e48908572288c6b5e601f5f14323f06dd",
      mathematicalDecision:
        "학생은 값이 알려진 기준 막대로 눈금 한 칸의 크기를 정하고, 파란 막대가 나타내는 값을 결정한다.",
      misconceptionConflict:
        "눈금 칸 수를 그대로 값으로 읽거나 기준값을 복사하거나 한 칸을 1명으로 보거나 경계를 하나 더 세는 생각을, 두 막대의 끝점과 같은 크기 눈금 칸에 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit:
          "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[4수04-01]",
        topicIds: [
          "kr.mt.math.data-probability.g3-4.s4-04-01.application"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.data-probability.g3-4.s4-04-01.representation",
          "kr.mt.math.data-probability.g3-4.s4-04-01.concept"
        ],
        observableEvidence: [
          "[4수04-01] 자료의 수집과 정리 - 적용과 설명을 수행하는 순서와 주의할 점을 말한 뒤 과제를 끝까지 실행한다.",
          "수행 과정과 결과를 기록하고, [4수04-01] 자료의 수집과 정리 - 적용과 설명의 다음 시도에서 바꿀 점을 한 가지 제시한다."
        ],
        assessmentPrompt:
          "'자료의 수집과 정리'에 관한 생활 또는 탐구 문제를 제시하고, 학생이 풀이 전략, 계산 또는 표현, 답의 타당성을 차례로 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [4수04-01] 원문을 권위 근거로 유지한다. 이 활동은 막대그래프 해석에만 범위를 두며 성취기준 전체를 대표하지 않는다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-bar-value",
        candidateRoles: [
          "position-card-1",
          "position-card-2",
          "position-card-3",
          "position-card-4",
          "position-card-5"
        ],
        candidateProperty: "text",
        correctValuePath: "correctResultText",
        distractors: [
          {
            predicateKind:
              "values.bar-graph-scale-distractors",
            misconception:
              "막대가 차지한 눈금 칸 수를 자료의 값으로 그대로 읽거나 기준 막대의 값을 복사한다."
          },
          {
            predicateKind:
              "values.bar-graph-scale-distractors",
            misconception:
              "눈금 한 칸을 1명으로 보거나 막대 끝의 경계를 한 칸 더 센다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "data-representation",
        roles: [
          "left-strip",
          "right-strip",
          "join-lane",
          "reference-lane",
          "question-lane",
          "unit-ruler",
          "start-line"
        ],
        invariant:
          "같은 눈금에서는 한 칸이 나타내는 값이 일정하므로 막대 길이의 칸 수와 자료 값의 비가 같다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "다섯 답 카드와 두 막대는 계속 움직일 수 있으며, 학생은 두 막대를 각 색의 눈금 행에서 같은 출발선에 맞춘 뒤 한 칸의 값을 다시 정해 선택과 설명을 고칠 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "measure.length.unit-iteration.ruler-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId: "measure.length.unit-iteration.ruler-v1",
      blueprintVersion: "1.2.0",
      blueprintContentHash:
        "55d47ab35ba0f07787d13520d2ee0c8f0e2a3fcd6a11a05d38a6722b60aa5f94",
      mathematicalDecision:
        "학생은 자의 시작점과 어긋나 놓인 연필에 1 cm 단위가 몇 번 반복되는지 확인하여 실제 길이를 결정한다.",
      misconceptionConflict:
        "눈금 경계를 하나 더 세거나 한 간격을 빠뜨리거나 자 전체·연필이 덮지 않은 부분을 길이로 고르는 생각을, 분할선 없는 연필을 따라 반복해서 옮기는 1 cm 막대에 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit:
          "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[2수03-10]",
        topicIds: [
          "kr.mt.math.geometry-measurement.g1-2.s2-03-10.application"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.geometry-measurement.g1-2.s2-03-10.representation",
          "kr.mt.math.geometry-measurement.g1-2.s2-03-10.concept"
        ],
        observableEvidence: [
          "[2수03-10] 길이 - 적용과 설명을 수행하는 순서와 주의할 점을 말한 뒤 과제를 끝까지 실행한다.",
          "수행 과정과 결과를 기록하고, [2수03-10] 길이 - 적용과 설명의 다음 시도에서 바꿀 점을 한 가지 제시한다."
        ],
        assessmentPrompt:
          "'길이'에 관한 생활 또는 탐구 문제를 제시하고, 학생이 풀이 전략, 계산 또는 표현, 답의 타당성을 차례로 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [2수03-10] 원문을 권위 근거로 유지한다. 이 활동은 1 cm 단위를 이용한 길이 측정에 범위를 둔다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-measured-length",
        candidateRoles: [
          "position-card-1",
          "position-card-2",
          "position-card-3",
          "position-card-4",
          "position-card-5"
        ],
        candidateProperty: "text",
        correctValuePath: "correctLengthText",
        distractors: [
          {
            predicateKind:
              "values.broken-ruler-length-distractors",
            misconception:
              "자 전체 길이나 연필이 덮지 않은 부분의 길이를 물체의 길이로 고른다."
          },
          {
            predicateKind:
              "values.broken-ruler-length-distractors",
            misconception:
              "1 cm 간격 대신 양쪽 끝을 포함한 눈금선의 수를 세거나 한 간격을 빠뜨린다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "countable-unit-model",
        roles: [
          "left-strip",
          "right-strip",
          "join-lane",
          "unit-ruler",
          "start-line"
        ],
        invariant:
          "연필이 자의 어느 위치에 놓여도 길이는 같으며, 같은 1 cm 막대가 두 끝 사이에 반복되는 횟수와 같다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "다섯 길이 카드와 1 cm 막대 한 개는 계속 움직일 수 있으며, 학생은 연필의 왼쪽 끝부터 막대를 반복해 옮긴 뒤 선택과 까닭을 고칠 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "number.place-value.regroup-ten-bundles-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId: "number.place-value.regroup-ten-bundles-v1",
      blueprintVersion: "1.1.0",
      blueprintContentHash:
        "b7197bba084210107a5466f0656c1a4716f0ae9e3cb851348ce61e754aa88f83",
      mathematicalDecision:
        "학생은 처음 수에 십 모형 10개를 더했을 때 백의 자리가 어떻게 바뀌는지 결정한다.",
      misconceptionConflict:
        "모형 개수를 이어 쓰거나 십 모형 10개를 빠뜨리거나 10개의 일로 세는 생각을, 열 칸 묶음판과 10줄 100칸의 같은 양에 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit:
          "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[2수01-02]",
        topicIds: [
          "kr.mt.math.number-operations.g1-2.s2-01-02.application"
        ],
        prerequisiteTopicIds: [
          "kr.mt.math.number-operations.g1-2.s2-01-02.representation",
          "kr.mt.math.number-operations.g1-2.s2-01-02.concept"
        ],
        observableEvidence: [
          "[2수01-02] 네 자리 이하의 수 - 적용과 설명을 수행하는 순서와 주의할 점을 말한 뒤 과제를 끝까지 실행한다.",
          "수행 과정과 결과를 기록하고, [2수01-02] 네 자리 이하의 수 - 적용과 설명의 다음 시도에서 바꿀 점을 한 가지 제시한다."
        ],
        assessmentPrompt:
          "'네 자리 이하의 수'에 관한 생활 또는 탐구 문제를 제시하고, 학생이 풀이 전략, 계산 또는 표현, 답의 타당성을 차례로 설명하게 하라.",
        caveat:
          "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [2수01-02] 원문을 권위 근거로 유지한다. 이 활동은 십 모형 10개와 10줄 100칸의 교환 관계에 범위를 둔다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-place-value-total",
        candidateRoles: [
          "position-card-1",
          "position-card-2",
          "position-card-3",
          "position-card-4",
          "position-card-5"
        ],
        candidateProperty: "text",
        correctValuePath: "correctValueText",
        distractors: [
          {
            predicateKind:
              "values.place-value-ten-exchange-distractors",
            misconception:
              "처음 수의 자릿값과 십 모형 10개의 개수를 구별하지 않고 차례대로 이어 쓴다."
          },
          {
            predicateKind:
              "values.place-value-ten-exchange-distractors",
            misconception:
              "따로 놓인 십 모형 10개를 빠뜨리거나 10개의 일로 세거나 자리의 순서를 뒤바꾼다."
          }
        ]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "countable-unit-model",
        roles: [
          "exchange-ten-1",
          "exchange-ten-10",
          "exchange-slot-1",
          "exchange-slot-10",
          "ten-bank",
          "exchange-box",
          "hundred-grid-panel",
          "hundred-grid-row-1",
          "hundred-grid-row-5",
          "hundred-grid-row-10",
          "hundred-grid-relation"
        ],
        invariant:
          "십 모형 10개를 열 칸에 하나씩 놓으면 10이 열 번 모이고, 이는 10줄 100칸과 같은 100이다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath:
        "다섯 수 카드와 십 모형 10개는 계속 움직일 수 있으며, 학생은 서로 다른 열 칸을 채워 100칸과 연결한 뒤 선택과 자릿값 설명을 고칠 수 있다.",
      limitations: {
        autoGrading: "none-by-design",
        phaseOrder: "teacher-guided"
      }
    }),
  "number.make-10.cards-v1": defineCognitiveDemandManifest({
    schemaVersion: "1.0.0",
    blueprintId: "number.make-10.cards-v1",
    blueprintVersion: "2.1.0",
    blueprintContentHash:
      "27082cd6541c915682e11d798ae96ba7a496354c1a6d1b890cc2e9357902b8b0",
    mathematicalDecision:
      "학생은 여섯 수 카드 중에서 합이 10인 두 장을 골라 구성하고, 가능한 다른 구성도 찾는다.",
    misconceptionConflict:
      "가까워 보이는 두 수를 바로 고르거나 제공된 카드를 모두 써야 한다는 생각을, 합이 9 또는 11인 근접 오답과 쓰이지 않는 카드, 열 칸 모형의 개수와 충돌시킨다.",
    learningMap: {
      repository: "DECK6/korean-elementary-learning-map",
      commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
      usageSnapshotSha256:
          "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
      standardCode: "[2수01-04]",
      topicIds: [
        "kr.mt.math.number-operations.g1-2.s2-01-04.representation"
      ],
      prerequisiteTopicIds: [
        "kr.mt.math.number-operations.g1-2.s2-01-04.concept"
      ],
      observableEvidence: [
        "자신의 표현물에서 수와 연산 내용과 근거가 드러나는 부분을 찾아 설명한다."
      ],
      assessmentPrompt:
        "'네 자리 이하의 수'에 관한 과제를 제시하고, 학생이 같은 수학적 의미를 두 가지 이상의 표현으로 나타낸 뒤 연결 이유를 설명하게 하라.",
      caveat:
        "학습지도 저장소의 세부 주제와 선수 관계는 독립 모델이며 공식 승인 관계가 아니다. 공식 교육과정 [2수01-04] 원문을 권위 근거로 유지한다."
    },
    decision: {
      mode: "construct",
      slotRoles: ["left-slot", "right-slot"],
      pieceRoles: [
        "piece-card-1",
        "piece-card-2",
        "piece-card-3",
        "piece-card-4",
        "piece-card-5",
        "piece-card-6"
      ],
      pieceProperty: "value",
      totalPath: "total",
      solutionSetPath: "solutions",
      surplusPath: "surplusPieces",
      minimumSolutions: 2,
      minimumSurplus: 2,
      distractors: [
        {
          predicateKind: "values.near-miss-combination",
          misconception:
            "10과 하나 차이 나는 두 수를 정확한 보수 관계로 착각한다."
        },
        {
          predicateKind: "values.surplus-piece-present",
          misconception:
            "제공된 모든 카드는 반드시 답에 사용되어야 한다고 생각한다."
        }
      ]
    },
    prediction: { regionRole: "prediction-box" },
    verification: {
      kind: "countable-unit-model",
      roles: [
        "frame-cell-1",
        "frame-cell-2",
        "frame-cell-3",
        "frame-cell-4",
        "frame-cell-5",
        "frame-cell-6",
        "frame-cell-7",
        "frame-cell-8",
        "frame-cell-9",
        "frame-cell-10"
      ],
      invariant:
        "선택한 두 수를 합한 만큼 표시하면 열 칸이 남거나 넘치지 않고 정확히 채워져야 한다."
    },
    explanation: { regionRole: "explanation-box" },
    revisionPath:
      "여섯 카드는 계속 움직일 수 있으며, 학생은 열 칸이 정확히 채워지지 않으면 카드를 바꾸고 다른 해와 근거를 다시 기록할 수 있다.",
    limitations: {
      autoGrading: "none-by-design",
      phaseOrder: "teacher-guided"
    }
  }),
  "pattern.repeat-unit.pattern-blocks-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId: "pattern.repeat-unit.pattern-blocks-v1",
      blueprintVersion: "1.0.0",
      blueprintContentHash: "4143cea8a814cabbb474672c5836c4bfa664de287a53db22da4bbc15f82cc675",
      mathematicalDecision: "학생은 무늬에서 가장 짧게 되풀이되는 단위의 조각 수를 결정한다.",
      misconceptionConflict: "눈에 보이는 전체 조각 수나 같은 색의 개수를 반복 단위로 보는 생각을, 다음 두 조각을 이어 놓았을 때 순서가 끊기는 결과와 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256: "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[2수02-01]",
        topicIds: ["kr.mt.math.change-relationships.g1-2.s2-02-01.application"],
        prerequisiteTopicIds: ["kr.mt.math.change-relationships.g1-2.s2-02-01.representation", "kr.mt.math.change-relationships.g1-2.s2-02-01.concept"],
        observableEvidence: ["규칙 찾기 과정을 끝까지 실행하고 다음 시도에서 바꿀 점을 제시한다."],
        assessmentPrompt: "규칙 찾기 생활 문제에서 풀이 전략, 표현, 답의 타당성을 차례로 설명하게 하라.",
        caveat: "학습지도 저장소는 보조 자료이며 공식 교육과정 [2수02-01] 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-repeat-length",
        candidateRoles: ["position-card-1", "position-card-2", "position-card-3", "position-card-4", "position-card-5"],
        candidateProperty: "text",
        correctValuePath: "correctValueText",
        distractors: [{ predicateKind: "cognitive.release-contract", misconception: "보이는 전체 조각 수나 같은 색의 개수를 가장 짧은 반복 단위로 착각한다." }]
      },
      prediction: { regionRole: "prediction-box" },
      verification: {
        kind: "countable-unit-model",
        roles: ["sequence-block-1", "sequence-block-2", "sequence-block-3", "sequence-block-4", "sequence-block-5", "sequence-block-6", "next-slot-1", "next-slot-2", "completion-block-1", "completion-block-2"],
        invariant: "가장 짧은 반복 단위를 그대로 이어 놓으면 같은 모양과 색의 순서가 끊기지 않고 다시 시작되어야 한다."
      },
      explanation: { regionRole: "explanation-box" },
      revisionPath: "다섯 조각과 다섯 선택 카드는 계속 움직일 수 있어, 순서가 끊기면 조각과 반복 단위 선택을 고칠 수 있다.",
      limitations: { autoGrading: "none-by-design", phaseOrder: "teacher-guided" }
    }),
  "number.multiplication.group-array-meaning-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId: "number.multiplication.group-array-meaning-v1",
      blueprintVersion: "1.1.0",
      blueprintContentHash: "d2b37527080376ae02d06f5888f9a06f4307a4a5568220806f95fd1edf9b8664",
      mathematicalDecision: "학생은 한 묶음의 수와 묶음 수를 곱셈식의 앞 수와 뒤 수에 연결한다.",
      misconceptionConflict: "두 수의 순서를 바꾸어도 상황을 똑같이 설명하거나 두 수를 더하면 된다는 생각을, 괄호로 나눈 묶음 배열과 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256: "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[2수01-10]",
        topicIds: ["kr.mt.math.number-operations.g1-2.s2-01-10.representation"],
        prerequisiteTopicIds: ["kr.mt.math.number-operations.g1-2.s2-01-10.concept"],
        observableEvidence: ["곱셈의 의미를 말·글·표·그림·움직임 중 알맞은 방식으로 표현한다."],
        assessmentPrompt: "곱셈의 같은 의미를 두 가지 이상의 표현으로 나타내고 연결 이유를 설명하게 하라.",
        caveat: "학습지도 저장소는 보조 자료이며 공식 교육과정 [2수01-10] 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-multiplication-expression",
        candidateRoles: ["position-card-1", "position-card-2", "position-card-3", "position-card-4", "position-card-5"],
        candidateProperty: "text",
        correctValuePath: "correctValueText",
        distractors: [{ predicateKind: "cognitive.release-contract", misconception: "한 묶음의 수와 묶음 수의 순서를 바꾸거나 두 수를 더해 상황을 나타낸다." }]
      },
      prediction: { regionRole: "prediction-box" },
      verification: { kind: "countable-unit-model", roles: ["array-panel", "group-label", "array-text"], invariant: "각 괄호 안의 점 수가 한 묶음의 수이고 괄호의 개수가 묶음 수와 같아야 한다." },
      explanation: { regionRole: "explanation-box" },
      revisionPath: "다섯 식 카드는 계속 움직일 수 있어, 배열의 한 묶음 수와 묶음 수가 맞지 않으면 식을 고치고 두 수의 뜻을 다시 쓸 수 있다.",
      limitations: { autoGrading: "none-by-design", phaseOrder: "teacher-guided" }
    }),
  "probability.compare.bag-ratios-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId: "probability.compare.bag-ratios-v1",
      blueprintVersion: "1.1.0",
      blueprintContentHash: "e664b15c5123557259f782f56cfaf260686547f018dac81dabc1d2c82678ef0e",
      mathematicalDecision: "학생은 두 주머니에서 빨강 공이 나올 가능성을 전체 공 수에 대한 빨강 공 수로 나타내어 비교한다.",
      misconceptionConflict: "빨강 공 개수만 많으면 가능성이 크거나 전체 공이 많으면 가능성이 크다는 생각을, 같은 전체 길이의 분수 띠 끝점과 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256: "4c4d0514b6c273e83eb87cd6ff85815da067bea09ef16f4d6d2d54e6efd322fe",
        standardCode: "[6수04-04]",
        topicIds: ["kr.mt.math.data-probability.g5-6.s6-04-04.representation"],
        prerequisiteTopicIds: ["kr.mt.math.data-probability.g5-6.s6-04-04.concept"],
        observableEvidence: ["가능성을 말·글·표·그림·움직임 중 알맞은 방식으로 표현한다."],
        assessmentPrompt: "가능성의 같은 의미를 두 가지 이상의 표현으로 나타내고 연결 이유를 설명하게 하라.",
        caveat: "학습지도 저장소는 보조 자료이며 공식 교육과정 [6수04-04] 원문을 권위 근거로 유지한다."
      },
      decision: {
        mode: "select-one",
        constraintId: "select-relation",
        candidateRoles: ["less-symbol", "equal-symbol", "greater-symbol"],
        candidateProperty: "text",
        correctValuePath: "correctRelation",
        distractors: [{ role: "equal-symbol", misconception: "빨강 공 수나 전체 공 수 하나만 보고 두 가능성이 같다고 판단한다." }]
      },
      prediction: { regionRole: "prediction-box" },
      verification: { kind: "same-whole-length", roles: ["left-strip", "right-strip", "start-line"], invariant: "전체 공 수에 대한 빨강 공 수를 같은 전체 길이와 같은 출발선의 띠로 비교해야 한다." },
      explanation: { regionRole: "explanation-box" },
      revisionPath: "세 기호와 두 띠는 계속 움직일 수 있어, 띠 끝점이 예상과 다르면 선택을 고치고 전체 수와 빨강 수로 다시 설명할 수 있다.",
      limitations: { autoGrading: "none-by-design", phaseOrder: "teacher-guided" }
    })
};

export function getCognitiveDemandManifest(
  blueprintId: string
): CognitiveDemandManifest | undefined {
  const manifest = manifests[blueprintId];
  return manifest
    ? cognitiveDemandManifestSchema.parse(manifest)
    : undefined;
}

export function listCognitiveDemandManifests(): readonly CognitiveDemandManifest[] {
  return Object.values(manifests).map((manifest) =>
    cognitiveDemandManifestSchema.parse(manifest)
  );
}

export function assertCognitiveManifestBound(
  blueprint: ActivityBlueprint
): CognitiveDemandManifest {
  const manifest = getCognitiveDemandManifest(blueprint.id);
  if (!manifest) {
    throw new Error(
      `cognitive-manifest-missing:${blueprint.id}`
    );
  }
  if (
    manifest.blueprintVersion !== blueprint.version ||
    manifest.blueprintContentHash !== blueprint.contentHash
  ) {
    throw new Error(
      `cognitive-manifest-drift:${blueprint.id}`
    );
  }
  const predicate = blueprint.valuePredicates.find(
    (candidate) =>
      candidate.kind === "cognitive.release-contract"
  );
  if (!predicate) {
    throw new Error(
      `cognitive-runtime-predicate-missing:${blueprint.id}`
    );
  }
  const expected =
    manifest.decision.mode === "select-one"
      ? {
          mode: manifest.decision.mode,
          decisionConstraintId: manifest.decision.constraintId,
          candidateRoles: manifest.decision.candidateRoles,
          candidateProperty: manifest.decision.candidateProperty,
          correctValuePath: manifest.decision.correctValuePath,
          predictionRole: manifest.prediction.regionRole,
          explanationRole: manifest.explanation.regionRole,
          verificationRoles: manifest.verification.roles
        }
      : {
          mode: manifest.decision.mode,
          slotRoles: manifest.decision.slotRoles,
          pieceRoles: manifest.decision.pieceRoles,
          pieceProperty: manifest.decision.pieceProperty,
          totalPath: manifest.decision.totalPath,
          solutionSetPath: manifest.decision.solutionSetPath,
          surplusPath: manifest.decision.surplusPath,
          minimumSolutions: manifest.decision.minimumSolutions,
          minimumSurplus: manifest.decision.minimumSurplus,
          predictionRole: manifest.prediction.regionRole,
          explanationRole: manifest.explanation.regionRole,
          verificationRoles: manifest.verification.roles
        };
  if (JSON.stringify(predicate.parameters) !== JSON.stringify(expected)) {
    throw new Error(
      `cognitive-runtime-predicate-drift:${blueprint.id}`
    );
  }
  return manifest;
}
