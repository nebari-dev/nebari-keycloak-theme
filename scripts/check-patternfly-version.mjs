/**
 * Guards the theme's biggest silent-failure mode.
 *
 * Roughly 400 CSS selectors and a handful of `className` strings in this theme
 * target PatternFly's component classes by name — `.pf-v5-c-masthead`,
 * `.pf-v5-c-table`, `--pf-v5-global--primary-color--100`. PatternFly puts its
 * major version in every one of those names, so the day Keycloak moves to
 * PatternFly 6 they all become `pf-v6-*` and every selector here stops matching.
 *
 * Nothing would fail. Not `tsc`, not the build, not the login screenshots — the
 * consoles would simply drift back toward stock PatternFly styling and someone
 * would have to notice by eye. This check turns that into a build error on the
 * commit that causes it.
 *
 * It reads the *installed* major rather than the range in package.json, because
 * the range is what you asked for and node_modules is what you got.
 *
 * Scope: files tracked by git. The ~671 vendored Admin Console files are
 * gitignored and are refreshed by `keycloakify sync-extensions`, so they carry
 * whatever prefix the new PatternFly uses and are not ours to fix. What is left
 * is exactly the theme's own source — the files that would go stale.
 *
 * `.js` is in the glob because the two owned `early-color-scheme.js` files add
 * `pf-v5-theme-dark` before React boots; they are pre-paint scripts, not
 * stylesheets, and would otherwise be the one place a stale prefix hid.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = new URL("..", import.meta.url);
const PKG = new URL("../node_modules/@patternfly/react-core/package.json", import.meta.url);

/** How many mismatching references to list before summarising. */
const SAMPLE = 12;

function installedMajor() {
  let raw;
  try {
    raw = readFileSync(PKG, "utf8");
  } catch (cause) {
    throw new Error(
      `Cannot read ${fileURLToPath(PKG)} — run \`npm ci\`.`,
      { cause },
    );
  }
  const { version } = JSON.parse(raw);
  const major = Number(version.split(".")[0]);
  if (!Number.isInteger(major)) {
    throw new Error(`Could not parse a major version from "${version}".`);
  }
  return { major, version };
}

function trackedFiles() {
  const out = execFileSync(
    "git",
    ["ls-files", "-z", "*.css", "*.ts", "*.tsx", "*.js", "*.mjs", "*.cjs"],
    { cwd: fileURLToPath(ROOT), encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  return out.split("\0").filter(Boolean);
}

const { major, version } = installedMajor();
const found = new Map(); // major -> [{ file, line, text }]

for (const file of trackedFiles()) {
  // This script necessarily contains the pattern it searches for.
  if (file === "scripts/check-patternfly-version.mjs") continue;

  const source = readFileSync(new URL(file, ROOT), "utf8");
  if (!source.includes("pf-v")) continue;

  source.split("\n").forEach((line, index) => {
    for (const match of line.matchAll(/pf-v(\d+)[-_]/g)) {
      const seen = Number(match[1]);
      if (seen === major) continue;
      if (!found.has(seen)) found.set(seen, []);
      found.get(seen).push({ file, line: index + 1, text: line.trim().slice(0, 100) });
    }
  });
}

if (found.size === 0) {
  console.log(`PatternFly ${version}: all pf-v${major}- references in tracked files agree.`);
  process.exit(0);
}

const lines = [
  `PatternFly is installed at ${version}, but tracked files still reference other majors.`,
  "",
];
for (const [seen, hits] of [...found].sort((a, b) => a[0] - b[0])) {
  lines.push(`  pf-v${seen}-  ${hits.length} reference${hits.length === 1 ? "" : "s"}:`);
  for (const hit of hits.slice(0, SAMPLE)) {
    lines.push(`    ${hit.file}:${hit.line}  ${hit.text}`);
  }
  if (hits.length > SAMPLE) {
    lines.push(`    … and ${hits.length - SAMPLE} more`);
  }
  lines.push("");
}
lines.push(
  `Every one of those selectors silently matches nothing under PatternFly ${major}.`,
  "Port them to the new class names, or pin PatternFly back, before shipping.",
);

throw new Error(lines.join("\n"));
