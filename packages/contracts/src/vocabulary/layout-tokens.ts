export interface LayoutToken {
  readonly scope: "canvas" | "item";
  readonly relativeTo?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LayoutPreset {
  readonly tokens: Readonly<Record<string, LayoutToken>>;
  readonly itemOriginY: number;
  readonly itemPitch: number;
  readonly canvasBaseHeight: number;
  readonly minGap: number;
}
