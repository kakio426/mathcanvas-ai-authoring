import { readFile } from "node:fs/promises";
import {
  COGNITIVE_GATE_IDS,
  ACTIVITY_RELEASE_EVIDENCE,
  ACTIVITY_SUPPORT,
  sha256Hex
} from "../../packages/contracts/dist/index.js";
import {
  LEARNING_MAP_COMMIT,
  resolveCurriculum
} from "../../packages/curriculum/dist/index.js";
import {
  assertCognitiveManifestBound,
  enumerateRegisteredVariationEnvelope,
  generateRegisteredBlueprintItems,
  listCognitiveDemandManifests,
  listRegisteredBlueprints
} from "../../packages/templates/dist/index.js";
import {
  getLayoutPreset
} from "../../packages/mathcanvas-compiler/dist/index.js";
import {
  validateP3ReleaseCanaryEvidence
} from "../contract-lab/validate-p3-release-canary.mjs";
import {
  validateActivityReleaseCanaryEvidence
} from "../contract-lab/validate-activity-release-canary.mjs";

const failures = [];
// 출시 전 활동 중 교육과정 레코드를 아직 사람이 검토하지 않은 목록.
// 실패로 막지는 않지만, 출시 시점에 반드시 갚아야 할 부채로 보고한다.
const curriculumReviewDebt = [];
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

const flattenLayoutBlocks = (block) => [
  block,
  ...block.children.flatMap(flattenLayoutBlocks)
];

const sameValue = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right);

const containsVisibleAnswer = (value, answer) => {
  if (sameValue(value, answer)) return true;
  if (
    typeof value === "string" &&
    (typeof answer === "string" || typeof answer === "number")
  ) {
    const visible = value.normalize("NFKC").toLowerCase().replace(/\s+/gu, "");
    const expected = String(answer)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/gu, "");
    if (expected.length > 0) {
      if (/^[+-]?\d+(?:[.,]\d+)?$/u.test(expected)) {
        const escaped = expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (
          new RegExp(
            `(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`,
            "u"
          ).test(visible)
        ) {
          return true;
        }
      } else if (visible.includes(expected)) {
        return true;
      }
    }
  }
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some((entry) =>
    containsVisibleAnswer(entry, answer)
  );
};

const itemBindingValue = (item, binding) => {
  if (!binding.startsWith("item.")) return undefined;
  return binding
    .slice("item.".length)
    .split(".")
    .reduce(
      (value, key) =>
        value && typeof value === "object" ? value[key] : undefined,
      item.values
    );
};

const isLearnerTextProperty = (property) =>
  /(?:text|latex|label|title|expression)$/iu.test(property);

const visibleTextStrings = (value, output = []) => {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => visibleTextStrings(entry, output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => {
      if (/(?:text|latex|label|title|expression)$/iu.test(key) ||
          (entry && typeof entry === "object")) {
        visibleTextStrings(entry, output);
      }
    });
  }
  return output;
};

const containsVisibleOrderedRuleState = (value, state) => {
  if (sameValue(value, state)) return true;
  return visibleTextStrings(value).some((text) => {
    let cursor = -1;
    return state.every((entry) => {
      const normalized = text.normalize("NFKC");
      const token = String(entry).normalize("NFKC");
      const next = normalized.indexOf(token, cursor + 1);
      if (next < 0) return false;
      cursor = next;
      return true;
    });
  });
};

const orderedStateList = (value) =>
  Array.isArray(value) &&
  value.every((state) => Array.isArray(state) && state.length >= 2)
    ? value
    : undefined;

const canComposeOrderedState = (state, sourceValues) => {
  const remaining = [...sourceValues];
  return state.every((entry) => {
    const index = remaining.findIndex((candidate) =>
      sameValue(candidate, entry)
    );
    if (index < 0) return false;
    remaining.splice(index, 1);
    return true;
  });
};

const distinctOrderedValueCount = (state) =>
  state.filter(
    (value, index) =>
      state.findIndex((candidate) => sameValue(candidate, value)) ===
      index
  ).length;

const containsConcreteInitialState = (properties) =>
  Object.entries(properties).some(
    ([key, value]) =>
      /(?:variant|value|orderedValues|pattern|color|shape|expression|text|label)$/iu.test(
        key
      ) &&
      value !== undefined &&
      value !== null &&
      value !== ""
  );

const containsVisibleOrderedRuleStateAcrossProperties = (
  properties,
  state
) => {
  const values = [];
  const collect = (value) => {
    if (typeof value === "string") {
      values.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(collect);
    }
  };
  collect(properties);
  return containsVisibleOrderedRuleState(values.join(" "), state);
};

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
  const resolution = resolveCurriculum(
    manifest.learningMap.standardCode
  );
  const curriculum = resolution.record;
  if (curriculum.code !== blueprint.curriculumBinding.standardCode) {
    failures.push(
      `official-curriculum-unverified:${blueprint.id}`
    );
  } else if (ACTIVITY_SUPPORT[blueprint.id] === "released") {
    // 출시 활동은 사람이 공식 원문과 대조한 레코드만 허용한다.
    // 자동 합성 레코드(`official-source-checked`)로는 출시할 수 없다.
    if (
      resolution.provenance !== "reviewed" ||
      curriculum.officialSource.verificationStatus !==
        "official-text-verified"
    ) {
      failures.push(
        `official-curriculum-unverified:${blueprint.id}`
      );
    }
  } else if (resolution.provenance === "synthesized") {
    // 출시 전 활동은 합성 레코드를 허용하되 남은 검토 부채로 집계한다.
    curriculumReviewDebt.push(
      `${blueprint.id} (${curriculum.code})`
    );
  }

  const roleByName = new Map(
    blueprint.toolRoles.map((role) => [role.role, role])
  );
  const layoutBlocks = flattenLayoutBlocks(blueprint.layout.root);
  const layoutPreset = getLayoutPreset(blueprint.layout.tokenSet);
  const forbiddenLearnerPhrases = [
    "먼저 예상",
    "세어 확인",
    "근거와 수정",
    "수 카드 모음",
    "검증",
    "불변량",
    "후보"
  ];
  const learnerText = [
    ...blueprint.toolRoles
      .map((role) => role.properties.text)
      .filter((text) => typeof text === "string"),
    ...blueprint.instructions
  ];
  const classroomLanguagePredicate =
    blueprint.valuePredicates.find(
      (predicate) =>
        predicate.kind === "language.classroom-korean"
    );
  const textFitPredicate = blueprint.valuePredicates.find(
    (predicate) => predicate.kind === "visual.text-fit"
  );
  const visibleKoreanRoles = blueprint.toolRoles
    .filter(
      (role) =>
        typeof role.properties.text === "string" &&
        /[가-힣]/.test(role.properties.text)
    )
    .map((role) => role.role);
  const classroomCoveredRoles = [
    ...(Array.isArray(
      classroomLanguagePredicate?.parameters.instructionRoles
    )
      ? classroomLanguagePredicate.parameters.instructionRoles
      : []),
    ...(Array.isArray(
      classroomLanguagePredicate?.parameters.labelRoles
    )
      ? classroomLanguagePredicate.parameters.labelRoles
      : []),
    ...(Array.isArray(
      classroomLanguagePredicate?.parameters.promptRoles
    )
      ? classroomLanguagePredicate.parameters.promptRoles
      : [])
  ].filter((role) => typeof role === "string");
  const textFitCoveredRoles = (
    Array.isArray(textFitPredicate?.parameters.roles)
      ? textFitPredicate.parameters.roles
      : []
  ).filter((role) => typeof role === "string");
  if (
    !classroomLanguagePredicate ||
    visibleKoreanRoles.some(
      (role) => !classroomCoveredRoles.includes(role)
    ) ||
    learnerText.some((text) =>
      forbiddenLearnerPhrases.some((phrase) =>
        text.includes(phrase)
      )
    )
  ) {
    failures.push(
      `classroom-language-contract-invalid:${blueprint.id}`
    );
  }
  if (
    !textFitPredicate ||
    visibleKoreanRoles.some(
      (role) => !textFitCoveredRoles.includes(role)
    )
  ) {
    failures.push(`text-fit-contract-missing:${blueprint.id}`);
  }
  if (
    !blueprint.valuePredicates.some(
      (predicate) => predicate.kind === "visual.no-overlap"
    )
  ) {
    failures.push(`no-overlap-contract-missing:${blueprint.id}`);
  }
  const decisionMemberRoles =
    manifest.decision.mode === "select-one"
      ? manifest.decision.candidateRoles
      : manifest.decision.mode === "construct-rule"
        ? manifest.decision.variantRoles
        : manifest.decision.pieceRoles;
  const decisionMembers = decisionMemberRoles.map((role) =>
    roleByName.get(role)
  );
  const isHomogeneousMovablePool =
    decisionMembers.length >= 2 &&
    decisionMembers.every(
      (role) =>
        role?.scope === "each-item" &&
        role.movable &&
        !role.locked
    ) &&
    new Set(decisionMembers.map((role) => role?.toolKey)).size ===
      1;
  if (isHomogeneousMovablePool) {
    const poolPredicate = blueprint.valuePredicates.find(
      (predicate) => {
        if (
          predicate.kind !== "visual.labeled-pool-row" ||
          !Array.isArray(predicate.parameters.memberRoles)
        ) {
          return false;
        }
        const layoutMemberRoles =
          predicate.parameters.memberRoles.filter(
            (role) => typeof role === "string"
          );
        return (
          sameSet(layoutMemberRoles, decisionMemberRoles) ||
          sameSet(
            layoutMemberRoles,
            decisionMemberRoles.map((role) => `${role}-backdrop`)
          )
        );
      }
    );
    const labelRole =
      typeof poolPredicate?.parameters.labelRole === "string"
        ? roleByName.get(poolPredicate.parameters.labelRole)
        : undefined;
    const containerRole =
      typeof poolPredicate?.parameters.containerRole === "string"
        ? roleByName.get(poolPredicate.parameters.containerRole)
        : undefined;
    const containerBlock = containerRole
      ? layoutBlocks.find(
          (block) => block.id === containerRole.layoutRole
        )
      : undefined;
    const itemBands = layoutBlocks.filter(
      (block) =>
        block.kind === "band" && block.repeat === "each-item"
    );
    const primaryWorkPanel = [...itemBands].sort(
      (left, right) => {
        const leftToken = layoutPreset.tokens[left.preset];
        const rightToken = layoutPreset.tokens[right.preset];
        return (
          (rightToken?.width ?? 0) *
            (rightToken?.height ?? 0) -
          (leftToken?.width ?? 0) *
            (leftToken?.height ?? 0)
        );
      }
    )[0];
    const containerIsPrimaryWorkPanel =
      containerBlock?.id === primaryWorkPanel?.id;
    const hasGuardedOuterGap =
      typeof containerBlock?.flowGroup === "string" &&
      primaryWorkPanel?.id !== containerBlock.id &&
      primaryWorkPanel?.flowGroup === containerBlock.flowGroup;
    if (
      !poolPredicate ||
      !labelRole ||
      labelRole.scope !== "each-item" ||
      labelRole.movable ||
      !labelRole.locked ||
      !containerRole ||
      containerRole.scope !== "each-item" ||
      containerRole.movable ||
      !containerRole.locked ||
      !containerBlock
    ) {
      failures.push(
        `labeled-pool-layout-contract-missing:${blueprint.id}`
      );
    }
    if (
      containerBlock &&
      !containerIsPrimaryWorkPanel &&
      !hasGuardedOuterGap
    ) {
      failures.push(
        `labeled-pool-outer-gap-contract-missing:${blueprint.id}`
      );
    }
  }
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
    const pieces = (
      manifest.decision.mode === "construct-rule"
        ? manifest.decision.variantRoles
        : manifest.decision.pieceRoles
    ).map((role) =>
      roleByName.get(role)
    );
    const slotRoleList =
      manifest.decision.mode === "construct-rule"
        ? manifest.decision.ruleSlotRoles
        : manifest.decision.slotRoles;
    const pieceRoleList =
      manifest.decision.mode === "construct-rule"
        ? manifest.decision.variantRoles
        : manifest.decision.pieceRoles;
    const slots = slotRoleList.map((role) =>
      roleByName.get(role)
    );
    itemDecisionConstraints = slotRoleList.map(
      (slotRole) =>
        blueprint.constraints.find(
          (constraint) =>
            constraint.kind === "fill-from-pool" &&
            constraint.target.role === slotRole
        )
    );
    if (
      new Set(pieceRoleList).size < 3 ||
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
            pieceRoleList
            )
      )
    ) {
      failures.push(`G1_DECISION_EXISTS:${blueprint.id}`);
      failures.push(`G4_NO_TRIVIAL_PATH:${blueprint.id}`);
    }

    if (manifest.decision.mode === "construct-rule" &&
        manifest.decision.constructionMode === "student-constructed") {
      const decision = manifest.decision;
      const construction = decision.stateConstruction;
      const application = decision.application;
      const distinctDistractorCount = new Set(
        decision.distractors.map((distractor) =>
          JSON.stringify({
            role: distractor.role ?? null,
            predicateKind: distractor.predicateKind ?? null,
            misconception: distractor.misconception
              .normalize("NFKC")
              .trim()
          })
        )
      ).size;
      const expectedVerificationRoles = [
        ...decision.ruleSlotRoles,
        ...(application?.continuationTargetRoles ?? [])
      ];
      const constructionContractValid =
        decision.answerMode === "conditional-rubric" &&
        construction?.kind ===
          "ordered-distinct-subset-from-pool" &&
        sameSet(construction.sourceRoles, decision.variantRoles) &&
        sameSet(construction.slotRoles, decision.ruleSlotRoles) &&
        construction.slotCount === construction.slotRoles.length &&
        construction.minimumDistinctValues >= 2 &&
        construction.minimumDistinctValues <= construction.slotCount &&
        construction.minimumDistinctValues === decision.ruleSlotRoles.length &&
        construction.minimumDistinctPoolValues >= 3 &&
        construction.minimumCopiesPerDistinctValue >= 3 &&
        construction.sourceUseMode === "move-once-no-clone" &&
        decision.variantRoles.length >=
          construction.minimumDistinctPoolValues *
            construction.minimumCopiesPerDistinctValue &&
        construction.allowsAnyOrderedSelection === true &&
        construction.initialState === "empty" &&
        application?.ruleStatePath === decision.ruleStatePath &&
        application.period === decision.ruleSlotRoles.length &&
        application.minimumTargetCount >= 4 &&
        application.minimumTargetCount ===
          application.continuationTargetRoles.length &&
        application.minimumTargetCount % application.period === 0 &&
        application.requiresVisibleComparison === true &&
        application.requiresSimultaneousRuleAndContinuation === true &&
        application.ruleStateIndexMode === "index-mod-period" &&
        construction.minimumCopiesPerDistinctValue >=
          1 +
            application.continuationTargetRoles.length /
              application.period &&
        application.evidenceMode === "student-state-dependent" &&
        JSON.stringify(manifest.verification.roles) ===
          JSON.stringify(expectedVerificationRoles) &&
        decision.minimumSurplus >= 2 &&
        decision.distractors.length >= 2 &&
        distinctDistractorCount >= 2;
      const continuationRoles = application?.continuationTargetRoles ?? [];
      const continuationConstraints = continuationRoles.map((role) =>
        blueprint.constraints.find(
          (constraint) =>
            constraint.kind === "fill-from-pool" &&
            constraint.target.role === role
        )
      );
      const continuationContractValid = continuationRoles.every(
        (role, index) => {
          const entry = roleByName.get(role);
          const constraint = continuationConstraints[index];
          return (
            entry !== undefined &&
            entry.scope === "each-item" &&
            entry.locked &&
            !entry.movable &&
            entry.toolKey !== "common.text" &&
            !containsConcreteInitialState(entry.properties) &&
            constraint !== undefined &&
            constraint.requiresStudentAction &&
            constraint.target.role === role &&
            sameSet(
              constraint.sources.map((source) => source.role),
              decision.variantRoles
            ) &&
            constraint.parameters?.ruleStatePath ===
              decision.ruleStatePath &&
            constraint.parameters?.ruleStateIndex ===
              index % (application?.period ?? Number.MAX_SAFE_INTEGER)
          );
        }
      );
      const ruleSlotsAreEmpty = slots.every(
        (entry) => entry !== undefined && !containsConcreteInitialState(entry.properties)
      );
      const slotConstraintContractValid = itemDecisionConstraints.every(
        (constraint, index) =>
          constraint !== undefined &&
          constraint.target.role === decision.ruleSlotRoles[index] &&
          constraint.parameters?.ruleStatePath === decision.ruleStatePath
      );
      itemDecisionConstraints.push(...continuationConstraints);
      if (
        !constructionContractValid ||
        !continuationContractValid ||
        !ruleSlotsAreEmpty ||
        !slotConstraintContractValid
      ) {
        failures.push(`G1_DECISION_EXISTS:${blueprint.id}`);
        failures.push(`G7_SELF_VERIFIABLE:${blueprint.id}`);
      }

      const roleBoundValue = (role, item, property) => {
        const binding = role?.bindings?.[property];
        return binding
          ? itemBindingValue(item, binding)
          : role?.properties?.[property];
      };
      const resolvedRoleProperties = (role, item) => ({
        ...(role?.properties ?? {}),
        ...Object.fromEntries(
          Object.entries(role?.bindings ?? {}).map(
            ([property, binding]) => [
              property,
              itemBindingValue(item, binding)
            ]
          )
        )
      });
      let studentConstructedEnvelopeInvalid = false;
      let studentConstructedAnswerVisible = false;
      enumerateRegisteredVariationEnvelope(blueprint.id).forEach(
        (variation, variationIndex) => {
          const items = generateRegisteredBlueprintItems(
            blueprint,
            `cognitive-student-constructed-${blueprint.id}-${variationIndex + 1}`,
            variation
          );
          items.forEach((item) => {
            if (
              !construction ||
              !application ||
              typeof construction.minimumDistinctValues !== "number" ||
              typeof construction.slotCount !== "number"
            ) {
              studentConstructedEnvelopeInvalid = true;
              return;
            }
            const currentState = item.values[decision.ruleStatePath];
            const validStates = orderedStateList(
              item.values[decision.validRuleStatesPath]
            );
            const surplusStates = orderedStateList(
              item.values[decision.surplusPath]
            );
            const sourceValues = decision.variantRoles.map((role) =>
              roleBoundValue(roleByName.get(role), item, decision.variantProperty)
            );
            const validKeys = validStates?.map((state) => JSON.stringify(state));
            const distinctValid =
              validKeys && new Set(validKeys).size === validKeys.length;
            const surplusKeys = surplusStates?.map((state) =>
              JSON.stringify(state)
            );
            const surplusRejectable = surplusStates?.every(
              (state) =>
                canComposeOrderedState(state, sourceValues) &&
                distinctOrderedValueCount(state) <
                  construction.minimumDistinctValues &&
                !validStates?.some((valid) => sameValue(valid, state))
            );
            const canComposeApplicationState = (state) => {
              if (
                typeof application?.period !== "number" ||
                typeof application?.minimumTargetCount !== "number" ||
                state.length !== application.period ||
                application.minimumTargetCount % application.period !== 0
              ) {
                return false;
              }
              return canComposeOrderedState(
                [
                  ...state,
                  ...Array.from(
                    { length: application.minimumTargetCount },
                    (_, index) => state[index % application.period]
                  )
                ],
                sourceValues
              );
            };
            const distinctSourceValues = sourceValues.filter(
              (value, index) =>
                value !== undefined &&
                sourceValues.findIndex((candidate) =>
                  sameValue(candidate, value)
                ) === index
            );
            const sourceCapacityValid =
              sourceValues.length >=
                decision.ruleSlotRoles.length +
                  application.continuationTargetRoles.length &&
              distinctSourceValues.length >=
                construction.minimumDistinctPoolValues &&
              distinctSourceValues.every(
                (value) =>
                  sourceValues.filter((candidate) =>
                    sameValue(candidate, value)
                  ).length >= construction.minimumCopiesPerDistinctValue
              );
            const examplesValid =
              Array.isArray(currentState) &&
              currentState.length === 0 &&
              validStates !== undefined &&
              validStates.length >= decision.minimumValidStates &&
              distinctValid === true &&
              surplusStates !== undefined &&
              surplusStates.length >= decision.minimumSurplus &&
              surplusRejectable === true &&
              surplusKeys !== undefined &&
              new Set(surplusKeys).size === surplusKeys.length &&
              sourceValues.every((value) => value !== undefined) &&
              distinctSourceValues.length >=
                construction.minimumDistinctValues &&
              sourceCapacityValid &&
              validStates.every(
                (state) =>
                  state.length === construction.slotCount &&
                  new Set(state.map((entry) => JSON.stringify(entry))).size >=
                    construction.minimumDistinctValues &&
                  canComposeOrderedState(state, sourceValues) &&
                  canComposeApplicationState(state)
              ) &&
              surplusStates.every(
                (state) =>
                  state.length === construction.slotCount &&
                  distinctOrderedValueCount(state) <
                    construction.minimumDistinctValues &&
                  canComposeOrderedState(state, sourceValues)
              );
            if (!examplesValid) studentConstructedEnvelopeInvalid = true;
            if (
              validStates?.some((state) =>
                blueprint.toolRoles.some((role) =>
                  role.locked &&
                  containsVisibleOrderedRuleState(
                    resolvedRoleProperties(role, item),
                    state
                  )
                )
              )
            ) {
              studentConstructedAnswerVisible = true;
            }
            if (
              validStates?.some((state) =>
                containsVisibleOrderedRuleStateAcrossProperties(
                  continuationRoles.map((role) =>
                    resolvedRoleProperties(roleByName.get(role), item)
                  ),
                  state
                )
              )
            ) {
              studentConstructedAnswerVisible = true;
            }
            if (
              validStates?.some((state) =>
                containsVisibleOrderedRuleStateAcrossProperties(
                  blueprint.toolRoles
                    .filter(
                      (role) =>
                        role.locked &&
                        !decision.variantRoles.includes(role.role)
                    )
                    .map((role) =>
                      resolvedRoleProperties(role, item)
                    ),
                  state
                )
              )
            ) {
              studentConstructedAnswerVisible = true;
            }
          });
        }
      );
      if (studentConstructedEnvelopeInvalid) {
        failures.push(`G2_DISTRACTOR_SURPLUS:${blueprint.id}`);
      }
      if (studentConstructedAnswerVisible) {
        failures.push(`G3_ANSWER_HIDDEN:${blueprint.id}`);
      }
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
            : manifest.decision.mode === "construct-rule"
              ? manifest.decision.variantRoles
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

  const studentConstructedManifest =
    manifest.decision.mode === "construct-rule" &&
    manifest.decision.constructionMode === "student-constructed";
  const answerPath = studentConstructedManifest
    ? undefined
    : manifest.decision.mode === "select-one"
      ? manifest.decision.correctValuePath
      : manifest.decision.mode === "construct-rule"
        ? manifest.decision.ruleStatePath
        : manifest.decision.solutionSetPath;
  const boundAnswer = blueprint.toolRoles.some(
    (role) =>
      answerPath !== undefined &&
      role.locked &&
      Object.values(role.bindings).includes(
        `item.${answerPath}`
      )
  );
  if (boundAnswer) {
    failures.push(`G3_ANSWER_HIDDEN:${blueprint.id}`);
  }
  const decisionRoles = new Set(decisionMemberRoles);
  const resolvedAnswerVisible = studentConstructedManifest
    ? false
    : enumerateRegisteredVariationEnvelope(blueprint.id).some(
        (variation, variationIndex) =>
          generateRegisteredBlueprintItems(
            blueprint,
            `cognitive-answer-${blueprint.id}-${variationIndex + 1}`,
            variation
          ).some((item) => {
            const answer = item.values[answerPath];
            if (answer === undefined) return true;
            return blueprint.toolRoles.some(
              (role) =>
                role.locked &&
                !decisionRoles.has(role.role) &&
                (sameValue(role.properties.text, answer) ||
                  Object.entries(role.bindings).some(
                    ([property, binding]) =>
                      isLearnerTextProperty(property) &&
                      containsVisibleAnswer(
                        itemBindingValue(item, binding),
                        answer
                      )
                  ))
            );
          })
      );
  if (resolvedAnswerVisible) {
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
        predicate.kind === "cognitive.release-contract" ||
        predicate.kind === "cognitive.rule-state-contract"
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
  if (ACTIVITY_SUPPORT[blueprint.id] === "released") {
    const evidencePaths =
      ACTIVITY_RELEASE_EVIDENCE[blueprint.id] ?? [];
    if (evidencePaths.length === 0) {
      failures.push(`release-evidence-missing:${blueprint.id}`);
      continue;
    }
    for (const evidencePath of evidencePaths) {
      let evidence;
      try {
        evidence = JSON.parse(
          await readFile(
          new URL(`../../${evidencePath}`, import.meta.url),
          "utf8"
          )
        );
      } catch {
        failures.push(
          `release-evidence-unreadable:${blueprint.id}:${evidencePath}`
        );
        continue;
      }
      let normalizedEvidence;
      try {
        normalizedEvidence =
          evidence.probeId === "p3-release-canary-v1"
            ? validateP3ReleaseCanaryEvidence(evidence)
            : {
                results: [
                  validateActivityReleaseCanaryEvidence(
                    evidence
                  )
                ]
              };
      } catch {
        failures.push(
          `release-evidence-envelope-invalid:${blueprint.id}:${evidencePath}`
        );
        continue;
      }
      const boundResult = normalizedEvidence.results.find(
        (result) => result.blueprintId === blueprint.id
      );
      if (
        boundResult?.status !== "pass" ||
        boundResult?.blueprintContentHash !==
          blueprint.contentHash ||
        boundResult?.layoutPresetContentHash !==
          sha256Hex(getLayoutPreset(blueprint.layout.tokenSet))
      ) {
        failures.push(
          `release-evidence-stale-or-unbound:${blueprint.id}:${evidencePath}`
        );
      }
    }
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

// 출시 전 활동이 선언한 canary 증거 파일 중 아직 존재하지 않는 것을 보고한다.
// 출시 시점에는 위의 release-evidence-* 검사가 실패로 막으므로 여기서는 남은 일감만 알린다.
const pendingEvidence = [];
for (const blueprint of blueprints) {
  if (ACTIVITY_SUPPORT[blueprint.id] === "released") continue;
  for (const evidencePath of ACTIVITY_RELEASE_EVIDENCE[blueprint.id] ??
    []) {
    try {
      await readFile(
        new URL(`../../${evidencePath}`, import.meta.url),
        "utf8"
      );
    } catch {
      pendingEvidence.push(`${blueprint.id} -> ${evidencePath}`);
    }
  }
}
if (curriculumReviewDebt.length > 0) {
  console.log(
    `  남은 교육과정 원문 검토 ${curriculumReviewDebt.length}건 (출시 차단 조건):\n    ${curriculumReviewDebt.join("\n    ")}`
  );
}
if (pendingEvidence.length > 0) {
  console.log(
    `  아직 없는 출시 canary 증거 ${pendingEvidence.length}건:\n    ${pendingEvidence.join("\n    ")}`
  );
}
