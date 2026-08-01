import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";

export const CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_ID =
  "clock.hour-hand.boundary-choice" as const;
export const CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_VERSION =
  "1.0.0" as const;

type Configuration = {
  readonly startHour: number;
  readonly targetMinute: 50 | 55;
};

const configurations: readonly Configuration[] = [
  { startHour: 2, targetMinute: 55 },
  { startHour: 3, targetMinute: 50 },
  { startHour: 5, targetMinute: 55 },
  { startHour: 7, targetMinute: 50 },
  { startHour: 8, targetMinute: 55 }
];

function connective(number: number): "과" | "와" {
  return [1, 3, 6, 7, 8, 10, 11].includes(number)
    ? "과"
    : "와";
}

function shuffled<T>(
  values: readonly T[],
  random: () => number
): T[] {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [output[index], output[swapWith]] = [
      output[swapWith]!,
      output[index]!
    ];
  }
  return output;
}

export function generateClockHourHandBoundaryItems(
  parameters: {
    readonly difficulty: Difficulty;
    readonly problemCount: number;
  },
  seed: string
): ResolvedItem[] {
  if (
    parameters.difficulty !== "normal" ||
    !Number.isInteger(parameters.problemCount) ||
    parameters.problemCount < 2 ||
    parameters.problemCount > 4
  ) {
    throw new RangeError(
      "시계 활동은 기본 난이도에서 2~4문항을 지원합니다."
    );
  }
  const random = createSeededRandom(
    `${seed}:clock-hour-hand-boundary`
  );
  return shuffled(configurations, random)
    .slice(0, parameters.problemCount)
    .map((configuration, index) => {
      const nextHour =
        configuration.startHour === 12
          ? 1
          : configuration.startHour + 1;
      const minuteNumber = configuration.targetMinute / 5;
      const connector = connective(configuration.startHour);
      const correctPositionText =
        `${configuration.startHour}${connector} ${nextHour} 사이, ` +
        `${nextHour}에 가까이`;
      const betweenStartText =
        `${configuration.startHour}${connector} ${nextHour} 사이, ` +
        `${configuration.startHour}에 가까이`;
      const candidates = shuffled(
        [
          `${configuration.startHour} 바로 위`,
          betweenStartText,
          correctPositionText,
          `${nextHour} 바로 위`,
          `${minuteNumber} 바로 위`
        ],
        random
      );
      const order = index + 1;
      return {
        id: `clock-boundary-${order}`,
        order,
        kind: "clock-hour-hand-boundary-choice",
        values: {
          startHour: configuration.startHour,
          initialMinute: 0,
          targetMinute: configuration.targetMinute,
          nextHour,
          minuteNumber,
          correctPositionText,
          betweenStartText,
          currentHourText: `${configuration.startHour} 바로 위`,
          nextHourText: `${nextHour} 바로 위`,
          minuteNumberText: `${minuteNumber} 바로 위`,
          candidate1: candidates[0],
          candidate2: candidates[1],
          candidate3: candidates[2],
          candidate4: candidates[3],
          candidate5: candidates[4],
          orderLabel: `${order}번`,
          questionText:
            `${configuration.startHour}시에서 긴바늘을 ` +
            `${configuration.targetMinute}분까지 돌리면 ` +
            "짧은바늘은 어디쯤 갈까요?",
          difficulty: parameters.difficulty
        },
        provenance: {
          generatorId: CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_ID,
          generatorVersion:
            CLOCK_HOUR_HAND_BOUNDARY_GENERATOR_VERSION,
          seed
        }
      };
    });
}
