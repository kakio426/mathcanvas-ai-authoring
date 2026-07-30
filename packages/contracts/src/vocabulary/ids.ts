import { z } from "zod";

export const stableIdSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._:-]+$/);

export function mintResolvedId(
  role: string,
  scope: "activity" | "each-item",
  itemId?: string
): string {
  if (scope === "activity") return stableIdSchema.parse(role);
  if (!itemId) throw new Error(`item-id-required:${role}`);
  return stableIdSchema.parse(`${itemId}-${role}`);
}
