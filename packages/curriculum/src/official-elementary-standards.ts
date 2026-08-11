import {
  officialElementaryStandardsFixtureSchema,
  type OfficialElementaryStandard,
  type OfficialElementaryStandardsFixture
} from "@mathcanvas/contracts";
import rawFixture from "./fixtures/kr-2022-elementary-math/official-standards.json" with {
  type: "json"
};

export const officialElementaryStandardsFixture: OfficialElementaryStandardsFixture =
  officialElementaryStandardsFixtureSchema.parse(rawFixture);

export const officialElementaryStandards: readonly OfficialElementaryStandard[] =
  officialElementaryStandardsFixture.standards;

export const OFFICIAL_ELEMENTARY_STANDARD_COUNT =
  officialElementaryStandards.length;

export function findOfficialElementaryStandard(
  standardCode: string
): OfficialElementaryStandard | undefined {
  return officialElementaryStandards.find(
    (standard) => standard.code === standardCode
  );
}
