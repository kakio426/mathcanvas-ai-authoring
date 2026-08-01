import {
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { sha256Hex } from "@mathcanvas/contracts";

type GoldenFixture = {
  results: {
    activitySpec: Record<string, unknown> & {
      approvalViewSchemaVersion: string;
      binding: Record<string, unknown>;
    };
    recommendation: Record<string, unknown>;
  };
};

export function writeVerifiedDraftFixture(
  directory: string,
  now: Date
): {
  draftId: string;
  activitySpecHash: string;
  snapshotPath: string;
} {
  const golden = JSON.parse(
    readFileSync(
      new URL(
        "../../fixtures/golden/fraction-comparison.p3-v1.json",
        import.meta.url
      ),
      "utf8"
    )
  ) as GoldenFixture;
  const {
    approvalViewSchemaVersion: _approvalViewSchemaVersion,
    ...resolved
  } = golden.results.activitySpec;
  const draftId = "draft-verified-fixture";
  const activitySpecHash = sha256Hex(
    golden.results.activitySpec
  );
  const snapshotPath = join(directory, "drafts.json");
  writeFileSync(
    snapshotPath,
    JSON.stringify({
      version: 3,
      drafts: [
        {
          draftSchemaVersion: 3,
          draftId,
          resolved,
          binding: resolved.binding,
          recommendation: golden.results.recommendation,
          activitySpecHash,
          createdAt: now.toISOString(),
          expiresAt: new Date(
            now.getTime() + 30 * 60 * 1000
          ).toISOString()
        }
      ]
    })
  );
  return { draftId, activitySpecHash, snapshotPath };
}
