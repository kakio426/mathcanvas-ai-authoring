import type { LayoutPreset } from "@mathcanvas/contracts";
import { p1FrozenLayoutPreset } from "./p1-frozen-v1.js";
import { p2NumberCompositionLayoutPreset } from "./p2-number-composition-v1.js";
import { p3CognitiveFractionLayoutPreset } from "./p3-cognitive-fraction-v1.js";
import { p3CognitiveEquivalentLayoutPreset } from "./p3-cognitive-equivalent-v1.js";
import { p3CognitiveMakeTenLayoutPreset } from "./p3-cognitive-make-ten-v1.js";

const presets: Readonly<Record<string, LayoutPreset>> = {
  "p1-frozen-v1": p1FrozenLayoutPreset,
  "p2-number-composition-v1": p2NumberCompositionLayoutPreset,
  "p3-cognitive-fraction-v1": p3CognitiveFractionLayoutPreset,
  "p3-cognitive-equivalent-v1":
    p3CognitiveEquivalentLayoutPreset,
  "p3-cognitive-make-ten-v1": p3CognitiveMakeTenLayoutPreset
};

export function getLayoutPreset(id: string): LayoutPreset {
  const preset = presets[id];
  if (!preset) throw new Error(`layout-preset-unregistered:${id}`);
  return preset;
}
