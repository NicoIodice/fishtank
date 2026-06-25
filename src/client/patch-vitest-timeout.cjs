#!/usr/bin/env node
// Increases Vitest's hardcoded 60-second fork-worker startup timeout to 3 minutes.
// Windows Defender scans new Node.js processes and causes fork startup to exceed 60s
// when tests run as a subprocess (e.g. from the Python CI helper tool after dotnet tests).
// This script is called automatically via the "postinstall" npm hook so the patch
// survives "npm install" / "npm ci".
"use strict";
const fs = require("fs");
const path = require("path");

const chunksDir = path.join(__dirname, "node_modules", "vitest", "dist", "chunks");
if (!fs.existsSync(chunksDir)) {
  console.log("patch-vitest-timeout: vitest not installed yet, skipping.");
  process.exit(0);
}

let patched = false;
for (const fname of fs.readdirSync(chunksDir)) {
  if (!fname.endsWith(".js")) continue;
  const file = path.join(chunksDir, fname);
  let content;
  try { content = fs.readFileSync(file, "utf8"); } catch { continue; }
  let changed = false;
  if (content.includes("const START_TIMEOUT = 6e4;")) {
    content = content.replace("const START_TIMEOUT = 6e4;", "const START_TIMEOUT = 18e4;");
    changed = true;
  }
  if (content.includes("const WORKER_START_TIMEOUT = 9e4;")) {
    content = content.replace("const WORKER_START_TIMEOUT = 9e4;", "const WORKER_START_TIMEOUT = 21e4;");
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`patch-vitest-timeout: Patched ${fname} (fork START_TIMEOUT 60s → 180s)`);
    patched = true;
  }
}
if (!patched) {
  console.log("patch-vitest-timeout: Already patched (or vitest version changed — re-check).");
}
