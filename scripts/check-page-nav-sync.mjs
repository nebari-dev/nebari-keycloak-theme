/**
 * Guards the one navigation file this theme owns.
 *
 * `src/admin/PageNav.tsx` was claimed so the planned Software Packs page
 * (https://github.com/nebari-dev/nebari-keycloak-theme/issues/14) has a seam to
 * hook into. Owned files are the ones `keycloakify sync-extensions` will not
 * refresh, so when Keycloak adds a console section upstream this file is the
 * only place it will not appear — and a missing nav item is not a type error,
 * so `tsc` cannot catch it. This does.
 *
 * It compares two things against the upstream original:
 *
 *   1. the set of static `<LeftNav path="…">` destinations, and
 *   2. the total number of `<LeftNav>` render sites.
 *
 * The second check matters because upstream renders one section from a computed
 * path (`toPage({ providerId })` for Declarative UI), which no textual
 * comparison of literals can see. Counting the render sites means a new section
 * added that way still trips the check.
 *
 * Destinations this theme adds on purpose go in `NEBARI_ONLY` below.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const OWNED = new URL("../src/admin/PageNav.tsx", import.meta.url);
const UPSTREAM = new URL(
  "../node_modules/@keycloakify/keycloak-admin-ui/keycloak-theme/admin/PageNav.tsx",
  import.meta.url,
);

/**
 * Nav destinations that exist only in the Nebari rendering. Add an entry here
 * together with the `<LeftNav>` that introduces it, so the check keeps
 * verifying upstream parity instead of being switched off.
 */
const NEBARI_ONLY = new Set([
  // "/software-packs",  // https://github.com/nebari-dev/nebari-keycloak-theme/issues/14
]);

/** Every `<LeftNav …/>` render site, with its `path` when it is a literal. */
function navSites(source) {
  return [...source.matchAll(/<LeftNav\b[\s\S]*?\/>/g)].map((match) => {
    const path = match[0].match(/\bpath="([^"]+)"/);
    return { path: path?.[1] };
  });
}

async function read(url, hint) {
  try {
    return await readFile(url, "utf8");
  } catch (cause) {
    throw new Error(
      `Cannot read ${fileURLToPath(url)}. ${hint}`,
      { cause },
    );
  }
}

const [ownedSource, upstreamSource] = await Promise.all([
  read(OWNED, "The owned Admin navigation should be in the repository."),
  read(
    UPSTREAM,
    "Run `npm ci`. If the file moved, a Keycloakify upgrade changed the Admin " +
      "Console layout and this check needs its path updated — which is exactly " +
      "the review this guard exists to force.",
  ),
]);

const owned = navSites(ownedSource);
const upstream = navSites(upstreamSource);

const ownedPaths = new Set(owned.map((site) => site.path).filter(Boolean));
const upstreamPaths = new Set(upstream.map((site) => site.path).filter(Boolean));

const missing = [...upstreamPaths].filter((path) => !ownedPaths.has(path));
const unexpected = [...ownedPaths].filter(
  (path) => !upstreamPaths.has(path) && !NEBARI_ONLY.has(path),
);
const expectedSites = upstream.length + NEBARI_ONLY.size;

const problems = [
  missing.length &&
    `sections upstream renders that the Nebari navigation drops: ${missing.join(", ")}`,
  unexpected.length &&
    `destinations not upstream and not declared in NEBARI_ONLY: ${unexpected.join(", ")}`,
  owned.length !== expectedSites &&
    `<LeftNav> render sites: ${owned.length} owned vs ${expectedSites} expected ` +
      `(${upstream.length} upstream + ${NEBARI_ONLY.size} Nebari-only). A section ` +
      `rendered from a computed path may have been added or dropped.`,
].filter(Boolean);

if (problems.length > 0) {
  throw new Error(
    `Owned Admin navigation is out of sync with Keycloakify.\n  - ${problems.join(
      "\n  - ",
    )}\nReconcile ${fileURLToPath(OWNED)} with ${fileURLToPath(UPSTREAM)}.`,
  );
}

console.log(
  `PageNav matches upstream: ${upstreamPaths.size} static routes, ` +
    `${owned.length} render sites.`,
);
