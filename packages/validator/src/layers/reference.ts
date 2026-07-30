import type {
  CompiledProject,
  ResolvedActivity,
  ResolvedEmission,
  ValidationIssue
} from "@mathcanvas/contracts";
import { intersects, issue } from "./shared.js";

function contains(
  container: ResolvedEmission["bounds"],
  child: ResolvedEmission["bounds"]
): boolean {
  return (
    child.x >= container.x &&
    child.y >= container.y &&
    child.x + child.width <= container.x + container.width &&
    child.y + child.height <= container.y + container.height
  );
}

function groupBy<T>(
  values: readonly T[],
  keyOf: (value: T) => string
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const key = keyOf(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return groups;
}

export function validateReferencesAndLayout(
  resolved: ResolvedActivity,
  compiled: CompiledProject,
  issues: ValidationIssue[]
): void {
  const ids = resolved.emissions.map((emission) => emission.id);
  if (new Set(ids).size !== ids.length) {
    issue(
      issues,
      "duplicate-semantic-id",
      "schema",
      "활동 객체 ID가 중복됩니다."
    );
  }
  const emissionById = new Map(
    resolved.emissions.map((emission) => [emission.id, emission])
  );
  const locked = new Set(compiled.payload.canvasOption.lockIds.flat());
  const nativeIds = new Set(
    compiled.payload.contentsJson.flatMap((object) =>
      typeof object.id === "string" ? [object.id] : []
    )
  );

  for (const constraint of resolved.constraints) {
    const references = [
      ...constraint.sourceIds,
      constraint.targetId
    ];
    if (references.some((id) => !emissionById.has(id))) {
      issue(
        issues,
        "constraint-reference-missing",
        "interaction",
        `${constraint.id}가 존재하지 않는 객체를 참조합니다.`
      );
      continue;
    }
    const target = emissionById.get(constraint.targetId)!;
    if (!nativeIds.has(target.id) || !locked.has(target.id)) {
      issue(
        issues,
        "drop-surface-invalid",
        "interaction",
        `${target.id}가 없거나 잠겨 있지 않습니다.`
      );
    }
    if (target.bounds.width < 42 || target.bounds.height < 42) {
      issue(
        issues,
        "target-too-small",
        "interaction",
        `${target.id}의 조작 영역은 42×42 이상이어야 합니다.`
      );
    }
  }

  if (
    !resolved.constraints.some(
      (constraint) =>
        constraint.requiresStudentAction &&
        !constraint.satisfiedInitially
    )
  ) {
    issue(
      issues,
      "activity-initial-state-already-solved",
      "interaction",
      "학생 조작 전에 활동이 이미 완성되어 있습니다."
    );
  }

  const flowGroups = groupBy(
    resolved.emissions.filter((emission) => emission.flowGroup),
    (emission) => emission.flowGroup!
  );
  for (const members of flowGroups.values()) {
    const ordered = [...members].sort(
      (left, right) => left.bounds.y - right.bounds.y
    );
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1]!;
      const current = ordered[index]!;
      if (intersects(previous.bounds, current.bounds)) {
        issue(
          issues,
          "instruction-overlap",
          "layout",
          `${previous.id}와 ${current.id} 흐름 영역이 겹칩니다.`
        );
      } else if (
        current.bounds.y -
          (previous.bounds.y + previous.bounds.height) <
        resolved.layout.minGap
      ) {
        issue(
          issues,
          "instruction-gap-too-small",
          "layout",
          `${previous.id}와 ${current.id} 사이 간격이 너무 작습니다.`
        );
      }
    }
  }

  const collisionGroups = groupBy(
    resolved.emissions.filter(
      (emission) => emission.collisionGroup
    ),
    (emission) =>
      `${emission.itemId ?? "activity"}:${emission.collisionGroup}`
  );
  for (const members of collisionGroups.values()) {
    members.forEach((left, leftIndex) => {
      members.slice(leftIndex + 1).forEach((right) => {
        if (intersects(left.bounds, right.bounds)) {
          issue(
            issues,
            "collision-group-overlap",
            "layout",
            `${left.id}와 ${right.id} 배치 영역이 겹칩니다.`
          );
        }
      });
    });
  }

  for (const emission of resolved.emissions) {
    const { x, y, width, height } = emission.bounds;
    if (
      x < 0 ||
      y < 0 ||
      x + width > resolved.layout.width ||
      y + height > resolved.layout.height
    ) {
      issue(
        issues,
        "object-out-of-bounds",
        "layout",
        `${emission.id}가 캔버스 밖으로 나갑니다.`
      );
    }
    if (!nativeIds.has(emission.id)) {
      issue(
        issues,
        emission.locked
          ? "fixed-object-missing"
          : "movable-object-missing",
        "api-contract",
        `${emission.id}에 해당하는 native 객체가 없습니다.`
      );
      continue;
    }
    if (emission.locked && !locked.has(emission.id)) {
      issue(
        issues,
        "fixed-object-unlocked",
        "interaction",
        `${emission.id}가 잠겨 있지 않습니다.`
      );
    }
    if (emission.movable && locked.has(emission.id)) {
      issue(
        issues,
        "movable-object-locked",
        "interaction",
        `${emission.id}는 학생이 움직일 수 있어야 합니다.`
      );
    }
    if (emission.containerId) {
      const container = emissionById.get(emission.containerId);
      if (!container || !contains(container.bounds, emission.bounds)) {
        issue(
          issues,
          "container-child-outside-bounds",
          "layout",
          `${emission.id}가 지정된 컨테이너 안에 들어오지 않습니다.`
        );
      }
    }
  }
}
