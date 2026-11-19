// Checks every installed package (direct and transitive) against the OSV vulnerability database.
// Exits with code 1 if any known vulnerability is found, so CI fails the build.
//
// Usage: node scripts/check-osv.mjs

import { execFileSync } from "node:child_process";

const OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch";
const BATCH_SIZE = 500;

function listInstalledPackages() {
  const output = execFileSync("pnpm", ["list", "--json", "--depth", "Infinity"], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const packages = new Map();
  for (const project of JSON.parse(output.toString())) {
    collectPackages(project.dependencies, packages);
    collectPackages(project.devDependencies, packages);
  }
  return [...packages.values()];
}

function collectPackages(dependencies, packages) {
  for (const [name, info] of Object.entries(dependencies ?? {})) {
    if (!info.version || info.version.startsWith("link:")) continue;
    packages.set(`${name}@${info.version}`, { name, version: info.version });
    collectPackages(info.dependencies, packages);
  }
}

async function findVulnerabilities(packages) {
  const findings = [];
  for (let start = 0; start < packages.length; start += BATCH_SIZE) {
    const batch = packages.slice(start, start + BATCH_SIZE);
    const results = await queryOsv(batch);
    results.forEach((result, index) => {
      if (result.vulns?.length) findings.push({ ...batch[index], ids: result.vulns.map((v) => v.id) });
    });
  }
  return findings;
}

async function queryOsv(batch) {
  const queries = batch.map(({ name, version }) => ({ package: { name, ecosystem: "npm" }, version }));
  const response = await fetch(OSV_BATCH_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ queries }),
  });
  if (!response.ok) throw new Error(`OSV request failed with status ${response.status}`);
  return (await response.json()).results;
}

const packages = listInstalledPackages();
const findings = await findVulnerabilities(packages);

if (findings.length === 0) {
  console.log(`OSV: checked ${packages.length} packages, no known vulnerabilities.`);
} else {
  for (const { name, version, ids } of findings)
    console.error(`OSV: ${name}@${version} -> ${ids.join(", ")}`);
  process.exitCode = 1;
}
