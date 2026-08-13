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
const noFamilyLearningMapUsage = JSON.parse(
  await readFile(
    new URL(
      "../../fixtures/pedagogy/no-family-learning-map.used.json",
      import.meta.url
    ),
    "utf8"
  )
);
const learningMapUsagesBySha256 = new Map(
  [learningMapUsage, noFamilyLearningMapUsage].map((usage) => [
    sha256Hex(usage),
    usage
  ])
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
  const semanticNumericKey = /^(?:variant|value|orderedValues|pattern|color|shape|expression)$/iu;
  const values = [];
  const collect = (value, key) => {
    if (typeof value === "string") {
      values.push(String(value));
    } else if (
      typeof value === "number" &&
      key !== undefined &&
      semanticNumericKey.test(key)
    ) {
      values.push(String(value));
    } else if (Array.isArray(value)) {
      value.forEach((child) => collect(child, key));
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([childKey, child]) =>
        collect(child, childKey)
      );
    }
  };
  Object.entries(properties).forEach(([key, value]) => collect(value, key));
  return containsVisibleOrderedRuleState(values.join(" "), state);
};

const declaredRepairLifecycleContractValid = ({
  decision,
  verificationRoles,
  roleByName,
  constraints
}) => {
  const lifecycle = decision.stateLifecycle;
  const repair = decision.repair;
  const application = decision.application;
  if (!lifecycle || !repair || !application) return false;
  const appliedRuleStatePath = lifecycle.selectionOutputStatePath;
  const repairRoles = [
    ...repair.wrongItemRoles,
    ...repair.repairTargetRoles,
    ...repair.repairBankRoles
  ];
  const allSemanticRoles = [
    ...decision.variantRoles,
    ...decision.ruleSlotRoles,
    ...application.continuationTargetRoles,
    ...repairRoles
  ];
  const roleShapeValid =
    repair.wrongItemRoles.length === 1 &&
    repair.repairTargetRoles.length === 1 &&
    repair.repairBankRoles.length === 1 &&
    repair.wrongItemRoles.every((role) => {
      const entry = roleByName.get(role);
      return (
        entry?.scope === "each-item" && entry.movable && !entry.locked
      );
    }) &&
    [...repair.repairTargetRoles, ...repair.repairBankRoles].every(
      (role) => {
        const entry = roleByName.get(role);
        return (
          entry?.scope === "each-item" &&
          entry.locked &&
          !entry.movable &&
          !containsConcreteInitialState(entry.properties ?? {})
        );
      }
    );
  const selectionValid = decision.ruleSlotRoles.every((role, index) => {
    const constraint = constraints.find(
      (entry) =>
        entry.id === `${decision.decisionConstraintId}-${index + 1}`
    );
    return (
      constraint?.kind === "fill-from-pool" &&
      constraint.requiresStudentAction &&
      constraint.target.role === role &&
      sameSet(
        constraint.sources.map((source) => source.role),
        decision.variantRoles
      ) &&
      constraint.parameters?.phase === lifecycle.selectionPhase &&
      constraint.parameters?.initialRuleStatePath === lifecycle.statePath &&
      constraint.parameters?.writesRuleStatePath === appliedRuleStatePath &&
      constraint.parameters?.ruleStateIndex === index &&
      constraint.parameters?.sourceValueProperty === decision.variantProperty
    );
  });
  const continuationValid = application.continuationTargetRoles.every(
    (role, index) => {
      const target = roleByName.get(role);
      const constraint = constraints.find(
        (entry) =>
          entry.kind === "fill-from-pool" && entry.target.role === role
      );
      return (
        target?.scope === "each-item" &&
        target.locked &&
        !target.movable &&
        target.toolKey !== "common.text" &&
        !containsConcreteInitialState(target.properties ?? {}) &&
        constraint?.requiresStudentAction &&
        sameSet(
          constraint.sources.map((source) => source.role),
          decision.variantRoles
        ) &&
        constraint.parameters?.phase === "apply-declared-rule" &&
        constraint.parameters?.ruleStatePath === appliedRuleStatePath &&
        constraint.parameters?.ruleStateIndex === index % application.period &&
        constraint.parameters?.sourceValueProperty === decision.variantProperty
      );
    }
  );
  const removeConstraint = constraints.find(
    (constraint) => constraint.id === repair.removeConstraintId
  );
  const replacementConstraint = constraints.find(
    (constraint) => constraint.id === repair.replacementConstraintId
  );
  const removeValid =
    removeConstraint?.kind === "place-in" &&
    removeConstraint.requiresStudentAction &&
    sameSet(
      removeConstraint.sources.map((source) => source.role),
      repair.wrongItemRoles
    ) &&
    removeConstraint.target.role === repair.repairBankRoles[0] &&
    removeConstraint.parameters?.phase === "remove-misaligned" &&
    removeConstraint.parameters?.declaredRuleStatePath ===
      appliedRuleStatePath &&
    removeConstraint.parameters?.repairRuleStateIndex ===
      repair.repairRuleStateIndex &&
    removeConstraint.parameters?.wrongItemProperty ===
      repair.wrongItemProperty &&
    removeConstraint.parameters?.beforeStatePath === repair.beforeStatePath &&
    removeConstraint.parameters?.afterStatePath === repair.afterStatePath;
  const replacementValid =
    replacementConstraint?.kind === "fill-from-pool" &&
    replacementConstraint.requiresStudentAction &&
    sameSet(
      replacementConstraint.sources.map((source) => source.role),
      decision.variantRoles
    ) &&
    replacementConstraint.target.role === repair.repairTargetRoles[0] &&
    replacementConstraint.parameters?.phase === "place-replacement" &&
    replacementConstraint.parameters?.declaredRuleStatePath ===
      appliedRuleStatePath &&
    replacementConstraint.parameters?.repairRuleStateIndex ===
      repair.repairRuleStateIndex &&
    replacementConstraint.parameters?.sourceValueProperty ===
      decision.variantProperty &&
    replacementConstraint.parameters?.wrongItemProperty ===
      repair.wrongItemProperty &&
    replacementConstraint.parameters?.beforeStatePath ===
      repair.beforeStatePath &&
    replacementConstraint.parameters?.afterStatePath === repair.afterStatePath &&
    replacementConstraint.parameters?.validAfterStateExamplesPath ===
      repair.validAfterStateExamplesPath &&
    replacementConstraint.parameters?.writesStatePath ===
      repair.afterStatePath &&
    replacementConstraint.parameters?.conditionalMappingPath ===
      repair.validAfterStateExamplesPath;
  return (
    lifecycle.kind === "empty-selection-then-declared-repair" &&
    lifecycle.statePath === decision.ruleStatePath &&
    lifecycle.selectionPhase === "rule-selection" &&
    appliedRuleStatePath !== decision.ruleStatePath &&
    lifecycle.writesDeclaredState === true &&
    sameValue(lifecycle.phaseOrder, [
      "rule-selection",
      "remove-misaligned",
      "place-replacement"
    ]) &&
    lifecycle.initialState === "empty" &&
    lifecycle.declaredStateCardinality === decision.ruleSlotRoles.length &&
    lifecycle.declaredStateExamplesPath === decision.validRuleStatesPath &&
    lifecycle.selectionConstraintIdPrefix === decision.decisionConstraintId &&
    lifecycle.requiresIndexedSelectionWrites === true &&
    lifecycle.repairRequiresDeclaredState === true &&
    application.ruleStatePath === appliedRuleStatePath &&
    repair.declaredRuleStatePath === appliedRuleStatePath &&
    repair.afterStateDerivation?.kind ===
      "replace-at-declared-rule-index" &&
    repair.afterStateDerivation.declaredRuleStatePath ===
      appliedRuleStatePath &&
    repair.afterStateDerivation.repairRuleStateIndex ===
      repair.repairRuleStateIndex &&
    repair.afterStateDerivation.requiresConditionalMapping === true &&
    repair.wrongItemProperty === decision.variantProperty &&
    repair.repairRuleStateIndex >= 0 &&
    repair.repairRuleStateIndex < decision.ruleSlotRoles.length &&
    repair.beforeStatePath !== repair.afterStatePath &&
    repair.beforeStatePath !== repair.validAfterStateExamplesPath &&
    repair.afterStatePath !== repair.validAfterStateExamplesPath &&
    new Set(allSemanticRoles).size === allSemanticRoles.length &&
    roleShapeValid &&
    selectionValid &&
    continuationValid &&
    removeValid &&
    replacementValid &&
    sameValue(verificationRoles, [
      ...decision.ruleSlotRoles,
      ...application.continuationTargetRoles,
      ...repairRoles
    ])
  );
};

const declaredRepairItemEnvelopeValid = ({
  decision,
  item,
  sourceValues,
  wrongValue
}) => {
  const lifecycle = decision.stateLifecycle;
  const repair = decision.repair;
  if (!lifecycle || !repair || wrongValue === undefined) return false;
  const validStates = orderedStateList(
    item.values[decision.validRuleStatesPath]
  );
  const rawMappings = item.values[repair.validAfterStateExamplesPath];
  if (!validStates || !Array.isArray(rawMappings)) return false;
  const distinctSourceValues = sourceValues.filter(
    (value, index) =>
      value !== undefined &&
      sourceValues.findIndex((candidate) => sameValue(candidate, value)) ===
        index
  );
  const expectedStates = distinctSourceValues.flatMap((left) =>
    distinctSourceValues
      .filter((right) => !sameValue(left, right))
      .map((right) => [left, right])
  );
  const validStateKeys = validStates.map((state) => JSON.stringify(state));
  const mappingKeys = rawMappings.map((entry) =>
    JSON.stringify(entry?.declaredRuleState)
  );
  const mappingValid =
    rawMappings.length === validStates.length &&
    new Set(mappingKeys).size === rawMappings.length &&
    validStates.every((validState) => {
      const matches = rawMappings.filter((entry) =>
        sameValue(entry?.declaredRuleState, validState)
      );
      if (matches.length !== 1) return false;
      const entry = matches[0];
      if (
        !Array.isArray(entry.beforeState) ||
        !Array.isArray(entry.afterState) ||
        entry.beforeState.length !== validState.length ||
        entry.afterState.length !== validState.length
      ) {
        return false;
      }
      return validState.every((value, index) =>
        index === repair.repairRuleStateIndex
          ? sameValue(entry.beforeState[index], wrongValue) &&
            !sameValue(entry.beforeState[index], value) &&
            sameValue(entry.afterState[index], value)
          : sameValue(entry.beforeState[index], value) &&
            sameValue(entry.afterState[index], value)
      );
    });
  return (
    Array.isArray(item.values[lifecycle.statePath]) &&
    item.values[lifecycle.statePath].length === 0 &&
    Array.isArray(item.values[lifecycle.selectionOutputStatePath]) &&
    item.values[lifecycle.selectionOutputStatePath].length === 0 &&
    Array.isArray(item.values[repair.beforeStatePath]) &&
    item.values[repair.beforeStatePath].length === 0 &&
    Array.isArray(item.values[repair.afterStatePath]) &&
    item.values[repair.afterStatePath].length === 0 &&
    validStates.length === expectedStates.length &&
    new Set(validStateKeys).size === validStates.length &&
    expectedStates.every((state) =>
      validStates.some((candidate) => sameValue(candidate, state))
    ) &&
    distinctSourceValues.every((value) => !sameValue(value, wrongValue)) &&
    mappingValid
  );
};

const declaredRepairAuditSelfCheck = () => {
  const semanticValues = [2, 3, 5];
  const variants = Array.from({ length: 12 }, (_, index) => ({
    role: `rule-variant-${index + 1}`,
    scope: "each-item",
    movable: true,
    locked: false,
    toolKey: "SM02PB",
    properties: { orderedValues: semanticValues[Math.floor(index / 4)] }
  }));
  const fixedRole = (role) => ({
    role,
    scope: "each-item",
    movable: false,
    locked: true,
    toolKey: "SM02PB",
    properties: {}
  });
  const decision = {
    mode: "construct-rule",
    constructionMode: "student-constructed",
    answerMode: "conditional-rubric",
    ruleStatePath: "studentRuleState",
    decisionConstraintId: "construct-rule-slot",
    variantRoles: variants.map((entry) => entry.role),
    ruleSlotRoles: ["rule-slot-1", "rule-slot-2"],
    variantProperty: "orderedValues",
    validRuleStatesPath: "validRuleStateExamples",
    surplusPath: "surplusRuleStateExamples",
    minimumValidStates: 2,
    minimumSurplus: 2,
    stateConstruction: {
      kind: "ordered-distinct-subset-from-pool",
      sourceRoles: variants.map((entry) => entry.role),
      slotRoles: ["rule-slot-1", "rule-slot-2"],
      slotCount: 2,
      minimumDistinctValues: 2,
      minimumDistinctPoolValues: 3,
      minimumCopiesPerDistinctValue: 4,
      sourceUseMode: "move-once-no-clone",
      allowsAnyOrderedSelection: true,
      initialState: "empty"
    },
    application: {
      ruleStatePath: "declaredRuleState",
      continuationTargetRoles: Array.from(
        { length: 4 },
        (_, index) => `continuation-slot-${index + 1}`
      ),
      period: 2,
      minimumTargetCount: 4,
      requiresVisibleComparison: true,
      requiresSimultaneousRuleAndContinuation: true,
      ruleStateIndexMode: "index-mod-period",
      evidenceMode: "student-state-dependent"
    },
    repair: {
      kind: "declared-rule-independent-misplacement",
      declaredRuleStatePath: "declaredRuleState",
      repairRuleStateIndex: 1,
      wrongItemProperty: "orderedValues",
      wrongItemRoles: ["misaligned-item"],
      repairTargetRoles: ["repair-target"],
      repairBankRoles: ["repair-bank"],
      beforeStatePath: "initialArrangementState",
      afterStatePath: "repairedArrangementState",
      validAfterStateExamplesPath:
        "validRepairedArrangementStatesByDeclaredRuleState",
      afterStateDerivation: {
        kind: "replace-at-declared-rule-index",
        declaredRuleStatePath: "declaredRuleState",
        repairRuleStateIndex: 1,
        requiresConditionalMapping: true
      },
      removeConstraintId: "remove-misaligned-item",
      replacementConstraintId: "repair-misaligned-item",
      requiresIndependentWrongState: true,
      requiresBeforeAfterComparison: true,
      evidenceMode: "student-state-dependent"
    },
    stateLifecycle: {
      kind: "empty-selection-then-declared-repair",
      statePath: "studentRuleState",
      selectionPhase: "rule-selection",
      selectionOutputStatePath: "declaredRuleState",
      writesDeclaredState: true,
      phaseOrder: [
        "rule-selection",
        "remove-misaligned",
        "place-replacement"
      ],
      initialState: "empty",
      declaredStateCardinality: 2,
      declaredStateExamplesPath: "validRuleStateExamples",
      selectionConstraintIdPrefix: "construct-rule-slot",
      requiresIndexedSelectionWrites: true,
      repairRequiresDeclaredState: true
    }
  };
  const sourceRefs = variants.map((entry) => ({ role: entry.role }));
  const constraints = [
    ...decision.ruleSlotRoles.map((role, index) => ({
      id: `construct-rule-slot-${index + 1}`,
      kind: "fill-from-pool",
      sources: sourceRefs,
      target: { role },
      requiresStudentAction: true,
      parameters: {
        phase: "rule-selection",
        initialRuleStatePath: "studentRuleState",
        writesRuleStatePath: "declaredRuleState",
        ruleStateIndex: index,
        sourceValueProperty: "orderedValues"
      }
    })),
    ...decision.application.continuationTargetRoles.map((role, index) => ({
      id: `apply-rule-slot-${index + 1}`,
      kind: "fill-from-pool",
      sources: sourceRefs,
      target: { role },
      requiresStudentAction: true,
      parameters: {
        phase: "apply-declared-rule",
        ruleStatePath: "declaredRuleState",
        ruleStateIndex: index % 2,
        sourceValueProperty: "orderedValues"
      }
    })),
    {
      id: "remove-misaligned-item",
      kind: "place-in",
      sources: [{ role: "misaligned-item" }],
      target: { role: "repair-bank" },
      requiresStudentAction: true,
      parameters: {
        phase: "remove-misaligned",
        declaredRuleStatePath: "declaredRuleState",
        repairRuleStateIndex: 1,
        wrongItemProperty: "orderedValues",
        beforeStatePath: "initialArrangementState",
        afterStatePath: "repairedArrangementState"
      }
    },
    {
      id: "repair-misaligned-item",
      kind: "fill-from-pool",
      sources: sourceRefs,
      target: { role: "repair-target" },
      requiresStudentAction: true,
      parameters: {
        phase: "place-replacement",
        declaredRuleStatePath: "declaredRuleState",
        repairRuleStateIndex: 1,
        sourceValueProperty: "orderedValues",
        wrongItemProperty: "orderedValues",
        beforeStatePath: "initialArrangementState",
        afterStatePath: "repairedArrangementState",
        validAfterStateExamplesPath:
          "validRepairedArrangementStatesByDeclaredRuleState",
        writesStatePath: "repairedArrangementState",
        conditionalMappingPath:
          "validRepairedArrangementStatesByDeclaredRuleState"
      }
    }
  ];
  const roles = [
    ...variants,
    ...decision.ruleSlotRoles.map(fixedRole),
    ...decision.application.continuationTargetRoles.map(fixedRole),
    {
      role: "misaligned-item",
      scope: "each-item",
      movable: true,
      locked: false,
      toolKey: "SM02PB",
      properties: { orderedValues: 6 }
    },
    fixedRole("repair-target"),
    fixedRole("repair-bank")
  ];
  const validStates = semanticValues.flatMap((left) =>
    semanticValues
      .filter((right) => right !== left)
      .map((right) => [left, right])
  );
  const item = {
    values: {
      studentRuleState: [],
      declaredRuleState: [],
      validRuleStateExamples: validStates,
      surplusRuleStateExamples: [[2, 2], [3, 3], [5, 5]],
      initialArrangementState: [],
      repairedArrangementState: [],
      validRepairedArrangementStatesByDeclaredRuleState: validStates.map(
        (state) => ({
          declaredRuleState: state,
          beforeState: [state[0], 6],
          afterState: [...state]
        })
      )
    }
  };
  const verificationRoles = [
    ...decision.ruleSlotRoles,
    ...decision.application.continuationTargetRoles,
    ...decision.repair.wrongItemRoles,
    ...decision.repair.repairTargetRoles,
    ...decision.repair.repairBankRoles
  ];
  const contractInput = {
    decision,
    verificationRoles,
    roleByName: new Map(roles.map((role) => [role.role, role])),
    constraints
  };
  if (
    !declaredRepairLifecycleContractValid(contractInput) ||
    !declaredRepairItemEnvelopeValid({
      decision,
      item,
      sourceValues: variants.map((entry) => entry.properties.orderedValues),
      wrongValue: 6
    })
  ) {
    failures.push("declared-repair-audit-self-check-positive");
  }
  const structuralMutations = [
    (input) => {
      input.constraints[0].parameters.phase = "place-replacement";
    },
    (input) => {
      input.constraints[0].parameters.writesRuleStatePath =
        "studentRuleState";
    },
    (input) => {
      input.constraints[1].parameters.ruleStateIndex = 0;
    },
    (input) => {
      input.constraints[2].parameters.ruleStatePath = "studentRuleState";
    },
    (input) => {
      input.constraints.at(-1).parameters.conditionalMappingPath =
        "validRuleStateExamples";
    }
  ];
  structuralMutations.forEach((mutate, index) => {
    const copy = structuredClone({ decision, verificationRoles, constraints });
    mutate(copy);
    if (
      declaredRepairLifecycleContractValid({
        ...copy,
        roleByName: contractInput.roleByName
      })
    ) {
      failures.push(`declared-repair-audit-self-check-structural-${index + 1}`);
    }
  });
  const envelopeMutations = [
    (copy) => {
      copy.values.declaredRuleState = [2, 3];
    },
    (copy) => {
      copy.values.validRepairedArrangementStatesByDeclaredRuleState.pop();
    },
    (copy) => {
      copy.values.validRepairedArrangementStatesByDeclaredRuleState[0].beforeState =
        [5, 6];
    },
    (copy) => {
      copy.values.validRepairedArrangementStatesByDeclaredRuleState[0].afterState =
        [2, 5];
    }
  ];
  envelopeMutations.forEach((mutate, index) => {
    const copy = structuredClone(item);
    mutate(copy);
    if (
      declaredRepairItemEnvelopeValid({
        decision,
        item: copy,
        sourceValues: variants.map((entry) => entry.properties.orderedValues),
        wrongValue: 6
      })
    ) {
      failures.push(`declared-repair-audit-self-check-envelope-${index + 1}`);
    }
  });
};

const changeRuleAuditSelfCheck = () => {
  const states = [1, 4].flatMap((startValue) =>
    [2, 3].flatMap((stepMagnitude) =>
      ["increase", "decrease"].map((direction) => ({
        startValue,
        stepMagnitude,
        direction
      }))
    )
  );
  const sequenceFor = (state) => {
    const step = state.direction === "increase"
      ? state.stepMagnitude
      : -state.stepMagnitude;
    return Array.from({ length: 4 }, (_, index) =>
      state.startValue + step * index
    );
  };
  const item = {
    values: {
      studentChangeRuleState: [],
      constructedSequenceState: [],
      initialChangeSequenceState: [],
      repairedChangeSequenceState: [],
      validChangeRuleStates: states,
      validRepairedChangeStatesByRuleState: states.map((ruleState) => {
        const expected = sequenceFor(ruleState);
        const before = [...expected];
        before[2] = 999;
        return { ruleState, beforeState: before, afterState: expected, wrongIndex: 2 };
      })
    }
  };
  const mappingIsBijection = (value) => {
    if (!Array.isArray(value) || value.length !== states.length) return false;
    const keys = value.map((entry) => JSON.stringify(entry.ruleState));
    if (new Set(keys).size !== states.length) return false;
    return states.every((ruleState) => {
      const entry = value.find(
        (candidate) => JSON.stringify(candidate.ruleState) === JSON.stringify(ruleState)
      );
      const expected = sequenceFor(ruleState);
      return (
        entry &&
        Array.isArray(entry.beforeState) &&
        Array.isArray(entry.afterState) &&
        entry.beforeState.length === expected.length &&
        entry.afterState.length === expected.length &&
        entry.beforeState[2] !== expected[2] &&
        entry.afterState[2] === expected[2] &&
        entry.afterState.every((value, index) =>
          index === 2 ? value === expected[index] : value === entry.beforeState[index]
        )
      );
    });
  };
  const valid =
    Array.isArray(item.values.studentChangeRuleState) &&
    item.values.studentChangeRuleState.length === 0 &&
    states.length === 8 &&
    new Set(states.map((state) => state.startValue)).size >= 2 &&
    new Set(states.map((state) => state.stepMagnitude)).size >= 2 &&
    states.some((state) => state.direction === "increase") &&
    states.some((state) => state.direction === "decrease") &&
    mappingIsBijection(item.values.validRepairedChangeStatesByRuleState);
  if (!valid) failures.push("change-rule-audit-self-check-positive");

  const wrong = structuredClone(item);
  wrong.values.validRepairedChangeStatesByRuleState[0].afterState[0] += 1;
  if (mappingIsBijection(wrong.values.validRepairedChangeStatesByRuleState)) {
    failures.push("change-rule-audit-self-check-mapping-mutation");
  }
  const prefilled = structuredClone(item);
  prefilled.values.studentChangeRuleState = [states[0]];
  if (prefilled.values.studentChangeRuleState.length === 0) {
    failures.push("change-rule-audit-self-check-prefilled-state");
  }
};

declaredRepairAuditSelfCheck();
changeRuleAuditSelfCheck();

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

  const manifestLearningMapUsage = learningMapUsagesBySha256.get(
    manifest.learningMap.usageSnapshotSha256
  );
  const manifestLearningMapTopicIds = new Set(
    manifestLearningMapUsage?.topics.map((topic) => topic.id) ?? []
  );
  if (
    manifest.learningMap.commit !== LEARNING_MAP_COMMIT ||
    manifestLearningMapUsage?.commit !== LEARNING_MAP_COMMIT ||
    manifest.learningMap.topicIds.some(
      (topicId) => !manifestLearningMapTopicIds.has(topicId)
    ) ||
    manifest.learningMap.prerequisiteTopicIds.some(
      (topicId) => !manifestLearningMapTopicIds.has(topicId)
    )
  ) {
    failures.push(
      `learning-map-provenance-invalid:${blueprint.id}`
    );
  }
  const sourceTopics = (manifestLearningMapUsage?.topics ?? []).filter((topic) =>
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
        : manifest.decision.mode === "construct-change-rule"
          ? [
              "start-value-control",
              "step-magnitude-control",
              "direction-control"
            ]
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
  } else if (manifest.decision.mode === "construct-change-rule") {
    const decision = manifest.decision;
    const controlRoles = [
      "start-value-control",
      "step-magnitude-control",
      "direction-control"
    ];
    const sequenceRoles = [
      "sequence-term-1",
      "sequence-term-2",
      "sequence-term-3",
      "sequence-term-4"
    ];
    const allRequiredRoles = [
      ...controlRoles,
      ...sequenceRoles,
      "repair-target"
    ];
    const controls = controlRoles.map((role) => roleByName.get(role));
    const sequenceTerms = sequenceRoles.map((role) => roleByName.get(role));
    const repairTarget = roleByName.get("repair-target");
    const controlConstraints = controlRoles.map((role) =>
      blueprint.constraints.find(
        (constraint) =>
          constraint.kind === "fill-from-pool" &&
          constraint.target.role === role
      )
    );
    const sequenceConstraints = sequenceRoles.map((role) =>
      blueprint.constraints.find(
        (constraint) =>
          constraint.kind === "fill-from-pool" &&
          constraint.target.role === role
      )
    );
    const repairConstraint = blueprint.constraints.find(
      (constraint) =>
        constraint.kind === "fill-from-pool" &&
        constraint.target.role === "repair-target"
    );
    itemDecisionConstraints.push(
      ...controlConstraints,
      ...sequenceConstraints,
      repairConstraint
    );
    const roleShapeValid =
      controls.every(
        (role) =>
          role?.scope === "each-item" &&
          role.locked &&
          !role.movable
      ) &&
      sequenceTerms.every(
        (role) =>
          role?.scope === "each-item" &&
          role.locked &&
          !role.movable
      ) &&
      repairTarget?.scope === "each-item" &&
      repairTarget.locked &&
      !repairTarget.movable;
    const sourceRoles = [
      ...new Set(
        controlConstraints.flatMap((constraint) =>
          constraint?.sources.map((source) => source.role) ?? []
        )
      )
    ].map((role) => roleByName.get(role));
    const sourcePoolValid =
      sourceRoles.length >= 3 &&
      sourceRoles.every(
        (role) =>
          role?.scope === "each-item" &&
          role.movable &&
          !role.locked &&
          role.toolKey === "SM02PB" &&
          (role.bindings.variant !== undefined ||
            role.bindings.orderedValues !== undefined)
      );
    const sourceRoleSet = sourceRoles.map((role) => role?.role);
    const everyConstraintUsesSameSourcePool = [
      ...sequenceConstraints,
      repairConstraint
    ].every(
      (constraint) =>
        constraint !== undefined &&
        sameSet(
          constraint.sources.map((source) => source.role),
          sourceRoleSet
        )
    );
    const constraintShapeValid =
      controlConstraints.every(
        (constraint, index) =>
          constraint?.requiresStudentAction === true &&
          constraint.target.role === controlRoles[index] &&
          constraint.parameters?.phase === "rule-selection" &&
          constraint.parameters?.writesStatePath === decision.ruleStatePath &&
          constraint.parameters?.stateField === decision.stateFields[index] &&
          constraint.parameters?.stateIndex === index
      ) &&
      sequenceConstraints.every(
        (constraint, index) =>
          constraint?.requiresStudentAction === true &&
          constraint.target.role === sequenceRoles[index] &&
          constraint.parameters?.phase === "apply-declared-change" &&
          constraint.parameters?.ruleStatePath === decision.ruleStatePath &&
          constraint.parameters?.sequenceStatePath ===
            decision.application.sequenceStatePath &&
          constraint.parameters?.sequenceIndex === index &&
          constraint.parameters?.transition === decision.application.transition
      ) &&
      repairConstraint?.requiresStudentAction === true &&
      repairConstraint.target.role === "repair-target" &&
      repairConstraint.parameters?.phase === "repair-declared-change" &&
      repairConstraint.parameters?.ruleStatePath === decision.ruleStatePath &&
      repairConstraint.parameters?.beforeStatePath ===
        decision.repair.beforeStatePath &&
      repairConstraint.parameters?.afterStatePath ===
        decision.repair.afterStatePath &&
      repairConstraint.parameters?.wrongIndexPath ===
        decision.repair.wrongIndexPath &&
      repairConstraint.parameters?.mappingPath ===
        "validRepairedChangeStatesByRuleState";
    const distinctMisconceptions = new Set(
      decision.distractors.map((entry) =>
        entry.misconception.normalize("NFKC").trim()
      )
    ).size;
    if (
      !roleShapeValid ||
      !sourcePoolValid ||
      !everyConstraintUsesSameSourcePool ||
      !constraintShapeValid ||
      distinctMisconceptions !== decision.distractors.length ||
      JSON.stringify(manifest.verification.roles) !==
        JSON.stringify(allRequiredRoles)
    ) {
      failures.push(`G1_DECISION_EXISTS:${blueprint.id}`);
      failures.push(`G7_SELF_VERIFIABLE:${blueprint.id}`);
    }
    let changeEnvelopeInvalid = false;
    let changeAnswerVisible = false;
    enumerateRegisteredVariationEnvelope(blueprint.id).forEach(
      (variation, variationIndex) => {
        const items = generateRegisteredBlueprintItems(
          blueprint,
          `cognitive-change-rule-${blueprint.id}-${variationIndex + 1}`,
          variation
        );
        items.forEach((item) => {
          const state = item.values[decision.ruleStatePath];
          const validStates = Array.isArray(item.values.validChangeRuleStates)
            ? item.values.validChangeRuleStates
            : undefined;
          const mappings = Array.isArray(
            item.values.validRepairedChangeStatesByRuleState
          )
            ? item.values.validRepairedChangeStatesByRuleState
            : undefined;
          const validStateKeys = validStates?.map((entry) =>
            JSON.stringify([
              entry?.startValue,
              entry?.stepMagnitude,
              entry?.direction
            ])
          );
          const mappingKeys = mappings?.map((entry) =>
            JSON.stringify([
              entry?.ruleState?.startValue,
              entry?.ruleState?.stepMagnitude,
              entry?.ruleState?.direction
            ])
          );
          const declaredWrongIndex = item.values[decision.repair.wrongIndexPath];
          const mappingValid =
            validStates !== undefined &&
            mappings !== undefined &&
            validStates.length >= 4 &&
            mappings.length === validStates.length &&
            new Set(validStateKeys).size === validStates.length &&
            new Set(mappingKeys).size === mappings.length &&
            validStates.every((rule) => {
              const signed =
                rule.direction === "increase"
                  ? rule.stepMagnitude
                  : -rule.stepMagnitude;
              const expected = Array.from(
                { length: decision.application.minimumVisibleTerms },
                (_, index) => rule.startValue + signed * index
              );
              const key = JSON.stringify([
                rule.startValue,
                rule.stepMagnitude,
                rule.direction
              ]);
              const mapping = mappings.find(
                (entry) =>
                  JSON.stringify([
                    entry?.ruleState?.startValue,
                    entry?.ruleState?.stepMagnitude,
                    entry?.ruleState?.direction
                  ]) === key
              );
              const before = mapping?.beforeState;
              const after = mapping?.afterState;
              const wrongIndex = mapping?.wrongIndex;
              return (
                Array.isArray(before) &&
                Array.isArray(after) &&
                before.length === expected.length &&
                after.length === expected.length &&
                Number.isInteger(wrongIndex) &&
                Number.isInteger(declaredWrongIndex) &&
                wrongIndex === declaredWrongIndex &&
                wrongIndex >= 0 &&
                wrongIndex < expected.length &&
                before.every((value, index) =>
                  index === wrongIndex
                    ? value !== expected[index]
                    : value === expected[index]
                ) &&
                after.every((value, index) => value === expected[index])
              );
            });
          if (
            !Array.isArray(state) ||
            state.length !== 0 ||
            !validStates ||
            validStates.length < 4 ||
            new Set(validStates.map((entry) => entry.startValue)).size < 2 ||
            new Set(validStates.map((entry) => entry.stepMagnitude)).size < 2 ||
            !validStates.some((entry) => entry.direction === "increase") ||
            !validStates.some((entry) => entry.direction === "decrease") ||
            !mappingValid ||
            item.values[decision.application.sequenceStatePath]?.length !== 0 ||
            item.values[decision.repair.beforeStatePath]?.length !== 0 ||
            item.values[decision.repair.afterStatePath]?.length !== 0 ||
            !Number.isInteger(declaredWrongIndex) ||
            declaredWrongIndex < 0 ||
            declaredWrongIndex >= decision.application.minimumVisibleTerms
          ) {
            changeEnvelopeInvalid = true;
          }
          if (
            validStates?.some((rule) =>
              blueprint.toolRoles.some(
                (role) =>
                  role.locked &&
                  !allRequiredRoles.includes(role.role) &&
                  (containsVisibleAnswer(role.properties, rule.startValue) ||
                    containsVisibleAnswer(role.properties, rule.stepMagnitude) ||
                    containsVisibleAnswer(role.properties, rule.direction))
              )
            )
          ) {
            changeAnswerVisible = true;
          }
        });
      }
    );
    if (changeEnvelopeInvalid) {
      failures.push(`G2_DISTRACTOR_SURPLUS:${blueprint.id}`);
    }
    if (changeAnswerVisible) {
      failures.push(`G3_ANSWER_HIDDEN:${blueprint.id}`);
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
      const appliedRuleStatePath =
        decision.stateLifecycle?.selectionOutputStatePath ??
        decision.ruleStatePath;
      const distinctDistractorCount = new Set(
        decision.distractors.map((distractor) =>
          distractor.misconception.normalize("NFKC").trim()
        )
      ).size;
      const expectedVerificationRoles = [
        ...decision.ruleSlotRoles,
        ...(application?.continuationTargetRoles ?? []),
        ...(decision.repair
          ? [
              ...decision.repair.wrongItemRoles,
              ...decision.repair.repairTargetRoles,
              ...decision.repair.repairBankRoles
            ]
          : [])
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
        application?.ruleStatePath === appliedRuleStatePath &&
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
              application.period +
            (decision.repair?.repairTargetRoles.length ?? 0) &&
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
              appliedRuleStatePath &&
            constraint.parameters?.ruleStateIndex ===
              index % (application?.period ?? Number.MAX_SAFE_INTEGER) &&
            (!decision.repair ||
              (constraint.parameters?.phase === "apply-declared-rule" &&
                constraint.parameters?.sourceValueProperty ===
                  decision.variantProperty))
          );
        }
      );
      const ruleSlotsAreEmpty = slots.every(
        (entry) => entry !== undefined && !containsConcreteInitialState(entry.properties)
      );
      const slotConstraintContractValid = itemDecisionConstraints.every(
        (constraint, index) => {
          if (
            constraint === undefined ||
            constraint.target.role !== decision.ruleSlotRoles[index]
          ) {
            return false;
          }
          return decision.repair
            ? constraint.parameters?.phase ===
                decision.stateLifecycle?.selectionPhase &&
                constraint.parameters?.initialRuleStatePath ===
                  decision.ruleStatePath &&
                constraint.parameters?.writesRuleStatePath ===
                  appliedRuleStatePath &&
                constraint.parameters?.ruleStateIndex === index &&
                constraint.parameters?.sourceValueProperty ===
                  decision.variantProperty
            : constraint.parameters?.ruleStatePath ===
                decision.ruleStatePath;
        }
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

      if (
        decision.repair &&
        !declaredRepairLifecycleContractValid({
          decision,
          verificationRoles: manifest.verification.roles,
          roleByName,
          constraints: blueprint.constraints
        })
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
            if (decision.repair) {
              const wrongRole = roleByName.get(
                decision.repair.wrongItemRoles[0]
              );
              const wrongValue = roleBoundValue(
                wrongRole,
                item,
                decision.repair.wrongItemProperty
              );
              if (
                !declaredRepairItemEnvelopeValid({
                  decision,
                  item,
                  sourceValues,
                  wrongValue
                })
              ) {
                studentConstructedEnvelopeInvalid = true;
              }
            }
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
                  application.continuationTargetRoles.length +
                  (decision.repair?.repairTargetRoles.length ?? 0) &&
              distinctSourceValues.length >=
                construction.minimumDistinctPoolValues &&
              distinctSourceValues.every(
                (value) =>
                  sourceValues.filter((candidate) =>
                    sameValue(candidate, value)
                  ).length >= construction.minimumCopiesPerDistinctValue &&
                  construction.minimumCopiesPerDistinctValue >=
                    1 +
                      application.continuationTargetRoles.length /
                        application.period +
                      (decision.repair?.repairTargetRoles.length ?? 0)
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
              : manifest.decision.mode === "construct-change-rule"
                ? [
                    "start-value-control",
                    "step-magnitude-control",
                    "direction-control"
                  ]
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
    (manifest.decision.mode === "construct-rule" ||
      manifest.decision.mode === "construct-change-rule") &&
    manifest.decision.constructionMode === "student-constructed";
  const answerPath = studentConstructedManifest
    ? undefined
    : manifest.decision.mode === "select-one"
      ? manifest.decision.correctValuePath
      : manifest.decision.mode === "construct-rule"
        ? manifest.decision.ruleStatePath
        : manifest.decision.mode === "construct-change-rule"
          ? undefined
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
        predicate.kind === "cognitive.rule-state-contract" ||
        predicate.kind === "cognitive.change-rule-state-contract"
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
