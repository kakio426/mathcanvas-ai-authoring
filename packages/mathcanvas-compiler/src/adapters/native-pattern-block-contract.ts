export const PATTERN_BLOCK_VARIANTS = {
  1: {
    svgId: "SM02PB-01",
    color: "#FFE100",
    coordinates: [
      [-80, 0], [-40, -69.282], [40, -69.282],
      [80, 0], [40, 69.282], [-40, 69.282]
    ]
  },
  2: {
    svgId: "SM02PB-02",
    color: "#32CCFF",
    coordinates: [[0, -69.282], [40, 0], [0, 69.282], [-40, 0]]
  },
  3: {
    svgId: "SM02PB-03",
    color: "#FF5862",
    coordinates: [[-80, 34.641], [-40, -34.641], [40, -34.641], [80, 34.641]]
  },
  4: {
    svgId: "SM02PB-04",
    color: "#7FD50F",
    coordinates: [[-40, 23.094], [0, -46.188], [40, 23.094]]
  },
  5: {
    svgId: "SM02PB-05",
    color: "#FF8E25",
    coordinates: [[-40, -40], [40, -40], [40, 40], [-40, 40]]
  },
  6: {
    svgId: "SM02PB-06",
    color: "#B675FF",
    coordinates: [[0.053, 77.471], [20.758, 0.197], [-0.053, -77.471], [-20.758, -0.197]]
  }
} as const;

export type PatternBlockVariant = keyof typeof PATTERN_BLOCK_VARIANTS;

export function patternBlockBounds(variant: PatternBlockVariant) {
  const points = PATTERN_BLOCK_VARIANTS[variant].coordinates;
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}
