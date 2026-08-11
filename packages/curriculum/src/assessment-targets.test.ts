import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_MAP_COMMIT } from "./data.js";
import {
  CLASSIFICATION_ASSESSMENT_TARGET_IDS,
  assessmentTargetSets,
  assessmentTargets,
  findAssessmentTarget,
  findAssessmentTargetSet
} from "./assessment-targets.js";
import { findOfficialElementaryStandard } from "./official-elementary-standards.js";

type LearningMapUsage = {
  commit: string;
  topics: Array<{
    id: string;
    evidence: string[];
    assessmentPrompt: string;
  }>;
  dependencies: Array<{
    topicId: string;
    prerequisiteId: string;
    strength: string;
  }>;
};

function learningMapUsage(): LearningMapUsage {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), "fixtures/pedagogy/learning-map.used.json"),
      "utf8"
    )
  ) as LearningMapUsage;
}

describe("reviewed AssessmentTarget registry", () => {
  it("[2수04-01] 공식 문장의 네 필수 평가 목표를 완전 집합으로 고정한다", () => {
    const standard = findOfficialElementaryStandard("[2수04-01]");
    expect(standard?.officialGoal).toBe(
      "여러 가지 사물을 정해진 기준 또는 자신이 정한 기준으로 분류하여 개수를 세어 보고, 기준에 따른 결과를 말할 수 있다."
    );
    const set = findAssessmentTargetSet("[2수04-01]");
    const targets = assessmentTargets.filter(
      (target) => target.standardCode === "[2수04-01]"
    );
    expect(set).toMatchObject({
      completeness: "reviewed-complete",
      targetIds: Object.values(CLASSIFICATION_ASSESSMENT_TARGET_IDS)
    });
    expect(assessmentTargetSets).toContainEqual(set);
    expect(targets).toHaveLength(4);
    expect(
      targets.every(
        (target) =>
          target.standardCode === "[2수04-01]" &&
          target.required &&
          target.reviewStatus === "reviewed"
      )
    ).toBe(true);
    expect(
      new Set(targets.map((target) => target.targetId))
    ).toEqual(new Set(set?.targetIds));
    expect(
      findAssessmentTarget(
        CLASSIFICATION_ASSESSMENT_TARGET_IDS.selfChosenCriterion
      )?.scopeNote
    ).toContain("첫 native family에서는 아직 지원하지 않는다");
  });

  it("target의 topic·선수관계·평가 질문을 고정 learning-map 원문에 결속한다", () => {
    const usage = learningMapUsage();
    const topics = new Map(usage.topics.map((topic) => [topic.id, topic]));
    const hardEdges = new Set(
      usage.dependencies
        .filter((dependency) => dependency.strength === "hard")
        .map(
          (dependency) =>
            `${dependency.topicId}<-${dependency.prerequisiteId}`
        )
    );
    const hasHardPath = (topicId: string, prerequisiteId: string): boolean => {
      const visited = new Set<string>();
      const visit = (current: string): boolean => {
        if (current === prerequisiteId) return true;
        if (visited.has(current)) return false;
        visited.add(current);
        return [...hardEdges]
          .filter((edge) => edge.startsWith(`${current}<-`))
          .map((edge) => edge.slice(edge.indexOf("<-") + 2))
          .some(visit);
      };
      return visit(topicId);
    };

    expect(usage.commit).toBe(LEARNING_MAP_COMMIT);
    for (const target of assessmentTargets) {
      expect(target.learningMap.commit).toBe(LEARNING_MAP_COMMIT);
      for (const topicId of target.learningMap.topicIds) {
        const topic = topics.get(topicId);
        expect(topic, topicId).toBeDefined();
        expect(topic?.assessmentPrompt.length).toBeGreaterThan(20);
        expect(topic?.evidence.length).toBeGreaterThan(0);
      }
      for (const prerequisiteId of target.learningMap.prerequisiteTopicIds) {
        expect(topics.has(prerequisiteId), prerequisiteId).toBe(true);
        expect(
          target.learningMap.topicIds.some((topicId) =>
            hasHardPath(topicId, prerequisiteId)
          )
        ).toBe(true);
      }
    }
  });
});
