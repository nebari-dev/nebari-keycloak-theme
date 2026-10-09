import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { expectKeyboardAccessible } from "./keyboard";

/**
 * Tests for the checks themselves. Each builds a small page that breaks one
 * rule and proves the check fails on it, or one that follows a legitimate
 * pattern and proves the check accepts it. A check that silently stops failing
 * looks exactly like a page that passes — this already happened once, when a
 * bad element key made every keyboard walk stop after one stop — so these run
 * with the login suite.
 */

const nebari = { surface: "login", theme: "nebari" } as const;
const collab = { surface: "login", theme: "collab" } as const;

const FOCUS_STYLE = "<style>:focus-visible { outline: 2px solid blue; }</style>";

async function render(page: Page, body: string) {
    await page.setContent(
        `<!doctype html><html lang="en"><title>Check</title><body><main><h1>Check</h1>${FOCUS_STYLE}${body}</main></body></html>`
    );
}

test.describe("keyboard checks accept", () => {
    test("native controls, a roving tab list, a row standing in for its link, a combobox toggle, a disabled fieldset and a radio group", async ({ page }) => {
        await render(
            page,
            `<button>One</button><input aria-label="Two"><a href="#">Three</a>
            <div role="tablist"><button role="tab">A</button><button role="tab" tabindex="-1">B</button></div>
            <table><tr tabindex="0" aria-label="Open x"><td><a href="#x" tabindex="-1">x</a></td></tr></table>
            <div><input role="combobox" aria-label="Pick" aria-expanded="false"><button tabindex="-1" aria-label="Open" aria-expanded="false">v</button></div>
            <fieldset disabled><input aria-label="Off"></fieldset>
            <input type="radio" name="r" aria-label="R1"><input type="radio" name="r" aria-label="R2"><input type="radio" name="r" aria-label="R3">`
        );
        await expectKeyboardAccessible(page, nebari);
    });

    test("a focus indicator drawn on a pseudo-element", async ({ page }) => {
        await render(page, `<style>#go:focus-visible { outline: none; } #go:focus-visible::after { content: "→"; }</style><button id="go">Go</button>`);
        await expectKeyboardAccessible(page, nebari);
    });
});

test.describe("keyboard checks catch", () => {
    test("a control without a focus indicator", async ({ page }) => {
        await render(page, `<style>#bare:focus { outline: none !important; }</style><button>One</button><button id="bare">Bare</button>`);
        await expect(expectKeyboardAccessible(page, nebari)).rejects.toThrow(/without a visible focus indicator/);
    });

    test("a keyboard trap", async ({ page }) => {
        await render(
            page,
            `<button>One</button><input aria-label="Trap" onkeydown="if (event.key === 'Tab') event.preventDefault()"><button>After</button>`
        );
        await expect(expectKeyboardAccessible(page, nebari)).rejects.toThrow(/Tab never reaches|retrace/);
    });

    test("a control only a mouse can use", async ({ page }) => {
        await render(page, `<button>One</button><div role="button" onclick="">Click only</div>`);
        await expect(expectKeyboardAccessible(page, nebari)).rejects.toThrow(/Tab never reaches/);
    });

    test("a control taken out of the Tab order with nothing standing in for it", async ({ page }) => {
        await render(page, `<button>One</button><div><button tabindex="-1">Removed</button></div>`);
        await expect(expectKeyboardAccessible(page, nebari)).rejects.toThrow(/Tab never reaches/);
    });

    test("a mouse-only control in a table that only calls itself a grid", async ({ page }) => {
        // PatternFly gives every table role="grid" without arrow-key navigation.
        await render(page, `<button>One</button><table role="grid"><tr><td><button tabindex="-1">Mouse only</button></td></tr></table>`);
        await expect(expectKeyboardAccessible(page, nebari)).rejects.toThrow(/Tab never reaches/);
    });

    test("a mouse-only control inside a focusable scroll container", async ({ page }) => {
        await render(page, `<div tabindex="0" style="overflow: auto">Region<button tabindex="-1">Mouse only</button></div>`);
        await expect(expectKeyboardAccessible(page, nebari)).rejects.toThrow(/Tab never reaches/);
    });

    test("a mouse-only control that merely sits beside a combobox", async ({ page }) => {
        await render(page, `<div><input role="combobox" aria-label="Pick" aria-expanded="false"><button tabindex="-1">Unrelated</button></div>`);
        await expect(expectKeyboardAccessible(page, nebari)).rejects.toThrow(/Tab never reaches/);
    });
});

test.describe("axe scans", () => {
    test("catch low contrast", async ({ page }) => {
        await render(page, `<p style="color: #aaaaaa; background: #ffffff">Faint</p>`);
        await expect(expectNoAxeViolations(page, nebari)).rejects.toThrow(/color-contrast/);
    });

    test("excuse a known violation only where it is known", async ({ page }) => {
        // collab-primary-button-contrast in known-violations.ts.
        await render(page, `<p style="color: #ffffff; background: #4d75fe">Primary</p>`);
        await expectNoAxeViolations(page, collab);
        await expect(expectNoAxeViolations(page, nebari)).rejects.toThrow(/color-contrast/);
    });

    test("don't excuse a colour pair the allowlist doesn't name", async ({ page }) => {
        await render(page, `<p style="color: #ffffff; background: #5d85ff">Near the primary</p>`);
        await expect(expectNoAxeViolations(page, collab)).rejects.toThrow(/color-contrast/);
    });
});
