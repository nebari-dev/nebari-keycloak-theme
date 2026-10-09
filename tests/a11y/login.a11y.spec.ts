import { readdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { loginPages, openPreview as openPreviewCard, previews } from "../previews";
import { expectNoAxeViolations } from "./axe";
import { expectKeyboardAccessible } from "./keyboard";
import { colorSchemes, themes, type ColorScheme } from "./themes";

/**
 * Login-page accessibility, run against the dev server's mocked pages. Every
 * page is scanned in every theme and colour scheme; the markup is ours, so axe's
 * best-practice rules apply as well as WCAG 2.2 AA.
 */

/** Pages with a form a user fills in and submits. */
const formPreviews = ["login", "register", "forgot-password", "update-password", "update-profile"] as const;

async function openPreview(page: Page, theme: string, preview: string, colorScheme: ColorScheme = "light") {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await openPreviewCard(page, theme, preview);
    // Contrast is measured against the rendered background, so wait for web
    // fonts and images rather than scanning a half-painted page.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("networkidle");
}

test("every page in src/login/pages has a preview", () => {
    const pages = readdirSync(new URL("../../src/login/pages/", import.meta.url)).filter((file: string) => file.endsWith(".tsx"));

    expect(
        pages.filter((file: string) => !(file in loginPages)),
        "add these pages to loginPages in tests/previews.ts, with a preview that renders them"
    ).toEqual([]);

    for (const { previews: mapped } of Object.values(loginPages)) {
        for (const preview of mapped) {
            expect(previews, "loginPages names a preview the specs don't iterate").toContain(preview);
        }
    }
});

/** The page's markup, minus the ids Base UI generates afresh on every render. */
async function mainMarkup(page: Page) {
    return (await page.locator("main").innerHTML()).replace(/base-ui-:[^"]*:|:r[0-9a-z]+:/g, "");
}

// Each page is addressable by its Keycloak page id, `?pageId=`, as well as by
// its preview name, and both render the same page.
for (const [file, { pageId, previews: [preview] }] of Object.entries(loginPages)) {
    test(`?pageId=${pageId} renders ${file}`, async ({ page }) => {
        await page.goto(`/?pageId=${pageId}`);
        await expect(page.locator(".nebari-login-card")).toBeVisible();
        const byPageId = await mainMarkup(page);

        await page.goto(`/?preview=${preview}`);
        await expect(page.locator(".nebari-login-card")).toBeVisible();

        expect(byPageId).toBe(await mainMarkup(page));
    });
}

test("an unknown ?pageId= falls back to the sign-in page", async ({ page }) => {
    const warnings: string[] = [];

    page.on("console", message => {
        if (message.type() === "warning") {
            warnings.push(message.text());
        }
    });

    await page.goto("/?pageId=no-such-page.ftl");
    await expect(page.locator("#kc-login")).toBeVisible();
    expect(warnings.join("\n")).toContain('Unknown pageId "no-such-page.ftl"');
});

for (const theme of themes) {
    const target = { surface: "login", theme } as const;

    test.describe(`${theme} login`, () => {
        for (const colorScheme of colorSchemes) {
            test.describe(`${colorScheme} scheme`, () => {
                for (const preview of previews) {
                    test(`${preview}: no WCAG 2.2 AA violations`, async ({ page }) => {
                        await openPreview(page, theme, preview, colorScheme);
                        await expectNoAxeViolations(page, target, { bestPractices: true });
                    });
                }
            });
        }

        // The checks below don't depend on colour, so they run once per theme.
        // The keyboard checks compare focused and unfocused styles and follow
        // the Tab order; neither changes with the colour scheme.

        for (const preview of previews) {
            test(`${preview}: operable by keyboard alone`, async ({ page }) => {
                await openPreview(page, theme, preview);
                await expectKeyboardAccessible(page, target);
            });
        }

        test("errors are tied to the fields they describe", async ({ page }) => {
            await openPreview(page, theme, "login-error");

            const invalidFields = page.locator('[aria-invalid="true"]');

            await expect(invalidFields.first()).toBeVisible();

            // WCAG 1.3.1 and 3.3.1: a screen reader announces the error with the
            // field, so the message must be referenced by it, not merely nearby.
            for (const field of await invalidFields.all()) {
                const description = await field.evaluate(element => {
                    const ids = [
                        ...(element.getAttribute("aria-describedby") ?? "").split(/\s+/),
                        ...(element.getAttribute("aria-errormessage") ?? "").split(/\s+/)
                    ].filter(Boolean);

                    return ids
                        .map(id => document.getElementById(id)?.textContent?.trim() ?? "")
                        .join(" ")
                        .trim();
                });

                expect(
                    description,
                    `${await field.getAttribute("name")} is invalid but no error message is associated with it`
                ).not.toBe("");
            }
        });

        for (const preview of formPreviews) {
            test(`${preview}: Enter submits the form`, async ({ page }) => {
                await openPreview(page, theme, preview);

                // Record the submission instead of letting it navigate to the
                // mock's action URL.
                await page.evaluate(() => {
                    document.addEventListener(
                        "submit",
                        event => {
                            event.preventDefault();
                            document.documentElement.dataset.a11ySubmitted = "true";
                        },
                        { capture: true }
                    );
                });

                const field = page.locator("form input:not([type=hidden]):not([type=checkbox]):visible").first();

                await field.focus();
                await page.keyboard.press("Enter");

                await expect(page.locator("html")).toHaveAttribute("data-a11y-submitted", "true");
            });
        }

        // WCAG 1.4.10: content reflows at 320 CSS pixels — a 1280px screen at
        // 400% zoom — without scrolling sideways.
        for (const preview of previews) {
            test(`${preview}: reflows at 320px without horizontal scrolling`, async ({ page }) => {
                await page.setViewportSize({ width: 320, height: 640 });
                await openPreview(page, theme, preview);

                const overflow = await page.evaluate(
                    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
                );

                expect(overflow, "page is wider than the viewport").toBeLessThanOrEqual(0);
            });
        }

        // WCAG 2.3.3: with reduced motion requested, nothing keeps animating.
        test("stops animating when reduced motion is requested", async ({ page }) => {
            await openPreview(page, theme, "login");

            const running = await page.evaluate(() =>
                document
                    .getAnimations()
                    .filter(animation => {
                        const timing = animation.effect?.getComputedTiming();

                        return (
                            animation.playState === "running" &&
                            (timing?.iterations === Infinity || Number(timing?.duration ?? 0) > 200)
                        );
                    })
                    .map(animation => (animation as CSSAnimation).animationName ?? animation.id)
            );

            expect(running, "animations still running under prefers-reduced-motion").toEqual([]);
        });
    });
}
