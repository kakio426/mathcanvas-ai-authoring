#!/usr/bin/env node
import {
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { parseArguments, failCli } from "./lib/cli.mjs";
import {
  assertPathInside,
  defaultRawRoot
} from "./lib/paths.mjs";
import { stableJson } from "./lib/normalize.mjs";

const origin = "https://mathcanvas.vivasam.com";

try {
  const options = parseArguments(process.argv.slice(2), {
    "page-capture": {
      type: "string",
      default: join(defaultRawRoot, "tool-settings.raw.json")
    },
    output: {
      type: "string",
      default: join(defaultRawRoot, "main-bundle.raw.js")
    },
    metadata: {
      type: "string",
      default: join(defaultRawRoot, "main-bundle.raw.metadata.json")
    },
    "raw-root": { type: "string", default: defaultRawRoot }
  });
  const pageCapturePath = assertPathInside(
    options["page-capture"],
    options["raw-root"],
    "page capture input"
  );
  const outputPath = assertPathInside(
    options.output,
    options["raw-root"],
    "bundle raw output"
  );
  const metadataPath = assertPathInside(
    options.metadata,
    options["raw-root"],
    "bundle metadata output"
  );
  const pageCapture = JSON.parse(
    readFileSync(pageCapturePath, "utf8")
  );
  const bundlePath = [
    ...new Set(
      (pageCapture.observedResponses ?? [])
        .filter(
          (response) =>
            response.method === "GET" &&
            response.status === 200 &&
            /^\/assets\/index-[A-Za-z0-9_-]+\.js$/.test(
              response.path
            )
        )
        .map((response) => response.path)
    )
  ][0];
  if (!bundlePath) {
    throw new Error(
      "main-bundle-unavailable: 화면 캡처에서 index bundle을 찾지 못했습니다."
    );
  }
  const response = await fetch(`${origin}${bundlePath}`, {
    method: "GET",
    headers: { accept: "text/javascript,*/*;q=0.1" },
    redirect: "error"
  });
  if (!response.ok) {
    throw new Error(`bundle-request-failed: HTTP ${response.status}`);
  }
  const source = await response.text();
  if (
    source.length < 100_000 ||
    !source.includes("bottom-common-toolbar") ||
    !source.includes("NO03FM")
  ) {
    throw new Error("bundle-contract-invalid");
  }
  const sha256 = createHash("sha256").update(source).digest("hex");
  mkdirSync(dirname(outputPath), { recursive: true, mode: 0o700 });
  mkdirSync(dirname(metadataPath), {
    recursive: true,
    mode: 0o700
  });
  writeFileSync(outputPath, source, {
    encoding: "utf8",
    mode: 0o600
  });
  writeFileSync(
    metadataPath,
    stableJson({
      captureVersion: "1.0.0",
      capturedAt: new Date().toISOString(),
      request: {
        method: "GET",
        origin,
        path: bundlePath,
        status: response.status
      },
      bytes: Buffer.byteLength(source),
      sha256
    }),
    { encoding: "utf8", mode: 0o600 }
  );
  process.stdout.write(
    `PASS bundle ${Buffer.byteLength(source)} bytes ${sha256} ${outputPath}\n`
  );
} catch (error) {
  failCli(error);
}
