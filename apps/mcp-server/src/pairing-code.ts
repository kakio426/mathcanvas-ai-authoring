#!/usr/bin/env node
import { homedir } from "node:os";
import { join } from "node:path";
import { loadOrCreatePairingSecret } from "@mathcanvas/bridge-protocol";

const stateDirectory =
  process.env.MATHCANVAS_STATE_DIR ??
  join(homedir(), ".mathcanvas-ai-authoring");
const pairingSecret = await loadOrCreatePairingSecret(
  join(stateDirectory, "pairing-secret")
);

process.stdout.write(`${pairingSecret}\n`);
