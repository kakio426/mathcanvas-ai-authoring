import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateRawSync } from "node:zlib";

const fixturePath = resolve(
  "packages/curriculum/src/fixtures/kr-2022-elementary-math/official-standards.json"
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function download(url, label) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${label} download failed: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function assertHash(label, bytes, expected) {
  const actual = sha256(bytes);
  if (actual !== expected) {
    throw new Error(`${label} hash mismatch: expected ${expected}, received ${actual}`);
  }
  console.log(`${label} PASS ${actual}`);
}

function zipEntryContents(archive) {
  const endSignature = 0x06054b50;
  let endOffset = -1;
  for (
    let offset = archive.length - 22;
    offset >= Math.max(0, archive.length - 65_557);
    offset -= 1
  ) {
    if (archive.readUInt32LE(offset) === endSignature) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error("Ministry HWP archive has no ZIP directory");

  const entryCount = archive.readUInt16LE(endOffset + 10);
  let centralOffset = archive.readUInt32LE(endOffset + 16);
  const contents = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (archive.readUInt32LE(centralOffset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory entry ${index}`);
    }
    const compressionMethod = archive.readUInt16LE(centralOffset + 10);
    const compressedSize = archive.readUInt32LE(centralOffset + 20);
    const fileNameLength = archive.readUInt16LE(centralOffset + 28);
    const extraLength = archive.readUInt16LE(centralOffset + 30);
    const commentLength = archive.readUInt16LE(centralOffset + 32);
    const localOffset = archive.readUInt32LE(centralOffset + 42);
    if (archive.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid ZIP local entry ${index}`);
    }
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = archive.subarray(dataOffset, dataOffset + compressedSize);
    if (compressionMethod === 0) contents.push(compressed);
    else if (compressionMethod === 8) contents.push(inflateRawSync(compressed));
    else throw new Error(`Unsupported ZIP compression method ${compressionMethod}`);
    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }
  return contents;
}

const [archive, pdf] = await Promise.all([
  download(fixture.source.hwpDownloadUrl, "Ministry HWP archive"),
  download(fixture.source.pdfDownloadUrl, "NCIC PDF")
]);
assertHash("Ministry HWP archive", archive, fixture.source.hwpArchiveSha256);
assertHash("NCIC PDF", pdf, fixture.source.pdfSha256);

const matchingDocument = zipEntryContents(archive).find(
  (bytes) => sha256(bytes) === fixture.source.hwpDocumentSha256
);
if (!matchingDocument) {
  throw new Error(
    `Ministry archive does not contain the pinned mathematics curriculum HWP ${fixture.source.hwpDocumentSha256}`
  );
}
console.log(
  `Mathematics curriculum HWP PASS ${fixture.source.hwpDocumentSha256}`
);
console.log(`official curriculum source PASS: ${fixture.standards.length} fixture standards`);
