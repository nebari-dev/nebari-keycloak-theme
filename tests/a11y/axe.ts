import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import AxeBuilder from "@axe-core/playwright";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import type { AxeResults, NodeResult, Result, RunOptions } from "axe-core";
import { knownViolationsFor, type A11yTarget, type KnownViolation } from "./known-violations";

/**
 * The conformance target: WCAG 2.2 level AA, which also covers every A and AA
 * criterion from 2.0 and 2.1. axe tags each rule with the criteria it tests, so
 * this list is what "accessible" means for these tests.
 */
const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const axeSource = patchForFrozenRuntime(
    readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.js"), "utf8")
);

/**
 * oidc-spa's runtime freeze turns built-in prototype methods into accessors
 * whose setter throws. Assigning a same-named property on an instance then hits
 * that setter, so axe's `data.values = …` — run while it words a failure
 * message — throws "Blocked alteration of window.Array.prototype.values" and
 * hides the very violation it was describing. Defining the property on the
 * instance is allowed and means the same thing.
 */
function patchForFrozenRuntime(source: string): string {
    const assignment = "data.values = data.join(', ');";

    if (!source.includes(assignment)) {
        throw new Error(
            "axe-core no longer contains the assignment tests/a11y/axe.ts patches. Check whether the " +
                "console scans still work under oidc-spa's runtime freeze and update the patch."
        );
    }

    return source.replace(
        assignment,
        "Object.defineProperty(data, 'values', { value: data.join(', '), writable: true, enumerable: true, configurable: true });"
    );
}

/**
 * Loads axe before any of the page's own scripts. The consoles freeze built-in
 * prototypes once oidc-spa starts (`browserRuntimeFreeze`), and axe's polyfills
 * write to `WeakMap.prototype`, so injecting it after load — which is what
 * `@axe-core/playwright` does — throws. Call this on a console page's context
 * before opening it.
 */
export async function preloadAxe(context: BrowserContext) {
    await context.addInitScript({ content: axeSource });
}

export type AxeScanOptions = {
    /** Limit the scan to this selector, e.g. an open dialog. */
    include?: string;
    /**
     * Also run axe's best-practice rules (one main landmark, one h1, no
     * positive tabindex…). They are not WCAG failures, so a page that owns its
     * markup opts in and the vendored consoles do not.
     */
    bestPractices?: boolean;
};

/**
 * Fails on every violation that isn't a known, tracked one, with one readable
 * line per offending element rather than axe's JSON.
 */
export async function expectNoAxeViolations(page: Page, target: A11yTarget, options: AxeScanOptions = {}) {
    const tags = options.bestPractices ? [...WCAG_AA_TAGS, "best-practice"] : WCAG_AA_TAGS;
    const isPreloaded = await page.evaluate(() => "axe" in window);

    const { violations } = isPreloaded
        ? await runPreloadedAxe(page, tags, options.include)
        : await (options.include === undefined
              ? new AxeBuilder({ page }).withTags(tags)
              : new AxeBuilder({ page }).withTags(tags).include(options.include)
          ).analyze();

    const unexpected = await withoutKnownViolations(page, violations, knownViolationsFor(target));

    expect(unexpected.map(formatViolation), "axe found accessibility violations").toEqual([]);
}

async function runPreloadedAxe(page: Page, tags: string[], include: string | undefined): Promise<AxeResults> {
    const runOptions: RunOptions = { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] };

    return page.evaluate(
        ([include, runOptions]) =>
            (window as unknown as { axe: { run: (...args: unknown[]) => Promise<AxeResults> } }).axe.run(
                include ?? document,
                runOptions
            ),
        [include, runOptions] as const
    );
}

/** Drops the nodes a known violation covers, and any violation left with none. */
async function withoutKnownViolations(
    page: Page,
    violations: Result[],
    known: KnownViolation[]
): Promise<Result[]> {
    const candidates = violations.map(violation => known.filter(entry => entry.rule === violation.id));

    // Selector checks run in one pass inside the page. A Playwright locator
    // per node would wait indefinitely for a node that has left the DOM since
    // the scan, such as a toast, and turn a violation into a timeout.
    const selectorMatches = await page.evaluate(
        nodes =>
            nodes.map(({ target, selectors }) => {
                let element: Element | null = null;

                try {
                    element = document.querySelector(target);
                } catch {
                    // Not a selector this document can parse; only entries
                    // without one can match.
                }

                // An entry without a selector (a colour pair, say) doesn't
                // need the element at all.
                return selectors.map(selector => selector === null || (element?.matches(selector) ?? false));
            }),
        violations.flatMap((violation, index) =>
            violation.nodes.map(node => ({
                // axe's target is a selector path; its last part is the
                // element itself (earlier parts step into iframes or shadow roots).
                target: String(node.target[node.target.length - 1]),
                selectors: candidates[index].map(entry => entry.selector ?? null)
            }))
        )
    );

    let nodeIndex = 0;
    const remaining: Result[] = [];

    violations.forEach((violation, index) => {
        const nodes = violation.nodes.filter(node => {
            const matches = selectorMatches[nodeIndex++];

            return !candidates[index].some(
                (entry, candidateIndex) => matches[candidateIndex] && matchesColors(entry, node)
            );
        });

        if (nodes.length > 0) {
            remaining.push({ ...violation, nodes });
        }
    });

    return remaining;
}

function matchesColors(entry: KnownViolation, node: NodeResult): boolean {
    if (entry.colors === undefined) {
        return true;
    }

    const data = contrastData(node);

    return entry.colors.some(
        pair =>
            data?.fgColor?.toLowerCase() === pair.foreground.toLowerCase() &&
            data?.bgColor?.toLowerCase() === pair.background.toLowerCase()
    );
}

type ContrastData = { fgColor?: string; bgColor?: string; contrastRatio?: number; expectedContrastRatio?: string };

function contrastData(node: NodeResult): ContrastData | undefined {
    return node.any[0]?.data as ContrastData | undefined;
}

function formatViolation(violation: Result): string {
    const nodes = violation.nodes.map(node => `    ${node.target.join(" ")}${describeNode(violation, node)}`);

    return [`[${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help}`, ...nodes].join("\n");
}

/** Contrast failures are only actionable with the colours and the ratio. */
function describeNode(violation: Result, node: NodeResult): string {
    if (violation.id !== "color-contrast") {
        return "";
    }

    const data = contrastData(node);

    if (data?.contrastRatio === undefined) {
        return " (contrast could not be computed)";
    }

    return ` (${data.fgColor} on ${data.bgColor}: ${data.contrastRatio}, needs ${data.expectedContrastRatio})`;
}
