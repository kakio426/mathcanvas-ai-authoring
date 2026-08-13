import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

const readJson = async (path) =>
  JSON.parse(await readFile(resolve(root, path), "utf8"));

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)])
  );
};

const sha256 = (value) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");

const slugStandard = (standardCode) =>
  standardCode
    .slice(1, -1)
    .replace("수", "su")
    .toLowerCase();

const rendererFor = (engineClassId) => {
  if (["R02", "R05"].includes(engineClassId)) return "place-value";
  if (["R07", "R24"].includes(engineClassId)) return "fraction";
  if (["R08", "R21"].includes(engineClassId)) return "pattern";
  if (["R09", "R22", "R23"].includes(engineClassId)) return "table-graph";
  if (["R11", "R12", "R13", "R14", "R15", "R16", "R18", "R20"].includes(engineClassId)) {
    return "geometry";
  }
  if (engineClassId === "R17") return "clock";
  if (["R01", "R03", "R04", "R06", "R19"].includes(engineClassId)) return "number-card";
  return "relation-board";
};

const draft = await readJson(
  "scripts/curriculum/no-family-target-outlines.sol-draft.json"
);
const plan = await readJson(
  "reports/curriculum-execution/no-family-plan.json"
);
const learningMap = await readJson(
  "fixtures/pedagogy/no-family-learning-map.used.json"
);

const workItemByStandard = new Map(
  plan.workItems.map((workItem) => [workItem.standardCode, workItem])
);
const topicById = new Map(
  learningMap.topics.map((topic) => [topic.id, topic])
);
const records = draft.records.map((record) => {
  const workItem = workItemByStandard.get(record.standardCode);
  if (!workItem) {
    throw new Error(`portfolio-work-item-missing:${record.standardCode}`);
  }
  const standardSlug = slugStandard(record.standardCode);
  const topicPrefix = learningMap.topics.find((topic) =>
    topic.id.includes(`.${standardSlug.replace(/^([246])su/, "g$1-").replace("-", ".s")}.`)
  )?.id.replace(/\.(?:concept|representation|application)$/u, "");
  const applicationTopic = topicPrefix
    ? topicById.get(`${topicPrefix}.application`)
    : learningMap.topics.find(
        (topic) =>
          topic.titleKorean.startsWith(`${record.standardCode} `) &&
          topic.id.endsWith(".application")
      );
  const representationTopic = topicPrefix
    ? topicById.get(`${topicPrefix}.representation`)
    : learningMap.topics.find(
        (topic) =>
          topic.titleKorean.startsWith(`${record.standardCode} `) &&
          topic.id.endsWith(".representation")
      );
  if (!applicationTopic || !representationTopic) {
    throw new Error(`portfolio-learning-map-missing:${record.standardCode}`);
  }
  const engineClassIds = workItem.engineClassIds;
  if (!Array.isArray(engineClassIds) || engineClassIds.length < 1) {
    throw new Error(`portfolio-engine-class-missing:${record.standardCode}`);
  }
  return {
    sequence: workItem.sequence,
    workItemId: workItem.workItemId,
    standardCode: record.standardCode,
    standardSlug,
    officialGoal: record.officialGoal,
    gradeBand: workItem.gradeBand,
    domain: workItem.domain,
    archetypeId: workItem.archetypeId,
    engineClassIds,
    rendererKind: rendererFor(engineClassIds[0]),
    familyId: `portfolio.${standardSlug}.diagnostic-v1`,
    manipulation: `portfolio-${standardSlug}-evidence-drag`,
    targetOutlines: record.expectedTargetOutline,
    learningMap: {
      topicId: applicationTopic.id,
      prerequisiteTopicIds: [representationTopic.id],
      observableEvidence: applicationTopic.evidence,
      assessmentPrompt: applicationTopic.assessmentPrompt
    }
  };
});

if (records.length !== 97) {
  throw new Error(`portfolio-record-count-invalid:${records.length}`);
}
const targetCount = records.reduce(
  (sum, record) => sum + record.targetOutlines.length,
  0
);
if (targetCount !== 237) {
  throw new Error(`portfolio-target-count-invalid:${targetCount}`);
}

const output = {
  schemaVersion: "1.0.0",
  source: {
    planId: plan.planId,
    targetOutlinePlanId: draft.planId,
    targetOutlineSha256: sha256(draft),
    executionPlanSha256: sha256(plan),
    learningMapCommit: learningMap.commit,
    learningMapUsageSha256: sha256(learningMap)
  },
  standardCount: records.length,
  targetOutlineCount: targetCount,
  records
};

await writeFile(
  resolve(
    root,
    "packages/templates/src/problem-families/portfolio-scale.generated.json"
  ),
  `${JSON.stringify(output, null, 2)}\n`
);

console.log(
  `portfolio-scale data: ${records.length} standards / ${targetCount} target outlines / ${new Set(records.map((record) => record.rendererKind)).size} renderers`
);
