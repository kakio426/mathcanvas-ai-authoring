import type { ResolvedEmission } from "@mathcanvas/contracts";

type Handler = (input: {
  sources: readonly ResolvedEmission[];
  target: ResolvedEmission;
  parameters: Readonly<Record<string, unknown>>;
}) => boolean;

function contains(
  source: ResolvedEmission["bounds"],
  target: ResolvedEmission["bounds"]
): boolean {
  return (
    source.x >= target.x &&
    source.y >= target.y &&
    source.x + source.width <= target.x + target.width &&
    source.y + source.height <= target.y + target.height
  );
}

const handlers: Readonly<Record<string, Handler>> = {
  "align-edge-to": ({ sources, target, parameters }) => {
    const edge = parameters.edge;
    if (
      edge !== "left" &&
      edge !== "right" &&
      edge !== "top" &&
      edge !== "bottom"
    ) {
      throw new Error("constraint-parameter-invalid:edge");
    }
    const axis = edge === "left" || edge === "right" ? "x" : "y";
    return sources.every(
      (source) => source.bounds[axis] === target.bounds[axis]
    );
  },
  "place-in": ({ sources, target }) =>
    sources.every((source) =>
      contains(source.bounds, target.bounds)
    ),
  "select-one-of": ({ sources, target }) =>
    sources.some((source) =>
      contains(source.bounds, target.bounds)
    ),
  "fill-from-pool": ({ sources, target }) =>
    sources.some((source) =>
      contains(source.bounds, target.bounds)
    )
};

export function evaluateInitialConstraint(
  kind: string,
  input: Parameters<Handler>[0]
): boolean {
  const handler = handlers[kind];
  if (!handler) {
    throw new Error(`constraint-handler-unregistered:${kind}`);
  }
  return handler(input);
}
