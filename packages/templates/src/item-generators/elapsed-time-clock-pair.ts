import {
  createSeededRandom,
  type Difficulty,
  type ResolvedItem
} from "@mathcanvas/contracts";

export const ELAPSED_TIME_CLOCK_PAIR_GENERATOR_ID =
  "clock.elapsed-time.pair-choice" as const;
export const ELAPSED_TIME_CLOCK_PAIR_GENERATOR_VERSION =
  "1.0.0" as const;

type Configuration = {
  readonly startHour: number;
  readonly startMinute: number;
  readonly endHour: number;
  readonly endMinute: number;
  readonly elapsedMinutes: number;
  readonly minuteDifferenceValue: number;
  readonly decimalBorrowValue: number;
};

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

function nextHour(hour: number): number {
  return hour === 12 ? 1 : hour + 1;
}

function clockText(hour: number, minute: number): string {
  return minute === 0
    ? `${hour}시`
    : `${hour}시 ${minute}분`;
}

function configurationPool(): Configuration[] {
  const output: Configuration[] = [];
  for (let startHour = 1; startHour <= 12; startHour += 1) {
    for (
      let startMinute = 35;
      startMinute <= 55;
      startMinute += 5
    ) {
      for (
        let elapsedMinutes = 15;
        elapsedMinutes <= 45;
        elapsedMinutes += 5
      ) {
        const totalMinutes = startMinute + elapsedMinutes;
        if (totalMinutes < 60 || totalMinutes >= 120) continue;
        const endMinute = totalMinutes - 60;
        const minuteDifferenceValue = Math.abs(
          endMinute - startMinute
        );
        const decimalBorrowValue =
          100 - startMinute + endMinute;
        const misconceptionValues = [
          elapsedMinutes,
          minuteDifferenceValue,
          60,
          decimalBorrowValue,
          startMinute
        ];
        if (new Set(misconceptionValues).size !== 5) continue;
        output.push({
          startHour,
          startMinute,
          endHour: nextHour(startHour),
          endMinute,
          elapsedMinutes,
          minuteDifferenceValue,
          decimalBorrowValue
        });
      }
    }
  }
  return output;
}

export function generateElapsedTimeClockPairItems(
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
      "경과 시간 활동은 기본 난이도에서 2~4문항을 지원합니다."
    );
  }
  const random = createSeededRandom(
    `${seed}:elapsed-time-clock-pair`
  );
  const selected: Configuration[] = [];
  for (const configuration of shuffled(configurationPool(), random)) {
    if (
      selected.some(
        (existing) =>
          existing.startHour === configuration.startHour
      )
    ) {
      continue;
    }
    selected.push(configuration);
    if (selected.length === parameters.problemCount) break;
  }
  if (selected.length !== parameters.problemCount) {
    throw new Error("elapsed-time-configuration-capacity-exhausted");
  }

  return selected.map((configuration, index) => {
    const candidates = shuffled(
      [
        configuration.elapsedMinutes,
        configuration.minuteDifferenceValue,
        60,
        configuration.decimalBorrowValue,
        configuration.startMinute
      ],
      random
    ).map((value) => `${value}분`);
    const order = index + 1;
    return {
      id: `elapsed-time-${order}`,
      order,
      kind: "elapsed-time-clock-pair-choice",
      values: {
        ...configuration,
        hourOnlyValue: 60,
        startMinuteValue: configuration.startMinute,
        correctResultText: `${configuration.elapsedMinutes}분`,
        minuteDifferenceText:
          `${configuration.minuteDifferenceValue}분`,
        hourOnlyText: "60분",
        decimalBorrowText:
          `${configuration.decimalBorrowValue}분`,
        startMinuteText: `${configuration.startMinute}분`,
        candidate1: candidates[0],
        candidate2: candidates[1],
        candidate3: candidates[2],
        candidate4: candidates[3],
        candidate5: candidates[4],
        orderLabel: `${order}번`,
        startLabel: "시작",
        endLabel: "끝",
        questionText:
          `${clockText(
            configuration.startHour,
            configuration.startMinute
          )}부터 ${clockText(
            configuration.endHour,
            configuration.endMinute
          )}까지 몇 분 걸렸을까요?`,
        difficulty: parameters.difficulty
      },
      provenance: {
        generatorId: ELAPSED_TIME_CLOCK_PAIR_GENERATOR_ID,
        generatorVersion:
          ELAPSED_TIME_CLOCK_PAIR_GENERATOR_VERSION,
        seed
      }
    };
  });
}
