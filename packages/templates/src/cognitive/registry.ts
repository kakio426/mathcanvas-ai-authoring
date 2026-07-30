import {
  cognitiveDemandManifestSchema,
  defineCognitiveDemandManifest,
  type ActivityBlueprint,
  type CognitiveDemandManifest
} from "@mathcanvas/contracts";

const manifests: Readonly<Record<string, CognitiveDemandManifest>> = {
  "fraction.compare.unlike-denominators.visual-v1":
    defineCognitiveDemandManifest({
      schemaVersion: "1.0.0",
      blueprintId:
        "fraction.compare.unlike-denominators.visual-v1",
      blueprintVersion: "1.0.0",
      blueprintContentHash:
        "d68d8840949537996aa9783a34b5ba97af7fa90ccf87f90102db2886f83e96c1",
      mathematicalDecision:
        "학생은 두 분수를 같은 전체에서 비교하여 <, =, > 중 어떤 관계인지 결정한다.",
      misconceptionConflict:
        "분모가 큰 분수가 항상 크다는 생각이나 색칠한 조각 수만 비교하는 생각을 같은 전체의 띠 길이와 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "385cda5164537a433e45c6767b747b5c1d4cc02b0038e9e8dcd1ab9eede19f8d",
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
      blueprintVersion: "2.0.0",
      blueprintContentHash:
        "fe47ca29c4bf706edcda86598eec3a22d9cca54e7a2fdb3d1363da7e76655419",
      mathematicalDecision:
        "학생은 기준 분수와 값이 같은 후보 하나를 여섯 개의 분수 띠 중에서 선택한다.",
      misconceptionConflict:
        "분자나 분모만 바꾸거나 둘에 같은 수를 더해도 같은 분수가 된다는 생각을, 같은 전체와 출발선에서 비교한 띠의 서로 다른 끝점과 충돌시킨다.",
      learningMap: {
        repository: "DECK6/korean-elementary-learning-map",
        commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
        usageSnapshotSha256:
          "385cda5164537a433e45c6767b747b5c1d4cc02b0038e9e8dcd1ab9eede19f8d",
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
  "number.make-10.cards-v1": defineCognitiveDemandManifest({
    schemaVersion: "1.0.0",
    blueprintId: "number.make-10.cards-v1",
    blueprintVersion: "2.0.0",
    blueprintContentHash:
      "88764b04c30d933667ee65bbb0f3e958c5a9bde073f1442581510608eb81c61b",
    mathematicalDecision:
      "학생은 여섯 수 카드 중에서 합이 10인 두 장을 골라 구성하고, 가능한 다른 구성도 찾는다.",
    misconceptionConflict:
      "가까워 보이는 두 수를 바로 고르거나 제공된 카드를 모두 써야 한다는 생각을, 합이 9 또는 11인 근접 오답과 쓰이지 않는 카드, 열 칸 모형의 개수와 충돌시킨다.",
    learningMap: {
      repository: "DECK6/korean-elementary-learning-map",
      commit: "3ef0563084aa2a9baaa47da2c1ec0ebf5d7edc5c",
      usageSnapshotSha256:
        "385cda5164537a433e45c6767b747b5c1d4cc02b0038e9e8dcd1ab9eede19f8d",
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
