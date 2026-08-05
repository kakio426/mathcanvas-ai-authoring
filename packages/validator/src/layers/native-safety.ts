import {
  assertNoSensitiveKeys,
  sha256Hex,
  type CompiledProject,
  type ResolvedActivity,
  type ValidationIssue
} from "@mathcanvas/contracts";
import {
  MATHCANVAS_CONTRACT_VERSION,
  RELEASED_MODULE_VARIANT_IDS,
  assertPenElementsWithinContract
} from "@mathcanvas/compiler";
import { validateRegisteredNativeEmissions } from "../native/registry.js";
import { issue } from "./shared.js";

const supportedSvgIds = new Set([
  ...RELEASED_MODULE_VARIANT_IDS,
  "input-text",
  "math-latex",
  "drawElem",
  "angleElem"
]);

export function validateNativeSafety(
  resolved: ResolvedActivity,
  compiled: CompiledProject,
  issues: ValidationIssue[]
): void {
  const nativeIds = compiled.payload.contentsJson
    .map((object) => object.id)
    .filter((id): id is string => typeof id === "string");
  if (new Set(nativeIds).size !== nativeIds.length) {
    issue(
      issues,
      "duplicate-native-id",
      "api-contract",
      "native 객체 ID가 중복됩니다."
    );
  }
  validateRegisteredNativeEmissions(resolved, compiled, issues);

  compiled.payload.contentsJson.forEach((object, index) => {
    if (
      typeof object.svgId !== "string" ||
      !supportedSvgIds.has(object.svgId)
    ) {
      issue(
        issues,
        "unsupported-svg-id",
        "api-contract",
        `지원하지 않는 MathCanvas svgId입니다: ${String(object.svgId)}`,
        `payload.contentsJson.${index}.svgId`
      );
    }
    if (
      object.svgId === "math-latex" &&
      typeof object.text === "string" &&
      /[가-힣]/.test(object.text)
    ) {
      issue(
        issues,
        "korean-text-inside-latex",
        "api-contract",
        "한글 안내는 일반 글자 객체에 넣어야 합니다.",
        `payload.contentsJson.${index}.text`
      );
    }
    if (
      object.svgId === "drawElem" &&
      object.type !== "rect" &&
      object.type !== "line"
    ) {
      issue(
        issues,
        "unsupported-draw-type",
        "api-contract",
        `출시되지 않은 draw type입니다: ${String(object.type)}`,
        `payload.contentsJson.${index}.type`
      );
    }
  });
  try {
    assertPenElementsWithinContract(
      compiled.payload.canvasOption.penElements
    );
  } catch {
    issue(
      issues,
      "unsupported-pen-elements",
      "api-contract",
      "비어 있지 않은 penElements는 아직 생성할 수 없습니다.",
      "payload.canvasOption.penElements"
    );
  }
  if (
    compiled.contractVersion !== MATHCANVAS_CONTRACT_VERSION ||
    compiled.payload.categoryId !== resolved.payload.categoryId ||
    compiled.payload.studyLevel !== resolved.payload.studyLevel ||
    compiled.payload.isNoteworthy !== false
  ) {
    issue(
      issues,
      "project-contract-mismatch",
      "api-contract",
      "새 프로젝트 생성 계약과 다릅니다."
    );
  }
  if (compiled.payloadHash !== sha256Hex(compiled.payload)) {
    issue(
      issues,
      "payload-hash-mismatch",
      "security",
      "payload 무결성 해시가 맞지 않습니다."
    );
  }
  try {
    assertNoSensitiveKeys(compiled.payload);
  } catch (error) {
    issue(
      issues,
      "sensitive-data-detected",
      "security",
      error instanceof Error ? error.message : "민감 정보가 포함되었습니다."
    );
  }
}
