import { z } from "zod";
import { stableIdSchema } from "./ids.js";

export const layoutBlockKindSchema = z.enum([
  "canvas",
  "band",
  "row",
  "slot",
  "anchor"
]);

export type LayoutBlock = {
  readonly id: string;
  readonly kind: z.infer<typeof layoutBlockKindSchema>;
  readonly preset: string;
  readonly repeat: "once" | "each-item";
  readonly flowGroup?: string | undefined;
  readonly collisionGroup?: string | undefined;
  readonly children: readonly LayoutBlock[];
};

export const layoutBlockSchema: z.ZodType<LayoutBlock> = z.lazy(() =>
  z
    .object({
      id: stableIdSchema,
      kind: layoutBlockKindSchema,
      preset: stableIdSchema,
      repeat: z.enum(["once", "each-item"]),
      flowGroup: stableIdSchema.optional(),
      collisionGroup: stableIdSchema.optional(),
      children: z.array(layoutBlockSchema).max(64)
    })
    .strict()
);

export const blueprintLayoutSchema = z
  .object({
    tokenSet: stableIdSchema,
    root: layoutBlockSchema
  })
  .strict();

export type BlueprintLayout = z.infer<typeof blueprintLayoutSchema>;

export function countLayoutNodes(block: LayoutBlock): {
  count: number;
  depth: number;
} {
  const children = block.children.map(countLayoutNodes);
  return {
    count: 1 + children.reduce((sum, child) => sum + child.count, 0),
    depth: 1 + Math.max(0, ...children.map((child) => child.depth))
  };
}
