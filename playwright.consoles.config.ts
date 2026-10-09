import { defineConfig, devices } from "@playwright/test";
import { KEYCLOAK_URL } from "./tests/a11y/environment";

/**
 * Accessibility tests for the Admin and Account consoles. The consoles only run
 * inside Keycloak, so unlike playwright.config.ts this starts no dev server and
 * targets the compose stack: `docker compose up -d --build keycloak`, or
 * whatever KEYCLOAK_URL points at. See docs/development.md.
 */
export default defineConfig({
    testDir: "./tests/a11y",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [["line"], ["html", { open: "never", outputFolder: "playwright-report-consoles" }]] : "list",
    outputDir: "test-results-consoles",
    use: {
        ...devices["Desktop Chrome"],
        baseURL: KEYCLOAK_URL,
        colorScheme: "light",
        locale: "en-US",
        // Not a top-level `use` option: Playwright only applies it through
        // contextOptions, and silently ignores it anywhere else.
        contextOptions: { reducedMotion: "reduce" },
        serviceWorkers: "block"
    },
    projects: [
        {
            // Creates a realm per theme and saves a signed-in session for each
            // console, so the suites below start signed in.
            name: "consoles-setup",
            testMatch: "consoles.setup.ts"
        },
        {
            name: "a11y-admin",
            testMatch: "admin.a11y.spec.ts",
            dependencies: ["consoles-setup"]
        },
        {
            name: "a11y-account",
            testMatch: "account.a11y.spec.ts",
            dependencies: ["consoles-setup"]
        }
    ]
});
