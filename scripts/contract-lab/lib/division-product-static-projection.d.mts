export const DIVISION_PRODUCT_STATIC_PROJECTION_POLICY:
  "division-product-static-v1";

export type DivisionProductStaticPayloadIdentity = {
  policy: typeof DIVISION_PRODUCT_STATIC_PROJECTION_POLICY;
  objectCount: number;
  sha256: string;
};

export function projectDivisionProductStaticPayload(
  contentsJson: unknown
): Array<Record<string, unknown>>;

export function divisionProductStaticPayloadIdentity(
  contentsJson: unknown
): DivisionProductStaticPayloadIdentity;
