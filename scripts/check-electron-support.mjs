// Fails when the pinned Electron major is older than the three newest stable majors,
// because Electron only ships security fixes for those.
// Usage: node scripts/check-electron-support.mjs

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SUPPORTED_MAJORS = 3;

const pinned = JSON.parse(readFileSync("package.json", "utf8")).devDependencies.electron;
const pinnedMajor = Number(pinned.split(".")[0]);

const versions = JSON.parse(execFileSync("npm", ["view", "electron", "versions", "--json"]).toString());
const stableMajors = [
  ...new Set(versions.filter((v) => /^\d+\.\d+\.\d+$/.test(v)).map((v) => Number(v.split(".")[0]))),
]
  .sort((a, b) => b - a)
  .slice(0, SUPPORTED_MAJORS);

if (stableMajors.includes(pinnedMajor)) {
  console.log(`Electron ${pinned} is supported (supported majors: ${stableMajors.join(", ")}).`);
} else {
  console.error(
    `Electron ${pinned} no longer gets security fixes. Supported majors: ${stableMajors.join(", ")}.`,
  );
  process.exitCode = 1;
}
