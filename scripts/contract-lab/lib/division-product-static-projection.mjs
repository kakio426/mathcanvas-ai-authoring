import { sha256Hex } from "../../../packages/contracts/dist/index.js";

export const DIVISION_PRODUCT_STATIC_PROJECTION_POLICY =
  "division-product-static-v1";

const dynamicSvgIds = new Set(["NO01SC-01", "group-element"]);
const geometryNumberKeys = new Set([
  "x",
  "_x",
  "y",
  "_y",
  "width",
  "height",
  "cx",
  "cy",
  "rx",
  "ry",
  "radius",
  "point1",
  "point2",
  "coordinates"
]);

function normalizeSerializedNumbers(value, geometryContext = false) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("division-product-static-number-invalid");
    }
    // MathCanvas can serialize computed geometry with an IEEE-754 tail (for
    // example 184.04000000000002 versus 184.04). Only geometry fields may
    // absorb that tail. State/configuration numbers such as strokeType,
    // clickCount, and fontSize remain exact and therefore fail closed.
    const normalized = geometryContext
      ? Number(value.toPrecision(15))
      : value;
    return Object.is(normalized, -0) ? 0 : normalized;
  }
  if (Array.isArray(value)) {
    return value.map((child) =>
      normalizeSerializedNumbers(child, geometryContext)
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        normalizeSerializedNumbers(
          child,
          geometryContext || geometryNumberKeys.has(key)
        )
      ])
    );
  }
  return value;
}

function normalizeStaticObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof value.id !== "string" ||
    typeof value.svgId !== "string"
  ) {
    throw new Error("division-product-static-object-invalid");
  }
  const normalized = structuredClone(value);
  delete normalized.parent;
  delete normalized.playgroundIndex;
  // MathCanvas adds this explicit false during serialization for drawElem.
  // Missing and false render identically; true remains part of the identity.
  normalized.isEyeOn = normalized.isEyeOn ?? false;
  return normalizeSerializedNumbers(normalized);
}

export function projectDivisionProductStaticPayload(contentsJson) {
  if (!Array.isArray(contentsJson)) {
    throw new Error("division-product-static-contents-invalid");
  }
  const projection = contentsJson
    .filter(
      (value) =>
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !dynamicSvgIds.has(value.svgId)
    )
    .map(normalizeStaticObject)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (
    projection.length === 0 ||
    new Set(projection.map((value) => value.id)).size !== projection.length
  ) {
    throw new Error("division-product-static-projection-invalid");
  }
  return projection;
}

export function divisionProductStaticPayloadIdentity(contentsJson) {
  const projection = projectDivisionProductStaticPayload(contentsJson);
  return {
    policy: DIVISION_PRODUCT_STATIC_PROJECTION_POLICY,
    objectCount: projection.length,
    sha256: sha256Hex(projection)
  };
}
