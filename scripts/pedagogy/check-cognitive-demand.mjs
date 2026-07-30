import { readFile } from "node:fs/promises";
import {
  COGNITIVE_GATE_IDS,
  ACTIVITY_SUPPORT,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import {
  LEARNING_MAP_COMMIT,
  resolveCurriculum
} from "../../packages/curriculum/dist/index.js";
import {
  assertCognitiveManifestBound,
  listCognitiveDemandManifests,
  listRegisteredBlueprints
} from "../../packages/templates/dist/index.js";

const failures = [];
const blueprints = listRegisteredBlueprints();
const manifests = listCognitiveDemandManifests();
const blueprintById = new Map(
  blueprints.map((blueprint) => [blueprint.id, blueprint])
);
const manifestById = new Map(
  manifests.map((manifest) => [manifest.blueprintId, manifest])
);
const learningMapUsage = JSON.parse(
  await readFile(
    new URL(
      "../../fixtures/pedagogy/learning-map.used.json",
      import.meta.url
    ),
    "utf8"
  )
);
const learningMapTopicIds = new Set(
  learningMapUsage.topics.map((topic) => topic.id)
);

const sameSet = (left, right) =>
  left.length === right.length &&
  left.every((value) => right.includes(value));

for (const gateId of COGNITIVE_GATE_IDS) {
  const docs = await readFile(
    new URL("../../docs/COGNITIVE_DEMAND_GATES.md", import.meta.url),
    "utf8"
  );
  if (!docs.includes(`\`${gateId}\``)) {
    failures.push(`gate-undocumented:${gateId}`);
  }
}

for (const manifest of manifests) {
  const blueprint = blueprintById.get(manifest.blueprintId);
  if (!blueprint) {
    failures.push(
      `manifest-blueprint-unregistered:${manifest.blueprintId}`
    );
    continue;
  }
  try {
    assertCognitiveManifestBound(blueprint);
  } catch (error) {
    failures.push(
      error instanceof Error ? error.message : String(error)
    );
    continue;
  }

  if (
    manifest.learningMap.commit !== LEARNING_MAP_COMMIT ||
    learningMapUsage.commit !== LEARNING_MAP_COMMIT ||
    manifest.learningMap.usageSnapshotSha256 !==
      sha256Hex(learningMapUsage) ||
    manifest.learningMap.topicIds.some(
      (topicId) => !learningMapTopicIds.has(topicId)
    ) ||
    manifest.learningMap.prerequisiteTopicIds.some(
      (topicId) => !learningMapTopicIds.has(topicId)
    )
  ) {
    failures.push(
      `learning-map-provenance-invalid:${blueprint.id}`
    );
  }
  const sourceTopics = learningMapUsage.topics.filter((topic) =>
    manifest.learningMap.topicIds.includes(topic.id)
  );
  const sourceEvidence = new Set(
    sourceTopics.flatMap((topic) => topic.evidence)
  );
  const sourceAssessmentPrompts = new Set(
    sourceTopics.map((topic) => topic.assessmentPrompt)
  );
  if (
    manifest.learningMap.observableEvidence.some(
      (evidence) => !sourceEvidence.has(evidence)
    ) ||
    !sourceAssessmentPrompts.has(
      manifest.learningMap.assessmentPrompt
    )
  ) {
    failures.push(
      `learning-map-evidence-unbound:${blueprint.id}`
    );
  }
  const curriculum = resolveCurriculum(
    manifest.learningMap.standardCode
  ).record;
  if (
    curriculum.code !== blueprint.curriculumBinding.standardCode ||
    curriculum.officialSource.verificationStatus !==
      "official-text-verified"
  ) {
    failures.push(
      `official-curriculum-unverified:${blueprint.id}`
    );
  }

  const roleByName = new Map(
    blueprint.toolRoles.map((role) => [role.role, role])
  );
  let itemDecisionConstraints = [];
  if (manifest.decision.mode === "select-one") {
    const candidates = manifest.decision.candidateRoles.map((role) =>
      roleByName.get(role)
    );
    if (
      new Set(manifest.decision.candidateRoles).size < 3 ||
      candidates.some(
        (role) =>
          !role ||
          role.scope !== "each-item" ||
          !role.movable ||
          role.locked
      )
    ) {
      failures.push(`G1_DECISION_EXISTS:${blueprint.id}`);
    }
    const decision = blueprint.constraints.find(
      (constraint) =>
        constraint.id === manifest.decision.constraintId
    );
    itemDecisionConstraints = decision ? [decision] : [];
    const decisionRoles =
      decision?.sources.map((source) => source.role) ?? [];
    if (
      !decision ||
      decision.kind !== "select-one-of" ||
      !decision.requiresStudentAction ||
      !sameSet(
        decisionRoles,
        manifest.decision.candidateRoles
      )
    ) {
      failures.push(`G1_DECISION_EXISTS:${blueprint.id}`);
      failures.push(`G4_NO_TRIVIAL_PATH:${blueprint.id}`);
    }
  } else {
    const pieces = manifest.decision.pieceRoles.map((role) =>
      roleByName.get(role)
    );
    const slots = manifest.decision.slotRoles.map((role) =>
      roleByName.get(role)
    );
    itemDecisionConstraints = manifest.decision.slotRoles.map(
      (slotRole) =>
        blueprint.constraints.find(
          (constraint) =>
            constraint.kind === "fill-from-pool" &&
            constraint.target.role === slotRole
        )
    );
    if (
      new Set(manifest.decision.pieceRoles).size < 3 ||
      pieces.some(
        (role) =>
          !role ||
          role.scope !== "each-item" ||
          !role.movable ||
          role.locked
      ) ||
      slots.some(
        (role) =>
          !role ||
          role.scope !== "each-item" ||
          role.movable ||
          !role.locked
      ) ||
      itemDecisionConstraints.some(
        (constraint) =>
          !constraint ||
          !constraint.requiresStudentAction ||
          !sameSet(
            constraint.sources.map((source) => source.role),
            manifest.decision.pieceRoles
          )
      )
    ) {
      failures.push(`G1_DECISION_EXISTS:${blueprint.id}`);
      failures.push(`G4_NO_TRIVIAL_PATH:${blueprint.id}`);
    }
  }

  if (
    manifest.decision.distractors.length < 1 ||
    manifest.decision.distractors.some(
      (distractor) =>
        distractor.role !== undefined &&
        !(
          manifest.decision.mode === "select-one"
            ? manifest.decision.candidateRoles
            : manifest.decision.pieceRoles
        ).includes(distractor.role)
    ) ||
    manifest.decision.distractors.some(
      (distractor) =>
        distractor.predicateKind !== undefined &&
        !blueprint.valuePredicates.some(
          (predicate) =>
            predicate.kind === distractor.predicateKind
        )
    )
  ) {
    failures.push(`G2_DISTRACTOR_SURPLUS:${blueprint.id}`);
    failures.push(`G4_NO_TRIVIAL_PATH:${blueprint.id}`);
  }

  const answerPath =
    manifest.decision.mode === "select-one"
      ? manifest.decision.correctValuePath
      : manifest.decision.solutionSetPath;
  const boundAnswer = blueprint.toolRoles.some(
    (role) =>
      role.locked &&
      Object.values(role.bindings).includes(
        `item.${answerPath}`
      )
  );
  if (boundAnswer) {
    failures.push(`G3_ANSWER_HIDDEN:${blueprint.id}`);
  }

  const prediction = roleByName.get(
    manifest.prediction.regionRole
  );
  if (
    !prediction ||
    !prediction.locked ||
    prediction.movable ||
    Object.keys(prediction.bindings).length > 0
  ) {
    failures.push(`G5_PREDICTION_REGION:${blueprint.id}`);
  }

  const explanation = roleByName.get(
    manifest.explanation.regionRole
  );
  if (
    !explanation ||
    !explanation.locked ||
    explanation.movable ||
    Object.keys(explanation.bindings).length > 0
  ) {
    failures.push(`G6_EXPLANATION_REGION:${blueprint.id}`);
  }

  if (
    manifest.verification.roles.some(
      (role) => !roleByName.has(role)
    )
  ) {
    failures.push(`G7_SELF_VERIFIABLE:${blueprint.id}`);
  }

  if (
    !blueprint.valuePredicates.some(
      (predicate) =>
        predicate.kind === "cognitive.release-contract"
    ) ||
    itemDecisionConstraints.length === 0 ||
    itemDecisionConstraints.some(
      (decision) =>
        !decision ||
        decision.target.scope !== "each-item" ||
        decision.sources.some(
          (source) => source.scope !== "each-item"
        )
    )
  ) {
    failures.push(`G8_PER_ITEM_STRUGGLE:${blueprint.id}`);
  }
}

for (const blueprint of blueprints) {
  if (
    ACTIVITY_SUPPORT[blueprint.id] === "released" &&
    !manifestById.has(blueprint.id)
  ) {
    failures.push(`G0_MANIFEST_BOUND:${blueprint.id}`);
  }
}

if (failures.length > 0) {
  throw new Error(
    `cognitive-demand-failed:\n${[...new Set(failures)].join("\n")}`
  );
}

const released = blueprints.filter(
  (blueprint) => ACTIVITY_SUPPORT[blueprint.id] === "released"
);
console.log(
  `cognitive-demand PASS: ${released.length} released / ${manifests.length} manifest / ${blueprints.length} registered`
);
