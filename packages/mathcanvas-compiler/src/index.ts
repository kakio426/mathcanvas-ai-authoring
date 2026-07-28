import {
  CONTRACT_SCHEMA_VERSION,
  activitySpecSchema,
  compiledProjectSchema,
  mathCanvasPayloadSchema,
  sha256Hex,
  type ActivitySpec,
  type CompiledProject
} from "@mathcanvas/contracts";
import { buildNativeContents } from "./native-objects.js";

export const MATHCANVAS_CONTRACT_VERSION = "1.0.0" as const;
export const MATHCANVAS_NUMBER_OPERATIONS_CATEGORY_ID = "rJa0d46MAy" as const;
export const CREATE_PROJECT_ENDPOINT = "/api/project" as const;
export const ALLOWED_WRITE_METHOD = "POST" as const;

const unit01 = {
  NO01LC: false,
  NO01NR: false,
  NO01SC: false,
  NO01TF: false,
  NO02CB: false,
  NO02DM: false,
  NO03BT: false,
  NO03FM: true,
  NO04NG: false,
  NO04NT: false,
  NO04PC: false,
  NO04PD: false,
  NO07IC: false,
  NO07NL: false,
  NO07PF: false,
  NO10VD: false
};

const disabledModuleGroups = {
  Unit02: {
    CR02AB: false,
    CR07AT: false,
    CR07BS: false,
    CR07CP: false,
    CR10AB: false,
    CR10CS: false
  },
  Unit03: {
    SM02AD: false,
    SM02PB: false,
    SM02TG: false,
    SM03GB: false,
    SM04PM: false,
    SM05PG: false,
    SM05RP: false,
    SM06PH: false,
    SM06UC: false,
    SM07CS: false,
    SM07PS: false,
    SM07SR: false
  },
  Unit04: {
    DP02TG: false,
    DP03PG: false,
    DP04BC: false,
    DP05LC: false,
    DP06RC: false,
    DP07CF: false,
    DP07FP: false,
    DP07FT: false,
    DP07HG: false,
    DP07MC: false,
    DP07SL: false,
    DP09BP: false
  }
};

export function compileActivitySpec(input: ActivitySpec): CompiledProject {
  const spec = activitySpecSchema.parse(input);
  const native = buildNativeContents(spec);
  const difficultyLabel = {
    easy: "쉬움",
    normal: "보통",
    hard: "어려움"
  }[spec.recommendationSnapshot.difficulty ?? "normal"];
  const grade = spec.recommendationSnapshot.recommendedGrade ?? 5;
  const creationMarker = sha256Hex({
    activityId: spec.id,
    seed: spec.seed,
    templateId: spec.templateId,
    templateVersion: spec.templateVersion
  })
    .slice(0, 12)
    .toUpperCase();
  const payload = mathCanvasPayloadSchema.parse({
    projectTitle:
      `${spec.title.slice(0, 60)} · ${grade}학년 · ` +
      `${spec.problems.length}문제 · ${difficultyLabel} ` +
      `[AI-${creationMarker}]`,
    categoryId: MATHCANVAS_NUMBER_OPERATIONS_CATEGORY_ID,
    contentsJson: native.contents,
    canvasOption: {
      grid: {
        type: "none",
        isGrid: false,
        distance: { x: 40, y: 40 },
        isGridToggle: false
      },
      scale: 5,
      lockIds: native.lockedIds.map((id) => [id]),
      viewBox: spec.layout.viewBox,
      CR07BSArr: [],
      CR07BSObj: { type1: 0.3, type2: 0.3, type3: 0.3, weight: 0 },
      moduleArr: {
        Unit01: unit01,
        ...disabledModuleGroups
      },
      isCaptured: false,
      penElements: [],
      canvasCenterCoordinate: {
        cx: spec.layout.width / 2,
        cy: spec.layout.height / 2
      }
    },
    isShowMenuOnActivity: true,
    isNoteworthy: false,
    tags: ["분수", "크기 비교", "직접 조작"],
    studyLevel: "elementary"
  });
  const payloadHash = sha256Hex(payload);
  return compiledProjectSchema.parse({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    contractVersion: MATHCANVAS_CONTRACT_VERSION,
    sourceActivitySpecId: spec.id,
    sourceActivitySpecVersion: spec.schemaVersion,
    templateId: spec.templateId,
    templateVersion: spec.templateVersion,
    payloadHash,
    payload
  });
}

export * from "./native-objects.js";
